from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta, date, time
from collections import defaultdict
from zoneinfo import ZoneInfo
from sqlalchemy import func

from models import db, CustomerData, QueueData, HeatmapData, StaffData, Report, SiteConfig
from user_context import get_resolved_user_ids


def _get_work_hours(user_ids: list) -> tuple:
    """Kullanıcı listesinden ilk SiteConfig'deki mesai saatlerini döndürür. Varsayılan: 10-22."""
    if not user_ids:
        return 10, 23
    site = SiteConfig.query.filter(SiteConfig.user_id.in_(user_ids)).first()
    start = site.work_start if site and site.work_start is not None else 10
    end = site.work_end if site and site.work_end is not None else 22
    return start, end + 1  # range() için end+1

analytics_bp = Blueprint('analytics', __name__)
ISTANBUL_TZ = ZoneInfo("Europe/Istanbul")


def _user_ids():
    """Veri sorgulama için kullanılacak user_id listesi (brand_manager: yönettiği mağazalar)."""
    ids, _ = get_resolved_user_ids()
    return ids if ids else [get_jwt_identity()]


def _get_utc_range_for_local_date(d: date):
    """
    Yerel tarih (d) için o günün 00:00:00 ile 23:59:59 arası naive datetime döner.
    NOT: Veritabanında timestamp'ler naive yerel saat (Istanbul) olarak saklanır.
    Bu yüzden UTC dönüşümü YAPILMAZ.
    """
    local_start = datetime.combine(d, time.min)
    local_end = datetime.combine(d, time.max)
    
    return local_start, local_end


# --- Customer Analytics: veri olan en son tarih (Müşteri Analizi sayfası varsayılan tarih için) ---
@analytics_bp.route('/customers/latest-date', methods=['GET'])
@jwt_required()
def get_customers_latest_date():
    """Kullanıcının (veya mağazanın) müşteri verisi olan en son tarihi döner. Tarih yoksa bugün."""
    user_ids = _user_ids()
    row = (
        db.session.query(func.max(CustomerData.timestamp))
        .filter(CustomerData.user_id.in_(user_ids))
        .scalar()
    )
    if row:
        return {'date': row.strftime('%Y-%m-%d')}
    
    today = datetime.now(ISTANBUL_TZ).strftime('%Y-%m-%d')
    return {'date': today}


