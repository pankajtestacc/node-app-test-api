const express = require("express");
const cors = require("cors");
const payment = require("./routes/payment");
const app = express();
const port = process.env.PORT || 5000;

// middlewares
app.use(express.json({ extended: false }));
app.use(cors());

app.get("/", (req, res) => {
  res.status(200).json({
    status: "App is running succesfull",
    createOrders: {
      method: "POST",
      url: "/payment/orders",
      fields: {
        amount: "amount",
      },
    },
    varifyPaymentAndSaveDB: {
      method: "POST",
      url: "/payment/success",
      fields: {
        companyOrderID: "ID",
        createrUsername: "Creator username",
        customerName: "Customer name",
        customerEmail: "Customer Email",
        customerMobileNo: "Customer Mobile Number",
        orderCreationId: "OrderID created by client",
        razorpayPaymentId: "RZP Payment ID",
        razorpayOrderId: "RZP Order ID",
        razorpaySignature: "RZP Signature ID",
      },
    },
  });
});

// route included
app.use("/payment", payment);

app.listen(port, () => console.log(`server started on port ${port}`));
