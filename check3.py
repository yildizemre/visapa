import sqlite3, os

DB = '/var/www/vislivis/backend/instance/vislivis.db'
conn = sqlite3.connect(DB)
cur = conn.cursor()

print("=== TABLO KOLONLARI ===")
for tbl in ['customer_data', 'heatmap_data', 'queue_data']:
    cur.execute(f"PRAGMA table_info({tbl})")
    cols = [r[1] for r in cur.fetchall()]
    print(f"  {tbl}: {cols}")

print("\n=== customer_data ts kolon bul ===")
cur.execute("PRAGMA table_info(customer_data)")
cols = [r[1] for r in cur.fetchall()]
ts_col = None
for candidate in ['recorded_at','timestamp','date_recorded','created_at']:
    if candidate in cols:
        ts_col = candidate
        break
print(f"  ts kolon: {ts_col}")

if ts_col:
    cur.execute(f"SELECT COUNT(*) FROM customer_data WHERE {ts_col} >= '2026-06-16'")
    print(f"  16.06 customer toplam: {cur.fetchone()[0]}")
    cur.execute(f"SELECT substr({ts_col},1,13), user_id, SUM(entered), SUM(exited) FROM customer_data WHERE {ts_col} >= '2026-06-16' GROUP BY substr({ts_col},1,13), user_id ORDER BY {ts_col} DESC LIMIT 20")
    for r in cur.fetchall():
        print(f"  {r[0]} uid={r[1]} giris={r[2]} cikis={r[3]}")

print("\n=== heatmap_data 16.06 ===")
cur.execute("SELECT COUNT(*) FROM heatmap_data WHERE recorded_at >= '2026-06-16'")
print(f"  toplam: {cur.fetchone()[0]}")
cur.execute("SELECT user_id, substr(recorded_at,1,13), COUNT(*) FROM heatmap_data WHERE recorded_at >= '2026-06-16' GROUP BY user_id, substr(recorded_at,1,13) ORDER BY recorded_at DESC LIMIT 30")
for r in cur.fetchall():
    print(f"  uid={r[0]} saat={r[1]} adet={r[2]}")

print("\n=== queue_data 16.06 ===")
cur.execute("SELECT COUNT(*) FROM queue_data WHERE recorded_at >= '2026-06-16'")
print(f"  toplam: {cur.fetchone()[0]}")

print("\n=== lara heatmap 15.06 ===")
cur.execute("SELECT COUNT(*) FROM heatmap_data WHERE user_id=4 AND recorded_at>='2026-06-15' AND recorded_at<'2026-06-16'")
print(f"  toplam: {cur.fetchone()[0]}")

print("\n=== YEDEKLER son 6 ===")
backups = sorted(os.listdir('/var/www/vislivis/db_backups'))
for b in backups[-6:]:
    size = os.path.getsize(f'/var/www/vislivis/db_backups/{b}')
    print(f"  {b} ({size//1024} KB)")

conn.close()
print("TAMAM")