# --- Customer Analytics ---
@analytics_bp.route('/customers', methods=['GET'])
@jwt_required()
def get_customers():
    user_ids = _user_ids()
    date_str = request.args.get('date')
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    camera_id = request.args.get('camera_id')

    q = CustomerData.query.filter(CustomerData.user_id.in_(user_ids))
    
    # Tarih filtrelemesi
    if date_from and date_to:
        try:
            df = datetime.strptime(date_from, '%Y-%m-%d').date()
            dt = datetime.strptime(date_to, '%Y-%m-%d').date()
            utc_start, _ = _get_utc_range_for_local_date(df)
            _, utc_end = _get_utc_range_for_local_date(dt)
            q = q.filter(CustomerData.timestamp >= utc_start, CustomerData.timestamp <= utc_end)
        except ValueError:
            pass
    elif date_from:
        try:
            df = datetime.strptime(date_from, '%Y-%m-%d').date()
            utc_start, _ = _get_utc_range_for_local_date(df)
            q = q.filter(CustomerData.timestamp >= utc_start)
        except ValueError:
            pass
    elif date_str:
        try:
            d = datetime.strptime(date_str, '%Y-%m-%d').date()
            utc_start, utc_end = _get_utc_range_for_local_date(d)
            q = q.filter(CustomerData.timestamp >= utc_start, CustomerData.timestamp <= utc_end)
        except ValueError:
            pass
            
    if camera_id and camera_id != 'all':
        q = q.filter(CustomerData.camera_id == camera_id)

    # --- SQL aggregation: demographics ---
    from sqlalchemy import func as sqlfunc
    agg_q = db.session.query(
        sqlfunc.coalesce(sqlfunc.sum(CustomerData.male_count), 0).label('total_male'),
        sqlfunc.coalesce(sqlfunc.sum(CustomerData.female_count), 0).label('total_female'),
        sqlfunc.coalesce(sqlfunc.sum(CustomerData.age_18_30), 0).label('age_18_30'),
        sqlfunc.coalesce(sqlfunc.sum(CustomerData.age_30_50), 0).label('age_30_50'),
        sqlfunc.coalesce(sqlfunc.sum(CustomerData.age_50_plus), 0).label('age_50_plus'),
    ).filter(CustomerData.user_id.in_(user_ids))

    if date_from and date_to:
        try:
            df2 = datetime.strptime(date_from, '%Y-%m-%d').date()
            dt2 = datetime.strptime(date_to, '%Y-%m-%d').date()
            s2, _ = _get_utc_range_for_local_date(df2)
            _, e2 = _get_utc_range_for_local_date(dt2)
            agg_q = agg_q.filter(CustomerData.timestamp >= s2, CustomerData.timestamp <= e2)
        except ValueError:
            pass
    elif date_from:
        try:
            df2 = datetime.strptime(date_from, '%Y-%m-%d').date()
            s2, _ = _get_utc_range_for_local_date(df2)
            agg_q = agg_q.filter(CustomerData.timestamp >= s2)
        except ValueError:
            pass
    elif date_str:
        try:
            d2 = datetime.strptime(date_str, '%Y-%m-%d').date()
            s2, e2 = _get_utc_range_for_local_date(d2)
            agg_q = agg_q.filter(CustomerData.timestamp >= s2, CustomerData.timestamp <= e2)
        except ValueError:
            pass
    if camera_id and camera_id != 'all':
        agg_q = agg_q.filter(CustomerData.camera_id == camera_id)

    agg_row = agg_q.first()
    total_male = int(agg_row.total_male or 0)
    total_female = int(agg_row.total_female or 0)
    age_18_30 = int(agg_row.age_18_30 or 0)
    age_30_50 = int(agg_row.age_30_50 or 0)
    age_50_plus = int(agg_row.age_50_plus or 0)

    demographics = {
        'ageGroupsChart': [
            {'name': '18-30', 'value': age_18_30},
            {'name': '30-50', 'value': age_30_50},
            {'name': '50+', 'value': age_50_plus},
        ],
        'genderDistributionChart': [
            {'gender': 'Erkek', 'value': total_male},
            {'gender': 'Kadın', 'value': total_female},
        ],
    }

    # --- SQL aggregation: saatlik akis (GROUP BY hour) ---
    from sqlalchemy import extract, cast, Integer
    hourly_agg = db.session.query(
        extract('hour', CustomerData.timestamp).label('hour'),
        sqlfunc.coalesce(sqlfunc.sum(CustomerData.entered), 0).label('entering'),
        sqlfunc.coalesce(sqlfunc.sum(CustomerData.exited), 0).label('exiting'),
    ).filter(CustomerData.user_id.in_(user_ids))

    if date_from and date_to:
        try:
            df3 = datetime.strptime(date_from, '%Y-%m-%d').date()
            dt3 = datetime.strptime(date_to, '%Y-%m-%d').date()
            s3, _ = _get_utc_range_for_local_date(df3)
            _, e3 = _get_utc_range_for_local_date(dt3)
            hourly_agg = hourly_agg.filter(CustomerData.timestamp >= s3, CustomerData.timestamp <= e3)
        except ValueError:
            pass
    elif date_from:
        try:
            df3 = datetime.strptime(date_from, '%Y-%m-%d').date()
            s3, _ = _get_utc_range_for_local_date(df3)
            hourly_agg = hourly_agg.filter(CustomerData.timestamp >= s3)
        except ValueError:
            pass
    elif date_str:
        try:
            d3 = datetime.strptime(date_str, '%Y-%m-%d').date()
            s3, e3 = _get_utc_range_for_local_date(d3)
            hourly_agg = hourly_agg.filter(CustomerData.timestamp >= s3, CustomerData.timestamp <= e3)
        except ValueError:
            pass
    if camera_id and camera_id != 'all':
        hourly_agg = hourly_agg.filter(CustomerData.camera_id == camera_id)

    hourly_agg = hourly_agg.group_by(extract('hour', CustomerData.timestamp)).order_by(extract('hour', CustomerData.timestamp))
    hourly_rows = hourly_agg.all()

    hourly_customer_flow = [
        {'hour': f'{int(r.hour):02d}:00', 'entering': int(r.entering), 'exiting': int(r.exiting)}
        for r in hourly_rows
    ]

    # Camera list (distinct, fast)
    cam_rows = db.session.query(CustomerData.camera_id).filter(
        CustomerData.user_id.in_(user_ids),
        CustomerData.camera_id.isnot(None)
    ).distinct().all()
    all_cameras = [r.camera_id for r in cam_rows if r.camera_id]

    # Only return minimal row data needed by frontend (limit 500 for display)
    rows = q.order_by(CustomerData.timestamp.desc()).limit(500).all()
    data = [
        {
            'id': r.id,
            'timestamp': r.timestamp.isoformat() if r.timestamp else None,
            'location': r.location,
            'entered': getattr(r, 'entered', 0) or 0,
            'exited': getattr(r, 'exited', 0) or 0,
            'male_count': getattr(r, 'male_count', 0) or 0,
            'female_count': getattr(r, 'female_count', 0) or 0,
            'age_18_30': getattr(r, 'age_18_30', 0) or 0,
            'age_30_50': getattr(r, 'age_30_50', 0) or 0,
            'age_50_plus': getattr(r, 'age_50_plus', 0) or 0,
            'camera_id': getattr(r, 'camera_id', None),
        }
        for r in rows
    ]

    return {
        'data': data,
        'demographics': demographics,
        'hourlyCustomerFlow': hourly_customer_flow,
        'all_cameras': all_cameras,
    }


def _parse_timestamp(ts_str):
    """ISO veya 'YYYY-MM-DD HH:MM' formatında timestamp parse et."""
    if not ts_str:
        return None
    s = str(ts_str).replace('T', ' ')[:19]
    for fmt in ('%Y-%m-%d %H:%M:%S', '%Y-%m-%d %H:%M', '%Y-%m-%d'):
        try:
            return datetime.strptime(s[:len(fmt)], fmt)
        except (ValueError, TypeError):
            pass
    return None


def _to_istanbul_local_naive(dt_val):
    """Tüm modüller için tek standart: Europe/Istanbul local saat (naive)."""
    if not dt_val:
        return None
    if dt_val.tzinfo is not None:
        return dt_val.astimezone(ISTANBUL_TZ).replace(tzinfo=None)
    return dt_val


@analytics_bp.route('/customers', methods=['POST'])
@jwt_required()
def post_customer():
    """
    Müşteri verisi ekleme.
    ÖNEMLİ: Script'ten gelen timestamp'i (örn. '2026-03-09T10:00') doğrudan kullan.
    Daha önce parse hatası yüzünden timestamp boş kalıp datetime.utcnow() ile BUGÜNE yazılıyordu.
    """
    target_user_id = get_jwt_identity()
    data = request.get_json() or {}

    ts_raw = data.get('timestamp')
    ts = None
    if ts_raw:
        try:
            # ISO format (YYYY-MM-DDTHH:MM veya HH:MM:SS) bekliyoruz
            ts = datetime.fromisoformat(str(ts_raw))
        except Exception:
            ts = _parse_timestamp(ts_raw)
    ts = _to_istanbul_local_naive(ts)

    r = CustomerData(
        user_id=target_user_id,
        timestamp=ts if ts else datetime.utcnow(),
        camera_id=data.get('camera_id'),
        location=data.get('location'),
        customers_inside=data.get('customers_inside', 0),
        male_count=data.get('male_count', 0),
        female_count=data.get('female_count', 0),
        age_18_30=data.get('age_18_30', 0),
        age_30_50=data.get('age_30_50', 0),
        age_50_plus=data.get('age_50_plus', 0),
        zone_visited=data.get('zone_visited'),
        purchase_amount=data.get('purchase_amount', 0),
        is_returning=data.get('is_returning', False),
        satisfaction_score=data.get('satisfaction_score'),
        entered=data.get('entered', 0),
        exited=data.get('exited', 0),
    )
    db.session.add(r)
    db.session.commit()

    # Anomali tespiti: veri geldikten sonra arka planda kontrol et
    try:
        from routes.notifications import check_anomalies_for_user
        from models import User
        user = User.query.get(int(target_user_id))
        user_name = (user.full_name or user.username) if user else ''
        check_anomalies_for_user(int(target_user_id), user_name, data_timestamp=r.timestamp)
    except Exception as e:
        print(f"[Anomaly Check] Hata: {e}")

    return {'id': r.id, 'message': 'Kaydedildi'}, 201


