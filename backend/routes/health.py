from datetime import datetime, timedelta

from flask import Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity

from models import db, User, ServiceHeartbeat
from auth_utils import admin_required

health_bp = Blueprint('health', __name__)

HEARTBEAT_TIMEOUT_MINUTES = 5


@health_bp.route('/status', methods=['GET'])
def status():
    return {'status': 'ok', 'service': 'vislivis'}


@health_bp.route('/heartbeat', methods=['POST'])
@jwt_required()
def heartbeat():
    """Mağaza AI servisi her 5 dakikada bir çağırır: 'ben ayaktayım'."""
    user_id = get_jwt_identity()
    now = datetime.utcnow()

    rec = ServiceHeartbeat.query.filter_by(user_id=user_id).first()
    if rec:
        rec.last_ping_at = now
    else:
        rec = ServiceHeartbeat(user_id=user_id, last_ping_at=now)
        db.session.add(rec)
    db.session.commit()
    return {'status': 'ok', 'last_ping_at': rec.last_ping_at.isoformat()}


@health_bp.route('/heartbeat/status', methods=['GET'])
@jwt_required()
def heartbeat_status():
    """Panel: mağaza servisinin son ping'ine bakar. 5 dk içindeyse yeşil, değilse kırmızı."""
    user_id = get_jwt_identity()
    rec = ServiceHeartbeat.query.filter_by(user_id=user_id).first()

    if not rec:
        return {
            'is_alive': False,
            'last_ping_at': None,
            'message': 'Henüz heartbeat gelmedi. Mağaza scripti çalışıyor mu?'
        }

    cutoff = datetime.utcnow() - timedelta(minutes=HEARTBEAT_TIMEOUT_MINUTES)
    is_alive = rec.last_ping_at >= cutoff

    return {
        'is_alive': is_alive,
        'last_ping_at': rec.last_ping_at.isoformat(),
        'message': 'Mağaza servisi ayakta' if is_alive else '5 dakikadır veri gelmiyor. Sistem çökmüş olabilir.'
    }


@health_bp.route('/admin/overview', methods=['GET'])
@admin_required
def admin_health_overview():
    """Admin: Tüm kullanıcıları Mağaza AI sağlık durumu ile listeler. Kırmızı (ölü) üstte."""
    cutoff = datetime.utcnow() - timedelta(minutes=HEARTBEAT_TIMEOUT_MINUTES)
    users = User.query.filter(User.role != 'admin').order_by(User.full_name, User.username).all()
    heartbeats = {h.user_id: h for h in ServiceHeartbeat.query.filter(ServiceHeartbeat.user_id.in_([u.id for u in users])).all()}
    result = []
    for u in users:
        h = heartbeats.get(u.id)
        last_ping_at = h.last_ping_at if h else None
        is_alive = last_ping_at is not None and last_ping_at >= cutoff
        result.append({
            'id': u.id,
            'username': u.username,
            'email': u.email,
            'full_name': u.full_name,
            'role': u.role,
            'is_alive': is_alive,
            'last_ping_at': last_ping_at.isoformat() if last_ping_at else None,
        })
    result.sort(key=lambda x: x['is_alive'])
    return {'users': result}
