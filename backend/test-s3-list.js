require('dotenv').config();
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

console.log('Testing S3 credentials by listing buckets...');

s3.listBuckets((err, data) => {
  if (err) {
    console.error('\n❌ Failed to list buckets:');
    console.error('Error code:', err.code);
    console.error('Error message:', err.message);
    process.exit(1);
  } else {
    console.log('\n✅ Successfully connected to S3!');
    console.log('Buckets found:', data.Buckets.map(b => b.Name));
    process.exit(0);
  }
});
