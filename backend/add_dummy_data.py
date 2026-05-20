"""
Admin kullanıcısı için son 1 ay dummy data ekler.
Personel yönetimi (StaffData) HARİÇ: Customer, Heatmap, Queue, SiteConfig.
Dashboard, Müşteri Analizi, Isı Haritası, Kuyruk Analizi ve Sohbet (AI) için veri doldurur.
"""
from datetime import datetime, timedelta
from app import create_app
from models import db, User, CustomerData, HeatmapData, QueueData, SiteConfig

app = create_app()

DAYS_BACK = 30
CAMERAS = ['Kamera-1', 'Kamera-2', 'Kamera-3']
ZONES = ['Giriş', 'Erkek Giyim', 'Kadın Giyim', 'Çocuk', 'Ayakkabı', 'Aksesuar']
HEATMAP_ZONES = ['Erkek Giyim', 'Kadın Giyim', 'Çocuk', 'Ayakkabı', 'Aksesuar', 'Giriş']
CASHIERS = ['Kasa-1', 'Kasa-2', 'Kasa-3', 'Kasa-4']


def add_dummy_data():
    with app.app_context():
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            print("Admin kullanıcısı bulunamadı! Önce POST /api/init ile veritabanı oluşturun.")
            return

        admin_id = admin.id
        today = datetime.now().date()
        start_date = today - timedelta(days=DAYS_BACK)
        print(f"Admin ID: {admin_id}")
        print(f"Tarih aralığı: {start_date} — {today} (son {DAYS_BACK} gün)")
        print("Personel verisi EKLENMİYOR (istek üzerine). Diğer tüm veriler ekleniyor...\n")

        # SiteConfig (mağaza adı) - yoksa ekle
        if not SiteConfig.query.filter_by(user_id=admin_id).first():
            db.session.add(SiteConfig(user_id=admin_id, site_name='Vislivis Demo Mağaza'))
            db.session.commit()
            print("SiteConfig (mağaza adı) eklendi.")

        total_customer = 0
        total_heatmap = 0
        total_queue = 0

        for day_offset in range(DAYS_BACK):
            d = today - timedelta(days=day_offset)
            day_start = datetime.combine(d, datetime.min.time())

            # Günlük çeşitlilik için seed
            day_seed = day_offset * 17

            # 1. CUSTOMER DATA (günde 8–18 arası saatler, her saat 2 kamera)
            for hour in range(8, 19):
                for cam_idx, camera in enumerate(CAMERAS[:2]):
                    ts = day_start.replace(hour=hour, minute=15 + (day_seed + hour) % 45)
                    zone = ZONES[(day_seed + hour + cam_idx) % len(ZONES)]
                    entered = 8 + (hour - 8) * 2 + (day_seed % 5)
                    exited = 6 + (hour - 8) * 2 + (day_seed % 4)
                    purchase = 120.0 + (hour - 8) * 12 + (day_seed % 80)
                    customer_data = CustomerData(
                        user_id=admin_id,
                        timestamp=ts,
                        location=ZONES[0],
                        customers_inside=30 + (hour - 8) * 4 + (day_seed % 20),
                        male_count=10 + (hour - 8) + (day_seed % 8),
                        female_count=18 + (hour - 8) * 2 + (day_seed % 10),
                        age_18_30=12 + (hour - 8) + (day_seed % 6),
                        age_30_50=10 + (hour - 8) + (day_seed % 5),
                        age_50_plus=4 + (day_seed % 4),
                        zone_visited=zone,
                        purchase_amount=purchase,
                        is_returning=(hour + day_offset) % 4 == 0,
                        satisfaction_score=3 + (day_seed % 2),
                        camera_id=camera,
                        entered=entered,
                        exited=exited,
                    )
                    db.session.add(customer_data)
                    total_customer += 1

            # 2. HEATMAP DATA
            for hour in range(8, 19):
                for zone in HEATMAP_ZONES:
                    recorded_at = day_start.replace(hour=hour, minute=(day_seed % 60))
                    heatmap_data = HeatmapData(
                        user_id=admin_id,
                        zone=zone,
                        intensity=90.0 + (hour - 8) * 6 + (day_seed % 40),
                        visitor_count=5 + (hour - 8) + (hash(zone) % 8) + (day_seed % 5),
                        heatmap_type='iç',
                        camera_id=CAMERAS[hash(zone) % len(CAMERAS)],
                        date_recorded=d,
                        recorded_at=recorded_at,
                    )
                    db.session.add(heatmap_data)
                    total_heatmap += 1

            # 3. QUEUE DATA
            for hour in range(8, 19):
                for cashier in CASHIERS:
                    enter_time = day_start.replace(hour=hour, minute=10 + (day_seed % 50))
                    exit_time = enter_time + timedelta(minutes=3 + (hash(cashier) % 8))
                    wait_time = 120.0 + (hour - 8) * 8 + (hash(cashier) % 90) + (day_seed % 30)
                    queue_data = QueueData(
                        user_id=admin_id,
                        customer_id=f'C-{day_offset}-{hour}-{hash(cashier) % 9999}',
                        enter_time=enter_time,
                        exit_time=exit_time,
                        wait_time=wait_time,
                        queue_position=1 + (hash(cashier) % 4),
                        cashier_id=cashier,
                        status='completed',
                        total_customers=3 + (hour - 8) + (hash(cashier) % 6),
                        recorded_at=enter_time,
                    )
                    db.session.add(queue_data)
                    total_queue += 1

            if (day_offset + 1) % 7 == 0:
                db.session.commit()
                print(f"   {day_offset + 1} gün işlendi...")

        try:
            db.session.commit()
            print("\n[OK] Tüm dummy data başarıyla eklendi (personel hariç).")
            print(f"   - Customer Data: {total_customer} kayıt")
            print(f"   - Heatmap Data: {total_heatmap} kayıt")
            print(f"   - Queue Data: {total_queue} kayıt")
        except Exception as e:
            db.session.rollback()
            print(f"\n[HATA] {e}")


if __name__ == '__main__':
    add_dummy_data()
