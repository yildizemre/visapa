"""
Insights / Öneriler API - Verilere dayalı otomatik analiz ve öneriler üretir.
Her modül için ayrı endpoint: dashboard, customer, queue, heatmap, staff, flow
"""
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta, date, time
from collections import defaultdict
from sqlalchemy import func
from zoneinfo import ZoneInfo

from models import db, CustomerData, QueueData, HeatmapData, StaffData
from user_context import get_resolved_user_ids

insights_bp = Blueprint('insights', __name__)
ISTANBUL_TZ = ZoneInfo("Europe/Istanbul")

def _get_utc_range_for_local_date(d: date):
    """DB'de naive yerel saat saklandığı için UTC dönüşümü yapılmaz."""
    local_start = datetime.combine(d, time.min)
    local_end = datetime.combine(d, time.max)
    return local_start, local_end

def _user_ids():
    ids, _ = get_resolved_user_ids()
    return ids if ids else [get_jwt_identity()]


@insights_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def dashboard_insights():
    """Dashboard için genel öneriler."""
    user_ids = _user_ids()
    today_local = datetime.now(ISTANBUL_TZ).date()
    week_ago_local = today_local - timedelta(days=7)
    two_weeks_ago_local = today_local - timedelta(days=14)

    # Bu hafta (son 7 gün dahil bugün)
    this_week_utc_start, _ = _get_utc_range_for_local_date(week_ago_local)
    _, this_week_utc_end = _get_utc_range_for_local_date(today_local)

    # Geçen hafta
    last_week_utc_start, _ = _get_utc_range_for_local_date(two_weeks_ago_local)
    _, last_week_utc_end = _get_utc_range_for_local_date(week_ago_local - timedelta(days=1))

    this_week = CustomerData.query.filter(
        CustomerData.user_id.in_(user_ids),
        CustomerData.timestamp >= this_week_utc_start,
        CustomerData.timestamp <= this_week_utc_end
    ).all()

    last_week = CustomerData.query.filter(
        CustomerData.user_id.in_(user_ids),
        CustomerData.timestamp >= last_week_utc_start,
        CustomerData.timestamp <= last_week_utc_end
    ).all()

    this_entered = sum(r.entered or 0 for r in this_week)
    last_entered = sum(r.entered or 0 for r in last_week)

    # Kuyruk analizi
    queue_this_week = QueueData.query.filter(
        QueueData.user_id.in_(user_ids),
        db.func.coalesce(QueueData.recorded_at, QueueData.created_at) >= this_week_utc_start,
        db.func.coalesce(QueueData.recorded_at, QueueData.created_at) <= this_week_utc_end
    ).all()
    avg_wait = sum(r.wait_time or 0 for r in queue_this_week) / max(len(queue_this_week), 1)

    insights = []

    if not this_week and not last_week:
        insights.append({
            'type': 'info',
            'title': 'Veri Bekleniyor',
            'description': 'Henüz bu dönem için müşteri verisi bulunmuyor. Mağaza AI servisi veri göndermeye başladığında burada otomatik analizler görünecektir.',
            'metric': '—',
            'priority': 'medium'
        })
        insights.append({
            'type': 'info',
            'title': 'İpucu: Tarih Aralığı',
            'description': 'Farklı bir tarih aralığı seçerek geçmiş verileri görüntüleyebilirsiniz.',
            'metric': 'Filtre',
            'priority': 'low'
        })
        return {'insights': insights}

    # 1. Hafta içi vs hafta sonu karşılaştırması
    weekday_entered = sum(r.entered or 0 for r in this_week if r.timestamp and r.timestamp.weekday() < 5)
    weekend_entered = sum(r.entered or 0 for r in this_week if r.timestamp and r.timestamp.weekday() >= 5)
    weekday_days = max(len(set(r.timestamp.date() for r in this_week if r.timestamp and r.timestamp.weekday() < 5)), 1)
    weekend_days = max(len(set(r.timestamp.date() for r in this_week if r.timestamp and r.timestamp.weekday() >= 5)), 1)
    weekday_avg = weekday_entered / weekday_days
    weekend_avg = weekend_entered / weekend_days if weekend_entered > 0 else 0
    if weekend_avg > 0 and weekday_avg > 0:
        ratio = weekend_avg / weekday_avg
        if ratio > 1.3:
            insights.append({
                'type': 'success',
                'title': 'Hafta Sonu Trafiği Güçlü',
                'description': f'Hafta sonu günlük ortalaması, hafta içinin {ratio:.1f}x üstünde. Hafta sonu kadrosu ve stok düzeyi buna göre planlanmalı.',
                'metric': f'{ratio:.1f}x',
                'priority': 'high'
            })
        elif ratio < 0.7:
            insights.append({
                'type': 'warning',
                'title': 'Hafta Sonu Trafiği Zayıf',
                'description': f'Hafta sonu ziyaretçi yoğunluğu hafta içinin altında kalıyor. Hafta sonu özel promosyon veya etkinlik planlanabilir.',
                'metric': f'{ratio:.1f}x',
                'priority': 'medium'
            })

    # 2. Saat bazlı en verimli pencere (çift saat dilimi)
    by_hour = defaultdict(int)
    for r in this_week:
        if r.timestamp:
            by_hour[r.timestamp.hour] += (r.entered or 0)
    if len(by_hour) >= 3:
        peak_hour = max(by_hour, key=by_hour.get)
        total_h = sum(by_hour.values())
        peak_share = (by_hour[peak_hour] / total_h * 100) if total_h > 0 else 0
        low_hour = min((h for h in by_hour if 10 <= h <= 17), key=lambda h: by_hour[h], default=None)
        if peak_share > 20:
            insights.append({
                'type': 'info',
                'title': f'Saat {peak_hour}:00 Kritik Pencere',
                'description': f'Günlük trafiğin %{peak_share:.0f}\'i tek saatte yoğunlaşıyor. Bu saatte tüm kasalar açık ve personel hazır olmalı.',
                'metric': f'%{peak_share:.0f}',
                'priority': 'high'
            })
        if low_hour is not None and by_hour[low_hour] < by_hour[peak_hour] * 0.2:
            insights.append({
                'type': 'info',
                'title': f'Saat {low_hour}:00 Fırsat Saati',
                'description': f'{low_hour}:00 trafiği zirveye kıyasla %{(1 - by_hour[low_hour]/by_hour[peak_hour])*100:.0f} daha düşük. Bu saatte indirim veya özel teklif ile talep canlandırılabilir.',
                'metric': f'{low_hour}:00',
                'priority': 'low'
            })

    # 3. Kuyruk/trafik verimlilik oranı
    if avg_wait > 0 and this_entered > 0:
        if avg_wait > 90:
            insights.append({
                'type': 'danger',
                'title': 'Kasa Kapasitesi Yetersiz',
                'description': f'Her 100 müşteriye düşen toplam bekleme yükü yüksek. Yoğun saatlerde en az 1 ek kasa devreye alınması müşteri memnuniyetini artırır.',
                'metric': f'{avg_wait:.0f}s/ort.',
                'priority': 'high'
            })
        elif avg_wait > 50:
            insights.append({
                'type': 'warning',
                'title': 'Kasa Yükü Takip Edilmeli',
                'description': f'Bekleme süresi kabul edilebilir sınırda ancak artış eğilimindeyse ek kasa için erkenden hazırlık yapılmalı.',
                'metric': f'{avg_wait:.0f}s',
                'priority': 'medium'
            })
        else:
            insights.append({
                'type': 'success',
                'title': 'Kasa Kapasitesi Yeterli',
                'description': f'Mevcut kasa düzeniyle bekleme süresi optimize seviyede. Kapasite bu trafik yoğunluğu için uygun.',
                'metric': f'{avg_wait:.0f}s',
                'priority': 'low'
            })

    # 4. Trafik değişim trendi + tahmin
    if last_entered > 0:
        change_pct = ((this_entered - last_entered) / last_entered) * 100
        projected_monthly = this_entered * 4
        if change_pct > 10:
            insights.append({
                'type': 'success',
                'title': 'Büyüme Momentumu Var',
                'description': f'Haftalık artış trendi devam ederse aylık ziyaretçi sayısı ~{projected_monthly:,.0f} olabilir. Stok ve personel planlamasını güncelleyin.',
                'metric': f'+%{change_pct:.1f}',
                'priority': 'medium'
            })
        elif change_pct < -10:
            insights.append({
                'type': 'warning',
                'title': 'Trafik Düşüş Riski',
                'description': f'İki haftalık karşılaştırmada düşüş gözlemleniyor. Vitrin yenileme, sosyal medya kampanyası veya fiyat etiketi güncellemesi düşünülebilir.',
                'metric': f'-%{abs(change_pct):.1f}',
                'priority': 'high'
            })

    return {'insights': insights}


