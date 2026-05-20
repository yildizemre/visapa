"""Sayfa görüntüleme (ekran giriş/çıkış) logları."""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from activity_logger import log_activity

log_bp = Blueprint("log", __name__)


@log_bp.route("/page-view", methods=["POST"])
@jwt_required()
def page_view():
    """
    POST /api/log/page-view
    Body: { "route": "/dashboard", "title": "Ana Sayfa", "entered_at": "ISO", "left_at": "ISO" (opsiyonel) }
    Ekranda kaçta girdi/çıktı için frontend her sayfa değişiminde çağırır.
    """
    try:
        user_id = int(get_jwt_identity())
    except (TypeError, ValueError):
        return jsonify({"error": "Geçersiz kullanıcı"}), 400

    data = request.get_json(silent=True) or {}
    route = (data.get("route") or data.get("path") or request.path or "").strip() or "/"
    title = (data.get("title") or "").strip()
    entered_at = data.get("entered_at")
    left_at = data.get("left_at")

    extra = {"route": route[:256]}
    if title:
        extra["title"] = title[:200]
    if entered_at:
        extra["entered_at"] = entered_at
    if left_at:
        extra["left_at"] = left_at

    log_activity("page_view", user_id=user_id, extra=extra)
    return jsonify({"ok": True})