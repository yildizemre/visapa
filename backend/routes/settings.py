from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity

import json
from models import db, User, SiteConfig, CameraConfig, CameraZone, ManagedStore
from user_context import get_settings_user_id, get_resolved_user_ids
from auth_utils import write_permission_required

settings_bp = Blueprint('settings', __name__)




@settings_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    user = User.query.get_or_404(get_jwt_identity())
    return user.to_dict()


@settings_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user = User.query.get_or_404(get_jwt_identity())
    data = request.get_json()
    if 'fullName' in data:
        user.full_name = data['fullName']
    if 'email' in data:
        if data['email'] != user.email and User.query.filter_by(email=data['email']).first():
            return {'error': 'E-posta zaten kullanılıyor'}, 400
        user.email = data['email']
    db.session.commit()
    return user.to_dict()


@settings_bp.route('/password', methods=['PUT'])
@jwt_required()
def change_password():
    user = User.query.get_or_404(get_jwt_identity())
    data = request.get_json()
    current = data.get('currentPassword')
    new_pass = data.get('newPassword')
    if not current or not new_pass:
        return {'error': 'Mevcut ve yeni şifre gerekli'}, 400
    if not user.check_password(current):
        return {'error': 'Mevcut şifre yanlış'}, 400
    user.set_password(new_pass)
    db.session.commit()
    return {'message': 'Şifre güncellendi'}


@settings_bp.route('/report-recipients', methods=['GET'])
@jwt_required()
def get_report_recipients():
    return {'recipients': []}


@settings_bp.route('/report-recipients', methods=['POST'])
@jwt_required()
def add_report_recipient():
    return {'message': 'Eklendi'}


@settings_bp.route('/report-recipients/<int:rid>', methods=['DELETE'])
@jwt_required()
def delete_report_recipient(rid):
    return {'message': 'Silindi'}


@settings_bp.route('/appearance', methods=['GET'])
@jwt_required()
def get_appearance():
    return {'language': 'tr', 'dateFormat': 'DD.MM.YYYY', 'timeFormat': '24h', 'isDarkMode': True}


@settings_bp.route('/appearance', methods=['PUT'])
@jwt_required()
def update_appearance():
    return {'message': 'Güncellendi'}


@settings_bp.route('/managed-stores', methods=['GET'])
@jwt_required()
def get_managed_stores():
    """Marka yöneticisi için yönettiği mağaza listesi (store switcher)."""
    user_id = get_jwt_identity()
    rows = ManagedStore.query.filter_by(manager_user_id=user_id).all()
    stores = []
    for r in rows:
        u = User.query.get(r.store_user_id)
        if u:
            stores.append({'id': u.id, 'username': u.username, 'full_name': u.full_name or u.username})
    return {'stores': stores}


# --- Kurulum: Site + Kameralar ---
@settings_bp.route('/work-hours', methods=['GET'])
@jwt_required()
def get_work_hours():
    """Mesai saatlerini getir: {work_start, work_end}"""
    user_id = get_settings_user_id() or get_jwt_identity()
    site = SiteConfig.query.filter_by(user_id=user_id).first()
    return {
        'work_start': (site.work_start if site and site.work_start is not None else 10),
        'work_end': (site.work_end if site and site.work_end is not None else 22),
    }


@settings_bp.route('/work-hours', methods=['PUT'])
@jwt_required()
@write_permission_required
def update_work_hours():
    """Mesai saatlerini güncelle. Body: {work_start, work_end}"""
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    start = data.get('work_start')
    end = data.get('work_end')
    if start is None or end is None:
        return {'error': 'work_start ve work_end gerekli'}, 400
    start = int(start)
    end = int(end)
    if not (0 <= start <= 23 and 0 <= end <= 23 and start < end):
        return {'error': 'Geçersiz saat aralığı (0-23, başlangıç < bitiş)'}, 400
    site = SiteConfig.query.filter_by(user_id=user_id).first()
    if site:
        site.work_start = start
        site.work_end = end
    else:
        site = SiteConfig(user_id=user_id, work_start=start, work_end=end)
        db.session.add(site)
    db.session.commit()
    return {'work_start': start, 'work_end': end, 'message': 'Mesai saatleri güncellendi'}


