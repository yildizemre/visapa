import sqlite3

DB = '/var/www/vislivis/backend/instance/vislivis.db'
conn = sqlite3.connect(DB)
cur = conn.cursor()

print("=== MEVCUT DURUM (19:xx) ===")
cur.execute("SELECT COUNT(*) FROM customer_data WHERE timestamp >= '2026-06-16 19' AND timestamp < '2026-06-16 20'")
print(f"customer 19:xx: {cur.fetchone()[0]}")
cur.execute("SELECT COUNT(*) FROM heatmap_data WHERE recorded_at >= '2026-06-16 19' AND recorded_at < '2026-06-16 20'")
print(f"heatmap 19:xx: {cur.fetchone()[0]}")
cur.execute("SELECT COUNT(*) FROM queue_data WHERE recorded_at >= '2026-06-16 19' AND recorded_at < '2026-06-16 20'")
print(f"queue 19:xx: {cur.fetchone()[0]}")

# ============================================================
# CUSTOMER DATA - saat 19:00 (4 kamera)
# Log: 20:00'de atilan rapor, Periyot=2026-06-16T19:00+03:00
# ============================================================
cur.execute("DELETE FROM customer_data WHERE user_id=4 AND timestamp >= '2026-06-16 19' AND timestamp < '2026-06-16 20'")
print(f"\nTemizlendi: customer 19:xx")

customer_rows = [
    ('2026-06-16 19:00:00', 'cam1', 15, 13),
    ('2026-06-16 19:00:00', 'cam2', 22, 27),
    ('2026-06-16 19:00:00', 'cam6', 8,  7),
    ('2026-06-16 19:00:00', 'cam7', 17, 32),
]
c_ok = 0
for ts, cam, entered, exited in customer_rows:
    try:
        cur.execute(
            "INSERT INTO customer_data (user_id, timestamp, camera_id, entered, exited) VALUES (4,?,?,?,?)",
            (ts, cam, entered, exited)
        )
        c_ok += 1
    except Exception as e:
        print(f"  Customer hata ({cam} {ts}): {e}")
print(f"Customer 19:xx eklendi: {c_ok} kayit")

# ============================================================
# HEATMAP DATA - saat 19:00 (5 kamera)
# Log: 20:00'de atilan rapor, Saat=2026-06-16 19:00:00
# ============================================================
cur.execute("DELETE FROM heatmap_data WHERE user_id=4 AND recorded_at >= '2026-06-16 19' AND recorded_at < '2026-06-16 20'")
print(f"\nTemizlendi: heatmap 19:xx")

heatmap_rows = [
    # cam8 - Erkek Reyon: Zone1=0,0.0s | Zone2=1,1736.3s
    ('2026-06-16 19:00:00', 'Giyim-1-Erkek-Reyon-Alan-1', 0,    0.0, 'cam8'),
    ('2026-06-16 19:00:00', 'Giyim-1-Erkek-Reyon-Alan-2', 1, 1736.3, 'cam8'),
    # cam9 - Kadin Reyon 1: Zone1=0 | Zone2=0 | Zone3=0
    ('2026-06-16 19:00:00', 'Giyim-1-Kadın-Reyon-1-Alan-1', 0,   0.0, 'cam9'),
    ('2026-06-16 19:00:00', 'Giyim-1-Kadın-Reyon-1-Alan-2', 0,   0.0, 'cam9'),
    ('2026-06-16 19:00:00', 'Giyim-1-Kadın-Reyon-1-Alan-3', 0,   0.0, 'cam9'),
    # cam10 - Kadin Reyon 2: Zone1=0 | Zone2=1,237.3s
    ('2026-06-16 19:00:00', 'Giyim-1-Kadın-Reyon-2-Alan-1', 0,   0.0, 'cam10'),
    ('2026-06-16 19:00:00', 'Giyim-1-Kadın-Reyon-2-Alan-2', 1, 237.3, 'cam10'),
    # cam3 - Elit Diamond: Zone1=2,666.3s
    ('2026-06-16 19:00:00', 'Giriş-Elit-Diamond-Alan-1', 2, 666.3, 'cam3'),
    # cam5 - Zemin Kat: Zone1=0 | Zone2=0 | Zone3=0
    ('2026-06-16 19:00:00', 'Giyim-Zemin-Kat-Alan-1', 0, 0.0, 'cam5'),
    ('2026-06-16 19:00:00', 'Giyim-Zemin-Kat-Alan-2', 0, 0.0, 'cam5'),
    ('2026-06-16 19:00:00', 'Giyim-Zemin-Kat-Alan-3', 0, 0.0, 'cam5'),
]
h_ok = 0
for ts, zone, visitors, dwell, cam in heatmap_rows:
    try:
        cur.execute(
            "INSERT INTO heatmap_data (user_id, zone, visitor_count, intensity, heatmap_type, camera_id, recorded_at, date_recorded) VALUES (4,?,?,?,'density',?,?,?)",
            (zone, visitors, round(dwell,1), cam, ts, '2026-06-16')
        )
        h_ok += 1
    except Exception as e:
        print(f"  Heatmap hata ({zone} {ts}): {e}")
print(f"Heatmap 19:xx eklendi: {h_ok} kayit")

# ============================================================
# QUEUE DATA - saat 19:xx
# 20:00:18'de tamamlanan: id=1770 sure=303s
# ============================================================
cur.execute("DELETE FROM queue_data WHERE user_id=4 AND recorded_at >= '2026-06-16 19' AND recorded_at < '2026-06-16 20'")
print(f"\nTemizlendi: queue 19:xx")

try:
    cur.execute(
        "INSERT INTO queue_data (user_id, cashier_id, wait_time, status, recorded_at) VALUES (4,'Kasa-Alan-1',303,'completed','2026-06-16 19:00:18')",
    )
    print("Queue 19:xx eklendi: 1 kayit")
except Exception as e:
    print(f"  Queue hata: {e}")

conn.commit()

print("\n=== SON DURUM DOGRULAMA ===")
cur.execute("SELECT substr(timestamp,1,13), camera_id, entered, exited FROM customer_data WHERE user_id=4 AND timestamp >= '2026-06-16' ORDER BY timestamp")
print("Customer 16.06 saatlik:")
prev = None
for r in cur.fetchall():
    saat = r[0]
    if saat != prev:
        print(f"  {saat}:")
        prev = saat
    print(f"    {r[1]}: g={r[2]} c={r[3]}")

cur.execute("SELECT substr(recorded_at,1,13), COUNT(*) FROM heatmap_data WHERE user_id=4 AND recorded_at >= '2026-06-16' GROUP BY substr(recorded_at,1,13) ORDER BY recorded_at")
print("\nHeatmap 16.06 saatlik:")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1]} zone")

cur.execute("SELECT recorded_at, cashier_id, wait_time FROM queue_data WHERE user_id=4 AND recorded_at >= '2026-06-16' ORDER BY recorded_at")
print("\nQueue 16.06:")
for r in cur.fetchall():
    print(f"  {r[0]} | {r[1]} | {r[2]}s")

conn.close()
print("\nTAMAM")
