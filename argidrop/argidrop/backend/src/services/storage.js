const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
  ...(process.env.R2_ENDPOINT ? { endpoint: process.env.R2_ENDPOINT, signatureVersion: 'v4' } : {})
});

async function uploadFile(file, folder = 'general') {
  if (!process.env.AWS_S3_BUCKET) {
    // Return a placeholder URL in development
    console.log('⚠️  No S3 bucket configured, returning placeholder URL');
    return `https://placeholder.argidrop.app/${folder}/${file.originalname}`;
  }

  const ext = path.extname(file.originalname);
  const key = `${folder}/${uuidv4()}${ext}`;

  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: 'private'
  };

  const result = await s3.upload(params).promise();
  return result.Location;
}

async function getSignedUrl(key, expiresIn = 3600) {
  return s3.getSignedUrlPromise('getObject', {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    Expires: expiresIn
  });
}

module.exports = { uploadFile, getSignedUrl };
