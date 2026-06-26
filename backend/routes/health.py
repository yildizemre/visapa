import os
import json
import threading
import requests as http_requests
from datetime import datetime, timedelta

from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from models import db, User, ServiceHeartbeat
from auth_utils import admin_required

health_bp = Blueprint('health', __name__)

# Modül bazlı heartbeat: veri saatte 1 gelir (analytics POST ile güncellenir).
# 90 dakika içinde ping gelmediyse modülü kapalı sayar (1 saat + 30dk tolerans).
MODULE_TIMEOUT_MINUTES = 90
KNOWN_MODULES = ['counting', 'heatmap', 'queue']

# Telegram bildirim ayarları
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT', '')
TELEGRAM_CHAT_ID = os.environ.get('TELEGRAM_ID', '')


def _get_telegram_config():
    """Telegram config'i her seferinde env'den taze oku."""
    return os.environ.get('TELEGRAM_BOT', ''), os.environ.get('TELEGRAM_ID', '')


def send_telegram_alert(message: str):
    """Telegram'a bildirim gönder."""
    bot_token, chat_id = _get_telegram_config()
    if not bot_token or not chat_id:
        print("[Telegram Alert] TELEGRAM_BOT veya TELEGRAM_ID env var ayarlanmamış, bildirim atlanıyor.")
        return
    try:
        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        http_requests.post(url, json={
            'chat_id': chat_id,
            'text': message,
            'parse_mode': 'HTML'
        }, timeout=10)
    except Exception as e:
        print(f"[Telegram Alert Error] {e}")


def update_module_heartbeat(user_id, module):
    """Belirli bir modül için heartbeat zamanını günceller veya oluşturur."""
    if module not in KNOWN_MODULES:
        return
    try:
        now = datetime.utcnow()
        rec = ServiceHeartbeat.query.filter_by(user_id=user_id).first()
        if rec:
            module_pings = _load_module_pings(rec)
            module_pings[module] = now.isoformat()
            rec.module_pings = json.dumps(module_pings)
            rec.last_ping_at = now
        else:
            module_pings = {m: (now.isoformat() if m == module else None) for m in KNOWN_MODULES}
            rec = ServiceHeartbeat(
                user_id=user_id,
                last_ping_at=now,
                module_pings=json.dumps(module_pings),
                received_pings=1,
                expected_pings=len(KNOWN_MODULES),
            )
            db.session.add(rec)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"[Heartbeat Auto-Update Error] {e}")


def _load_module_pings(rec) -> dict:
    """ServiceHeartbeat kaydından module_pings dict'ini yükle."""
    if not rec or not rec.module_pings:
        return {}
    try:
        return json.loads(rec.module_pings)
    except Exception:
        return {}


def _module_status(module_pings: dict, now: datetime):
    """
    Her modül için alive/dead durumunu döndür.
    Returns: dict {module: {'alive': bool, 'last_ping_at': iso|None}}
    """
    cutoff = now - timedelta(minutes=MODULE_TIMEOUT_MINUTES)
    result = {}
    for m in KNOWN_MODULES:
        ts_str = module_pings.get(m)
        if ts_str:
            try:
                ts = datetime.fromisoformat(ts_str)
                alive = ts >= cutoff
            except Exception:
                alive = False
            result[m] = {'alive': alive, 'last_ping_at': ts_str + 'Z' if not ts_str.endswith('Z') else ts_str}
        else:
            result[m] = {'alive': False, 'last_ping_at': None}
    return result


def _overall_status(module_pings: dict, now: datetime):
    """
    overall: 'alive' (tümü ok), 'partial' (bazıları ok), 'dead' (hiçbiri ok değil / hiç ping yok)
    """
    statuses = _module_status(module_pings, now)
    alive_count = sum(1 for v in statuses.values() if v['alive'])
    total = len(KNOWN_MODULES)
    if alive_count == total:
        return 'alive'
    elif alive_count > 0:
        return 'partial'
    else:
        return 'dead'


