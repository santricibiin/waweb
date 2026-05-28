#!/usr/bin/env bash
# =================================================================
# WA OTP Platform - VPS Cleanup Script
# =================================================================
# Bersihkan instalasi WA OTP Platform untuk deploy ulang dari nol.
#
# Yang dihapus:
#   - PM2 services (wa-otp-web, wa-otp-worker)
#   - PM2 startup systemd entry
#   - User waotp + home directory
#   - App folder /opt/wa-otp
#   - MySQL database wa_otp + user waotp
#   - DB password file /root/.wa-otp-db-password
#   - Nginx config /etc/nginx/sites-{available,enabled}/wa-otp
#   - SSL cert (optional, dengan flag)
#   - Aliases /etc/profile.d/wa-otp-aliases.sh
#
# Yang TIDAK dihapus (kecuali pakai flag tertentu):
#   - Paket sistem (Node, MySQL, Nginx, Certbot, PM2) - tetap terpasang
#   - Backup di /root/backups/
#   - Swap file
#   - Firewall rules
#
# Cara pakai:
#   sudo bash cleanup.sh                       # cleanup standar
#   sudo bash cleanup.sh --yes                 # skip konfirmasi
#   sudo bash cleanup.sh --remove-ssl          # hapus juga SSL cert
#   sudo bash cleanup.sh --remove-backups      # hapus juga /root/backups/
#   sudo bash cleanup.sh --nuke                # SEMUA: + uninstall MySQL, swap, dll
# =================================================================
set -euo pipefail

YES=0
REMOVE_SSL=0
REMOVE_BACKUPS=0
NUKE=0

for arg in "$@"; do
  case $arg in
    --yes|-y)         YES=1 ;;
    --remove-ssl)     REMOVE_SSL=1 ;;
    --remove-backups) REMOVE_BACKUPS=1 ;;
    --nuke)           NUKE=1; REMOVE_SSL=1; REMOVE_BACKUPS=1 ;;
    *) echo "Unknown argument: $arg"; exit 1 ;;
  esac
done

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $1"; }
ok()   { echo -e "${GREEN}OK${NC} $1"; }
warn() { echo -e "${YELLOW}WARN${NC} $1"; }
err()  { echo -e "${RED}ERR${NC} $1"; exit 1; }
step() { echo -e "\n${BLUE}=== $1 ===${NC}"; }

[[ $EUID -ne 0 ]] && err "Harus run dengan sudo (root)."

APP_DIR="/opt/wa-otp"
APP_USER="waotp"
DB_NAME="wa_otp"
DB_USER="waotp"
DB_PASS_FILE="/root/.wa-otp-db-password"
ALIAS_FILE="/etc/profile.d/wa-otp-aliases.sh"
NGINX_AVAIL="/etc/nginx/sites-available/wa-otp"
NGINX_ENABL="/etc/nginx/sites-enabled/wa-otp"
BACKUP_DIR="/root/backups"

# Detect domain from existing Nginx config (untuk SSL cleanup)
DOMAIN=""
if [[ -f "$NGINX_AVAIL" ]]; then
  DOMAIN=$(grep -oP 'server_name \K[^;]+' "$NGINX_AVAIL" | head -1 | awk '{print $1}')
fi

# ============================================================
# Confirmation
# ============================================================
echo -e "${YELLOW}================================================================${NC}"
echo -e "${YELLOW}  WA OTP PLATFORM - CLEANUP${NC}"
echo -e "${YELLOW}================================================================${NC}"
echo ""
echo "Yang akan dihapus:"
echo "  [x] PM2 services: wa-otp-web, wa-otp-worker"
echo "  [x] User: $APP_USER (+ home dir)"
echo "  [x] App folder: $APP_DIR"
echo "  [x] MySQL DB: $DB_NAME + user $DB_USER"
echo "  [x] DB password file: $DB_PASS_FILE"
echo "  [x] Nginx config: $NGINX_AVAIL"
echo "  [x] Aliases: $ALIAS_FILE"
[[ $REMOVE_SSL -eq 1 ]]     && echo "  [x] SSL certificate ${DOMAIN:+for $DOMAIN}"
[[ $REMOVE_BACKUPS -eq 1 ]] && echo "  [x] Backup folder: $BACKUP_DIR"
[[ $NUKE -eq 1 ]] && {
  echo "  [x] (NUKE) MySQL Server (uninstall)"
  echo "  [x] (NUKE) Nginx (uninstall)"
  echo "  [x] (NUKE) Certbot (uninstall)"
  echo "  [x] (NUKE) PM2 (uninstall global)"
  echo "  [x] (NUKE) Swap file"
}
echo ""
echo "Yang DIPERTAHANKAN:"
[[ $NUKE -eq 0 ]] && echo "  [v] Paket sistem (Node, MySQL, Nginx, Certbot, PM2)"
[[ $REMOVE_BACKUPS -eq 0 ]] && echo "  [v] Backup di $BACKUP_DIR"
[[ $REMOVE_SSL -eq 0 ]] && [[ -n "$DOMAIN" ]] && echo "  [v] SSL cert untuk $DOMAIN"
echo ""

