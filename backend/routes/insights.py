"""
Insights / Öneriler API - Verilere dayalı otomatik analiz ve öneriler üretir.
Her modül için ayrı endpoint: dashboard, customer, queue, heatmap, staff, flow
"""
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta, date
from collections import defaultdict
from sqlalchemy import func

from models import db, CustomerData, QueueData, HeatmapData, StaffData
from user_context import get_resolved_user_ids

insights_bp = Blueprint('insights', __name__)


def _user_ids():
    ids, _ = get_resolved_user_ids()
    return ids if ids else [get_jwt_identity()]


@insights_bp.route('/insights/dashboard', methods=['GET'])
@jwt_required()
def dashboard_insights():
    """Dashboard için genel öneriler."""
    user_ids = _user_ids()
    today = date.today()
    week_ago = today - timedelta(days=7)
    two_weeks_ago = today - timedelta(days=14)

    # Bu hafta vs geçen hafta karşılaştırma
    this_week = CustomerData.query.filter(
        CustomerData.user_id.in_(user_ids),
        func.date(CustomerData.timestamp) >= week_ago,
        func.date(CustomerData.timestamp) <= today
    ).all()

    last_week = CustomerData.query.filter(
        CustomerData.user_id.in_(user_ids),
        func.date(CustomerData.timestamp) >= two_weeks_ago,
        func.date(CustomerData.timestamp) < week_ago
    ).all()

    this_entered = sum(r.entered or 0 for r in this_week)
    last_entered = sum(r.entered or 0 for r in last_week)

    # Kuyruk analizi
    queue_this_week = QueueData.query.filter(
        QueueData.user_id.in_(user_ids),
        func.date(QueueData.recorded_at) >= week_ago
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

    # Trafik trendi
    if last_entered > 0:
        change_pct = ((this_entered - last_entered) / last_entered) * 100
        if change_pct > 10:
            insights.append({
                'type': 'success',
                'title': 'Müşteri Trafiği Artışta',
                'description': f'Bu hafta geçen haftaya göre %{change_pct:.1f} daha fazla müşteri ziyareti gerçekleşti. Yoğunluğa göre personel planlaması yapın.',
                'metric': f'+%{change_pct:.1f}',
                'priority': 'high'
            })
        elif change_pct < -10:
            insights.append({
                'type': 'warning',
                'title': 'Müşteri Trafiği Düşüşte',
                'description': f'Bu hafta geçen haftaya göre %{abs(change_pct):.1f} düşüş var. Kampanya veya vitrin değişikliği değerlendirin.',
                'metric': f'-%{abs(change_pct):.1f}',
                'priority': 'high'
            })
        else:
            insights.append({
                'type': 'info',
                'title': 'Trafik Stabil',
                'description': f'Müşteri trafiği geçen haftayla benzer seviyelerde (%{change_pct:.1f} değişim).',
                'metric': f'%{change_pct:.1f}',
                'priority': 'low'
            })

    # Kuyruk bekleme
    if avg_wait > 60:
        insights.append({
            'type': 'danger',
            'title': 'Kasa Bekleme Süresi Yüksek',
            'description': f'Ortalama bekleme süresi {avg_wait:.0f} saniye. Yoğun saatlerde ek kasa açılması önerilir.',
            'metric': f'{avg_wait:.0f}s',
            'priority': 'high'
        })
    elif avg_wait > 40:
        insights.append({
            'type': 'warning',
            'title': 'Kasa Bekleme Süresi Orta',
            'description': f'Ortalama bekleme {avg_wait:.0f} saniye. 15:00-18:00 arası yoğunluğu izleyin.',
            'metric': f'{avg_wait:.0f}s',
            'priority': 'medium'
        })
    else:
        insights.append({
            'type': 'success',
            'title': 'Kasa Akışı İyi',
            'description': f'Ortalama bekleme {avg_wait:.0f} saniye ile kabul edilebilir seviyede.',
            'metric': f'{avg_wait:.0f}s',
            'priority': 'low'
        })

    # Demografik öneri
    total_male = sum(r.male_count or 0 for r in this_week)
    total_female = sum(r.female_count or 0 for r in this_week)
    total_gender = total_male + total_female
    if total_gender > 0:
        female_pct = (total_female / total_gender) * 100
        if female_pct > 55:
            insights.append({
                'type': 'info',
                'title': 'Kadın Müşteri Yoğunluğu',
                'description': f'Ziyaretçilerin %{female_pct:.0f}\'i kadın. Kadın giyim ve kozmetik bölgelerine özel kampanyalar değerlendirin.',
                'metric': f'%{female_pct:.0f}',
                'priority': 'medium'
            })

    # En yoğun saat
    by_hour = defaultdict(int)
    for r in this_week:
        if r.timestamp:
            by_hour[r.timestamp.hour] += (r.entered or 0)
    if by_hour:
        peak_hour = max(by_hour, key=by_hour.get)
        insights.append({
            'type': 'info',
            'title': f'En Yoğun Saat: {peak_hour}:00',
            'description': f'Bu hafta en çok müşteri girişi saat {peak_hour}:00\'da gerçekleşti ({by_hour[peak_hour]} kişi). Bu saatte personel takviyesi yapın.',
            'metric': f'{peak_hour}:00',
            'priority': 'medium'
        })

    return {'insights': insights}


@insights_bp.route('/insights/customer', methods=['GET'])
@jwt_required()
def customer_insights():
    """Müşteri analizi önerileri."""
    user_ids = _user_ids()
    today = date.today()
    week_ago = today - timedelta(days=7)

    rows = CustomerData.query.filter(
        CustomerData.user_id.in_(user_ids),
        func.date(CustomerData.timestamp) >= week_ago
    ).all()

    insights = []

    if not rows:
        insights.append({
            'type': 'info',
            'title': 'Müşteri Verisi Yok',
            'description': 'Son 7 gün içinde müşteri verisi bulunmuyor. Kamera sisteminizin aktif olduğundan emin olun.',
            'metric': '0',
            'priority': 'medium'
        })
        insights.append({
            'type': 'info',
            'title': 'İpucu: Demografik Analiz',
            'description': 'Veri gelmeye başladığında yaş grubu, cinsiyet dağılımı ve geri dönüş oranı analizleri burada otomatik gösterilecektir.',
            'metric': 'Beklemede',
            'priority': 'low'
        })
        return {'insights': insights}

    # Yaş grubu analizi
    age_18_30 = sum(r.age_18_30 or 0 for r in rows)
    age_30_50 = sum(r.age_30_50 or 0 for r in rows)
    age_50_plus = sum(r.age_50_plus or 0 for r in rows)
    total_age = age_18_30 + age_30_50 + age_50_plus

    if total_age > 0:
        dominant_group = max([('18-30', age_18_30), ('30-50', age_30_50), ('50+', age_50_plus)], key=lambda x: x[1])
        pct = (dominant_group[1] / total_age) * 100
        insights.append({
            'type': 'info',
            'title': f'Baskın Yaş Grubu: {dominant_group[0]}',
            'description': f'Ziyaretçilerin %{pct:.0f}\'i {dominant_group[0]} yaş grubunda. Bu gruba yönelik ürün gamı ve pazarlama stratejisi önerilir.',
            'metric': f'%{pct:.0f}',
            'priority': 'medium'
        })

    # Geri dönen müşteri oranı
    returning = sum(1 for r in rows if r.is_returning)
    if len(rows) > 0:
        return_pct = (returning / len(rows)) * 100
        if return_pct > 30:
            insights.append({
                'type': 'success',
                'title': 'Yüksek Müşteri Sadakati',
                'description': f'Ziyaretçilerin %{return_pct:.0f}\'i geri dönen müşteri. Sadakat programınız iyi çalışıyor.',
                'metric': f'%{return_pct:.0f}',
                'priority': 'low'
            })
        elif return_pct < 15:
            insights.append({
                'type': 'warning',
                'title': 'Düşük Geri Dönüş Oranı',
                'description': f'Geri dönen müşteri oranı %{return_pct:.0f}. Sadakat kartı veya CRM kampanyaları ile oranı artırabilirsiniz.',
                'metric': f'%{return_pct:.0f}',
                'priority': 'high'
            })

    # Cinsiyet dağılımı analizi
    total_male = sum(r.male_count or 0 for r in rows)
    total_female = sum(r.female_count or 0 for r in rows)
    total_gender = total_male + total_female
    if total_gender > 0:
        female_pct = (total_female / total_gender) * 100
        male_pct = (total_male / total_gender) * 100
        dominant = 'kadın' if female_pct > male_pct else 'erkek'
        dominant_pct = max(female_pct, male_pct)
        insights.append({
            'type': 'info',
            'title': f'Cinsiyet Dağılımı: %{dominant_pct:.0f} {dominant.title()}',
            'description': f'Ziyaretçilerin %{dominant_pct:.0f}\'i {dominant} müşterilerden oluşuyor. {dominant.title()} odaklı kampanyalar değerlendirilebilir.',
            'metric': f'%{dominant_pct:.0f}',
            'priority': 'medium'
        })

    return {'insights': insights}


@insights_bp.route('/insights/queue', methods=['GET'])
@jwt_required()
def queue_insights():
    """Kuyruk analizi önerileri."""
    user_ids = _user_ids()
    today = date.today()
    week_ago = today - timedelta(days=7)

    rows = QueueData.query.filter(
        QueueData.user_id.in_(user_ids),
        func.date(QueueData.recorded_at) >= week_ago
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
    by_cashier = defaultdict(list)
    for r in rows:
        if r.cashier_id:
            by_cashier[r.cashier_id].append(r.wait_time or 0)

    if by_cashier:
        cashier_avgs = {k: sum(v)/len(v) for k, v in by_cashier.items()}
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
    by_hour = defaultdict(list)
    for r in rows:
        if r.recorded_at:
            by_hour[r.recorded_at.hour].append(r.wait_time or 0)

    peak_hours = sorted(by_hour.items(), key=lambda x: sum(x[1])/len(x[1]), reverse=True)[:3]
    if peak_hours:
        peak_list = ', '.join([f'{h}:00' for h, _ in peak_hours])
        insights.append({
            'type': 'info',
            'title': 'Yoğun Kuyruk Saatleri',
            'description': f'En uzun bekleme saatleri: {peak_list}. Bu saatlerde ek kasa açılması müşteri memnuniyetini artırır.',
            'metric': peak_list,
            'priority': 'medium'
        })

    return {'insights': insights}


@insights_bp.route('/insights/heatmap', methods=['GET'])
@jwt_required()
def heatmap_insights():
    """Isı haritası önerileri."""
    user_ids = _user_ids()
    today = date.today()
    week_ago = today - timedelta(days=7)

    rows = HeatmapData.query.filter(
        HeatmapData.user_id.in_(user_ids),
        HeatmapData.date_recorded >= week_ago
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

        # En uzun kalınan bölge
        zone_dwell_avg = {k: sum(v['dwell'])/len(v['dwell']) for k, v in by_zone.items() if v['dwell']}
        if zone_dwell_avg:
            longest_dwell = max(zone_dwell_avg, key=zone_dwell_avg.get)
            insights.append({
                'type': 'info',
                'title': f'En Uzun Kalınan: {longest_dwell}',
                'description': f'{longest_dwell} bölgesinde ortalama {zone_dwell_avg[longest_dwell]:.0f}s kalınıyor. İlgiyi satışa dönüştürmek için personel desteği sağlayın.',
                'metric': f'{zone_dwell_avg[longest_dwell]:.0f}s',
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


@insights_bp.route('/insights/staff', methods=['GET'])
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


@insights_bp.route('/insights/flow', methods=['GET'])
@jwt_required()
def flow_insights():
    """Günlük akış önerileri."""
    user_ids = _user_ids()
    today = date.today()
    yesterday = today - timedelta(days=1)

    today_rows = CustomerData.query.filter(
        CustomerData.user_id.in_(user_ids),
        func.date(CustomerData.timestamp) == today
    ).all()

    yesterday_rows = CustomerData.query.filter(
        CustomerData.user_id.in_(user_ids),
        func.date(CustomerData.timestamp) == yesterday
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
            'title': f'Bugünün Zirvesi: {peak_hour}:00',
            'description': f'Bugün en yoğun saat {peak_hour}:00 ({by_hour[peak_hour]} kişi), en sakin {quiet_hour}:00 ({by_hour[quiet_hour]} kişi).',
            'metric': f'{peak_hour}:00',
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
    """Kamera sağlığı önerileri (dummy - gerçek veri entegrasyonu yapılacak)."""
    insights = [
        {
            'type': 'warning',
            'title': 'Çevrimdışı Kamera Tespit Edildi',
            'description': 'Depo Kamerası son 1 saattir sinyal göndermiyor. Kamera bağlantısını ve ağ ayarlarını kontrol edin.',
            'metric': '1 kamera',
            'priority': 'high'
        },
        {
            'type': 'danger',
            'title': 'Yüksek Kopma Oranı',
            'description': 'Erkek Giyim Kamerası son 7 günde 8 kez bağlantı kopması yaşadı. Kablo veya ağ altyapısını kontrol edin.',
            'metric': '8 kopma',
            'priority': 'high'
        },
        {
            'type': 'success',
            'title': 'En Stabil Kamera',
            'description': 'Kadın Giyim Kamerası %99.9 uptime ile en stabil performansı gösteriyor. Hiç kopma yaşanmadı.',
            'metric': '%99.9',
            'priority': 'low'
        },
        {
            'type': 'info',
            'title': 'Ortalama FPS',
            'description': 'Çevrimiçi kameraların ortalama FPS değeri 26.3. Tüm kameralar kabul edilebilir performans aralığında.',
            'metric': '26.3 FPS',
            'priority': 'low'
        },
        {
            'type': 'warning',
            'title': 'Düşük FPS Uyarısı',
            'description': 'Erkek Giyim Kamerası ortalama 18.2 FPS ile düşük performans gösteriyor. Kamera kalitesini veya ağ bant genişliğini kontrol edin.',
            'metric': '18.2 FPS',
            'priority': 'medium'
        }
    ]
    return {'insights': insights}