@analytics_bp.route('/customers/flow-data', methods=['GET'])
@jwt_required()
def get_flow_data():
    """Günlük akış: tarih ve saate göre gruplar. Saat saat (10–23) döner; veri yoksa 0.
    Veritabanında saatlik veri için: POST /customers ile her saat için ayrı kayıt atılmalı (timestamp o saatin başı)."""
    user_ids = _user_ids()
    date_from = request.args.get('date_from')
    camera_id = request.args.get('camera_id')

    q = CustomerData.query.filter(CustomerData.user_id.in_(user_ids))
    if date_from:
        try:
            d = datetime.strptime(date_from, '%Y-%m-%d').date()
            utc_start, utc_end = _get_utc_range_for_local_date(d)
            q = q.filter(CustomerData.timestamp >= utc_start, CustomerData.timestamp <= utc_end)
        except ValueError:
            pass
    if camera_id and camera_id != 'all':
        q = q.filter(CustomerData.camera_id == camera_id)

    rows = q.order_by(CustomerData.timestamp).limit(500).all()

    # Tarih bazında grupla: data[dateStr] = { summary, hourly_data }
    result_data = {}
    by_date_hour = defaultdict(lambda: {'entered': 0, 'exited': 0, 'editable_id': None})

    for r in rows:
        if not r.timestamp:
            continue
        # Veritabanındaki timestamp zaten yerel saati temsil eder (naive)
        local_ts = r.timestamp
        date_str = local_ts.strftime('%Y-%m-%d')
        hour_str = local_ts.strftime('%H:00')
        key = (date_str, hour_str)
        by_date_hour[key]['entered'] += getattr(r, 'entered', 0) or 0
        by_date_hour[key]['exited'] += getattr(r, 'exited', 0) or 0
        if by_date_hour[key]['editable_id'] is None:
            by_date_hour[key]['editable_id'] = r.id

    for (date_str, hour_str), v in by_date_hour.items():
        if date_str not in result_data:
            result_data[date_str] = {'summary': {'total_entered': 0, 'total_exited': 0}, 'hourly_data': {}}
        result_data[date_str]['hourly_data'][hour_str] = {
            'entered': v['entered'],
            'exited': v['exited'],
            'editable_id': v['editable_id'],
        }
        result_data[date_str]['summary']['total_entered'] += v['entered']
        result_data[date_str]['summary']['total_exited'] += v['exited']

    # Her tarih için mesai saatleri arası tüm saatleri döndür; veri yoksa 0 (saat saat gösterim için)
    _wh_start, _wh_end = _get_work_hours(user_ids)
    for date_str in result_data:
        hourly = result_data[date_str]['hourly_data']
        for h in range(_wh_start, _wh_end):
            hour_key = f'{h:02d}:00'
            if hour_key not in hourly:
                hourly[hour_key] = {'entered': 0, 'exited': 0, 'editable_id': None}

    # Karşılaştırma istatistikleri: dün, geçen hafta aynı gün, geçen ay aynı gün
    comparison_stats = {'entered': [], 'exited': []}
    if date_from:
        try:
            target_date = datetime.strptime(date_from, '%Y-%m-%d').date()
            compare_periods = [
                ('Dün', target_date - timedelta(days=1)),
                ('Geçen Hafta', target_date - timedelta(days=7)),
                ('Geçen Ay', target_date - timedelta(days=30)),
            ]
            # Bugünün toplamları
            today_entered = 0
            today_exited = 0
            if date_from in result_data:
                today_entered = result_data[date_from]['summary']['total_entered']
                today_exited = result_data[date_from]['summary']['total_exited']

            for period_label, comp_date in compare_periods:
                comp_q = CustomerData.query.filter(
                    CustomerData.user_id.in_(user_ids),
                    db.func.date(CustomerData.timestamp) == comp_date,
                )
                if camera_id and camera_id != 'all':
                    comp_q = comp_q.filter(CustomerData.camera_id == camera_id)
                comp_rows = comp_q.all()
                comp_entered = sum(getattr(r, 'entered', 0) or 0 for r in comp_rows)
                comp_exited = sum(getattr(r, 'exited', 0) or 0 for r in comp_rows)

                entered_change = None
                if comp_entered > 0:
                    entered_change = round(((today_entered - comp_entered) / comp_entered) * 100, 1)
                elif today_entered > 0:
                    entered_change = 100.0

                exited_change = None
                if comp_exited > 0:
                    exited_change = round(((today_exited - comp_exited) / comp_exited) * 100, 1)
                elif today_exited > 0:
                    exited_change = 100.0

                comparison_stats['entered'].append({'period': period_label, 'change': entered_change})
                comparison_stats['exited'].append({'period': period_label, 'change': exited_change})
        except (ValueError, TypeError):
            pass

    return {'data': result_data, 'comparison_stats': comparison_stats}


