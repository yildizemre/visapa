from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from datetime import datetime, timedelta, time
from zoneinfo import ZoneInfo

from models import db, CustomerData, QueueData
from user_context import get_resolved_user_ids

dashboard_bp = Blueprint('dashboard', __name__)
ISTANBUL_TZ = ZoneInfo("Europe/Istanbul")

def _get_utc_range_for_local_date(d):
    """DB'de naive yerel saat saklandığı için UTC dönüşümü yapılmaz."""
    local_start = datetime.combine(d, time.min)
    local_end = datetime.combine(d, time.max)
    return local_start, local_end


@dashboard_bp.route('/weekly-overview', methods=['GET'])
@jwt_required()
def weekly_overview():
    user_ids, _ = get_resolved_user_ids()
    if not user_ids:
        from flask_jwt_extended import get_jwt_identity
        user_ids = [get_jwt_identity()]
    
    # Tarih aralığı parametreleri (opsiyonel)
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    
    if date_from and date_to:
        try:
            start_date_local = datetime.strptime(date_from, '%Y-%m-%d').date()
            end_date_local = datetime.strptime(date_to, '%Y-%m-%d').date()
            utc_start, _ = _get_utc_range_for_local_date(start_date_local)
            _, utc_end = _get_utc_range_for_local_date(end_date_local)
        except ValueError:
            end_date_local = datetime.now(ISTANBUL_TZ).date()
            start_date_local = end_date_local - timedelta(days=7)
            utc_start, _ = _get_utc_range_for_local_date(start_date_local)
            _, utc_end = _get_utc_range_for_local_date(end_date_local)
    else:
        end_date_local = datetime.now(ISTANBUL_TZ).date()
        start_date_local = end_date_local - timedelta(days=7)
        utc_start, _ = _get_utc_range_for_local_date(start_date_local)
        _, utc_end = _get_utc_range_for_local_date(end_date_local)

    # Hizli kontrol: bu aralikta veri var mi? Yoksa en son veri tarihine kay
    from sqlalchemy import func as sqlfunc
    from flask_jwt_extended import get_jwt_identity
    _check_ids = user_ids if user_ids else [get_jwt_identity()]
    has_data = db.session.query(CustomerData.id).filter(
        CustomerData.user_id.in_(_check_ids),
        CustomerData.timestamp >= utc_start,
        CustomerData.timestamp <= utc_end
    ).first()
    if not has_data:
        latest_ts = db.session.query(sqlfunc.max(CustomerData.timestamp)).filter(
            CustomerData.user_id.in_(_check_ids)
        ).scalar()
        if latest_ts:
            end_date_local = latest_ts.date()
            start_date_local = end_date_local - timedelta(days=6)
            utc_start, _ = _get_utc_range_for_local_date(start_date_local)
            _, utc_end = _get_utc_range_for_local_date(end_date_local)

    # Müşteri verileri
    customer_rows = CustomerData.query.filter(
        CustomerData.user_id.in_(user_ids),
        CustomerData.timestamp >= utc_start,
        CustomerData.timestamp <= utc_end
    ).all()

    total_entered = sum(getattr(r, 'entered', 0) or 0 for r in customer_rows)
    total_exited = sum(getattr(r, 'exited', 0) or 0 for r in customer_rows)
    total_male = sum(r.male_count or 0 for r in customer_rows)
    total_female = sum(r.female_count or 0 for r in customer_rows)
    
    age_groups = {}
    for r in customer_rows:
        for attr in ['age_18_30', 'age_30_50', 'age_50_plus']:
            val = getattr(r, attr, 0) or 0
            age_groups[attr] = age_groups.get(attr, 0) + val
    
    busiest_age = 'N/A'
    if age_groups and sum(age_groups.values()) > 0:
        busiest_age = max(age_groups, key=age_groups.get)
        busiest_age = {'age_18_30': '18-30', 'age_30_50': '30-50', 'age_50_plus': '50+'}.get(busiest_age, busiest_age)

    # Müşteri Analizi sayfası için: veri olan en son tarih (varsayılan seçili gün)
    latest_customer_date = None
    if customer_rows:
        max_ts = max(r.timestamp for r in customer_rows if r.timestamp)
        latest_customer_date = max_ts.date()

    # Kuyruk verileri
    queue_rows = QueueData.query.filter(
        QueueData.user_id.in_(user_ids),
        db.func.coalesce(QueueData.recorded_at, QueueData.created_at) >= utc_start,
        db.func.coalesce(QueueData.recorded_at, QueueData.created_at) <= utc_end
    ).all()

    avg_wait = 0
    if queue_rows:
        waits = [r.wait_time for r in queue_rows if r.wait_time]
        avg_wait = sum(waits) / len(waits) if waits else 0

    # Günlük seriler - tarih aralığına göre dinamik
    daily_flow = {}
    daily_gender = {}
    daily_age = {}
    
    num_days = (end_date_local - start_date_local).days + 1
    for i in range(num_days):
        d = start_date_local + timedelta(days=i)
        daily_flow[str(d)] = {'date': str(d), 'entered': 0, 'exited': 0}
        daily_gender[str(d)] = {'date': str(d), 'male': 0, 'female': 0}
        daily_age[str(d)] = {'date': str(d), 'age_18_30': 0, 'age_30_50': 0, 'age_50_plus': 0}

    for r in customer_rows:
        if not r.timestamp:
            continue
        # DB'de naive yerel saat saklanıyor, doğrudan kullan (UTC dönüşümü yok)
        d = r.timestamp.date()
        if str(d) in daily_flow:
            daily_flow[str(d)]['entered'] += getattr(r, 'entered', 0) or 0
            daily_flow[str(d)]['exited'] += getattr(r, 'exited', 0) or 0
            daily_gender[str(d)]['male'] += r.male_count or 0
            daily_gender[str(d)]['female'] += r.female_count or 0
            daily_age[str(d)]['age_18_30'] += getattr(r, 'age_18_30', 0) or 0
            daily_age[str(d)]['age_30_50'] += getattr(r, 'age_30_50', 0) or 0
            daily_age[str(d)]['age_50_plus'] += getattr(r, 'age_50_plus', 0) or 0

    return {
        'totals': {
            'customers': {
                'total_entered': total_entered,
                'total_exited': total_exited,
                'male': total_male,
                'female': total_female,
                'busiest_age_group': busiest_age,
                'latest_customer_date': str(latest_customer_date) if latest_customer_date else None,
            },
            'queues': {
                'avg_wait_time': avg_wait,
                'total_queues': len(queue_rows),
            }
        },
        'timeseries': {
            'daily_customer_flow': list(daily_flow.values()),
            'daily_gender': list(daily_gender.values()),
            'daily_age': list(daily_age.values()),
        }
    }
