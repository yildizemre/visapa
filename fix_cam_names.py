import sqlite3
import shutil
import os
from datetime import datetime

DB = '/var/www/vislivis/backend/instance/vislivis.db'

# 1. YEDEK AL
backup_path = f'/var/www/vislivis/db_backups/vislivis_before_camfix_{datetime.now().strftime("%Y%m%d_%H%M%S")}.db'
shutil.copy2(DB, backup_path)
print(f"Yedek alindi: {backup_path}")

conn = sqlite3.connect(DB)
cur = conn.cursor()

# 2. CAM* ile başlayan tüm satırları listele
cur.execute("SELECT DISTINCT camera_id FROM customer_data WHERE camera_id LIKE 'cam%' ORDER BY camera_id")
cam_ids = [r[0] for r in cur.fetchall()]
print(f"\nCam* camera_id'ler: {cam_ids}")

# 3. Her biri için kaç satır var?
for cam in cam_ids:
    cur.execute("SELECT COUNT(*), MIN(timestamp), MAX(timestamp) FROM customer_data WHERE camera_id=?", (cam,))
    r = cur.fetchone()
    print(f"  {cam}: {r[0]} kayit | {r[1]} ~ {r[2]}")

# 4. ESLESTIRME - 10:xx verisinden dogrulandı:
# cam1 giren=28 ↔ Galery Cristal Giris entered=28
# cam2 giren=3  ↔ Emilio Giris entered=3
# cam6 giren=8  ↔ Kat 1 Merdiven entered=8
# cam7 giren=14 ↔ Alt Kat Merdiven entered=14
cam_map = {
    'cam1': 'Galery Cristal Giris',
    'cam2': 'Emilio Giris',
    'cam6': 'Kat 1 Merdiven',
    'cam7': 'Alt Kat Merdiven',
}

# 5. Bilinmeyen cam* varsa bul
unknown = [c for c in cam_ids if c not in cam_map]
if unknown:
    print(f"\nBILINMEYEN cam* degerleri (baska kullanici olmali, dokunulmayacak): {unknown}")
    # Bunlari cam_map'ten cikar - sadece user_id=4 olanları işle

# 6. Her cam* satiri icin: gercek isimli yeni satir ekle, eskisini sil
print("\n=== DONUSUM BASLADI ===")
total_converted = 0
total_deleted = 0

cur.execute("PRAGMA table_info(customer_data)")
cols = [r[1] for r in cur.fetchall()]
cam_idx = cols.index('camera_id')
id_idx = cols.index('id')
cols_no_id = [c for c in cols if c != 'id']

for cam_code, real_name in cam_map.items():
    # SADECE user_id=4 olan cam* satirlarini al
    cur.execute("SELECT * FROM customer_data WHERE camera_id=? AND user_id=4", (cam_code,))
    rows = cur.fetchall()
    
    if not rows:
        print(f"  {cam_code}: user_id=4 satir yok, atlaniyor")
        continue
    
    print(f"  {cam_code} -> {real_name}: {len(rows)} satir donusturulecek")
    
    inserted = 0
    for row in rows:
        row_list = list(row)
        row_list[cam_idx] = real_name
        row_list_no_id = [v for i, v in enumerate(row_list) if i != id_idx]
        placeholders = ','.join(['?' for _ in cols_no_id])
        try:
            cur.execute(
                f"INSERT INTO customer_data ({','.join(cols_no_id)}) VALUES ({placeholders})",
                row_list_no_id
            )
            inserted += 1
        except Exception as e:
            print(f"    INSERT HATA: {e}")
    
    # Eski cam* satirlarini SADECE user_id=4 icin sil
    cur.execute("DELETE FROM customer_data WHERE camera_id=? AND user_id=4", (cam_code,))
    deleted = cur.rowcount
    total_converted += inserted
    total_deleted += deleted
    print(f"    Eklendi: {inserted}, Silindi: {deleted}")

conn.commit()
print(f"\nToplam donusturulen: {total_converted}, Silinen: {total_deleted}")

# 7. DOGRULAMA
print("\n=== SON DOGRULAMA ===")
cur.execute("SELECT COUNT(*) FROM customer_data WHERE camera_id LIKE 'cam%'")
remaining = cur.fetchone()[0]
print(f"Kalan cam* satiri: {remaining}")

cur.execute("SELECT DISTINCT camera_id FROM customer_data WHERE user_id=4 ORDER BY camera_id")
print("user_id=4 kamera isimleri:")
for r in cur.fetchall():
    print(f"  '{r[0]}'")

cur.execute("SELECT substr(timestamp,1,13), camera_id, entered, exited FROM customer_data WHERE user_id=4 AND substr(timestamp,1,13)='2026-06-16 19' ORDER BY camera_id")
print("\n16.06 saat 19:xx:")
for r in cur.fetchall():
    print(f"  {r[0]} | {r[1]} | g={r[2]} c={r[3]}")

conn.close()
print("\nTAMAM")
