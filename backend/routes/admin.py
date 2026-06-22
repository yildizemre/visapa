import json
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from sqlalchemy import func

from models import db, User, Company, CameraConfig, SiteConfig, ManagedStore, ActivityLog
from auth_utils import admin_required

admin_bp = Blueprint('admin', __name__)


@admin_bp.route('/users', methods=['GET'])
@admin_required
def list_users():

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    per_page = min(per_page, 100)
    
    pagination = User.query.order_by(User.created_at.desc()).paginate(page=page, per_page=per_page)
    user_ids = [u.id for u in pagination.items]

    # Kamera sayıları
    camera_counts = db.session.query(
        CameraConfig.user_id,
        func.count(CameraConfig.id).label('count')
    ).filter(CameraConfig.user_id.in_(user_ids)).group_by(CameraConfig.user_id).all()
    camera_map = {r.user_id: r.count for r in camera_counts}

    # Site adları (kullanıcı başına bir tane)
    sites = db.session.query(SiteConfig.user_id, SiteConfig.site_name).filter(
        SiteConfig.user_id.in_(user_ids)
    ).group_by(SiteConfig.user_id).all()
    site_map = {r.user_id: r.site_name for r in sites}

    managed_counts = db.session.query(
        ManagedStore.manager_user_id,
        func.count(ManagedStore.id).label('count')
    ).filter(ManagedStore.manager_user_id.in_(user_ids)).group_by(ManagedStore.manager_user_id).all()
    managed_map = {r.manager_user_id: r.count for r in managed_counts}

    managed_store_ids_map = {}
    for mid in user_ids:
        rows = ManagedStore.query.filter_by(manager_user_id=mid).all()
        managed_store_ids_map[mid] = [r.store_user_id for r in rows]

    users = []
    for u in pagination.items:
        d = u.to_public_dict()
        d['camera_count'] = camera_map.get(u.id, 0)
        d['site_name'] = site_map.get(u.id) or '-'
        d['managed_store_count'] = managed_map.get(u.id, 0)
        d['managed_store_ids'] = managed_store_ids_map.get(u.id, [])
        users.append(d)
    
    return jsonify({
        'users': users,
        'total': pagination.total,
        'page': page,
        'per_page': per_page,
        'pages': pagination.pages
    })


@admin_bp.route('/users', methods=['POST'])
@admin_required
def create_user():
    try:
        data = request.get_json(silent=True) or {}
        if not data and request.get_data():
            data = json.loads(request.get_data(as_text=True))
    except (json.JSONDecodeError, TypeError):
        data = {}
    username = (data.get('username') or '').strip()
    email = (data.get('email') or '').strip()
    password = data.get('password')
    role = data.get('role', 'user') or 'user'
    full_name = (data.get('full_name') or '').strip() or None

    if not username:
        return jsonify({'error': 'Kullanıcı adı gerekli'}), 400
    if not email:
        return jsonify({'error': 'E-posta gerekli'}), 400
    if not password:
        return jsonify({'error': 'Şifre gerekli'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Bu kullanıcı adı zaten kullanılıyor'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Bu e-posta zaten kayıtlı'}), 400

    try:
        user = User(username=username, email=email, role=role, full_name=full_name)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        managed_ids = data.get('managed_store_ids') or []
        if role == 'brand_manager' and managed_ids:
            for sid in managed_ids:
                try:
                    sid = int(sid)
                    if sid != user.id and User.query.get(sid):
                        db.session.add(ManagedStore(manager_user_id=user.id, store_user_id=sid))
                except (TypeError, ValueError):
                    pass
            db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Veritabanı hatası: {str(e)}'}), 400

    return jsonify({'message': 'Kullanıcı oluşturuldu', 'user': user.to_public_dict()}), 201


@admin_bp.route('/users/<int:user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    user = User.query.get_or_404(user_id)
    data = request.get_json()

    if 'email' in data:
        if data['email'] != user.email and User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Bu e-posta zaten kullanılıyor'}), 400
        user.email = data['email']
    if 'role' in data:
        user.role = data['role']
    if 'managed_store_ids' in data:
        ManagedStore.query.filter_by(manager_user_id=user_id).delete()
        for sid in data.get('managed_store_ids') or []:
            if sid and sid != user_id:
                db.session.add(ManagedStore(manager_user_id=user_id, store_user_id=int(sid)))
    if 'full_name' in data:
        user.full_name = data['full_name']
    if 'is_active' in data:
        user.is_active = bool(data['is_active'])
    if 'password' in data and data['password']:
        user.set_password(data['password'])

    db.session.commit()
    return jsonify({'message': 'Güncellendi', 'user': user.to_public_dict()})


@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    user = User.query.get_or_404(user_id)
    if user.username == 'admin':
        return jsonify({'error': 'Admin hesabı silinemez'}), 400

    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'Kullanıcı silindi'})


