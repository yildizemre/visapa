"""
Chat API: Mağaza yöneticisinin sorularını Ollama ile yanıtlar.
Konuşmalar Conversation (sohbet oturumu) bazında; liste tıklanınca o sohbet yüklenir.
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

from models import db, ChatMessage, Conversation
from user_context import get_resolved_user_ids
from services.llm_service import get_chat_response
from activity_logger import log_activity

chat_bp = Blueprint("chat", __name__)

HISTORY_LIMIT = 500


def _current_user_id():
    try:
        uid = get_jwt_identity()
        return int(uid) if uid is not None else None
    except (TypeError, ValueError):
        return None


@chat_bp.route("/conversations", methods=["GET"])
@jwt_required()
def list_conversations():
    """GET /api/chat/conversations — Kullanıcının sohbet oturumlarını listeler (en son en üstte)."""
    user_id = _current_user_id()
    if not user_id:
        return jsonify({"error": "Kullanıcı bilgisi alınamadı.", "conversations": []}), 400

    rows = (
        Conversation.query.filter_by(user_id=user_id)
        .order_by(Conversation.updated_at.desc())
        .limit(100)
        .all()
    )
    return jsonify({"conversations": [r.to_dict() for r in rows]})


@chat_bp.route("/conversations/<int:conv_id>", methods=["DELETE"])
@jwt_required()
def delete_conversation(conv_id):
    """DELETE /api/chat/conversations/:id — Sohbeti ve mesajlarını siler."""
    user_id = _current_user_id()
    if not user_id:
        return jsonify({"error": "Kullanıcı bilgisi alınamadı."}), 400

    conv = Conversation.query.filter_by(id=conv_id, user_id=user_id).first()
    if not conv:
        return jsonify({"error": "Sohbet bulunamadı."}), 404

    ChatMessage.query.filter_by(conversation_id=conv_id).delete()
    db.session.delete(conv)
    db.session.commit()
    return jsonify({"ok": True})


@chat_bp.route("/history", methods=["GET"])
@jwt_required()
def history():
    """
    GET /api/chat/history?conversation_id=5
    conversation_id varsa o oturumun mesajları; yoksa conversation_id null olan (eski) mesajlar.
    """
    user_id = _current_user_id()
    if not user_id:
        return jsonify({"error": "Kullanıcı bilgisi alınamadı.", "messages": []}), 400

    conv_id = request.args.get("conversation_id", type=int)
    limit = min(int(request.args.get("limit", HISTORY_LIMIT)), 500)

    q = ChatMessage.query.filter_by(user_id=user_id)
    if conv_id is not None:
        q = q.filter_by(conversation_id=conv_id)
    else:
        q = q.filter_by(conversation_id=None)
    rows = q.order_by(ChatMessage.created_at.asc()).limit(limit).all()
    return jsonify({"messages": [r.to_dict() for r in rows]})


@chat_bp.route("", methods=["POST"])
@jwt_required()
def chat():
    """
    POST /api/chat
    Body: { "message": "...", "conversation_id": 5 } (conversation_id opsiyonel; yoksa yeni sohbet)
    Cevap: { "response": "...", "conversation_id": 5 }
    """
    user_ids, _ = get_resolved_user_ids()
    if not user_ids:
        try:
            uid = get_jwt_identity()
            user_ids = [int(uid)] if uid is not None else []
        except (TypeError, ValueError):
            user_ids = []
    if not user_ids:
        return jsonify({"error": "Kullanıcı veya mağaza seçilmedi.", "response": ""}), 400

    current_user_id = _current_user_id()
    if not current_user_id:
        return jsonify({"error": "Kullanıcı bilgisi alınamadı.", "response": ""}), 400

    data = request.get_json(silent=True) or {}
    message = (data.get("message") or data.get("msg") or "").strip()
    if not message:
        return jsonify({"error": "Mesaj (message) gönderin.", "response": ""}), 400

    conv_id = data.get("conversation_id")
    conv = None
    if conv_id is not None:
        conv = Conversation.query.filter_by(id=conv_id, user_id=current_user_id).first()
        if not conv:
            conv = None
            conv_id = None

    if conv is None:
        title = (message[:50] + "…") if len(message) > 50 else message
        if not title.strip():
            title = "Sohbet " + datetime.utcnow().strftime("%d.%m.%Y %H:%M")
        conv = Conversation(user_id=current_user_id, title=title)
        db.session.add(conv)
        db.session.flush()
        conv_id = conv.id

    history_rows = (
        ChatMessage.query.filter_by(user_id=current_user_id, conversation_id=conv_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(6)
        .all()
    )
    history = [{"role": r.role, "content": r.content or ""} for r in reversed(history_rows)]

    try:
        response_text = get_chat_response(user_ids, message, history=history)

        db.session.add(ChatMessage(user_id=current_user_id, conversation_id=conv_id, role="user", content=message))
        db.session.add(ChatMessage(user_id=current_user_id, conversation_id=conv_id, role="assistant", content=response_text))
        conv.updated_at = datetime.utcnow()
        if conv.title == "Sohbet" and len(message) > 0:
            conv.title = (message[:50] + "…") if len(message) > 50 else message
        db.session.commit()

        log_activity("chat_message", user_id=current_user_id, extra={"conversation_id": conv_id})

        return jsonify({"response": response_text, "conversation_id": conv_id})
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "response": "Sohbet yanıtı oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.",
            "error": str(e),
        }), 503
