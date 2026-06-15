import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, AlertTriangle, CheckCircle2, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { useLanguage } from '../../contexts/LanguageContext';

interface Insight {
  type: 'success' | 'warning' | 'danger' | 'info';
  title: string;
  description: string;
  metric: string;
  priority: 'high' | 'medium' | 'low';
}

interface InsightsPanelProps {
  module: 'dashboard' | 'customer' | 'queue' | 'heatmap' | 'staff' | 'flow' | 'camera_health';
  refreshTrigger?: number;
}

const translateAndEnhance = (insight: Insight, lang: string): Insight => {
  if (lang === 'tr') return insight;

  // Title Translations Map
  const titleMap: Record<string, string> = {
    'Veri Bekleniyor': 'Data Pending',
    'İpucu: Tarih Aralığı': 'Tip: Date Range',
    'Hafta Sonu Trafiği Güçlü': 'Strong Weekend Traffic',
    'Hafta Sonu Trafiği Zayıf': 'Weak Weekend Traffic',
    'Kritik Pencere': 'Critical Peak Window',
    'Fırsat Saati': 'Opportunity Hour',
    'Kasa Kapasitesi Yetersiz': 'Insufficient Cashier Capacity',
    'Kasa Yükü Takip Edilmeli': 'Monitor Cashier Workload',
    'Kasa Kapasitesi Yeterli': 'Optimal Cashier Capacity',
    'Büyüme Momentumu Var': 'Growth Momentum Detected',
    'Trafik Düşüş Riski': 'Traffic Decline Risk',
    'Müşteri Verisi Yok': 'No Customer Data Available',
    'İpucu: Demografik Analiz': 'Tip: Demographic Analysis',
    'Güçlü Müşteri Sadakati': 'Strong Customer Loyalty',
    'Orta Sadakat Seviyesi': 'Moderate Loyalty Level',
    'Sadakat Geliştirme Fırsatı': 'Loyalty Improvement Opportunity',
    'En Yoğun Pencere': 'Peak Traffic Window',
    'Zirve Trafiği': 'Peak Traffic Window',
    'Saat Bazlı Analiz': 'Hourly Traffic Analysis',
    'Hedef Segment': 'Target Customer Segment',
    'Baskın Yaş Grubu': 'Dominant Age Group',
    'Yeni Müşteri Büyümesi': 'New Customer Growth',
    'Kuyruk Verisi Yok': 'No Queue Data Available',
    'İpucu: Kasa Analizi': 'Tip: Cashier Performance Analysis',
    'En Yavaş Kasa': 'Slowest Checkout Lane',
    'En Hızlı Kasa': 'Fastest Checkout Lane',
    'Yoğun Kuyruk Saatleri': 'Peak Queue Hours',
    'Akıllı Vardiya Planlaması': 'Smart Shift Planning',
    'Isı Haritası Verisi Yok': 'No Heatmap Data Available',
    'İpucu: Bölge Analizi': 'Tip: Zone Analysis',
    'En Popüler Bölge': 'Most Popular Zone',
    'En Uzun Kalınan': 'Longest Dwell Time Area',
    'Düşük Trafik': 'Low Foot-Traffic Zone',
    'Personel Verisi Yok': 'No Staff Data Available',
    'İpucu: Verimlilik Takibi': 'Tip: Efficiency Tracking',
    'Düşük Aktif Personel Oranı': 'Low Active Staff Ratio',
    'İyi Personel Dağılımı': 'Good Staff Allocation',
    'Düşük Verimlilik': 'Low Staff Efficiency',
    'Yüksek Verimlilik': 'High Staff Efficiency',
    'En Kalabalık Pozisyon': 'Most Crowded Position',
    'Akış Verisi Yok': 'No Flow Data Available',
    'İpucu: Günlük Takip': 'Tip: Daily Flow Tracking',
    'Bugün Daha Yoğun': 'Today is Busiest',
    'Bugün Daha Sakin': 'Today is Quieter',
    'Bugünün Zirvesi': 'Peak of Today',
    'Net Akış': 'Net Customer Flow',
    'Çevrimdışı Kamera Tespit Edildi': 'Offline Camera Detected',
    'Yüksek Kopma Oranı': 'High Connection Drop Rate',
    'En Stabil Kamera': 'Most Stable Camera',
    'Ortalama FPS': 'Average FPS Rate',
    'Düşük FPS Uyarısı': 'Low FPS Warning',
  };

  // Safe fallback translation for titles
  let title = insight.title;
  for (const [tr, en] of Object.entries(titleMap)) {
    if (title.toLowerCase().includes(tr.toLowerCase()) || tr.toLowerCase().includes(title.toLowerCase())) {
      title = en;
      break;
    }
  }

  // Description translations map / dynamic generators
  let description = insight.description;
  const t = insight.description.toLowerCase();

  if (insight.title.includes('Veri Bekleniyor') || t.includes('veri bekleniyor') || t.includes('henüz bu dönem')) {
    description = 'No customer flow data available for this period yet. Once the Store AI sender script starts transmitting signals, real-time analytics and dynamic business recommendations will appear here.';
  } else if (t.includes('hafta sonu günlük ortalaması')) {
    description = `Weekend daily visitor average is significantly higher than weekdays. We highly recommend scaling up weekend staff allocation and optimizing floor stock levels to match this demand.`;
  } else if (t.includes('hafta sonu ziyaretçi yoğunluğu')) {
    description = `Weekend visitor density is falling behind weekday averages. Consider launching weekend-specific promotions, flash sales, or family events to capture weekend leisure traffic.`;
  } else if (t.includes('tek saatte yoğunlaşıyor') || t.includes('kritik pencere')) {
    description = `A high percentage of daily visitor entries is concentrated in a single peak hour. Ensure all checkouts are fully active and floor managers are on stand-by during this window.`;
  } else if (t.includes('fırsat saati') || t.includes('trafiği zirveye kıyasla')) {
    description = `Footfall during this hour is at its lowest daytime point. Consider launching happy-hour discounts, membership points multiplier, or special offers to stimulate off-peak demand.`;
  } else if (t.includes('kapasitesi yetersiz') || t.includes('kuyruklar zirve')) {
    description = `High checkout queue wait times detected. Introducing at least one extra cashier during peak hours is highly recommended to prevent checkout abandonment and maximize customer satisfaction.`;
  } else if (t.includes('sadakat') || t.includes('tekrar gelen müşteri')) {
    description = `A strong proportion of your visitors are returning customers. Loyalty programs are performing exceptionally well. Consider offering VIP tier rewards or tailored newsletters to further boost conversion rates.`;
  } else if (t.includes('sadakat kartı') || t.includes('geri kazanın')) {
    description = `Returning visitor rate is currently low. We recommend introducing digital loyalty cards, automated SMS follow-ups, or first-purchase discounts to encourage repeat visits.`;
  } else if (t.includes('hedef segment') || t.includes('baskın yaş grubu')) {
    description = `Demographic profiling reveals a clear dominant customer segment in your store. Customizing window displays, digital advertising assets, and music selection to this demographic can directly increase conversion.`;
  } else if (t.includes('en yavaş kasa') || t.includes('en yavaş')) {
    description = `Performance analysis indicates this lane is operating with higher-than-average checkout delays. Standardizing operator training or conducting hardware diagnostics is recommended.`;
  } else if (t.includes('en hızlı kasa') || t.includes('en verimli')) {
    description = `This checkout lane exhibits the lowest queue times and highest efficiency. Model other checkout procedures after this lane's operating patterns.`;
  } else if (t.includes('en popüler bölge') || t.includes('en yoğun bölge')) {
    description = `This zone has captured the highest number of unique visitors this week. Consider placing high-margin items or promotional banners in this high-visibility area.`;
  } else if (t.includes('en uzun kalınan') || t.includes('kalma süresi')) {
    description = `Visitors spend a high average dwell time in this area. Directing sales assistance staff here can effectively convert interested browsers into buyers.`;
  } else if (t.includes('düşük trafik') || t.includes('en az ziyaret edilen')) {
    description = `This area suffers from low visitor engagement. Improving lighting, adding visible direction signage, or placing popular destination items here can revitalize this cold spot.`;
  } else if (t.includes('aktif personel oranı') || t.includes('aktif durumda')) {
    description = `The proportion of active floor staff is currently below target. Review break rotas and optimize scheduling to ensure adequate floor coverage during high-traffic hours.`;
  } else if (t.includes('düşük verimlilik') || t.includes('personel verimliliği')) {
    description = `Average staff productivity metrics are currently low. We recommend evaluating training guidelines, establishing performance incentives, or conducting brief morning huddles.`;
  } else if (t.includes('bugünkü giriş düne göre') && t.includes('düşük')) {
    description = `Store entries today are lower than yesterday's volume. Keep track of the weekly overall trend and analyze if local factors or weather conditions played a role.`;
  } else if (t.includes('bugünkü giriş düne göre')) {
    description = `Today's store visitor traffic has increased significantly compared to yesterday. Consider routing extra support staff to the sales floor and cashiers to maintain service quality.`;
  } else if (t.includes('net akış')) {
    description = `Real-time store capacity monitoring. The difference between entries and exits indicates active in-store traffic, assisting in maintaining optimal occupant levels.`;
  } else {
    // General direct translation helper for standard terms
    description = description
      .replace(/müşteri/g, 'customer')
      .replace(/giriş/g, 'entry')
      .replace(/çıkış/g, 'exit')
      .replace(/yoğunluk/g, 'density')
      .replace(/kasa/g, 'checkout')
      .replace(/bekleme süresi/g, 'wait time')
      .replace(/personel/g, 'staff')
      .replace(/en yüksek/g, 'highest')
      .replace(/en düşük/g, 'lowest')
      .replace(/ortalaması/g, 'average')
      .replace(/haftalık/g, 'weekly')
      .replace(/bugün/g, 'today')
      .replace(/dün/g, 'yesterday')
      .replace(/önerilir/g, 'is recommended')
      .replace(/tavsiye edilir/g, 'is advised')
      .replace(/ziyaretçi/g, 'visitor')
      .replace(/bölge/g, 'zone')
      .replace(/seviyede/g, 'level')
      .replace(/saat/g, 'hour');
  }

  // Metric Translation
  let metric = insight.metric;
  if (metric.includes('kamera')) metric = metric.replace('kamera', 'camera');
  if (metric.includes('kopma')) metric = metric.replace('kopma', 'drops');
  if (metric.includes('kişi')) metric = metric.replace('kişi', 'people');
  if (metric.includes('ort.')) metric = metric.replace('ort.', 'avg.');
  if (metric.includes('Filtre')) metric = 'Filter';
  if (metric.includes('Beklemede')) metric = 'Pending';

  return {
    ...insight,
    title,
    description,
    metric,
  };
};

