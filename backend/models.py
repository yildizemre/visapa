from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), default='user')  # admin, user, brand_manager
    full_name = db.Column(db.String(120))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password, method='pbkdf2:sha256')

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'full_name': self.full_name,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    def to_public_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'full_name': self.full_name
        }


class CustomerData(db.Model):
    __tablename__ = 'customer_data'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    location = db.Column(db.String(120))
    customers_inside = db.Column(db.Integer, default=0)
    male_count = db.Column(db.Integer, default=0)
    female_count = db.Column(db.Integer, default=0)
    age_18_30 = db.Column(db.Integer, default=0)
    age_30_50 = db.Column(db.Integer, default=0)
    age_50_plus = db.Column(db.Integer, default=0)
    zone_visited = db.Column(db.String(120))
    purchase_amount = db.Column(db.Float, default=0)
    is_returning = db.Column(db.Boolean, default=False)
    satisfaction_score = db.Column(db.Integer)
    camera_id = db.Column(db.String(50))
    entered = db.Column(db.Integer, default=0)
    exited = db.Column(db.Integer, default=0)


class QueueData(db.Model):
    __tablename__ = 'queue_data'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    customer_id = db.Column(db.String(80))
    enter_time = db.Column(db.DateTime)
    exit_time = db.Column(db.DateTime)
    wait_time = db.Column(db.Float)
    queue_position = db.Column(db.Integer)
    cashier_id = db.Column(db.String(80))  # Kasa-1, Kasa-2 vb.
    status = db.Column(db.String(20))
    total_customers = db.Column(db.Integer, default=1)  # özet için (1 kayıt = N müşteri)
    recorded_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class HeatmapData(db.Model):
    __tablename__ = 'heatmap_data'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    zone = db.Column(db.String(120))  # erkek-giyim, kadin-giyim vb. bölge adı
    intensity = db.Column(db.Float)   # ortalama bekleme süresi (sn)
    visitor_count = db.Column(db.Integer)
    heatmap_type = db.Column(db.String(50))  # "iç" | "dış" (iç mekan / dış mekan)
    camera_id = db.Column(db.String(80))     # kamera kaynağı (opsiyonel)
    date_recorded = db.Column(db.Date)
    recorded_at = db.Column(db.DateTime)     # veri toplama zamanı (saat bazlı gruplama için)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class StaffData(db.Model):
    __tablename__ = 'staff_data'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    staff_id = db.Column(db.String(80))
    name = db.Column(db.String(120))
    role = db.Column(db.String(120))
    location = db.Column(db.String(120))
    activity_level = db.Column(db.Float)
    status = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class SiteConfig(db.Model):
    """Kurulum: mağaza/marka adı (örn. Gallery Crystal)"""
    __tablename__ = 'site_config'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    site_name = db.Column(db.String(120))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class CameraConfig(db.Model):
    """Kurulum kamera: ad, tür (Kişi Sayım, Isı Haritası, Kasa Analizi), RTSP, resim"""
    __tablename__ = 'camera_config'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(120))
    camera_type = db.Column(db.String(50))  # Kişi Sayım, Isı Haritası, Kasa Analizi
    rtsp_url = db.Column(db.String(512))
    image_base64 = db.Column(db.Text)  # base64 veya data URL
    sort_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class ManagedStore(db.Model):
    """Marka yöneticisi (çatı kullanıcı) hangi mağazaları yönetebilir."""
    __tablename__ = 'managed_store'
    id = db.Column(db.Integer, primary_key=True)
    manager_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    store_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class ServiceHeartbeat(db.Model):
    """Mağaza AI servisinin 'ben ayaktayım' ping'lerini tutar. 5 dk içinde ping gelmezse kırmızı."""
    __tablename__ = 'service_heartbeat'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    last_ping_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Report(db.Model):
    __tablename__ = 'reports'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    report_type = db.Column(db.String(50))
    report_name = db.Column(db.String(200))
    date_from = db.Column(db.Date)
    date_to = db.Column(db.Date)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Conversation(db.Model):
    """Sohbet oturumu (ChatGPT tarzı liste için)."""
    __tablename__ = 'conversations'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(200), default='Sohbet')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class ChatMessage(db.Model):
    """Kullanıcı–asistan sohbet geçmişi (LLM). conversation_id ile oturuma bağlı."""
    __tablename__ = 'chat_messages'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    conversation_id = db.Column(db.Integer, db.ForeignKey('conversations.id'), nullable=True)
    role = db.Column(db.String(20), nullable=False)  # 'user' | 'assistant'
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'role': self.role,
            'content': self.content,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class ActivityLog(db.Model):
    """Panel aktivite logları: giriş, sayfa görüntüleme, sohbet, hatalar. Sohbet içeriği burada tutulmaz."""
    __tablename__ = 'activity_logs'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # null = login_fail vb.
    type = db.Column(db.String(40), nullable=False)  # login_ok, login_fail, logout, page_view, chat_message, error
    ip = db.Column(db.String(64), nullable=True)
    user_agent = db.Column(db.String(512), nullable=True)
    method = db.Column(db.String(10), nullable=True)
    path = db.Column(db.String(256), nullable=True)
    extra = db.Column(db.Text, nullable=True)  # JSON: route, conversation_id, status_code, message, vb.
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        import json
        return {
            'id': self.id,
            'user_id': self.user_id,
            'type': self.type,
            'ip': self.ip,
            'user_agent': self.user_agent,
            'method': self.method,
            'path': self.path,
            'extra': json.loads(self.extra) if self.extra else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class Ticket(db.Model):
    """Destek talebi. Kullanıcı açar, admin cevaplar/kapatır."""
    __tablename__ = 'tickets'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    subject = db.Column(db.String(200), nullable=False)  # konu
    category = db.Column(db.String(50), nullable=False)  # teknik, fatura, genel, diğer
    priority = db.Column(db.String(20), nullable=False)   # acil, yüksek, normal, düşük
    status = db.Column(db.String(20), default='open')     # open, answered, closed
    message = db.Column(db.Text, nullable=False)         # ilk mesaj
    admin_read_at = db.Column(db.DateTime, nullable=True)  # admin son okuma; null = okunmadı
    user_read_at = db.Column(db.DateTime, nullable=True)   # kullanıcı son okuma; cevap okundu mu
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_ip = db.Column(db.String(64), nullable=True)   # talep açılırken IP
    created_user_agent = db.Column(db.String(512), nullable=True)  # tarayıcı bilgisi
    closed_at = db.Column(db.DateTime, nullable=True)
    closed_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # kim kapattı

    def to_dict(self, include_user=False):
        d = {
            'id': self.id,
            'user_id': self.user_id,
            'subject': self.subject,
            'category': self.category,
            'priority': self.priority,
            'status': self.status,
            'message': self.message,
            'admin_read_at': self.admin_read_at.isoformat() if self.admin_read_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'created_ip': self.created_ip,
            'created_user_agent': self.created_user_agent,
            'closed_at': self.closed_at.isoformat() if self.closed_at else None,
        }
        if self.closed_by_user_id:
            closer = User.query.get(self.closed_by_user_id)
            if closer:
                d['closed_by'] = closer.full_name or closer.username or str(closer.id)
                d['closed_by_role'] = closer.role  # admin, user, brand_manager, store_manager vb.
            else:
                d['closed_by'] = None
                d['closed_by_role'] = None
        else:
            d['closed_by'] = None
            d['closed_by_role'] = None
        if include_user and self.user_id:
            u = User.query.get(self.user_id)
            if u:
                d['user'] = {'id': u.id, 'username': u.username, 'email': u.email, 'full_name': u.full_name}
        return d


class TicketReply(db.Model):
    """Ticket cevabı (kullanıcı veya admin)."""
    __tablename__ = 'ticket_replies'
    id = db.Column(db.Integer, primary_key=True)
    ticket_id = db.Column(db.Integer, db.ForeignKey('tickets.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_staff = db.Column(db.Boolean, default=False)  # True = admin cevabı
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        u = User.query.get(self.user_id)
        return {
            'id': self.id,
            'ticket_id': self.ticket_id,
            'user_id': self.user_id,
            'message': self.message,
            'is_staff': self.is_staff,
            'author_name': (u.full_name or u.username or str(u.id)) if u else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
