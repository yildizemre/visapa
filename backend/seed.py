import os
import sys
import random
from datetime import datetime, date, timedelta

# Flask backend klasörünü path'e ekle
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from models import db, User, CustomerData, QueueData, HeatmapData, CameraConfig, SiteConfig, ServiceHeartbeat

app = create_app()

def seed_database():
    with app.app_context():
        print("Veritabanı sıfırlanıyor ve tablolar oluşturuluyor...")
        db.drop_all()
        db.create_all()

        print("Kullanıcılar oluşturuluyor...")
        
        # 1. Admin Kullanıcısı
        admin = User(
            username="admin",
            email="admin@vislivis.com",
            role="admin",
            full_name="Sistem Yöneticisi"
        )
        admin.set_password("admin")
        db.session.add(admin)

        # 2. Demo Mağaza Kullanıcısı (Gallery Crystal)
        store = User(
            username="gallery_crystal",
            email="crystal@vislivis.com",
            role="user",
            full_name="Gallery Crystal"
        )
        store.set_password("crystal")
        db.session.add(store)
        
        db.session.commit()
        
        # Mağaza ID'si
        store_id = store.id
        print(f"Demo Mağaza oluşturuldu! ID: {store_id}")

        # 3. Site ve Kamera Konfigürasyonları
        print("Site ve Kamera Ayarları ekleniyor...")
        site_config = SiteConfig(
            user_id=store_id,
            site_name="Gallery Crystal Merkez"
        )
        db.session.add(site_config)

        cameras = [
            CameraConfig(user_id=store_id, name="Ana Giriş Kamerası", camera_type="Kişi Sayım", rtsp_url="rtsp://127.0.0.1/live1", sort_order=1),
            CameraConfig(user_id=store_id, name="Kasa Önü Kamerası", camera_type="Kasa Analizi", rtsp_url="rtsp://127.0.0.1/live2", sort_order=2),
            CameraConfig(user_id=store_id, name="Ana Koridor Kamerası", camera_type="Isı Haritası", rtsp_url="rtsp://127.0.0.1/live3", sort_order=3),
            CameraConfig(user_id=store_id, name="Vitrin Kamerası", camera_type="Kişi Sayım", rtsp_url="rtsp://127.0.0.1/live4", sort_order=4),
        ]
        for cam in cameras:
            db.session.add(cam)

        # 4. Service Heartbeat (Servis Sağlığı)
        print("Mağaza AI servis sağlığı ekleniyor...")
        heartbeat = ServiceHeartbeat(
            user_id=store_id,
            last_ping_at=datetime.utcnow(),
            expected_pings=6,
            received_pings=6,
            window_start=datetime.utcnow() - timedelta(minutes=30)
        )
        db.session.add(heartbeat)
        db.session.commit()

        # 5. Aylık Mock Veri Oluşturma (Son 45 Gün, her gün için 10:00 - 22:00 arası)
        print("Son 45 günlük yoğun, gerçekçi analiz verileri üretiliyor...")
        
        today = date.today() + timedelta(days=15)
        zones = ["Erkek Reyonu", "Kadın Reyonu", "Kasa Bölgesi", "Vitrin", "Çocuk Dünyası"]
        cashiers = ["Kasa-1", "Kasa-2", "Kasa-3"]
        
        # Her gün için döngü
        for day_offset in range(45):
            current_date = today - timedelta(days=day_offset)
            print(f"Veri üretiliyor: {current_date}")
            
            # Her saat için (10:00 - 22:00 arası mağaza açık)
            for hour in range(10, 23):
                # Saatlik bazda bir baz ziyaretçi yoğunluğu tanımla (Öğle ve akşam saatleri daha yoğun)
                base_density = 1.0
                if hour in [12, 13, 14]: # Öğle arası
                    base_density = 1.5
                elif hour in [18, 19, 20]: # İş çıkışı / akşam yoğunluğu
                    base_density = 2.0
                elif hour in [10, 11]: # Sabah sakinliği
                    base_density = 0.5
                elif hour in [21, 22]: # Kapanışa doğru sakinlik
                    base_density = 0.6
                
                # Ziyaretçi sayıları (rastgele ama yoğunluğa bağlı)
                entered = int(random.randint(15, 45) * base_density)
                exited = int(entered * random.uniform(0.85, 1.15))
                if hour == 22: # Kapanışta herkes çıkar
                    exited = max(exited, entered + random.randint(5, 15))
                
                # Cinsiyet dağılımı
                male = int(entered * random.uniform(0.4, 0.6))
                female = entered - male
                
                # Yaş dağılımı
                age18 = int(entered * random.uniform(0.3, 0.5))
                age30 = int(entered * random.uniform(0.3, 0.5))
                age50 = entered - age18 - age30
                if age50 < 0:
                    age30 += age50
                    age50 = 0
                
                # Saatlik Timestamp
                dt = datetime.combine(current_date, datetime.min.time()) + timedelta(hours=hour)
                
                # A. Müşteri Akış Verileri (CustomerData)
                # Not: DB'ye kaydederken UTC olarak kaydedilir
                customer_row = CustomerData(
                    user_id=store_id,
                    timestamp=dt,
                    location="Giriş",
                    customers_inside=random.randint(10, 50),
                    male_count=male,
                    female_count=female,
                    age_18_30=age18,
                    age_30_50=age30,
                    age_50_plus=age50,
                    purchase_amount=random.uniform(500, 3500) if random.random() > 0.4 else 0,
                    is_returning=random.random() > 0.7,
                    satisfaction_score=random.randint(3, 5),
                    camera_id="Cam 1 (Giriş)",
                    entered=entered,
                    exited=exited
                )
                db.session.add(customer_row)
                
                # B. Kasa Sıra Verileri (QueueData)
                for cashier in cashiers:
                    # Kasa bazlı müşteri sayısı
                    q_customers = int(random.randint(3, 15) * base_density)
                    for c_idx in range(q_customers):
                        wait_time = random.uniform(20, 180) * base_density
                        # Giriş ve çıkış zamanları
                        enter_t = dt + timedelta(minutes=random.randint(1, 55))
                        exit_t = enter_t + timedelta(seconds=int(wait_time))
                        
                        queue_row = QueueData(
                            user_id=store_id,
                            customer_id=f"CUST-{current_date.strftime('%y%m%d')}-{hour}-{cashier}-{c_idx}",
                            enter_time=enter_t,
                            exit_time=exit_t,
                            wait_time=wait_time,
                            queue_position=random.randint(1, 4),
                            cashier_id=cashier,
                            status="completed",
                            total_customers=1,
                            recorded_at=enter_t
                        )
                        db.session.add(queue_row)
                
                # C. Isı Haritası Verileri (HeatmapData)
                for zone in zones:
                    zone_visitors = int(random.randint(10, 35) * base_density)
                    # Bölgelere göre farklı ortalama kalma süreleri (sn)
                    avg_dwell = random.uniform(40, 240)
                    if zone == "Kasa Bölgesi":
                        avg_dwell = random.uniform(80, 300) # Kasalarda bekleme fazla
                    elif zone == "Vitrin":
                        avg_dwell = random.uniform(15, 60) # Vitrin önünde kalma az
                    
                    heatmap_row = HeatmapData(
                        user_id=store_id,
                        zone=zone,
                        intensity=avg_dwell, # Kalma süresi yoğunluk olarak kullanılıyor
                        visitor_count=zone_visitors,
                        heatmap_type="iç",
                        camera_id="Cam 3 (Isı Haritası)",
                        date_recorded=current_date,
                        recorded_at=dt
                    )
                    db.session.add(heatmap_row)

        print("Değişiklikler kaydediliyor...")
        db.session.commit()
        print("Tebrikler! Veritabanı başarıyla sıfırlandı ve 7 günlük full demo veri ile dolduruldu.")

if __name__ == "__main__":
    seed_database()
