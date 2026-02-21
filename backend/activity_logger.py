"""
Panel aktivite logları: giriş, sayfa görüntüleme, sohbet (içerik yok), hatalar.
Sohbet mesaj içeriği ActivityLog'da tutulmaz; sadece 'chat_message' tipi ve conversation_id/message_id.
"""
import json
from flask import request


def _get_client_ip():
    return (
        request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        or request.headers.get("X-Real-IP")
        or (request.remote_addr if request else None)
    )


def _get_user_agent():
    return request.headers.get("User-Agent") if request else None


def log_activity(type_: str, user_id=None, extra=None):
    """Aktivite kaydı yazar. request context gerekir."""
    try:
        from models import db, ActivityLog
        rec = ActivityLog(
            user_id=user_id,
            type=type_,
            ip=_get_client_ip(),
            user_agent=(_get_user_agent() or "")[:512],
            method=request.method if request else None,
            path=request.path[:256] if request and request.path else None,
            extra=json.dumps(extra, ensure_ascii=False) if extra is not None else None,
        )
        db.session.add(rec)
        db.session.commit()
    except Exception:
        try:
            db.session.rollback()
        except Exception:
            pass
