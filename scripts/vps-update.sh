#!/usr/bin/env bash
# =================================================================
# WA OTP Platform - VPS Update Script
# =================================================================
# Pull kode terbaru, install deps, run migrasi, build, restart PM2.
# Aman di-run berkali-kali.
#
# Cara pakai:
#   sudo bash /opt/wa-otp/scripts/vps-update.sh
# =================================================================
set -euo pipefail

APP_DIR="/opt/wa-otp"
APP_USER="waotp"
APP_NAME="wa-otp"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $1"; }
ok()   { echo -e "${GREEN}OK${NC} $1"; }
err()  { echo -e "${RED}ERR${NC} $1"; exit 1; }
step() { echo -e "\n${BLUE}=== $1 ===${NC}"; }

[[ $EUID -ne 0 ]] && err "Harus run dengan sudo (root)."
[[ ! -d "$APP_DIR/.git" ]] && err "$APP_DIR bukan git repo. Run vps-deploy.sh dulu."

# ============================================================
step "1/5 - Pull kode terbaru"
# ============================================================
chown -R $APP_USER:$APP_USER $APP_DIR
sudo -u $APP_USER git -C $APP_DIR fetch origin
BEFORE=$(sudo -u $APP_USER git -C $APP_DIR rev-parse HEAD)
sudo -u $APP_USER git -C $APP_DIR reset --hard origin/main
AFTER=$(sudo -u $APP_USER git -C $APP_DIR rev-parse HEAD)

if [[ "$BEFORE" == "$AFTER" ]]; then
  log "Tidak ada commit baru. Tetap rebuild & restart untuk memastikan service segar."
else
  ok "Updated: $(echo $BEFORE | cut -c1-7) -> $(echo $AFTER | cut -c1-7)"
fi

# ============================================================
step "2/5 - Install/refresh dependencies"
# ============================================================
log "Root deps..."
sudo -u $APP_USER bash -lc "cd $APP_DIR && npm install --no-audit --no-fund" 2>&1 | tail -3

log "Web deps..."
sudo -u $APP_USER bash -lc "cd $APP_DIR/web && npm install --no-audit --no-fund --production=false" 2>&1 | tail -3

log "Worker deps..."
sudo -u $APP_USER bash -lc "cd $APP_DIR/wa-worker && npm install --no-audit --no-fund" 2>&1 | tail -3
ok "Deps siap"

# ============================================================
step "3/5 - Apply Prisma migrations"
# ============================================================
sudo -u $APP_USER bash -lc "cd $APP_DIR/web && npx dotenv -e ../.env -- npx prisma generate" >/dev/null 2>&1 || true
sudo -u $APP_USER bash -lc "cd $APP_DIR/web && npx dotenv -e ../.env -- npx prisma migrate deploy" 2>&1 | tail -5
ok "Schema up-to-date"

# ============================================================
step "4/5 - Rebuild Next.js"
# ============================================================
log "Building production (5-10 menit)..."
sudo -u $APP_USER bash -lc "cd $APP_DIR/web && NODE_OPTIONS='--max-old-space-size=1536' npm run build" 2>&1 | tail -8 || \
  err "Build failed. Cek log di atas."
ok "Build complete"

# ============================================================
step "5/5 - Restart PM2"
# ============================================================
sudo -u $APP_USER bash -lc "pm2 reload ecosystem.config.js --update-env || pm2 restart all"
sudo -u $APP_USER bash -lc "pm2 save"
ok "Services restarted"

echo ""
echo -e "${GREEN}================================================================${NC}"
echo -e "${GREEN}  UPDATE SELESAI${NC}"
echo -e "${GREEN}================================================================${NC}"
echo ""
sudo -u $APP_USER pm2 status
echo ""
echo -e "  Cek logs : ${BLUE}sudo -u $APP_USER pm2 logs${NC}"
echo ""
