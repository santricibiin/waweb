#!/usr/bin/env bash
# =================================================================
# WA OTP Platform - VPS Auto-Deploy untuk Ubuntu 22.04 / 24.04
# =================================================================
#
# Deploy lengkap dari nol: install Node.js, MySQL, Nginx, Certbot,
# PM2, clone repo, setup .env, prisma migrate, build, jalanin web +
# worker, configure Nginx + SSL.
#
# Idempotent - aman di-run ulang.
#
# Cara pakai (1 perintah, repo public):
#   curl -fsSL https://raw.githubusercontent.com/<user>/<repo>/main/scripts/vps-deploy.sh | \
#     sudo bash -s -- --domain=DOMAIN --email=EMAIL --repo=REPO_URL
#
# Atau kalau code sudah di-clone ke /opt/wa-otp:
#   sudo bash scripts/vps-deploy.sh --domain=DOMAIN --email=EMAIL
#
# Argumen:
#   --domain=<domain>    (wajib, contoh: otp.example.com)
#   --email=<email>      (wajib, untuk SSL)
#   --repo=<git-url>     (opsional kalau code sudah ada)
#   --token=<gh-pat>     (opsional, untuk repo private)
#   --no-ssl             skip Let's Encrypt (mis. pakai Cloudflare proxy)
#   --skip-mysql         pakai DB external
# =================================================================
set -euo pipefail

# ----------------------- args -----------------------
DOMAIN=""
EMAIL=""
REPO=""
TOKEN=""
NO_SSL=0
SKIP_MYSQL=0

for arg in "$@"; do
  case $arg in
    --domain=*)     DOMAIN="${arg#*=}" ;;
    --email=*)      EMAIL="${arg#*=}" ;;
    --repo=*)       REPO="${arg#*=}" ;;
    --token=*)      TOKEN="${arg#*=}" ;;
    --no-ssl)       NO_SSL=1 ;;
    --skip-mysql)   SKIP_MYSQL=1 ;;
    *) echo "Unknown argument: $arg"; exit 1 ;;
  esac
done

[[ -z "$DOMAIN" || -z "$EMAIL" ]] && {
  echo "Usage: $0 --domain=<domain> --email=<email> [--repo=<git>] [--token=<gh-pat>] [--no-ssl] [--skip-mysql]"
  exit 1
}
[[ $EUID -ne 0 ]] && { echo "ERROR: Harus run dengan sudo (root)."; exit 1; }

# ----------------------- logging -----------------------
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $1"; }
ok()   { echo -e "${GREEN}OK${NC} $1"; }
warn() { echo -e "${YELLOW}WARN${NC} $1"; }
err()  { echo -e "${RED}ERR${NC} $1"; exit 1; }
step() { echo -e "\n${BLUE}=== $1 ===${NC}"; }

APP_DIR="/opt/wa-otp"
APP_USER="waotp"
APP_NAME="wa-otp"
DB_NAME="wa_otp"
DB_USER="waotp"
NODE_VERSION="20"
WEB_PORT=3001
WORKER_PORT=4001

# ============================================================
# STEP 0 - Pre-flight (RAM check, auto-swap, disk check)
# ============================================================
step "0/10 - Pre-flight"

RAM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
RAM_MB=$((RAM_KB / 1024))
log "RAM: ${RAM_MB} MB"

if [[ $RAM_MB -lt 1800 && ! -f /swapfile ]]; then
  log "RAM kurang 1.8 GB - membuat swap 2 GB..."
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null 2>&1
  swapon /swapfile
  if ! grep -q "/swapfile" /etc/fstab; then
    echo "/swapfile none swap sw 0 0" >> /etc/fstab
  fi
  ok "Swap 2 GB aktif"
elif [[ -f /swapfile ]]; then
  ok "Swap sudah ada"
else
  ok "RAM cukup, no swap needed"
fi

DISK_FREE_GB=$(df -BG / | awk 'NR==2 {gsub("G",""); print $4}')
[[ $DISK_FREE_GB -lt 5 ]] && err "Disk < 5 GB free. Tambah disk dulu."
ok "Disk free: ${DISK_FREE_GB} GB"

