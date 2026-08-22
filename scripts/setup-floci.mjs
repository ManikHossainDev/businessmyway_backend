import { S3Client, CreateBucketCommand, ListBucketsCommand } from '@aws-sdk/client-s3';
import { SESv2Client, CreateEmailIdentityCommand } from '@aws-sdk/client-sesv2';

const endpoint = 'http://localhost:4566';
const region = 'us-east-1';
const creds = { accessKeyId: 'test', secretAccessKey: 'test' };

const s3 = new S3Client({ endpoint, region, credentials: creds, forcePathStyle: true });
const ses = new SESv2Client({ endpoint, region, credentials: creds, forcePathStyle: true });

async function setup() {
  try {
    await s3.send(new CreateBucketCommand({ Bucket: 'drft-uploads' }));
    console.log('✅ S3 bucket created: drft-uploads');
  } catch (e) {
    if (e.name === 'BucketAlreadyOwnedByYou' || e.name === 'BucketAlreadyExists') {
      console.log('ℹ️  S3 bucket already exists: drft-uploads');
    } else {
      console.error('❌ S3 bucket error:', e.message);
    }
  }

  try {
    await ses.send(new CreateEmailIdentityCommand({ EmailIdentity: 'noreply@drft.app' }));
    console.log('✅ SES identity created: noreply@drft.app');
  } catch (e) {
    if (e.name === 'AlreadyExistsException') {
      console.log('ℹ️  SES identity already exists: noreply@drft.app');
    } else {
      console.error('❌ SES identity error:', e.message);
    }
  }

  const { Buckets } = await s3.send(new ListBucketsCommand({}));
  console.log('📦 Buckets:', Buckets.map(b => b.Name).join(', '));
}

setup().catch(console.error);
