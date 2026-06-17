import sqlite3

path = r'c:\Users\kasim\OneDrive\Masaüstü\Vislivis-Panel\visapa-main\server_db\vislivis_live.db'
conn = sqlite3.connect(path)
cur = conn.cursor()

print('=== CANLI SUNUCU DB ===')
cur.execute("SELECT COUNT(*) FROM customer_data")
print(f'customer_data toplam: {cur.fetchone()[0]}')

cur.execute("SELECT MIN(timestamp), MAX(timestamp) FROM customer_data")
mn, mx = cur.fetchone()
print(f'tarih araligi: {mn} -> {mx}')

print('\n--- 15.06+ kullanici bazinda ---')
cur.execute("SELECT user_id, COUNT(*) FROM customer_data WHERE timestamp >= '2026-06-15' GROUP BY user_id ORDER BY user_id")
for uid, cnt in cur.fetchall():
    print(f'  user_id={uid}: {cnt} kayit')

print('\n--- Atolye Gozluk (user5) 15.06 saat bazinda ---')
cur.execute("SELECT strftime('%H', timestamp), COUNT(*), SUM(entered), SUM(exited) FROM customer_data WHERE user_id=5 AND timestamp >= '2026-06-15' GROUP BY strftime('%H', timestamp) ORDER BY 1")
for saat, cnt, ent, ext in cur.fetchall():
    print(f'  {saat}:00 -> {cnt} kayit, entered={ent}, exited={ext}')

print('\n--- Emilio Lara (user4) 15.06 saat bazinda ---')
cur.execute("SELECT strftime('%H', timestamp), COUNT(*), SUM(entered), SUM(exited) FROM customer_data WHERE user_id=4 AND timestamp >= '2026-06-15' GROUP BY strftime('%H', timestamp) ORDER BY 1")
for saat, cnt, ent, ext in cur.fetchall():
    print(f'  {saat}:00 -> {cnt} kayit, entered={ent}, exited={ext}')

print('\n--- Diger tablolar 15.06+ ---')
for tbl in ['queue_data', 'heatmap_data', 'staff_data']:
    try:
        cur.execute(f"SELECT COUNT(*) FROM {tbl} WHERE timestamp >= '2026-06-15'")
        print(f'  {tbl}: {cur.fetchone()[0]}')
    except:
        try:
            cur.execute(f"SELECT COUNT(*) FROM {tbl} WHERE recorded_at >= '2026-06-15'")
            print(f'  {tbl}: {cur.fetchone()[0]}')
        except Exception as e:
            print(f'  {tbl}: HATA - {e}')

conn.close()
