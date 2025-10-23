import AWS from 'aws-sdk';
import { promises as fs } from 'fs';
import path from 'path';
import logger from '../../shared/utils/logger';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'ridecast-content';

export async function uploadToS3(
  filePath: string,
  key: string,
  contentType?: string
): Promise<string> {
  try {
    const fileContent = await fs.readFile(filePath);

    const params: AWS.S3.PutObjectRequest = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileContent,
      ContentType: contentType || 'application/octet-stream'
    };

    const result = await s3.upload(params).promise();
    logger.info('File uploaded to S3', { key, location: result.Location });

    return result.Location;
  } catch (error) {
    logger.error('S3 upload error', { error, key });
    throw new Error('Failed to upload file to S3');
  }
}

export async function uploadBufferToS3(
  buffer: Buffer,
  key: string,
  contentType?: string
): Promise<string> {
  try {
    const params: AWS.S3.PutObjectRequest = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType || 'application/octet-stream'
    };

    const result = await s3.upload(params).promise();
    logger.info('Buffer uploaded to S3', { key, location: result.Location });

    return result.Location;
  } catch (error) {
    logger.error('S3 buffer upload error', { error, key });
    throw new Error('Failed to upload buffer to S3');
  }
}

export async function deleteFromS3(key: string): Promise<void> {
  try {
    await s3
      .deleteObject({
        Bucket: BUCKET_NAME,
        Key: key
      })
      .promise();

    logger.info('File deleted from S3', { key });
  } catch (error) {
    logger.error('S3 delete error', { error, key });
    throw new Error('Failed to delete file from S3');
  }
}

export async function getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  try {
    const url = await s3.getSignedUrlPromise('getObject', {
      Bucket: BUCKET_NAME,
      Key: key,
      Expires: expiresIn
    });

    return url;
  } catch (error) {
    logger.error('S3 signed URL error', { error, key });
    throw new Error('Failed to generate signed URL');
  }
}

export function generateS3Key(userId: string, filename: string, type: 'content' | 'audio'): string {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${type}/${userId}/${timestamp}_${sanitizedFilename}`;
}