@admin_bp.route('/users/<int:user_id>/managed-stores', methods=['GET'])
@admin_required
def get_user_managed_stores(user_id):
    rows = ManagedStore.query.filter_by(manager_user_id=user_id).all()
    stores = []
    for r in rows:
        u = User.query.get(r.store_user_id)
        if u:
            stores.append({'id': u.id, 'username': u.username, 'full_name': u.full_name or u.username})
    return jsonify({'stores': stores})


@admin_bp.route('/users/<int:user_id>/managed-stores', methods=['PUT'])
@admin_required
def set_user_managed_stores(user_id):
    data = request.get_json() or {}
    ids = data.get('store_user_ids') or data.get('managed_store_ids') or []
    ManagedStore.query.filter_by(manager_user_id=user_id).delete()
    for sid in ids:
        try:
            sid = int(sid)
            if sid != user_id and User.query.get(sid):
                db.session.add(ManagedStore(manager_user_id=user_id, store_user_id=sid))
        except (TypeError, ValueError):
            pass
    db.session.commit()
    return jsonify({'message': 'Güncellendi'})


@admin_bp.route('/users/<int:user_id>/impersonate', methods=['POST'])
@admin_required
def impersonate_user(user_id):
    """Admin: hedef kullanıcının token'ını al, tek tıkla o panele geç."""
    user = User.query.get_or_404(user_id)
    if not user.is_active:
        return jsonify({'error': 'Hesap devre dışı'}), 403

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


@admin_bp.route('/activity-logs', methods=['GET'])
@admin_required
def activity_logs():
    """
    GET /api/admin/activity-logs?page=1&per_page=50&user_id=2&type=login_ok&date_from=2025-02-01&date_to=2025-02-28
    Kullanıcı bazlı rapor: giriş, sayfa görüntüleme, sohbet, hata logları.
    """
    from datetime import datetime
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 50, type=int), 200)
    user_id = request.args.get('user_id', type=int)
    type_filter = request.args.get('type', '').strip() or None
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')

    q = ActivityLog.query
    if user_id is not None:
        q = q.filter(ActivityLog.user_id == user_id)
    if type_filter:
        q = q.filter(ActivityLog.type == type_filter)
    if date_from:
        try:
            q = q.filter(db.func.date(ActivityLog.created_at) >= date_from)
        except Exception:
            pass
    if date_to:
        try:
            q = q.filter(db.func.date(ActivityLog.created_at) <= date_to)
        except Exception:
            pass
    q = q.order_by(ActivityLog.created_at.desc())
    pagination = q.paginate(page=page, per_page=per_page)
    return jsonify({
        'logs': [r.to_dict() for r in pagination.items],
        'total': pagination.total,
        'page': page,
        'per_page': per_page,
    })


# =====================================================================
# COMPANY (ŞİRKET) CRUD
# =====================================================================

def _company_to_full_dict(c):
    """Şirket dict'ine user_count ve children ekle."""
    d = c.to_dict()
    d['user_count'] = User.query.filter_by(company_id=c.id).count()
    children = Company.query.filter_by(parent_id=c.id).order_by(Company.name).all()
    d['children'] = []
    for child in children:
        cd = child.to_dict()
        cd['user_count'] = User.query.filter_by(company_id=child.id).count()
        d['children'].append(cd)
    return d


@admin_bp.route('/companies', methods=['GET'])
@admin_required
def list_companies():
    """Üst seviye şirketleri listele (parent_id=NULL). Her birinin children'ı ve kullanıcı sayısını da döndür."""
    top_level = Company.query.filter(Company.parent_id.is_(None)).order_by(Company.created_at.desc()).all()
    result = [_company_to_full_dict(c) for c in top_level]
    return jsonify({'companies': result})