if [[ $YES -eq 0 ]]; then
  read -rp "Lanjutkan? Ketik 'yes' untuk konfirmasi: " CONFIRM
  [[ "$CONFIRM" != "yes" ]] && { warn "Dibatalkan."; exit 0; }
fi

# ============================================================
# 1. Stop PM2 services
# ============================================================
step "1 - Stop PM2 services"
if id "$APP_USER" >/dev/null 2>&1; then
  sudo -u "$APP_USER" pm2 delete wa-otp-web 2>/dev/null && ok "Stopped wa-otp-web" || true
  sudo -u "$APP_USER" pm2 delete wa-otp-worker 2>/dev/null && ok "Stopped wa-otp-worker" || true
  sudo -u "$APP_USER" pm2 save 2>/dev/null || true
  sudo -u "$APP_USER" pm2 kill 2>/dev/null || true
  ok "PM2 daemon killed"
fi

# Disable systemd auto-start
if systemctl list-unit-files 2>/dev/null | grep -q "pm2-${APP_USER}"; then
  systemctl disable "pm2-${APP_USER}" >/dev/null 2>&1 || true
  systemctl stop "pm2-${APP_USER}" >/dev/null 2>&1 || true
  rm -f /etc/systemd/system/pm2-${APP_USER}.service
  systemctl daemon-reload
  ok "Disabled pm2-${APP_USER}.service"
fi

# ============================================================
# 2. Remove Nginx config
# ============================================================
step "2 - Remove Nginx config"
[[ -L "$NGINX_ENABL" ]] && rm -f "$NGINX_ENABL" && ok "Removed $NGINX_ENABL"
[[ -f "$NGINX_AVAIL" ]] && rm -f "$NGINX_AVAIL" && ok "Removed $NGINX_AVAIL"
if command -v nginx >/dev/null && systemctl is-active nginx >/dev/null 2>&1; then
  nginx -t >/dev/null 2>&1 && systemctl reload nginx && ok "Nginx reloaded" || warn "Nginx config still has errors"
fi

# ============================================================
# 3. Remove SSL certificate (optional)
# ============================================================
if [[ $REMOVE_SSL -eq 1 ]] && [[ -n "$DOMAIN" ]] && command -v certbot >/dev/null; then
  step "3 - Remove SSL certificate"
  certbot delete --cert-name "$DOMAIN" --non-interactive 2>/dev/null && \
    ok "Removed cert for $DOMAIN" || warn "Cert untuk $DOMAIN tidak ditemukan/sudah hilang"
fi

# ============================================================
# 4. Drop MySQL database & user
# ============================================================
step "4 - Drop MySQL database"
if command -v mysql >/dev/null && systemctl is-active mysql >/dev/null 2>&1; then
  mysql -u root <<SQL >/dev/null 2>&1 || warn "MySQL drop sebagian gagal (mungkin sudah tidak ada)"
