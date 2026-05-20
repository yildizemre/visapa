import os
import secrets

def _cors_origins():
    raw = os.environ.get('CORS_ORIGINS', '').strip()
    if raw:
        return [o.strip() for o in raw.split(',') if o.strip()]
    return ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://192.168.1.65:5173']

# ÖNEMLİ: Production'da SECRET_KEY ve JWT_SECRET_KEY env var olarak ayarlanmalıdır.
# Aksi halde her yeniden başlatmada rastgele üretilir ve mevcut token'lar geçersiz olur.
_fallback_secret = secrets.token_hex(32)

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or _fallback_secret
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///vislivis.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or _fallback_secret
    JWT_ACCESS_TOKEN_EXPIRES = 86400  # 24 saat
    JWT_TOKEN_LOCATION = ['headers', 'query_string']
    JWT_QUERY_STRING_NAME = 'token'
    JWT_HEADER_NAME = 'Authorization'
    JWT_HEADER_TYPE = 'Bearer'
    JWT_CSRF_PROTECT = False  # API Bearer token için CSRF kapalı
    CORS_ORIGINS = _cors_origins()
