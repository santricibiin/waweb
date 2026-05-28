# Deploy Guide

Panduan cepat deploy WA OTP di VPS Ubuntu.

## 1. Deploy pertama

DNS domain harus sudah pointing ke IP VPS. Lalu SSH ke VPS, jalankan **satu baris**:

```bash
curl -fsSL https://raw.githubusercontent.com/santricibiin/waweb/main/scripts/vps-deploy.sh | sudo bash -s -- --domain=yourdomain.com --email=you@email.com --repo=https://github.com/santricibiin/waweb.git
```

Tunggu 5-10 menit. Selesai → buka `https://yourdomain.com`.

## 2. Aktifkan alias

Setelah deploy selesai, jalankan:

```bash
source /etc/profile.d/wa-otp-aliases.sh
```

Atau tutup SSH dan login ulang — alias auto aktif setiap login baru.

Cek dengan: `waotp-help`

Kalau command di atas error "No such file" berarti deploy belum selesai sampai step alias. Cek dengan `ls /etc/profile.d/wa-otp-aliases.sh`.

## 3. Update kalau ada commit baru

```bash
waupdate
```

Itu saja. Pull + build + restart otomatis.

## 4. Git pull manual (tanpa alias)

Kalau alias belum aktif atau mau pull saja tanpa rebuild:

```bash
sudo -u waotp git -C /opt/wa-otp fetch origin
sudo -u waotp git -C /opt/wa-otp reset --hard origin/main
```

Update lengkap manual:

```bash
sudo bash /opt/wa-otp/scripts/vps-update.sh
```

## 5. Cleanup (mau deploy ulang dari nol)

```bash
wacleanup
```

Atau manual:

```bash
sudo bash /opt/wa-otp/scripts/cleanup.sh
```

Lalu deploy ulang dengan command di langkah 1.

## Daftar alias

```
# Code
waupdate         Update code + build + restart
wapull           Pull code saja

# Service
wastatus         Cek status
warestart        Restart semua
walogs           Lihat log

# Database
wadb             Masuk MySQL
wabackup         Backup DB
warestore        Restore DB

# File & config
waenv            Edit .env
wacd             cd ke folder app

# SSL
wassl-renew      Renew SSL
wassl-status     Cek SSL

# Cleanup
wacleanup        Cleanup biasa
wacleanup-hard   Cleanup total

# Bantuan
waotp-help       Lihat semua alias
```

## Kalau gagal

**Deploy gagal di tengah:**

```bash
curl -fsSL https://raw.githubusercontent.com/santricibiin/waweb/main/scripts/cleanup.sh -o /tmp/c.sh && sudo bash /tmp/c.sh --yes --remove-user
```

Lalu deploy ulang.

**SSL gagal:**

```bash
sudo certbot --nginx -d yourdomain.com
```

**Lihat error:**

```bash
walogs
```

## Info penting

| Yang dicari | Lokasi |
|---|---|
| Folder app | `/opt/wa-otp/` |
| File `.env` | `/opt/wa-otp/.env` |
| Password DB | `/root/.wa-otp-db-password` |
| Backup DB | `/root/backups/` |
| Sesi WhatsApp | `/opt/wa-otp/wa-worker/auth-sessions/` |
