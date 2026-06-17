import sqlite3

DB = '/var/www/vislivis/backend/instance/vislivis.db'
conn = sqlite3.connect(DB)
cur = conn.cursor()

# Diger saatlerde cam1/cam2/cam6/cam7 karsiligindaki kamera adlarini bul
cur.execute("SELECT DISTINCT camera_id FROM customer_data WHERE user_id=4 AND timestamp >= '2026-06-16 10' AND timestamp < '2026-06-16 19' ORDER BY camera_id")
print("Mevcut camera_id degerleri:")
for r in cur.fetchall():
    print(f"  '{r[0]}'")

# cam1,cam2,cam6,cam7 ile karsilik gelen isimleri kontrol et
for cam_code, cam_name_sample in [('cam1','2026-06-16 10'), ('cam2','2026-06-16 10'), ('cam6','2026-06-16 10'), ('cam7','2026-06-16 10')]:
    cur.execute("SELECT camera_id, entered, exited FROM customer_data WHERE user_id=4 AND substr(timestamp,1,13)=? ORDER BY entered DESC LIMIT 1", (cam_name_sample,))
    rows = cur.fetchall()
    print(f"  {cam_name_sample}: {rows}")

conn.close()
print("TAMAM")