@insights_bp.route('/customer', methods=['GET'])
@jwt_required()
def customer_insights():
    """Müşteri analizi önerileri - Her zaman tam 3 premium kart döner."""
    user_ids = _user_ids()
    today_local = datetime.now(ISTANBUL_TZ).date()
    week_ago_local = today_local - timedelta(days=7)
    week_ago_utc_start, _ = _get_utc_range_for_local_date(week_ago_local)

    # Verileri çek
    try:
        rows = CustomerData.query.filter(
            CustomerData.user_id.in_(user_ids),
            CustomerData.timestamp >= week_ago_utc_start
        ).all()
    except Exception as e:
        print("Database query failed, using empty list:", e)
        rows = []

    insights = []

    # --- KART 1: Sadakat / Geri Dönüş Oranı ---
    try:
        if rows:
            returning = sum(1 for r in rows if r.is_returning)
            return_pct = (returning / len(rows)) * 100
        else:
            return_pct = 0
            
        if return_pct > 40:
            insights.append({
                'type': 'success',
                'title': 'Güçlü Müşteri Sadakati',
                'description': f"Ziyaretçilerinizin %{return_pct:.0f}'i tekrar gelen müşteriler. Sadakat programı son derece etkin çalışıyor; VIP segment için ayrıcalıklı kampanyalar hazırlayın.",
                'metric': f'%{return_pct:.0f}',
                'priority': 'low'
            })
        elif return_pct > 15:
            insights.append({
                'type': 'info',
                'title': 'Orta Sadakat Seviyesi',
                'description': f"Tekrar ziyaret oranınız %{return_pct:.0f} seviyesinde. Üyelik veya sadakat kartı sistemi ile bu oranı %30 üzerine çıkarabilirsiniz.",
                'metric': f'%{return_pct:.0f}',
                'priority': 'medium'
            })
        else:
            insights.append({
                'type': 'warning',
                'title': 'Sadakat Geliştirme Fırsatı',
                'description': f"Tekrar ziyaret oranınız %{return_pct:.0f} — düşük seviyede. CRM entegrasyonu, kişiye özel indirim kuponları veya hoş geldin kampanyaları ile müşteri sadakatini artırın.",
                'metric': f'%{return_pct:.0f}',
                'priority': 'high'
            })
    except Exception as e:
        print("Error generating Card 1:", e)
        insights.append({
            'type': 'info',
            'title': 'Sadakat Analizi Hazırlanıyor',
            'description': 'Müşteri geri dönüş verileri işleniyor. Yeterli veri toplandığında sadakat analizi burada görünecektir.',
            'metric': '—',
            'priority': 'low'
        })

    # --- KART 2: Zirve Saat Penceresi ---
    try:
        by_hour = defaultdict(int)
        for r in rows:
            if r.timestamp:
                hour = r.timestamp.hour if hasattr(r.timestamp, 'hour') else int(str(r.timestamp).split(' ')[1].split(':')[0])
                by_hour[hour] += (r.entered or 0)
                
        if by_hour and sum(by_hour.values()) > 0:
            peak_h = max(by_hour, key=by_hour.get)
            total_h = sum(by_hour.values()) or 1
            peak_share = by_hour[peak_h] / total_h * 100
            daytime = {h: v for h, v in by_hour.items() if 10 <= h <= 20}
            quiet_h = min(daytime, key=daytime.get) if daytime else None
            
            if quiet_h is not None:
                insights.append({
                    'type': 'info',
                    'title': f'Saat {peak_h}:00 En Yoğun Pencere',
                    'description': f"Günlük müşteri trafiğinin %{peak_share:.0f}'i saat {peak_h}:00 civarında yoğunlaşıyor. Saat {quiet_h}:00'de trafik en düşük — bu saatte flash indirim veya özel etkinlik ile talep canlandırılabilir.",
                    'metric': f'{peak_h}:00',
                    'priority': 'medium'
                })
            else:
                insights.append({
                    'type': 'info',
                    'title': f'Saat {peak_h}:00 Zirve Trafiği',
                    'description': f"Trafiğin %{peak_share:.0f}'i saat {peak_h}:00'de yoğunlaşıyor. Bu saatte tüm kasa ve personel pozisyonlarının dolu olması kritik.",
                    'metric': f'{peak_h}:00',
                    'priority': 'medium'
                })
        else:
            insights.append({
                'type': 'info',
                'title': 'Saat Bazlı Analiz',
                'description': 'Henüz yeterli saatlik veri birikimi yok. Birkaç gün içinde en yoğun saatler otomatik tespit edilecektir.',
                'metric': '—',
                'priority': 'low'
            })
    except Exception as e:
        print("Error generating Card 2:", e)
        insights.append({
            'type': 'info',
            'title': 'Saat Analizi Hazırlanıyor',
            'description': 'Saatlik trafik verileri işleniyor. Yeterli veri toplandığında zirve saat analizi burada görünecektir.',
            'metric': '—',
            'priority': 'low'
        })

    # --- KART 3: Yaş/Cinsiyet Hedef Segmenti ---
    try:
        age_18_30 = sum(r.age_18_30 or 0 for r in rows) if rows else 0
        age_30_50 = sum(r.age_30_50 or 0 for r in rows) if rows else 0
        age_50_plus = sum(r.age_50_plus or 0 for r in rows) if rows else 0
        total_age = age_18_30 + age_30_50 + age_50_plus
        total_male = sum(r.male_count or 0 for r in rows) if rows else 0
        total_female = sum(r.female_count or 0 for r in rows) if rows else 0
        total_gender = total_male + total_female
        
        if total_age > 0 and total_gender > 0:
            dominant_age = max([('18-30', age_18_30), ('30-50', age_30_50), ('50+', age_50_plus)], key=lambda x: x[1])
            age_pct = dominant_age[1] / total_age * 100
            fem_pct = total_female / total_gender * 100
            gender_word = 'kadın' if fem_pct >= 50 else 'erkek'
            gender_pct = fem_pct if fem_pct >= 50 else (100 - fem_pct)
            
            insights.append({
                'type': 'info',
                'title': f'Hedef Segment: {dominant_age[0]} Yaş · {gender_word.title()}',
                'description': f"Müşteri profilinizin %{age_pct:.0f}'i {dominant_age[0]} yaş grubunda ve %{gender_pct:.0f}'i {gender_word}. Bu segmente özel ürün yerleşimi, sosyal medya içeriği ve e-posta kampanyaları dönüşüm oranını artırabilir.",
                'metric': f'%{age_pct:.0f}',
                'priority': 'medium'
            })
        elif total_age > 0:
            dominant_age = max([('18-30', age_18_30), ('30-50', age_30_50), ('50+', age_50_plus)], key=lambda x: x[1])
            age_pct = dominant_age[1] / total_age * 100
            insights.append({
                'type': 'info',
                'title': f'Baskın Yaş Grubu: {dominant_age[0]}',
                'description': f"Ziyaretçilerin %{age_pct:.0f}'i {dominant_age[0]} yaş grubunda. Bu kitleye yönelik vitrin düzenlemesi ve ürün önerileri hazırlayın.",
                'metric': f'%{age_pct:.0f}',
                'priority': 'medium'
            })
        else:
            insights.append({
                'type': 'info',
                'title': 'Demografik Veri Bekleniyor',
                'description': 'Mağazanızın yaş grubu ve cinsiyet dağılımı analizlerinin çıkarılması için yapay zeka kameralarından demografik veri akışı beklenmektedir.',
                'metric': 'Beklemede',
                'priority': 'low'
            })
    except Exception as e:
        print("Error generating Card 3:", e)
        insights.append({
            'type': 'info',
            'title': 'Demografik Analiz Hazırlanıyor',
            'description': 'Yaş ve cinsiyet verileri işleniyor. Yeterli veri toplandığında hedef segment analizi burada görünecektir.',
            'metric': '—',
            'priority': 'low'
        })

    # Her halükarda tam 3 kart döndüğünü doğrula (güvenlik koruması)
    while len(insights) < 3:
        insights.append({
            'type': 'info',
            'title': 'Akıllı Öneri Analizi',
            'description': 'Mağaza içi verimliliği artırmak için reyon doluluk oranlarını ve yaya yollarını sürekli güncel tutun.',
            'metric': 'Öneri',
            'priority': 'low'
        })

    return {'insights': insights[:3]}


