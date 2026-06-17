import sqlite3, os

DB = '/var/www/vislivis/backend/instance/vislivis.db'
c = sqlite3.connect(DB)

print("=== TABLO KOLONLARI ===")
for tbl in ['customer_data', 'heatmap_data', 'queue_data']:
    c.execute(f"PRAGMA table_info({tbl})")
    cols = [r[1] for r in c.fetchall()]
    print(f"  {tbl}: {cols}")

print("\n=== BUGÜN 16.06 customer_data ===")
c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='customer_data'")
if c.fetchone():
    c.execute("PRAGMA table_info(customer_data)")
    cols = [r[1] for r in c.fetchall()]
    # timestamp kolonu bul
    ts_col = None
    for candidate in ['recorded_at','timestamp','date_recorded','created_at']:
        if candidate in cols:
            ts_col = candidate
            break
    print(f"  ts kolon: {ts_col}")
    if ts_col:
        c.execute(f"SELECT COUNT(*) FROM customer_data WHERE {ts_col} >= '2026-06-16'")
        print(f"  16.06 toplam: {c.fetchone()[0]}")
        c.execute(f"SELECT substr({ts_col},1,13), user_id, SUM(entered), SUM(exited) FROM customer_data WHERE {ts_col} >= '2026-06-16' GROUP BY substr({ts_col},1,13), user_id ORDER BY {ts_col} DESC LIMIT 20")
        for r in c.fetchall():
            print(f"  {r[0]} uid={r[1]} giris={r[2]} cikis={r[3]}")

print("\n=== HEATMAP 16.06 ===")
c.execute("SELECT COUNT(*) FROM heatmap_data WHERE recorded_at >= '2026-06-16'")
print(f"  toplam: {c.fetchone()[0]}")
c.execute("SELECT user_id, COUNT(*) FROM heatmap_data WHERE recorded_at >= '2026-06-16' GROUP BY user_id")
for r in c.fetchall():
    print(f"  user_id={r[0]}: {r[1]} kayit")
c.execute("SELECT substr(recorded_at,1,13), user_id, COUNT(*) FROM heatmap_data WHERE recorded_at >= '2026-06-16' GROUP BY substr(recorded_at,1,13), user_id ORDER BY recorded_at DESC LIMIT 20")
for r in c.fetchall():
    print(f"  saat:{r[0]} uid={r[1]} adet={r[2]}")

print("\n=== QUEUE 16.06 ===")
c.execute("SELECT COUNT(*) FROM queue_data WHERE recorded_at >= '2026-06-16'")
print(f"  toplam: {c.fetchone()[0]}")

print("\n=== LARA HEATMAP 15.06 ===")
c.execute("SELECT COUNT(*) FROM heatmap_data WHERE user_id=4 AND recorded_at>='2026-06-15' AND recorded_at<'2026-06-16'")
print(f"  toplam: {c.fetchone()[0]}")

print("\n=== YEDEKLER (son 5) ===")
backups = sorted(os.listdir('/var/www/vislivis/db_backups'))
for b in backups[-6:]:
    size = os.path.getsize(f'/var/www/vislivis/db_backups/{b}')
    print(f"  {b} ({size//1024} KB)")

c.close()
print("TAMAM")
