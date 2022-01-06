require("dotenv").config();
const express = require("express");
const Razorpay = require("razorpay");
const uniqid = require("uniqid");
const crypto = require("crypto");
const mongoose = require("mongoose");
const orderSchema = require("../db/orderSchema");
const request = require("request");
const router = express.Router();

mongoose
  .connect(process.env.MONGODB_URL || "mongodb://localhost:27017/payments")
  .then(() => console.log("DB connected"))
  .catch((err) => console.log("Failed to connect DB"));

// initializ the RazorPay and create orders start
const instance = new Razorpay({
  key_id: process.env.RZP_KEY_ID,
  key_secret: process.env.RZP_SECRET_KEY,
});
router.post("/orders", async (req, res) => {
  // get amount from frontend
  const { amount } = req.body;
  try {
    const options = {
      amount: amount, //amount is the smallest currency unit
      currency: "INR",
      receipt: uniqid(),
      payment_capture: 1,
    };

    await instance.orders.create(options, (err, order) => {
      if (err) {
        return res.status(500).json({
          error: err,
        });
      }
      return res.status(200).json(order);
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
      companyOrderID,
      createrUsername,
      customerName,
      customerEmail,
      customerMobileNo,
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
    request(
      `https://${process.env.RZP_KEY_ID}:${process.env.RZP_SECRET_KEY}@api.razorpay.com/v1/payments/${razorpayPaymentId}`,
      function (error, response, body) {
        if (body) {
          const result = JSON.parse(body);
          const order = new orderSchema({
            _id: companyOrderID,
            creatorInfo: {
              createrUsername,
            },
            customerInfo: {
              customerName,
              customerEmail,
              customerMobileNo,
            },
            orders: {
              result,
              razorpayOrderId,
              razorpayPaymentId,
              razorpaySignature,
            },
          });
          order.save((err, data) => {
            if (err)
              return res.status(400).json({
                error: "Not able to save in DB",
              });
            res.json({
              customerName: customerName,
              companyOrderID: companyOrderID,
              razorpayPaymentId: razorpayPaymentId,
            });
          });
        }
      }
    );
  } catch (error) {
    res.status(500).send(error);
  }
});
// end Verify the payment getting sighnature ID

// get the payment details start
router.get("/:id", (req, res) => {
  orderSchema.findById(req.params.id).exec((err, data) => {
    if (err || data == null)
      return res.json({
        error: "No order found",
      });

    res.status(200).json(data);
  });
});
// get the payment details end

// Test route
router.post("/test", (req, res) => {
  const {
    companyOrderID,
    createrUsername,
    customerName,
    customerEmail,
    customerMobileNo,
    razorpayPaymentId,
    razorpayOrderId,
    razorpaySignature,
  } = req.body;

  const order = new orderSchema({
    _id: companyOrderID,
    creatorInfo: {
      createrUsername,
    },
    customerInfo: {
      customerName,
      customerEmail,
      customerMobileNo,
    },
    orders: {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    },
  });
  order.save((err, data) => {
    if (err)
      return res.status(400).json({
        error: err,
      });
    res.json({
      customerName: customerName,
      companyOrderID: companyOrderID,
      razorpayPaymentId: razorpayPaymentId,
    });
  });
});

module.exports = router;
