"""activity_logs tablosunu oluşturur. Bir kez çalıştırın."""
import sqlite3
import os

for candidate in [
    os.path.join(os.path.dirname(__file__), 'instance', 'vislivis.db'),
    os.path.join(os.path.dirname(__file__), 'vislivis.db'),
    os.path.join(os.path.dirname(os.path.dirname(__file__)), 'vislivis.db'),
]:
    if os.path.exists(candidate):
        db_path = candidate
        break
else:
    db_path = None

if not db_path or not os.path.exists(db_path):
    print("Veritabanı bulunamadı.")
    exit(1)

conn = sqlite3.connect(db_path)
cur = conn.cursor()
try:
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='activity_logs'")
    if cur.fetchone() is None:
        cur.execute("""
            CREATE TABLE activity_logs (
                id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                type VARCHAR(40) NOT NULL,
                ip VARCHAR(64),
                user_agent VARCHAR(512),
                method VARCHAR(10),
                path VARCHAR(256),
                extra TEXT,
                created_at DATETIME,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        print("activity_logs tablosu oluşturuldu.")
    else:
        print("activity_logs zaten mevcut.")
    conn.commit()
except Exception as e:
    conn.rollback()
    print(f"Hata: {e}")
    exit(1)
finally:
    conn.close()