@health_bp.route('/status', methods=['GET'])
def status():
    return {'status': 'ok', 'service': 'vislivis'}


@health_bp.route('/heartbeat', methods=['POST'])
@jwt_required()
def heartbeat():
    """
    Mağaza AI servisi her modül için 30 dakikada bir çağırır.
    Body (JSON): {"module": "counting"} — module: counting|heatmap|queue|camera
    module parametresi yoksa genel ping (geriye dönük uyumluluk).
    """
    user_id = get_jwt_identity()
    now = datetime.utcnow()
    data = request.get_json(silent=True) or {}
    module = data.get('module', '').strip().lower()

    rec = ServiceHeartbeat.query.filter_by(user_id=user_id).first()
    if rec:
        module_pings = _load_module_pings(rec)
        if module and module in KNOWN_MODULES:
            module_pings[module] = now.isoformat()
        else:
            # Geriye dönük uyumluluk: modül belirtilmemişse tüm modülleri güncelle
            for m in KNOWN_MODULES:
                module_pings[m] = now.isoformat()
        rec.module_pings = json.dumps(module_pings)
        rec.last_ping_at = now
    else:
        module_pings = {}
        if module and module in KNOWN_MODULES:
            module_pings[module] = now.isoformat()
        else:
            for m in KNOWN_MODULES:
                module_pings[m] = now.isoformat()
        rec = ServiceHeartbeat(
            user_id=user_id,
            last_ping_at=now,
            module_pings=json.dumps(module_pings),
            received_pings=1,
            expected_pings=len(KNOWN_MODULES),
        )
        db.session.add(rec)
    db.session.commit()

    overall = _overall_status(module_pings, now)
    return {
        'status': 'ok',
        'module': module or 'all',
        'overall': overall,
        'last_ping_at': now.isoformat() + 'Z',
    }


@health_bp.route('/heartbeat/status', methods=['GET'])
@jwt_required()
def heartbeat_status():
    """Panel: kendi mağaza servisinin modül bazlı durumu.
    Company bazlı: şirketin primary_user_id'sinin heartbeat'ini sorgula."""
    from flask_jwt_extended import get_jwt
    from models import Company
    user_id = int(get_jwt_identity())
    now = datetime.utcnow()

    # Company'nin primary_user_id'sine bak (veri o kullanıcıya bağlı)
    target_user_id = user_id
    claims = get_jwt() or {}
    jwt_company_id = claims.get('company_id')
    if jwt_company_id:
        company = Company.query.get(jwt_company_id)
        if company and company.primary_user_id:
            target_user_id = company.primary_user_id
    else:
        # company_id JWT'de yoksa user'ın own company'sinden bak
        u = User.query.get(user_id)
        if u and u.company_id:
            company = Company.query.get(u.company_id)
            if company and company.primary_user_id:
                target_user_id = company.primary_user_id

    rec = ServiceHeartbeat.query.filter_by(user_id=target_user_id).first()

    if not rec:
        return {
            'is_alive': False,
            'overall': 'dead',
            'last_ping_at': None,
            'modules': {m: {'alive': False, 'last_ping_at': None} for m in KNOWN_MODULES},
            'message': 'Henüz heartbeat gelmedi. Mağaza scripti çalışıyor mu?'
        }

    module_pings = _load_module_pings(rec)
    # Sadece KNOWN_MODULES'daki modülleri filtrele (eski camera verisi varsa yoksay)
    filtered_pings = {m: module_pings.get(m) for m in KNOWN_MODULES}
    modules = _module_status(filtered_pings, now)
    overall = _overall_status(filtered_pings, now)
    is_alive = overall in ('alive', 'partial')

    if overall == 'alive':
        message = 'Tüm modüller aktif.'
    elif overall == 'partial':
        dead_modules = [m for m, v in modules.items() if not v['alive']]
        message = f"Bazı modüllerden sinyal gelmiyor: {', '.join(dead_modules)}"
    else:
        message = '90 dakikadır hiçbir modülden veri gelmiyor. Sistem çökmüş olabilir.'

    return {
        'is_alive': is_alive,
        'overall': overall,
        'last_ping_at': rec.last_ping_at.isoformat() + 'Z',
        'modules': modules,
        'message': message,
    }


