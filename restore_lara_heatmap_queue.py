import sqlite3

DB = r'c:\Users\kasim\OneDrive\Masaüstü\Vislivis-Panel\visapa-main\server_db\vislivis_live.db'

# ============================================================
# EMILIO LARA (user_id=4) - heatmap_data
# 5 kamera: cam8, cam9, cam10, cam3, cam5
# Saat 10:00 - 20:00 (rapor saati log saatinden 1 saat önce)
# ============================================================

lara_heatmap = [
    # --- cam8 / -1 Erkek Reyon ---
    ('2026-06-15 10:00:00', 'Giyim-1-Erkek-Reyon-Alan-1', 1, 66.3, 'cam8'),
    ('2026-06-15 10:00:00', 'Giyim-1-Erkek-Reyon-Alan-2', 3, 79.1, 'cam8'),
    ('2026-06-15 11:00:00', 'Giyim-1-Erkek-Reyon-Alan-1', 9, 111.9, 'cam8'),
    ('2026-06-15 11:00:00', 'Giyim-1-Erkek-Reyon-Alan-2', 2, 95.7, 'cam8'),
    ('2026-06-15 12:00:00', 'Giyim-1-Erkek-Reyon-Alan-1', 4, 75.8, 'cam8'),
    ('2026-06-15 12:00:00', 'Giyim-1-Erkek-Reyon-Alan-2', 6, 118.7, 'cam8'),
    ('2026-06-15 13:00:00', 'Giyim-1-Erkek-Reyon-Alan-1', 1, 203.3, 'cam8'),
    ('2026-06-15 13:00:00', 'Giyim-1-Erkek-Reyon-Alan-2', 4, 139.1, 'cam8'),
    ('2026-06-15 14:00:00', 'Giyim-1-Erkek-Reyon-Alan-1', 0, 0.0, 'cam8'),
    ('2026-06-15 14:00:00', 'Giyim-1-Erkek-Reyon-Alan-2', 0, 0.0, 'cam8'),
    ('2026-06-15 15:00:00', 'Giyim-1-Erkek-Reyon-Alan-1', 4, 157.1, 'cam8'),
    ('2026-06-15 15:00:00', 'Giyim-1-Erkek-Reyon-Alan-2', 7, 107.8, 'cam8'),
    ('2026-06-15 16:00:00', 'Giyim-1-Erkek-Reyon-Alan-1', 9, 165.1, 'cam8'),
    ('2026-06-15 16:00:00', 'Giyim-1-Erkek-Reyon-Alan-2', 8, 105.5, 'cam8'),
    ('2026-06-15 17:00:00', 'Giyim-1-Erkek-Reyon-Alan-1', 7, 184.4, 'cam8'),
    ('2026-06-15 17:00:00', 'Giyim-1-Erkek-Reyon-Alan-2', 2, 85.2, 'cam8'),
    ('2026-06-15 18:00:00', 'Giyim-1-Erkek-Reyon-Alan-1', 3, 128.9, 'cam8'),
    ('2026-06-15 18:00:00', 'Giyim-1-Erkek-Reyon-Alan-2', 3, 80.5, 'cam8'),
    ('2026-06-15 19:00:00', 'Giyim-1-Erkek-Reyon-Alan-1', 0, 0.0, 'cam8'),
    ('2026-06-15 19:00:00', 'Giyim-1-Erkek-Reyon-Alan-2', 5, 88.3, 'cam8'),
    ('2026-06-15 20:00:00', 'Giyim-1-Erkek-Reyon-Alan-1', 2, 85.8, 'cam8'),
    ('2026-06-15 20:00:00', 'Giyim-1-Erkek-Reyon-Alan-2', 1, 117.6, 'cam8'),
    # --- cam9 / -1 Kadin Reyon 1 ---
    ('2026-06-15 10:00:00', 'Giyim-1-Kadın-Reyon-1-Alan-1', 1, 182.7, 'cam9'),
    ('2026-06-15 10:00:00', 'Giyim-1-Kadın-Reyon-1-Alan-2', 2, 243.7, 'cam9'),
    ('2026-06-15 10:00:00', 'Giyim-1-Kadın-Reyon-1-Alan-3', 1, 236.5, 'cam9'),
    ('2026-06-15 11:00:00', 'Giyim-1-Kadın-Reyon-1-Alan-1', 4, 111.8, 'cam9'),
    ('2026-06-15 11:00:00', 'Giyim-1-Kadın-Reyon-1-Alan-2', 4, 344.2, 'cam9'),
    ('2026-06-15 11:00:00', 'Giyim-1-Kadın-Reyon-1-Alan-3', 3, 342.2, 'cam9'),
    ('2026-06-15 12:00:00', 'Giyim-1-Kadın-Reyon-1-Alan-1', 5, 155.3, 'cam9'),
    ('2026-06-15 12:00:00', 'Giyim-1-Kadın-Reyon-1-Alan-2', 2, 302.5, 'cam9'),
    ('2026-06-15 12:00:00', 'Giyim-1-Kadın-Reyon-1-Alan-3', 3, 182.6, 'cam9'),
    ('2026-06-15 13:00:00', 'Giyim-1-Kadın-Reyon-1-Alan-1', 3, 119.7, 'cam9'),
    ('2026-06-15 13:00:00', 'Giyim-1-Kadın-Reyon-1-Alan-2', 2, 265.6, 'cam9'),
    ('2026-06-15 13:00:00', 'Giyim-1-Kadın-Reyon-1-Alan-3', 5, 111.3, 'cam9'),
    ('2026-06-15 14:00:00', 'Giyim-1-Kadın-Reyon-1-Alan-1', 5, 345.8, 'cam9'),
    ('2026-06-15 14:00:00', 'Giyim-1-Kadın-Reyon-1-Alan-2', 5, 292.7, 'cam9'),
    ('2026-06-15 14:00:00', 'Giyim-1-Kadın-Reyon-1-Alan-3', 1, 350.2, 'cam9'),
    ('2026-06-15 15:00:00', 'Giyim-1-Kadın-Reyon-1-Alan-1', 7, 148.2, 'cam9'),
    ('2026-06-15 15:00:00', 'Giyim-1-Kadın-Reyon-1-Alan-2', 3, 107.0, 'cam9'),
    ('2026-06-15 15:00:00', 'Giyim-1-Kadın-Reyon-1-Alan-3', 3, 126.0, 'cam9'),
    ('2026-06-15 16:00:00', 'Giyim-1-Kadın-Reyon-1-Alan-1', 1, 1041.7, 'cam9'),
    ('2026-06-15 16:00:00', 'Giyim-1-Kadın-Reyon-1-Alan-2', 0, 0.0, 'cam9'),
    ('2026-06-15 16:00:00', 'Giyim-1-Kadın-Reyon-1-Alan-3', 1, 716.8, 'cam9'),
    ('2026-06-15 17:00:00', 'Giyim-1-Kadın-Reyon-1-Alan-1', 4, 441.2, 'cam9'),
    ('2026-06-15 17:00:00', 'Giyim-1-Kadın-Reyon-1-Alan-2', 0, 0.0, 'cam9'),
    ('2026-06-15 17:00:00', 'Giyim-1-Kadın-Reyon-1-Alan-3', 4, 1113.3, 'cam9'),
    ('2026-06-15 18:00:00', 'Giyim-1-Kadın-Reyon-1-Alan-1', 6, 118.7, 'cam9'),
    ('2026-06-15 18:00:00', 'Giyim-1-Kadın-Reyon-1-Alan-2', 5, 332.0, 'cam9'),
    ('2026-06-15 18:00:00', 'Giyim-1-Kadın-Reyon-1-Alan-3', 5, 198.7, 'cam9'),
    ('2026-06-15 19:00:00', 'Giyim-1-Kadın-Reyon-1-Alan-1', 6, 105.2, 'cam9'),
    ('2026-06-15 19:00:00', 'Giyim-1-Kadın-Reyon-1-Alan-2', 1, 254.6, 'cam9'),
    ('2026-06-15 19:00:00', 'Giyim-1-Kadın-Reyon-1-Alan-3', 3, 176.8, 'cam9'),
    ('2026-06-15 20:00:00', 'Giyim-1-Kadın-Reyon-1-Alan-1', 0, 0.0, 'cam9'),
    ('2026-06-15 20:00:00', 'Giyim-1-Kadın-Reyon-1-Alan-2', 0, 0.0, 'cam9'),
    ('2026-06-15 20:00:00', 'Giyim-1-Kadın-Reyon-1-Alan-3', 0, 0.0, 'cam9'),
    # --- cam10 / -1 Kadin Reyon 2 ---
    ('2026-06-15 10:00:00', 'Giyim-1-Kadın-Reyon-2-Alan-1', 0, 0.0, 'cam10'),
    ('2026-06-15 10:00:00', 'Giyim-1-Kadın-Reyon-2-Alan-2', 0, 0.0, 'cam10'),
    ('2026-06-15 11:00:00', 'Giyim-1-Kadın-Reyon-2-Alan-1', 1, 147.8, 'cam10'),
    ('2026-06-15 11:00:00', 'Giyim-1-Kadın-Reyon-2-Alan-2', 0, 0.0, 'cam10'),
    ('2026-06-15 12:00:00', 'Giyim-1-Kadın-Reyon-2-Alan-1', 0, 0.0, 'cam10'),
    ('2026-06-15 12:00:00', 'Giyim-1-Kadın-Reyon-2-Alan-2', 0, 0.0, 'cam10'),
    ('2026-06-15 13:00:00', 'Giyim-1-Kadın-Reyon-2-Alan-1', 0, 0.0, 'cam10'),
    ('2026-06-15 13:00:00', 'Giyim-1-Kadın-Reyon-2-Alan-2', 0, 0.0, 'cam10'),
    ('2026-06-15 14:00:00', 'Giyim-1-Kadın-Reyon-2-Alan-1', 0, 0.0, 'cam10'),
    ('2026-06-15 14:00:00', 'Giyim-1-Kadın-Reyon-2-Alan-2', 3, 114.8, 'cam10'),
    ('2026-06-15 15:00:00', 'Giyim-1-Kadın-Reyon-2-Alan-1', 0, 0.0, 'cam10'),
    ('2026-06-15 15:00:00', 'Giyim-1-Kadın-Reyon-2-Alan-2', 0, 0.0, 'cam10'),
    ('2026-06-15 16:00:00', 'Giyim-1-Kadın-Reyon-2-Alan-1', 0, 0.0, 'cam10'),
    ('2026-06-15 16:00:00', 'Giyim-1-Kadın-Reyon-2-Alan-2', 0, 0.0, 'cam10'),
    ('2026-06-15 17:00:00', 'Giyim-1-Kadın-Reyon-2-Alan-1', 2, 146.2, 'cam10'),
    ('2026-06-15 17:00:00', 'Giyim-1-Kadın-Reyon-2-Alan-2', 3, 163.8, 'cam10'),
    ('2026-06-15 18:00:00', 'Giyim-1-Kadın-Reyon-2-Alan-1', 0, 0.0, 'cam10'),
    ('2026-06-15 18:00:00', 'Giyim-1-Kadın-Reyon-2-Alan-2', 0, 0.0, 'cam10'),
    ('2026-06-15 19:00:00', 'Giyim-1-Kadın-Reyon-2-Alan-1', 0, 0.0, 'cam10'),
    ('2026-06-15 19:00:00', 'Giyim-1-Kadın-Reyon-2-Alan-2', 2, 64.4, 'cam10'),
    ('2026-06-15 20:00:00', 'Giyim-1-Kadın-Reyon-2-Alan-1', 0, 0.0, 'cam10'),
    ('2026-06-15 20:00:00', 'Giyim-1-Kadın-Reyon-2-Alan-2', 0, 0.0, 'cam10'),
    # --- cam3 / Elit Diamond ---
    ('2026-06-15 10:00:00', 'Giriş-Elit-Diamond-Alan-1', 0, 0.0, 'cam3'),
    ('2026-06-15 11:00:00', 'Giriş-Elit-Diamond-Alan-1', 0, 0.0, 'cam3'),
    ('2026-06-15 12:00:00', 'Giriş-Elit-Diamond-Alan-1', 0, 0.0, 'cam3'),
    ('2026-06-15 13:00:00', 'Giriş-Elit-Diamond-Alan-1', 0, 0.0, 'cam3'),
    ('2026-06-15 14:00:00', 'Giriş-Elit-Diamond-Alan-1', 1, 275.1, 'cam3'),
    ('2026-06-15 15:00:00', 'Giriş-Elit-Diamond-Alan-1', 3, 395.6, 'cam3'),
    ('2026-06-15 16:00:00', 'Giriş-Elit-Diamond-Alan-1', 2, 357.5, 'cam3'),
    ('2026-06-15 17:00:00', 'Giriş-Elit-Diamond-Alan-1', 1, 1133.4, 'cam3'),
    ('2026-06-15 18:00:00', 'Giriş-Elit-Diamond-Alan-1', 0, 0.0, 'cam3'),
    ('2026-06-15 19:00:00', 'Giriş-Elit-Diamond-Alan-1', 2, 307.8, 'cam3'),
    ('2026-06-15 20:00:00', 'Giriş-Elit-Diamond-Alan-1', 0, 0.0, 'cam3'),
    # --- cam5 / Zemin Kat (tumu 0) ---
    ('2026-06-15 10:00:00', 'Giyim-Zemin-Kat-Alan-1', 0, 0.0, 'cam5'),
    ('2026-06-15 10:00:00', 'Giyim-Zemin-Kat-Alan-2', 0, 0.0, 'cam5'),
    ('2026-06-15 10:00:00', 'Giyim-Zemin-Kat-Alan-3', 0, 0.0, 'cam5'),
    ('2026-06-15 11:00:00', 'Giyim-Zemin-Kat-Alan-1', 0, 0.0, 'cam5'),
    ('2026-06-15 11:00:00', 'Giyim-Zemin-Kat-Alan-2', 0, 0.0, 'cam5'),
    ('2026-06-15 11:00:00', 'Giyim-Zemin-Kat-Alan-3', 0, 0.0, 'cam5'),
    ('2026-06-15 12:00:00', 'Giyim-Zemin-Kat-Alan-1', 0, 0.0, 'cam5'),
    ('2026-06-15 12:00:00', 'Giyim-Zemin-Kat-Alan-2', 0, 0.0, 'cam5'),
    ('2026-06-15 12:00:00', 'Giyim-Zemin-Kat-Alan-3', 0, 0.0, 'cam5'),
    ('2026-06-15 13:00:00', 'Giyim-Zemin-Kat-Alan-1', 0, 0.0, 'cam5'),
    ('2026-06-15 13:00:00', 'Giyim-Zemin-Kat-Alan-2', 0, 0.0, 'cam5'),
    ('2026-06-15 13:00:00', 'Giyim-Zemin-Kat-Alan-3', 0, 0.0, 'cam5'),
    ('2026-06-15 14:00:00', 'Giyim-Zemin-Kat-Alan-1', 0, 0.0, 'cam5'),
    ('2026-06-15 14:00:00', 'Giyim-Zemin-Kat-Alan-2', 0, 0.0, 'cam5'),
    ('2026-06-15 14:00:00', 'Giyim-Zemin-Kat-Alan-3', 1, 90.8, 'cam5'),
    ('2026-06-15 15:00:00', 'Giyim-Zemin-Kat-Alan-1', 0, 0.0, 'cam5'),
    ('2026-06-15 15:00:00', 'Giyim-Zemin-Kat-Alan-2', 0, 0.0, 'cam5'),
    ('2026-06-15 15:00:00', 'Giyim-Zemin-Kat-Alan-3', 0, 0.0, 'cam5'),
    ('2026-06-15 16:00:00', 'Giyim-Zemin-Kat-Alan-1', 0, 0.0, 'cam5'),
    ('2026-06-15 16:00:00', 'Giyim-Zemin-Kat-Alan-2', 0, 0.0, 'cam5'),
    ('2026-06-15 16:00:00', 'Giyim-Zemin-Kat-Alan-3', 0, 0.0, 'cam5'),
    ('2026-06-15 17:00:00', 'Giyim-Zemin-Kat-Alan-1', 0, 0.0, 'cam5'),
    ('2026-06-15 17:00:00', 'Giyim-Zemin-Kat-Alan-2', 0, 0.0, 'cam5'),
    ('2026-06-15 17:00:00', 'Giyim-Zemin-Kat-Alan-3', 0, 0.0, 'cam5'),
    ('2026-06-15 18:00:00', 'Giyim-Zemin-Kat-Alan-1', 0, 0.0, 'cam5'),
    ('2026-06-15 18:00:00', 'Giyim-Zemin-Kat-Alan-2', 0, 0.0, 'cam5'),
    ('2026-06-15 18:00:00', 'Giyim-Zemin-Kat-Alan-3', 0, 0.0, 'cam5'),
    ('2026-06-15 19:00:00', 'Giyim-Zemin-Kat-Alan-1', 0, 0.0, 'cam5'),
    ('2026-06-15 19:00:00', 'Giyim-Zemin-Kat-Alan-2', 0, 0.0, 'cam5'),
    ('2026-06-15 19:00:00', 'Giyim-Zemin-Kat-Alan-3', 0, 0.0, 'cam5'),
    ('2026-06-15 20:00:00', 'Giyim-Zemin-Kat-Alan-1', 0, 0.0, 'cam5'),
    ('2026-06-15 20:00:00', 'Giyim-Zemin-Kat-Alan-2', 0, 0.0, 'cam5'),
    ('2026-06-15 20:00:00', 'Giyim-Zemin-Kat-Alan-3', 0, 0.0, 'cam5'),
]

