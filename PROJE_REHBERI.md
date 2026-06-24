# Vislivis Panel - Proje Rehberi

> Bu döküman projeyi anlayıp geliştirme/deploy yapabilmek için gereken tüm bilgileri içerir.

---

## 1. Proje Genel Bakış

**Vislivis** mağaza içi müşteri analitik paneli. Kameralardan gelen verilerle müşteri sayımı, ısı haritası, kuyruk analizi, personel takibi ve AI destekli raporlar sunar.

- **Frontend:** React 18 + TypeScript + Vite + TailwindCSS
- **Backend:** Python Flask + SQLAlchemy + SQLite
- **Deploy:** VDS sunucu, Gunicorn + Nginx reverse proxy
- **Repo:** https://github.com/yildizemre/visapa.git (branch: `master`)

---

## 2. Sunucu Bilgileri

| Bilgi | Değer |
|-------|-------|
| IP | `31.40.199.64` |
| SSH Port | `25416` |
| Kullanıcı | `root` |
| Proje dizini | `/var/www/vislivis` |
| Domain | `ai.vislivis.com` |
| Backend port | `5000` (Gunicorn) |
| Frontend | Nginx static serve (`/var/www/vislivis/dist/`) |

### SSH Bağlantı

```bash
ssh -p 25416 root@31.40.199.64
```

### SCP ile Dosya Gönderme

```bash
scp -P 25416 <local_dosya> root@31.40.199.64:/var/www/vislivis/<hedef>
```

---

## 3. Proje Yapısı

```
visapa-main/
├── backend/                  # Flask API
│   ├── app.py               # Ana uygulama (create_app + health scheduler)
│   ├── config.py            # Config class (env variables)
│   ├── models.py            # SQLAlchemy modelleri
│   ├── user_context.py      # JWT user resolution helpers
│   ├── auth_utils.py        # Yetki decoratorları
│   ├── gunicorn.conf.py     # Gunicorn production config
│   ├── requirements.txt     # Python bağımlılıkları
│   ├── .env                 # Ortam değişkenleri (SECRET_KEY, JWT, TELEGRAM vs.)
│   ├── instance/
│   │   └── vislivis.db      # SQLite veritabanı
│   ├── routes/
│   │   ├── auth.py          # /api/auth/* (login, register, me)
│   │   ├── admin.py         # /api/admin/* (kullanıcı/şirket CRUD)
│   │   ├── analytics.py     # /api/analytics/* (counter, heatmap, queue data endpoints)
│   │   ├── dashboard.py     # /api/dashboard/* (özet veriler)
│   │   ├── settings.py      # /api/settings/* (kamera, site config, mesai saatleri)
│   │   ├── health.py        # /api/health/* (heartbeat, dead service check)
│   │   ├── insights.py      # /api/insights/* (AI tabanlı raporlar)
│   │   ├── weather.py       # /api/weather/* (hava durumu)
│   │   ├── chat_routes.py   # /api/chat/* (destek sohbeti)
│   │   ├── ticket_routes.py # /api/tickets/* (destek talepleri)
│   │   ├── notifications.py # /api/notifications/*
│   │   ├── camera_upload.py # /api/camera/* (kamera resim yükleme)
│   │   ├── log_routes.py    # /api/log/* (aktivite logları)
│   │   └── staff.py         # /api/staff/*
│   ├── services/
│   │   └── ...              # Servis katmanları
│   └── migrate_*.py         # DB migration scriptleri
├── src/                      # React Frontend
│   ├── App.tsx              # Router + auth state
│   ├── main.tsx             # Entry point
│   ├── config.ts            # API_BASE_URL (production'da boş = relative)
│   ├── index.css            # TailwindCSS imports
│   ├── components/
│   │   ├── Dashboard.tsx         # Ana panel
│   │   ├── CustomerAnalytics.tsx # Müşteri analitik
│   │   ├── DailyFlowAnalytics.tsx# Günlük akış grafikleri
│   │   ├── Heatmaps.tsx          # Isı haritası
│   │   ├── QueueAnalysis.tsx     # Kuyruk analizi
│   │   ├── Settings.tsx          # Ayarlar (kameralar, mesai saatleri)
│   │   ├── LoginPage.tsx         # Giriş sayfası
│   │   ├── Layout.tsx            # Sidebar + header
│   │   ├── ServiceHeartbeatIndicator.tsx # Sistem durumu butonu
│   │   ├── Chat.tsx              # Destek sohbeti
│   │   ├── Ticket.tsx            # Destek talepleri
│   │   ├── AdminUsers.tsx        # Admin: kullanıcı yönetimi
│   │   ├── AdminCompanies.tsx    # Admin: şirket yönetimi
│   │   ├── AdminHealthOverview.tsx # Admin: tüm mağaza sağlık durumu
│   │   └── ...
│   ├── hooks/
│   │   ├── useWorkHours.ts  # Mesai saatleri hook
│   │   ├── useStoreChange.ts# Mağaza değişiklik tetikleyici
│   │   └── ...
│   ├── contexts/
│   │   └── LanguageContext.tsx # Dil (TR/EN) context
│   └── utils/
│       └── ...
├── index.html               # Vite HTML template
├── vite.config.ts           # Vite config (dev proxy: /api -> localhost:5000)
├── package.json             # Node bağımlılıkları
├── tailwind.config.js       # Tailwind config
├── deploy.sh                # Otomatik deploy scripti
└── dist/                    # Frontend build çıktısı (production)
```

