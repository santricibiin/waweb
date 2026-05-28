DEPLOY 
curl -fsSL https://raw.githubusercontent.com/santricibiin/waweb/main/scripts/vps-deploy.sh | sudo bash -s -- --domain=jagopay.biz.id --email=muhfaiqyah@gmail.com --repo=https://github.com/santricibiin/waweb.git

CLEANUP
-- wacleanup

ATAU MANUAL CLEANUP
sudo bash /opt/wa-otp/scripts/cleanup.sh

LIST ALIAS
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

