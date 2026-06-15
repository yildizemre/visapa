"""
Kamera Görüntü Upload API
POST /api/camera/upload  → Kamera görüntüsü yükle (JPEG/PNG/WEBP)
GET  /api/camera/images  → Yüklenen görüntüleri listele
GET  /api/camera/images/<id> → Belirli bir görüntüyü indir
DELETE /api/camera/images/<id> → Görüntüyü sil
"""
import os
import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify, send_from_directory, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, CameraConfig
from user_context import get_resolved_user_ids

camera_upload_bp = Blueprint('camera_upload', __name__)

ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp', 'bmp'}
MAX_FILE_SIZE_MB = 20


def _allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def _upload_dir() -> str:
    upload_dir = os.path.join(current_app.root_path, 'uploads', 'camera_images')
    os.makedirs(upload_dir, exist_ok=True)
    return upload_dir


def _current_user_id():
    try:
        uid = get_jwt_identity()
        return int(uid) if uid is not None else None
    except (TypeError, ValueError):
        return None


# CameraImage modelini dinamik olarak oluştur (models.py'ye eklemek yerine burada yönet)
from sqlalchemy import Column, Integer, String, DateTime, Text
from models import db as _db

class CameraImage(_db.Model):
    __tablename__ = 'camera_images'
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False, index=True)
    camera_id = Column(String(100), nullable=True)
    filename = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=True)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'camera_id': self.camera_id,
            'original_name': self.original_name,
            'file_size': self.file_size,
            'mime_type': self.mime_type,
            'notes': self.notes,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None,
            'url': f'/api/camera/images/{self.id}/file',
        }


