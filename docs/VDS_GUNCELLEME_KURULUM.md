# VDS'e Güncel Sürümü Atıp Ayağa Kaldırma

Bu rehber, bilgisayarınızdaki güncel **panel** projesini VDS'deki `/var/www/vislivis` içinde eski sürümün yerine kurup aynı şekilde çalıştırmanız içindir.

---

## 1. Güncel Kodu VDS'e Atma

### Seçenek A: Git ile (VDS'de repo varsa)

VDS'e SSH ile bağlanın, mevcut projeyi yedekleyip güncel kodu çekin:

```bash
ssh root@31.40.199.64 -p 25416
cd /var/www
sudo cp -r vislivis vislivis.yedek
cd vislivis
git fetch origin
git checkout main
git pull origin main
```

(Güncel kod önce panel repo’sunun içinde ise, o repoyu VDS’e clone edip `backend` ve `src`/frontend’i `/var/www/vislivis` yapısına göre yerleştirmeniz gerekir; aşağıdaki “Manuel / SCP” yöntemi buna uygundur.)

### Seçenek B: Bilgisayarınızdan SCP / rsync ile

Windows’ta (PowerShell veya Git Bash) proje klasörünüz `panel` içindeyken:

```bash
# Tüm panel projesini VDS'e at (vislivis klasörünü güncellemek için)
scp -P 25416 -r backend src public index.html package.json package-lock.json vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json tailwind.config.js postcss.config.js eslint.config.js index.html root@31.40.199.64:/var/www/vislivis_guncel/
```

Sonra VDS’te eski `vislivis`’i yedekleyip yeni dosyaları taşıyın:

```bash
ssh root@31.40.199.64 -p 25416
cd /var/www
sudo cp -r vislivis vislivis.yedek
# Yeni atılan dosyaları vislivis'e taşı (kendi yapınıza göre düzenleyin)
sudo cp -r vislivis_guncel/backend vislivis/
sudo cp -r vislivis_guncel/src vislivis/
# ... diğer dosyalar (index.html, package.json, vite.config.ts vb.)
```

Not: Sizin VDS’teki yapı `backend`, `src`, `dist`, `public` şeklinde. Güncel panel projesinde backend `backend/` içinde, frontend ise `src/` + `index.html` + Vite config. O yüzden sadece **backend** ve frontend kaynaklarını (src, index.html, package.json, vite.config.ts, tailwind.config.js, postcss.config.js, tsconfig*.json, eslint.config.js, public) kopyalayıp mevcut vislivis’in üzerine yazmanız yeterli.

---

## 2. Backend (Flask) Ayağa Kaldırma

### 2.1 Bağımlılıklar ve sanal ortam

```bash
cd /var/www/vislivis
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
```

### 2.2 Ortam değişkenleri (isteğe bağlı ama önerilen)

```bash
cd /var/www/vislivis
nano .env
```

İçeriği örnek:

```env
SECRET_KEY=uzun-ve-rastgele-bir-secret-key
JWT_SECRET_KEY=uzun-ve-rastgele-jwt-key
DATABASE_URL=sqlite:////var/www/vislivis/backend/instance/vislivis.db
CORS_ORIGINS=https://alanadiniz.com,http://31.40.199.64
```

Veritabanı için `instance` klasörü:

```bash
mkdir -p /var/www/vislivis/backend/instance
```

### 2.3 Gunicorn ile çalıştırma

**Gunicorn’a uygulama modülü vermeniz gerekir;** `gunicorn` komutunda `app:app` yazmalısınız. Backend klasöründe:

```bash
cd /var/www/vislivis
source venv/bin/activate
cd backend
gunicorn -c gunicorn.conf.py app:app
```

Bu komut backend’i `127.0.0.1:5000` üzerinde çalıştırır. Test için:

```bash
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/api/health/status
```

200 veya 401 dönüyorsa API ayakta demektir.

### 2.4 Veritabanı ilk kurulum (ilk sefer)

```bash
curl -X POST http://127.0.0.1:5000/api/init
```

### 2.5 Systemd ile kalıcı çalıştırma

Kapanınca kapanmaması ve sunucu açılışında başlaması için:

```bash
sudo nano /etc/systemd/system/vislivis-backend.service
```

İçerik:

```ini
[Unit]
Description=Vislivis Flask Backend
After=network.target

[Service]
User=root
WorkingDirectory=/var/www/vislivis/backend
Environment="PATH=/var/www/vislivis/venv/bin"
EnvironmentFile=/var/www/vislivis/.env
ExecStart=/var/www/vislivis/venv/bin/gunicorn -c gunicorn.conf.py app:app
Restart=always

[Install]
WantedBy=multi-user.target
```

Aktifleştirme:

```bash
sudo systemctl daemon-reload
sudo systemctl enable vislivis-backend
sudo systemctl start vislivis-backend
sudo systemctl status vislivis-backend
```

---

## 3. Frontend (Vite/React) Build ve Nginx

### 3.1 Build

```bash
cd /var/www/vislivis
npm install
npm run build
```

Bu komut `dist/` klasörünü oluşturur.

### 3.2 Nginx

Nginx zaten çalışıyorsa, mevcut site config’iniz muhtemelen `/etc/nginx/sites-available/` altında. Örnek bir config:

```nginx
server {
    listen 80;
    server_name 31.40.199.64;   # veya alanadiniz.com

    root /var/www/vislivis/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Değişiklikten sonra:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 4. Özet Komutlar (VDS’te sırayla)

```bash
cd /var/www/vislivis
source venv/bin/activate
pip install -r backend/requirements.txt
cd backend
gunicorn -c gunicorn.conf.py app:app
```

Ayrı terminalde veya arka planda çalıştıktan sonra:

```bash
cd /var/www/vislivis
npm install
npm run build
```

Backend’i systemd ile açtıysanız sadece frontend build + nginx reload yeterli.

---

## 5. Mobil Uygulama API Adresi

Mobil uygulamada backend’e erişmek için API adresi:

- VDS IP: `http://31.40.199.64:5000`  
  veya  
- Nginx üzerinden: `http://31.40.199.64/api` (o zaman mobilde base URL’i `http://31.40.199.64` yapıp istekleri `/api/...` olarak atmalısınız)

Mobil `.env` dosyasında:

```env
EXPO_PUBLIC_API_URL=http://31.40.199.64/api
```

veya backend doğrudan 5000’de dinliyorsa:

```env
EXPO_PUBLIC_API_URL=http://31.40.199.64:5000
```

(Firewall’da 5000 portunu açmanız gerekebilir.)

---

Bu adımlarla güncel sürümü VDS’e atıp backend’i gunicorn ile, frontend’i Nginx ile aynı şekilde ayağa kaldırmış olursunuz. Şifre ve hassas bilgileri rehberde paylaşmayın; sadece kendi makinenizde veya güvenli bir yerde tutun.