@insights_bp.route('/queue', methods=['GET'])
@jwt_required()
def queue_insights():
    """Kuyruk analizi önerileri."""
    user_ids = _user_ids()
    today_local = datetime.now(ISTANBUL_TZ).date()
    week_ago_local = today_local - timedelta(days=7)

    week_ago_utc_start, _ = _get_utc_range_for_local_date(week_ago_local)

    rows = QueueData.query.filter(
        QueueData.user_id.in_(user_ids),
        db.func.coalesce(QueueData.recorded_at, QueueData.created_at) >= week_ago_utc_start
    ).all()

    insights = []

    if not rows:
        insights.append({
            'type': 'info',
            'title': 'Kuyruk Verisi Yok',
            'description': 'Son 7 gün içinde kuyruk verisi bulunmuyor. Kasa kameralarının aktif olduğundan emin olun.',
            'metric': '0',
            'priority': 'medium'
        })
        insights.append({
            'type': 'info',
            'title': 'İpucu: Kasa Analizi',
            'description': 'Veri geldiğinde en hızlı/yavaş kasa, yoğun saatler ve bekleme süresi analizleri otomatik oluşturulacaktır.',
            'metric': 'Beklemede',
            'priority': 'low'
        })
        return {'insights': insights}

    # Kasa bazlı performans
    by_cashier = defaultdict(lambda: {'wait_sum': 0, 'total': 0})
    for r in rows:
        if r.cashier_id:
            cnt = getattr(r, 'total_customers', 1) or 1
            wt = r.wait_time or 0
            by_cashier[r.cashier_id]['wait_sum'] += wt * cnt
            by_cashier[r.cashier_id]['total'] += cnt

    if by_cashier:
        cashier_avgs = {k: v['wait_sum']/v['total'] for k, v in by_cashier.items() if v['total'] > 0}
        
        if cashier_avgs:
            slowest = max(cashier_avgs, key=cashier_avgs.get)
            fastest = min(cashier_avgs, key=cashier_avgs.get)

            insights.append({
                'type': 'warning',
                'title': f'En Yavaş Kasa: {slowest}',
                'description': f'{slowest} ortalama {cashier_avgs[slowest]:.0f}s bekleme ile en yavaş kasa. Personel eğitimi veya teknik kontrol önerilir.',
                'metric': f'{cashier_avgs[slowest]:.0f}s',
                'priority': 'high'
            })

            insights.append({
                'type': 'success',
                'title': f'En Hızlı Kasa: {fastest}',
                'description': f'{fastest} ortalama {cashier_avgs[fastest]:.0f}s ile en verimli kasa.',
                'metric': f'{cashier_avgs[fastest]:.0f}s',
                'priority': 'low'
            })

    # Saatlik yoğunluk analizi
    by_hour = defaultdict(lambda: {'wait_sum': 0, 'total': 0})
    for r in rows:
        dt = getattr(r, 'recorded_at', None) or r.created_at
        if dt:
            cnt = getattr(r, 'total_customers', 1) or 1
            wt = r.wait_time or 0
            by_hour[dt.hour]['wait_sum'] += wt * cnt
            by_hour[dt.hour]['total'] += cnt

    if by_hour:
        hour_avgs = {h: v['wait_sum']/v['total'] for h, v in by_hour.items() if v['total'] > 0}
        peak_hours = sorted(hour_avgs.items(), key=lambda x: x[1], reverse=True)[:3]
        if peak_hours:
            peak_list = ', '.join([f'{h:02d}:00' for h, _ in peak_hours])
            insights.append({
                'type': 'info',
                'title': 'Yoğun Kuyruk Saatleri',
                'description': f'En uzun bekleme saatleri: {peak_list}. Bu saatlerde ek kasa açılması müşteri memnuniyetini artırır.',
                'metric': peak_list,
                'priority': 'medium'
            })

            # Vardiya Planlama Önerisi (Akıllı Özellik)
            busiest_hour = peak_hours[0][0]
            insights.append({
                'type': 'success',
                'title': 'Akıllı Vardiya Planlaması',
                'description': f'Analizlere göre {busiest_hour:02d}:00 - {(busiest_hour+3):02d}:00 saatleri arası kuyruklar zirve yapıyor. Öğle arası veya mola planlamalarını bu saat dilimi dışına kaydırmanız ve ek personel bulundurmanız tavsiye edilir.',
                'metric': 'AI Önerisi',
                'priority': 'medium'
            })

    return {'insights': insights}


