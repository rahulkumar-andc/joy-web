# Joy-Web Deployment Guide

## 🚀 Quick Deploy (Manual)

```bash
./deploy.sh
```

---

## 📋 Architecture

```
Internet → Nginx (80/443 SSL) → Docker Container (127.0.0.1:5000)
```

| Component | Details |
|-----------|---------|
| **Domain** | villen.me, www.villen.me |
| **EC2 IP** | 13.48.124.178 |
| **SSH Key** | ~/Downloads/sophism.pem |
| **SSL** | Let's Encrypt (auto-renews) |

---

## 🔄 CI/CD Pipeline Setup (GitHub Actions)

### Prerequisites
1. Push code to GitHub repository
2. Add these **GitHub Secrets** (Settings → Secrets → Actions):

| Secret Name | Value |
|-------------|-------|
| `EC2_HOST` | `13.48.124.178` |
| `EC2_USER` | `ec2-user` |
| `EC2_SSH_KEY` | Contents of `sophism.pem` |
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Your session secret |
| *(add other env vars)* | ... |

### Workflow File
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to EC2

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run build
      
      - name: Deploy to EC2
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USER }}
          key: ${{ secrets.EC2_SSH_KEY }}
          source: "dist/,server/,Dockerfile,package*.json"
          target: "~/joy-web"
      
      - name: Restart Docker
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USER }}
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            cd ~/joy-web
            docker build -t joy-web:latest .
            docker stop joy-web || true
            docker rm joy-web || true
            docker run -d --name joy-web -p 127.0.0.1:5000:5000 \
              --restart unless-stopped \
              -e NODE_ENV=production \
              -e DATABASE_URL="${{ secrets.DATABASE_URL }}" \
              # ... other env vars
              joy-web:latest
```

---

## 🛠️ Manual Deployment Steps

If deploy.sh fails, run manually:

```bash
# 1. Build
npm run build

# 2. Sync to EC2
rsync -avz -e "ssh -i ~/Downloads/sophism.pem" ./dist ./server ec2-user@13.48.124.178:~/joy-web/

# 3. SSH into EC2
ssh -i ~/Downloads/sophism.pem ec2-user@13.48.124.178

# 4. On EC2: Rebuild Docker
cd ~/joy-web
sudo docker build -t joy-web:latest .
sudo docker stop joy-web && sudo docker rm joy-web
sudo docker run -d --name joy-web -p 127.0.0.1:5000:5000 --restart unless-stopped \
  -e NODE_ENV=production \
  -e PORT=5000 \
  ... (env vars) \
  joy-web:latest
```

---

## 🔍 Useful Commands

```bash
# Check container status
ssh -i ~/Downloads/sophism.pem ec2-user@13.48.124.178 "sudo docker ps"

# View logs
ssh -i ~/Downloads/sophism.pem ec2-user@13.48.124.178 "sudo docker logs joy-web --tail 50"

# Restart Nginx
ssh -i ~/Downloads/sophism.pem ec2-user@13.48.124.178 "sudo systemctl restart nginx"

# Check SSL certificate
ssh -i ~/Downloads/sophism.pem ec2-user@13.48.124.178 "sudo certbot certificates"

# Renew SSL (auto but can force)
ssh -i ~/Downloads/sophism.pem ec2-user@13.48.124.178 "sudo certbot renew"
```

---

## 📁 EC2 File Structure

```
~/joy-web/
├── dist/           # Built files (synced from local)
├── server/         # Server source (synced from local)
├── Dockerfile
└── package.json
```

---

## ⚠️ Notes

- **SSL auto-renews** via certbot timer (no action needed)
- **Nginx config** at `/etc/nginx/conf.d/villen.me.conf`
- **Docker restarts automatically** on EC2 reboot (`--restart unless-stopped`)
