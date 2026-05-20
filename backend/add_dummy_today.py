"""
Bugünün tarihi için müşteri sayımı (ve isteğe bağlı ısı haritası/kuyruk) örnek verisini ekler.
Müşteri Sayımı sayfasında "Bugün" seçildiğinde "Veri Bulunamadı" çıkıyorsa bu script'i çalıştırın.

Kullanım (backend klasöründeyken):
  python add_dummy_today.py
"""
from datetime import datetime, timedelta
try:
    from zoneinfo import ZoneInfo
    TURKEY = ZoneInfo('Europe/Istanbul')
except ImportError:
    TURKEY = None  # Python 3.8: sunucu yerel saati kullanılır
from app import create_app
from models import db, User, CustomerData, HeatmapData, QueueData, SiteConfig

app = create_app()

# Ana sayfa grafikleri 10:00 - 22:00 aralığını gösteriyor; bu saatlerde veri üretiyoruz
HOUR_START = 10
HOUR_END = 22

CAMERAS = ['Kamera-1', 'Kamera-2', 'Kamera-3']
ZONES = ['Giriş', 'Erkek Giyim', 'Kadın Giyim', 'Çocuk', 'Ayakkabı', 'Aksesuar']
HEATMAP_ZONES = ['Erkek Giyim', 'Kadın Giyim', 'Çocuk', 'Ayakkabı', 'Aksesuar', 'Giriş']
CASHIERS = ['Kasa-1', 'Kasa-2', 'Kasa-3', 'Kasa-4']


def add_dummy_today():
    with app.app_context():
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            print("Admin kullanıcısı bulunamadı! Önce POST /api/init ile veritabanı oluşturun.")
            return

        admin_id = admin.id
        now_turkey = datetime.now(TURKEY) if TURKEY else datetime.now()
        today = now_turkey.date()
        day_start = datetime.combine(today, datetime.min.time())
        day_seed = hash(str(today)) % 1000

        print(f"Admin ID: {admin_id}")
        print(f"Tarih: {today} (saatler {HOUR_START}:00 - {HOUR_END}:00)")
        print("Bugün için örnek veri ekleniyor...\n")

        total_customer = 0
        total_heatmap = 0
        total_queue = 0

        # 1. CUSTOMER DATA (Müşteri Sayımı / Günlük Akış / Yaş-Cinsiyet için)
        for hour in range(HOUR_START, HOUR_END + 1):
            for cam_idx, camera in enumerate(CAMERAS[:2]):
                ts = day_start.replace(hour=hour, minute=15 + (day_seed + hour) % 45)
                zone = ZONES[(day_seed + hour + cam_idx) % len(ZONES)]
                entered = 8 + (hour - HOUR_START) * 2 + (day_seed % 5)
                exited = 6 + (hour - HOUR_START) * 2 + (day_seed % 4)
                purchase = 120.0 + (hour - HOUR_START) * 12 + (day_seed % 80)
                db.session.add(CustomerData(
                    user_id=admin_id,
                    timestamp=ts,
                    location=ZONES[0],
                    customers_inside=30 + (hour - HOUR_START) * 4 + (day_seed % 20),
                    male_count=10 + (hour - HOUR_START) + (day_seed % 8),
                    female_count=18 + (hour - HOUR_START) * 2 + (day_seed % 10),
                    age_18_30=12 + (hour - HOUR_START) + (day_seed % 6),
                    age_30_50=10 + (hour - HOUR_START) + (day_seed % 5),
                    age_50_plus=4 + (day_seed % 4),
                    zone_visited=zone,
                    purchase_amount=purchase,
                    is_returning=(hour + day_seed) % 4 == 0,
                    satisfaction_score=3 + (day_seed % 2),
                    camera_id=camera,
                    entered=entered,
                    exited=exited,
                ))
                total_customer += 1

        # 2. HEATMAP DATA (isteğe bağlı)
        for hour in range(HOUR_START, HOUR_END + 1):
            for zone in HEATMAP_ZONES:
                recorded_at = day_start.replace(hour=hour, minute=(day_seed % 60))
                db.session.add(HeatmapData(
                    user_id=admin_id,
                    zone=zone,
                    intensity=90.0 + (hour - HOUR_START) * 6 + (day_seed % 40),
                    visitor_count=5 + (hour - HOUR_START) + (hash(zone) % 8) + (day_seed % 5),
                    heatmap_type='iç',
                    camera_id=CAMERAS[hash(zone) % len(CAMERAS)],
                    date_recorded=today,
                    recorded_at=recorded_at,
                ))
                total_heatmap += 1

        # 3. QUEUE DATA (isteğe bağlı)
        for hour in range(HOUR_START, HOUR_END + 1):
            for cashier in CASHIERS:
                enter_time = day_start.replace(hour=hour, minute=10 + (day_seed % 50))
                exit_time = enter_time + timedelta(minutes=3 + (hash(cashier) % 8))
                wait_time = 120.0 + (hour - HOUR_START) * 8 + (hash(cashier) % 90) + (day_seed % 30)
                db.session.add(QueueData(
                    user_id=admin_id,
                    customer_id=f'T-{hour}-{hash(cashier) % 9999}',
                    enter_time=enter_time,
                    exit_time=exit_time,
                    wait_time=wait_time,
                    queue_position=1 + (hash(cashier) % 2),
                    cashier_id=cashier,
                    status='completed',
                    total_customers=3 + (hour - HOUR_START) + (hash(cashier) % 6),
                    recorded_at=enter_time,
                ))
                total_queue += 1

        try:
            db.session.commit()
            print("[OK] Bugün için örnek veri eklendi.")
            print(f"   - Customer Data: {total_customer} kayıt (Müşteri Sayımı / Günlük Akış / Yaş-Cinsiyet)")
            print(f"   - Heatmap Data: {total_heatmap} kayıt")
            print(f"   - Queue Data: {total_queue} kayıt")
            print("\nMüşteri Sayımı sayfasında 'Bugün' seçerek verileri görebilirsiniz.")
        except Exception as e:
            db.session.rollback()
            print(f"[HATA] {e}")


if __name__ == '__main__':
    add_dummy_today()
