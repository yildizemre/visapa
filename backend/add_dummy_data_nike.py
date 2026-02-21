"""
Nike kullanıcısı (nike@vislivis.com) için:
- 9 kamera: 2 Kişi Sayım, 5 Isı Haritası, 2 Kasa Analizi
- Son 1 ay tam dummy data: Customer, Heatmap, Queue, SiteConfig (personel hariç)
"""
from datetime import datetime, timedelta
from app import create_app
from models import db, User, CustomerData, HeatmapData, QueueData, SiteConfig, CameraConfig

app = create_app()

DAYS_BACK = 30
# Nike kamera isimleri
CAMERAS_KS = ['Nike-KS-1', 'Nike-KS-2']   # 2 Kişi Sayım
CAMERAS_IH = ['Nike-IH-1', 'Nike-IH-2', 'Nike-IH-3', 'Nike-IH-4', 'Nike-IH-5']  # 5 Isı Haritası
CAMERAS_KA = ['Nike-Kasa-1', 'Nike-Kasa-2']  # 2 Kasa Analizi
ZONES = ['Giriş', 'Erkek Giyim', 'Kadın Giyim', 'Çocuk', 'Ayakkabı', 'Aksesuar']
HEATMAP_ZONES = ['Erkek Giyim', 'Kadın Giyim', 'Çocuk', 'Ayakkabı', 'Aksesuar', 'Giriş']


def add_dummy_data_nike():
    with app.app_context():
        user = User.query.filter(
            (User.username == 'nike') | (User.email == 'nike@vislivis.com')
        ).first()
        if not user:
            print("Nike kullanıcısı bulunamadı (username=nike veya email=nike@vislivis.com). Önce oluşturun.")
            return

        user_id = user.id
        today = datetime.now().date()
        start_date = today - timedelta(days=DAYS_BACK)
        print(f"Nike User ID: {user_id}")
        print(f"Tarih aralığı: {start_date} — {today} (son {DAYS_BACK} gün)")
        print("9 kamera (2 Kişi Sayım, 5 Isı Haritası, 2 Kasa) + 1 ay dummy data ekleniyor...\n")

        # 1. Kameralar (yoksa ekle)
        existing = CameraConfig.query.filter_by(user_id=user_id).count()
        if existing == 0:
            sort_order = 0
            for name in CAMERAS_KS:
                db.session.add(CameraConfig(
                    user_id=user_id, name=name, camera_type='Kişi Sayım',
                    rtsp_url='', sort_order=sort_order
                ))
                sort_order += 1
            for name in CAMERAS_IH:
                db.session.add(CameraConfig(
                    user_id=user_id, name=name, camera_type='Isı Haritası',
                    rtsp_url='', sort_order=sort_order
                ))
                sort_order += 1
            for name in CAMERAS_KA:
                db.session.add(CameraConfig(
                    user_id=user_id, name=name, camera_type='Kasa Analizi',
                    rtsp_url='', sort_order=sort_order
                ))
                sort_order += 1
            db.session.commit()
            print("9 kamera eklendi (2 Kişi Sayım, 5 Isı Haritası, 2 Kasa Analizi).")
        else:
            print(f"Mevcut {existing} kamera var, kamera atlanıyor.")

        # 2. SiteConfig
        if not SiteConfig.query.filter_by(user_id=user_id).first():
            db.session.add(SiteConfig(user_id=user_id, site_name='Nike Mağaza'))
            db.session.commit()
            print("SiteConfig (Nike Mağaza) eklendi.")

        total_customer = 0
        total_heatmap = 0
        total_queue = 0

        for day_offset in range(DAYS_BACK):
            d = today - timedelta(days=day_offset)
            day_start = datetime.combine(d, datetime.min.time())
            day_seed = day_offset * 17

            # CUSTOMER DATA (2 Kişi Sayım kamerası)
            for hour in range(8, 19):
                for cam_idx, camera in enumerate(CAMERAS_KS):
                    ts = day_start.replace(hour=hour, minute=15 + (day_seed + hour) % 45)
                    zone = ZONES[(day_seed + hour + cam_idx) % len(ZONES)]
                    entered = 8 + (hour - 8) * 2 + (day_seed % 5)
                    exited = 6 + (hour - 8) * 2 + (day_seed % 4)
                    purchase = 120.0 + (hour - 8) * 12 + (day_seed % 80)
                    db.session.add(CustomerData(
                        user_id=user_id,
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
                    ))
                    total_customer += 1

            # HEATMAP DATA (5 Isı Haritası kamerası - zone çeşitliliği)
            for hour in range(8, 19):
                for zi, zone in enumerate(HEATMAP_ZONES):
                    cam = CAMERAS_IH[zi % len(CAMERAS_IH)]
                    recorded_at = day_start.replace(hour=hour, minute=(day_seed % 60))
                    db.session.add(HeatmapData(
                        user_id=user_id,
                        zone=zone,
                        intensity=90.0 + (hour - 8) * 6 + (day_seed % 40),
                        visitor_count=5 + (hour - 8) + (hash(zone) % 8) + (day_seed % 5),
                        heatmap_type='iç',
                        camera_id=cam,
                        date_recorded=d,
                        recorded_at=recorded_at,
                    ))
                    total_heatmap += 1

            # QUEUE DATA (2 Kasa)
            for hour in range(8, 19):
                for cashier in CAMERAS_KA:
                    enter_time = day_start.replace(hour=hour, minute=10 + (day_seed % 50))
                    exit_time = enter_time + timedelta(minutes=3 + (hash(cashier) % 8))
                    wait_time = 120.0 + (hour - 8) * 8 + (hash(cashier) % 90) + (day_seed % 30)
                    db.session.add(QueueData(
                        user_id=user_id,
                        customer_id=f'N-{day_offset}-{hour}-{hash(cashier) % 9999}',
                        enter_time=enter_time,
                        exit_time=exit_time,
                        wait_time=wait_time,
                        queue_position=1 + (hash(cashier) % 2),
                        cashier_id=cashier,
                        status='completed',
                        total_customers=3 + (hour - 8) + (hash(cashier) % 6),
                        recorded_at=enter_time,
                    ))
                    total_queue += 1

            if (day_offset + 1) % 7 == 0:
                db.session.commit()
                print(f"   {day_offset + 1} gün işlendi...")

        try:
            db.session.commit()
            print("\n[OK] Nike için tüm dummy data eklendi.")
            print(f"   - Kamera: 2 Kişi Sayım, 5 Isı Haritası, 2 Kasa Analizi (9 adet)")
            print(f"   - Customer Data: {total_customer} kayıt")
            print(f"   - Heatmap Data: {total_heatmap} kayıt")
            print(f"   - Queue Data: {total_queue} kayıt")
        except Exception as e:
            db.session.rollback()
            print(f"\n[HATA] {e}")


if __name__ == '__main__':
    add_dummy_data_nike()