@admin_bp.route('/companies', methods=['POST'])
@admin_required
def create_company():
    """Yeni şirket oluştur. parent_id verilirse alt mağaza olarak oluşturulur."""
    data = request.get_json(silent=True) or {}
    name = (data.get('name') or '').strip()
    parent_id = data.get('parent_id')
    if not name:
        return jsonify({'error': 'Şirket adı gerekli'}), 400

    if Company.query.filter(func.lower(Company.name) == name.lower()).first():
        return jsonify({'error': 'Bu şirket adı zaten mevcut'}), 400

    if parent_id:
        parent = Company.query.get(parent_id)
        if not parent:
            return jsonify({'error': 'Üst şirket bulunamadı'}), 404
        if parent.parent_id is not None:
            return jsonify({'error': 'Alt mağazanın altına tekrar alt mağaza eklenemez (maks 2 seviye)'}), 400

    company = Company(name=name, parent_id=parent_id, logo_base64=data.get('logo_base64'))
    db.session.add(company)
    db.session.commit()
    return jsonify({'message': 'Şirket oluşturuldu', 'company': company.to_dict()}), 201


@admin_bp.route('/companies/<int:company_id>', methods=['GET'])
@admin_required
def get_company(company_id):
    """Tek bir şirket detayı + kullanıcıları + children."""
    company = Company.query.get_or_404(company_id)
    users = User.query.filter_by(company_id=company_id).order_by(User.created_at.desc()).all()
    d = _company_to_full_dict(company)
    d['users'] = [u.to_public_dict() for u in users]
    return jsonify(d)


@admin_bp.route('/companies/<int:company_id>', methods=['PUT'])
@admin_required
def update_company(company_id):
    """Şirket bilgilerini güncelle."""
    company = Company.query.get_or_404(company_id)
    data = request.get_json(silent=True) or {}
    if 'name' in data:
        new_name = (data['name'] or '').strip()
        if new_name:
            existing = Company.query.filter(
                func.lower(Company.name) == new_name.lower(),
                Company.id != company_id
            ).first()
            if existing:
                return jsonify({'error': 'Bu şirket adı zaten mevcut'}), 400
            company.name = new_name
    if 'logo_base64' in data:
        company.logo_base64 = data['logo_base64']
    if 'is_active' in data:
        company.is_active = bool(data['is_active'])
    db.session.commit()
    return jsonify({'message': 'Güncellendi', 'company': company.to_dict()})


@admin_bp.route('/companies/<int:company_id>', methods=['DELETE'])
@admin_required
def delete_company(company_id):
    """Şirketi sil. Alt mağazaları bağımsız yap, kullanıcıları ayır."""
    company = Company.query.get_or_404(company_id)
    # Alt mağazaları bağımsız üst seviye yap
    Company.query.filter_by(parent_id=company_id).update({'parent_id': None})
    # Altındaki kullanıcıları ayır
    User.query.filter_by(company_id=company_id).update({'company_id': None, 'company_role': 'user'})
    db.session.delete(company)
    db.session.commit()
    return jsonify({'message': 'Şirket silindi'})


@admin_bp.route('/companies/<int:company_id>/children', methods=['GET'])
@admin_required
def list_company_children(company_id):
    """Şirketin alt mağazalarını listele."""
    Company.query.get_or_404(company_id)
    children = Company.query.filter_by(parent_id=company_id).order_by(Company.name).all()
    result = []
    for c in children:
        d = c.to_dict()
        d['user_count'] = User.query.filter_by(company_id=c.id).count()
        result.append(d)
    return jsonify({'children': result})


@admin_bp.route('/companies/<int:company_id>/children', methods=['POST'])
@admin_required
def add_child_company(company_id):
    """Mevcut bir şirketi alt mağaza olarak bağla veya yeni alt mağaza oluştur."""
    parent = Company.query.get_or_404(company_id)
    if parent.parent_id is not None:
        return jsonify({'error': 'Alt mağazanın altına tekrar alt mağaza eklenemez (maks 2 seviye)'}), 400

    data = request.get_json(silent=True) or {}
    child_id = data.get('child_id')

    if child_id:
        # Mevcut şirketi alt mağaza yap
        child = Company.query.get(child_id)
        if not child:
            return jsonify({'error': 'Alt mağaza bulunamadı'}), 404
        if child.id == company_id:
            return jsonify({'error': 'Şirket kendisinin alt mağazası olamaz'}), 400
        if child.parent_id is not None:
            return jsonify({'error': 'Bu şirket zaten başka bir şirketin alt mağazası'}), 400
        child.parent_id = company_id
        db.session.commit()
        return jsonify({'message': 'Alt mağaza bağlandı', 'child': child.to_dict()})
    else:
        # Yeni alt mağaza oluştur
        name = (data.get('name') or '').strip()
        if not name:
            return jsonify({'error': 'Şirket adı gerekli'}), 400
        if Company.query.filter(func.lower(Company.name) == name.lower()).first():
            return jsonify({'error': 'Bu şirket adı zaten mevcut'}), 400
        child = Company(name=name, parent_id=company_id, logo_base64=data.get('logo_base64'))
        db.session.add(child)
        db.session.commit()
        return jsonify({'message': 'Alt mağaza oluşturuldu', 'child': child.to_dict()}), 201