@insights_bp.route('/heatmap', methods=['GET'])
@jwt_required()
def heatmap_insights():
    """Isı haritası önerileri."""
    user_ids = _user_ids()
    today_local = datetime.now(ISTANBUL_TZ).date()
    week_ago_local = today_local - timedelta(days=7)

    # heatmap için date_recorded zaten date field, timezone dönüşümüne gerek yok 
    # (eğer utc saat farkından gün kaymıyorsa, genelde date doğrudan tutulur)
    rows = HeatmapData.query.filter(
        HeatmapData.user_id.in_(user_ids),
        HeatmapData.date_recorded >= week_ago_local
    ).all()

    insights = []

    if not rows:
        insights.append({
            'type': 'info',
            'title': 'Isı Haritası Verisi Yok',
            'description': 'Son 7 gün içinde ısı haritası verisi bulunmuyor. Bölge kameralarının aktif olduğundan emin olun.',
            'metric': '0',
            'priority': 'medium'
        })
        insights.append({
            'type': 'info',
            'title': 'İpucu: Bölge Analizi',
            'description': 'Veri geldiğinde en popüler bölge, kalma süresi ve düşük trafikli alan analizleri otomatik üretilecektir.',
            'metric': 'Beklemede',
            'priority': 'low'
        })
        return {'insights': insights}

    # Bölge bazlı yoğunluk
    by_zone = defaultdict(lambda: {'visitors': 0, 'dwell': []})
    for r in rows:
        if r.zone:
            by_zone[r.zone]['visitors'] += (r.visitor_count or 0)
            by_zone[r.zone]['dwell'].append(r.intensity or 0)

    if by_zone:
        # En popüler bölge
        most_visited = max(by_zone.items(), key=lambda x: x[1]['visitors'])
        insights.append({
            'type': 'success',
            'title': f'En Popüler Bölge: {most_visited[0]}',
            'description': f'{most_visited[0]} bu hafta {most_visited[1]["visitors"]} ziyaretçi ile en yoğun bölge. Ürün çeşitliliğini artırın.',
            'metric': f'{most_visited[1]["visitors"]}',
            'priority': 'medium'
        })

        # En yoğun bölge (intensity skoru)
        zone_intensity_avg = {k: sum(v['dwell'])/len(v['dwell']) for k, v in by_zone.items() if v['dwell']}
        if zone_intensity_avg:
            most_intense = max(zone_intensity_avg, key=zone_intensity_avg.get)
            insights.append({
                'type': 'info',
                'title': f'En Yoğun İlgi: {most_intense}',
                'description': f'{most_intense} bölgesinde yoğunluk skoru {zone_intensity_avg[most_intense]:.1f} ile en yüksek. İlgiyi satışa dönüştürmek için personel desteği sağlayın.',
                'metric': f'{zone_intensity_avg[most_intense]:.1f}',
                'priority': 'medium'
            })

        # En az ziyaret edilen bölge
        least_visited = min(by_zone.items(), key=lambda x: x[1]['visitors'])
        insights.append({
            'type': 'warning',
            'title': f'Düşük Trafik: {least_visited[0]}',
            'description': f'{least_visited[0]} sadece {least_visited[1]["visitors"]} ziyaretçi aldı. Yönlendirme tabelaları ve kampanya düzenlemesi önerilir.',
            'metric': f'{least_visited[1]["visitors"]}',
            'priority': 'high'
        })

    return {'insights': insights}


