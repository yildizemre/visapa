"""Migration: companies tablosuna lisans (license_start, license_end) ve
profil resmi (profile_image_base64) kolonlarini ekle.
- license_start / license_end: NULL ise sinirsiz. license_end gecmisse giris engellenir.
- profile_image_base64: sirket profil fotografi, altindaki tum kullanicilara yansir.
Additive migration - mevcut veri kaybolmaz."""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'instance', 'vislivis.db')


def migrate():
    if not os.path.exists(DB_PATH):
        print(f"DB bulunamadi: {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute("PRAGMA table_info(companies)")
    columns = [row[1] for row in cur.fetchall()]

    if 'license_start' not in columns:
        cur.execute("ALTER TABLE companies ADD COLUMN license_start DATETIME")
        print("OK: companies.license_start kolonu eklendi")
    else:
        print("- companies.license_start zaten mevcut")

    if 'license_end' not in columns:
        cur.execute("ALTER TABLE companies ADD COLUMN license_end DATETIME")
        print("OK: companies.license_end kolonu eklendi")
    else:
        print("- companies.license_end zaten mevcut")

    if 'profile_image_base64' not in columns:
        cur.execute("ALTER TABLE companies ADD COLUMN profile_image_base64 TEXT")
        print("OK: companies.profile_image_base64 kolonu eklendi")
    else:
        print("- companies.profile_image_base64 zaten mevcut")

    conn.commit()
    conn.close()
    print("\nOK: Company Lisans Migration tamamlandi. DB bozulmadi.")


if __name__ == '__main__':
    migrate()
