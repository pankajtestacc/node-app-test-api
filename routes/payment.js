require("dotenv").config();
const express = require("express");
const Razorpay = require("razorpay");
const uniqid = require("uniqid");
const crypto = require("crypto");
const { default: axios } = require("axios");
const router = express.Router();

// initializ the RazorPay and create orders start
const instance = new Razorpay({
  key_id: process.env.RZP_KEY_ID,
  key_secret: process.env.RZP_SECRET_KEY,
});

// get amount from frontend
router.post("/orders", async (req, res) => {
  const { amount, customerToken, getOrderID } = req.body;
  try {
    const options = {
      amount: amount, //amount is the smallest currency unit (Paise)
      currency: "INR",
      receipt: uniqid(),
      payment_capture: 1,
    };

    // check for the order start
    await axios({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Authorization": `Bearer ${customerToken}`,
      },
      url: `https://api.${
        process.env.NODE_ENV === "development"
          ? process.env.DEV_API
          : process.env.PROD_API
      }.me/rest/order/get-order`,
      data: {
        orderId: getOrderID,
      },
    })
      .then(async (data) => {
        // check for orderID
        if (data.data.orderDto.orderId) {
          // create order
          await instance.orders.create(options, async (err, order) => {
            if (err) {
              return res.status(500).json({
                error: err,
              });
            }

            // Update payment Info API start:
            const data = {
              orderId: getOrderID,
              txnId: order.id,
              amount: amount / 100, // changed it into Rupees
              receipt: options.receipt,
              paymentProvider: "razorPay",
            };

            await axios({
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Authorization": `Bearer ${customerToken}`,
              },
              url: `https://api.${
                process.env.NODE_ENV === "development"
                  ? process.env.DEV_API
                  : process.env.PROD_API
              }.me/rest/order/update/payment-info`,
              data: data,
            })
              .then((data) => {
                if (data) {
                  res.status(200).json(order);
                } else {
                  return res.status(500).json({ error: "Failed to save" });
                }
              })
              .catch((error) => {
                res.status(400).json({ error: `${error}` });
              });
            // Update payment Info API end:
          });
        } else {
          return console.log("Order not created");
        }
      })
      .catch((error) => {
        console.log(error);
      });
    // check for the order end
  } catch (err) {
    res.status(500).send(err);
  }
});
// initializ the RazorPay and create orders end

// start Verify the payment getting sighnature ID
// see ref https://razorpay.com/docs/payment-gateway/web-integration/standard/#step-5-verify-the-signature
router.post("/success", async (req, res) => {
  try {
    // getting the details back from frontend
    const {
      customerToken,
      getOrderID,
      amount,
      receiptId,
      orderCreationId,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
    } = req.body;

    const hash = crypto
      .createHmac("sha256", process.env.RZP_SECRET_KEY)
      .update(orderCreationId + "|" + razorpayPaymentId)
      .digest("hex");

    if (hash !== razorpaySignature)
      return res.status(400).json({ msg: "Transaction not legit!" });

    // THE PAYMENT IS LEGIT & VERIFIED
    // YOU CAN SAVE THE DETAILS IN YOUR DATABASE IF YOU WANT
    const data = {
      orderId: getOrderID,
      txnId: orderCreationId,
      amount: amount,
      receipt: receiptId,
      paymentProvider: "razorPay",
      currency: "Rupee",
      paymentCreatedOn: "2012-04-23T18:25:43.511Z",
      extPaymentId: razorpayPaymentId,
      paymentCapture: amount,
      paymentSuccess: true,
    };

    await axios({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Authorization": `Bearer ${customerToken}`,
      },
      url: `https://api.${
        process.env.NODE_ENV === "development"
          ? process.env.DEV_API
          : process.env.PROD_API
      }.me/rest/order/update/payment-info`,
      data: data,
    })
      .then((data) => {
        res.status(200).json(data.data);
      })
      .catch((error) => {
        res.status(400).json({ error: `Server error ${error}` });
      });
  } catch (error) {
    res.status(500).send(error);
  }
});
// end Verify the payment getting sighnature ID

// test
router.get("/testurl", async (req, res) => {
  res.status(200).json({ msg: "This is api test URL" });
});

module.exports = router;
