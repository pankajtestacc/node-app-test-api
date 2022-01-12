const AWS = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");
require("dotenv").config();

const bucketName = process.env.MY_AWS_BUCKET_NAME;

AWS.config.update({
  region: process.env.MY_AWS_DEFAULT_REGION,
  accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY,
});

const S3 = new AWS.S3();

module.exports = multer({
  storage: multerS3({
    s3: S3,
    bucket: bucketName,
    acl: "public-read",
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      cb(null, file.originalname);
    },
  }),
});
