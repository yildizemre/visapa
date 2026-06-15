# VISLIVIS API Dokümantasyonu

**Tarih:** 31 Mayıs 2026  
**Versiyon:** 1.0  
**Base URL:** `http://localhost:5000`  
**Authentication:** JWT Bearer Token (Header: `Authorization: Bearer <token>`)

---

## İçindekiler

1. [Kimlik Doğrulama (Auth)](#1-kimlik-doğrulama-auth)
2. [Dashboard](#2-dashboard)
3. [Müşteri Analizi (Analytics)](#3-müşteri-analizi-analytics)
4. [Kuyruk Analizi](#4-kuyruk-analizi)
5. [Isı Haritası (Heatmap)](#5-ısı-haritası-heatmap)
6. [Personel (Staff)](#6-personel-staff)
7. [Otomatik Öneriler (Insights)](#7-otomatik-öneriler-insights)
8. [Ayarlar (Settings)](#8-ayarlar-settings)
9. [Sağlık Durumu (Health)](#9-sağlık-durumu-health)
10. [Sohbet (Chat AI)](#10-sohbet-chat-ai)
11. [Destek Talepleri (Tickets)](#11-destek-talepleri-tickets)
12. [Admin Yönetimi](#12-admin-yönetimi)
13. [Kamera Görüntü Yükleme](#13-kamera-görüntü-yükleme)
14. [Hava Durumu](#14-hava-durumu)
15. [Sayfa Loglama](#15-sayfa-loglama)
16. [Raporlar](#16-raporlar)

---

## Genel Bilgiler

### Kimlik Doğrulama
Tüm korumalı endpoint'ler `Authorization: Bearer <JWT_TOKEN>` header'ı gerektirir.  
Token, `/api/auth/login` endpoint'inden alınır.

### Hata Formatı
```json
{ "error": "Hata açıklaması" }
```

### Ortak Query Parametreleri
- `store_id` — Brand manager'lar belirli bir mağazanın verisini görmek için kullanır
- `date_from`, `date_to` — Tarih aralığı filtresi (format: `YYYY-MM-DD`)
- `camera_id` — Belirli bir kameranın verisi için filtre

---

## 1. Kimlik Doğrulama (Auth)

**Prefix:** `/api/auth`

### POST `/api/auth/login`
Kullanıcı girişi yapar, JWT token döner.

**Body:**
```json
{
  "username": "admin",
  "password": "sifre123"
}
```
> `username` yerine `email` de gönderilebilir.

**Başarılı Yanıt (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@vislivis.com",
    "role": "admin",
    "full_name": "Admin User",
    "is_active": true
  }
}
```

**Hata Yanıtları:**
- `400` — Kullanıcı adı/şifre eksik
- `401` — Geçersiz kullanıcı adı veya şifre
- `403` — Hesap devre dışı

---

### GET `/api/auth/me`
Mevcut kullanıcı bilgisini döner. 🔒 JWT gerekli.

**Yanıt (200):**
```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@vislivis.com",
  "role": "admin",
  "full_name": "Admin User",
  "managed_stores": [
    { "id": 3, "username": "store1", "full_name": "Mağaza 1" }
  ]
}
```
> `managed_stores` sadece `brand_manager` rolü için döner.

---

### POST `/api/auth/register`
Yeni kullanıcı kaydı (sadece admin). 🔒 Admin JWT gerekli.

**Body:**
```json
{
  "username": "yenikullanici",
  "email": "yeni@ornek.com",
  "password": "guclu_sifre",
  "role": "user"
}
```

**Yanıt (201):**
```json
{
  "message": "Kayıt başarılı",
  "user": { "id": 5, "username": "yenikullanici", ... }
}
```

---

## 2. Dashboard

**Prefix:** `/api/dashboard`

### GET `/api/dashboard/weekly-overview`
Haftalık veya belirli tarih aralığındaki özet istatistikler. 🔒 JWT gerekli.

**Query Parametreleri:**
| Parametre | Tip | Zorunlu | Açıklama |
|-----------|-----|---------|----------|
| `date_from` | string | Hayır | Başlangıç tarihi (YYYY-MM-DD) |
| `date_to` | string | Hayır | Bitiş tarihi (YYYY-MM-DD) |
| `store_id` | int | Hayır | Belirli mağaza ID |

> Tarih verilmezse son 7 gün alınır.

**Yanıt (200):**
```json
{
  "totals": {
    "customers": {
      "total_entered": 1250,
      "total_exited": 1180,
      "male": 680,
      "female": 570,
      "busiest_age_group": "18-30",
      "latest_customer_date": "2026-05-30"
    },
    "queues": {
      "avg_wait_time": 45.2,
      "total_queues": 320
    }
  },
  "timeseries": {
    "daily_customer_flow": [
      { "date": "2026-05-24", "entered": 180, "exited": 165 }
    ],
    "daily_gender": [
      { "date": "2026-05-24", "male": 95, "female": 85 }
    ],
    "daily_age": [
      { "date": "2026-05-24", "age_18_30": 72, "age_30_50": 65, "age_50_plus": 43 }
    ]
  }
}
```

---

## 3. Müşteri Analizi (Analytics)

**Prefix:** `/api/analytics`

### GET `/api/analytics/customers/latest-date`
Kullanıcının müşteri verisi olan en son tarihi döner. 🔒 JWT gerekli.

**Yanıt:**
```json
{ "date": "2026-05-30" }
```

---

### GET `/api/analytics/customers`
Müşteri verilerini filtreli olarak getirir. 🔒 JWT gerekli.

**Query Parametreleri:**
| Parametre | Tip | Zorunlu | Açıklama |
|-----------|-----|---------|----------|
| `date` | string | Hayır | Tek gün filtresi (YYYY-MM-DD) |
| `date_from` | string | Hayır | Başlangıç (öncelikli) |
| `date_to` | string | Hayır | Bitiş |
| `camera_id` | string | Hayır | Kamera filtresi |
| `store_id` | int | Hayır | Mağaza ID |

**Yanıt (200):**
```json
{
  "data": [
    {
      "id": 1,
      "timestamp": "2026-05-30T14:00:00",
      "location": "Ana Giriş",
      "customers_inside": 12,
      "male_count": 7,
      "female_count": 5,
      "age_18_30": 4,
      "age_30_50": 5,
      "age_50_plus": 3,
      "entered": 8,
      "exited": 5
    }
  ],
  "demographics": {
    "ageGroupsChart": [
      { "name": "18-30", "value": 450 },
      { "name": "30-50", "value": 380 },
      { "name": "50+", "value": 220 }
    ],
    "genderDistributionChart": [
      { "gender": "Erkek", "value": 580 },
      { "gender": "Kadın", "value": 470 }
    ]
  },
  "hourlyCustomerFlow": [
    { "hour": "10:00", "entering": 25, "exiting": 12 }
  ],
  "all_cameras": ["CAM1", "CAM2"]
}
```

---

### POST `/api/analytics/customers`
Yeni müşteri verisi ekler (mağaza AI scriptinden). 🔒 JWT gerekli.

**Body:**
```json
{
  "timestamp": "2026-05-30T14:00:00",
  "camera_id": "CAM1",
  "location": "Ana Giriş",
  "entered": 8,
  "exited": 5,
  "male_count": 5,
  "female_count": 3,
  "age_18_30": 3,
  "age_30_50": 3,
  "age_50_plus": 2,
  "customers_inside": 12
}
```

**Yanıt (201):**
```json
{ "id": 42, "message": "Kaydedildi" }
```

---

### GET `/api/analytics/customers/flow-data`
Günlük akış verisini saatlik olarak döner (10:00-22:00). 🔒 JWT gerekli.

**Query Parametreleri:**
| Parametre | Tip | Zorunlu | Açıklama |
|-----------|-----|---------|----------|
| `date_from` | string | Evet | Tarih (YYYY-MM-DD) |
| `camera_id` | string | Hayır | Kamera filtresi |

**Yanıt (200):**
```json
{
  "data": {
    "2026-05-30": {
      "summary": { "total_entered": 180, "total_exited": 165 },
      "hourly_data": {
        "10:00": { "entered": 12, "exited": 5, "editable_id": 101 },
        "11:00": { "entered": 18, "exited": 10, "editable_id": 102 }
      }
    }
  },
  "comparison_stats": {
    "entered": [
      { "period": "Dün", "change": 12.5 },
      { "period": "Geçen Hafta", "change": -5.2 },
      { "period": "Geçen Ay", "change": 8.1 }
    ],
    "exited": [...]
  }
}
```

---

### PUT `/api/analytics/customers/hourly-edit`
Belirli saat dilimindeki veriyi düzenler. 🔒 JWT gerekli.

**Body:**
```json
{
  "date": "2026-05-30",
  "hour": "14:00",
  "entered": 25,
  "exited": 18
}
```
> Sadece gönderilen alanlar güncellenir, diğerleri korunur.

**Yanıt (200):**
```json
{ "message": "Güncellendi", "id": 101 }
```

---

### PUT/DELETE `/api/analytics/customers/record/<id>`
Tekil kayıt düzenleme veya silme. 🔒 JWT gerekli.

**PUT Body:**
```json
{ "entering": 20, "exiting": 15 }
```

---

## 4. Kuyruk Analizi

### GET `/api/analytics/queue`
Kuyruk (kasa bekleme) verilerini döner. 🔒 JWT gerekli.

**Query Parametreleri:** `date_from`, `date_to`, `cashier_id`, `store_id`

**Yanıt:** Saatlik bekleme süresi, kasa performansı, bekleme süresi dağılımı.

---

### POST `/api/analytics/queue`
Kuyruk verisi ekler (mağaza AI). 🔒 JWT gerekli.

**Body:**
```json
{
  "recorded_at": "2026-05-30T14:30:00",
  "cashier_id": "Kasa-1",
  "wait_time": 45,
  "queue_length": 3
}
```

---

### PUT `/api/analytics/queue/hourly-edit`
Kuyruk saatlik veri düzenleme. 🔒 JWT gerekli.

---

## 5. Isı Haritası (Heatmap)

### GET `/api/analytics/heatmap`
Bölge bazlı ziyaretçi ve bekleme süresi verileri. 🔒 JWT gerekli.

**Query Parametreleri:** `date_from`, `date_to`, `zone`, `store_id`

---

### POST `/api/analytics/heatmap`
Isı haritası verisi ekler. 🔒 JWT gerekli.

**Body:**
```json
{
  "date_recorded": "2026-05-30",
  "hour": 14,
  "zone": "Kadın Giyim",
  "visitor_count": 35,
  "intensity": 78
}
```

---

### PUT `/api/analytics/heatmap/hourly-edit`
Isı haritası saatlik veri düzenleme. 🔒 JWT gerekli.

---

## 6. Personel (Staff)

**Prefix:** `/api/staff`

### POST `/api/staff/capture-image`
Personel görüntüsü yakalama (henüz aktif değil).

---

## 7. Otomatik Öneriler (Insights)

**Prefix:** `/api/analytics/insights`

Her modül için otomatik analiz ve öneriler üretir. Veri yoksa bilgilendirici fallback insight'lar döner.

### GET `/api/analytics/insights/<module>`
🔒 JWT gerekli.

**Modüller:** `dashboard`, `customer`, `queue`, `heatmap`, `staff`, `flow`, `camera_health`

**Yanıt (200):**
```json
{
  "insights": [
    {
      "type": "success",
      "title": "Müşteri Trafiği Artışta",
      "description": "Bu hafta geçen haftaya göre %12.5 daha fazla müşteri ziyareti gerçekleşti.",
      "metric": "+%12.5",
      "priority": "high"
    },
    {
      "type": "warning",
      "title": "Kuyruk Süresi Yüksek",
      "description": "Ortalama bekleme süresi 2 dakikanın üzerine çıktı.",
      "metric": "2.5 dk",
      "priority": "medium"
    }
  ]
}
```

**Insight Tipleri:** `success`, `warning`, `danger`, `info`  
**Öncelikler:** `high`, `medium`, `low`

---

## 8. Ayarlar (Settings)

**Prefix:** `/api/settings`

### GET `/api/settings/profile`
Kullanıcı profili. 🔒 JWT gerekli.

### PUT `/api/settings/profile`
Profil güncelleme. 🔒 JWT gerekli.

**Body:**
```json
{ "fullName": "Yeni İsim", "email": "yeni@email.com" }
```

---

### PUT `/api/settings/password`
Şifre değiştirme. 🔒 JWT gerekli.

**Body:**
```json
{ "currentPassword": "eski_sifre", "newPassword": "yeni_sifre" }
```

---

### GET `/api/settings/cameras`
Kamera kurulumunu listeler. 🔒 JWT gerekli.

**Yanıt:**
```json
{
  "site_name": "Boyner Kadıköy",
  "cameras": [
    { "id": 1, "name": "Giriş Kamerası", "type": "Kapı", "rtsp": "rtsp://...", "imageUrl": "..." }
  ]
}
```

---

### POST `/api/settings/setup`
Site adı ve kamera kurulumu kaydetme. 🔒 JWT gerekli.

**Body:**
```json
{
  "site_name": "Boyner Kadıköy",
  "cameras": [
    { "name": "Giriş", "type": "Kişi Sayım", "rtsp": "rtsp://192.168.1.100:554/stream" }
  ]
}
```

---

### GET `/api/settings/managed-stores`
Brand manager için yönettiği mağaza listesi. 🔒 JWT gerekli.

---

## 9. Sağlık Durumu (Health)

**Prefix:** `/api/health`

### GET `/api/health/status`
Servis durumu (public, auth gerektirmez).

**Yanıt:**
```json
{ "status": "ok", "service": "vislivis" }
```

---

### POST `/api/health/heartbeat`
Mağaza AI servisi her 5 dakikada bir çağırır. 🔒 JWT gerekli.

**Yanıt:**
```json
{ "status": "ok", "last_ping_at": "2026-05-30T21:45:00" }
```

---

### GET `/api/health/heartbeat/status`
Mağaza servisinin durumunu kontrol eder. 🔒 JWT gerekli.

**Yanıt:**
```json
{
  "is_alive": true,
  "last_ping_at": "2026-05-30T21:45:00",
  "message": "Mağaza servisi ayakta"
}
```

---

### GET `/api/health/admin/overview`
Tüm kullanıcıların sağlık durumu. 🔒 Admin gerekli.

**Yanıt:**
```json
{
  "users": [
    {
      "id": 2,
      "username": "store1",
      "full_name": "Boyner Kadıköy",
      "role": "user",
      "is_alive": true,
      "last_ping_at": "2026-05-30T21:45:00"
    }
  ]
}
```

---

### GET `/api/health/check-dead-services`
Ölü servisleri kontrol eder ve Telegram bildirimi gönderir (cron/manuel).

---

## 10. Sohbet (Chat AI)

**Prefix:** `/api/chat`

### GET `/api/chat/conversations`
Kullanıcının sohbet oturumlarını listeler. 🔒 JWT gerekli.

**Yanıt:**
```json
{
  "conversations": [
    { "id": 5, "title": "Satış analizi hakkında", "updated_at": "2026-05-30T20:00:00" }
  ]
}
```

---

### POST `/api/chat`
AI sohbetine mesaj gönderir. 🔒 JWT gerekli.

**Body:**
```json
{
  "message": "Bu hafta en yoğun saat kaçtı?",
  "conversation_id": 5
}
```
> `conversation_id` opsiyonel. Verilmezse yeni sohbet başlar.

**Yanıt (200):**
```json
{
  "response": "Bu hafta en yoğun saat 15:00 olarak görünüyor. 45 müşteri girişi yapılmış.",
  "conversation_id": 5
}
```

---

### GET `/api/chat/history?conversation_id=5`
Belirli sohbetin mesaj geçmişi. 🔒 JWT gerekli.

---

### DELETE `/api/chat/conversations/<id>`
Sohbet oturumunu siler. 🔒 JWT gerekli.

---

## 11. Destek Talepleri (Tickets)

**Prefix:** `/api/tickets`

### GET `/api/tickets`
Ticket listesi. Kullanıcı kendi ticket'larını, admin tümünü görür. 🔒 JWT gerekli.

**Admin Query Parametreleri:** `q` (arama), `status`, `priority`, `category`, `user_id`, `date_from`, `date_to`, `unread=true`

---

### POST `/api/tickets`
Yeni ticket açar (sadece kullanıcılar). 🔒 JWT gerekli.

**Body:**
```json
{
  "subject": "Kamera bağlantı sorunu",
  "category": "teknik",
  "priority": "yuksek",
  "message": "Giriş kamerası 2 saattir görüntü vermiyor."
}
```

**Kategoriler:** `teknik`, `fatura`, `genel`, `diger`  
**Öncelikler:** `acil`, `yuksek`, `normal`, `dusuk`

---

### GET `/api/tickets/<id>`
Ticket detayı + cevapları. 🔒 JWT gerekli.

---

### POST `/api/tickets/<id>/reply`
Ticket'a cevap yazar. 🔒 JWT gerekli.

**Body:**
```json
{ "message": "Sorununuz inceleniyor, en kısa sürede dönüş yapılacaktır." }
```

---

### PATCH `/api/tickets/<id>`
Ticket durumunu günceller. 🔒 JWT gerekli.

**Body:**
```json
{ "status": "closed" }
```
**Durumlar:** `open`, `answered`, `closed`

---

### GET `/api/tickets/unread-count`
Okunmamış ticket sayısı (menü badge). 🔒 JWT gerekli.

---

### GET `/api/tickets/options`
Kategori ve öncelik seçenekleri.

---

### GET `/api/tickets/users`
Admin: Ticket'ı olan kullanıcılar listesi (filtre dropdown).

---

## 12. Admin Yönetimi

**Prefix:** `/api/admin`  
🔒 Tüm endpoint'ler admin JWT gerektirir.

### GET `/api/admin/users?page=1&per_page=20`
Kullanıcı listesi (paginated).

**Yanıt:**
```json
{
  "users": [
    {
      "id": 2,
      "username": "store1",
      "email": "store1@ornek.com",
      "role": "user",
      "full_name": "Boyner Kadıköy",
      "camera_count": 4,
      "site_name": "Boyner Kadıköy"
    }
  ],
  "total": 15,
  "page": 1,
  "per_page": 20,
  "pages": 1
}
```

---

### POST `/api/admin/users`
Yeni kullanıcı oluşturur.

**Body:**
```json
{
  "username": "yenimagaza",
  "email": "magaza@ornek.com",
  "password": "guclu_sifre",
  "role": "user",
  "full_name": "Yeni Mağaza",
  "managed_store_ids": [3, 4]
}
```
**Roller:** `admin`, `user`, `brand_manager`

---

### PUT `/api/admin/users/<id>`
Kullanıcı güncelleme.

**Body:** `email`, `role`, `full_name`, `password`, `is_active`, `managed_store_ids`

---

### DELETE `/api/admin/users/<id>`
Kullanıcı silme (admin silinemez).

---

### POST `/api/admin/users/<id>/impersonate`
Kullanıcının paneline geçiş yapmak için token alır.

**Yanıt:**
```json
{
  "access_token": "eyJ...",
  "user": { "id": 2, "username": "store1", ... }
}
```

---

### GET `/api/admin/activity-logs`
Aktivite logları.

**Query Parametreleri:** `page`, `per_page`, `user_id`, `type`, `date_from`, `date_to`

**Log Tipleri:** `login_ok`, `login_fail`, `page_view`, `chat_message`, `error`

---

## 13. Kamera Görüntü Yükleme

**Prefix:** `/api/camera`

### POST `/api/camera/upload`
Kamera görüntüsü yükler. 🔒 JWT gerekli.

**Form-Data:**
| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `file` | File | Evet | JPEG/PNG/WEBP/BMP (max 20MB) |
| `camera_id` | string | Hayır | Kamera kimliği |
| `notes` | string | Hayır | Açıklama |

**Yanıt (201):**
```json
{
  "id": 12,
  "camera_id": "CAM1",
  "original_name": "capture_2026.jpg",
  "url": "/api/camera/images/12/file",
  "uploaded_at": "2026-05-30T21:00:00"
}
```

---

### GET `/api/camera/images`
Yüklenen görüntüleri listeler. 🔒 JWT gerekli.

**Query:** `camera_id`, `date_from`, `date_to`, `limit` (max 500)

---

### GET `/api/camera/images/<id>/file`
Görüntü dosyasını indirir. 🔒 JWT gerekli.

---

### DELETE `/api/camera/images/<id>`
Görüntüyü siler. 🔒 JWT gerekli.

---

## 14. Hava Durumu

**Prefix:** `/api/weather`

### GET `/api/weather/forecast`
Hava durumu bilgisi (statik/placeholder).

**Yanıt:**
```json
{
  "temperature": 22,
  "condition": "sunny",
  "humidity": 45,
  "forecast": []
}
```

---

## 15. Sayfa Loglama

**Prefix:** `/api/log`

### POST `/api/log/page-view`
Kullanıcının sayfa görüntüleme kaydı. 🔒 JWT gerekli.

**Body:**
```json
{
  "route": "/dashboard",
  "title": "Ana Sayfa",
  "entered_at": "2026-05-30T21:00:00",
  "left_at": "2026-05-30T21:05:00"
}
```

---

## 16. Raporlar

### GET `/api/analytics/reports`
Otomatik oluşturulmuş raporları listeler. 🔒 JWT gerekli.

### POST `/api/analytics/reports`
Manuel rapor oluşturur. 🔒 JWT gerekli.

---

## 17. Bildirimler (Notifications) — Anomali Tespiti

**Prefix:** `/api/notifications`

Otomatik anomali tespiti sistemi: AI scripti veri gönderdiğinde, saatlik müşteri akışı ve kuyruk süreleri otomatik kontrol edilir. Anomali tespit edildiğinde hem panele bildirim eklenir hem de Telegram'a uyarı gönderilir.

**Anomali Kuralları:**
- Müşteri trafiği son 7 günün aynı saatindeki ortalamanın %50 altına düşerse
- Kuyruk bekleme süresi 3 dakikayı (180 sn) aşarsa

### GET `/api/notifications`
Kullanıcının bildirimlerini listeler. 🔒 JWT gerekli.

**Query Parametreleri:**
| Parametre | Tip | Zorunlu | Açıklama |
|-----------|-----|---------|----------|
| `page` | int | Hayır | Sayfa (varsayılan: 1) |
| `per_page` | int | Hayır | Sayfa başı kayıt (varsayılan: 20) |
| `unread` | string | Hayır | `true` ise sadece okunmamışlar |

**Yanıt (200):**
```json
{
  "notifications": [
    {
      "id": 1,
      "type": "anomaly",
      "title": "Müşteri Trafiği Düşük (14:00)",
      "message": "Saat 14:00'da 5 müşteri girişi yapıldı. 7 günlük ortalama: 25 (80% düşüş).",
      "is_read": false,
      "created_at": "2026-06-14T14:05:00"
    }
  ],
  "total": 5,
  "unread_count": 2
}
```

**Bildirim Tipleri:** `anomaly`, `warning`, `info`, `success`

---

### GET `/api/notifications/unread-count`
Okunmamış bildirim sayısı (header badge için). 🔒 JWT gerekli.

**Yanıt:**
```json
{ "unread_count": 3 }
```

---

### POST `/api/notifications/mark-read`
Bildirimleri okundu olarak işaretler. 🔒 JWT gerekli.

**Body:**
```json
{ "ids": [1, 2, 3] }
```
> `ids` boş veya gönderilmezse tüm okunmamışlar işaretlenir.

---

### POST `/api/notifications/check-anomalies`
Manuel anomali kontrolü tetikler. 🔒 JWT gerekli.

**Yanıt:**
```json
{ "message": "Anomali kontrolü tamamlandı" }
```

> **Not:** Anomali kontrolü normalde `POST /api/analytics/customers` ile veri gönderildiğinde otomatik tetiklenir. Bu endpoint sadece manuel test içindir.

---

## Roller ve Yetkiler

| Rol | Açıklama | Yetkiler |
|-----|----------|----------|
| `admin` | Sistem yöneticisi | Tüm endpoint'lere erişim, kullanıcı yönetimi |
| `brand_manager` | Marka yöneticisi | Yönettiği mağazaların tüm verilerine erişim |
| `user` | Mağaza kullanıcısı | Kendi verilerine erişim, destek talebi açma |

---

## Rate Limiting

Şu an rate limiting uygulanmamaktadır. Prodüksiyon ortamında Nginx/Cloudflare seviyesinde uygulanması önerilir.

---

## Ortam Değişkenleri

| Değişken | Açıklama | Varsayılan |
|----------|----------|------------|
| `SECRET_KEY` | Flask secret key | — |
| `JWT_SECRET_KEY` | JWT imzalama anahtarı | — |
| `DATABASE_URL` | Veritabanı bağlantısı | SQLite |
| `TELEGRAM_BOT` | Telegram bot token (sağlık uyarıları) | — |
| `TELEGRAM_ID` | Telegram chat ID | — |
| `OLLAMA_URL` | Ollama AI model URL'i | `http://localhost:11434` |

---

## Örnek cURL Komutları

### Giriş
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

### Müşteri Verisi Çekme
```bash
curl http://localhost:5000/api/analytics/customers?date=2026-05-30 \
  -H "Authorization: Bearer <TOKEN>"
```

### Heartbeat Gönderme (Mağaza Script)
```bash
curl -X POST http://localhost:5000/api/health/heartbeat \
  -H "Authorization: Bearer <TOKEN>"
```

### Kamera Görüntüsü Yükleme
```bash
curl -X POST http://localhost:5000/api/camera/upload \
  -H "Authorization: Bearer <TOKEN>" \
  -F "file=@./capture.jpg" \
  -F "camera_id=CAM1" \
  -F "notes=Giriş kapısı"
```

---

*Bu dokümantasyon 31 Mayıs 2026 tarihinde oluşturulmuştur. Güncel endpoint listesi için backend/routes/ dizinini inceleyebilirsiniz.*