# ============================================================
# STEP 1 - System packages
# ============================================================
step "1/10 - Install system packages"

export DEBIAN_FRONTEND=noninteractive

# Quick scan: tampilkan apa yang akan di-install vs di-skip
log "Memeriksa paket terpasang..."
SCAN=()
command -v node    >/dev/null && [[ "$(node -v 2>/dev/null)" == v${NODE_VERSION}.* ]] && SCAN+=("node:skip") || SCAN+=("node:install")
command -v mysql   >/dev/null && SCAN+=("mysql:skip") || SCAN+=("mysql:install")
command -v nginx   >/dev/null && SCAN+=("nginx:skip") || SCAN+=("nginx:install")
command -v certbot >/dev/null && SCAN+=("certbot:skip") || SCAN+=("certbot:install")
command -v pm2     >/dev/null && SCAN+=("pm2:skip") || SCAN+=("pm2:install")
echo -e "  Status: ${SCAN[*]}"

# Cuma apt-get update kalau ada yang perlu diinstall
NEED_INSTALL=0
for s in "${SCAN[@]}"; do [[ "$s" == *":install" ]] && NEED_INSTALL=1; done
if [[ $NEED_INSTALL -eq 1 ]]; then
  apt-get update -qq
fi
apt-get install -y -qq curl wget git ufw build-essential ca-certificates gnupg openssl 2>/dev/null

# Node.js
if command -v node >/dev/null && [[ "$(node -v 2>/dev/null)" == v${NODE_VERSION}.* ]]; then
  ok "Node.js $(node -v) - npm $(npm -v) [skip]"
else
  log "Installing Node.js ${NODE_VERSION} LTS..."
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - >/dev/null 2>&1
  apt-get install -y -qq nodejs
  ok "Node.js $(node -v) - npm $(npm -v)"
fi
chmod 755 /usr/bin/node /usr/bin/npm /usr/bin/npx 2>/dev/null || true

# MySQL / MariaDB
if [[ $SKIP_MYSQL -eq 0 ]]; then
  if command -v mysql >/dev/null; then
    systemctl is-active mysql >/dev/null 2>&1 || systemctl start mysql 2>/dev/null || true
    ok "MySQL $(mysql --version | head -1 | awk '{print $3}') [skip install]"
  else
    log "Installing MySQL Server..."
    apt-get install -y -qq mysql-server
    systemctl enable mysql >/dev/null
    systemctl start mysql
    ok "MySQL $(mysql --version | head -1 | awk '{print $3}')"
  fi
fi

# Nginx
if command -v nginx >/dev/null; then
  systemctl is-active nginx >/dev/null 2>&1 || systemctl start nginx 2>/dev/null || true
  ok "Nginx [skip install]"
else
  apt-get install -y -qq nginx
  systemctl enable nginx >/dev/null
  ok "Nginx installed"
fi

# Certbot
if [[ $NO_SSL -eq 0 ]]; then
  if command -v certbot >/dev/null; then
    ok "Certbot [skip install]"
  else
    apt-get install -y -qq certbot python3-certbot-nginx
    ok "Certbot installed"
  fi
fi

# PM2
if command -v pm2 >/dev/null; then
  ok "PM2 $(pm2 -v) [skip install]"
else
  npm install -g pm2 >/dev/null 2>&1
  ok "PM2 $(pm2 -v) installed"
fi
chmod 755 /usr/lib/node_modules -R 2>/dev/null || true
chmod +x /usr/bin/pm2 2>/dev/null || true

# ============================================================
# STEP 2 - App user
# ============================================================
step "2/10 - Setup app user"

if ! id "$APP_USER" >/dev/null 2>&1; then
  useradd -m -d /home/$APP_USER -s /bin/bash $APP_USER
  ok "Created user: $APP_USER"