@admin_bp.route('/companies/<int:company_id>/children/<int:child_id>', methods=['DELETE'])
@admin_required
def remove_child_company(company_id, child_id):
    """Alt mağazayı üst şirketten ayır (silmez, bağımsız üst seviye yapar)."""
    Company.query.get_or_404(company_id)
    child = Company.query.filter_by(id=child_id, parent_id=company_id).first()
    if not child:
        return jsonify({'error': 'Bu alt mağaza bulunamadı'}), 404
    child.parent_id = None
    db.session.commit()
    return jsonify({'message': 'Alt mağaza bağımsız yapıldı'})


# =====================================================================
# COMPANY USERS (Şirket altında kullanıcı yönetimi)
# =====================================================================

@admin_bp.route('/companies/<int:company_id>/users', methods=['GET'])
@admin_required
def list_company_users(company_id):
    """Şirkete ait kullanıcıları listele."""
    Company.query.get_or_404(company_id)
    users = User.query.filter_by(company_id=company_id).order_by(User.created_at.desc()).all()
    return jsonify({'users': [u.to_public_dict() for u in users]})


@admin_bp.route('/companies/<int:company_id>/users', methods=['POST'])
@admin_required
def create_company_user(company_id):
    """Şirket altına yeni kullanıcı ekle."""
    Company.query.get_or_404(company_id)
    data = request.get_json(silent=True) or {}
    username = (data.get('username') or '').strip()
    email = (data.get('email') or '').strip()
    password = data.get('password')
    company_role = data.get('company_role', 'user')  # store_manager | user
    full_name = (data.get('full_name') or '').strip() or None

    if not username:
        return jsonify({'error': 'Kullanıcı adı gerekli'}), 400
    if not email:
        return jsonify({'error': 'E-posta gerekli'}), 400
    if not password:
        return jsonify({'error': 'Şifre gerekli'}), 400
    if company_role not in ('store_manager', 'user'):
        return jsonify({'error': 'Geçersiz rol. İzin verilenler: store_manager, user'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Bu kullanıcı adı zaten kullanılıyor'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Bu e-posta zaten kayıtlı'}), 400

    try:
        user = User(
            username=username,
            email=email,
            role='user',
            full_name=full_name,
            company_id=company_id,
            company_role=company_role,
        )
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Veritabanı hatası: {str(e)}'}), 400

    return jsonify({'message': 'Kullanıcı oluşturuldu', 'user': user.to_public_dict()}), 201


@admin_bp.route('/companies/<int:company_id>/users/<int:user_id>', methods=['PUT'])
@admin_required
def update_company_user(company_id, user_id):
    """Şirket altındaki kullanıcıyı güncelle."""
    Company.query.get_or_404(company_id)
    user = User.query.filter_by(id=user_id, company_id=company_id).first()
    if not user:
        return jsonify({'error': 'Kullanıcı bu şirkette bulunamadı'}), 404

    data = request.get_json(silent=True) or {}
    if 'email' in data:
        new_email = (data['email'] or '').strip()
        if new_email != user.email and User.query.filter_by(email=new_email).first():
            return jsonify({'error': 'Bu e-posta zaten kullanılıyor'}), 400
        user.email = new_email
    if 'full_name' in data:
        user.full_name = (data['full_name'] or '').strip() or None
    if 'company_role' in data:
        if data['company_role'] in ('store_manager', 'user'):
            user.company_role = data['company_role']
    if 'is_active' in data:
        user.is_active = bool(data['is_active'])
    if 'password' in data and data['password']:
        user.set_password(data['password'])

    db.session.commit()
    return jsonify({'message': 'Güncellendi', 'user': user.to_public_dict()})


@admin_bp.route('/companies/<int:company_id>/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_company_user(company_id, user_id):
    """Şirket altındaki kullanıcıyı sil."""
    Company.query.get_or_404(company_id)
    user = User.query.filter_by(id=user_id, company_id=company_id).first()
    if not user:
        return jsonify({'error': 'Kullanıcı bu şirkette bulunamadı'}), 404

    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'Kullanıcı silindi'})
