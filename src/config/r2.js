// src/config/r2.js
// Cloudflare R2 S3-compatible client configuration.
// R2 uses the AWS S3 SDK with a custom endpoint.

const { S3Client } = require('@aws-sdk/client-s3');
const env = require('./env');

const r2Client = new S3Client({
  region: 'auto',
  endpoint: env.R2_ENDPOINT,
  credentials: {
    accessKeyId:     env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
  // R2 does not support path-style access — use virtual-hosted style
  forcePathStyle: false,
});

module.exports = r2Client;
