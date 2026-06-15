import os
import threading
import requests as http_requests
from datetime import datetime, timedelta

from flask import Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity

from models import db, User, ServiceHeartbeat
from auth_utils import admin_required

health_bp = Blueprint('health', __name__)

HEARTBEAT_TIMEOUT_MINUTES = 10

# Telegram bildirim ayarları (env var olarak ayarlanmalı: TELEGRAM_BOT, TELEGRAM_ID)
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT', '')
TELEGRAM_CHAT_ID = os.environ.get('TELEGRAM_ID', '')


def send_telegram_alert(message: str):
    """Telegram'a bildirim gönder."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print("[Telegram Alert] TELEGRAM_BOT veya TELEGRAM_ID env var ayarlanmamış, bildirim atlanıyor.")
        return
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


PING_INTERVAL_MINUTES = 10   # Modül her 10 dk'da 1 ping atar
PINGS_PER_HOUR = 60 // PING_INTERVAL_MINUTES  # = 6

@health_bp.route('/heartbeat', methods=['POST'])
@jwt_required()
def heartbeat():
    """Mağaza AI servisi her 10 dakikada bir çağırır: 'ben ayaktayım'."""
    user_id = get_jwt_identity()
    now = datetime.utcnow()
    window_duration = timedelta(hours=1)

    rec = ServiceHeartbeat.query.filter_by(user_id=user_id).first()
    if rec:
        # Pencere süresi dolmuşsa yeni pencere başlat
        if rec.window_start is None or (now - rec.window_start) >= window_duration:
            rec.window_start = now
            rec.received_pings = 1
            rec.expected_pings = PINGS_PER_HOUR
        else:
            # Aynı penceredeyiz: kaçılan ping sayısını hesapla
            elapsed_min = (now - rec.last_ping_at).total_seconds() / 60
            missed = max(0, int(elapsed_min / PING_INTERVAL_MINUTES) - 1)
            rec.received_pings = min(rec.received_pings + 1, PINGS_PER_HOUR)
            rec.expected_pings = min(
                int((now - rec.window_start).total_seconds() / 60 / PING_INTERVAL_MINUTES) + 1,
                PINGS_PER_HOUR
            )
            # missed kullanılmıyor ama ileride log için tutulabilir
            _ = missed
        rec.last_ping_at = now
    else:
        rec = ServiceHeartbeat(
            user_id=user_id,
            last_ping_at=now,
            window_start=now,
            received_pings=1,
            expected_pings=PINGS_PER_HOUR,
        )
        db.session.add(rec)
    db.session.commit()
    return {
        'status': 'ok',
        'last_ping_at': rec.last_ping_at.isoformat() + 'Z',
        'ratio': f"{rec.received_pings}/{rec.expected_pings}",
    }


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
        'last_ping_at': rec.last_ping_at.isoformat() + 'Z',
        'message': 'Mağaza servisi ayakta' if is_alive else '5 dakikadır veri gelmiyor. Sistem çökmüş olabilir.'
    }


def get_dynamic_ratio(h, cutoff_alive):
    """
    ServiceHeartbeat için gerçekçi ve dinamik oran hesaplar.
    Son 1 saatlik rolling pencereye göre kaç ping geldiğini ve beklendiğini döner.
    """
    if not h or not h.last_ping_at:
        return 0, 6, "0/6"
        
    now = datetime.utcnow()
    
    # 1. Eğer son sinyal 1 saatten eski ise tamamen sıfırlanmıştır
    if (now - h.last_ping_at) >= timedelta(hours=1):
        return 0, 6, "0/6"
        
    # 2. Son sinyal 1 saat içindeyse:
    received = getattr(h, 'received_pings', 0) or 0
    expected = getattr(h, 'expected_pings', 6) or 6
    
    # Eğer son ping'den bu yana normal aralıktan (10 dk) daha fazla süre geçtiyse,
    # beklenen ping sayısını artırıp oranı dinamik olarak düşürmeliyiz.
    elapsed_since_last_min = (now - h.last_ping_at).total_seconds() / 60
    if elapsed_since_last_min > 11:  # 1 dk tolerans
        missed = int(elapsed_since_last_min / 10)
        expected = min(expected + missed, 6)
        
    # Her zaman received <= expected olmalı
    received = min(received, expected)
    if expected == 0:
        expected = 6
        
    return received, expected, f"{received}/{expected}"


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
        received, expected, ratio = get_dynamic_ratio(h, cutoff)
        result.append({
            'id': u.id,
            'username': u.username,
            'email': u.email,
            'full_name': u.full_name,
            'role': u.role,
            'is_alive': is_alive,
            'last_ping_at': (last_ping_at.isoformat() + 'Z') if last_ping_at else None,
            'received_pings': received,
            'expected_pings': expected,
            'ratio': ratio,
        })
    result.sort(key=lambda x: x['is_alive'])
    return {'users': result}


def run_dead_service_check():
    """
    Dead service kontrolünü çalıştırır. Hem route hem scheduler tarafından çağrılabilir.
    Flask uygulama context'i içinde çağrılmalıdır.
    """
    cutoff = datetime.utcnow() - timedelta(minutes=HEARTBEAT_TIMEOUT_MINUTES)

    all_heartbeats = ServiceHeartbeat.query.all()
    heartbeat_map = {h.user_id: h for h in all_heartbeats}

    all_store_users = User.query.filter(User.role != 'admin', User.is_active == True).all()

    dead_users = []
    alive_users = []

    for u in all_store_users:
        h = heartbeat_map.get(u.id)
        if h is None:
            continue  # Hiç ping gelmemiş — uyarıya dahil etme
        if h.last_ping_at < cutoff:
            dead_users.append((u, h))
        else:
            alive_users.append((u, h))

    dead_lines = []
    for user, service in dead_users:
        name = user.full_name or user.username
        # Türkiye yerel saatine (+3 saat) dönüştürme yapıyoruz
        local_ping_dt = service.last_ping_at + timedelta(hours=3)
        last_ping = local_ping_dt.strftime('%d.%m.%Y %H:%M')
        received, expected, ratio = get_dynamic_ratio(service, cutoff)
        dead_lines.append(f"🔴 <b>{name}</b> — KAPALI\n   Son sinyal: {last_ping} TSİ | Oran: {ratio}")

    alive_lines = []
    for user, service in alive_users:
        name = user.full_name or user.username
        # Türkiye yerel saatine (+3 saat) dönüştürme yapıyoruz
        local_ping_dt = service.last_ping_at + timedelta(hours=3)
        last_ping = local_ping_dt.strftime('%d.%m.%Y %H:%M')
        received, expected, ratio = get_dynamic_ratio(service, cutoff)
        status_icon = "✅" if received >= expected else "⚠️"
        alive_lines.append(f"{status_icon} <b>{name}</b> — AKTİF\n   Son sinyal: {last_ping} TSİ | Oran: {ratio}")

    if dead_lines or alive_lines:
        # Türkiye yerel saatine (+3 saat) dönüştürme yapıyoruz
        now_str = (datetime.utcnow() + timedelta(hours=3)).strftime('%d.%m.%Y %H:%M TSİ')
        message = f"📊 <b>Vislivis Sistem Durumu</b>\n📅 {now_str}\n\n"

        if dead_lines:
            message += f"<b>❌ Kapalı Mağazalar ({len(dead_lines)}):</b>\n"
            message += "\n\n".join(dead_lines)
            message += "\n\n"

        if alive_lines:
            message += f"<b>✅ Açık Mağazalar ({len(alive_lines)}):</b>\n"
            message += "\n\n".join(alive_lines)
            message += "\n"

        if dead_lines:
            message += "\n⚡ Lütfen kapalı mağazaların sistem durumunu kontrol edin."

        thread = threading.Thread(target=send_telegram_alert, args=(message,))
        thread.daemon = True
        thread.start()

    return {
        'checked_at': datetime.utcnow().isoformat(),
        'dead_count': len(dead_lines),
        'alive_count': len(alive_lines),
        'alerts_sent': len(dead_lines) > 0 or len(alive_lines) > 0,
        'details': dead_lines
    }


@health_bp.route('/check-dead-services', methods=['GET'])
@admin_required
def check_dead_services():
    """Cron veya manuel tetikleme için route. Admin JWT gerektirir."""
    result = run_dead_service_check()
    return result
