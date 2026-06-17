import sqlite3

DB = r'c:\Users\kasim\OneDrive\Masaüstü\Vislivis-Panel\visapa-main\server_db\vislivis_live.db'

# ============================================================
# EMİLİO LARA (user_id=4) - customer_data
# 4 kamera: cam1, cam2, cam6, cam7
# Her kamera için 10:00-20:00 arası (10 saat), her biri ayrı kayıt
# ============================================================
emilio_counter = [
    # (saat, cam, entered, exited)
    # cam1
    ('2026-06-15 10:00:00', 'cam1', 3, 1),
    ('2026-06-15 11:00:00', 'cam1', 16, 7),
    ('2026-06-15 12:00:00', 'cam1', 25, 22),
    ('2026-06-15 13:00:00', 'cam1', 24, 25),
    ('2026-06-15 14:00:00', 'cam1', 15, 14),
    ('2026-06-15 15:00:00', 'cam1', 24, 23),
    ('2026-06-15 16:00:00', 'cam1', 16, 9),
    ('2026-06-15 17:00:00', 'cam1', 33, 27),
    ('2026-06-15 18:00:00', 'cam1', 28, 23),
    ('2026-06-15 19:00:00', 'cam1', 36, 32),
    ('2026-06-15 20:00:00', 'cam1', 0, 0),
    # cam2
    ('2026-06-15 10:00:00', 'cam2', 7, 10),
    ('2026-06-15 11:00:00', 'cam2', 16, 12),
    ('2026-06-15 12:00:00', 'cam2', 16, 18),
    ('2026-06-15 13:00:00', 'cam2', 22, 32),
    ('2026-06-15 14:00:00', 'cam2', 34, 32),
    ('2026-06-15 15:00:00', 'cam2', 45, 32),
    ('2026-06-15 16:00:00', 'cam2', 42, 53),
    ('2026-06-15 17:00:00', 'cam2', 41, 42),
    ('2026-06-15 18:00:00', 'cam2', 31, 42),
    ('2026-06-15 19:00:00', 'cam2', 23, 36),
    ('2026-06-15 20:00:00', 'cam2', 11, 36),
    # cam6
    ('2026-06-15 10:00:00', 'cam6', 1, 1),
    ('2026-06-15 11:00:00', 'cam6', 4, 4),
    ('2026-06-15 12:00:00', 'cam6', 4, 4),
    ('2026-06-15 13:00:00', 'cam6', 5, 1),
    ('2026-06-15 14:00:00', 'cam6', 1, 3),
    ('2026-06-15 15:00:00', 'cam6', 4, 4),
    ('2026-06-15 16:00:00', 'cam6', 10, 11),
    ('2026-06-15 17:00:00', 'cam6', 2, 5),
    ('2026-06-15 18:00:00', 'cam6', 13, 8),
    ('2026-06-15 19:00:00', 'cam6', 7, 8),
    ('2026-06-15 20:00:00', 'cam6', 2, 2),
    # cam7
    ('2026-06-15 10:00:00', 'cam7', 7, 9),
    ('2026-06-15 11:00:00', 'cam7', 23, 14),
    ('2026-06-15 12:00:00', 'cam7', 21, 25),
    ('2026-06-15 13:00:00', 'cam7', 9, 23),
    ('2026-06-15 14:00:00', 'cam7', 21, 23),
    ('2026-06-15 15:00:00', 'cam7', 36, 36),
    ('2026-06-15 16:00:00', 'cam7', 21, 28),
    ('2026-06-15 17:00:00', 'cam7', 25, 28),
    ('2026-06-15 18:00:00', 'cam7', 20, 35),
    ('2026-06-15 19:00:00', 'cam7', 21, 25),
    ('2026-06-15 20:00:00', 'cam7', 3, 10),
]

# ============================================================
# ATÖLYE GÖZLÜK (user_id=5) - customer_data
# 1 kamera: cam2, 10:00-21:00
# ============================================================
atolye_counter = [
    ('2026-06-15 10:00:00', 'cam2', 13, 13),
    ('2026-06-15 11:00:00', 'cam2', 20, 17),
    ('2026-06-15 12:00:00', 'cam2', 33, 33),
    ('2026-06-15 13:00:00', 'cam2', 30, 32),
    ('2026-06-15 14:00:00', 'cam2', 35, 28),
    ('2026-06-15 15:00:00', 'cam2', 33, 42),
    ('2026-06-15 16:00:00', 'cam2', 32, 29),
    ('2026-06-15 17:00:00', 'cam2', 38, 39),
    ('2026-06-15 18:00:00', 'cam2', 24, 26),
    ('2026-06-15 19:00:00', 'cam2', 20, 21),
    ('2026-06-15 20:00:00', 'cam2', 21, 19),
    ('2026-06-15 21:00:00', 'cam2', 30, 29),
]

