from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt

from models import db, User, ManagedStore
from activity_logger import log_activity

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    username_or_email = data.get('username') or data.get('email')
    password = data.get('password')

    if not username_or_email or not password:
        log_activity('login_fail', user_id=None, extra={'reason': 'missing_credentials'})
        return jsonify({'error': 'Kullanıcı adı/email ve şifre gerekli'}), 400

    user = User.query.filter(
        (User.username == username_or_email) | (User.email == username_or_email)
    ).first()

    if not user or not user.check_password(password):
        log_activity('login_fail', user_id=None, extra={'username_attempt': username_or_email})
        return jsonify({'error': 'Geçersiz kullanıcı adı veya şifre'}), 401

    if not user.is_active:
        log_activity('login_fail', user_id=user.id, extra={'reason': 'account_inactive'})
        return jsonify({'error': 'Hesap devre dışı'}), 403

    log_activity('login_ok', user_id=user.id, extra={'username': user.username, 'role': user.role})

    access_token = create_access_token(
        identity=user.id,
        additional_claims={
            'role': user.role,
            'username': user.username,
            'company_id': user.company_id,
            'company_role': user.company_role,
        }
    )
    user_dict = user.to_public_dict()
    user_dict['logo_base64'] = user.logo_base64 or None
    if user.role == 'brand_manager':
        rows = ManagedStore.query.filter_by(manager_user_id=user.id).all()
        user_dict['managed_stores'] = []
        for r in rows:
            u = User.query.get(r.store_user_id)
            if u:
                user_dict['managed_stores'].append({'id': u.id, 'username': u.username, 'full_name': u.full_name or u.username})
    return jsonify({
        'access_token': access_token,
        'user': user_dict
    })


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'Kullanıcı bulunamadı'}), 404
    data = user.to_public_dict()
    data['logo_base64'] = user.logo_base64 or None
    if user.role == 'brand_manager':
        rows = ManagedStore.query.filter_by(manager_user_id=user.id).all()
        data['managed_stores'] = [{'id': r.store_user_id} for r in rows]
        for i, r in enumerate(rows):
            u = User.query.get(r.store_user_id)
            if u:
                data['managed_stores'][i]['username'] = u.username
                data['managed_stores'][i]['full_name'] = u.full_name or u.username
    return jsonify(data)


@auth_bp.route('/me/logo', methods=['PUT'])
@jwt_required()
def update_logo():
    """Profil logosu / sirketi logosunu guncelle (base64 data URL)."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'Kullanıcı bulunamadı'}), 404
    data = request.get_json() or {}
    logo = data.get('logo_base64')
    if logo is None:
        return jsonify({'error': 'logo_base64 gerekli'}), 400
    user.logo_base64 = logo if logo else None
    db.session.commit()
    return jsonify({'message': 'Logo güncellendi', 'logo_base64': user.logo_base64})


@auth_bp.route('/me/companies', methods=['GET'])
@jwt_required()
def my_companies():
    """Kullanıcının erişebileceği şirketleri döndür (store switcher için)."""
    from user_context import get_accessible_companies
    user_id = get_jwt_identity()
    companies = get_accessible_companies(int(user_id))
    return jsonify({'companies': companies})


@auth_bp.route('/me/switch-company', methods=['POST'])
@jwt_required()
def switch_company():
    """Kullanıcının aktif şirketini değiştir — yeni token döner."""
    from user_context import get_accessible_companies
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    target_company_id = data.get('company_id')

    if not target_company_id:
        return jsonify({'error': 'company_id gerekli'}), 400

    accessible = get_accessible_companies(int(user_id))
    accessible_ids = [c['id'] for c in accessible]

    if int(target_company_id) not in accessible_ids:
        return jsonify({'error': 'Bu şirkete erişim yetkiniz yok'}), 403

    user = User.query.get(int(user_id))
    if not user:
        return jsonify({'error': 'Kullanıcı bulunamadı'}), 404

    # Kullanıcının company_id'sini güncelle
    user.company_id = int(target_company_id)
    db.session.commit()

    # Yeni token oluştur
    access_token = create_access_token(
        identity=user.id,
        additional_claims={
            'role': user.role,
            'username': user.username,
            'company_id': user.company_id,
            'company_role': user.company_role,
        }
    )
    user_dict = user.to_public_dict()
    user_dict['logo_base64'] = user.logo_base64 or None
    return jsonify({
        'access_token': access_token,
        'user': user_dict,
        'message': 'Şirket değiştirildi'
    })


@auth_bp.route('/register', methods=['POST'])
@jwt_required()
def register():
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Sadece admin kayıt oluşturabilir'}), 403
    data = request.get_json()
    username = (data.get('username') or '').strip()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password')
    role = (data.get('role', 'user') or '').strip()

    if not username or not email or not password:
        return jsonify({'error': 'username, email ve password gerekli'}), 400

    VALID_ROLES = {'user', 'admin', 'brand_manager'}
    if role not in VALID_ROLES:
        return jsonify({'error': f'Geçersiz rol. İzin verilenler: {", ".join(VALID_ROLES)}'}), 400

    if len(password) < 6:
        return jsonify({'error': 'Şifre en az 6 karakter olmalıdır'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Bu kullanıcı adı zaten kullanılıyor'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Bu e-posta zaten kayıtlı'}), 400

    user = User(username=username, email=email, role=role)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    return jsonify({'message': 'Kayıt başarılı', 'user': user.to_public_dict()}), 201