---

## 4. Veritabanı Modelleri (SQLite)

| Tablo | Açıklama |
|-------|----------|
| `users` | Kullanıcılar (admin, user, brand_manager) |
| `companies` | Şirketler (parent_id ile hiyerarşi) |
| `customer_data` | Kamera sayım verileri (entered/exited per camera per hour) |
| `heatmap_data` | Isı haritası (zone, visitor_count, intensity/dwell, recorded_at) |
| `queue_data` | Kuyruk verileri (wait_time, cashier_id, recorded_at) |
| `site_config` | Mağaza ayarları (site_name, work_start, work_end) |
| `camera_config` | Kamera tanımları (ad, tür, RTSP URL, resim) |
| `camera_zone` | Kamera üzerindeki polygon bölgeler |
| `staff_data` | Personel verileri |

### Önemli İlişkiler
- Her veri tablosu `user_id` ile kullanıcıya bağlı
- `company_id` ile kullanıcılar şirketlere bağlanır
- `brand_manager` rolü birden fazla mağazayı yönetir

---

## 5. Kullanıcı Rolleri

| Rol | Yetki |
|-----|-------|
| `admin` | Tüm sistem (tüm mağazalar, kullanıcı CRUD, veri düzenleme) |
| `brand_manager` | Kendi şirketi altındaki tüm mağazalar |
| `user` | Sadece kendi mağazası (store_manager gibi davranır) |

---

## 6. API Endpoint Yapısı

Tüm endpointler `/api/` prefix'i ile başlar. JWT Bearer token gerektirir (`Authorization: Bearer <token>`).

| Prefix | Dosya | Açıklama |
|--------|-------|----------|
| `/api/auth` | auth.py | Login, register, me, change-password |
| `/api/admin` | admin.py | Kullanıcı/şirket CRUD (sadece admin) |
| `/api/dashboard` | dashboard.py | Özet istatistikler |
| `/api/analytics` | analytics.py | Counter, heatmap, queue veri gönderimi ve sorgulama |
| `/api/settings` | settings.py | Kamera config, site config, mesai saatleri |
| `/api/health` | health.py | Heartbeat ping, status sorgulama |
| `/api/insights` | insights.py | AI raporları |
| `/api/weather` | weather.py | Hava durumu |
| `/api/chat` | chat_routes.py | Destek sohbeti |
| `/api/tickets` | ticket_routes.py | Destek talepleri |

---

## 7. Lokal Geliştirme

### Gereksinimler
- Node.js 18+
- Python 3.10+
- npm

### Frontend Başlatma

```bash
cd visapa-main
npm install --legacy-peer-deps
npm run dev
# -> http://localhost:5173
```

Vite dev server otomatik olarak `/api/*` isteklerini `http://127.0.0.1:5000`'e proxy eder.

### Backend Başlatma

```bash
cd visapa-main/backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env  # ve .env'i düzenle

python app.py
# -> http://localhost:5000
```

### Ortam Değişkenleri (.env)

```env
SECRET_KEY=vislivis-dev-secret-key-change-in-production-2026
JWT_SECRET_KEY=vislivis-dev-secret-key-change-in-production-2026
DATABASE_URL=sqlite:///vislivis.db
FLASK_ENV=production
CORS_ORIGINS=https://ai.vislivis.com
TELEGRAM_BOT=<bot_token>
TELEGRAM_ID=<chat_id>
```

---

## 8. Git İş Akışı

### Değişiklikleri Kaydet ve Push Et

```bash
cd visapa-main
git add .
git commit -m "açıklayıcı mesaj"
git push origin master
```

### Sunucudan Pull

