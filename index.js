const express = require("express");
const cors = require("cors");
const payment = require("./routes/payment");
const app = express();
const port = process.env.PORT || 5000;
const bodyParser = require("body-parser");
const uploads = require("./routes/awss3");

// middlewares
app.use(cors());
app.use(bodyParser.json());
const urlencodeParse = bodyParser.urlencoded({ extended: false });

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

app.post(
  "/api/save_image",
  uploads.single("image"),
  urlencodeParse,
  (req, res) => {
    const commonUrl = "https://theme-bg-store.s3.ap-south-1.amazonaws.com/";
    res.json({
      success: true,
      url: commonUrl + req.file.originalname,
    });
  }
);

// route included
app.use("/payment", payment);

app.listen(port, () => console.log(`server started on port ${port}`));
