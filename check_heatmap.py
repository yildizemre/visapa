import sqlite3
db = r'c:\Users\kasim\OneDrive\Masaüstü\Vislivis-Panel\visapa-main\server_db\vislivis_live.db'
conn = sqlite3.connect(db)
cur = conn.cursor()
cur.execute("PRAGMA table_info(heatmap_data)")
print('heatmap cols:', [r[1] for r in cur.fetchall()])
cur.execute("SELECT COUNT(*) FROM heatmap_data WHERE user_id=5 AND recorded_at >= '2026-06-15'")
print('atolye heatmap 15.06:', cur.fetchone()[0])
cur.execute("SELECT zone, visitor_count, intensity, recorded_at FROM heatmap_data WHERE user_id=5 AND recorded_at >= '2026-06-15' ORDER BY recorded_at LIMIT 10")
for r in cur.fetchall():
    print(r)
conn.close()