```bash
ssh -p 25416 root@31.40.199.64
cd /var/www/vislivis
git pull origin master
```

---

## 9. Sunucuya Deploy (Tam Süreç)

### Yöntem 1: Otomatik deploy.sh (Önerilen)

```bash
ssh -p 25416 root@31.40.199.64 "cd /var/www/vislivis && bash deploy.sh"
```

Bu script:
1. DB yedeğini alır
2. `git pull` yapar
3. DB'yi korur (git reset üzerine yazmasın)
4. Python deps kurar
5. Migration çalıştırır
6. `npm install` + `npm run build`
7. `systemctl restart vislivis`
8. Nginx reload

### Yöntem 2: Manuel Deploy

```bash
ssh -p 25416 root@31.40.199.64

cd /var/www/vislivis

# 1. Git pull
git pull origin master

# 2. Frontend build
npm install --legacy-peer-deps
npm run build

# 3. Dosya izinleri
chown -R www-data:www-data /var/www/vislivis/dist/
chmod -R 755 /var/www/vislivis/dist/

# 4. Backend restart
systemctl restart vislivis

# 5. (Gerekirse) Nginx reload
systemctl reload nginx
```

### Yöntem 3: Sadece Backend Değişikliği

```bash
ssh -p 25416 root@31.40.199.64 "cd /var/www/vislivis && git pull origin master && systemctl restart vislivis"
```

### Yöntem 4: Sadece Frontend Değişikliği

```bash
ssh -p 25416 root@31.40.199.64 "cd /var/www/vislivis && git pull origin master && npm run build && chown -R www-data:www-data dist/ && chmod -R 755 dist/"
```

---

## 10. Sunucu Servisleri

### vislivis.service (Gunicorn)

```bash
# Durumu kontrol et
systemctl status vislivis

# Yeniden başlat
systemctl restart vislivis

# Logları gör
journalctl -u vislivis -n 100 --no-pager
```

Gunicorn config: `/var/www/vislivis/backend/gunicorn.conf.py`
- Port: 5000
- Workers: 2
- Threads: 2

### Nginx

```bash
systemctl status nginx
systemctl reload nginx
# Config: /etc/nginx/sites-available/vislivis
```

Nginx yapısı:
- `ai.vislivis.com` → static files from `/var/www/vislivis/dist/`
- `/api/*` → reverse proxy to `127.0.0.1:5000`

---

## 11. Veritabanı Yönetimi

### DB Konumu (Sunucu)
```
/var/www/vislivis/backend/instance/vislivis.db
```

### Yedek Alma
```bash
ssh -p 25416 root@31.40.199.64 "cp /var/www/vislivis/backend/instance/vislivis.db /var/www/vislivis/backend/instance/vislivis.db.backup_$(date +%Y%m%d_%H%M)"
```

### DB'ye Doğrudan Erişim
```bash
ssh -p 25416 root@31.40.199.64 "sqlite3 /var/www/vislivis/backend/instance/vislivis.db"
```

### Migration Çalıştırma
```bash
ssh -p 25416 root@31.40.199.64 "cd /var/www/vislivis && source venv/bin/activate && python backend/migrate_companies.py"
```

### Python Script Çalıştırma (Veri Import vs.)
```bash
ssh -p 25416 root@31.40.199.64 "cd /var/www/vislivis/backend && source ../venv/bin/activate && python3 <script_adi>.py"
```

---

## 12. Önemli Dosyalar ve Ne İşe Yarıyor

| Dosya | Açıklama |
|-------|----------|
| `backend/app.py` | Flask uygulaması oluşturur, blueprint'leri register eder, health scheduler başlatır |
| `backend/models.py` | Tüm DB tabloları (User, CustomerData, HeatmapData, QueueData, SiteConfig, CameraConfig vs.) |
| `backend/user_context.py` | `get_settings_user_id()`, `get_effective_user_ids()` — hangi kullanıcının verisine erişileceğini belirler |
| `backend/auth_utils.py` | `write_permission_required` decorator — yazma yetkisi kontrolü |
| `backend/routes/analytics.py` | Veri alım (POST) ve sorgu (GET) endpointleri — counter, heatmap, queue |
| `backend/routes/settings.py` | Kamera config CRUD, mesai saatleri GET/PUT, site config |
| `backend/routes/health.py` | Heartbeat ping kabul, durum sorgulama, Telegram bildirim |
| `src/config.ts` | `API_BASE_URL` — production'da boş (relative path), dev'de Vite proxy kullanılır |
| `src/App.tsx` | Router, auth state, tüm sayfa route'ları |
| `src/components/Layout.tsx` | Sidebar, header, mağaza switcher |
| `src/hooks/useWorkHours.ts` | Backend'den mesai saatlerini çeker (work_start, work_end) |
| `vite.config.ts` | Dev proxy config: `/api` → `localhost:5000` |

