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
  });
});

// upload image to server
app.post(
  "/rest/api/save_image",
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
app.use("/rest/payment", payment);

app.listen(port, () => console.log(`server started on port ${port}`));