@insights_bp.route('/staff', methods=['GET'])
@jwt_required()
def staff_insights():
    """Personel önerileri."""
    user_ids = _user_ids()

    rows = StaffData.query.filter(StaffData.user_id.in_(user_ids)).all()

    insights = []

    if not rows:
        insights.append({
            'type': 'info',
            'title': 'Personel Verisi Yok',
            'description': 'Henüz personel verisi bulunmuyor. Personel takip sistemi aktif olduğunda burada verimlilik analizleri görünecektir.',
            'metric': '0',
            'priority': 'medium'
        })
        insights.append({
            'type': 'info',
            'title': 'İpucu: Verimlilik Takibi',
            'description': 'Aktif personel oranı, ortalama verimlilik ve pozisyon dağılımı gibi metrikler otomatik hesaplanacaktır.',
            'metric': 'Beklemede',
            'priority': 'low'
        })
        return {'insights': insights}

    if rows:
        active_count = sum(1 for r in rows if r.status == 'active')
        total = len(rows)
        active_pct = (active_count / total) * 100 if total > 0 else 0

        avg_activity = sum(r.activity_level or 0 for r in rows) / total if total > 0 else 0

        if active_pct < 70:
            insights.append({
                'type': 'warning',
                'title': 'Düşük Aktif Personel Oranı',
                'description': f'Personelin sadece %{active_pct:.0f}\'i aktif durumda. Mola planlamasını optimize edin.',
                'metric': f'%{active_pct:.0f}',
                'priority': 'high'
            })
        else:
            insights.append({
                'type': 'success',
                'title': 'İyi Personel Dağılımı',
                'description': f'Personelin %{active_pct:.0f}\'i aktif durumda, mağaza kapasitesi iyi.',
                'metric': f'%{active_pct:.0f}',
                'priority': 'low'
            })

        if avg_activity < 0.7:
            insights.append({
                'type': 'warning',
                'title': 'Düşük Verimlilik',
                'description': f'Ortalama personel verimliliği %{avg_activity*100:.0f}. Eğitim ve motivasyon programları değerlendirin.',
                'metric': f'%{avg_activity*100:.0f}',
                'priority': 'high'
            })
        else:
            insights.append({
                'type': 'success',
                'title': 'Yüksek Verimlilik',
                'description': f'Ortalama personel verimliliği %{avg_activity*100:.0f} ile hedefin üzerinde.',
                'metric': f'%{avg_activity*100:.0f}',
                'priority': 'low'
            })

        # Rol dağılımı
        by_role = defaultdict(int)
        for r in rows:
            by_role[r.role] += 1
        most_common_role = max(by_role, key=by_role.get)
        insights.append({
            'type': 'info',
            'title': f'En Kalabalık Pozisyon: {most_common_role}',
            'description': f'{by_role[most_common_role]} personel ile {most_common_role} en kalabalık pozisyon.',
            'metric': str(by_role[most_common_role]),
            'priority': 'low'
        })

    return {'insights': insights}


