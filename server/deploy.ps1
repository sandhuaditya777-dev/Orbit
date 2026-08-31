param(
    [Parameter(Mandatory=$true)]
    [string]$Ip,

    [Parameter(Mandatory=$true)]
    [string]$Key,

    [string]$User = "ubuntu",
    [string]$Dir = "/home/ubuntu/orbit-backend"
)

$ErrorActionPreference = "Stop"

# Get server directory
$ServerDir = $PSScriptRoot
Set-Location $ServerDir

# Validate key file
if (-not (Test-Path $Key)) {
    Write-Error "SSH Key not found at: $Key"
    exit 1
}

$KeyPath = (Resolve-Path $Key).Path

Write-Host "🚀 Cleaning & building backend..." -ForegroundColor Cyan
if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
pnpm build

if (-not (Test-Path "dist")) {
    Write-Error "Build failed: dist folder not found."
    exit 1
}

Write-Host "📦 Creating deployment package..." -ForegroundColor Cyan
if (Test-Path "deploy-package.tar.gz") { Remove-Item -Force "deploy-package.tar.gz" }
tar -czf deploy-package.tar.gz dist package.json pnpm-lock.yaml ecosystem.config.js

Write-Host "📁 Ensuring remote directory exists ($Dir)..." -ForegroundColor Cyan
ssh -i "$KeyPath" -o StrictHostKeyChecking=no "$User@$Ip" "mkdir -p $Dir"

Write-Host "⬆️ Uploading package to EC2..." -ForegroundColor Cyan
scp -i "$KeyPath" -o StrictHostKeyChecking=no "deploy-package.tar.gz" "$User@${Ip}:${Dir}/deploy-package.tar.gz"

Remove-Item -Force "deploy-package.tar.gz"

Write-Host "🔄 Extracting and restarting PM2 process on EC2..." -ForegroundColor Cyan
$RemoteCmd = "bash -l -c 'cd $Dir && tar -xzf deploy-package.tar.gz && rm -f deploy-package.tar.gz && (pnpm install --prod || npm install --production) && (pm2 delete orbit-backend || true) && pm2 start ecosystem.config.js && pm2 save'"

ssh -i "$KeyPath" -o StrictHostKeyChecking=no "$User@$Ip" "$RemoteCmd"

Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
Write-Host "To view logs run: ssh -i '$KeyPath' $User@$Ip 'pm2 logs orbit-backend'" -ForegroundColor Yellow
