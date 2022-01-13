require("dotenv").config();
const express = require("express");
const Razorpay = require("razorpay");
const uniqid = require("uniqid");
const crypto = require("crypto");
const request = require("request");
const { default: axios } = require("axios");
const router = express.Router();

// initializ the RazorPay and create orders start
const instance = new Razorpay({
  key_id: process.env.RZP_KEY_ID,
  key_secret: process.env.RZP_SECRET_KEY,
});
router.post("/orders", async (req, res) => {
  // get amount from frontend
  const { amount, customerToken, getOrderID } = req.body;
  try {
    const options = {
      amount: amount, //amount is the smallest currency unit
      currency: "INR",
      receipt: uniqid(),
      payment_capture: 1,
    };

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
        amount: amount,
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
          res.status(400).json({ error: "Something wrong" });
        });
      // Update payment Info API end:
    });
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
router.get("/test", async (req, res) => {
  await axios
    .get(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false"
    )
    .then((data) => {
      res.json(data.data);
    })
    .catch((error) => {
      res.status(400).json({
        error: error,
      });
    });
});

module.exports = router;