@insights_bp.route('/flow', methods=['GET'])
@jwt_required()
def flow_insights():
    """Günlük akış önerileri."""
    user_ids = _user_ids()
    today_local = datetime.now(ISTANBUL_TZ).date()
    yesterday_local = today_local - timedelta(days=1)

    today_utc_start, today_utc_end = _get_utc_range_for_local_date(today_local)
    yesterday_utc_start, yesterday_utc_end = _get_utc_range_for_local_date(yesterday_local)

    today_rows = CustomerData.query.filter(
        CustomerData.user_id.in_(user_ids),
        CustomerData.timestamp >= today_utc_start,
        CustomerData.timestamp <= today_utc_end
    ).all()

    yesterday_rows = CustomerData.query.filter(
        CustomerData.user_id.in_(user_ids),
        CustomerData.timestamp >= yesterday_utc_start,
        CustomerData.timestamp <= yesterday_utc_end
    ).all()

    insights = []

    if not today_rows and not yesterday_rows:
        insights.append({
            'type': 'info',
            'title': 'Akış Verisi Yok',
            'description': 'Bugün ve dün için müşteri akış verisi bulunmuyor. Kamera sisteminizi kontrol edin.',
            'metric': '0',
            'priority': 'medium'
        })
        insights.append({
            'type': 'info',
            'title': 'İpucu: Günlük Takip',
            'description': 'Veri geldiğinde saatlik zirve, dün ile karşılaştırma ve net akış analizleri otomatik gösterilecektir.',
            'metric': 'Beklemede',
            'priority': 'low'
        })
        return {'insights': insights}

    today_entered = sum(r.entered or 0 for r in today_rows)
    yesterday_entered = sum(r.entered or 0 for r in yesterday_rows)

    if yesterday_entered > 0:
        change = ((today_entered - yesterday_entered) / yesterday_entered) * 100
        if change > 15:
            insights.append({
                'type': 'success',
                'title': 'Bugün Daha Yoğun',
                'description': f'Bugünkü giriş düne göre %{change:.0f} daha fazla. Personel desteği artırılabilir.',
                'metric': f'+%{change:.0f}',
                'priority': 'medium'
            })
        elif change < -15:
            insights.append({
                'type': 'warning',
                'title': 'Bugün Daha Sakin',
                'description': f'Bugünkü giriş düne göre %{abs(change):.0f} düşük. Haftalık trend takip edilmeli.',
                'metric': f'-%{abs(change):.0f}',
                'priority': 'medium'
            })

    # Saatlik dağılım bugün
    by_hour = defaultdict(int)
    for r in today_rows:
        if r.timestamp:
            by_hour[r.timestamp.hour] += (r.entered or 0)

    if by_hour:
        peak_hour = max(by_hour, key=by_hour.get)
        quiet_hour = min(by_hour, key=by_hour.get)
        insights.append({
            'type': 'info',
            'title': f'Bugünün Zirvesi: {peak_hour:02d}:00',
            'description': f'Bugün en yoğun saat {peak_hour:02d}:00 ({by_hour[peak_hour]} kişi), en sakin {quiet_hour:02d}:00 ({by_hour[quiet_hour]} kişi).',
            'metric': f'{peak_hour:02d}:00',
            'priority': 'low'
        })

    # Net akış
    today_exited = sum(r.exited or 0 for r in today_rows)
    net = today_entered - today_exited
    insights.append({
        'type': 'info',
        'title': f'Net Akış: {"+" if net >= 0 else ""}{net} kişi',
        'description': f'Bugün {today_entered} giriş, {today_exited} çıkış. Mağazada tahmini {max(0, net)} kişi bulunuyor.',
        'metric': str(today_entered),
        'priority': 'low'
    })

    return {'insights': insights}


