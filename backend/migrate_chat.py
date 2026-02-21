"""conversations tablosu + chat_messages.conversation_id ekler. Bir kez çalıştırın."""
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
done = []
try:
    cur.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='conversations'"
    )
    if cur.fetchone() is None:
        cur.execute("""
            CREATE TABLE conversations (
                id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title VARCHAR(200) DEFAULT 'Sohbet',
                created_at DATETIME,
                updated_at DATETIME,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        done.append('conversations tablosu')

    cur.execute("PRAGMA table_info(chat_messages)")
    cols = [r[1] for r in cur.fetchall()]
    if 'conversation_id' not in cols:
        cur.execute(
            "ALTER TABLE chat_messages ADD COLUMN conversation_id INTEGER REFERENCES conversations(id)"
        )
        done.append('chat_messages.conversation_id')

    conn.commit()
    if done:
        print("Migrasyon tamamlandı:", ", ".join(done))
    else:
        print("Gerekli değişiklik yok; zaten uygulanmış.")
except Exception as e:
    conn.rollback()
    print(f"Hata: {e}")
    exit(1)
finally:
    conn.close()
