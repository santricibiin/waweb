#!/usr/bin/env bash
# =================================================================
# WA OTP Platform - VPS Full Cleanup Script
# =================================================================
#
# Hapus semua artifact WA OTP dari VPS supaya bisa deploy fresh.
#
# Yang dihapus:
#   - PM2 process + daemon (web + worker)
#   - Folder /opt/wa-otp
#   - User waotp (opsional via flag)
#   - Database MySQL `wa_otp` + user
#   - File password DB
#   - Nginx config
#   - SSL certificate (kalau ada via Certbot)
#   - Aliases /etc/profile.d/wa-otp-aliases.sh
#
# YANG TIDAK DIHAPUS (supaya cepat redeploy):
#   - Node.js, MySQL server, Nginx, PM2, Certbot binaries
#   - Swap file
#   - UFW firewall rules
#   - Backup di /root/backups/
#
# Cara pakai:
#   sudo bash cleanup.sh
#   sudo bash cleanup.sh --remove-user      (juga hapus user waotp)
#   sudo bash cleanup.sh --remove-ssl       (juga revoke SSL cert)
#   sudo bash cleanup.sh --domain=DOMAIN    (untuk SSL & nginx domain spesifik)
#   sudo bash cleanup.sh --hard             (full nuke: user + ssl)
#   sudo bash cleanup.sh --yes              (skip konfirmasi)
# =================================================================
set -euo pipefail

REMOVE_USER=0
REMOVE_SSL=0
DOMAIN=""
YES=0

for arg in "$@"; do
  case $arg in
    --remove-user)  REMOVE_USER=1 ;;
    --remove-ssl)   REMOVE_SSL=1 ;;
    --domain=*)     DOMAIN="${arg#*=}" ;;
    --hard)         REMOVE_USER=1; REMOVE_SSL=1 ;;
    --yes|-y)       YES=1 ;;
    *) echo "Unknown argument: $arg"; exit 1 ;;
  esac
done

[[ $EUID -ne 0 ]] && { echo "ERROR: Harus run dengan sudo (root)."; exit 1; }

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $1"; }
ok()   { echo -e "${GREEN}OK${NC} $1"; }
warn() { echo -e "${YELLOW}WARN${NC} $1"; }
step() { echo -e "\n${BLUE}=== $1 ===${NC}"; }

APP_DIR="/opt/wa-otp"
APP_USER="waotp"
APP_NAME="wa-otp"
DB_NAME="wa_otp"
DB_USER="waotp"
DB_PASS_FILE="/root/.wa-otp-db-password"
ALIAS_FILE="/etc/profile.d/wa-otp-aliases.sh"
NGINX_AVAIL="/etc/nginx/sites-available/${APP_NAME}"
NGINX_ENABLED="/etc/nginx/sites-enabled/${APP_NAME}"
WEB_PORT=3001
WORKER_PORT=4001

# Auto-detect domain from existing Nginx config kalau tidak dikasih
if [[ -z "$DOMAIN" && -f "$NGINX_AVAIL" ]]; then
  DOMAIN=$(grep -oP 'server_name \K[^;]+' "$NGINX_AVAIL" | head -1 | awk '{print $1}')
fi

echo -e "${YELLOW}================================================================${NC}"
echo -e "${YELLOW}  WA OTP VPS Cleanup${NC}"
echo -e "${YELLOW}================================================================${NC}"
echo ""
echo -e "  Folder $APP_DIR              : ${RED}akan dihapus${NC}"
echo -e "  Database $DB_NAME              : ${RED}akan di-DROP${NC}"
echo -e "  PM2 process wa-otp-web/worker : ${RED}akan dihapus${NC}"
echo -e "  Nginx config                  : ${RED}akan dihapus${NC}"
echo -e "  Aliases                       : ${RED}akan dihapus${NC}"
[[ $REMOVE_USER -eq 1 ]] && echo -e "  User $APP_USER                    : ${RED}akan dihapus${NC}"
[[ $REMOVE_SSL -eq 1 ]] && [[ -n "$DOMAIN" ]] && echo -e "  SSL cert $DOMAIN              : ${RED}akan revoke${NC}"
echo ""
echo -e "  ${GREEN}Tetap aman:${NC} Node.js, MySQL, Nginx, Certbot, PM2 (binaries)"
echo -e "  ${GREEN}Tetap aman:${NC} /root/backups/ (file backup)"
echo ""

if [[ $YES -eq 0 ]]; then
  echo -ne "${YELLOW}Lanjut? (ketik 'yes' untuk konfirmasi): ${NC}"
  read -r CONFIRM
  [[ "$CONFIRM" != "yes" ]] && { echo "Cancelled."; exit 0; }