# ============================================================
# ATÖLYE GÖZLÜK (user_id=5) - heatmap_data
# Density: Giyim-Alanlar zoneleri (Alan-1,2,3,4)
# ============================================================
# heatmap_data kolonları: id, user_id, zone_name, visitors, dwell_time, timestamp, camera_id
atolye_heatmap = [
    # saat 10:00
    ('2026-06-15 10:00:00', 'Giyim-Alanlar-Alan-1', 0, 0.0, 'cam1'),
    ('2026-06-15 10:00:00', 'Giyim-Alanlar-Alan-2', 0, 0.0, 'cam1'),
    ('2026-06-15 10:00:00', 'Giyim-Alanlar-Alan-3', 2, 80.0, 'cam1'),
    ('2026-06-15 10:00:00', 'Giyim-Alanlar-Alan-4', 0, 0.0, 'cam1'),
    # saat 11:00
    ('2026-06-15 11:00:00', 'Giyim-Alanlar-Alan-1', 0, 0.0, 'cam1'),
    ('2026-06-15 11:00:00', 'Giyim-Alanlar-Alan-2', 4, 97.0, 'cam1'),
    ('2026-06-15 11:00:00', 'Giyim-Alanlar-Alan-3', 6, 90.9, 'cam1'),
    ('2026-06-15 11:00:00', 'Giyim-Alanlar-Alan-4', 2, 46.4, 'cam1'),
    # saat 12:00
    ('2026-06-15 12:00:00', 'Giyim-Alanlar-Alan-1', 4, 83.3, 'cam1'),
    ('2026-06-15 12:00:00', 'Giyim-Alanlar-Alan-2', 1, 80.1, 'cam1'),
    ('2026-06-15 12:00:00', 'Giyim-Alanlar-Alan-3', 31, 86.2, 'cam1'),
    ('2026-06-15 12:00:00', 'Giyim-Alanlar-Alan-4', 9, 54.8, 'cam1'),
    # saat 13:00
    ('2026-06-15 13:00:00', 'Giyim-Alanlar-Alan-1', 1, 42.9, 'cam1'),
    ('2026-06-15 13:00:00', 'Giyim-Alanlar-Alan-2', 2, 106.7, 'cam1'),
    ('2026-06-15 13:00:00', 'Giyim-Alanlar-Alan-3', 1, 49.9, 'cam1'),
    ('2026-06-15 13:00:00', 'Giyim-Alanlar-Alan-4', 25, 78.9, 'cam1'),
    # saat 14:00
    ('2026-06-15 14:00:00', 'Giyim-Alanlar-Alan-1', 2, 91.4, 'cam1'),
    ('2026-06-15 14:00:00', 'Giyim-Alanlar-Alan-2', 0, 0.0, 'cam1'),
    ('2026-06-15 14:00:00', 'Giyim-Alanlar-Alan-3', 9, 218.2, 'cam1'),
    ('2026-06-15 14:00:00', 'Giyim-Alanlar-Alan-4', 0, 0.0, 'cam1'),
    # saat 15:00
    ('2026-06-15 15:00:00', 'Giyim-Alanlar-Alan-1', 2, 55.3, 'cam1'),
    ('2026-06-15 15:00:00', 'Giyim-Alanlar-Alan-2', 5, 127.8, 'cam1'),
    ('2026-06-15 15:00:00', 'Giyim-Alanlar-Alan-3', 12, 65.2, 'cam1'),
    ('2026-06-15 15:00:00', 'Giyim-Alanlar-Alan-4', 6, 66.6, 'cam1'),
    # saat 16:00
    ('2026-06-15 16:00:00', 'Giyim-Alanlar-Alan-1', 5, 100.8, 'cam1'),
    ('2026-06-15 16:00:00', 'Giyim-Alanlar-Alan-2', 0, 0.0, 'cam1'),
    ('2026-06-15 16:00:00', 'Giyim-Alanlar-Alan-3', 5, 68.0, 'cam1'),
    ('2026-06-15 16:00:00', 'Giyim-Alanlar-Alan-4', 9, 81.3, 'cam1'),
    # saat 17:00
    ('2026-06-15 17:00:00', 'Giyim-Alanlar-Alan-1', 0, 0.0, 'cam1'),
    ('2026-06-15 17:00:00', 'Giyim-Alanlar-Alan-2', 6, 102.1, 'cam1'),
    ('2026-06-15 17:00:00', 'Giyim-Alanlar-Alan-3', 6, 80.2, 'cam1'),
    ('2026-06-15 17:00:00', 'Giyim-Alanlar-Alan-4', 16, 83.3, 'cam1'),
    # saat 18:00
    ('2026-06-15 18:00:00', 'Giyim-Alanlar-Alan-1', 1, 87.3, 'cam1'),
    ('2026-06-15 18:00:00', 'Giyim-Alanlar-Alan-2', 1, 151.5, 'cam1'),
    ('2026-06-15 18:00:00', 'Giyim-Alanlar-Alan-3', 7, 98.0, 'cam1'),
    ('2026-06-15 18:00:00', 'Giyim-Alanlar-Alan-4', 3, 88.1, 'cam1'),
    # saat 19:00
    ('2026-06-15 19:00:00', 'Giyim-Alanlar-Alan-1', 1, 47.5, 'cam1'),
    ('2026-06-15 19:00:00', 'Giyim-Alanlar-Alan-2', 0, 0.0, 'cam1'),
    ('2026-06-15 19:00:00', 'Giyim-Alanlar-Alan-3', 5, 56.2, 'cam1'),
    ('2026-06-15 19:00:00', 'Giyim-Alanlar-Alan-4', 7, 70.6, 'cam1'),
    # saat 20:00
    ('2026-06-15 20:00:00', 'Giyim-Alanlar-Alan-1', 2, 91.1, 'cam1'),
    ('2026-06-15 20:00:00', 'Giyim-Alanlar-Alan-2', 1, 47.7, 'cam1'),
    ('2026-06-15 20:00:00', 'Giyim-Alanlar-Alan-3', 17, 115.1, 'cam1'),
    ('2026-06-15 20:00:00', 'Giyim-Alanlar-Alan-4', 15, 55.4, 'cam1'),
    # saat 21:00
    ('2026-06-15 21:00:00', 'Giyim-Alanlar-Alan-1', 0, 0.0, 'cam1'),
    ('2026-06-15 21:00:00', 'Giyim-Alanlar-Alan-2', 2, 56.7, 'cam1'),
    ('2026-06-15 21:00:00', 'Giyim-Alanlar-Alan-3', 11, 95.1, 'cam1'),
    ('2026-06-15 21:00:00', 'Giyim-Alanlar-Alan-4', 8, 50.5, 'cam1'),
]

