"""
Admin kullanıcısı için bugünün tarihine dummy data ekler
Her sayfa için veri ekler: Dashboard, Customer Analytics, Heatmaps, Queue Analysis, Staff Management
"""
from datetime import datetime, timedelta
from app import create_app, db
from models import User, CustomerData, HeatmapData, QueueData, StaffData

app = create_app()

def add_dummy_data():
    with app.app_context():
        # Admin kullanıcısını bul
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            print("Admin kullanıcısı bulunamadı!")
            return
        
        admin_id = admin.id
        today = datetime.now().date()
        today_start = datetime.combine(today, datetime.min.time())
        
        print(f"Admin ID: {admin_id}")
        print(f"Bugünün tarihi: {today}")
        print("Dummy data ekleniyor...")
        
        # Bugünün verilerini temizle (opsiyonel - yorum satırından çıkarabilirsiniz)
        # CustomerData.query.filter_by(user_id=admin_id).filter(CustomerData.timestamp >= today_start).delete()
        # HeatmapData.query.filter_by(user_id=admin_id).filter(HeatmapData.date_recorded == today).delete()
        # QueueData.query.filter_by(user_id=admin_id).filter(QueueData.recorded_at >= today_start).delete()
        # StaffData.query.filter_by(user_id=admin_id).delete()
        # db.session.commit()
        
        # 1. CUSTOMER DATA (Dashboard ve Customer Analytics için)
        print("\n1. Customer Data ekleniyor...")
        cameras = ['Kamera-1', 'Kamera-2', 'Kamera-3']
        zones = ['Giriş', 'Erkek Giyim', 'Kadın Giyim', 'Çocuk', 'Ayakkabı', 'Aksesuar']
        
        # Her saat için veri ekle (10:00 - 22:00 arası)
        for hour in range(10, 23):
            for camera in cameras:
                timestamp = today_start.replace(hour=hour, minute=30)
                
                # Giriş verisi
                customer_data = CustomerData(
                    user_id=admin_id,
                    timestamp=timestamp,
                    location=zones[0],
                    customers_inside=50 + (hour - 10) * 5,
                    male_count=20 + (hour - 10) * 2,
                    female_count=30 + (hour - 10) * 3,
                    age_18_30=25 + (hour - 10) * 2,
                    age_30_50=20 + (hour - 10) * 2,
                    age_50_plus=5 + (hour - 10),
                    zone_visited=zones[hour % len(zones)],
                    purchase_amount=150.0 + (hour - 10) * 10,
                    is_returning=(hour % 3 == 0),
                    satisfaction_score=4,
                    camera_id=camera,
                    entered=15 + (hour - 10),
                    exited=10 + (hour - 10)
                )
                db.session.add(customer_data)
        
        # 2. HEATMAP DATA
        print("2. Heatmap Data ekleniyor...")
        heatmap_zones = ['Erkek Giyim', 'Kadın Giyim', 'Çocuk', 'Ayakkabı', 'Aksesuar', 'Giriş']
        
        for hour in range(10, 23):
            for zone in heatmap_zones:
                recorded_at = today_start.replace(hour=hour, minute=0)
                
                heatmap_data = HeatmapData(
                    user_id=admin_id,
                    zone=zone,
                    intensity=120.0 + (hour - 10) * 5,  # Bekleme süresi (saniye)
                    visitor_count=10 + (hour - 10) + (hash(zone) % 10),
                    camera_id=f'Kamera-{(hash(zone) % 3) + 1}',
                    date_recorded=today,
                    recorded_at=recorded_at
                )
                db.session.add(heatmap_data)
        
        # 3. QUEUE DATA
        print("3. Queue Data ekleniyor...")
        cashiers = ['Kasa-1', 'Kasa-2', 'Kasa-3', 'Kasa-4']
        
        for hour in range(10, 23):
            for cashier in cashiers:
                enter_time = today_start.replace(hour=hour, minute=0)
                exit_time = enter_time + timedelta(minutes=5 + (hash(cashier) % 10))
                wait_time = 180.0 + (hour - 10) * 10 + (hash(cashier) % 60)  # Bekleme süresi (saniye)
                
                queue_data = QueueData(
                    user_id=admin_id,
                    customer_id=f'CUST-{hour}-{hash(cashier) % 1000}',
                    enter_time=enter_time,
                    exit_time=exit_time,
                    wait_time=wait_time,
                    queue_position=1 + (hash(cashier) % 5),
                    cashier_id=cashier,
                    status='completed',
                    total_customers=5 + (hour - 10) + (hash(cashier) % 10),
                    recorded_at=enter_time
                )
                db.session.add(queue_data)
        
        # 4. STAFF DATA
        print("4. Staff Data ekleniyor...")
        staff_members = [
            {'id': 'STF001', 'name': 'Ahmet Yılmaz', 'role': 'Satış Danışmanı', 'location': 'Erkek Giyim'},
            {'id': 'STF002', 'name': 'Ayşe Demir', 'role': 'Satış Danışmanı', 'location': 'Kadın Giyim'},
            {'id': 'STF003', 'name': 'Mehmet Kaya', 'role': 'Kasa Görevlisi', 'location': 'Kasa-1'},
            {'id': 'STF004', 'name': 'Fatma Şahin', 'role': 'Kasa Görevlisi', 'location': 'Kasa-2'},
            {'id': 'STF005', 'name': 'Ali Çelik', 'role': 'Mağaza Müdürü', 'location': 'Ofis'},
        ]
        
        for staff in staff_members:
            for hour in range(10, 23):
                staff_data = StaffData(
                    user_id=admin_id,
                    staff_id=staff['id'],
                    name=staff['name'],
                    role=staff['role'],
                    location=staff['location'],
                    activity_level=0.7 + (hour - 10) * 0.02 + (hash(staff['id']) % 20) / 100,
                    status='active' if hour < 20 else 'inactive',
                    created_at=today_start.replace(hour=hour, minute=0)
                )
                db.session.add(staff_data)
        
        # Commit tüm değişiklikler
        try:
            db.session.commit()
            print("\n[OK] Tum dummy data basariyla eklendi!")
            print(f"   - Customer Data: {len(cameras) * 13} kayit")
            print(f"   - Heatmap Data: {len(heatmap_zones) * 13} kayit")
            print(f"   - Queue Data: {len(cashiers) * 13} kayit")
            print(f"   - Staff Data: {len(staff_members) * 13} kayit")
        except Exception as e:
            db.session.rollback()
            print(f"\n[HATA] {e}")

if __name__ == '__main__':
    add_dummy_data()