@analytics_bp.route('/customers/record/<int:rid>', methods=['PUT', 'DELETE'])
@jwt_required()
def customer_record(rid):
    uids = _user_ids()
    r = CustomerData.query.filter(CustomerData.id == rid, CustomerData.user_id.in_(uids)).first_or_404()
    if request.method == 'DELETE':
        db.session.delete(r)
        db.session.commit()
        return {'message': 'Silindi'}
    data = request.get_json() or {}
    if 'entering' in data:
        r.entered = int(data['entering']) if data['entering'] is not None else 0
    if 'exiting' in data:
        r.exited = int(data['exiting']) if data['exiting'] is not None else 0
    db.session.commit()
    return {'message': 'Güncellendi'}


@analytics_bp.route('/customers/hourly-edit', methods=['PUT'])
@jwt_required()
def edit_customer_hourly():
    """
    Seçili kullanıcı + tarih + saat için toplam giren/çıkan değerlerini set eder.
    - Admin, ?store_id= ile belirli mağaza/kullanıcı seçebilir.
    - Aynı saat dilimindeki tüm CustomerData kayıtlarını siler ve tek bir kayıt oluşturur.
    """
    uids = _user_ids()
    if not uids:
        return {'error': 'Kullanıcı bulunamadı'}, 400

    data = request.get_json() or {}
    date_str = data.get('date')
    hour_str = data.get('hour')  # "HH:00"

    if not date_str or not hour_str:
        return {'error': 'date ve hour alanları zorunlu'}, 400

    # Sadece gönderilen alanları güncelle — gönderilmeyenler mevcut değerde kalır
    has_entered = 'entered' in data
    has_exited = 'exited' in data

    if not has_entered and not has_exited:
        return {'error': 'entered veya exited alanından en az biri gerekli'}, 400

    try:
        d: date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except (ValueError, TypeError):
        return {'error': 'Geçersiz tarih'}, 400

    try:
        hour = int(str(hour_str).split(':')[0])
    except (ValueError, TypeError):
        return {'error': 'Geçersiz saat'}, 400

    start_dt = datetime.combine(d, time(hour=hour))
    end_dt = start_dt + timedelta(hours=1)

    # Sadece seçili user_id'ler ve o gün/saat aralığındaki kayıtlar
    q = CustomerData.query.filter(
        CustomerData.user_id.in_(uids),
        CustomerData.timestamp >= start_dt,
        CustomerData.timestamp < end_dt,
    )
    rows = q.all()

    if rows:
        # Mevcut kayıt(lar) var — mevcut toplamları hesapla, sonra güncelle
        existing_entered = sum(getattr(r, 'entered', 0) or 0 for r in rows)
        existing_exited = sum(getattr(r, 'exited', 0) or 0 for r in rows)
        # Demografik verileri koru (toplam)
        existing_male = sum(getattr(r, 'male_count', 0) or 0 for r in rows)
        existing_female = sum(getattr(r, 'female_count', 0) or 0 for r in rows)
        existing_age_18_30 = sum(getattr(r, 'age_18_30', 0) or 0 for r in rows)
        existing_age_30_50 = sum(getattr(r, 'age_30_50', 0) or 0 for r in rows)
        existing_age_50_plus = sum(getattr(r, 'age_50_plus', 0) or 0 for r in rows)
        existing_location = rows[0].location
        existing_camera_id = rows[0].camera_id

        new_entered = int(data['entered']) if has_entered else existing_entered
        new_exited = int(data['exited']) if has_exited else existing_exited

        # Tüm mevcut kayıtları sil, tek birleşik kayıt yaz
        for r in rows:
            db.session.delete(r)

        if new_entered != 0 or new_exited != 0:
            target_user_id = int(uids[0])
            new_row = CustomerData(
                user_id=target_user_id,
                timestamp=start_dt,
                location=existing_location,
                customers_inside=0,
                male_count=existing_male,
                female_count=existing_female,
                age_18_30=existing_age_18_30,
                age_30_50=existing_age_30_50,
                age_50_plus=existing_age_50_plus,
                zone_visited=None,
                purchase_amount=0,
                is_returning=False,
                satisfaction_score=None,
                camera_id=existing_camera_id,
                entered=new_entered,
                exited=new_exited,
            )
            db.session.add(new_row)
    else:
        # Mevcut kayıt yok — sıfırdan oluştur
        new_entered = int(data['entered']) if has_entered else 0
        new_exited = int(data['exited']) if has_exited else 0

        if new_entered != 0 or new_exited != 0:
            target_user_id = int(uids[0])
            new_row = CustomerData(
                user_id=target_user_id,
                timestamp=start_dt,
                location=None,
                customers_inside=0,
                male_count=0,
                female_count=0,
                age_18_30=0,
                age_30_50=0,
                age_50_plus=0,
                zone_visited=None,
                purchase_amount=0,
                is_returning=False,
                satisfaction_score=None,
                entered=new_entered,
                exited=new_exited,
            )
            db.session.add(new_row)

    db.session.commit()
    return {'message': 'Saatlik toplam güncellendi', 'date': date_str, 'hour': hour_str}


