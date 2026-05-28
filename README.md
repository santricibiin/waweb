# WA OTP Platform

Platform pengiriman & verifikasi OTP via WhatsApp. Built with **Next.js 14**, **Baileys**, **Prisma**, dan **MySQL**.

User mendaftar di website, hubungkan nomor WA via QR, generate API key, lalu pakai REST API dari aplikasi mereka sendiri.

## Arsitektur

```
+------------------+        +-----------------------+
|  Next.js (web)   | <----> |  WhatsApp Worker      |
|  - UI dashboard  |  HTTP  |  - Baileys connection |
|  - REST API      |        |  - per-session socket |
|  - Prisma/MySQL  |        |  - status callbacks   |
+------------------+        +-----------------------+
        |
        v
   +---------+
   |  MySQL  |
   +---------+
```

- **web/**: Next.js App Router, REST API (`/api/v1/...`), dashboard, docs.
- **wa-worker/**: Express service yang membungkus Baileys. Hanya bisa diakses dari Next.js (shared internal token).
- **.env**: dipakai bersama oleh keduanya (root-level).

## Persiapan

### 1. Prasyarat
- Node.js 20+
- MySQL 8 (atau MariaDB)
- npm

### 2. Setup
```bash
# clone / unzip project, lalu:
cp .env.example .env
# edit .env: DATABASE_URL, JWT_SECRET, WORKER_INTERNAL_TOKEN

# install semua dependencies
npm run install:all

# generate prisma client + jalankan migrasi
npm run prisma:migrate
```

### 3. Jalankan

Dua proses (web + worker). Mode dev (paralel):
```bash
npm run dev
```

Atau jalankan terpisah:
```bash
npm run dev:web      # http://localhost:3000
npm run dev:worker   # http://localhost:4000
```

## Alur penggunaan

1. Daftar / login di `http://localhost:3000`.
2. Buka **Dashboard - Sesi WhatsApp**, tambah sesi, scan QR.
3. Buka **Dashboard - API Keys**, buat key (simpan, hanya muncul sekali).
4. Pakai API dari aplikasi Anda sesuai dokumentasi di `/docs`.

## Endpoint publik (v1)

| Method | Path | Deskripsi |
|---|---|---|
| POST | `/api/v1/otp/send` | Buat & kirim OTP via WA |
| POST | `/api/v1/otp/verify` | Verifikasi kode OTP |
| GET  | `/api/v1/otp/status/{requestId}` | Cek status request |

Semua memerlukan header `x-api-key`.

## Catatan keamanan

- `JWT_SECRET` minimal 32 karakter acak.
- `WORKER_INTERNAL_TOKEN` adalah shared secret antara Next.js dan worker, jangan diekspos.
- API key disimpan plaintext di DB karena dipakai sebagai-is untuk lookup. Untuk produksi, pertimbangkan menyimpan hash + lookup-prefix.
- Folder `auth-sessions/` berisi kredensial WhatsApp - perlakukan seperti file rahasia.
- Worker sebaiknya tidak diekspos langsung ke internet; biarkan hanya Next.js yang menjangkaunya.

## Build production

```bash
npm --prefix web run build
npm --prefix web run start    # port 3001
npm --prefix wa-worker run start  # port 4000
```

## Deploy ke VPS (Ubuntu 22.04 / 24.04)

Script all-in-one tersedia di `scripts/vps-deploy.sh`. Akan handle: install Node.js,
MySQL, Nginx, Certbot, PM2, clone repo, setup `.env` (auto-generate JWT secret &
worker token), Prisma migrate, build, dan jalanin web + worker via PM2.

**Setup pertama kali:**

curl -fsSL https://raw.githubusercontent.com/santricibiin/waweb/main/scripts/vps-deploy.sh | sudo bash -s -- --domain=jagopay.biz.id --email=muhfaiqyah@gmail.com --repo=https://github.com/santricibiin/waweb.git

```bash
# 1. Pastikan domain sudah pointing ke IP VPS (A record)
# 2. SSH ke VPS sebagai root atau user dengan sudo
# 3. Jalankan (ganti dengan domain & email Anda):

curl -fsSL https://raw.githubusercontent.com/santricibiin/waweb/main/scripts/vps-deploy.sh | \
  sudo bash -s -- \
    --domain=jagopay.biz.id \
    --email=muhfaiqyah@gmail.com \
    --repo=https://github.com/santricibiin/waweb.git
```

**Argumen yang tersedia:**

| Flag | Wajib | Keterangan |
|---|---|---|
| `--domain=<domain>` | ya | Domain publik, contoh `otp.example.com` |
| `--email=<email>` | ya | Email untuk Let's Encrypt |
| `--repo=<git-url>` | jika code belum di `/opt/wa-otp` | URL git repo |
| `--token=<gh-pat>` | opsional | GitHub PAT untuk repo private |
| `--no-ssl` | opsional | Skip SSL (mis. pakai Cloudflare proxy) |
| `--skip-mysql` | opsional | Pakai DB external |

**Update setelah ada commit baru:**

```bash
sudo bash /opt/wa-otp/scripts/vps-update.sh
```

**Shell aliases (otomatis ter-install):**

Deploy script juga membuat shortcut di `/etc/profile.d/wa-otp-aliases.sh`. Login
ulang atau jalankan `source /etc/profile.d/wa-otp-aliases.sh`, lalu pakai:

| Alias | Aksi |
|---|---|
| `waupdate` | Pull + install + migrate + build + restart (full update) |
| `wapull` | Pull code saja, tanpa rebuild |
| `wastatus` | PM2 status (web + worker) |
| `warestart` | Restart kedua service |
| `walogs` | Tail logs (last 100) |
| `walogs-web` / `walogs-worker` | Logs satu service |
| `wadb` | Login MySQL sebagai user app |
| `waroot` | Login MySQL sebagai root |
| `wabackup` | Buat backup DB ke `/root/backups/` |
| `wabackups` | List backup |
| `warestore` | Restore dari backup (interactive picker) |
| `waenv` | Edit `.env` dengan nano |
| `wassl-renew` / `wassl-status` | Manage SSL cert |
| `waotp-help` | Tampilkan semua alias |

**Yang otomatis dikerjakan oleh deploy script:**

- Auto-create swap 2 GB jika RAM < 1.8 GB
- Install Node.js 20 LTS, MySQL, Nginx, Certbot, PM2
- Buat user `waotp` dengan home directory
- Clone repo, install semua deps (root + web + worker)
- Generate password DB random, simpan di `/root/.wa-otp-db-password`
- Generate JWT secret + worker token random
- Run `prisma migrate deploy`, build Next.js production
- Setup PM2 ecosystem (web port 3001 + worker port 4001)
- Configure Nginx sebagai reverse proxy ke web saja
- Block worker port dari public via UFW
- Request SSL cert via Let's Encrypt
- Auto-start PM2 saat boot

**Setelah deploy:**

1. Buka `https://yourdomain.com/register` -> daftar akun
2. Buka `/dashboard/wa-sessions` -> tambah sesi -> scan QR
3. Buka `/dashboard/api-keys` -> buat key
4. Test pakai `/demo.html` atau lihat `/docs`

**Domain di docs otomatis mengikuti URL:**

Halaman `/docs` membaca base URL dari env `NEXT_PUBLIC_APP_URL` (otomatis di-set
oleh deploy script ke `https://<domain>`). Saat dev di lokal, base URL otomatis
fallback ke `http://localhost:3001` atau dideteksi dari header request.

Disarankan menjalankan keduanya di belakang process manager (pm2 / systemd).