else
  CURRENT_SHELL=$(getent passwd $APP_USER | cut -d: -f7)
  if [[ "$CURRENT_SHELL" != "/bin/bash" ]]; then
    usermod -s /bin/bash $APP_USER
    ok "Fixed shell user $APP_USER -> /bin/bash"
  else
    ok "User $APP_USER ready"
  fi
fi

[[ ! -d /home/$APP_USER ]] && mkdir -p /home/$APP_USER && chown $APP_USER:$APP_USER /home/$APP_USER

# ============================================================
# STEP 3 - Get application code
# ============================================================
step "3/10 - Get application code"

if [[ -n "$REPO" ]]; then
  CLONE_URL="$REPO"
  if [[ -n "$TOKEN" ]]; then
    CLONE_URL=$(echo "$REPO" | sed -E "s#https://(github\.com)#https://oauth2:${TOKEN}@\1#")
    log "Token detected, using authenticated URL"
  fi

  if [[ -d "$APP_DIR/.git" ]]; then
    log "Pulling latest code..."
    chown -R $APP_USER:$APP_USER $APP_DIR
    [[ -n "$TOKEN" ]] && sudo -u $APP_USER git -C $APP_DIR remote set-url origin "$CLONE_URL"
    sudo -u $APP_USER git -C $APP_DIR fetch origin
    sudo -u $APP_USER git -C $APP_DIR reset --hard origin/main
  else
    log "Cloning repo from $REPO ..."
    [[ -d "$APP_DIR" ]] && rm -rf "$APP_DIR"
    git clone --depth 1 "$CLONE_URL" "$APP_DIR"
    chown -R $APP_USER:$APP_USER "$APP_DIR"
  fi

  if [[ -n "$TOKEN" ]]; then
    sudo -u $APP_USER git -C $APP_DIR config credential.helper store
    echo "https://oauth2:${TOKEN}@github.com" > /home/$APP_USER/.git-credentials
    chown $APP_USER:$APP_USER /home/$APP_USER/.git-credentials
    chmod 600 /home/$APP_USER/.git-credentials
    ok "Git credential saved"
  fi

  ok "Code synced to $APP_DIR"
elif [[ -f "$APP_DIR/package.json" ]]; then
  chown -R $APP_USER:$APP_USER "$APP_DIR"
  ok "Code already exists, skip clone"
else
  err "$APP_DIR kosong dan --repo tidak diisi. Pakai --repo=<url> atau upload code manual."
fi

# Validate it's a WA OTP project
[[ ! -f "$APP_DIR/web/package.json" || ! -f "$APP_DIR/wa-worker/package.json" ]] && \
  err "Struktur proyek tidak sesuai. Pastikan ada folder web/ dan wa-worker/."

# ============================================================
# STEP 4 - MySQL database
# ============================================================
step "4/10 - Setup MySQL"

if [[ $SKIP_MYSQL -eq 0 ]]; then
  DB_PASS_FILE="/root/.${APP_NAME}-db-password"
  if [[ -f "$DB_PASS_FILE" ]]; then
    DB_PASS=$(cat "$DB_PASS_FILE")
    ok "Re-using DB password"
  else
    DB_PASS=$(openssl rand -hex 24)
    echo "$DB_PASS" > "$DB_PASS_FILE"
    chmod 600 "$DB_PASS_FILE"
    ok "Generated DB password (saved at $DB_PASS_FILE)"
  fi

  mysql -u root <<SQL >/dev/null 2>&1
CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
DROP USER IF EXISTS '$DB_USER'@'localhost';
CREATE USER '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
SQL
  ok "MySQL ready: $DB_NAME / $DB_USER"
fi

# ============================================================
# STEP 5 - .env
# ============================================================
step "5/10 - Configure .env"

ENV_FILE="$APP_DIR/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  JWT_SECRET=$(openssl rand -base64 48 | tr -d '/+=' | head -c 64)
  WORKER_TOKEN=$(openssl rand -base64 32 | tr -d '/+=' | head -c 48)
  if [[ $SKIP_MYSQL -eq 0 ]]; then
    DB_URL="mysql://$DB_USER:$DB_PASS@localhost:3306/$DB_NAME"
  else
    DB_URL="mysql://USER:PASS@HOST:3306/DBNAME"
  fi

  cat > "$ENV_FILE" <<EOF