# --- Queue Analytics ---
@analytics_bp.route('/queues/hourly-edit', methods=['PUT'])
@jwt_required()
def edit_queue_hourly():
    uids = _user_ids()
    if not uids:
        return {'error': 'Kullanıcı bulunamadı'}, 400

    data = request.get_json() or {}
    date_str = data.get('date')
    hour_str = data.get('hour')
    cashier_id = data.get('cashier_id', 'Bilinmeyen')

    if not date_str or not hour_str:
        return {'error': 'date ve hour alanları zorunlu'}, 400

    has_total = 'totalCustomers' in data
    has_avg_wait = 'avgWaitTime' in data

    if not has_total and not has_avg_wait:
        return {'error': 'totalCustomers veya avgWaitTime alanından en az biri gerekli'}, 400

    try:
        d: date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except (ValueError, TypeError):
        return {'error': 'Geçersiz tarih'}, 400

    try:
        hour = int(str(hour_str).split(':')[0])
    except (ValueError, TypeError):
        return {'error': 'Geçersiz saat'}, 400

    start_dt = datetime.combine(d, time(hour=hour))
    end_dt = start_dt + timedelta(hours=1)

    q = QueueData.query.filter(
        QueueData.user_id.in_(uids),
        db.func.coalesce(QueueData.recorded_at, QueueData.created_at) >= start_dt,
        db.func.coalesce(QueueData.recorded_at, QueueData.created_at) < end_dt
    )
    if cashier_id != 'all':
        q = q.filter(db.func.coalesce(QueueData.cashier_id, 'Bilinmeyen') == cashier_id)

    rows = q.all()

    existing_total = sum(getattr(r, 'total_customers', 1) or 1 for r in rows)
    existing_waits = [r.wait_time for r in rows if r.wait_time]
    existing_avg_wait = sum(existing_waits) / len(existing_waits) if existing_waits else 0

    new_total = int(data['totalCustomers']) if has_total else existing_total
    new_avg_wait = float(data['avgWaitTime']) if has_avg_wait else existing_avg_wait

    for r in rows:
        db.session.delete(r)

    if new_total > 0 or new_avg_wait > 0:
        target_user_id = int(uids[0])
        new_row = QueueData(
            user_id=target_user_id,
            recorded_at=start_dt,
            total_customers=max(1, new_total),
            wait_time=new_avg_wait,
            cashier_id=cashier_id if cashier_id != 'all' else 'Bilinmeyen',
        )
        db.session.add(new_row)

    db.session.commit()
    return {'message': 'Saatlik kuyruk toplamı güncellendi', 'date': date_str, 'hour': hour_str}


@analytics_bp.route('/heatmaps/hourly-edit', methods=['PUT'])
@jwt_required()
def edit_heatmap_hourly():
    uids = _user_ids()
    if not uids:
        return {'error': 'Kullanıcı bulunamadı'}, 400

    data = request.get_json() or {}
    date_str = data.get('date')
    hour_str = data.get('hour')
    zone = data.get('zone', 'genel')

    if not date_str or not hour_str:
        return {'error': 'date ve hour alanları zorunlu'}, 400

    has_total = 'totalVisitors' in data
    has_avg_dwell = 'avgDwellTime' in data

    if not has_total and not has_avg_dwell:
        return {'error': 'totalVisitors veya avgDwellTime alanından en az biri gerekli'}, 400

    try:
        d: date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except (ValueError, TypeError):
        return {'error': 'Geçersiz tarih'}, 400

    try:
        hour = int(str(hour_str).split(':')[0])
    except (ValueError, TypeError):
        return {'error': 'Geçersiz saat'}, 400

    start_dt = datetime.combine(d, time(hour=hour))
    end_dt = start_dt + timedelta(hours=1)

    q = HeatmapData.query.filter(
        HeatmapData.user_id.in_(uids),
        HeatmapData.recorded_at >= start_dt,
        HeatmapData.recorded_at < end_dt
    )
    if zone:
        q = q.filter(HeatmapData.zone == zone)

    rows = q.all()

    existing_total = sum(getattr(r, 'visitor_count', 0) or 0 for r in rows)
    existing_dwells = [r.intensity for r in rows if r.intensity]
    existing_avg_dwell = sum(existing_dwells) / len(existing_dwells) if existing_dwells else 0

    new_total = int(data['totalVisitors']) if has_total else existing_total
    new_avg_dwell = float(data['avgDwellTime']) if has_avg_dwell else existing_avg_dwell

    for r in rows:
        db.session.delete(r)

    if new_total > 0 or new_avg_dwell > 0:
        target_user_id = int(uids[0])
        new_row = HeatmapData(
            user_id=target_user_id,
            recorded_at=start_dt,
            date_recorded=d,
            visitor_count=new_total,
            intensity=new_avg_dwell,
            zone=zone
        )
        db.session.add(new_row)

    db.session.commit()
    return {'message': 'Saatlik heatmap güncellendi', 'date': date_str, 'hour': hour_str}
@analytics_bp.route('/queues/latest-date', methods=['GET'])
@jwt_required()
def get_queues_latest_date():
    """Queue verisi olan en son tarihi döner."""
    user_ids = _user_ids()
    row = (
        db.session.query(func.max(db.func.coalesce(QueueData.recorded_at, QueueData.created_at)))
        .filter(QueueData.user_id.in_(user_ids))
        .scalar()
    )
    if row:
        return {'date': row.strftime('%Y-%m-%d')}
    return {'date': datetime.now(ISTANBUL_TZ).strftime('%Y-%m-%d')}


@analytics_bp.route('/heatmaps/latest-date', methods=['GET'])
@jwt_required()
def get_heatmaps_latest_date():
    """Heatmap verisi olan en son tarihi döner."""
    user_ids = _user_ids()
    row = (
        db.session.query(func.max(HeatmapData.recorded_at))
        .filter(HeatmapData.user_id.in_(user_ids))
        .scalar()
    )
    if row:
        return {'date': row.strftime('%Y-%m-%d')}
    return {'date': datetime.now(ISTANBUL_TZ).strftime('%Y-%m-%d')}


@analytics_bp.route('/queues', methods=['GET'])
@jwt_required()
def get_queues():
    user_ids = _user_ids()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    status = request.args.get('status')
    
    q = QueueData.query.filter(QueueData.user_id.in_(user_ids))
    if status:
        q = q.filter(QueueData.status == status)
    pagination = q.order_by(QueueData.created_at.desc()).paginate(page=page, per_page=per_page)
    items = []
    for r in pagination.items:
        items.append({
            'id': r.id,
            'customer_id': r.customer_id,
            'enter_time': r.enter_time.isoformat() if r.enter_time else None,
            'exit_time': r.exit_time.isoformat() if r.exit_time else None,
            'wait_time': r.wait_time,
            'queue_position': r.queue_position,
            'cashier_id': r.cashier_id,
            'status': r.status,
        })
    return {'data': items, 'total': pagination.total, 'page': page}