@settings_bp.route('/cameras', methods=['GET'])
@jwt_required()
def get_cameras():
    user_id = get_settings_user_id()
    if not user_id:
        user_id = get_jwt_identity()
    site = SiteConfig.query.filter_by(user_id=user_id).first()
    cameras = CameraConfig.query.filter_by(user_id=user_id).order_by(CameraConfig.sort_order, CameraConfig.id).all()
    items = []
    for c in cameras:
        img = c.image_base64
        if img and not img.startswith('data:'):
            img = f'data:image/jpeg;base64,{img}' if img else None
        items.append({
            'id': c.id,
            'name': c.name,
            'type': c.camera_type or 'Kapı',
            'rtsp': c.rtsp_url or '',
            'imageUrl': img or '',
        })
    return {'site_name': site.site_name if site else None, 'cameras': items}


@settings_bp.route('/cameras', methods=['POST'])
@jwt_required()
@write_permission_required
def add_camera():
    """Tek kamera ekle. Body: {name, type, rtsp, image_base64}"""
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    img = data.get('image_base64') or data.get('imageBase64') or data.get('imageUrl') or ''
    if img and img.startswith('data:image'):
        img = img.split(',', 1)[-1] if ',' in img else img
    max_order = db.session.query(db.func.max(CameraConfig.sort_order)).filter_by(user_id=user_id).scalar() or 0
    cam = CameraConfig(
        user_id=user_id,
        name=(data.get('name') or 'Kamera').strip(),
        camera_type=data.get('type') or data.get('camera_type') or 'Kişi Sayım',
        rtsp_url=data.get('rtsp') or data.get('rtsp_url') or '',
        image_base64=img or None,
        sort_order=max_order + 1,
    )
    db.session.add(cam)
    db.session.commit()
    return {
        'id': cam.id,
        'name': cam.name,
        'type': cam.camera_type,
        'rtsp': cam.rtsp_url or '',
        'imageUrl': ('data:image/jpeg;base64,' + cam.image_base64) if cam.image_base64 else '',
        'message': 'Kamera eklendi',
    }, 201


@settings_bp.route('/cameras/<int:camera_id>', methods=['DELETE'])
@jwt_required()
@write_permission_required
def delete_camera(camera_id):
    """Tek kamera sil."""
    user_id = get_jwt_identity()
    cam = CameraConfig.query.filter_by(id=camera_id, user_id=user_id).first_or_404()
    db.session.delete(cam)
    db.session.commit()
    return {'message': 'Kamera silindi'}


@settings_bp.route('/cameras/<int:camera_id>', methods=['PATCH'])
@jwt_required()
@write_permission_required
def update_camera(camera_id):
    """Tek kamera güncelle: isim, tip, konum."""
    user_id = get_jwt_identity()
    cam = CameraConfig.query.filter_by(id=camera_id, user_id=user_id).first_or_404()
    data = request.get_json() or {}
    if 'name' in data and data['name']:
        cam.name = data['name'].strip()
    if 'type' in data and data['type']:
        cam.camera_type = data['type'].strip()
    if 'location' in data:
        cam.rtsp_url = (cam.rtsp_url or '') if data['location'] is None else data['location']
    db.session.commit()
    return {
        'id': cam.id,
        'name': cam.name,
        'type': cam.camera_type or 'Kapı',
        'rtsp': cam.rtsp_url or '',
    }


