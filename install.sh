#!/bin/bash
# VISLIVIS Panel - VDS Tek Komut Kurulum Scripti
# Ubuntu 22.04 LTS üzerinde backend + frontend + admin kullanıcı kurar.
# Kullanım: sudo bash install.sh
# İsteğe bağlı: PANEL_DOMAIN=panel.example.com ADMIN_PASS=guclu_sifre bash install.sh

set -e

# --- Ayarlar (ortam değişkeni ile override edilebilir) ---
PANEL_DOMAIN="${PANEL_DOMAIN:-panel.example.com}"
ADMIN_USER="${ADMIN_USER:-admin}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@vislivis.com}"
ADMIN_PASS="${ADMIN_PASS:-admin}"
INSTALL_DIR="${INSTALL_DIR:-/var/www/vislivis}"
SERVICE_USER="${SERVICE_USER:-www-data}"

echo "=============================================="
echo "  VISLIVIS Panel - VDS Kurulum"
echo "  Domain: $PANEL_DOMAIN"
echo "  Dizin:  $INSTALL_DIR"
echo "  Admin:  $ADMIN_USER (şifre: kurulumda ayarlanacak)"
echo "=============================================="

# Root kontrolü
if [ "$(id -u)" -ne 0 ]; then
  echo "Bu script root veya sudo ile çalıştırılmalı."
  exit 1
fi

# Proje dizini mevcut mu?
if [ ! -f "$INSTALL_DIR/backend/requirements.txt" ]; then
  echo "Hata: $INSTALL_DIR içinde proje dosyaları bulunamadı."
  echo "Önce projeyi bu dizine kopyalayın (git clone veya scp)."
  exit 1
fi

echo "[1/9] Sistem güncelleniyor..."
apt-get update -qq && apt-get upgrade -y -qq

echo "[2/9] Gerekli paketler kuruluyor..."
apt-get install -y -qq python3 python3-pip python3-venv nginx nodejs npm git

echo "[3/9] Backend (Python venv + bağımlılıklar)..."
cd "$INSTALL_DIR"
if [ ! -d "venv" ]; then
  python3 -m venv venv
fi
"$INSTALL_DIR/venv/bin/pip" install -q -r backend/requirements.txt

echo "[4/9] .env dosyası oluşturuluyor..."
ENV_FILE="$INSTALL_DIR/backend/.env"
if [ ! -f "$ENV_FILE" ]; then
  SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
  JWT_SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
  cat > "$ENV_FILE" << EOF
SECRET_KEY=$SECRET_KEY
JWT_SECRET_KEY=$JWT_SECRET_KEY
DATABASE_URL=sqlite:///vislivis.db
FLASK_ENV=production
CORS_ORIGINS=https://$PANEL_DOMAIN,http://$PANEL_DOMAIN
EOF
  echo "  .env oluşturuldu."
else
  echo "  .env zaten var, dokunulmadı."
fi

echo "[5/9] Veritabanı ve admin kullanıcı oluşturuluyor..."
cd "$INSTALL_DIR"
export $(grep -v '^#' backend/.env 2>/dev/null | xargs)
"$INSTALL_DIR/venv/bin/python3" -c "
import os, sys
sys.path.insert(0, '$INSTALL_DIR/backend')
os.chdir('$INSTALL_DIR/backend')
from app import app
from models import db, User
with app.app_context():
    db.create_all()
    u = User.query.filter_by(username='$ADMIN_USER').first()
    if not u:
        u = User(username='$ADMIN_USER', email='$ADMIN_EMAIL', role='admin')
        u.set_password('$ADMIN_PASS')
        db.session.add(u)
        db.session.commit()
        print('Admin oluşturuldu: $ADMIN_USER / (belirlediğiniz şifre)')
    else:
        u.set_password('$ADMIN_PASS')
        u.email = '$ADMIN_EMAIL'
        db.session.commit()
        print('Admin güncellendi: $ADMIN_USER (şifre yenilendi)')
"

echo "[6/9] Frontend build..."
cd "$INSTALL_DIR"
export VITE_API_URL="https://$PANEL_DOMAIN"
npm install --silent
npm run build

echo "[7/9] systemd servisi..."
cat > /etc/systemd/system/vislivis.service << EOF
[Unit]
Description=VISLIVIS Panel Backend (Gunicorn)
After=network.target

[Service]
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$INSTALL_DIR
Environment="PATH=$INSTALL_DIR/venv/bin"
EnvironmentFile=$INSTALL_DIR/backend/.env
ExecStart=$INSTALL_DIR/venv/bin/gunicorn --workers 2 --bind 127.0.0.1:5000 "backend.app:app"
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
systemctl daemon-reload
systemctl enable vislivis
systemctl restart vislivis

echo "[8/9] Nginx yapılandırması..."
cat > /etc/nginx/sites-available/vislivis << EOF
server {
    listen 80;
    server_name $PANEL_DOMAIN;

    root $INSTALL_DIR/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /api/health {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF

ln -sf /etc/nginx/sites-available/vislivis /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

echo "[9/9] Firewall (opsiyonel)..."
if command -v ufw &>/dev/null; then
  ufw allow 22/tcp
  ufw allow 80/tcp
  ufw allow 443/tcp
  echo "y" | ufw enable 2>/dev/null || true
fi

echo ""
echo "=============================================="
echo "  Kurulum tamamlandı."
echo "  Panel: http://$PANEL_DOMAIN"
echo "  Admin giriş: $ADMIN_USER / (belirlediğiniz şifre)"
echo "  SSL: sudo certbot --nginx -d $PANEL_DOMAIN"
echo "=============================================="