# ============================================================
# EMILIO LARA (user_id=4) - queue_data
# cam4 / Kasa-Alan-1
# Sadece tamamlanan (completed) kasa bekleme kayitlari
# ============================================================

# queue_data kolonlarini kontrol edecegiz

conn = sqlite3.connect(DB)
cur = conn.cursor()

# heatmap mevcut kayit sayisi
cur.execute("SELECT COUNT(*) FROM heatmap_data WHERE user_id=4 AND recorded_at >= '2026-06-15' AND recorded_at < '2026-06-16'")
existing_hm = cur.fetchone()[0]
print(f"Mevcut lara heatmap 15.06: {existing_hm}")

# Duplicate olmamasi icin once sil
cur.execute("DELETE FROM heatmap_data WHERE user_id=4 AND recorded_at >= '2026-06-15' AND recorded_at < '2026-06-16'")
print("Temizlendi: Lara heatmap 15.06")

# heatmap insert
ok = 0
for ts, zone, visitors, dwell, cam in lara_heatmap:
    try:
        cur.execute("""
            INSERT INTO heatmap_data (user_id, zone, visitor_count, intensity, heatmap_type, camera_id, recorded_at)
            VALUES (4, ?, ?, ?, 'density', ?, ?)
        """, (zone, visitors, round(dwell, 1), cam, ts))
        ok += 1
    except Exception as e:
        print(f"  Heatmap hata ({zone} {ts}): {e}")