def _build_store_entry(u, h, now):
    """Tek mağaza için durum dict'i oluştur."""
    if not h:
        return {
            'id': u.id, 'username': u.username, 'email': u.email,
            'full_name': u.full_name, 'role': u.role,
            'is_alive': False, 'overall': 'dead',
            'last_ping_at': None,
            'modules': {m: {'alive': False, 'last_ping_at': None} for m in KNOWN_MODULES},
            'received_pings': 0, 'expected_pings': len(KNOWN_MODULES), 'ratio': f"0/{len(KNOWN_MODULES)}",
        }
    module_pings = _load_module_pings(h)
    # Sadece KNOWN_MODULES'daki modülleri filtrele
    filtered_pings = {m: module_pings.get(m) for m in KNOWN_MODULES}
    modules = _module_status(filtered_pings, now)
    overall = _overall_status(filtered_pings, now)
    alive_count = sum(1 for v in modules.values() if v['alive'])
    return {
        'id': u.id, 'username': u.username, 'email': u.email,
        'full_name': u.full_name, 'role': u.role,
        'is_alive': overall in ('alive', 'partial'),
        'overall': overall,
        'last_ping_at': h.last_ping_at.isoformat() + 'Z',
        'modules': modules,
        'received_pings': alive_count,
        'expected_pings': len(KNOWN_MODULES),
        'ratio': f"{alive_count}/{len(KNOWN_MODULES)}",
    }


@health_bp.route('/admin/overview', methods=['GET'])
@admin_required
def admin_health_overview():
    """Admin: Tüm kullanıcıları Mağaza AI sağlık durumu ile listeler."""
    now = datetime.utcnow()
    users = User.query.filter(User.role != 'admin').order_by(User.full_name, User.username).all()
    heartbeats = {h.user_id: h for h in ServiceHeartbeat.query.filter(
        ServiceHeartbeat.user_id.in_([u.id for u in users])
    ).all()}
    result = []
    for u in users:
        h = heartbeats.get(u.id)
        entry = _build_store_entry(u, h, now)
        result.append(entry)
    # Sıralama: dead önce, partial ortada, alive sonda
    order = {'dead': 0, 'partial': 1, 'alive': 2}
    result.sort(key=lambda x: order.get(x['overall'], 0))
    return {'users': result}


