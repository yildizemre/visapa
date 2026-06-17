import sqlite3

DB = '/var/www/vislivis/backend/instance/vislivis.db'
c = sqlite3.connect(DB)

print("=== BUGÜN 16.06 ===")
c.execute("SELECT hour, SUM(entered), SUM(exited) FROM customer_data WHERE date_recorded='2026-06-16' GROUP BY hour ORDER BY hour")
rows = c.fetchall()
for r in rows:
    print(f"  saat {r[0]}: giris={r[1]} cikis={r[2]}")
if not rows:
    print("  KAYIT YOK")

print("\n=== HEATMAP 16.06 ===")
c.execute("SELECT COUNT(*) FROM heatmap_data WHERE recorded_at >= '2026-06-16'")
print(f"  toplam: {c.fetchone()[0]}")
c.execute("SELECT user_id, COUNT(*) FROM heatmap_data WHERE recorded_at >= '2026-06-16' GROUP BY user_id")
for r in c.fetchall():
    print(f"  user_id={r[0]}: {r[1]} kayit")

print("\n=== QUEUE 16.06 ===")
c.execute("SELECT COUNT(*) FROM queue_data WHERE recorded_at >= '2026-06-16'")
print(f"  toplam: {c.fetchone()[0]}")

print("\n=== LARA HEATMAP 15.06 ===")
c.execute("SELECT COUNT(*) FROM heatmap_data WHERE user_id=4 AND recorded_at>='2026-06-15' AND recorded_at<'2026-06-16'")
print(f"  toplam: {c.fetchone()[0]}")
c.execute("SELECT substr(recorded_at,1,13), zone, visitor_count FROM heatmap_data WHERE user_id=4 AND recorded_at>='2026-06-15' AND recorded_at<'2026-06-16' ORDER BY recorded_at LIMIT 10")
for r in c.fetchall():
    print(f"  {r[0]} | {r[1]} | {r[2]}")

print("\n=== YEDEKLER ===")
import os
backups = sorted(os.listdir('/var/www/vislivis/db_backups'))
for b in backups[-5:]:
    size = os.path.getsize(f'/var/www/vislivis/db_backups/{b}')
    print(f"  {b} ({size} bytes)")

c.close()
print("TAMAM")