@camera_upload_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_image():
    """
    POST /api/camera/upload
    Form-data:
      - file: görüntü dosyası (JPEG/PNG/WEBP/BMP) — zorunlu
      - camera_id: kamera kimliği — opsiyonel
      - notes: açıklama notu — opsiyonel
    Yanıt: { id, camera_id, original_name, url, uploaded_at }
    """
    user_id = _current_user_id()
    if not user_id:
        return jsonify({'error': 'Kullanıcı kimliği alınamadı.'}), 401

    if 'file' not in request.files:
        return jsonify({'error': "'file' alanı zorunludur."}), 400

    file = request.files['file']
    if not file or file.filename == '':
        return jsonify({'error': 'Dosya seçilmedi.'}), 400

    if not _allowed_file(file.filename):
        return jsonify({'error': f"Desteklenmeyen format. İzin verilenler: {', '.join(ALLOWED_EXTENSIONS)}"}), 415

    # Dosya boyutu kontrolü
    file.seek(0, 2)
    size_bytes = file.tell()
    file.seek(0)
    if size_bytes > MAX_FILE_SIZE_MB * 1024 * 1024:
        return jsonify({'error': f'Dosya boyutu {MAX_FILE_SIZE_MB} MB sınırını aşıyor.'}), 413

    # Mevcut kamera id'ye sahip eski resmi sil (disk şişmesini önle)
    camera_id_str = request.form.get('camera_id')
    if camera_id_str:
        old_record = CameraImage.query.filter_by(user_id=user_id, camera_id=camera_id_str).first()
        if old_record:
            old_path = os.path.join(_upload_dir(), old_record.filename)
            if os.path.exists(old_path):
                try:
                    os.remove(old_path)
                except OSError:
                    pass
            db.session.delete(old_record)

    ext = file.filename.rsplit('.', 1)[1].lower()
    unique_name = f"{uuid.uuid4().hex}_{int(datetime.utcnow().timestamp())}.{ext}"

    save_path = os.path.join(_upload_dir(), unique_name)
    file.save(save_path)

    mime_map = {'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'webp': 'image/webp', 'bmp': 'image/bmp'}

    record = CameraImage(
        user_id=user_id,
        camera_id=camera_id_str or None,
        filename=unique_name,
        original_name=file.filename,
        file_size=size_bytes,
        mime_type=mime_map.get(ext, 'image/jpeg'),
        notes=request.form.get('notes') or None,
    )
    db.session.add(record)
    db.session.commit()

    return jsonify(record.to_dict()), 201


@camera_upload_bp.route('/images', methods=['GET'])
@jwt_required()
def list_images():
    """
    GET /api/camera/images?camera_id=CAM1&date_from=2026-05-01&date_to=2026-05-20&limit=50
    Yüklenen görüntüleri listele (en yeni en önce).
    """
    user_ids, _ = get_resolved_user_ids()
    if not user_ids:
        uid = _current_user_id()
        user_ids = [uid] if uid else []
    if not user_ids:
        return jsonify({'error': 'Kullanıcı bilgisi alınamadı.', 'images': []}), 401

    camera_id = request.args.get('camera_id')
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    limit = min(int(request.args.get('limit', 100)), 500)

    q = CameraImage.query.filter(CameraImage.user_id.in_(user_ids))

    if camera_id and camera_id != 'all':
        q = q.filter(CameraImage.camera_id == camera_id)
    if date_from:
        try:
            df = datetime.strptime(date_from, '%Y-%m-%d')
            q = q.filter(CameraImage.uploaded_at >= df)
        except ValueError:
            pass
    if date_to:
        try:
            dt = datetime.strptime(date_to, '%Y-%m-%d')
            from datetime import timedelta
            q = q.filter(CameraImage.uploaded_at < dt + timedelta(days=1))
        except ValueError:
            pass

    rows = q.order_by(CameraImage.uploaded_at.desc()).limit(limit).all()
    return jsonify({'images': [r.to_dict() for r in rows], 'total': len(rows)})


@camera_upload_bp.route('/images/<int:image_id>/file', methods=['GET'])
@jwt_required()
def serve_image(image_id: int):
    """
    GET /api/camera/images/<id>/file
    Görüntü dosyasını indir/görüntüle.
    """
    user_ids, _ = get_resolved_user_ids()
    if not user_ids:
        uid = _current_user_id()
        user_ids = [uid] if uid else []

    record = CameraImage.query.filter(
        CameraImage.id == image_id,
        CameraImage.user_id.in_(user_ids)
    ).first_or_404()

    upload_dir = _upload_dir()
    return send_from_directory(upload_dir, record.filename, mimetype=record.mime_type or 'image/jpeg')


@camera_upload_bp.route('/images/<int:image_id>', methods=['DELETE'])
@jwt_required()
def delete_image(image_id: int):
    """
    DELETE /api/camera/images/<id>
    Görüntüyü veritabanından ve diskten sil.
    """
    user_id = _current_user_id()
    if not user_id:
        return jsonify({'error': 'Kullanıcı bilgisi alınamadı.'}), 401

    record = CameraImage.query.filter(
        CameraImage.id == image_id,
        CameraImage.user_id == user_id
    ).first_or_404()

    file_path = os.path.join(_upload_dir(), record.filename)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except OSError:
            pass

    db.session.delete(record)
    db.session.commit()
    return jsonify({'ok': True, 'message': 'Görüntü silindi.'})


@camera_upload_bp.route('/upload-by-name', methods=['POST'])
@jwt_required()
def upload_by_name():
    """
    POST /api/camera/upload-by-name
    Form-data:
      - file: Görüntü dosyası (JPEG/PNG) — zorunlu
      - camera_name: Kamera adı (örn: "Ana Giriş Kamerası") — zorunlu
    Yanıt: { ok: true, message, camera_id }
    """
    import base64
    user_id = _current_user_id()
    if not user_id:
        return jsonify({'error': 'Kullanıcı kimliği alınamadı.'}), 401

    camera_name = request.form.get('camera_name')
    if not camera_name:
        return jsonify({'error': "'camera_name' alanı zorunludur."}), 400

    if 'file' not in request.files:
        return jsonify({'error': "'file' alanı zorunludur."}), 400

    file = request.files['file']
    if not file or file.filename == '':
        return jsonify({'error': 'Dosya seçilmedi.'}), 400

    if not _allowed_file(file.filename):
        return jsonify({'error': f"Desteklenmeyen format. İzin verilenler: {', '.join(ALLOWED_EXTENSIONS)}"}), 415

    # Kullanıcıya ait belirtilen isimdeki kamerayı bul
    camera = CameraConfig.query.filter_by(user_id=user_id, name=camera_name).first()
    if not camera:
        return jsonify({'error': f"'{camera_name}' isimli kamera bulunamadı."}), 404

    try:
        # Resmi oku ve base64 formatına çevir
        file_bytes = file.read()
        b64_data = base64.b64encode(file_bytes).decode('utf-8')
        
        # Kamera kaydını güncelle
        camera.image_base64 = b64_data
        db.session.commit()
        
        return jsonify({
            'ok': True,
            'message': f"'{camera_name}' kamerası için yeni görüntü başarıyla kaydedildi.",
            'camera_id': camera.id
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f"Görüntü kaydedilirken hata oluştu: {str(e)}"}), 500
