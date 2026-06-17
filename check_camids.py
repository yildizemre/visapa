import sqlite3

DB = '/var/www/vislivis/backend/instance/vislivis.db'
conn = sqlite3.connect(DB)
cur = conn.cursor()

# Saat 10-18 araligindaki camera_id'leri ve karsilik gelen entered/exited
cur.execute("""
    SELECT camera_id, MIN(entered+exited) as min_trafik, MAX(entered+exited) as max_trafik
    FROM customer_data
    WHERE user_id=4 AND substr(timestamp,1,13) IN ('2026-06-16 10','2026-06-16 11','2026-06-16 12')
    GROUP BY camera_id
    ORDER BY min_trafik DESC
""")
print("camera_id ve trafik aralik (10-12):")
for r in cur.fetchall():
    print(f"  '{r[0]}': {r[1]}-{r[2]}")

# cam1/cam2/cam6/cam7 satir sayisi (diger saatlerde var mi?)
for cam in ['cam1', 'cam2', 'cam6', 'cam7']:
    cur.execute("SELECT COUNT(*), MIN(timestamp), MAX(timestamp) FROM customer_data WHERE user_id=4 AND camera_id=?", (cam,))
    row = cur.fetchone()
    print(f"  {cam}: {row[0]} kayit {row[1]} ~ {row[2]}")

# Gercek kamera isimleri - 19xx satirlarini guncelle
# Onceden hangi kamera hangi trafik seviyesine sahip?
# cam1 (cam log): Galery Cristal Giris - 10:xx: giren=28, cam2: giren=3
# Dogru eslestirme icin 10:xx verisine bak
cur.execute("""
    SELECT camera_id, entered, exited FROM customer_data
    WHERE user_id=4 AND substr(timestamp,1,13)='2026-06-16 10'
    ORDER BY camera_id
""")
print("\n10:xx kamera verileri:")
for r in cur.fetchall():
    print(f"  camera_id='{r[0]}' entered={r[1]} exited={r[2]}")

conn.close()
print("TAMAM")
