"""Manuel JWT doğrulama - flask-jwt-extended bypass"""
import jwt
from functools import wraps
from flask import request, jsonify

def get_token_from_request():
    token = request.args.get('token')
    if token:
        return token
    auth = request.headers.get('Authorization', '')
    if auth.startswith('Bearer '):
        return auth[7:]
    return None

def admin_required(fn):
    @wraps(fn)
    def decorator(*args, **kwargs):
        from flask import current_app
        token = get_token_from_request()
        if not token:
            return jsonify({'error': 'Token gerekli'}), 401
        try:
            payload = jwt.decode(
                token,
                current_app.config['JWT_SECRET_KEY'],
                algorithms=['HS256']
            )
            if payload.get('role') != 'admin':
                return jsonify({'error': 'Yetkisiz erişim'}), 403
            return fn(*args, **kwargs)
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token süresi doldu'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Geçersiz token'}), 401
    return decorator


def get_company_user_ids(user_id):
    """
    Kullanıcının company_id'sine bağlı olarak aynı şirketteki tüm user_id'leri döndürür.
    Eğer kullanıcının company_id'si yoksa sadece kendi ID'sini döndürür.
    """
    from models import User
    user = User.query.get(user_id)
    if not user or not user.company_id:
        return [user_id]
    company_users = User.query.filter_by(company_id=user.company_id).all()
    return [u.id for u in company_users]


def can_write(user_id):
    """
    Kullanıcının yazma yetkisi var mı kontrol et.
    admin veya store_manager → True
    user (company_role='user') → False
    """
    from models import User
    user = User.query.get(user_id)
    if not user:
        return False
    if user.role == 'admin':
        return True
    if user.company_role == 'store_manager':
        return True
    return False


def write_permission_required(fn):
    """
    Decorator: Sadece admin veya company_role='store_manager' olan kullanıcılar yazma yapabilir.
    company_role='user' olanlar 403 alır.
    jwt_required() SONRA kullanılmalı.
    """
    @wraps(fn)
    def decorator(*args, **kwargs):
        from flask_jwt_extended import get_jwt_identity
        user_id = get_jwt_identity()
        if not can_write(user_id):
            return jsonify({'error': 'Bu işlem için yetkiniz yok. Sadece mağaza yöneticileri değişiklik yapabilir.'}), 403
        return fn(*args, **kwargs)
    return decorator