# Auto-generated by vps-deploy.sh on $(date)

# Database
DATABASE_URL="$DB_URL"

# Web app (Next.js)
JWT_SECRET="$JWT_SECRET"
NEXT_PUBLIC_APP_URL="https://$DOMAIN"

# Internal worker channel (do not expose)
WORKER_URL="http://localhost:${WORKER_PORT}"
WORKER_INTERNAL_TOKEN="$WORKER_TOKEN"

# WhatsApp worker
WORKER_PORT=${WORKER_PORT}
WA_AUTH_DIR="./auth-sessions"

NODE_ENV="production"
EOF
  chown $APP_USER:$APP_USER "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  ok ".env created"
else
  if [[ $SKIP_MYSQL -eq 0 ]] && grep -q "DATABASE_URL" "$ENV_FILE"; then
    EXPECTED_URL="mysql://$DB_USER:$DB_PASS@localhost:3306/$DB_NAME"
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"$EXPECTED_URL\"|" "$ENV_FILE"
  fi
  sed -i "s|^NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=\"https://$DOMAIN\"|" "$ENV_FILE"
  ok ".env existing - refreshed DATABASE_URL & APP_URL"
fi

# ============================================================
# STEP 6 - Install dependencies (web + worker)
# ============================================================
step "6/10 - Install dependencies"

chown -R $APP_USER:$APP_USER "$APP_DIR"

log "Installing root deps..."
sudo -u $APP_USER bash -lc "cd $APP_DIR && npm install --no-audit --no-fund" 2>&1 | tail -3

log "Installing web deps (3-5 menit)..."
sudo -u $APP_USER bash -lc "cd $APP_DIR/web && npm install --no-audit --no-fund --production=false" 2>&1 | tail -3

log "Installing worker deps (Baileys, jimp, dll)..."
sudo -u $APP_USER bash -lc "cd $APP_DIR/wa-worker && npm install --no-audit --no-fund" 2>&1 | tail -3

ok "Dependencies installed"

# ============================================================
# STEP 7 - Prisma migrate + build Next.js
# ============================================================
step "7/10 - Prisma migrate & build"

log "Running Prisma migration..."
sudo -u $APP_USER bash -lc "cd $APP_DIR/web && npx dotenv -e ../.env -- npx prisma generate" >/dev/null 2>&1 || true
sudo -u $APP_USER bash -lc "cd $APP_DIR/web && npx dotenv -e ../.env -- npx prisma migrate deploy" 2>&1 | tail -5
ok "Schema migrated"

