"""
Migration: Company (Şirket) sistemi için veritabanı güncellemesi.
- companies tablosu oluştur (yoksa)
- users tablosuna company_id ve company_role kolonları ekle (yoksa)

Bu script canlı DB'yi bozmaz — sadece additive değişiklikler yapar.
Kullanım: python migrate_companies.py
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'instance', 'vislivis.db')

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"DB bulunamadı: {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # 1. companies tablosu oluştur (yoksa)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS companies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(120) NOT NULL,
            parent_id INTEGER REFERENCES companies(id),
            logo_base64 TEXT,
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("OK: companies tablosu hazir")

    # 2. users tablosuna company_id kolonu ekle (yoksa)
    cur.execute("PRAGMA table_info(users)")
    columns = [row[1] for row in cur.fetchall()]

    if 'company_id' not in columns:
        cur.execute("ALTER TABLE users ADD COLUMN company_id INTEGER REFERENCES companies(id)")
        print("OK: users.company_id kolonu eklendi")
    else:
        print("- users.company_id zaten mevcut")

    if 'company_role' not in columns:
        cur.execute("ALTER TABLE users ADD COLUMN company_role VARCHAR(20) DEFAULT 'user'")
        print("OK: users.company_role kolonu eklendi")
    else:
        print("- users.company_role zaten mevcut")

    conn.commit()
    conn.close()
    print("\nOK: Migration tamamlandi. DB bozulmadi.")


if __name__ == '__main__':
    migrate()
