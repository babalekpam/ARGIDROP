const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl: presignerGetSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const s3Config = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined,
  ...(process.env.R2_ENDPOINT
    ? { endpoint: process.env.R2_ENDPOINT, forcePathStyle: true }
    : {}),
};

const s3 = new S3Client(s3Config);

async function uploadFile(file, folder = 'general') {
  if (!process.env.AWS_S3_BUCKET) {
    // Return a placeholder URL in development
    console.log('⚠️  No S3 bucket configured, returning placeholder URL');
    return `https://placeholder.argidrop.app/${folder}/${file.originalname}`;
  }

  const ext = path.extname(file.originalname);
  const key = `${folder}/${uuidv4()}${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'private',
    })
  );

  // Mirror v2 behavior: return the canonical S3 URL.
  if (process.env.R2_ENDPOINT) {
    return `${process.env.R2_ENDPOINT.replace(/\/$/, '')}/${process.env.AWS_S3_BUCKET}/${key}`;
  }
  const region = s3Config.region;
  return `https://${process.env.AWS_S3_BUCKET}.s3.${region}.amazonaws.com/${key}`;
}

async function getSignedUrl(key, expiresIn = 3600) {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
  });
  return presignerGetSignedUrl(s3, command, { expiresIn });
}

module.exports = { uploadFile, getSignedUrl };
