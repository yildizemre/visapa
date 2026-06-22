"""Kullanıcı yetki bağlamı: brand_manager için yönetilen mağazalar, company bazlı erişim, store_id filtresi."""
from flask import request
from flask_jwt_extended import get_jwt_identity, get_jwt

from models import ManagedStore, User


def _get_company_user_ids(user_id: int) -> list[int]:
    """Kullanıcının company_id'sine bağlı olarak aynı şirketteki tüm user_id'leri döndürür."""
    user = User.query.get(user_id)
    if not user or not user.company_id:
        return [user_id]
    company_users = User.query.filter_by(company_id=user.company_id).all()
    return [u.id for u in company_users]


def _get_company_group_ids(company_id: int) -> list[int]:
    """
    Bir şirketin tüm grup ID'lerini döndürür (kendisi + parent/children).
    - Eğer şirket bir üst şirketse: kendisi + tüm alt mağazaları
    - Eğer şirket bir alt mağazaysa: parent + parent'ın tüm alt mağazaları
    """
    from models import Company
    company = Company.query.get(company_id)
    if not company:
        return [company_id]

    if company.parent_id:
        # Alt mağaza — parent + parent'ın tüm children'ı
        parent_id = company.parent_id
        children = Company.query.filter_by(parent_id=parent_id).all()
        return [parent_id] + [c.id for c in children]
    else:
        # Üst şirket — kendisi + tüm children'ı
        children = Company.query.filter_by(parent_id=company_id).all()
        return [company_id] + [c.id for c in children]


def get_accessible_companies(user_id: int) -> list[dict]:
    """
    Kullanıcının erişebileceği şirketleri döndürür (store switcher için).
    store_manager: kendi şirketi + parent/children grup şirketleri
    user: sadece kendi şirketi
    """
    from models import Company
    user = User.query.get(user_id)
    if not user or not user.company_id:
        return []

    company = Company.query.get(user.company_id)
    if not company:
        return []

    if user.company_role != 'store_manager':
        # Sadece kendi şirketi
        return [{'id': company.id, 'name': company.name}]

    # store_manager: tüm grup şirketleri
    group_ids = _get_company_group_ids(user.company_id)
    companies = Company.query.filter(Company.id.in_(group_ids)).order_by(Company.name).all()
    return [{'id': c.id, 'name': c.name} for c in companies]


def get_effective_user_ids(user_id: int, role: str) -> list[int]:
    """
    Veri sorgulama için kullanılacak user_id listesi.
    - admin: tüm kullanıcılar (özel işlemler için - analytics'te genelde kullanılmaz)
    - brand_manager: yönettiği mağaza id'leri
    - user: company bazlı (aynı şirketteki tüm kullanıcılar)
    """
    if role == 'admin':
        return []  # Admin kendi context'inde çalışır, analytics'te tüm user'ları görmek için ayrı mantık
    if role == 'brand_manager':
        rows = ManagedStore.query.filter_by(manager_user_id=user_id).all()
        return [r.store_user_id for r in rows]
    # Company bazlı: aynı şirketteki tüm user_id'ler
    return _get_company_user_ids(user_id)


def get_resolved_user_ids():
    """
    Request'ten store_id ve JWT'den user bilgisini alır.
    Returns: (query için user_id listesi, seçili store_id veya None)
    - ?store_id=123 varsa ve kullanıcının erişimi varsa -> ([123], 123)
    - brand_manager, store_id yok -> (tüm yönettiği mağazalar, None) - konsolide
    - user -> (company bazlı user_id listesi, user_id)
    """
    user_id = get_jwt_identity()
    if not user_id:
        return ([], None)
    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return ([], None)

    claims = get_jwt() or {}
    role = claims.get('role', 'user')

    store_id_param = request.args.get('store_id', type=int)

    if role == 'brand_manager':
        managed_ids = get_effective_user_ids(user_id, role)
        if not managed_ids:
            return (_get_company_user_ids(user_id), user_id)  # fallback: company verisi
        if store_id_param and store_id_param in managed_ids:
            return ([store_id_param], store_id_param)
        return (managed_ids, None)  # konsolide: tüm mağazalar

    if role == 'admin' and store_id_param:
        return ([store_id_param], store_id_param)

    # Normal user veya store_manager: company bazlı erişim
    company_ids = _get_company_user_ids(user_id)
    return (company_ids, user_id)


def get_settings_user_id():
    """Settings/kameralar için hangi user'ın verisi - ?store_id= ile override. Company bazlı."""
    user_id = get_jwt_identity()
    if not user_id:
        return None
    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return None
    claims = get_jwt() or {}
    role = claims.get('role', 'user')
    store_id_param = request.args.get('store_id', type=int)
    if role == 'brand_manager' and store_id_param:
        managed = get_effective_user_ids(user_id, role)
        if store_id_param in managed:
            return store_id_param
    if role == 'brand_manager':
        managed = get_effective_user_ids(user_id, role)
        return managed[0] if managed else user_id
    return user_id
