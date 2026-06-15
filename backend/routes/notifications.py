"""
Anomali Tespiti & Bildirim Sistemi
- Saatlik müşteri akışı ortalamanın %50 altına düştüğünde uyarı
- Kuyruk bekleme süresi eşiği aştığında uyarı
- Telegram + Panel içi bildirim
"""
import threading
from datetime import datetime, timedelta
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from models import db, CustomerData, QueueData, Notification, User
from user_context import get_resolved_user_ids
from auth_utils import admin_required

notifications_bp = Blueprint('notifications', __name__)

# Eşik değerleri
CUSTOMER_DROP_THRESHOLD = 0.50  # Ortalamanın %50 altı
QUEUE_WAIT_THRESHOLD_SECONDS = 180  # 3 dakika üzeri kuyruk bekleme


def _get_telegram_config():
    """Telegram config'i health.py'den al (tek kaynak)."""
    import os
    bot_token = os.environ.get('TELEGRAM_BOT', '')
    chat_id = os.environ.get('TELEGRAM_ID', '')
    return bot_token, chat_id


def _send_telegram(message: str):
    """Telegram bildirim gönder."""
    bot_token, chat_id = _get_telegram_config()
    if not bot_token or not chat_id:
        return
    try:
        import requests as http_requests
        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        http_requests.post(url, json={
            'chat_id': chat_id,
            'text': message,
            'parse_mode': 'HTML'
        }, timeout=10)
    except Exception as e:
        print(f"[Anomaly Telegram Error] {e}")


def check_anomalies_for_user(user_id: int, user_name: str = ''):
    """
    Belirli bir kullanıcı için anomali kontrolü yapar.
    Bu fonksiyon, veri POST edildiğinde (saatlik veri geldiğinde) çağrılır.
    """
    now = datetime.now()
    current_hour = now.hour
    
    # Son 7 günün aynı saatindeki ortalama müşteri sayısını hesapla
    seven_days_ago = now - timedelta(days=7)
    
    historical_rows = CustomerData.query.filter(
        CustomerData.user_id == user_id,
        CustomerData.timestamp >= seven_days_ago,
        CustomerData.timestamp < now - timedelta(hours=1),
    ).all()
    
    # Aynı saatteki geçmiş veriler
    same_hour_entries = [
        r for r in historical_rows 
        if r.timestamp and r.timestamp.hour == current_hour
    ]
    
    if len(same_hour_entries) < 3:
        return  # Yeterli geçmiş veri yok, anomali tespiti yapma
    
    avg_entered = sum(getattr(r, 'entered', 0) or 0 for r in same_hour_entries) / len(same_hour_entries)
    
    # Bugünün bu saatindeki veri
    today_start = datetime.combine(now.date(), datetime.min.time())
    today_hour_start = today_start.replace(hour=current_hour)
    today_hour_end = today_hour_start + timedelta(hours=1)
    
    today_rows = CustomerData.query.filter(
        CustomerData.user_id == user_id,
        CustomerData.timestamp >= today_hour_start,
        CustomerData.timestamp < today_hour_end,
    ).all()
    
    today_entered = sum(getattr(r, 'entered', 0) or 0 for r in today_rows)
    
    alerts = []
    
    # Anomali 1: Müşteri trafiği ortalamanın %50 altında
    if avg_entered > 0 and today_entered < avg_entered * CUSTOMER_DROP_THRESHOLD:
        drop_pct = round((1 - today_entered / avg_entered) * 100, 1)
        title = f"Müşteri Trafiği Düşük ({current_hour}:00)"
        message = (
            f"Saat {current_hour}:00'da {today_entered} müşteri girişi yapıldı. "
            f"7 günlük ortalama: {round(avg_entered)} ({drop_pct}% düşüş)."
        )
        alerts.append(('anomaly', title, message))
    
    # Anomali 2: Kuyruk bekleme süresi eşiği
    queue_rows = QueueData.query.filter(
        QueueData.user_id == user_id,
        db.func.coalesce(QueueData.recorded_at, QueueData.created_at) >= today_hour_start,
        db.func.coalesce(QueueData.recorded_at, QueueData.created_at) < today_hour_end,
    ).all()
    
    if queue_rows:
        waits = [r.wait_time for r in queue_rows if r.wait_time]
        if waits:
            avg_wait = sum(waits) / len(waits)
            if avg_wait > QUEUE_WAIT_THRESHOLD_SECONDS:
                wait_min = round(avg_wait / 60, 1)
                title = f"Kuyruk Süresi Yüksek ({current_hour}:00)"
                message = (
                    f"Saat {current_hour}:00'da ortalama kuyruk bekleme süresi {wait_min} dakika. "
                    f"Eşik: {QUEUE_WAIT_THRESHOLD_SECONDS // 60} dakika."
                )
                alerts.append(('warning', title, message))
    
    # Bildirimleri kaydet ve Telegram'a gönder
    for alert_type, title, message in alerts:
        # Aynı bildirim bugün zaten varsa tekrarlama
        existing = Notification.query.filter(
            Notification.user_id == user_id,
            Notification.title == title,
            Notification.created_at >= today_start,
        ).first()
        
        if existing:
            continue
        
        # DB'ye kaydet
        notif = Notification(
            user_id=user_id,
            type=alert_type,
            title=title,
            message=message,
        )
        db.session.add(notif)
        db.session.commit()
        
        # Telegram'a gönder
        store_name = user_name or f"User #{user_id}"
        emoji = "⚠️" if alert_type == 'warning' else "🔴"
        tg_message = (
            f"{emoji} <b>Anomali Tespiti</b>\n"
            f"🏪 {store_name}\n"
            f"📌 {title}\n"
            f"💬 {message}"
        )
        thread = threading.Thread(target=_send_telegram, args=(tg_message,))
        thread.daemon = True
        thread.start()


