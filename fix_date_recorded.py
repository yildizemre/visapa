import sqlite3

DB = '/var/www/vislivis/backend/instance/vislivis.db'
conn = sqlite3.connect(DB)
cur = conn.cursor()

# date_recorded kolonunu recorded_at'tan doldur (sadece NULL olanlar)
cur.execute("""
    UPDATE heatmap_data
    SET date_recorded = substr(recorded_at, 1, 10)
    WHERE date_recorded IS NULL AND recorded_at IS NOT NULL
""")
print(f"date_recorded guncellendi: {cur.rowcount} kayit")

# Lara 15.06 kontrolu
cur.execute("SELECT COUNT(*) FROM heatmap_data WHERE user_id=4 AND date_recorded='2026-06-15'")
print(f"Lara heatmap date_recorded=2026-06-15: {cur.fetchone()[0]}")

# Lara 16.06 kontrolu
cur.execute("SELECT COUNT(*) FROM heatmap_data WHERE user_id=4 AND date_recorded='2026-06-16'")
print(f"Lara heatmap date_recorded=2026-06-16: {cur.fetchone()[0]}")

# Genel kontrol
cur.execute("SELECT date_recorded, COUNT(*) FROM heatmap_data WHERE user_id=4 GROUP BY date_recorded ORDER BY date_recorded DESC LIMIT 10")
for r in cur.fetchall():
    print(f"  date_recorded={r[0]}: {r[1]} kayit")

conn.commit()
conn.close()
print("TAMAM")