print(f"Lara heatmap eklendi: {ok} kayit")

# queue_data kolonlarini kontrol et
cur.execute("PRAGMA table_info(queue_data)")
q_cols = [r[1] for r in cur.fetchall()]
print(f"queue_data kolonlari: {q_cols}")

# Queue verisi: cam4 kasa tamamlananlar (13:40, 13:50, 16:46, 17:00)
# Log'dan: id=1765 sure=377s, id=1766 sure=532s, id=1767 sure=331s, id=1768 sure=367s
if q_cols:
    # recorded_at kolonunu kullan
    ts_col = 'recorded_at' if 'recorded_at' in q_cols else 'enter_time'
    cur.execute(f"DELETE FROM queue_data WHERE user_id=4 AND {ts_col} >= '2026-06-15' AND {ts_col} < '2026-06-16'")
    print("Temizlendi: Lara queue 15.06")

    # kolonlar: id, user_id, customer_id, enter_time, exit_time, wait_time, queue_position, cashier_id, status, total_customers, recorded_at, created_at
    queue_rows = [
        ('2026-06-15 13:40:00', 'cam4', 'Kasa-Alan-1', 377),
        ('2026-06-15 13:50:00', 'cam4', 'Kasa-Alan-1', 532),
        ('2026-06-15 16:46:00', 'cam4', 'Kasa-Alan-1', 331),
        ('2026-06-15 17:00:00', 'cam4', 'Kasa-Alan-1', 367),
    ]
    q_ok = 0
    for ts, cam, cashier, wait_sec in queue_rows:
        try:
            cur.execute("""
                INSERT INTO queue_data (user_id, cashier_id, wait_time, status, recorded_at)
                VALUES (4, ?, ?, 'completed', ?)
            """, (cashier, wait_sec, ts))
            q_ok += 1
        except Exception as e:
            print(f"  Queue hata ({ts}): {e}")
    print(f"Lara queue eklendi: {q_ok} kayit")

conn.commit()
conn.close()

print("\n=== DOGRULAMA ===")
conn2 = sqlite3.connect(DB)
cur2 = conn2.cursor()
cur2.execute("SELECT COUNT(*) FROM heatmap_data WHERE user_id=4 AND recorded_at >= '2026-06-15' AND recorded_at < '2026-06-16'")
print(f"Lara heatmap 15.06: {cur2.fetchone()[0]} kayit")
if q_cols:
    cur2.execute("SELECT COUNT(*) FROM queue_data WHERE user_id=4 AND recorded_at >= '2026-06-15' AND recorded_at < '2026-06-16'")
    print(f"Lara queue 15.06: {cur2.fetchone()[0]} kayit")
conn2.close()
print("TAMAM")
