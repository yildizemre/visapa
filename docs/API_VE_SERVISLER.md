# VISLIVIS Panel – API ve Servisler Kullanım Kılavuzu

Tüm API endpoint'leri ve mağaza tarafında veri gönderen servislerin nasıl kullanılacağı bu dokümanda toplanmıştır.

---

## İçindekiler

1. [Genel Bilgi](#genel-bilgi)
2. [Kimlik Doğrulama (JWT)](#kimlik-doğrulama-jwt)
3. [API Endpoint Listesi](#api-endpoint-listesi)
4. [Auth (Giriş / Kayıt)](#auth-giriş--kayıt)
5. [Dashboard](#dashboard)
6. [Analytics (Müşteri, Kuyruk, Heatmap, Personel, Rapor)](#analytics-müşteri-kuyruk-heatmap-personel-rapor)
7. [Admin](#admin)
8. [Settings (Profil, Ayarlar, Kurulum)](#settings-profil-ayarlar-kurulum)
9. [Health & Heartbeat](#health--heartbeat)
10. [Weather & Staff](#weather--staff)
11. [Mağaza Servisleri (Data Sender)](#mağaza-servisleri-data-sender)

---

## Genel Bilgi

- **Base URL (örnek):** `https://panel.example.com` veya `http://127.0.0.1:5000`
- **API öneki:** Tüm API istekleri `/api/...` altındadır.
- **Çoklu mağaza:** Brand manager kullanıcılar `store_id` query parametresi ile mağaza seçebilir; yoksa yönettikleri tüm mağazaların verisi döner.

---

## Kimlik Doğrulama (JWT)

Giriş yapınca dönen `access_token` ile korumalı endpoint'lere istek atılır.

**Header:**
```http
Authorization: Bearer <access_token>
```

**Query string (alternatif):**
```text
?token=<access_token>
```

Token süresi varsayılan 24 saattir. Süre dolunca tekrar `POST /api/auth/login` ile yeni token alınır.

---

## API Endpoint Listesi

| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| POST | `/api/init` | Hayır | Veritabanı + admin kullanıcı oluşturur |
| POST | `/api/auth/login` | Hayır | Giriş, token döner |
| GET | `/api/auth/me` | JWT | Giriş yapan kullanıcı bilgisi |
| POST | `/api/auth/register` | Hayır | Yeni kullanıcı kaydı |
| GET | `/api/dashboard/weekly-overview` | JWT | Haftalık özet (müşteri, kuyruk, günlük seriler) |
| GET | `/api/analytics/customers` | JWT | Müşteri verileri listesi + demografik + saatlik akış |
| POST | `/api/analytics/customers` | JWT | Müşteri sayım kaydı ekler (giren/çıkan, yaş/cinsiyet) |
| GET | `/api/analytics/customers/flow-data` | JWT | Tarih/saat bazlı giriş-çıkış akış verisi |
| PUT/DELETE | `/api/analytics/customers/record/<id>` | JWT | Tek müşteri kaydı güncelle/sil |
| GET | `/api/analytics/queues` | JWT | Kuyruk kayıtları listesi |
| POST | `/api/analytics/queues` | JWT | Kuyruk kaydı ekler (kasa, bekleme süresi) |
| GET | `/api/analytics/queues/daily-summary` | JWT | Kuyruk günlük özeti |
| PUT/DELETE | `/api/analytics/queues/record/<id>` | JWT | Kuyruk kaydı güncelle/sil |
| GET | `/api/analytics/heatmaps` | JWT | Isı haritası kayıtları |
| POST | `/api/analytics/heatmaps` | JWT | Isı haritası kaydı (bölge, yoğunluk) |
| GET | `/api/analytics/heatmaps/daily-summary` | JWT | Heatmap günlük özeti |
| PUT/DELETE | `/api/analytics/heatmaps/record/<id>` | JWT | Heatmap kaydı güncelle/sil |
| GET | `/api/analytics/staff` | JWT | Personel verileri |
| POST | `/api/analytics/staff` | JWT | Personel verisi ekler |
| GET | `/api/analytics/reports` | JWT | Rapor listesi |
| POST | `/api/analytics/create-report` | JWT | Rapor oluşturur |
| GET | `/api/admin/users` | Admin | Kullanıcı listesi (sayfalı) |
| POST | `/api/admin/users` | Admin | Yeni kullanıcı oluşturur |
| PUT | `/api/admin/users/<id>` | Admin | Kullanıcı günceller |
| DELETE | `/api/admin/users/<id>` | Admin | Kullanıcı siler |
| GET | `/api/admin/users/<id>/managed-stores` | Admin | Kullanıcının yönettiği mağazalar |
| PUT | `/api/admin/users/<id>/managed-stores` | Admin | Yönettiği mağazaları atar |
| POST | `/api/admin/users/<id>/impersonate` | Admin | O kullanıcı adına token üretir |
| GET | `/api/settings/profile` | JWT | Profil bilgisi |
| PUT | `/api/settings/profile` | JWT | Profil günceller |
| PUT | `/api/settings/password` | JWT | Şifre değiştirir |
| GET/POST | `/api/settings/report-recipients` | JWT | Rapor alıcıları |
| DELETE | `/api/settings/report-recipients/<id>` | JWT | Rapor alıcısı siler |
| GET/PUT | `/api/settings/appearance` | JWT | Görünüm ayarları |
| GET | `/api/settings/managed-stores` | JWT | (Brand manager) Yönettiği mağazalar |
| GET | `/api/settings/cameras` | JWT | Kamera listesi |
| POST | `/api/settings/setup` | Hayır* | Kurulum: site adı + kameralar (kullanıcı/şifre ile) |
| GET | `/api/health/status` | Hayır | Servis canlı mı |
| POST | `/api/health/heartbeat` | JWT | Mağaza “ben ayaktayım” sinyali |
| GET | `/api/health/heartbeat/status` | JWT | Son heartbeat durumu |
| GET | `/api/weather/forecast` | Hayır | Hava durumu (demo) |
| POST | `/api/staff/capture-image` | - | Personel görüntü (demo) |

\* Setup: Body'de `username` ve `password` gönderilir.

---

## Auth (Giriş / Kayıt)

### POST /api/auth/login

Giriş yapıp JWT token almak için.

**Body (JSON):**
```json
{
  "username": "admin",
  "password": "sifre123"
}
```
`username` yerine `email` de kullanılabilir.

**Başarılı yanıt (200):**
```json
{
  "access_token": "eyJ...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@vislivis.com",
    "role": "admin",
    "full_name": null
  }
}
```
Brand manager için `user.managed_stores` listesi de döner.

---

### GET /api/auth/me

Header'da `Authorization: Bearer <token>` gerekir. Giriş yapan kullanıcının bilgilerini döner.

---

### POST /api/auth/register

Yeni kullanıcı kaydı (genelde panel üzerinden veya admin tarafından kullanılır).

**Body (JSON):**
```json
{
  "username": "magaza1",
  "email": "magaza1@firma.com",
  "password": "guclu_sifre",
  "role": "user"
}
```
`role`: `user`, `admin`, `brand_manager`.

---

## Dashboard

### GET /api/dashboard/weekly-overview

Son 7 günün özeti: toplam giren/çıkan, cinsiyet/yaş dağılımı, ortalama kuyruk bekleme süresi, günlük seriler.

**Query (opsiyonel):** `store_id` – brand manager için mağaza filtresi.

**Yanıt:** `totals`, `timeseries` (daily_customer_flow, daily_gender, daily_age).

---

## Analytics (Müşteri, Kuyruk, Heatmap, Personel, Rapor)

### Müşteri verisi

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/analytics/customers` | Liste + demografik + saatlik akış. Query: `date`, `camera_id` |
| POST | `/api/analytics/customers` | Yeni kayıt. Body: `timestamp`, `entered`, `exited`, `customers_inside`, `male_count`, `female_count`, `age_18_30`, `age_30_50`, `age_50_plus`, `camera_id`, `location` vb. |
| GET | `/api/analytics/customers/flow-data` | Tarih/saat bazlı akış. Query: `date_from`, `camera_id` |
| PUT | `/api/analytics/customers/record/<id>` | Body: `entering`, `exiting` |
| DELETE | `/api/analytics/customers/record/<id>` | Kaydı siler |

**POST /api/analytics/customers örnek body:**
```json
{
  "timestamp": "2026-02-16T14:00",
  "entered": 10,
  "exited": 8,
  "customers_inside": 42,
  "male_count": 5,
  "female_count": 5,
  "age_18_30": 3,
  "age_30_50": 5,
  "age_50_plus": 2,
  "camera_id": "kapi-1"
}
```

---

### Kuyruk verisi

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/analytics/queues` | Liste. Query: `page`, `per_page`, `status` |
| POST | `/api/analytics/queues` | Yeni kuyruk kaydı. Body: `timestamp`, `cashier_id`, `total_customers`, `wait_time` |
| GET | `/api/analytics/queues/daily-summary` | Günlük özet. Query: `date` |
| PUT/DELETE | `/api/analytics/queues/record/<id>` | Kayıt güncelle/sil |

**POST /api/analytics/queues örnek body:**
```json
{
  "cashier_id": "Kasa-2",
  "total_customers": 14,
  "wait_time": 44.5,
  "timestamp": "2026-02-16T14:00"
}
```

---

### Isı haritası (Heatmap)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/analytics/heatmaps` | Liste. Query: `date`, `zone` |
| POST | `/api/analytics/heatmaps` | Yeni kayıt. Body: `zone`, `visitor_count`, `intensity`, `timestamp`, `camera_id` |
| GET | `/api/analytics/heatmaps/daily-summary` | Günlük özet |
| PUT/DELETE | `/api/analytics/heatmaps/record/<id>` | Kayıt güncelle/sil |

**POST /api/analytics/heatmaps örnek body:**
```json
{
  "zone": "kadin-giyim",
  "visitor_count": 122,
  "intensity": 45.5,
  "camera_id": "kamera-2",
  "timestamp": "2026-02-16T14:00"
}
```

---

### Personel ve Rapor

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/analytics/staff` | Personel verileri listesi |
| POST | `/api/analytics/staff` | Personel verisi ekler |
| GET | `/api/analytics/reports` | Rapor listesi |
| POST | `/api/analytics/create-report` | Rapor oluşturur |

---

## Admin

Tüm `/api/admin/*` endpoint'leri **sadece `role: admin`** kullanıcılar tarafından kullanılabilir. Header'da JWT gerekir.

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/admin/users` | Kullanıcı listesi. Query: `page`, `per_page` |
| POST | `/api/admin/users` | Body: `username`, `email`, `password`, `role`, `full_name`, `managed_store_ids` (opsiyonel) |
| PUT | `/api/admin/users/<id>` | Kullanıcı güncelle (şifre, rol, aktiflik vb.) |
| DELETE | `/api/admin/users/<id>` | Kullanıcı siler |
| GET | `/api/admin/users/<id>/managed-stores` | Kullanıcının yönettiği mağaza ID'leri |
| PUT | `/api/admin/users/<id>/managed-stores` | Body: `store_ids` – yönettiği mağazaları atar |
| POST | `/api/admin/users/<id>/impersonate` | O kullanıcı adına token döner (marka yöneticisi gibi giriş için) |

---

## Settings (Profil, Ayarlar, Kurulum)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/settings/profile` | JWT. Profil bilgisi |
| PUT | `/api/settings/profile` | JWT. Body: `fullName`, `email` |
| PUT | `/api/settings/password` | JWT. Body: `currentPassword`, `newPassword` |
| GET | `/api/settings/report-recipients` | JWT. Rapor alıcı listesi |
| POST | `/api/settings/report-recipients` | JWT. Yeni alıcı |
| DELETE | `/api/settings/report-recipients/<id>` | JWT. Alıcı siler |
| GET | `/api/settings/appearance` | JWT. Görünüm ayarları |
| PUT | `/api/settings/appearance` | JWT. Görünüm günceller |
| GET | `/api/settings/managed-stores` | JWT. (Brand manager) Yönettiği mağaza listesi |
| GET | `/api/settings/cameras` | JWT. Kamera listesi (store_id opsiyonel) |
| POST | `/api/settings/setup` | **Auth yok** – body'de kullanıcı/şifre. Site adı + kamera listesi kaydeder. |

**POST /api/settings/setup örnek body (kurulum):**
```json
{
  "username": "magaza1",
  "password": "sifre123",
  "site_name": "Mağaza Adı - AVM İstanbul",
  "cameras": [
    {
      "name": "Giriş - Kişi Sayım",
      "type": "Kişi Sayım",
      "rtsp": "rtsp://192.168.1.10/stream1"
    },
    {
      "name": "Isı Haritası - Kadın Giyim",
      "type": "Isı Haritası",
      "rtsp": "rtsp://192.168.1.10/stream2"
    }
  ]
}
```

---

## Health & Heartbeat

| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| GET | `/api/health/status` | Hayır | Servis canlı mı: `{ "status": "ok", "service": "vislivis" }` |
| POST | `/api/health/heartbeat` | JWT | Mağaza “ben ayaktayım” – her 5 dk çağrılmalı |
| GET | `/api/health/heartbeat/status` | JWT | Son ping zamanı, 5 dk içinde mi (`is_alive`) |

Panelde “Mağaza AI” göstergesi bu heartbeat’e göre yeşil/kırmızı olur.

---

## Weather & Staff

- **GET /api/weather/forecast** – Demo hava durumu (auth yok).
- **POST /api/staff/capture-image** – Demo; şu an sadece `{ "image_url": "", "message": "..." }` döner.

---

## Mağaza Servisleri (Data Sender)

Panel API’sine **mağaza tarafından** veri göndermek için kullanılan scriptler ve endpoint eşlemesi:

| Servis | Script | Çağırdığı API | Açıklama |
|--------|--------|----------------|----------|
| Heartbeat | `heartbeat_sender.py` | POST /api/health/heartbeat | Her 5 dk “ben ayaktayım” |
| Kişi sayımı | `data_sender.py` | POST /api/analytics/customers | Giren/çıkan, doluluk |
| Yaş/Cinsiyet | `data_sender_age_gender.py` | POST /api/analytics/customers | Aynı endpoint, demografik alanlarla |
| Isı haritası | `data_sender_heatmap.py` | POST /api/analytics/heatmaps | Bölge yoğunluğu |
| Kuyruk | `data_sender_queue.py` | POST /api/analytics/queues | Kasa bekleme süreleri |
| Kurulum | `data_sender_setup.py` | POST /api/settings/setup | Site adı + kamera listesi |

**Detaylı kullanım, payload örnekleri, cron ve kurulum senaryoları:**

- **[data_sender/SERVISLER.md](../data_sender/SERVISLER.md)** – Tüm data sender servisleri, parametreler, payload formatları, saatlik gönderim ve kurulum senaryoları.

**Hızlı başlangıç (data_sender klasöründe):**
```bash
pip install requests
# Heartbeat (mağaza kullanıcı adı/şifre ile)
python heartbeat_sender.py -u magaza1 -p sifre --url https://panel.example.com
# Kişi sayımı
python data_sender.py -j payload.json --url https://panel.example.com
# Heatmap
python data_sender_heatmap.py -j payload_heatmap.json
# Kuyruk
python data_sender_queue.py -j payload_queue.json
# Kurulum (bir kez)
python data_sender_setup.py -j payload_setup.json
```

---

## Özet Dosya Konumları

| Konu | Dosya |
|------|--------|
| Bu doküman (tüm API + servisler) | **docs/API_VE_SERVISLER.md** |
| Mağaza scriptleri detayı (payload, cron, senaryolar) | **data_sender/SERVISLER.md** |
| Data sender kısa kullanım | **data_sender/README.md** |
| Backend özet | **backend/README.md** |
| VDS kurulum | **VDS_KURULUM.md**, **ADIM_ADIM_KURULUM.md** |

API ve servisleri nasıl kullanacağın konusunda tek referans: **docs/API_VE_SERVISLER.md**; mağaza tarafı detayı için **data_sender/SERVISLER.md**.
