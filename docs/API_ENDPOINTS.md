# Vislivis Panel — Backend API Endpoint Dokümantasyonu

> Tüm endpoint'ler `JWT Bearer Token` gerektirir (aksi belirtilmedikçe).  
> Base URL: `http://localhost:5000`  
> Auth header: `Authorization: Bearer <token>`

---

## 1. Auth — `/api/auth`

| Method | Path | Auth | Açıklama |
|--------|------|------|----------|
| POST | `/api/auth/login` | ❌ Public | Kullanıcı girişi. `{username, password}` → `{access_token, user}` |
| POST | `/api/auth/register` | ✅ Admin only | Yeni kullanıcı kaydı. `{username, email, password, role}` |
| GET  | `/api/auth/me` | ✅ JWT | Oturum açmış kullanıcı bilgisi |

---

## 2. Dashboard — `/api/dashboard`

| Method | Path | Auth | Açıklama |
|--------|------|------|----------|
| GET | `/api/dashboard/summary` | ✅ JWT | Haftalık özet: giriş/çıkış, cinsiyet, yaş, kuyruk, en yoğun kasa |
| GET | `/api/dashboard/timeseries?date_from=&date_to=` | ✅ JWT | Günlük akış, cinsiyet ve yaş zaman serisi verileri |

---

## 3. Analytics — `/api/analytics`

### Müşteri

| Method | Path | Auth | Açıklama |
|--------|------|------|----------|
| GET  | `/api/analytics/customers` | ✅ JWT | Müşteri kayıtları. Query: `date_from`, `date_to`, `date`, `camera_id` |
| POST | `/api/analytics/customers` | ✅ JWT | Yeni müşteri kaydı ekle |
| GET  | `/api/analytics/customers/latest-date` | ✅ JWT | Veri olan en son tarih |
| GET  | `/api/analytics/customers/flow-data` | ✅ JWT | Saatlik giriş/çıkış akışı. Query: `date_from`, `camera_id` |
| PUT  | `/api/analytics/customers/record/<id>` | ✅ JWT | Kayıt güncelle `{entering, exiting}` |
| DELETE | `/api/analytics/customers/record/<id>` | ✅ JWT | Kayıt sil |
| PUT  | `/api/analytics/customers/hourly-edit` | ✅ JWT | Toplu saat bazında düzenleme |

### Kuyruk

| Method | Path | Auth | Açıklama |
|--------|------|------|----------|
| GET  | `/api/analytics/queues` | ✅ JWT | Ham kuyruk kayıtları. Query: `date_from`, `date_to`, `cashier_id` |
| POST | `/api/analytics/queues` | ✅ JWT | Yeni kuyruk kaydı. `{wait_time, cashier_id, status, total_customers, recorded_at}` |
| GET  | `/api/analytics/queues/daily-summary` | ✅ JWT | Saatlik/günlük kuyruk özeti. Query: `date_from`, `date_to`, `cashier_ids` |
| PUT  | `/api/analytics/queues/record/<id>` | ✅ JWT | Kayıt güncelle `{avgWaitTime, totalCustomers}` |
| DELETE | `/api/analytics/queues/record/<id>` | ✅ JWT | Kayıt sil |

### Isı Haritası (Heatmap)

| Method | Path | Auth | Açıklama |
|--------|------|------|----------|
| GET  | `/api/analytics/heatmaps` | ✅ JWT | Ham ısı haritası kayıtları |
| POST | `/api/analytics/heatmaps` | ✅ JWT | Yeni ısı haritası kaydı. `{zone, intensity, visitor_count, camera_id, timestamp}` |
| GET  | `/api/analytics/heatmaps/daily-summary` | ✅ JWT | Günlük/aralık ısı haritası özeti. Query: `date_from`, `date_to`, `zone_ids` |
| PUT  | `/api/analytics/heatmaps/record/<id>` | ✅ JWT | Kayıt güncelle `{totalVisitors, avgDwellTime}` |
| DELETE | `/api/analytics/heatmaps/record/<id>` | ✅ JWT | Kayıt sil |

### Personel

| Method | Path | Auth | Açıklama |
|--------|------|------|----------|
| GET  | `/api/analytics/staff` | ✅ JWT | Personel listesi. Query: `page`, `per_page`, `status` |
| POST | `/api/analytics/staff` | ✅ JWT | Yeni personel kaydı |

### Raporlar

| Method | Path | Auth | Açıklama |
|--------|------|------|----------|
| GET  | `/api/analytics/reports` | ✅ JWT | Rapor listesi. Query: `page`, `per_page` |
| POST | `/api/analytics/create-report` | ✅ JWT | Yeni rapor oluştur. `{report_type, report_name, date_from, date_to}` |

---

## 4. Insights — `/api/analytics`

| Method | Path | Auth | Açıklama |
|--------|------|------|----------|
| GET | `/api/analytics/insights/<module>` | ✅ JWT | Modül bazlı AI önerileri. `module`: `customer`, `queue`, `heatmap`, `dashboard` |

---

## 5. Settings — `/api/settings`

