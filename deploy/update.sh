#!/bin/bash
# VMGD LeaveDesk — production update script
# Usage (from any directory on the server):
#   bash /var/www/leavedesk/deploy/update.sh
#
# What it does:
#   1. git pull latest code from GitHub
#   2. Install/update backend dependencies
#   3. Run any new database migrations
#   4. Rebuild the frontend
#   5. Reload the backend via PM2 (zero-downtime)

set -e  # stop on first error

APP_DIR="/var/www/leavedesk"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"

echo ""
echo "========================================="
echo "  VMGD LeaveDesk — pulling latest code"
echo "========================================="

# ── 1. Pull latest code ───────────────────────────────────────────────────────
cd "$APP_DIR"
git pull

# ── 2. Backend dependencies ───────────────────────────────────────────────────
echo ""
echo "→ Installing backend dependencies..."
cd "$BACKEND_DIR"
npm install --omit=dev

# ── 3. Run migrations (all are idempotent — safe to re-run) ──────────────────
echo ""
echo "→ Running database migrations..."
node src/db/migrate.js
node src/db/migrate-overtime-entries.js
node src/db/migrate-overtime-type.js
node src/db/migrate-overtime-break.js
node src/db/migrate-overtime-location.js
node src/db/migrate-user-signature.js
node src/db/migrate-toil.js

# ── 4. Rebuild frontend ───────────────────────────────────────────────────────
echo ""
echo "→ Building frontend..."
cd "$FRONTEND_DIR"
npm install
npm run build

# ── 5. Reload backend (zero-downtime) ─────────────────────────────────────────
echo ""
echo "→ Reloading backend via PM2..."
pm2 reload leavedesk-api

echo ""
echo "========================================="
echo "  Done. LeaveDesk is up to date."
echo "  http://leavedesk.vmgd.gov.vu"
echo "========================================="
echo ""
