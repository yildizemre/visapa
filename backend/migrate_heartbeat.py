#!/usr/bin/env python3
"""service_heartbeat tablosunu oluşturur ve module_pings kolonunu ekler."""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'instance', 'vislivis.db')

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"DB bulunamadı: {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # 1. service_heartbeat tablosu oluştur (yoksa)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS service_heartbeat (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id),
            last_ping_at DATETIME NOT NULL,
            expected_pings INTEGER DEFAULT 0,
            received_pings INTEGER DEFAULT 0,
            window_start DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("OK: service_heartbeat tablosu hazir")

    # 2. service_heartbeat tablosuna module_pings kolonu ekle (yoksa)
    cur.execute("PRAGMA table_info(service_heartbeat)")
    columns = [row[1] for row in cur.fetchall()]

    if 'module_pings' not in columns:
        cur.execute("ALTER TABLE service_heartbeat ADD COLUMN module_pings TEXT")
        print("OK: service_heartbeat.module_pings kolonu eklendi")
    else:
        print("- service_heartbeat.module_pings zaten mevcut")

    conn.commit()
    conn.close()
    print("\nOK: Service Heartbeat Migration tamamlandi. DB bozulmadi.")


if __name__ == '__main__':
    migrate()
