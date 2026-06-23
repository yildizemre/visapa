"""site_config tablosuna work_start ve work_end sütunlarını ekler."""
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))
from app import app
from models import db

with app.app_context():
    with db.engine.connect() as conn:
        # Mevcut sütunları kontrol et
        from sqlalchemy import inspect
        inspector = inspect(db.engine)
        cols = [c['name'] for c in inspector.get_columns('site_config')]

        if 'work_start' not in cols:
            conn.execute(db.text('ALTER TABLE site_config ADD COLUMN work_start INTEGER DEFAULT 10'))
            print("work_start sütunu eklendi.")
        else:
            print("work_start zaten mevcut.")

        if 'work_end' not in cols:
            conn.execute(db.text('ALTER TABLE site_config ADD COLUMN work_end INTEGER DEFAULT 22'))
            print("work_end sütunu eklendi.")
        else:
            print("work_end zaten mevcut.")

        conn.commit()

    print("Migration tamamlandı.")
