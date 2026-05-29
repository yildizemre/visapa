import os
import threading
import requests as http_requests
from datetime import datetime, timedelta

from flask import Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity

from models import db, User, ServiceHeartbeat
from auth_utils import admin_required

health_bp = Blueprint('health', __name__)

HEARTBEAT_TIMEOUT_MINUTES = 5

# Telegram bildirim ayarları
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT', '7922868902:AAEK-DPfMUsMB-QUCq8mVsU7p08k53FvCRE')
TELEGRAM_CHAT_ID = os.environ.get('TELEGRAM_ID', '-1002352857755')


def send_telegram_alert(message: str):
    """Telegram'a bildirim gönder."""
    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        http_requests.post(url, json={
            'chat_id': TELEGRAM_CHAT_ID,
            'text': message,
            'parse_mode': 'HTML'
        }, timeout=10)
    except Exception as e:
        print(f"[Telegram Alert Error] {e}")


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


def run_dead_service_check():
    """
    Dead service kontrolünü çalıştırır. Hem route hem scheduler tarafından çağrılabilir.
    Flask uygulama context'i içinde çağrılmalıdır.
    """
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)

    dead_services = ServiceHeartbeat.query.filter(
        ServiceHeartbeat.last_ping_at < one_hour_ago
    ).all()

    all_store_users = User.query.filter(User.role != 'admin').all()
    heartbeat_user_ids = {h.user_id for h in ServiceHeartbeat.query.all()}
    never_pinged = [u for u in all_store_users if u.id not in heartbeat_user_ids]

    alerts = []

    for service in dead_services:
        user = User.query.get(service.user_id)
        if user:
            name = user.full_name or user.username
            last_ping = service.last_ping_at.strftime('%d.%m.%Y %H:%M')
            alerts.append(f"⚠️ <b>{name}</b> — Son sinyal: {last_ping}")

    for user in never_pinged:
        name = user.full_name or user.username
        alerts.append(f"🔴 <b>{name}</b> — Hiç sinyal gelmedi")

    if alerts:
        now = datetime.utcnow().strftime('%d.%m.%Y %H:%M UTC')
        message = f"🚨 <b>Vislivis Sağlık Uyarısı</b>\n📅 {now}\n\n"
        message += "Son 1 saat içinde sinyal alınamayan mağazalar:\n\n"
        message += "\n".join(alerts)
        message += "\n\n⚡ Lütfen ilgili mağazaların sistem durumunu kontrol edin."

        thread = threading.Thread(target=send_telegram_alert, args=(message,))
        thread.start()

    return {
        'checked_at': datetime.utcnow().isoformat(),
        'dead_count': len(dead_services),
        'never_pinged_count': len(never_pinged),
        'alerts_sent': len(alerts) > 0,
        'details': alerts
    }


@health_bp.route('/check-dead-services', methods=['GET'])
def check_dead_services():
    """Cron veya manuel tetikleme için route. Aynı zamanda scheduler da run_dead_service_check'i çağırır."""
    result = run_dead_service_check()
    return result
