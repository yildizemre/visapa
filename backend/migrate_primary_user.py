"""Migration: companies tablosuna primary_user_id kolonu ekle.
Bu kolon, sirketin DB sahibi (verinin bagli oldugu) kullaniciyi belirtir."""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'instance', 'vislivis.db')


def migrate():
    if not os.path.exists(DB_PATH):
        print(f"DB bulunamadi: {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # companies tablosuna primary_user_id kolonu ekle
    cur.execute("PRAGMA table_info(companies)")
    columns = [row[1] for row in cur.fetchall()]

    if 'primary_user_id' not in columns:
        cur.execute("ALTER TABLE companies ADD COLUMN primary_user_id INTEGER REFERENCES users(id)")
        print("OK: companies.primary_user_id kolonu eklendi")
    else:
        print("- companies.primary_user_id zaten mevcut")

    conn.commit()
    conn.close()
    print("\nOK: Migration tamamlandi.")


if __name__ == '__main__':
    migrate()
