Write-Host "==> Setting up floci AWS resources..." -ForegroundColor Cyan

$env:AWS_ENDPOINT_URL = "http://localhost:4566"
$env:AWS_ACCESS_KEY_ID = "test"
$env:AWS_SECRET_ACCESS_KEY = "test"
$env:AWS_DEFAULT_REGION = "us-east-1"

# Make bucket
Write-Host "--> Creating S3 bucket: drft-uploads"
aws s3 mb s3://drft-uploads --endpoint-url $env:AWS_ENDPOINT_URL 2>$null | Out-Null

# Verify SES email
Write-Host "--> Verifying SES email identity"
aws ses verify-email-identity `
  --email-address noreply@drft.app `
  --endpoint-url $env:AWS_ENDPOINT_URL 2>$null | Out-Null

Write-Host "--> Listing S3 buckets"
aws s3 ls --endpoint-url $env:AWS_ENDPOINT_URL

Write-Host "`n==> Setup complete!" -ForegroundColor Green
Write-Host "   - S3 bucket: drft-uploads"
Write-Host "   - SES verified: noreply@drft.app"
Write-Host "`nNext: set STORAGE_MODE=s3 in .env and restart the app"
