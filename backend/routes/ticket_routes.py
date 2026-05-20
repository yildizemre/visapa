"""
Ticket (destek) API.
- Kullanıcı: ticket açar, kendi ticket'larını listeler, cevap yazar.
- Admin: tüm ticket'ları listeler (filtre, arama), okundu işaretler, cevap yazar, kapatır.
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from sqlalchemy import or_

from models import db, User, Ticket, TicketReply
from auth_utils import admin_required

ticket_bp = Blueprint('tickets', __name__)

# Sabit seçenekler (frontend ile uyumlu)
CATEGORIES = ['teknik', 'fatura', 'genel', 'diger']
PRIORITIES = ['acil', 'yuksek', 'normal', 'dusuk']
STATUSES = ['open', 'answered', 'closed']


def _current_user_id():
    try:
        uid = get_jwt_identity()
        return int(uid) if uid is not None else None
    except (TypeError, ValueError):
        return None


def _is_admin():
    try:
        from flask import current_app
        import jwt
        auth = request.headers.get('Authorization', '')
        token = auth[7:] if auth.startswith('Bearer ') else None
        if not token:
            return False
        payload = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
        return payload.get('role') == 'admin'
    except Exception:
        return False


@ticket_bp.route('', methods=['GET'])
@jwt_required()
def list_tickets():
    """GET /api/tickets — Kullanıcı kendi ticket'ları; admin tümü (q, status, priority, category)."""
    user_id = _current_user_id()
    if not user_id:
        return jsonify({'error': 'Kullanıcı bilgisi alınamadı.', 'tickets': []}), 400

    if _is_admin():
        q = Ticket.query
        search = request.args.get('q', '').strip()
        if search:
            q = q.join(User, Ticket.user_id == User.id).filter(
                or_(
                    Ticket.subject.ilike(f'%{search}%'),
                    Ticket.message.ilike(f'%{search}%'),
                    User.username.ilike(f'%{search}%'),
                    User.email.ilike(f'%{search}%'),
                )
            )
        status = request.args.get('status', '').strip()
        if status and status in STATUSES:
            q = q.filter(Ticket.status == status)
        priority = request.args.get('priority', '').strip()
        if priority and priority in PRIORITIES:
            q = q.filter(Ticket.priority == priority)
        category = request.args.get('category', '').strip()
        if category and category in CATEGORIES:
            q = q.filter(Ticket.category == category)
        unread_only = request.args.get('unread', '').lower() == 'true'
        if unread_only:
            q = q.filter(db.or_(Ticket.admin_read_at.is_(None), Ticket.updated_at > Ticket.admin_read_at))
        date_from = request.args.get('date_from', '').strip()
        date_to = request.args.get('date_to', '').strip()
        if date_from:
            try:
                d_from = datetime.strptime(date_from, '%Y-%m-%d')
                q = q.filter(Ticket.created_at >= d_from)
            except ValueError:
                pass
        if date_to:
            try:
                d_to = datetime.strptime(date_to, '%Y-%m-%d') + timedelta(days=1)
                q = q.filter(Ticket.created_at < d_to)
            except ValueError:
                pass
        user_id_filter = request.args.get('user_id', '').strip()
        if user_id_filter:
            try:
                q = q.filter(Ticket.user_id == int(user_id_filter))
            except ValueError:
                pass
        rows = q.order_by(Ticket.updated_at.desc()).all()
        tickets = []
        for t in rows:
            d = t.to_dict(include_user=True)
            d['unread'] = t.admin_read_at is None or (t.updated_at and t.admin_read_at and t.updated_at > t.admin_read_at)
            tickets.append(d)
        return jsonify({'tickets': tickets})
    else:
        rows = Ticket.query.filter_by(user_id=user_id).order_by(Ticket.updated_at.desc()).all()
        tickets = []
        unread_count = 0
        for t in rows:
            d = t.to_dict()
            last_staff = db.session.query(TicketReply.created_at).filter_by(ticket_id=t.id, is_staff=True).order_by(TicketReply.created_at.desc()).first()
            if last_staff:
                last_staff_at = last_staff[0]
                unread = t.user_read_at is None or (last_staff_at and t.user_read_at and last_staff_at > t.user_read_at)
            else:
                unread = False
            d['unread'] = unread
            if unread:
                unread_count += 1
            tickets.append(d)
        return jsonify({'tickets': tickets, 'unread_count': unread_count})