@settings_bp.route('/setup', methods=['POST'])
@jwt_required()
@write_permission_required
def post_setup():
    """Kurulum gönder: site_name + cameras. Mağaza kullanıcısı için kaydedilir (data_sender)."""
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    site_name = data.get('site_name') or data.get('siteName') or ''

    site = SiteConfig.query.filter_by(user_id=user_id).first()
    if site:
        site.site_name = site_name
    else:
        site = SiteConfig(user_id=user_id, site_name=site_name)
        db.session.add(site)
    db.session.commit()

    cameras_data = data.get('cameras') or []

    # Mevcut kameraları isim bazlı indeksle
    existing = CameraConfig.query.filter_by(user_id=user_id).all()
    existing_by_name = {}
    for c in existing:
        key = (c.name or '').strip().lower()
        if key not in existing_by_name:
            existing_by_name[key] = c

    seen_ids = set()
    for i, cam in enumerate(cameras_data):
        name = (cam.get('name') or f'Kamera {i+1}').strip()
        cam_type = cam.get('type') or cam.get('camera_type') or 'Kişi Sayım'
        rtsp = cam.get('rtsp') or cam.get('rtsp_url') or ''
        img = cam.get('image_base64') or cam.get('imageBase64') or ''
        if img and img.startswith('data:image'):
            img = img.split(',', 1)[-1] if ',' in img else img

        key = name.lower()
        if key in existing_by_name:
            # Mevcut kaydı güncelle: eğer yeni veri daha doluysa (img var) veya tip/rtsp farklıysa
            r = existing_by_name[key]
            r.camera_type = cam_type
            r.rtsp_url = rtsp
            r.sort_order = i
            if img:  # Yeni veri fotoğraf içeriyorsa güncelle
                r.image_base64 = img
            # Eğer mevcut kayıtta fotoğraf varsa yeni boş gelirse mevcut korunur (üstteki if ile)
            seen_ids.add(r.id)
        else:
            r = CameraConfig(
                user_id=user_id,
                name=name,
                camera_type=cam_type,
                rtsp_url=rtsp,
                image_base64=img or None,
                sort_order=i,
            )
            db.session.add(r)
            db.session.flush()  # id almak için
            seen_ids.add(r.id)

    # Gönderilmeyen (artık listede olmayan) kameraları sil
    for c in existing:
        if c.id not in seen_ids:
            db.session.delete(c)

    db.session.commit()
    return {'message': 'Kurulum kaydedildi', 'site_name': site_name}


# --- Kamera Zone (Alan) API ---

@settings_bp.route('/cameras/<int:camera_id>/zones', methods=['GET'])
@jwt_required()
def get_camera_zones(camera_id):
    """Bir kameranın tüm zone'larını listele."""
    user_id = get_settings_user_id() or get_jwt_identity()
    cam = CameraConfig.query.filter_by(id=camera_id, user_id=user_id).first_or_404()
    zones = CameraZone.query.filter_by(camera_id=cam.id, user_id=user_id).order_by(CameraZone.sort_order, CameraZone.id).all()
    return {'zones': [z.to_dict() for z in zones]}


@settings_bp.route('/cameras/<int:camera_id>/zones', methods=['POST'])
@jwt_required()
@write_permission_required
def create_camera_zone(camera_id):
    """Yeni zone oluştur. Body: {name, points, color}"""
    user_id = get_jwt_identity()
    cam = CameraConfig.query.filter_by(id=camera_id, user_id=user_id).first_or_404()
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    points = data.get('points', [])
    color = data.get('color', '#3b82f6')
    if not name:
        return {'error': 'Alan adı gerekli'}, 400
    if not points or len(points) < 3:
        return {'error': 'En az 3 nokta gerekli'}, 400
    max_order = db.session.query(db.func.max(CameraZone.sort_order)).filter_by(camera_id=cam.id).scalar() or 0
    zone = CameraZone(
        camera_id=cam.id,
        user_id=user_id,
        name=name,
        points=json.dumps(points),
        color=color,
        sort_order=max_order + 1,
    )
    db.session.add(zone)
    db.session.commit()
    return zone.to_dict(), 201


@settings_bp.route('/cameras/<int:camera_id>/zones/<int:zone_id>', methods=['PATCH'])
@jwt_required()
@write_permission_required
def update_camera_zone(camera_id, zone_id):
    """Zone güncelle: name, points, color"""
    user_id = get_jwt_identity()
    zone = CameraZone.query.filter_by(id=zone_id, camera_id=camera_id, user_id=user_id).first_or_404()
    data = request.get_json() or {}
    if 'name' in data and data['name']:
        zone.name = data['name'].strip()
    if 'points' in data and data['points']:
        zone.points = json.dumps(data['points'])
    if 'color' in data:
        zone.color = data['color']
    db.session.commit()
    return zone.to_dict()


@settings_bp.route('/cameras/<int:camera_id>/zones/<int:zone_id>', methods=['DELETE'])
@jwt_required()
@write_permission_required
def delete_camera_zone(camera_id, zone_id):
    """Zone sil."""
    user_id = get_jwt_identity()
    zone = CameraZone.query.filter_by(id=zone_id, camera_id=camera_id, user_id=user_id).first_or_404()
    db.session.delete(zone)
    db.session.commit()
    return {'message': 'Alan silindi'}