@analytics_bp.route('/queues', methods=['POST'])
@jwt_required()
def post_queue():
    data = request.get_json() or {}
    ts_raw = data.get('timestamp')
    ts = None
    if ts_raw:
        try:
            ts = datetime.fromisoformat(str(ts_raw))
        except Exception:
            ts = _parse_timestamp(ts_raw)
    ts = _to_istanbul_local_naive(ts)
    enter_time = datetime.fromisoformat(data['enter_time']) if data.get('enter_time') else None
    exit_time = datetime.fromisoformat(data['exit_time']) if data.get('exit_time') else None
    enter_time = _to_istanbul_local_naive(enter_time)
    exit_time = _to_istanbul_local_naive(exit_time)
    r = QueueData(
        user_id=get_jwt_identity(),
        customer_id=data.get('customer_id'),
        enter_time=enter_time,
        exit_time=exit_time,
        wait_time=float(data.get('wait_time', 0) or 0),
        queue_position=data.get('queue_position'),
        cashier_id=data.get('cashier_id'),
        status=data.get('status'),
        total_customers=int(data.get('total_customers', 1) or 1),
        recorded_at=ts if ts else datetime.utcnow(),
    )
    db.session.add(r)
    db.session.commit()
    return {'id': r.id, 'message': 'Kaydedildi'}, 201


@analytics_bp.route('/queues/daily-summary', methods=['GET'])
@jwt_required()
def queues_daily_summary():
    user_ids = _user_ids()
    date_val = request.args.get('date_from') or request.args.get('date')
    date_to = request.args.get('date_to')
    cashier_ids = request.args.get('cashier_ids')

    q = QueueData.query.filter(QueueData.user_id.in_(user_ids))
    if date_val:
        try:
            d = datetime.strptime(date_val, '%Y-%m-%d').date()
            if date_to:
                d_to = datetime.strptime(date_to, '%Y-%m-%d').date()
                utc_start, _ = _get_utc_range_for_local_date(d)
                _, utc_end = _get_utc_range_for_local_date(d_to)
                q = q.filter(db.func.coalesce(QueueData.recorded_at, QueueData.created_at) >= utc_start, 
                             db.func.coalesce(QueueData.recorded_at, QueueData.created_at) <= utc_end)
            else:
                utc_start, utc_end = _get_utc_range_for_local_date(d)
                q = q.filter(db.func.coalesce(QueueData.recorded_at, QueueData.created_at) >= utc_start, 
                             db.func.coalesce(QueueData.recorded_at, QueueData.created_at) <= utc_end)
        except ValueError:
            pass
    # Tüm kasalar her zaman listede olsun (kasa filtresine bakılmadan, sadece tarihe göre)
    q_all_cashiers = QueueData.query.filter(QueueData.user_id.in_(user_ids))
    if date_val:
        try:
            d = datetime.strptime(date_val, '%Y-%m-%d').date()
            if date_to:
                d_to = datetime.strptime(date_to, '%Y-%m-%d').date()
                utc_start, _ = _get_utc_range_for_local_date(d)
                _, utc_end = _get_utc_range_for_local_date(d_to)
                q_all_cashiers = q_all_cashiers.filter(db.func.coalesce(QueueData.recorded_at, QueueData.created_at) >= utc_start, 
                                                       db.func.coalesce(QueueData.recorded_at, QueueData.created_at) <= utc_end)
            else:
                utc_start, utc_end = _get_utc_range_for_local_date(d)
                q_all_cashiers = q_all_cashiers.filter(db.func.coalesce(QueueData.recorded_at, QueueData.created_at) >= utc_start, 
                                                       db.func.coalesce(QueueData.recorded_at, QueueData.created_at) <= utc_end)
        except ValueError:
            pass
    all_cashiers = sorted(set(r[0] for r in q_all_cashiers.with_entities(QueueData.cashier_id).distinct().all() if r[0]))

    if cashier_ids and cashier_ids != 'all':
        q = q.filter(QueueData.cashier_id == cashier_ids)

    rows = q.all()

    from collections import defaultdict
    by_hour = defaultdict(lambda: {'totalCustomers': 0, 'wait_sum': 0, 'minWaitTime': float('inf'), 'maxWaitTime': 0, 'editable_id': None})
    for r in rows:
        dt = getattr(r, 'recorded_at', None) or r.created_at
        h = dt.strftime('%H') if dt else '00'
        cnt = getattr(r, 'total_customers', None) or 1
        wt = r.wait_time or 0
        by_hour[h]['totalCustomers'] += cnt
        by_hour[h]['wait_sum'] += wt * cnt
        by_hour[h]['minWaitTime'] = min(by_hour[h]['minWaitTime'], wt) if wt else by_hour[h]['minWaitTime']
        by_hour[h]['maxWaitTime'] = max(by_hour[h]['maxWaitTime'], wt)
        if by_hour[h]['editable_id'] is None:
            by_hour[h]['editable_id'] = r.id

    _wh_start, _wh_end = _get_work_hours(user_ids)
    hourly = []
    for h in range(_wh_start, _wh_end):
        key = str(h)
        v = by_hour[key]
        avg_wt = v['wait_sum'] / v['totalCustomers'] if v['totalCustomers'] > 0 else 0
        hourly.append({
            'hour': f'{h}:00',
            'totalCustomers': v['totalCustomers'],
            'avgWaitTime': round(avg_wt, 1),
            'minWaitTime': v['minWaitTime'] if v['minWaitTime'] != float('inf') else 0,
            'maxWaitTime': v['maxWaitTime'],
            'editable_id': v['editable_id'],
        })

    total_cust = sum(getattr(r, 'total_customers', 1) or 1 for r in rows)
    waits = [r.wait_time for r in rows if r.wait_time]
    avg_wait = sum(waits) / len(waits) if waits else 0

    by_cashier = defaultdict(lambda: {'totalCustomers': 0, 'wait_sum': 0})
    for r in rows:
        cid = r.cashier_id or 'Bilinmeyen'
        cnt = getattr(r, 'total_customers', 1) or 1
        by_cashier[cid]['totalCustomers'] += cnt
        by_cashier[cid]['wait_sum'] += (r.wait_time or 0) * cnt
    cashier_perf = [
        {'cashier': c, 'totalCustomers': v['totalCustomers'], 'avgWait': v['wait_sum'] / v['totalCustomers'] if v['totalCustomers'] > 0 else 0}
        for c, v in sorted(by_cashier.items())
    ]

    # Bekleme süresi dağılımı (saniye → aralık): 0-1 dk, 1-2 dk, 2-3 dk, 3-5 dk, 5+ dk
    buckets = [
        (0, 60, '0-1 dk'),
        (60, 120, '1-2 dk'),
        (120, 180, '2-3 dk'),
        (180, 300, '3-5 dk'),
        (300, float('inf'), '5+ dk'),
    ]
    dist_counts = defaultdict(int)
    for r in rows:
        wt = r.wait_time or 0
        cnt = getattr(r, 'total_customers', 1) or 1
        for lo, hi, label in buckets:
            if lo <= wt < hi:
                dist_counts[label] += cnt
                break
    wait_time_distribution = [{'range': label, 'count': dist_counts[label]} for _, _, label in buckets]

    return {
        'overallStats': {'totalCustomers': total_cust, 'avgWaitTime': avg_wait, 'maxWaitTime': max((r.wait_time or 0) for r in rows) if rows else 0},
        'hourlySummary': hourly,
        'waitTimeDistribution': wait_time_distribution,
        'cashierPerformance': cashier_perf,
        'allCashiers': all_cashiers,
        'availableCashiers': all_cashiers,
    }


