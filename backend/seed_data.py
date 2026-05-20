"""
Vislivis Panel - Veritabanı Seed Script (30 Günlük Zengin Veri)
Son 30 gün için gerçekçi mağaza verileri oluşturur.
Hafta sonu / hafta içi / kampanya günleri farklı yoğunlukta.
Boyner İstinye Park rapor formatı referans alınmıştır.
"""
import sys, os, random, math
from datetime import datetime, timedelta, date, time

sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from models import db, User, CustomerData, QueueData, HeatmapData, StaffData, SiteConfig, CameraConfig

app = create_app()

# Temel saatlik müşteri trafiği pattern'i (10:00-22:00)
BASE_HOURLY = {
    10: {'entered': 92, 'exited': 65},
    11: {'entered': 105, 'exited': 98},
    12: {'entered': 148, 'exited': 140},
    13: {'entered': 172, 'exited': 185},
    14: {'entered': 210, 'exited': 195},
    15: {'entered': 285, 'exited': 278},
    16: {'entered': 205, 'exited': 190},
    17: {'entered': 238, 'exited': 215},
    18: {'entered': 210, 'exited': 205},
    19: {'entered': 175, 'exited': 178},
    20: {'entered': 198, 'exited': 182},
    21: {'entered': 88, 'exited': 102},
    22: {'entered': 15, 'exited': 45},
}

GENDER_RATIO = {'male': 0.459, 'female': 0.541}
AGE_DIST = {'0-12': 0.05, '13-17': 0.08, '18-30': 0.22, '31-50': 0.48, '51-64': 0.12, '65+': 0.05}

ZONES = ['Kadın Giyim', 'Erkek Giyim', 'Çocuk', 'Kozmetik', 'Aksesuar', 'Ev & Yaşam', 'Spor', 'Ayakkabı']
ZONE_WEIGHTS = [0.22, 0.18, 0.10, 0.15, 0.10, 0.08, 0.09, 0.08]

CASHIERS = ['Kasa-1', 'Kasa-2', 'Kasa-3', 'Kasa-4']
CAMERAS = ['Cam-Giris-1', 'Cam-Giris-2', 'Cam-Kat1-1', 'Cam-Kat1-2', 'Cam-Kat2-1', 'Cam-Kat2-2', 'Cam-Depo', 'Cam-Kasa']

STAFF_LIST = [
    {'staff_id': 'STF-001', 'name': 'Ayşe Yılmaz', 'role': 'Mağaza Müdürü', 'location': 'Genel'},
    {'staff_id': 'STF-002', 'name': 'Mehmet Kaya', 'role': 'Satış Danışmanı', 'location': 'Erkek Giyim'},
    {'staff_id': 'STF-003', 'name': 'Zeynep Demir', 'role': 'Satış Danışmanı', 'location': 'Kadın Giyim'},
    {'staff_id': 'STF-004', 'name': 'Ali Çelik', 'role': 'Kasiyer', 'location': 'Kasa Bölgesi'},
    {'staff_id': 'STF-005', 'name': 'Fatma Arslan', 'role': 'Kasiyer', 'location': 'Kasa Bölgesi'},
    {'staff_id': 'STF-006', 'name': 'Emre Koç', 'role': 'Satış Danışmanı', 'location': 'Spor'},
    {'staff_id': 'STF-007', 'name': 'Selin Öztürk', 'role': 'Satış Danışmanı', 'location': 'Kozmetik'},
    {'staff_id': 'STF-008', 'name': 'Can Yıldız', 'role': 'Depo Sorumlusu', 'location': 'Depo'},
    {'staff_id': 'STF-009', 'name': 'Deniz Aktaş', 'role': 'Güvenlik', 'location': 'Giriş'},
    {'staff_id': 'STF-010', 'name': 'Buse Şahin', 'role': 'Satış Danışmanı', 'location': 'Aksesuar'},
    {'staff_id': 'STF-011', 'name': 'Hakan Yıldırım', 'role': 'Satış Danışmanı', 'location': 'Ayakkabı'},
    {'staff_id': 'STF-012', 'name': 'Elif Korkmaz', 'role': 'Kasiyer', 'location': 'Kasa Bölgesi'},
]


def add_jitter(val, pct=0.10):
    return max(0, int(val * (1 + random.uniform(-pct, pct))))