# --- API Endpoints ---

@notifications_bp.route('/notifications', methods=['GET'])
@jwt_required()
def get_notifications():
    """Kullanıcının bildirimlerini listele."""
    user_ids, _ = get_resolved_user_ids()
    if not user_ids:
        user_ids = [get_jwt_identity()]
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    unread_only = request.args.get('unread', 'false').lower() == 'true'
    
    q = Notification.query.filter(Notification.user_id.in_(user_ids))
    if unread_only:
        q = q.filter(Notification.is_read == False)
    
    pagination = q.order_by(Notification.created_at.desc()).paginate(page=page, per_page=per_page)
    
    return {
        'notifications': [n.to_dict() for n in pagination.items],
        'total': pagination.total,
        'unread_count': Notification.query.filter(
            Notification.user_id.in_(user_ids),
            Notification.is_read == False
        ).count(),
    }


@notifications_bp.route('/notifications/unread-count', methods=['GET'])
@jwt_required()
def get_unread_count():
    """Okunmamış bildirim sayısı (badge için)."""
    user_ids, _ = get_resolved_user_ids()
    if not user_ids:
        user_ids = [get_jwt_identity()]
    
    count = Notification.query.filter(
        Notification.user_id.in_(user_ids),
        Notification.is_read == False
    ).count()
    
    return {'unread_count': count}


@notifications_bp.route('/notifications/mark-read', methods=['POST'])
@jwt_required()
def mark_notifications_read():
    """Bildirimleri okundu olarak işaretle."""
    user_ids, _ = get_resolved_user_ids()
    if not user_ids:
        user_ids = [get_jwt_identity()]
    
    data = request.get_json() or {}
    notification_ids = data.get('ids')  # Belirli ID'ler veya None (tümü)
    
    q = Notification.query.filter(
        Notification.user_id.in_(user_ids),
        Notification.is_read == False
    )
    if notification_ids:
        q = q.filter(Notification.id.in_(notification_ids))
    
    q.update({Notification.is_read: True}, synchronize_session=False)
    db.session.commit()
    
    return {'message': 'Bildirimler okundu olarak işaretlendi'}


@notifications_bp.route('/notifications/<int:notif_id>', methods=['DELETE'])
@jwt_required()
def delete_notification(notif_id: int):
    """Tek bir bildirimi sil."""
    user_ids, _ = get_resolved_user_ids()
    if not user_ids:
        user_ids = [get_jwt_identity()]
    notif = Notification.query.filter(
        Notification.id == notif_id,
        Notification.user_id.in_(user_ids)
    ).first()
    if not notif:
        return {'error': 'Bildirim bulunamadı'}, 404
    db.session.delete(notif)
    db.session.commit()
    return {'message': 'Bildirim silindi'}


@notifications_bp.route('/notifications/delete-all', methods=['DELETE'])
@jwt_required()
def delete_all_notifications():
    """Tüm bildirimleri sil."""
    user_ids, _ = get_resolved_user_ids()
    if not user_ids:
        user_ids = [get_jwt_identity()]
    Notification.query.filter(Notification.user_id.in_(user_ids)).delete(synchronize_session=False)
    db.session.commit()
    return {'message': 'Tüm bildirimler silindi'}


@notifications_bp.route('/notifications/check-anomalies', methods=['POST'])
@jwt_required()
def trigger_anomaly_check():
    """
    Manuel anomali kontrolü tetikle. 
    Normalde veri POST edildiğinde otomatik çağrılır.
    """
    user_id = get_jwt_identity()
    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return {'error': 'Geçersiz kullanıcı'}, 400
    
    user = User.query.get(user_id)
    user_name = user.full_name or user.username if user else ''
    
    check_anomalies_for_user(user_id, user_name)
    
    return {'message': 'Anomali kontrolü tamamlandı'}
