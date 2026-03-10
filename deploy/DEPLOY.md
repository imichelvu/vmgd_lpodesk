# Production Deployment — VMGD LeaveDesk

**URL:** `http://leavedesk.vmgd.gov.vu`  
**Stack:** React (Apache2) + Node.js/PM2 + PostgreSQL  
**OS:** Ubuntu 20.04 / 22.04

---

## Architecture

```
Internet
   │
   ▼
Apache2 :80  (leavedesk.vmgd.gov.vu)
   ├── /          → serves /var/www/leavedesk/frontend/dist/  (static files)
   └── /api/*     → ProxyPass → Node.js :5000
                                    │
                                    └── PostgreSQL :5432
```

---

## 1. Server prerequisites

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Node.js 18+ (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# PM2 — Node.js process manager
sudo npm install -g pm2

# Apache2
sudo apt install -y apache2

# Enable required Apache2 modules
sudo a2enmod proxy proxy_http rewrite headers
sudo systemctl restart apache2

# Verify
node -v && npm -v && pm2 -v && apache2 -v
```

---

## 2. PostgreSQL setup

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql

# Create database and user
sudo -u postgres psql <<EOF
CREATE USER leavedesk WITH PASSWORD 'strong-password-here';
CREATE DATABASE vmgd_leave OWNER leavedesk;
GRANT ALL PRIVILEGES ON DATABASE vmgd_leave TO leavedesk;
EOF
```

---

## 3. Clone and install

```bash
sudo mkdir -p /var/www/leavedesk
sudo chown $USER:$USER /var/www/leavedesk

git clone <repo-url> /var/www/leavedesk
cd /var/www/leavedesk

# Install backend dependencies
cd backend && npm install --omit=dev && cd ..

# Install frontend dependencies (needed for the build)
cd frontend && npm install && cd ..

# After this, the repo structure is:
#   /var/www/leavedesk/
#   ├── backend/          ← Node.js API
#   ├── frontend/         ← React app source
#   │   └── dist/         ← built by `npm run build` (step 6)
#   ├── deploy/           ← configs and this guide
#   └── logs/             ← created in step 8
```

---

## 4. Configure backend for production

Edit `/var/www/leavedesk/backend/.env`:

```env
PORT=5000
HOST=127.0.0.1
NODE_ENV=production

DATABASE_URL=postgresql://leavedesk:strong-password-here@localhost:5432/vmgd_leave
JWT_SECRET=replace-with-a-long-random-string
JWT_EXPIRES_IN=7d

CORS_ORIGIN=http://leavedesk.vmgd.gov.vu
APP_URL=http://leavedesk.vmgd.gov.vu

SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-smtp-user@gmail.com
SMTP_PASS=your-smtp-app-password
NOTIFICATION_FROM=leave@vmgd.gov.vu
NOTIFICATION_NAME=VMGD LeaveDesk
```

---

## 5. Run database migrations

```bash
cd /var/www/leavedesk/backend

node src/db/migrate.js
node src/db/migrate-overtime-entries.js
node src/db/migrate-overtime-type.js
node src/db/migrate-overtime-break.js
node src/db/migrate-overtime-location.js
node src/db/migrate-user-signature.js
node src/db/migrate-toil.js
node src/db/seed.js          # only on first deploy
```

---

## 6. Build the frontend

```bash
cd /var/www/leavedesk/frontend
npm run build
# Output: /var/www/leavedesk/frontend/dist/
#         Apache2 serves this directory directly (no copy needed)
```

---

## 7. Configure Apache2

```bash
# Copy the virtual host config
sudo cp /var/www/leavedesk/deploy/apache2.leavedesk.conf \
        /etc/apache2/sites-available/leavedesk.conf

# Enable the site and disable the default
sudo a2ensite leavedesk
sudo a2dissite 000-default

# Test and reload
sudo apache2ctl configtest
sudo systemctl reload apache2
```

---

## 8. Start the backend with PM2

```bash
cd /var/www/leavedesk
mkdir -p logs

pm2 start deploy/pm2.config.js --env production
pm2 save

# Enable PM2 to start on system reboot
pm2 startup
# Copy-paste and run the command it prints, then:
pm2 save
```

Useful PM2 commands:

```bash
pm2 status                    # show process status
pm2 logs leavedesk-api        # stream logs
pm2 restart leavedesk-api     # restart after code change
pm2 reload leavedesk-api      # zero-downtime reload
```

---

## 9. Verify

```bash
# Backend health check
curl http://127.0.0.1:5000/api/health
# Expected: {"ok":true}

# Through Apache (end-to-end)
curl http://leavedesk.vmgd.gov.vu/api/health
# Expected: {"ok":true}
```

Then open `http://leavedesk.vmgd.gov.vu` in a browser — login page should appear.

---

## 10. Deploying updates

```bash
cd /var/www/leavedesk
git pull

# If backend changed:
cd backend && npm install --omit=dev && cd ..
pm2 reload leavedesk-api

# If frontend changed:
cd frontend && npm install && npm run build && cd ..
# Apache2 serves frontend/dist/ directly — no restart needed

# Run any new migrations:
# node backend/src/db/migrate-*.js
```

---

## HTTPS with Let's Encrypt (recommended)

```bash
sudo apt install -y certbot python3-certbot-apache
sudo certbot --apache -d leavedesk.vmgd.gov.vu
```

Certbot updates the Apache config automatically. Then update `backend/.env`:

```env
CORS_ORIGIN=https://leavedesk.vmgd.gov.vu
APP_URL=https://leavedesk.vmgd.gov.vu
```

Also update `frontend/.env.production`:

```env
VITE_API_URL=/api
VITE_APP_NAME=VMGD LeaveDesk
```

Rebuild and redeploy the frontend:

```bash
cd /var/www/leavedesk/frontend && npm run build
sudo systemctl reload apache2
pm2 reload leavedesk-api
```

---

## Troubleshooting

| Symptom | Check |
|---|---|
| `/api/health` times out | `pm2 status` — is `leavedesk-api` running? |
| 403 on frontend | `DocumentRoot` path and file permissions (`www-data` must read) |
| 502 Bad Gateway on `/api` | Backend not running on port 5000 — check `pm2 logs leavedesk-api` |
| CORS error in browser | `CORS_ORIGIN` in `backend/.env` must match the exact browser URL |
| Emails not sending | Check `SMTP_*` vars and Google App Password |
| DB connection failed | Verify `DATABASE_URL` and that PostgreSQL is running: `systemctl status postgresql` |
