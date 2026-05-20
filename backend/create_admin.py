#!/usr/bin/env python3
"""
VDS veya lokal ortamda admin kullanıcı oluşturur veya şifresini günceller.
Kullanım:
  cd backend
  python create_admin.py
  python create_admin.py --username admin --password guclu_sifre
  python create_admin.py --username yeniadmin --password sifre --email admin@firma.com
"""
import os
import sys
import argparse

# Proje kökünden backend'i import edebilmek için
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def main():
    # Veritabanı yolunun backend dizinine göre olması için
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    parser = argparse.ArgumentParser(description='Admin kullanıcı oluştur veya şifre güncelle')
    parser.add_argument('--username', default='admin', help='Admin kullanıcı adı')
    parser.add_argument('--password', default='admin', help='Admin şifresi')
    parser.add_argument('--email', default='admin@vislivis.com', help='Admin e-posta')
    args = parser.parse_args()

    # .env yüklensin
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    os.environ.setdefault(k.strip(), v.strip())

    from app import app
    from models import db, User

    with app.app_context():
        db.create_all()
        user = User.query.filter_by(username=args.username).first()
        if user:
            user.set_password(args.password)
            user.email = args.email
            user.role = 'admin'
            user.is_active = True
            db.session.commit()
            print(f'Admin güncellendi: {args.username} (şifre ve email ayarlandı)')
        else:
            user = User(username=args.username, email=args.email, role='admin')
            user.set_password(args.password)
            db.session.add(user)
            db.session.commit()
            print(f'Admin oluşturuldu: {args.username} / (girilen şifre)')
    return 0

if __name__ == '__main__':
    sys.exit(main())