def run_dead_service_check():
    """
    Dead/partial service kontrolü. Hem route hem scheduler tarafından çağrılabilir.
    Flask uygulama context'i içinde çağrılmalıdır.
    Sadece primary_user_id'si olan şirketlerin kullanıcılarını kontrol eder.
    """
    from models import Company, SiteConfig
    now = datetime.utcnow()
    local_hour = (now + timedelta(hours=3)).hour  # TSİ saati

    all_heartbeats = ServiceHeartbeat.query.all()
    heartbeat_map = {h.user_id: h for h in all_heartbeats}

    # Sadece primary_user'ları kontrol et (asıl veri sahibi kullanıcılar)
    companies_with_primary = Company.query.filter(Company.primary_user_id.isnot(None)).all()
    primary_user_ids = [c.primary_user_id for c in companies_with_primary]
    # Ayrıca heartbeat kaydı olup company'ye bağlı olmayan tekil user'lar
    for h in all_heartbeats:
        if h.user_id not in primary_user_ids:
            u = User.query.get(h.user_id)
            if u and u.role != 'admin' and u.is_active:
                primary_user_ids.append(h.user_id)

    dead_users = []
    partial_users = []
    alive_users = []

    for uid in set(primary_user_ids):
        u = User.query.get(uid)
        if not u or not u.is_active:
            continue
        h = heartbeat_map.get(uid)
        if h is None:
            continue

        # Mesai dışı saatlerde (gece 23:00 - sabah 08:00) dead sayma
        site = SiteConfig.query.filter_by(user_id=uid).first()
        work_start = site.work_start if site and site.work_start is not None else 9
        work_end = site.work_end if site and site.work_end is not None else 22
        if local_hour >= work_end or local_hour < work_start:
            # Mesai dışı: alive sayılır (mağaza kapalı, veri gelmemesi normal)
            continue

        module_pings = _load_module_pings(h)
        # Sadece KNOWN_MODULES'daki modülleri filtrele (eski camera verisi varsa yoksay)
        filtered_pings = {m: module_pings.get(m) for m in KNOWN_MODULES}
        overall = _overall_status(filtered_pings, now)
        if overall == 'dead':
            dead_users.append((u, h, filtered_pings))
        elif overall == 'partial':
            partial_users.append((u, h, filtered_pings))
        else:
            alive_users.append((u, h, filtered_pings))

    def fmt_time(h):
        local_dt = h.last_ping_at + timedelta(hours=3)
        return local_dt.strftime('%d.%m.%Y %H:%M')

    lines = []
    for user, h, mp in dead_users:
        name = user.full_name or user.username
        lines.append(f"🔴 <b>{name}</b> — KAPALI\n   Son sinyal: {fmt_time(h)} TSİ")
    for user, h, mp in partial_users:
        name = user.full_name or user.username
        dead_mods = [m for m in KNOWN_MODULES if not (_module_status(mp, now)[m]['alive'])]
        lines.append(f"⚠️ <b>{name}</b> — KISMİ\n   Sorunlu modüller: {', '.join(dead_mods)}\n   Son sinyal: {fmt_time(h)} TSİ")
    for user, h, mp in alive_users:
        name = user.full_name or user.username
        lines.append(f"✅ <b>{name}</b> — AKTİF\n   Son sinyal: {fmt_time(h)} TSİ")

    if lines:
        now_str = (datetime.utcnow() + timedelta(hours=3)).strftime('%d.%m.%Y %H:%M TSİ')
        message = f"📊 <b>Vislivis Sistem Durumu</b>\n📅 {now_str}\n\n"
        if dead_users:
            message += f"<b>❌ Kapalı ({len(dead_users)}):</b>\n" + "\n\n".join(
                f"🔴 <b>{u.full_name or u.username}</b> — KAPALI\n   Son: {fmt_time(h)} TSİ"
                for u, h, _ in dead_users) + "\n\n"
        if partial_users:
            message += f"<b>⚠️ Kısmi ({len(partial_users)}):</b>\n" + "\n\n".join(
                f"⚠️ <b>{u.full_name or u.username}</b> — KISMİ" for u, _, _ in partial_users) + "\n\n"
        if alive_users:
            message += f"<b>✅ Aktif ({len(alive_users)}):</b>\n" + "\n\n".join(
                f"✅ <b>{u.full_name or u.username}</b>" for u, _, _ in alive_users)
        if dead_users or partial_users:
            message += "\n\n⚡ Lütfen sorunlu mağazaların sistem durumunu kontrol edin."
        thread = threading.Thread(target=send_telegram_alert, args=(message,))
        thread.daemon = True
        thread.start()

    return {
        'checked_at': datetime.utcnow().isoformat(),
        'dead_count': len(dead_users),
        'partial_count': len(partial_users),
        'alive_count': len(alive_users),
        'alerts_sent': len(dead_users) > 0 or len(partial_users) > 0,
    }


@health_bp.route('/check-dead-services', methods=['GET'])
@admin_required
def check_dead_services():
    """Cron veya manuel tetikleme için route. Admin JWT gerektirir."""
    result = run_dead_service_check()
    return result