| Method | Path | Auth | Açıklama |
|--------|------|------|----------|
| GET  | `/api/settings/profile` | ✅ JWT | Profil bilgilerini getir |
| PUT  | `/api/settings/profile` | ✅ JWT | Profil güncelle. `{fullName, email}` |
| PUT  | `/api/settings/password` | ✅ JWT | Şifre değiştir. `{currentPassword, newPassword}` |
| GET  | `/api/settings/cameras` | ✅ JWT | Kamera listesini getir |
| POST | `/api/settings/setup` | ✅ JWT | Site ve kamera kurulumu. `{site_name, cameras[]}` |
| GET  | `/api/settings/managed-stores` | ✅ JWT (brand_manager) | Yönetilen mağaza listesi |
| GET  | `/api/settings/report-recipients` | ✅ JWT | Rapor e-posta alıcıları |
| POST | `/api/settings/report-recipients` | ✅ JWT | Rapor alıcısı ekle. `{email}` |
| DELETE | `/api/settings/report-recipients/<id>` | ✅ JWT | Rapor alıcısı sil |

---

## 6. Kamera Upload — `/api/camera`

| Method | Path | Auth | Açıklama |
|--------|------|------|----------|
| POST | `/api/camera/upload` | ✅ JWT | Kamera görüntüsü yükle. Form-data: `file` (JPEG/PNG/WEBP/BMP, max 20MB), `camera_id` (opsiyonel), `notes` (opsiyonel) |
| GET  | `/api/camera/images` | ✅ JWT | Yüklenen görüntü listesi. Query: `camera_id`, `date_from`, `date_to`, `limit` |
| GET  | `/api/camera/images/<id>/file` | ✅ JWT | Görüntü dosyasını indir/görüntüle |
| DELETE | `/api/camera/images/<id>` | ✅ JWT | Görüntüyü sil |

---

## 7. Chat — `/api/chat`

| Method | Path | Auth | Açıklama |
|--------|------|------|----------|
| GET  | `/api/chat/conversations` | ✅ JWT | Konuşma listesi |
| DELETE | `/api/chat/conversations/<id>` | ✅ JWT | Konuşma sil |
| GET  | `/api/chat/history/<conv_id>` | ✅ JWT | Mesaj geçmişi |
| POST | `/api/chat/message` | ✅ JWT | Mesaj gönder. `{message, conversation_id?}` |

---

## 8. Tickets — `/api/tickets`

| Method | Path | Auth | Açıklama |
|--------|------|------|----------|
| GET  | `/api/tickets` | ✅ JWT | Destek talepleri listesi |
| POST | `/api/tickets` | ✅ JWT | Yeni talep aç. `{title, description, priority}` |
| GET  | `/api/tickets/<id>` | ✅ JWT | Talep detayı + mesajlar |
| PUT  | `/api/tickets/<id>` | ✅ JWT | Talep güncelle (admin: status, priority) |
| POST | `/api/tickets/<id>/messages` | ✅ JWT | Talebe mesaj ekle. `{content}` |

---

## 9. Admin — `/api/admin` *(Sadece admin rolü)*

| Method | Path | Auth | Açıklama |
|--------|------|------|----------|
| GET  | `/api/admin/users` | ✅ Admin | Kullanıcı listesi. Query: `page`, `per_page` |
| POST | `/api/admin/users` | ✅ Admin | Kullanıcı oluştur |
| PUT  | `/api/admin/users/<id>` | ✅ Admin | Kullanıcı güncelle |
| DELETE | `/api/admin/users/<id>` | ✅ Admin | Kullanıcı sil |
| GET  | `/api/admin/users/<id>/managed-stores` | ✅ Admin | Yönetilen mağazalar |
| PUT  | `/api/admin/users/<id>/managed-stores` | ✅ Admin | Mağaza ataması güncelle |
| POST | `/api/admin/users/<id>/impersonate` | ✅ Admin | Kullanıcı olarak oturum aç |
| GET  | `/api/admin/activity-logs` | ✅ Admin | Aktivite logları |
| GET  | `/api/admin/health` | ✅ Admin | Servis sağlığı özeti |

---

## 10. Health — `/api/health`

| Method | Path | Auth | Açıklama |
|--------|------|------|----------|
| GET  | `/api/health` | ❌ Public | Temel servis sağlığı (`{status: ok}`) |
| GET  | `/api/health/detail` | ✅ JWT | DB, bellek, CPU durumu |

---

## 11. Diğer

| Method | Path | Auth | Açıklama |
|--------|------|------|----------|
| GET  | `/api/weather` | ✅ JWT | Hava durumu (Open-Meteo proxy) |
| POST | `/api/log/page-view` | ✅ JWT | Sayfa görüntüleme logu |
| POST | `/api/init` | ❌ Public | DB başlatma (tek seferlik) |

---

## Query Parameter Notları

- **Tarih aralığı**: `date_from=YYYY-MM-DD&date_to=YYYY-MM-DD` (tüm analytics endpoint'lerinde)
- **Mağaza seçimi** (brand_manager): `?store_id=<user_id>` ile belirli mağazanın verisine geç
- **Sayfalama**: `?page=1&per_page=20` (listeleme endpoint'lerinde)
- **Limit**: `/api/analytics/customers` → en fazla 2000 kayıt döner (range sorgularda)