@analytics_bp.route('/queues/record/<int:rid>', methods=['PUT', 'DELETE'])
@jwt_required()
def queue_record(rid):
    uids = _user_ids()
    r = QueueData.query.filter(QueueData.id == rid, QueueData.user_id.in_(uids)).first_or_404()
    if request.method == 'DELETE':
        db.session.delete(r)
        db.session.commit()
        return {'message': 'Silindi'}
    data = request.get_json() or {}
    if 'avgWaitTime' in data:
        r.wait_time = data['avgWaitTime']
    if 'totalCustomers' in data:
        r.total_customers = int(data['totalCustomers'])
    db.session.commit()
    return {'message': 'Güncellendi'}


# --- Heatmap ---
@analytics_bp.route('/heatmaps', methods=['GET'])
@jwt_required()
def get_heatmaps():
    user_ids = _user_ids()
    q = HeatmapData.query.filter(HeatmapData.user_id.in_(user_ids))
    rows = q.order_by(HeatmapData.created_at.desc()).limit(100).all()
    return {'data': [{'id': r.id, 'zone': r.zone, 'intensity': r.intensity, 'visitor_count': r.visitor_count, 'heatmap_type': r.heatmap_type} for r in rows]}


@analytics_bp.route('/heatmaps', methods=['POST'])
@jwt_required()
def post_heatmap():
    data = request.get_json() or {}
    ts_raw = data.get('timestamp')
    ts = None
    if ts_raw:
        try:
            ts = datetime.fromisoformat(str(ts_raw))
        except Exception:
            ts = _parse_timestamp(ts_raw)
    dt = ts if ts else datetime.utcnow()
    if data.get('date_recorded'):
        try:
            date_rec = datetime.strptime(str(data['date_recorded'])[:10], '%Y-%m-%d').date()
        except (ValueError, TypeError):
            date_rec = dt.date()
    else:
        date_rec = dt.date()
    r = HeatmapData(
        user_id=get_jwt_identity(),
        zone=data.get('zone'),
        intensity=float(data.get('intensity', 0) or 0),
        visitor_count=int(data.get('visitor_count', 0) or 0),
        camera_id=data.get('camera_id') or None,
        date_recorded=date_rec,
        recorded_at=ts if ts else datetime.utcnow(),
    )
    db.session.add(r)
    db.session.commit()
    return {'id': r.id, 'message': 'Kaydedildi'}, 201