---

## 13. Veri Akışı (Kameralar → Panel)

1. Mağazadaki Python script'ler her saat başı kamera verilerini toplar
2. `POST /api/analytics/counter` → customer_data tablosuna yazar
3. `POST /api/analytics/heatmaps` → heatmap_data tablosuna yazar
4. `POST /api/analytics/queue` → queue_data tablosuna yazar
5. `POST /api/health/heartbeat` → heartbeat kaydı (alive/dead takibi)
6. Frontend panel bu verileri GET endpointlerinden çeker ve grafiklerle gösterir

---

## 14. Sık Kullanılan Komutlar (Cheat Sheet)

```bash
# === GIT ===
git add .
git commit -m "mesaj"
git push origin master

# === SUNUCUYA BAĞLAN ===
ssh -p 25416 root@31.40.199.64

# === SUNUCUDA DEPLOY ===
cd /var/www/vislivis && git pull origin master && npm run build && chown -R www-data:www-data dist/ && chmod -R 755 dist/ && systemctl restart vislivis

# === BACKEND LOGLARINI GÖR ===
journalctl -u vislivis -n 50 --no-pager

# === BACKEND RESTART ===
systemctl restart vislivis

# === DB YEDEK ===
cp /var/www/vislivis/backend/instance/vislivis.db /tmp/vislivis_backup.db

# === DB SORGU ===
sqlite3 /var/www/vislivis/backend/instance/vislivis.db "SELECT * FROM users;"

# === PYTHON SCRIPT ÇALIŞTIR ===
cd /var/www/vislivis/backend && source ../venv/bin/activate && python3 script.py

# === SCP DOSYA GÖNDER ===
scp -P 25416 dosya.py root@31.40.199.64:/var/www/vislivis/backend/
```

---

## 15. Dikkat Edilecekler

1. **DB GIT'E DAHİL DEĞİL** — `instance/vislivis.db` .gitignore'da. Deploy sırasında DB korunur.
2. **Token:** JWT 24 saat geçerli. Frontend `localStorage`'da saklar.
3. **Mesai Saatleri:** `SiteConfig` tablosunda `work_start`/`work_end` (0-23 arası integer). Frontend `useWorkHours` hook'u ile çeker, grafikleri buna göre filtreler.
4. **Heartbeat:** Mağaza scriptleri her saat `POST /api/health/heartbeat` gönderir. 2 saat heartbeat gelmezse "dead" sayılır ve Telegram'a bildirim gider.
5. **User Context:** Backend'de hangi kullanıcının verisine erişileceği `user_context.py > get_settings_user_id()` ile belirlenir. JWT identity + company_id + role'e göre karar verir.
6. **CORS:** Production'da sadece `ai.vislivis.com` izinli. `.env` > `CORS_ORIGINS` ile ayarlanır.
7. **Nginx:** Frontend static dosyalar + `/api/*` backend proxy. SSL Let's Encrypt.

---

## 16. Yeni Özellik Ekleme Akışı

1. **Backend:** `backend/routes/` altında ilgili blueprint dosyasına endpoint ekle
2. **Model değişikliği:** `backend/models.py`'de tablo güncelle → migration script yaz
3. **Frontend:** `src/components/` altında component ekle/düzenle
4. **Test:** Lokal'de `npm run dev` + `python app.py` ile test et
5. **Deploy:**
   ```bash
   git add . && git commit -m "feat: açıklama" && git push
   ssh -p 25416 root@31.40.199.64 "cd /var/www/vislivis && bash deploy.sh"
   ```

---

## 17. Sorun Giderme

| Sorun | Çözüm |
|-------|-------|
| Login çalışmıyor | `systemctl restart vislivis`, JWT secret key .env'de sabit mi kontrol et |
| Frontend güncellenmiyor | `npm run build` yapıldı mı? `dist/` izinleri doğru mu? Tarayıcı cache temizle |
| 502 Bad Gateway | Gunicorn çalışıyor mu? `systemctl status vislivis` |
| DB verisi kayıp | `/var/www/vislivis/backend/instance/vislivis.db` doğru yerde mi? Backup'tan restore et |
| CORS hatası | `.env` > `CORS_ORIGINS` değerini kontrol et |
| Heartbeat hep dead | Mağaza scriptinin çalıştığını kontrol et, API erişimini test et |
