'use strict';

const Minio = require('minio');

const BUCKET = process.env.MINIO_BUCKET ?? 'properties';

const minioClient = new Minio.Client({
  endPoint:  process.env.MINIO_ENDPOINT  ?? 'minio',
  port:      parseInt(process.env.MINIO_PORT ?? '9000', 10),
  useSSL:    process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});

/** Ensures the configured bucket exists, creating it if necessary. */
async function ensureBucket() {
  const exists = await minioClient.bucketExists(BUCKET);
  if (!exists) {
    await minioClient.makeBucket(BUCKET, 'us-east-1');
    // Make all objects publicly readable
    const policy = JSON.stringify({
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Principal: { AWS: ['*'] },
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${BUCKET}/*`],
      }],
    });
    await minioClient.setBucketPolicy(BUCKET, policy);
    console.log(`[property-service] MinIO bucket '${BUCKET}' created`);
  }
}

ensureBucket().catch((err) => console.error('[property-service] MinIO bucket init error:', err.message));

module.exports = { minioClient, BUCKET };
