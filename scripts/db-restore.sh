#!/usr/bin/env bash
# =================================================================
# WA OTP Platform - Database Restore Helper
# =================================================================
# Restore database wa_otp dari file backup .sql.gz yang ada di
# /root/backups/. Interactive: pilih file dari list.
#
# Cara pakai:
#   sudo bash /opt/wa-otp/scripts/db-restore.sh                 (interactive)
#   sudo bash /opt/wa-otp/scripts/db-restore.sh /path/file.sql.gz
# =================================================================
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BLUE='\033[0;34m'; NC='\033[0m'
ok()   { echo -e "${GREEN}OK${NC} $1"; }
warn() { echo -e "${YELLOW}WARN${NC} $1"; }
err()  { echo -e "${RED}ERR${NC} $1"; exit 1; }

[[ $EUID -ne 0 ]] && err "Harus run dengan sudo (root)."

DB_NAME="wa_otp"
BACKUP_DIR="/root/backups"
APP_USER="waotp"

FILE="${1:-}"

if [[ -z "$FILE" ]]; then
  # Interactive picker
  [[ ! -d "$BACKUP_DIR" ]] && err "Folder $BACKUP_DIR tidak ditemukan. Buat backup dulu dengan 'wabackup'."

  mapfile -t FILES < <(ls -1t "$BACKUP_DIR"/wa-otp-*.sql.gz 2>/dev/null || true)
  [[ ${#FILES[@]} -eq 0 ]] && err "Tidak ada file backup di $BACKUP_DIR (pattern: wa-otp-*.sql.gz)."

  echo -e "${BLUE}Pilih file backup untuk di-restore:${NC}"
  for i in "${!FILES[@]}"; do
    SIZE=$(du -h "${FILES[$i]}" | cut -f1)
    DATE=$(basename "${FILES[$i]}" | sed -E 's/wa-otp-([0-9]{8})-([0-9]{6})\.sql\.gz/\1 \2/')
    printf "  ${YELLOW}[%2d]${NC} %s  ${BLUE}(%s)${NC}\n" "$((i+1))" "$(basename "${FILES[$i]}")" "$SIZE"
  done
  echo ""
  read -rp "Masukkan nomor (1-${#FILES[@]}) atau path lengkap: " CHOICE

  if [[ "$CHOICE" =~ ^[0-9]+$ ]] && (( CHOICE >= 1 && CHOICE <= ${#FILES[@]} )); then
    FILE="${FILES[$((CHOICE-1))]}"
  elif [[ -f "$CHOICE" ]]; then
    FILE="$CHOICE"
  else
    err "Pilihan tidak valid."
  fi
fi

[[ ! -f "$FILE" ]] && err "File tidak ditemukan: $FILE"

# Confirm
echo ""
echo -e "${YELLOW}PERINGATAN:${NC} Database '${BLUE}${DB_NAME}${NC}' akan ditimpa dengan isi backup."
echo -e "  Backup file: ${BLUE}$FILE${NC}"
echo -e "  Size:        ${BLUE}$(du -h "$FILE" | cut -f1)${NC}"
echo ""
read -rp "Lanjutkan? Ketik 'yes' untuk konfirmasi: " CONFIRM
[[ "$CONFIRM" != "yes" ]] && { warn "Dibatalkan."; exit 0; }

# Auto-snapshot before restore (safety net)
SNAPSHOT="$BACKUP_DIR/pre-restore-$(date +%Y%m%d-%H%M%S).sql.gz"
echo ""
echo -e "${BLUE}Membuat snapshot otomatis sebelum restore...${NC}"
mysqldump "$DB_NAME" 2>/dev/null | gzip > "$SNAPSHOT"
ok "Snapshot tersimpan: $SNAPSHOT"

# Stop services to prevent writes during restore
if command -v pm2 >/dev/null; then
  echo -e "${BLUE}Stopping services sementara...${NC}"
  sudo -u "$APP_USER" pm2 stop all 2>/dev/null || true
fi

# Restore
echo -e "${BLUE}Restoring $FILE -> $DB_NAME ...${NC}"
if [[ "$FILE" == *.gz ]]; then
  gunzip -c "$FILE" | mysql "$DB_NAME"
else
  mysql "$DB_NAME" < "$FILE"
fi
ok "Database restored"

# Restart services
if command -v pm2 >/dev/null; then
  echo -e "${BLUE}Restarting services...${NC}"
  sudo -u "$APP_USER" pm2 restart all 2>/dev/null || true
  ok "Services restarted"
fi

echo ""
echo -e "${GREEN}Restore selesai.${NC}"
echo -e "  Kalau ada masalah, snapshot pre-restore ada di: ${BLUE}$SNAPSHOT${NC}"
echo -e "  Untuk rollback: ${BLUE}sudo bash $0 $SNAPSHOT${NC}"
