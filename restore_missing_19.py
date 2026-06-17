import sqlite3

LIVE = '/var/www/vislivis/backend/instance/vislivis.db'
BACKUP_21 = '/var/www/vislivis/db_backups/vislivis_2026-06-16_21-00.db'
BACKUP_20 = '/var/www/vislivis/db_backups/vislivis_2026-06-16_20-00.db'

# Oncelikle 21:00 yedeginden 19:00 verisini kontrol et
for backup_path in [BACKUP_21, BACKUP_20]:
    print(f"\n=== {backup_path} ===")
    try:
        b = sqlite3.connect(backup_path)
        bc = b.cursor()

        bc.execute("SELECT COUNT(*) FROM customer_data WHERE timestamp >= '2026-06-16 19' AND timestamp < '2026-06-16 20'")
        print(f"  customer 19:xx: {bc.fetchone()[0]}")

        bc.execute("SELECT COUNT(*) FROM heatmap_data WHERE recorded_at >= '2026-06-16 19' AND recorded_at < '2026-06-16 20'")
        print(f"  heatmap 19:xx: {bc.fetchone()[0]}")

        bc.execute("SELECT COUNT(*) FROM queue_data WHERE recorded_at >= '2026-06-16 19' AND recorded_at < '2026-06-16 20'")
        print(f"  queue 19:xx: {bc.fetchone()[0]}")
        b.close()
    except Exception as e:
        print(f"  HATA: {e}")

# En iyi yedekten (21:00) 19:xx verisini live'a kopyala
print("\n=== RESTORE ISLEMI ===")
best_backup = BACKUP_21
try:
    b = sqlite3.connect(best_backup)
    bc = b.cursor()

    # --- customer_data 19:xx ---
    bc.execute("SELECT COUNT(*) FROM customer_data WHERE timestamp >= '2026-06-16 19' AND timestamp < '2026-06-16 20'")
    cnt = bc.fetchone()[0]
    if cnt > 0:
        bc.execute("SELECT * FROM customer_data WHERE timestamp >= '2026-06-16 19' AND timestamp < '2026-06-16 20'")
        rows_c = bc.fetchall()
        bc.execute("PRAGMA table_info(customer_data)")
        cols_c = [r[1] for r in bc.fetchall()]

        live = sqlite3.connect(LIVE)
        lc = live.cursor()
        lc.execute("DELETE FROM customer_data WHERE timestamp >= '2026-06-16 19' AND timestamp < '2026-06-16 20'")
        for row in rows_c:
            placeholders = ','.join(['?' for _ in cols_c])
            lc.execute(f"INSERT OR IGNORE INTO customer_data ({','.join(cols_c)}) VALUES ({placeholders})", row)
        live.commit()
        live.close()
        print(f"  customer 19:xx restore: {len(rows_c)} kayit")
    else:
        print("  customer 19:xx yedekte de yok")

    # --- heatmap_data 19:xx ---
    bc.execute("SELECT COUNT(*) FROM heatmap_data WHERE recorded_at >= '2026-06-16 19' AND recorded_at < '2026-06-16 20'")
    cnt_h = bc.fetchone()[0]
    if cnt_h > 0:
        bc.execute("SELECT * FROM heatmap_data WHERE recorded_at >= '2026-06-16 19' AND recorded_at < '2026-06-16 20'")
        rows_h = bc.fetchall()
        bc.execute("PRAGMA table_info(heatmap_data)")
        cols_h = [r[1] for r in bc.fetchall()]

        live = sqlite3.connect(LIVE)
        lc = live.cursor()
        lc.execute("DELETE FROM heatmap_data WHERE recorded_at >= '2026-06-16 19' AND recorded_at < '2026-06-16 20'")
        for row in rows_h:
            placeholders = ','.join(['?' for _ in cols_h])
            lc.execute(f"INSERT OR IGNORE INTO heatmap_data ({','.join(cols_h)}) VALUES ({placeholders})", row)
        live.commit()
        live.close()
        print(f"  heatmap 19:xx restore: {len(rows_h)} kayit")
    else:
        print("  heatmap 19:xx yedekte de yok")

    # --- queue_data 19:xx ---
    bc.execute("SELECT COUNT(*) FROM queue_data WHERE recorded_at >= '2026-06-16 19' AND recorded_at < '2026-06-16 20'")
    cnt_q = bc.fetchone()[0]
    if cnt_q > 0:
        bc.execute("SELECT * FROM queue_data WHERE recorded_at >= '2026-06-16 19' AND recorded_at < '2026-06-16 20'")
        rows_q = bc.fetchall()
        bc.execute("PRAGMA table_info(queue_data)")
        cols_q = [r[1] for r in bc.fetchall()]

        live = sqlite3.connect(LIVE)
        lc = live.cursor()
        lc.execute("DELETE FROM queue_data WHERE recorded_at >= '2026-06-16 19' AND recorded_at < '2026-06-16 20'")
        for row in rows_q:
            placeholders = ','.join(['?' for _ in cols_q])
            lc.execute(f"INSERT OR IGNORE INTO queue_data ({','.join(cols_q)}) VALUES ({placeholders})", row)
        live.commit()
        live.close()
        print(f"  queue 19:xx restore: {len(rows_q)} kayit")
    else:
        print("  queue 19:xx yedekte de yok")

    b.close()
except Exception as e:
    print(f"HATA: {e}")

# Son durum dogrulama
print("\n=== SON DURUM ===")
live = sqlite3.connect(LIVE)
lc = live.cursor()
lc.execute("SELECT substr(timestamp,1,13), COUNT(*) FROM customer_data WHERE timestamp >= '2026-06-16' GROUP BY substr(timestamp,1,13) ORDER BY timestamp")
print("customer saatlik:")
for r in lc.fetchall():
    print(f"  {r[0]}: {r[1]}")
lc.execute("SELECT substr(recorded_at,1,13), COUNT(*) FROM heatmap_data WHERE recorded_at >= '2026-06-16' AND user_id=4 GROUP BY substr(recorded_at,1,13) ORDER BY recorded_at")
print("heatmap lara 16.06 saatlik:")
for r in lc.fetchall():
    print(f"  {r[0]}: {r[1]}")
lc.execute("SELECT COUNT(*) FROM heatmap_data WHERE user_id=4 AND recorded_at>='2026-06-15' AND recorded_at<'2026-06-16'")
print(f"lara heatmap 15.06: {lc.fetchone()[0]}")
live.close()
print("TAMAM")
