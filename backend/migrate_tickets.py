"""tickets ve ticket_replies tablolarını oluşturur. Bir kez çalıştırın."""
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
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='tickets'")
    if cur.fetchone() is None:
        cur.execute("""
            CREATE TABLE tickets (
                id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                subject VARCHAR(200) NOT NULL,
                category VARCHAR(50) NOT NULL,
                priority VARCHAR(20) NOT NULL,
                status VARCHAR(20) DEFAULT 'open',
                message TEXT NOT NULL,
                admin_read_at DATETIME,
                created_at DATETIME,
                updated_at DATETIME,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        print("tickets tablosu oluşturuldu.")
    else:
        print("tickets zaten mevcut.")

    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='ticket_replies'")
    if cur.fetchone() is None:
        cur.execute("""
            CREATE TABLE ticket_replies (
                id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                ticket_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                message TEXT NOT NULL,
                is_staff INTEGER DEFAULT 0,
                created_at DATETIME,
                FOREIGN KEY (ticket_id) REFERENCES tickets (id),
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        print("ticket_replies tablosu oluşturuldu.")
    else:
        print("ticket_replies zaten mevcut.")

    # tickets tablosuna created_ip, created_user_agent ekle (yoksa)
    cur.execute("PRAGMA table_info(tickets)")
    cols = [row[1] for row in cur.fetchall()]
    if 'created_ip' not in cols:
        cur.execute("ALTER TABLE tickets ADD COLUMN created_ip VARCHAR(64)")
        print("tickets.created_ip eklendi.")
    if 'created_user_agent' not in cols:
        cur.execute("ALTER TABLE tickets ADD COLUMN created_user_agent VARCHAR(512)")
        print("tickets.created_user_agent eklendi.")
    if 'user_read_at' not in cols:
        cur.execute("ALTER TABLE tickets ADD COLUMN user_read_at DATETIME")
        print("tickets.user_read_at eklendi.")
    if 'closed_at' not in cols:
        cur.execute("ALTER TABLE tickets ADD COLUMN closed_at DATETIME")
        print("tickets.closed_at eklendi.")
    if 'closed_by_user_id' not in cols:
        cur.execute("ALTER TABLE tickets ADD COLUMN closed_by_user_id INTEGER REFERENCES users(id)")
        print("tickets.closed_by_user_id eklendi.")

    conn.commit()
except Exception as e:
    conn.rollback()
    print(f"Hata: {e}")
    exit(1)
finally:
    conn.close()