@insights_bp.route('/insights/camera_health', methods=['GET'])
@jwt_required()
def camera_health_insights():
    """Kamera sağlığı önerileri — gerçek heartbeat verisine dayalı."""
    from models import ServiceHeartbeat, SiteConfig, Company
    from routes.health import KNOWN_MODULES, MODULE_TIMEOUT_MINUTES, _load_module_pings
    user_ids = _user_ids()
    now = datetime.utcnow()
    cutoff = now - timedelta(minutes=MODULE_TIMEOUT_MINUTES)
    insights = []

    # Kullanıcının heartbeat durumunu kontrol et
    recs = ServiceHeartbeat.query.filter(ServiceHeartbeat.user_id.in_(user_ids)).all()
    if not recs:
        insights.append({
            'type': 'info',
            'title': 'Sistem Durumu Bekleniyor',
            'description': 'Henüz mağaza AI servisinden heartbeat verisi gelmedi. Sistem çalışmaya başladığında modül durumları burada görünecektir.',
            'metric': 'Beklemede',
            'priority': 'medium'
        })
        return {'insights': insights}

    alive_modules = 0
    dead_modules = []
    total_modules = len(KNOWN_MODULES)
    last_ping = None

    for rec in recs:
        mp = _load_module_pings(rec)
        for m in KNOWN_MODULES:
            ping_str = mp.get(m)
            if ping_str:
                try:
                    ping_dt = datetime.fromisoformat(ping_str)
                    if ping_dt > cutoff:
                        alive_modules += 1
                    else:
                        dead_modules.append(m)
                    if last_ping is None or ping_dt > last_ping:
                        last_ping = ping_dt
                except (ValueError, TypeError):
                    dead_modules.append(m)
            else:
                dead_modules.append(m)

    MODULE_TR = {'counting': 'Kişi Sayım', 'heatmap': 'Isı Haritası', 'queue': 'Kasa Analizi'}

    if alive_modules == total_modules:
        insights.append({
            'type': 'success',
            'title': 'Tüm Modüller Aktif',
            'description': f'Kişi Sayım, Isı Haritası ve Kasa Analizi modülleri sorunsuz çalışıyor.',
            'metric': f'{alive_modules}/{total_modules}',
            'priority': 'low'
        })
    elif alive_modules > 0:
        dead_names = ', '.join(MODULE_TR.get(m, m) for m in dead_modules)
        insights.append({
            'type': 'warning',
            'title': 'Bazı Modüller Yanıt Vermiyor',
            'description': f'{dead_names} modüllerinden {MODULE_TIMEOUT_MINUTES} dakikadır sinyal gelmiyor. Mağaza AI servisini kontrol edin.',
            'metric': f'{alive_modules}/{total_modules}',
            'priority': 'high'
        })
    else:
        # Mesai dışı mı kontrol et
        local_hour = (now + timedelta(hours=3)).hour
        uid = user_ids[0] if user_ids else None
        site = SiteConfig.query.filter_by(user_id=uid).first() if uid else None
        ws = site.work_start if site and site.work_start is not None else 9
        we = site.work_end if site and site.work_end is not None else 22
        if local_hour >= we or local_hour < ws:
            insights.append({
                'type': 'info',
                'title': 'Mesai Dışı',
                'description': f'Mağaza mesai saatleri ({ws}:00 - {we}:00) dışında. Sistem mesai başladığında otomatik aktif olacaktır.',
                'metric': 'Kapalı',
                'priority': 'low'
            })
        else:
            insights.append({
                'type': 'danger',
                'title': 'Tüm Modüller Kapalı',
                'description': f'{MODULE_TIMEOUT_MINUTES} dakikadır hiçbir modülden sinyal gelmiyor. Mağaza AI servisinin çalışıp çalışmadığını kontrol edin.',
                'metric': f'0/{total_modules}',
                'priority': 'high'
            })

    if last_ping:
        local_ping = last_ping + timedelta(hours=3)
        insights.append({
            'type': 'info',
            'title': 'Son Sinyal',
            'description': f'Son veri sinyali {local_ping.strftime("%d.%m.%Y %H:%M")} TSİ\'de alındı.',
            'metric': local_ping.strftime('%H:%M'),
            'priority': 'low'
        })

    return {'insights': insights}