@analytics_bp.route('/heatmaps/daily-summary', methods=['GET'])
@jwt_required()
def heatmaps_daily_summary():
    user_ids = _user_ids()
    date_val = request.args.get('date') or request.args.get('date_from')
    date_to = request.args.get('date_to')
    zone_ids = request.args.get('zone_ids')
    
    q = HeatmapData.query.filter(HeatmapData.user_id.in_(user_ids))
    if date_val:
        try:
            d = datetime.strptime(date_val, '%Y-%m-%d').date()
            if date_to:
                d_to = datetime.strptime(date_to, '%Y-%m-%d').date()
                q = q.filter(HeatmapData.date_recorded >= d, HeatmapData.date_recorded <= d_to)
            else:
                q = q.filter(HeatmapData.date_recorded == d)
        except ValueError:
            pass
    rows_filtered = q.all()
    if zone_ids and zone_ids != 'all':
        q = q.filter(HeatmapData.zone == zone_ids)
        rows = q.all()
    else:
        rows = rows_filtered

    # Tüm bölgeler her zaman listede olsun (zone filtresine bakılmadan, sadece tarihe göre)
    q_all_zones = HeatmapData.query.filter(HeatmapData.user_id.in_(user_ids))
    if date_val:
        try:
            d = datetime.strptime(date_val, '%Y-%m-%d').date()
            if date_to:
                d_to = datetime.strptime(date_to, '%Y-%m-%d').date()
                q_all_zones = q_all_zones.filter(HeatmapData.date_recorded >= d, HeatmapData.date_recorded <= d_to)
            else:
                q_all_zones = q_all_zones.filter(HeatmapData.date_recorded == d)
        except ValueError:
            pass
    zones = sorted(set(r[0] for r in q_all_zones.with_entities(HeatmapData.zone).distinct().all() if r[0]))
    
    # Saat bazında grupla (recorded_at veya created_at)
    by_hour = defaultdict(lambda: {'totalVisitors': 0, 'intensity_sum': 0, 'count': 0, 'editable_id': None})
    for r in rows:
        dt = getattr(r, 'recorded_at', None) or r.created_at
        h = dt.strftime('%H') if dt else '12'
        by_hour[h]['totalVisitors'] += r.visitor_count or 0
        inv = r.intensity or 0
        by_hour[h]['intensity_sum'] += inv
        by_hour[h]['count'] += 1
        if by_hour[h]['editable_id'] is None:
            by_hour[h]['editable_id'] = r.id
    
    _wh_start, _wh_end = _get_work_hours(user_ids)
    hourly = []
    for h in range(_wh_start, _wh_end):
        key = str(h)
        v = by_hour[key]
        avg_dwell = v['intensity_sum'] / v['count'] if v['count'] > 0 else 0
        hourly.append({
            'hour': f'{h}:00',
            'totalVisitors': v['totalVisitors'],
            'avgDwellTime': round(avg_dwell, 1),
            'editable_id': v['editable_id'],
        })
    
    total_visitors = sum(r.visitor_count or 0 for r in rows)
    avg_dwell = sum(r.intensity or 0 for r in rows) / len(rows) if rows else 0
    busiest = max(rows, key=lambda r: r.visitor_count or 0).zone if rows else 'N/A'
    
    zone_agg = defaultdict(lambda: {'totalVisitors': 0, 'intensity_sum': 0, 'count': 0})
    for r in rows:
        z = r.zone or 'Bilinmeyen'
        zone_agg[z]['totalVisitors'] += r.visitor_count or 0
        zone_agg[z]['intensity_sum'] += r.intensity or 0
        zone_agg[z]['count'] += 1
    zone_perf = [
        {'zone': z, 'totalVisitors': v['totalVisitors'], 'avgDwell': v['intensity_sum'] / v['count'] if v['count'] > 0 else 0}
        for z, v in sorted(zone_agg.items())
    ]
    
    return {
        'overallStats': {'totalVisitors': total_visitors, 'avgDwellTime': avg_dwell, 'busiestZone': busiest},
        'hourlySummary': hourly,
        'dwellTimeDistribution': [],
        'zonePerformance': zone_perf,
        'allZones': zones,
        'comparisonStats': {'totalVisitors': []},
    }


@analytics_bp.route('/heatmaps/record/<int:rid>', methods=['PUT', 'DELETE'])
@jwt_required()
def heatmap_record(rid):
    uids = _user_ids()
    r = HeatmapData.query.filter(HeatmapData.id == rid, HeatmapData.user_id.in_(uids)).first_or_404()
    if request.method == 'DELETE':
        db.session.delete(r)
        db.session.commit()
        return {'message': 'Silindi'}
    data = request.get_json() or {}
    if 'totalVisitors' in data:
        r.visitor_count = data['totalVisitors']
    if 'avgDwellTime' in data:
        r.intensity = data['avgDwellTime']
    db.session.commit()
    return {'message': 'Güncellendi'}


# --- Staff ---
@analytics_bp.route('/staff', methods=['GET'])
@jwt_required()
def get_staff():
    user_ids = _user_ids()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    status = request.args.get('status')
    
    q = StaffData.query.filter(StaffData.user_id.in_(user_ids))
    if status:
        q = q.filter(StaffData.status == status)
    pagination = q.order_by(StaffData.created_at.desc()).paginate(page=page, per_page=per_page)
    items = [{'id': r.id, 'staff_id': r.staff_id, 'name': r.name, 'role': r.role, 'location': r.location, 'activity_level': r.activity_level, 'status': r.status} for r in pagination.items]
    return {'data': items, 'total': pagination.total, 'page': page}


@analytics_bp.route('/staff', methods=['POST'])
@jwt_required()
def post_staff():
    data = request.get_json()
    r = StaffData(
        user_id=get_jwt_identity(),
        staff_id=data.get('staff_id'),
        name=data.get('name'),
        role=data.get('role'),
        location=data.get('location'),
        activity_level=data.get('activity_level'),
        status=data.get('status'),
    )
    db.session.add(r)
    db.session.commit()
    return {'id': r.id, 'message': 'Kaydedildi'}, 201


# --- Reports ---
@analytics_bp.route('/reports', methods=['GET'])
@jwt_required()
def get_reports():
    user_ids = _user_ids()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    pagination = Report.query.filter(Report.user_id.in_(user_ids)).order_by(Report.created_at.desc()).paginate(page=page, per_page=per_page)
    items = [{'id': str(r.id), 'analysis_type': r.report_type, 'name': r.report_name, 'status': 'completed', 'createdAt': r.created_at.isoformat() if r.created_at else None} for r in pagination.items]
    return {'reports': items, 'data': items, 'total': pagination.total, 'page': page}


@analytics_bp.route('/create-report', methods=['POST'])
@jwt_required()
def create_report():
    data = request.get_json()
    rtype = data.get('report_type') or data.get('analysisType', 'customer')
    dfrom = data.get('date_from') or data.get('dateFrom')
    dto = data.get('date_to') or data.get('dateTo')
    r = Report(
        user_id=get_jwt_identity(),
        report_type=rtype,
        report_name=data.get('report_name', f'{rtype} Raporu'),
        date_from=datetime.strptime(dfrom, '%Y-%m-%d').date() if dfrom else None,
        date_to=datetime.strptime(dto, '%Y-%m-%d').date() if dto else None,
    )
    db.session.add(r)
    db.session.commit()
    return {
        'report': {'id': str(r.id), 'analysis_type': rtype, 'status': 'completed', 'createdAt': r.created_at.isoformat() if r.created_at else None},
        'report_id': r.id
    }
