require('dotenv').config();
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

console.log('Testing S3 credentials...');
console.log('Access Key:', process.env.AWS_ACCESS_KEY_ID);
console.log('Secret Key (first 10 chars):', process.env.AWS_SECRET_ACCESS_KEY?.substring(0, 10) + '...');
console.log('Region:', process.env.AWS_REGION);
console.log('Bucket:', process.env.AWS_S3_BUCKET);

s3.headBucket({ Bucket: process.env.AWS_S3_BUCKET }, (err, data) => {
  if (err) {
    console.error('\n❌ S3 Connection Failed:');
    console.error('Error code:', err.code);
    console.error('Error message:', err.message);
    console.error('Status code:', err.statusCode);
    process.exit(1);
  } else {
    console.log('\n✅ S3 Connection Successful!');
    console.log('Bucket exists and is accessible');
    process.exit(0);
  }
});
