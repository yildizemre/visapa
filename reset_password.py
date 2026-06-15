"""
Kullanici sifresi sifirlama araci.
Kullanim: python reset_password.py
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app import create_app
from models import db, User

app = create_app()

with app.app_context():
    print("Mevcut kullanicilar:")
    for u in User.query.all():
        print(f"  [{u.id}] {u.username} ({u.role})")
    
    username = input("\nKullanici adi girin: ").strip()
    user = User.query.filter_by(username=username).first()
    if not user:
        print("Kullanici bulunamadi!")
        sys.exit(1)
    
    new_pass = input(f"'{username}' icin yeni sifre: ").strip()
    if len(new_pass) < 4:
        print("Sifre en az 4 karakter olmali!")
        sys.exit(1)
    
    user.set_password(new_pass)
    db.session.commit()
    print(f"\nBasarili! '{username}' sifresini '{new_pass}' olarak guncelledi.")