DROP DATABASE IF EXISTS \`$DB_NAME\`;
DROP USER IF EXISTS '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
SQL
  ok "Dropped database $DB_NAME and user $DB_USER"
fi

# ============================================================
# 5. Remove app folder
# ============================================================
step "5 - Remove app folder"
if [[ -d "$APP_DIR" ]]; then
  rm -rf "$APP_DIR"
  ok "Removed $APP_DIR"
fi

# ============================================================
# 6. Remove user
# ============================================================
step "6 - Remove user $APP_USER"
if id "$APP_USER" >/dev/null 2>&1; then
  # Kill all processes owned by user first (sometimes pm2 daemon stays)
  pkill -u "$APP_USER" 2>/dev/null || true
  sleep 1
  userdel -r "$APP_USER" 2>/dev/null && ok "Removed user $APP_USER (+ home)" || {
    # Force remove if userdel fails (process holding files)
    userdel "$APP_USER" 2>/dev/null || true
    rm -rf "/home/$APP_USER" 2>/dev/null || true
    ok "Removed user $APP_USER (forced)"
  }
fi

# ============================================================
# 7. Remove other files
# ============================================================
step "7 - Remove config files"
[[ -f "$DB_PASS_FILE" ]] && rm -f "$DB_PASS_FILE" && ok "Removed $DB_PASS_FILE"
[[ -f "$ALIAS_FILE" ]]   && rm -f "$ALIAS_FILE"   && ok "Removed $ALIAS_FILE"

if [[ $REMOVE_BACKUPS -eq 1 ]] && [[ -d "$BACKUP_DIR" ]]; then
  COUNT=$(ls -1 "$BACKUP_DIR"/wa-otp-*.sql.gz 2>/dev/null | wc -l)
  rm -f "$BACKUP_DIR"/wa-otp-*.sql.gz "$BACKUP_DIR"/pre-restore-*.sql.gz 2>/dev/null
  ok "Removed $COUNT backup file(s) from $BACKUP_DIR"
  rmdir "$BACKUP_DIR" 2>/dev/null || true  # remove dir kalau kosong
fi

# ============================================================
# 8. (NUKE) Uninstall system packages & swap
# ============================================================
if [[ $NUKE -eq 1 ]]; then
  step "8 - NUKE: Uninstall system packages"

  warn "Mode NUKE - menghapus paket sistem juga"

  # PM2 (global npm)
  if command -v pm2 >/dev/null; then
    npm uninstall -g pm2 >/dev/null 2>&1 || true
    ok "Uninstalled PM2"
  fi

  # MySQL
  if command -v mysql >/dev/null; then
    systemctl stop mysql 2>/dev/null || true
    apt-get purge -y -qq mysql-server mysql-client mysql-common 'mysql-server-*' 'mysql-client-*' 2>/dev/null || true
    apt-get autoremove -y -qq 2>/dev/null
    rm -rf /var/lib/mysql /etc/mysql /var/log/mysql 2>/dev/null || true
    ok "Uninstalled MySQL"
  fi

  # Nginx
  if command -v nginx >/dev/null; then
    systemctl stop nginx 2>/dev/null || true
    apt-get purge -y -qq nginx nginx-common nginx-core 2>/dev/null || true
    apt-get autoremove -y -qq 2>/dev/null
    rm -rf /etc/nginx 2>/dev/null || true
    ok "Uninstalled Nginx"
  fi

  # Certbot
  if command -v certbot >/dev/null; then
    apt-get purge -y -qq certbot python3-certbot-nginx 2>/dev/null || true
    rm -rf /etc/letsencrypt /var/lib/letsencrypt 2>/dev/null || true
    ok "Uninstalled Certbot + LetsEncrypt data"
  fi

  # Swap
  if [[ -f /swapfile ]]; then
    swapoff /swapfile 2>/dev/null || true
    rm -f /swapfile
    sed -i '/\/swapfile/d' /etc/fstab
    ok "Removed swap file"
  fi

  # NOTE: Node.js sengaja TIDAK diuninstall karena mungkin dipakai aplikasi lain
  warn "Node.js TIDAK diuninstall (mungkin dipakai aplikasi lain). Hapus manual jika perlu:"
  warn "  sudo apt-get purge -y nodejs && sudo rm -rf /etc/apt/sources.list.d/nodesource.list"
fi

# ============================================================
# DONE
# ============================================================
echo ""
echo -e "${GREEN}================================================================${NC}"
echo -e "${GREEN}  CLEANUP SELESAI${NC}"
echo -e "${GREEN}================================================================${NC}"
echo ""
echo -e "  Untuk deploy ulang dari nol:"
echo -e "    ${BLUE}curl -fsSL https://raw.githubusercontent.com/<user>/<repo>/main/scripts/vps-deploy.sh | \\${NC}"
echo -e "    ${BLUE}  sudo bash -s -- --domain=DOMAIN --email=EMAIL --repo=REPO_URL${NC}"
echo ""
[[ $NUKE -eq 0 ]] && echo -e "  ${YELLOW}Catatan:${NC} Paket sistem (Node, MySQL, Nginx, Certbot, PM2) masih terpasang."
[[ $NUKE -eq 0 ]] && echo -e "  Deploy ulang akan re-use paket-paket ini (lebih cepat)."
echo ""