fi

# ============================================================
# 1. Stop & remove PM2 (NUCLEAR - kill semua proses node/next/pm2)
# ============================================================
step "1/6 - Stop PM2 process & free ports"

# 1a. Stop PM2 daemon root + user (kalau ada)
pm2 kill 2>/dev/null || true
if id "$APP_USER" >/dev/null 2>&1; then
  sudo -u $APP_USER pm2 delete wa-otp-web 2>/dev/null || true
  sudo -u $APP_USER pm2 delete wa-otp-worker 2>/dev/null || true
  sudo -u $APP_USER pm2 save 2>/dev/null || true
  sudo -u $APP_USER pm2 kill 2>/dev/null || true
fi

# 1b. Force-kill SEMUA proses Next.js / worker / PM2 yang masih hidup
pkill -9 -f "next start" 2>/dev/null || true
pkill -9 -f "next-server" 2>/dev/null || true
pkill -9 -f "PM2" 2>/dev/null || true
pkill -9 -f "/opt/wa-otp" 2>/dev/null || true
pkill -9 -f "wa-worker" 2>/dev/null || true
if id "$APP_USER" >/dev/null 2>&1; then
  pkill -9 -u "$APP_USER" 2>/dev/null || true
fi

# 1c. Force release ports (apapun yg pakai)
fuser -k ${WEB_PORT}/tcp 2>/dev/null || true
fuser -k ${WORKER_PORT}/tcp 2>/dev/null || true

sleep 2

# 1d. Verifikasi port free
if command -v lsof >/dev/null && lsof -i :${WEB_PORT} >/dev/null 2>&1; then
  warn "Port ${WEB_PORT} MASIH dipakai. Cek manual: sudo lsof -i :${WEB_PORT}"
else
  ok "Port ${WEB_PORT} freed"
fi
if command -v lsof >/dev/null && lsof -i :${WORKER_PORT} >/dev/null 2>&1; then
  warn "Port ${WORKER_PORT} MASIH dipakai. Cek manual: sudo lsof -i :${WORKER_PORT}"
else
  ok "Port ${WORKER_PORT} freed"
fi

# 1e. Disable systemd auto-start
systemctl disable pm2-$APP_USER 2>/dev/null || true
systemctl stop pm2-$APP_USER 2>/dev/null || true
rm -f /etc/systemd/system/pm2-$APP_USER.service 2>/dev/null || true
systemctl daemon-reload 2>/dev/null || true
ok "PM2 daemon stopped, processes killed"

# ============================================================
# 2. Hapus folder app + cache
# ============================================================
step "2/6 - Remove app directory & user cache"

if [[ -d "$APP_DIR" ]]; then
  rm -rf "$APP_DIR"
  ok "Removed $APP_DIR"
else
  warn "$APP_DIR tidak ada (sudah bersih)"
fi

# Hapus PM2 home + cache user (kalau home masih ada)
if [[ -d "/home/$APP_USER/.pm2" ]]; then
  rm -rf /home/$APP_USER/.pm2
  ok "Removed /home/$APP_USER/.pm2"
fi
if [[ -d "/home/$APP_USER/.npm" ]]; then
  rm -rf /home/$APP_USER/.npm
  ok "Removed /home/$APP_USER/.npm"
fi
if [[ -d "/home/$APP_USER/.cache" ]]; then
  rm -rf /home/$APP_USER/.cache
  ok "Removed /home/$APP_USER/.cache"
fi
if [[ -f "/home/$APP_USER/.git-credentials" ]]; then
  rm -f /home/$APP_USER/.git-credentials
  ok "Removed /home/$APP_USER/.git-credentials"
fi

# ============================================================
# 3. Drop MySQL database & user
# ============================================================
step "3/6 - Drop MySQL database & user"

if command -v mysql >/dev/null 2>&1; then
  mysql -u root <<SQL 2>/dev/null || true
