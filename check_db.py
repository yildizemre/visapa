import sqlite3, os

db1 = r'c:\Users\kasim\OneDrive\Masaüstü\Vislivis-Panel\visapa-main\15.06 db\vislivis.db'
db2 = r'c:\Users\kasim\OneDrive\Masaüstü\Vislivis-Panel\visapa-main\server_db\vislivis_remote.db'

for label, path in [('15.06 db', db1), ('server_db', db2)]:
    if not os.path.exists(path):
        print(f'{label}: DOSYA YOK')
        continue
    conn = sqlite3.connect(path)
    cur = conn.cursor()
    print(f'\n=== {label} ===')
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [r[0] for r in cur.fetchall()]
    print('Tablolar:', tables)
    for tbl in ['customer_data', 'queue_data', 'heatmap_data', 'staff_data']:
        if tbl in tables:
            cur.execute(f"SELECT COUNT(*) FROM {tbl}")
            total = cur.fetchone()[0]
            cur.execute(f"SELECT COUNT(*) FROM {tbl} WHERE timestamp >= '2026-06-15'")
            today = cur.fetchone()[0]
            print(f'  {tbl}: toplam={total}, 15.06+={today}')
            # Kullanici bazinda dagılım
            cur.execute(f"SELECT user_id, COUNT(*) FROM {tbl} WHERE timestamp >= '2026-06-15' GROUP BY user_id ORDER BY user_id")
            rows = cur.fetchall()
            for uid, cnt in rows:
                print(f'    user_id={uid}: {cnt} kayit')
    conn.close()
