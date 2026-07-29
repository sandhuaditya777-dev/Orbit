#!/bin/bash
set -e

# Defaults
EC2_USER="ubuntu"
REMOTE_DIR="/home/ubuntu/orbit-backend"

# Help function
usage() {
  echo "Usage: $0 -ip <EC2_IP> -key <KEY_PATH> [-user <USER>] [-dir <REMOTE_DIR>]"
  exit 1
}

# Parse arguments
while [[ "$#" -gt 0 ]]; do
  case $1 in
    -ip) EC2_IP="$2"; shift ;;
    -key) KEY_PATH="$2"; shift ;;
    -user) EC2_USER="$2"; shift ;;
    -dir) REMOTE_DIR="$2"; shift ;;
    *) echo "Unknown parameter: $1"; usage ;;
  esac
  shift
done

if [ -z "$EC2_IP" ] || [ -z "$KEY_PATH" ]; then
  echo "Error: Missing required parameters."
  usage
fi

# Resolve key path to absolute path
ABSOLUTE_KEY_PATH=$(realpath "$KEY_PATH")

if [ ! -f "$ABSOLUTE_KEY_PATH" ]; then
  echo "Error: Identity file (SSH key) not found at: $ABSOLUTE_KEY_PATH"
  exit 1
fi

# Fix key permissions for SSH (chmod 400)
echo "Fixing key permissions (chmod 400)..."
chmod 400 "$ABSOLUTE_KEY_PATH"

echo "Starting Backend Build & Deployment to $EC2_USER@$EC2_IP..."

# Get directory of script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# 1. Build locally
echo "Building NestJS backend..."
pnpm build

if [ ! -d "dist" ]; then
  echo "Error: Build failed: dist directory does not exist."
  exit 1
fi

# 2. Create remote directory
echo "Preparing remote directory ($REMOTE_DIR)..."
ssh -i "$ABSOLUTE_KEY_PATH" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_IP" "mkdir -p $REMOTE_DIR"

# 3. Create zip bundle (uses tar as fallback if zip utility not present on local machine)
echo "Creating deployment package..."
rm -f deploy-package.tar.gz
tar -czf deploy-package.tar.gz dist package.json pnpm-lock.yaml ecosystem.config.js

# 4. Upload package to EC2
echo "Uploading package to EC2..."
scp -i "$ABSOLUTE_KEY_PATH" -o StrictHostKeyChecking=no deploy-package.tar.gz "$EC2_USER@$EC2_IP:$REMOTE_DIR/deploy-package.tar.gz"

# Clean up local package
rm -f deploy-package.tar.gz

# 5. Extract & restart PM2 process on EC2
echo "Extracting and restarting PM2 process on EC2..."
REMOTE_CMD="cd $REMOTE_DIR && tar -xzf deploy-package.tar.gz && rm deploy-package.tar.gz && pnpm install --prod --frozen-lockfile && (pm2 reload orbit-backend || pm2 start ecosystem.config.js) && pm2 save"

ssh -i "$ABSOLUTE_KEY_PATH" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_IP" "$REMOTE_CMD"

echo "Deployment completed successfully!"
echo "To view server logs: ssh -i '$ABSOLUTE_KEY_PATH' $EC2_USER@$EC2_IP 'pm2 logs orbit-backend'"