DROP DATABASE IF EXISTS \`$DB_NAME\`;
DROP USER IF EXISTS '$DB_USER'@'localhost';
DROP USER IF EXISTS '$DB_USER'@'%';
FLUSH PRIVILEGES;
SQL
  ok "Database '$DB_NAME' dropped"
  ok "User '$DB_USER' dropped"
else
  warn "MySQL gak ada"
fi

# Hapus file password
[[ -f "$DB_PASS_FILE" ]] && rm -f "$DB_PASS_FILE" && ok "Removed $DB_PASS_FILE"

# ============================================================
# 4. Hapus Nginx config + Aliases
# ============================================================
step "4/6 - Remove Nginx config & aliases"

if [[ -L "$NGINX_ENABLED" ]] || [[ -f "$NGINX_ENABLED" ]]; then
  rm -f "$NGINX_ENABLED"
  ok "Removed $NGINX_ENABLED"
fi
if [[ -f "$NGINX_AVAIL" ]]; then
  rm -f "$NGINX_AVAIL"
  ok "Removed $NGINX_AVAIL"
fi

# Reload Nginx kalau service jalan
if systemctl is-active --quiet nginx 2>/dev/null; then
  if nginx -t 2>/dev/null; then
    systemctl reload nginx 2>/dev/null || true
    ok "Nginx reloaded"
  else
    warn "Nginx config invalid setelah cleanup. Cek manual: sudo nginx -t"
  fi
fi

# Hapus aliases
if [[ -f "$ALIAS_FILE" ]]; then
  rm -f "$ALIAS_FILE"
  ok "Removed $ALIAS_FILE"
fi

# ============================================================
# 5. Revoke SSL (opsional)
# ============================================================
if [[ $REMOVE_SSL -eq 1 ]]; then
  step "5/6 - Revoke SSL certificate"

  if command -v certbot >/dev/null 2>&1; then
    if [[ -n "$DOMAIN" ]]; then
      certbot delete --cert-name "$DOMAIN" --non-interactive 2>/dev/null || true
      ok "Revoked SSL untuk $DOMAIN"
    else
      warn "Domain tidak terdeteksi - skip. Pakai --domain=DOMAIN untuk revoke spesifik."
    fi
  else
    warn "Certbot gak ada"
  fi
else
  step "5/6 - Skip SSL revoke (pakai --remove-ssl untuk revoke)"
fi

# ============================================================
# 6. Hapus user waotp (opsional)
# ============================================================
if [[ $REMOVE_USER -eq 1 ]]; then
  step "6/6 - Remove user $APP_USER"

  if id "$APP_USER" >/dev/null 2>&1; then
    # Kill semua proses milik user
    pkill -u "$APP_USER" 2>/dev/null || true
    sleep 1
    pkill -9 -u "$APP_USER" 2>/dev/null || true

    # Hapus user + home
    userdel -r "$APP_USER" 2>/dev/null || userdel "$APP_USER" 2>/dev/null || true
    [[ -d "/home/$APP_USER" ]] && rm -rf "/home/$APP_USER"
    ok "User $APP_USER removed"
  else
    warn "User $APP_USER tidak ada"
  fi
else
  step "6/6 - Skip user removal (pakai --remove-user kalau mau hapus)"
fi

# ============================================================
# DONE
# ============================================================
echo ""
echo -e "${GREEN}================================================================${NC}"
echo -e "${GREEN}  CLEANUP SELESAI${NC}"
echo -e "${GREEN}================================================================${NC}"
echo ""
echo -e "${YELLOW}Verifikasi:${NC}"
echo -e "  ls $APP_DIR                              -> harus 'No such file'"
[[ $REMOVE_USER -eq 1 ]] && echo -e "  ls /home/$APP_USER                       -> harus 'No such file'"
[[ $REMOVE_USER -eq 0 ]] && echo -e "  ls /home/$APP_USER/.pm2                  -> harus 'No such file'"
echo -e "  mysql -u root -e 'SHOW DATABASES'        -> tidak ada '$DB_NAME'"
echo -e "  curl http://127.0.0.1:${WEB_PORT}        -> connection refused"
echo ""

# Info backup folder (kalau ada)
if [[ -d "/root/backups" ]]; then
  BACKUP_COUNT=$(ls -1 /root/backups/wa-otp-*.sql.gz 2>/dev/null | wc -l)
  if [[ $BACKUP_COUNT -gt 0 ]]; then
    echo -e "${GREEN}BACKUP DATABASE LAMA TETAP AMAN${NC}"
    echo -e "  Folder       : /root/backups ($BACKUP_COUNT file)"
    echo -e "  Cek isi      : ls -lh /root/backups/"
    echo -e "  Restore      : sudo bash /opt/wa-otp/scripts/db-restore.sh"
    echo -e "  Hapus manual : sudo rm -f /root/backups/wa-otp-*.sql.gz   ${YELLOW}(kalau emang gak butuh)${NC}"
    echo ""
  fi
fi

echo -e "${YELLOW}Re-deploy fresh:${NC}"
echo -e "  ${BLUE}curl -fsSL \"https://raw.githubusercontent.com/santricibiin/waweb/main/scripts/vps-deploy.sh?\$(date +%s)\" | sudo bash -s -- \\${NC}"
echo -e "  ${BLUE}    --domain=DOMAIN --email=EMAIL --repo=https://github.com/santricibiin/waweb.git${NC}"
echo ""