const typeConfig = {
  success: {
    icon: CheckCircle2,
    bg: 'from-emerald-500/10 to-teal-500/5',
    border: 'border-emerald-500/20',
    iconColor: 'text-emerald-400',
    metricColor: 'text-emerald-300',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'from-amber-500/10 to-yellow-500/5',
    border: 'border-amber-500/20',
    iconColor: 'text-amber-400',
    metricColor: 'text-amber-300',
  },
  danger: {
    icon: AlertTriangle,
    bg: 'from-rose-500/10 to-red-500/5',
    border: 'border-rose-500/20',
    iconColor: 'text-rose-400',
    metricColor: 'text-rose-300',
  },
  info: {
    icon: Info,
    bg: 'from-sky-500/10 to-blue-500/5',
    border: 'border-sky-500/20',
    iconColor: 'text-sky-400',
    metricColor: 'text-sky-300',
  },
};

const InsightsPanel: React.FC<InsightsPanelProps> = ({ module, refreshTrigger }) => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const { language } = useLanguage();

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const res = await apiFetch(`/api/insights/${module}`);
        if (res.ok) {
          const data = await res.json();
          setInsights(data.insights || []);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchInsights();
  }, [module, refreshTrigger]);

  if (loading) {
    return (
      <div className="animate-pulse flex gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-1 h-20 rounded-xl bg-slate-800/50" />
        ))}
      </div>
    );
  }

  if (!insights.length) return null;

  return (
    <div className="w-full">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 mb-3 group"
      >
        <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20">
          <Lightbulb className="w-4 h-4 text-amber-400" />
        </div>
        <span className="text-sm font-bold text-slate-300 uppercase tracking-wider">
          {language === 'tr' ? 'Öneriler & Analizler' : 'Insights & Recommendations'}
        </span>
        <span className="text-xs text-slate-500 ml-1">({insights.length})</span>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
        )}
      </button>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3"
        >
          {insights.map((insight, idx) => {
            const enhancedInsight = translateAndEnhance(insight, language);
            const config = typeConfig[enhancedInsight.type] || typeConfig.info;
            const Icon = config.icon;

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`relative overflow-hidden rounded-xl border ${config.border} bg-gradient-to-br ${config.bg} p-5`}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-slate-100 truncate">
                        {enhancedInsight.title}
                      </h4>
                      <span className={`text-sm font-bold ${config.metricColor} whitespace-nowrap`}>
                        {enhancedInsight.metric}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 mt-1.5 leading-relaxed line-clamp-3">
                      {enhancedInsight.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
};

export default InsightsPanel;