def day_scale(d):
    """Haftanın gününe ve özel günlere göre trafik çarpanı."""
    wd = d.weekday()  # 0=Pazartesi
    # Hafta sonu daha yoğun
    if wd == 5:  # Cumartesi
        base = random.uniform(1.25, 1.45)
    elif wd == 6:  # Pazar
        base = random.uniform(1.15, 1.35)
    elif wd == 4:  # Cuma
        base = random.uniform(1.05, 1.20)
    elif wd == 0:  # Pazartesi (sakin)
        base = random.uniform(0.70, 0.85)
    else:
        base = random.uniform(0.85, 1.05)
    # Ayın 1-5'i ve 15'i maaş günü etkisi
    if d.day <= 5 or d.day == 15:
        base *= random.uniform(1.08, 1.18)
    # Haftalık trend: son 2 hafta biraz daha yoğun (mevsimsel artış)
    days_from_today = (date.today() - d).days
    if days_from_today <= 7:
        base *= 1.05
    elif days_from_today <= 14:
        base *= 1.0
    else:
        base *= random.uniform(0.88, 0.98)
    return base


def seed_all():
    with app.app_context():
        db.create_all()

        # Admin kullanıcı
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            admin = User(username='admin', email='admin@vislivis.com', role='admin', full_name='Sistem Yöneticisi')
            admin.set_password('admin')
            db.session.add(admin)
            db.session.commit()
            print("✅ Admin kullanıcı oluşturuldu: admin / admin")

        # Store manager kullanıcı
        store_mgr = User.query.filter_by(username='boyner').first()
        if not store_mgr:
            store_mgr = User(username='boyner', email='magaza@boyner.com', role='user', full_name='Boyner İstinye Park')
            store_mgr.set_password('boyner123')
            db.session.add(store_mgr)
            db.session.commit()
            print("✅ Mağaza kullanıcı oluşturuldu: boyner / boyner123")

        user_id = store_mgr.id

        # Site config
        if not SiteConfig.query.filter_by(user_id=user_id).first():
            db.session.add(SiteConfig(user_id=user_id, site_name='Boyner İstinye Park'))
            print("✅ Site config oluşturuldu")

        # Kamera config
        if CameraConfig.query.filter_by(user_id=user_id).count() == 0:
            cam_types = ['Kişi Sayım', 'Kişi Sayım', 'Isı Haritası', 'Isı Haritası',
                         'Isı Haritası', 'Isı Haritası', 'Kişi Sayım', 'Kasa Analizi']
            for i, cam_name in enumerate(CAMERAS):
                db.session.add(CameraConfig(
                    user_id=user_id, name=cam_name,
                    camera_type=cam_types[i],
                    rtsp_url=f'rtsp://192.168.1.{100+i}:554/stream',
                    sort_order=i
                ))
            print("✅ 8 Kamera config oluşturuldu")

        # Mevcut verileri temizle
        CustomerData.query.filter_by(user_id=user_id).delete()
        QueueData.query.filter_by(user_id=user_id).delete()
        HeatmapData.query.filter_by(user_id=user_id).delete()
        StaffData.query.filter_by(user_id=user_id).delete()
        db.session.commit()
        print("🗑️  Eski veriler temizlendi")

        today = date.today()

        # ===== 30 GÜNLÜK VERİ =====
        total_records = {'customer': 0, 'queue': 0, 'heatmap': 0}

        for days_ago in range(30, -1, -1):  # 30 gün önce → bugün
            d = today - timedelta(days=days_ago)
            scale = day_scale(d)
            label = 'bugün' if days_ago == 0 else f'{days_ago} gün önce'

            day_entered = 0
            day_exited = 0

            for hour, base_traffic in BASE_HOURLY.items():
                entered = add_jitter(int(base_traffic['entered'] * scale))
                exited = add_jitter(int(base_traffic['exited'] * scale))
                day_entered += entered
                day_exited += exited

                total_for_hour = entered + exited
                male_count = int(total_for_hour * GENDER_RATIO['male'] * random.uniform(0.90, 1.10))
                female_count = total_for_hour - male_count

                age_18_30 = int(total_for_hour * AGE_DIST['18-30'] * random.uniform(0.88, 1.12))
                age_30_50 = int(total_for_hour * AGE_DIST['31-50'] * random.uniform(0.88, 1.12))
                age_50_plus = int(total_for_hour * (AGE_DIST['51-64'] + AGE_DIST['65+']) * random.uniform(0.88, 1.12))

                cam = random.choice(CAMERAS[:2])
                ts = datetime.combine(d, time(hour, random.randint(0, 59)))

                db.session.add(CustomerData(
                    user_id=user_id,
                    timestamp=ts,
                    location='Giriş',
                    customers_inside=max(0, entered - exited),
                    male_count=male_count,
                    female_count=female_count,
                    age_18_30=age_18_30,
                    age_30_50=age_30_50,
                    age_50_plus=age_50_plus,
                    zone_visited=random.choices(ZONES, weights=ZONE_WEIGHTS, k=1)[0],
                    purchase_amount=round(random.uniform(50, 500) * (entered / 100), 2),
                    is_returning=random.random() < 0.25,
                    satisfaction_score=random.randint(3, 5),
                    camera_id=cam,
                    entered=entered,
                    exited=exited,
                ))
                total_records['customer'] += 1

                # Queue data - her saat, her kasa
                for cashier in CASHIERS:
                    customers_at_cashier = max(1, int(entered * random.uniform(0.08, 0.18)))
                    base_wait = 55 if hour in [15, 17, 18] else 35
                    avg_wait = base_wait + random.uniform(-12, 30)
                    queue_ts = datetime.combine(d, time(hour, random.randint(0, 59)))
                    db.session.add(QueueData(
                        user_id=user_id,
                        customer_id=f'Q-{d.strftime("%m%d")}-{hour:02d}-{cashier}',
                        enter_time=queue_ts,
                        exit_time=queue_ts + timedelta(seconds=avg_wait),
                        wait_time=round(avg_wait, 1),
                        queue_position=random.randint(1, 10),
                        cashier_id=cashier,
                        status='completed',
                        total_customers=customers_at_cashier,
                        recorded_at=queue_ts,
                    ))
                    total_records['queue'] += 1

                # Heatmap data - her saat, her bölge
                for zone_idx, zone in enumerate(ZONES):
                    weight = ZONE_WEIGHTS[zone_idx]
                    visitors_in_zone = max(1, int(entered * weight * random.uniform(0.6, 1.4)))
                    base_dwell = 200 if zone in ['Kozmetik', 'Kadın Giyim'] else 130
                    dwell_time = base_dwell + random.uniform(-45, 90)
                    heat_ts = datetime.combine(d, time(hour, 30))
                    db.session.add(HeatmapData(
                        user_id=user_id,
                        zone=zone,
                        intensity=round(dwell_time, 1),
                        visitor_count=visitors_in_zone,
                        heatmap_type='iç',
                        camera_id=CAMERAS[min(zone_idx, len(CAMERAS) - 1)],
                        date_recorded=d,
                        recorded_at=heat_ts,
                    ))
                    total_records['heatmap'] += 1

            # Her 500 kayıtta bir commit (performans)
            if days_ago % 5 == 0:
                db.session.commit()

            if days_ago % 10 == 0 or days_ago <= 1:
                print(f"📅 {label} ({d}) → {day_entered} giriş, {day_exited} çıkış  [x{scale:.2f}]")

        # Staff data
        for staff in STAFF_LIST:
            activity = round(random.uniform(0.55, 0.98), 2)
            statuses = ['active', 'active', 'active', 'break', 'active']
            db.session.add(StaffData(
                user_id=user_id,
                staff_id=staff['staff_id'],
                name=staff['name'],
                role=staff['role'],
                location=staff['location'],
                activity_level=activity,
                status=random.choice(statuses),
            ))
        print(f"\n👥 {len(STAFF_LIST)} personel kaydı oluşturuldu")

        db.session.commit()
        print("\n✅ Tüm veriler başarıyla yüklendi!")

        print(f"\n📊 ÖZET (30 günlük):")
        print(f"   CustomerData : {total_records['customer']} kayıt")
        print(f"   QueueData    : {total_records['queue']} kayıt")
        print(f"   HeatmapData  : {total_records['heatmap']} kayıt")
        print(f"   StaffData    : {len(STAFF_LIST)} kayıt")
        print(f"\n🔑 Giriş bilgileri:")
        print(f"   Admin:  admin / admin")
        print(f"   Mağaza: boyner / boyner123")


if __name__ == '__main__':
    seed_all()