conn = sqlite3.connect(DB)
cur = conn.cursor()

# Önce mevcut 15.06 verilerini temizle (duplicate olmasın)
cur.execute("DELETE FROM customer_data WHERE user_id=4 AND timestamp >= '2026-06-15'")
cur.execute("DELETE FROM customer_data WHERE user_id=5 AND timestamp >= '2026-06-15'")
print(f"Temizlendi: Emilio + Atolye 15.06 customer_data")

# Emilio Lara customer_data ekle
for ts, cam, entered, exited in emilio_counter:
    cur.execute("""
        INSERT INTO customer_data
        (user_id, timestamp, camera_id, entered, exited, customers_inside,
         male_count, female_count, age_18_30, age_30_50, age_50_plus,
         purchase_amount, is_returning)
        VALUES (4, ?, ?, ?, ?, 0, 0, 0, 0, 0, 0, 0, 0)
    """, (ts, cam, entered, exited))

print(f"Emilio Lara: {len(emilio_counter)} kayit eklendi")

# Atölye Gözlük customer_data ekle
for ts, cam, entered, exited in atolye_counter:
    cur.execute("""
        INSERT INTO customer_data
        (user_id, timestamp, camera_id, entered, exited, customers_inside,
         male_count, female_count, age_18_30, age_30_50, age_50_plus,
         purchase_amount, is_returning)
        VALUES (5, ?, ?, ?, ?, 0, 0, 0, 0, 0, 0, 0, 0)
    """, (ts, cam, entered, exited))

print(f"Atolye Gozluk: {len(atolye_counter)} kayit eklendi")

# Heatmap için tablo kolonlarını kontrol et
cur.execute("PRAGMA table_info(heatmap_data)")
cols = [r[1] for r in cur.fetchall()]
print(f"heatmap_data kolonlari: {cols}")

print(f"heatmap_data kolonlari: {cols}")

# Gercek kolonlara gore insert
# kolonlar: id, user_id, zone, intensity, visitor_count, heatmap_type, camera_id, date_recorded, recorded_at, created_at
cur.execute("DELETE FROM heatmap_data WHERE user_id=5 AND recorded_at >= '2026-06-15'")
print(f"Temizlendi: Atolye heatmap_data 15.06")

heatmap_ok = 0
for ts, zone, visitors, dwell, cam in atolye_heatmap:
    try:
        cur.execute("""
            INSERT INTO heatmap_data (user_id, zone, visitor_count, intensity, heatmap_type, camera_id, recorded_at)
            VALUES (5, ?, ?, ?, 'density', ?, ?)
        """, (zone, visitors, round(dwell, 1), cam, ts))
        heatmap_ok += 1
    except Exception as e:
        print(f"  Heatmap hata ({zone} {ts}): {e}")

print(f"Atolye heatmap: {heatmap_ok} kayit eklendi")

conn.commit()
conn.close()

# Doğrulama
conn2 = sqlite3.connect(DB)
cur2 = conn2.cursor()
cur2.execute("SELECT user_id, COUNT(*) FROM customer_data WHERE timestamp >= '2026-06-15' GROUP BY user_id")
print("\n=== DOGRULAMA ===")
for uid, cnt in cur2.fetchall():
    print(f"  user_id={uid}: {cnt} kayit")
conn2.close()
print("TAMAM - DB guncellendi!")