log "Building Next.js (5-10 menit, sabar)..."
sudo -u $APP_USER bash -lc "cd $APP_DIR/web && NODE_OPTIONS='--max-old-space-size=1536' npm run build" 2>&1 | tail -8 || {
  err "Build failed. Cek log di atas. Common fix:
    1. RAM tidak cukup -> tambah swap (script seharusnya auto-handle)
    2. Env var hilang -> cek $ENV_FILE
    3. Module corrupt -> rm -rf $APP_DIR/*/node_modules dan re-run script"
}
ok "Build complete"

# Auth sessions folder for Baileys
mkdir -p "$APP_DIR/wa-worker/auth-sessions"
chown -R $APP_USER:$APP_USER "$APP_DIR/wa-worker/auth-sessions"

# ============================================================
# STEP 8 - PM2 services (web + worker)
# ============================================================
step "8/10 - Setup PM2 services"

[[ -d /home/$APP_USER/.pm2 ]] && {
  chown -R $APP_USER:$APP_USER /home/$APP_USER/.pm2 2>/dev/null || true
}

# Generate ecosystem config
cat > "$APP_DIR/ecosystem.config.js" <<EOF
module.exports = {
  apps: [
    {
      name: "${APP_NAME}-web",
      cwd: "${APP_DIR}/web",
      script: "node_modules/next/dist/bin/next",
      args: "start -p ${WEB_PORT}",
      env: {
        NODE_ENV: "production",
        PORT: "${WEB_PORT}",
      },
      max_memory_restart: "512M",
    },
    {
      name: "${APP_NAME}-worker",
      cwd: "${APP_DIR}/wa-worker",
      script: "src/index.js",
      env: {
        NODE_ENV: "production",
      },
      max_memory_restart: "512M",
    },
  ],
};
EOF
chown $APP_USER:$APP_USER "$APP_DIR/ecosystem.config.js"

# Stop & restart fresh
sudo -u $APP_USER bash -lc "pm2 delete ${APP_NAME}-web ${APP_NAME}-worker 2>/dev/null || true"
sudo -u $APP_USER bash -lc "cd $APP_DIR && pm2 start ecosystem.config.js"
sudo -u $APP_USER bash -lc "pm2 save"

env PATH=$PATH:/usr/bin pm2 startup systemd -u $APP_USER --hp /home/$APP_USER >/dev/null 2>&1 || true
systemctl enable pm2-$APP_USER >/dev/null 2>&1 || true
ok "PM2 running '${APP_NAME}-web' (port ${WEB_PORT}) + '${APP_NAME}-worker' (port ${WORKER_PORT})"

log "Waiting for web to respond..."
for i in {1..30}; do
  if curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${WEB_PORT}" 2>/dev/null | grep -qE "^(2|3)"; then
    ok "Web responding on port ${WEB_PORT}"
    break
  fi
  sleep 1
done

# ============================================================
# STEP 9 - Nginx + SSL
# ============================================================
step "9/10 - Nginx + SSL"

cat > /etc/nginx/sites-available/${APP_NAME} <<EOF
server {
    listen 80;
    server_name $DOMAIN;
    client_max_body_size 5M;

    # Public web + API (Next.js)
    location / {
        proxy_pass http://127.0.0.1:${WEB_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60s;
    }

    # Worker port (4001) sengaja TIDAK di-proxy.
    # Worker hanya boleh diakses dari Next.js via 127.0.0.1.
}
EOF

ln -sf /etc/nginx/sites-available/${APP_NAME} /etc/nginx/sites-enabled/${APP_NAME}
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
ok "Nginx configured for $DOMAIN"

# UFW firewall
if command -v ufw >/dev/null; then
  ufw allow 22/tcp >/dev/null 2>&1 || true
  ufw allow 'Nginx Full' >/dev/null 2>&1 || true
  echo "y" | ufw enable >/dev/null 2>&1 || true
  ok "Firewall enabled (SSH + HTTP/HTTPS)"
fi

# Block worker port from outside (extra safety)
if command -v ufw >/dev/null; then
  ufw deny ${WORKER_PORT}/tcp >/dev/null 2>&1 || true
  ok "Worker port ${WORKER_PORT} denied from public"
fi

# SSL Let's Encrypt
if [[ $NO_SSL -eq 0 ]]; then
  log "Requesting SSL certificate..."
  if certbot --nginx -d "$DOMAIN" --email "$EMAIL" --agree-tos --no-eff-email --redirect --non-interactive 2>&1 | tail -5; then
    ok "SSL active: https://$DOMAIN"
  else
    warn "SSL gagal. DNS belum propagate? Re-run nanti:"
    warn "  sudo certbot --nginx -d $DOMAIN"
  fi
fi

# ============================================================
# STEP 10 - Health check
# ============================================================
step "10/10 - Final health check"

HEALTH_OK=0
for i in {1..15}; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${WEB_PORT}/" 2>/dev/null || echo "000")
  if [[ "$CODE" =~ ^(200|301|302|307|308)$ ]]; then
    HEALTH_OK=1
    break
  fi
  sleep 2
done

WORKER_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "x-internal-token: $(grep '^WORKER_INTERNAL_TOKEN' "$ENV_FILE" | cut -d'"' -f2)" \
  "http://127.0.0.1:${WORKER_PORT}/health" 2>/dev/null || echo "000")

[[ $HEALTH_OK -eq 1 ]] && ok "Web healthy" || warn "Web not responding (cek pm2 logs)"
[[ "$WORKER_HEALTH" == "200" ]] && ok "Worker healthy" || warn "Worker not responding (cek pm2 logs)"

# ============================================================
# DONE
# ============================================================
echo ""
echo -e "${GREEN}================================================================${NC}"
echo -e "${GREEN}  DEPLOY SELESAI${NC}"
echo -e "${GREEN}================================================================${NC}"
echo ""
echo -e "  URL              : ${BLUE}https://$DOMAIN${NC}"
echo -e "  API base         : ${BLUE}https://$DOMAIN/api/v1${NC}"
echo -e "  Demo page        : ${BLUE}https://$DOMAIN/demo.html${NC}"
echo -e "  Docs             : ${BLUE}https://$DOMAIN/docs${NC}"
echo -e "  App Path         : ${BLUE}$APP_DIR${NC}"
echo ""

if [[ $SKIP_MYSQL -eq 0 ]]; then
  CURRENT_DB_PASS=$(cat "$DB_PASS_FILE" 2>/dev/null || echo "?")
  echo -e "${YELLOW}=== DATABASE INFO ===${NC}"
  echo -e "  DB Name          : ${BLUE}$DB_NAME${NC}"
  echo -e "  DB User          : ${BLUE}$DB_USER${NC}"
  echo -e "  DB Host          : ${BLUE}localhost:3306${NC}"
  echo -e "  DB Password      : ${GREEN}$CURRENT_DB_PASS${NC}"
  echo -e "  Password File    : ${BLUE}$DB_PASS_FILE${NC}"
  echo ""
  echo -e "${YELLOW}LOGIN MYSQL:${NC}"
  echo -e "  Sebagai root (no pass): ${BLUE}sudo mysql ${DB_NAME}${NC}"
  echo -e "  Sebagai user app     :"
  echo -e "    ${BLUE}DB_PASS=\$(sudo cat ${DB_PASS_FILE})${NC}"
  echo -e "    ${BLUE}mysql -u ${DB_USER} -p\"\$DB_PASS\" ${DB_NAME}${NC}"
  echo ""
fi

echo -e "${YELLOW}NEXT STEPS:${NC}"
echo -e "  1. Buka ${BLUE}https://$DOMAIN/register${NC} -> daftar akun"
echo -e "  2. Buka ${BLUE}/dashboard/wa-sessions${NC} -> tambah sesi -> scan QR"
echo -e "  3. Buka ${BLUE}/dashboard/api-keys${NC} -> buat key"
echo -e "  4. Test pakai ${BLUE}/demo.html${NC} atau lihat ${BLUE}/docs${NC}"
echo ""
echo -e "${YELLOW}USEFUL COMMANDS:${NC}"
echo -e "  Status app           : ${BLUE}sudo -u $APP_USER pm2 status${NC}"
echo -e "  Logs web             : ${BLUE}sudo -u $APP_USER pm2 logs ${APP_NAME}-web${NC}"
echo -e "  Logs worker          : ${BLUE}sudo -u $APP_USER pm2 logs ${APP_NAME}-worker${NC}"
echo -e "  Restart web          : ${BLUE}sudo -u $APP_USER pm2 restart ${APP_NAME}-web${NC}"
echo -e "  Restart worker       : ${BLUE}sudo -u $APP_USER pm2 restart ${APP_NAME}-worker${NC}"
echo -e "  Restart semua        : ${BLUE}sudo -u $APP_USER pm2 restart all${NC}"
echo -e "  Update code & rebuild: ${BLUE}sudo bash $APP_DIR/scripts/vps-update.sh${NC}"
echo ""
echo -e "${YELLOW}KEAMANAN:${NC}"
echo -e "  Worker port ${WORKER_PORT} hanya bisa diakses dari localhost. Jangan buka public!"
echo -e "  File ${BLUE}$ENV_FILE${NC} berisi credential - permission 600"
echo -e "  Folder ${BLUE}$APP_DIR/wa-worker/auth-sessions/${NC} berisi WA session - jangan dihapus"
echo ""