@ticket_bp.route('', methods=['POST'])
@jwt_required()
def create_ticket():
    """POST /api/tickets — Yeni ticket açar. Sadece admin olmayan kullanıcılar açabilir."""
    if _is_admin():
        return jsonify({'error': 'Admin kullanıcılar destek talebi açamaz. Sadece mevcut taleplere cevap verebilirsiniz.'}), 403

    user_id = _current_user_id()
    if not user_id:
        return jsonify({'error': 'Kullanıcı bilgisi alınamadı.'}), 400

    data = request.get_json(silent=True) or {}
    subject = (data.get('subject') or '').strip()
    category = (data.get('category') or 'genel').strip().lower()
    priority = (data.get('priority') or 'normal').strip().lower()
    message = (data.get('message') or '').strip()

    if not subject:
        return jsonify({'error': 'Konu gerekli.'}), 400
    if not message:
        return jsonify({'error': 'Mesaj gerekli.'}), 400
    if category not in CATEGORIES:
        category = 'genel'
    if priority not in PRIORITIES:
        priority = 'normal'

    created_ip = request.remote_addr or (request.headers.get('X-Forwarded-For', '').split(',')[0].strip() or None)
    created_user_agent = (request.headers.get('User-Agent') or '')[:512] or None

    ticket = Ticket(
        user_id=user_id,
        subject=subject[:200],
        category=category,
        priority=priority,
        status='open',
        message=message,
        created_ip=created_ip,
        created_user_agent=created_user_agent,
    )
    db.session.add(ticket)
    db.session.commit()
    return jsonify(ticket.to_dict()), 201


@ticket_bp.route('/users', methods=['GET'])
@jwt_required()
def list_ticket_users():
    """GET /api/tickets/users — Admin: Talebi olan kullanıcılar (filtre dropdown)."""
    if not _is_admin():
        return jsonify({'users': []})
    from sqlalchemy import distinct
    user_ids = db.session.query(distinct(Ticket.user_id)).all()
    user_ids = [r[0] for r in user_ids]
    users = User.query.filter(User.id.in_(user_ids)).all() if user_ids else []
    return jsonify({
        'users': [{'id': u.id, 'full_name': u.full_name, 'username': u.username, 'email': u.email} for u in users]
    })


@ticket_bp.route('/unread-count', methods=['GET'])
@jwt_required()
def unread_count():
    """GET /api/tickets/unread-count — Kullanıcının okunmamış destek sayısı (menü badge)."""
    user_id = _current_user_id()
    if not user_id:
        return jsonify({'unread_count': 0})
    if _is_admin():
        return jsonify({'unread_count': 0})
    rows = Ticket.query.filter_by(user_id=user_id).all()
    count = 0
    for t in rows:
        last_staff = db.session.query(TicketReply.created_at).filter_by(ticket_id=t.id, is_staff=True).order_by(TicketReply.created_at.desc()).first()
        if last_staff:
            last_staff_at = last_staff[0]
            if t.user_read_at is None or (last_staff_at and t.user_read_at and last_staff_at > t.user_read_at):
                count += 1
    return jsonify({'unread_count': count})


@ticket_bp.route('/options', methods=['GET'])
@jwt_required()
def get_options():
    """GET /api/tickets/options — Kategori ve öncelik seçenekleri (i18n için label'lar frontend'de)."""
    return jsonify({
        'categories': [{'value': c, 'label': c} for c in CATEGORIES],
        'priorities': [{'value': p, 'label': p} for p in PRIORITIES],
        'statuses': [{'value': s, 'label': s} for s in STATUSES],
    })


