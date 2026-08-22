#!/usr/bin/env bash
set -euo pipefail

echo "==> Setting up floci AWS resources..."

export AWS_ENDPOINT_URL=http://localhost:4566
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1

# Create S3 bucket for uploads
echo "--> Creating S3 bucket: drft-uploads"
aws s3 mb s3://drft-uploads --endpoint-url "$AWS_ENDPOINT_URL" 2>/dev/null || true

# Verify SES email identity (floci may auto-verify)
echo "--> Verifying SES email identity"
aws ses verify-email-identity \
  --email-address noreply@drft.app \
  --endpoint-url "$AWS_ENDPOINT_URL" 2>/dev/null || true

echo "--> Listing S3 buckets"
aws s3 ls --endpoint-url "$AWS_ENDPOINT_URL"

echo ""
echo "==> Setup complete! Resources created:"
echo "   - S3 bucket: drft-uploads"
echo "   - SES verified: noreply@drft.app"
echo ""
echo "Next: set STORAGE_MODE=s3 in .env and restart the app"
