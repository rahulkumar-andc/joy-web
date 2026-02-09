#!/bin/bash

# Deploy script for joy-web to EC2
# Usage: ./deploy.sh

set -e

EC2_HOST="ec2-user@13.48.124.178"
SSH_KEY="$HOME/Downloads/sophism.pem"
PROJECT_DIR="$HOME/Desktop/joy-web"

echo "🚀 Starting deployment to villen.me..."

# Step 1: Build
echo "📦 Building project..."
cd "$PROJECT_DIR"
npm run build

# Step 2: Sync files
echo "📤 Syncing files to EC2..."
rsync -avz --delete -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" ./dist ./server "$EC2_HOST:~/joy-web/"

# Step 3: Rebuild Docker and restart
echo "🐳 Rebuilding Docker container..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$EC2_HOST" << 'REMOTE_SCRIPT'
cd ~/joy-web
sudo docker build -t joy-web:latest .
sudo docker stop joy-web 2>/dev/null || true
sudo docker rm joy-web 2>/dev/null || true
sudo docker run -d --name joy-web -p 127.0.0.1:5000:5000 --restart unless-stopped \
  -e NODE_ENV=production \
  -e PORT=5000 \
  -e ALLOW_INSECURE_COOKIES=true \
  -e DATABASE_URL='postgresql://postgres.tvhxmrrpuiqpzrtclgmt:JoyHarami96@aws-1-ap-south-1.pooler.supabase.com:5432/postgres' \
  -e UPSTASH_REDIS_REST_URL='https://mighty-duckling-34027.upstash.io' \
  -e UPSTASH_REDIS_REST_TOKEN='AYTrAAIncDJlMmY3NzI4MjlkNDA0YTNlYWU2ZDYyNzk5MWNjODdjZHAyMzQwMjc' \
  -e QUEUE_REDIS_URL='redis://default:AYTrAAIncDJlMmY3NzI4MjlkNDA0YTNlYWU2ZDYyNzk5MWNjODdjZHAyMzQwMjc@mighty-duckling-34027.upstash.io:6379' \
  -e SMTP_HOST='smtp.gmail.com' \
  -e SMTP_PORT=587 \
  -e SMTP_SECURE=false \
  -e SMTP_USER='queenvillen00007@gmail.com' \
  -e SMTP_PASS='anxz lnip ulue gvvz' \
  -e MAIL_FROM_NAME='Villen Bhai Security' \
  -e MAIL_FROM_ADDRESS='queenvillen00007@gmail.com' \
  -e IMAGEKIT_PUBLIC_KEY='public_fU0COI0WMsYPqb02YE1YgvAZkRA=' \
  -e IMAGEKIT_PRIVATE_KEY='private_Va3tTh/QaZQ97lMbjlv31ankOVM=' \
  -e IMAGEKIT_URL_ENDPOINT='https://ik.imagekit.io/1qfypyvouv' \
  -e SESSION_SECRET='fd182f966cec8bd4f3ad9e0590cd9d3f8706ebe183632a34a0b779e4c44af0b6' \
  -e VAPID_PUBLIC_KEY='BGOR4ghY1F2cAgZLnn1VVIVC1fh7O-7I67iFa78J6eSJz2Tk-7aRhPFW_MqK22_Oyu0hzVrpWtsvoX-dYeL5qok' \
  -e VAPID_PRIVATE_KEY='rQSIRKAE-LJfW4sm_7G6kuU8Vc3Xuvd-NlrwMUp-COc' \
  joy-web:latest
REMOTE_SCRIPT

# Step 4: Verify
echo "✅ Verifying deployment..."
sleep 5
curl -Is https://villen.me | head -3

echo ""
echo "🎉 Deployment complete! Site live at https://villen.me"
