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

    # customer_data şeması
    cur.execute("PRAGMA table_info(customer_data)")
    cols = [r[1] for r in cur.fetchall()]
    print(f'  customer_data kolonlar: {cols}')

    # timestamp kolonu bul
    ts_col = None
    for c in cols:
        if 'time' in c.lower() or 'date' in c.lower():
            ts_col = c
            break

    if ts_col:
        cur.execute(f"SELECT COUNT(*) FROM customer_data")
        total = cur.fetchone()[0]
        print(f'  customer_data toplam: {total}')

        cur.execute(f"SELECT MIN({ts_col}), MAX({ts_col}) FROM customer_data")
        mn, mx = cur.fetchone()
        print(f'  tarih araligi: {mn} -> {mx}')

        cur.execute(f"SELECT user_id, COUNT(*) FROM customer_data WHERE {ts_col} >= '2026-06-15' GROUP BY user_id ORDER BY user_id")
        rows = cur.fetchall()
        print(f'  15.06+ veriler kullanici bazinda:')
        for uid, cnt in rows:
            print(f'    user_id={uid}: {cnt} kayit')

        # Saat saat Atölye Gözlük (user_id=5) - bugün
        cur.execute(f"SELECT strftime('%H', {ts_col}) as saat, COUNT(*), SUM(entered), SUM(exited) FROM customer_data WHERE user_id=5 AND {ts_col} >= '2026-06-15' GROUP BY saat ORDER BY saat")
        rows = cur.fetchall()
        print(f'\n  Atolye Gozluk (user5) 15.06 saat bazinda:')
        for saat, cnt, ent, ext in rows:
            print(f'    {saat}:00 -> {cnt} kayit, entered={ent}, exited={ext}')

        cur.execute(f"SELECT strftime('%H', {ts_col}) as saat, COUNT(*), SUM(entered), SUM(exited) FROM customer_data WHERE user_id=4 AND {ts_col} >= '2026-06-15' GROUP BY saat ORDER BY saat")
        rows = cur.fetchall()
        print(f'\n  Emilio Lara (user4) 15.06 saat bazinda:')
        for saat, cnt, ent, ext in rows:
            print(f'    {saat}:00 -> {cnt} kayit, entered={ent}, exited={ext}')

    conn.close()