@ticket_bp.route('/<int:ticket_id>', methods=['GET'])
@jwt_required()
def get_ticket(ticket_id):
    """GET /api/tickets/:id — Detay + cevaplar. Admin açınca admin_read_at güncellenir."""
    user_id = _current_user_id()
    if not user_id:
        return jsonify({'error': 'Kullanıcı bilgisi alınamadı.'}), 400

    ticket = Ticket.query.get(ticket_id)
    if not ticket:
        return jsonify({'error': 'Ticket bulunamadı.'}), 404

    is_admin = _is_admin()
    if not is_admin and ticket.user_id != user_id:
        return jsonify({'error': 'Bu ticket\'a erişim yetkiniz yok.'}), 403

    if is_admin:
        ticket.admin_read_at = datetime.utcnow()
        db.session.commit()
    else:
        if ticket.user_id == user_id:
            ticket.user_read_at = datetime.utcnow()
            db.session.commit()

    replies = TicketReply.query.filter_by(ticket_id=ticket_id).order_by(TicketReply.created_at.asc()).all()
    out = ticket.to_dict(include_user=is_admin)
    out['replies'] = [r.to_dict() for r in replies]
    if is_admin:
        out['unread'] = ticket.admin_read_at is None or (ticket.updated_at and ticket.admin_read_at and ticket.updated_at > ticket.admin_read_at)
    return jsonify(out)


@ticket_bp.route('/<int:ticket_id>/reply', methods=['POST'])
@jwt_required()
def reply_ticket(ticket_id):
    """POST /api/tickets/:id/reply — Cevap yazar (kullanıcı veya admin)."""
    user_id = _current_user_id()
    if not user_id:
        return jsonify({'error': 'Kullanıcı bilgisi alınamadı.'}), 400

    ticket = Ticket.query.get(ticket_id)
    if not ticket:
        return jsonify({'error': 'Ticket bulunamadı.'}), 404

    is_admin = _is_admin()
    if not is_admin and ticket.user_id != user_id:
        return jsonify({'error': 'Bu ticket\'a erişim yetkiniz yok.'}), 403

    if ticket.status == 'closed':
        return jsonify({'error': 'Kapalı ticket\'a cevap yazılamaz.'}), 400

    data = request.get_json(silent=True) or {}
    message = (data.get('message') or '').strip()
    if not message:
        return jsonify({'error': 'Mesaj gerekli.'}), 400

    reply = TicketReply(
        ticket_id=ticket_id,
        user_id=user_id,
        message=message,
        is_staff=is_admin,
    )
    db.session.add(reply)
    ticket.updated_at = datetime.utcnow()
    if is_admin:
        ticket.status = 'answered'
    db.session.commit()
    return jsonify(reply.to_dict()), 201


@ticket_bp.route('/<int:ticket_id>', methods=['PATCH'])
@jwt_required()
def update_ticket(ticket_id):
    """PATCH /api/tickets/:id — Admin veya ticket sahibi: status (open, answered, closed). Kapatınca closed_at ve closed_by kaydedilir."""
    user_id = _current_user_id()
    if not user_id:
        return jsonify({'error': 'Kullanıcı bilgisi alınamadı.'}), 400

    ticket = Ticket.query.get(ticket_id)
    if not ticket:
        return jsonify({'error': 'Ticket bulunamadı.'}), 404

    is_admin = _is_admin()
    if not is_admin and ticket.user_id != user_id:
        return jsonify({'error': 'Bu ticket\'ı güncelleme yetkiniz yok.'}), 403

    data = request.get_json(silent=True) or {}
    status = (data.get('status') or '').strip().lower()
    if status in STATUSES:
        ticket.status = status
        ticket.updated_at = datetime.utcnow()
        if status == 'closed':
            ticket.closed_at = datetime.utcnow()
            ticket.closed_by_user_id = user_id
        db.session.commit()
    return jsonify(ticket.to_dict(include_user=is_admin or True))
