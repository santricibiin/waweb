# Deploy Guide

Panduan singkat untuk deploy, update, cleanup di VPS Ubuntu 22.04 / 24.04.

## Deploy pertama kali

Pastikan dulu:
- DNS domain sudah pointing ke IP VPS (A record)
- Port 80 & 443 terbuka di firewall provider
- SSH ke VPS sebagai root (atau user dengan sudo)

Jalankan **satu baris** (jangan ada baris kosong di tengah):

```bash
curl -fsSL https://raw.githubusercontent.com/santricibiin/waweb/main/scripts/vps-deploy.sh | sudo bash -s -- --domain=yourdomain.com --email=you@email.com --repo=https://github.com/santricibiin/waweb.git
```

**Argumen:**

| Flag | Wajib | Keterangan |
|---|---|---|
| `--domain=` | ya | Domain publik |
| `--email=` | ya | Email untuk Let's Encrypt |
| `--repo=` | ya (run pertama) | URL git repo |
| `--token=` | tidak | GitHub PAT untuk repo private |
| `--no-ssl` | tidak | Skip SSL (mis. pakai Cloudflare) |
| `--skip-mysql` | tidak | Pakai DB external |

Selesai dalam ~5-10 menit. Web hidup di `https://yourdomain.com`.

## Update setelah ada commit baru

```bash
waupdate
```

Atau jika alias belum aktif (sebelum login ulang ssh):

```bash
sudo bash /opt/wa-otp/scripts/vps-update.sh
```

`waupdate` = pull code + install deps + migrate DB + build + restart PM2.

## Pull code saja (tanpa rebuild)

```bash
wapull
```

Pakai kalau perubahan tidak butuh rebuild (config doang, dll). Kalau ada perubahan di source code Next.js, harus pakai `waupdate`.

## Cleanup (deploy ulang dari nol)

```bash
# Standard - hapus app, db, services. Paket sistem tetap.
sudo bash /opt/wa-otp/scripts/cleanup.sh

# Skip konfirmasi
sudo bash /opt/wa-otp/scripts/cleanup.sh --yes

# Plus hapus user waotp
sudo bash /opt/wa-otp/scripts/cleanup.sh --remove-user

# Plus revoke SSL cert
sudo bash /opt/wa-otp/scripts/cleanup.sh --remove-ssl

# Paling agresif (user + ssl)
sudo bash /opt/wa-otp/scripts/cleanup.sh --hard
```

Atau via alias:

```bash
wacleanup           # standard
wacleanup-hard      # + user + ssl
```

Cleanup **TIDAK pernah uninstall** Node.js / MySQL / Nginx / Certbot / PM2. Backup di `/root/backups/` juga aman. Tujuannya supaya re-deploy cepat.

## Aliases

Setelah deploy, login ulang SSH (atau `source /etc/profile.d/wa-otp-aliases.sh`) untuk dapat alias berikut:

### Code
```
wapull              Pull code saja
waupdate            Pull + rebuild + restart
```

### Service
```
wastatus            PM2 status (web + worker)
warestart           Restart kedua service
warestart-web       Restart web saja
warestart-worker    Restart worker saja
walogs              Tail logs (last 100)
walogs-web          Logs web saja
walogs-worker       Logs worker saja
```

### Database
```
wadb                Login MySQL sebagai user app
waroot              Login MySQL sebagai root
wadbpass            Print DB password
wabackup            Backup DB ke /root/backups/
wabackups           List backup files
warestore           Restore dari backup (interactive)
```

### Files
```
waenv               Edit .env (nano)
wacd                cd ke /opt/wa-otp
waauth              List Baileys auth-sessions
```

### SSL
```
wassl-renew         Run certbot renew
wassl-status        Cek SSL cert status
```

### Cleanup
```
wacleanup           Cleanup standard
wacleanup-hard      Cleanup + user + SSL
```

### Help
```
waotp-help          Tampilkan semua alias
```

## Troubleshooting

**Deploy gagal di tengah** → cleanup lalu deploy ulang:

```bash
curl -fsSL https://raw.githubusercontent.com/santricibiin/waweb/main/scripts/cleanup.sh -o /tmp/cleanup.sh
sudo bash /tmp/cleanup.sh --yes --remove-user
```

Lalu jalankan command deploy lagi.

**SSL gagal** (DNS belum propagate):

```bash
sudo certbot --nginx -d yourdomain.com
```

**Service tidak jalan** → cek logs:

```bash
walogs              # atau
sudo -u waotp pm2 logs
```

**Restart MySQL hilang setelah reboot:**

```bash
sudo systemctl enable mysql
sudo systemctl start mysql
```

**Lihat password DB:**

```bash
sudo cat /root/.wa-otp-db-password
```

## Lokasi penting

| Path | Isi |
|---|---|
| `/opt/wa-otp/` | App folder |
| `/opt/wa-otp/.env` | Environment variables |
| `/opt/wa-otp/wa-worker/auth-sessions/` | Baileys WA login session |
| `/root/.wa-otp-db-password` | DB password |
| `/root/backups/` | Backup database |
| `/etc/nginx/sites-available/wa-otp` | Nginx config |
| `/etc/profile.d/wa-otp-aliases.sh` | Shell aliases |

## Port

| Port | Service | Akses |
|---|---|---|
| 80 / 443 | Nginx | Public (web) |
| 3001 | Next.js | Internal (di-proxy oleh Nginx) |
| 4001 | Worker (Baileys) | Internal only (di-block UFW dari public) |
| 3306 | MySQL | Localhost only |

## Backup & restore

```bash
wabackup            # buat backup sekarang
wabackups           # list semua backup
warestore           # restore (interactive picker)
```

Backup tersimpan di `/root/backups/wa-otp-YYYYMMDD-HHMMSS.sql.gz`. Sebelum restore, script otomatis bikin snapshot dulu untuk safety.
