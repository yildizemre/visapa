// --- START OF FILE CustomerAnalytics.tsx ---

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart as PieChartIcon,
  RefreshCw,
  AlertCircle,
  Camera // Yeni ikon
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { apiUrl } from '../lib/api';
import { useStoreChange } from '../hooks/useStoreChange';
import {
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line
} from 'recharts';

import DailyFlowAnalytics from './DailyFlowAnalytics';
import { formatTimeToUTC3 } from '../utils/timeUtils';

// Tarih formatlama yardımcısı
const formatDateForAPI = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

interface CustomerRow {
  id?: number;
  timestamp?: string | null;
  entered?: number;
  exited?: number;
  male_count?: number;
  female_count?: number;
  age_18_30?: number;
  age_30_50?: number;
  age_50_plus?: number;
  camera_id?: string | null;
}

function getDateFromTimestamp(ts: string | null | undefined): string | null {
  if (!ts) return null;
  const s = String(ts).trim();
  if (s.length >= 10 && s[4] === '-' && s[7] === '-') return s.slice(0, 10);
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

const CustomerAnalytics = () => {
  const { t } = useLanguage();
  const storeRefresh = useStoreChange();

  const [rawCustomerData, setRawCustomerData] = useState<CustomerRow[] | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [selectedCamera, setSelectedCamera] = useState<string>('all');
  const [allCameras, setAllCameras] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const chartColors = {
    primary: '#3B82F6',
    pink: '#EC4899',
    purple: '#8B5CF6',
    accent: '#F59E0B',
    secondary: '#10B981',
    danger: '#EF4444',
  };
  const PIE_COLORS = [chartColors.primary, chartColors.accent, chartColors.secondary, chartColors.purple, chartColors.pink];

  // Tek istek: tarih filtresi OLMADAN müşteri verisini çek (Dashboard ile aynı veri kaynağı)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('token');
    fetch(apiUrl('/api/analytics/customers?camera_id=all'), {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Veri çekilemedi');
        return res.json();
      })
      .then((data: { data?: CustomerRow[]; all_cameras?: string[] }) => {
        if (cancelled) return;
        const rows = Array.isArray(data?.data) ? data.data : [];
        setRawCustomerData(rows);
        if (Array.isArray(data?.all_cameras)) setAllCameras(data.all_cameras);
        if (rows.length > 0) {
          let maxDateStr = '';
          for (const r of rows) {
            const dateStr = getDateFromTimestamp(r?.timestamp);
            if (dateStr && (!maxDateStr || dateStr > maxDateStr)) maxDateStr = dateStr;
          }
          if (maxDateStr) {
            const [y, m, d] = maxDateStr.split('-').map(Number);
            if (y && m && d) setSelectedDate(new Date(y, m - 1, d));
          }
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Veri çekilemedi');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [storeRefresh]);

  const dateStr = formatDateForAPI(selectedDate);

  const analyticsData = useMemo(() => {
    const rows = rawCustomerData ?? [];
    const filtered = rows.filter((r) => {
      const rowDate = getDateFromTimestamp(r?.timestamp);
      if (!rowDate || rowDate !== dateStr) return false;
      if (selectedCamera !== 'all' && r.camera_id !== selectedCamera) return false;
      return true;
    });

    const age_18_30 = filtered.reduce((s, r) => s + (r.age_18_30 ?? 0), 0);
    const age_30_50 = filtered.reduce((s, r) => s + (r.age_30_50 ?? 0), 0);
    const age_50_plus = filtered.reduce((s, r) => s + (r.age_50_plus ?? 0), 0);
    const total_male = filtered.reduce((s, r) => s + (r.male_count ?? 0), 0);
    const total_female = filtered.reduce((s, r) => s + (r.female_count ?? 0), 0);

    const byHour: Record<string, { entering: number; exiting: number }> = {};
    for (let h = 10; h <= 22; h++) {
      byHour[`${String(h).padStart(2, '0')}:00`] = { entering: 0, exiting: 0 };
    }
    for (const r of filtered) {
      const ts = r?.timestamp;
      if (!ts) continue;
      const d = new Date(ts);
      const hour = isNaN(d.getTime()) ? 12 : d.getHours();
      if (hour < 10 || hour > 22) continue;
      const key = `${String(hour).padStart(2, '0')}:00`;
      if (!byHour[key]) byHour[key] = { entering: 0, exiting: 0 };
      byHour[key].entering += r.entered ?? 0;
      byHour[key].exiting += r.exited ?? 0;
    }
    const hourlyCustomerFlow = Object.entries(byHour)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([hour, v]) => ({ hour, entering: v.entering, exiting: v.exiting }));

    return {
      demographics: {
        ageGroupsChart: [
          { name: '18-30', value: age_18_30 },
          { name: '30-50', value: age_30_50 },
          { name: '50+', value: age_50_plus },
        ],
        genderDistributionChart: [
          { gender: 'Erkek', value: total_male },
          { gender: 'Kadın', value: total_female },
        ],
      },
      hourlyCustomerFlow,
    };
  }, [rawCustomerData, dateStr, selectedCamera]);


  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const item = { hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } };

  return (
    <div className="p-2 sm:p-3 md:p-4 lg:p-6 bg-slate-900">
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-3 sm:space-y-4 md:space-y-6">
        {/* Header ve Kamera Filtresi */}
        <motion.div variants={item} className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-1 sm:mb-2">
              {t('analytics.title')}
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-slate-400">
              {t('analytics.subtitle')}
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Camera className="w-5 h-5 text-slate-400" />
            </div>
            <select
              value={selectedCamera}
              onChange={(e) => setSelectedCamera(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5"
              aria-label="Kamera Seçimi"
            >
              <option value="all">Tüm Kameralar</option>
              {allCameras.map(camera => (
                <option key={camera} value={camera}>{camera}</option>
              ))}
            </select>
          </div>
        </motion.div>

        <DailyFlowAnalytics
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            selectedCamera={selectedCamera}
        />

        {loading ? (
          <div className="text-center py-10"><RefreshCw className="w-8 h-8 mx-auto animate-spin text-blue-400" /></div>
        ) : error ? (
            <div className="text-center py-10 text-red-400 flex flex-col items-center">
              <AlertCircle className="w-12 h-12 mb-4" />
              <p className="font-semibold">Hata Oluştu</p>
              <p className="text-sm">{error}</p>
            </div>
        ) : (
          <>
            <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
              <div className="bg-slate-800/50 backdrop-blur-xl p-2 sm:p-3 md:p-4 lg:p-6 rounded-lg sm:rounded-xl border border-slate-700/50">
                <h3 className="text-white font-semibold text-xs sm:text-sm md:text-base lg:text-lg mb-2 sm:mb-3 md:mb-4">{t('analytics.ageDistribution')}</h3>
                {(analyticsData.demographics?.ageGroupsChart ?? []).reduce((sum, item) => sum + (item?.value ?? 0), 0) > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <RechartsPieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                      <Pie
                        data={analyticsData.demographics?.ageGroupsChart ?? []}
                        cx="50%"
                        cy="50%"
                        innerRadius="52%"
                        outerRadius="78%"
                        paddingAngle={2}
                        stroke="rgba(15, 23, 42, 0.6)"
                        strokeWidth={1.5}
                        dataKey="value"
                        labelLine={false}
                        label={false}
                      >
                        {(analyticsData.demographics?.ageGroupsChart ?? []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #475569', borderRadius: '8px' }}
                        formatter={(value: number, name: string) => {
                          const total = (analyticsData.demographics?.ageGroupsChart ?? []).reduce((s, i) => s + (i?.value ?? 0), 0);
                          const pct = total > 0 ? ((Number(value) / total) * 100).toFixed(1) : '0';
                          return [`${value} kişi (${pct}%)`, name];
                        }}
                      />
                      <Legend
                        layout="horizontal"
                        align="center"
                        verticalAlign="bottom"
                        formatter={(value, entry) => {
                          const total = (analyticsData.demographics?.ageGroupsChart ?? []).reduce((s, i) => s + (i?.value ?? 0), 0);
                          const item = (analyticsData.demographics?.ageGroupsChart ?? []).find((i: { name: string }) => i.name === value);
                          const pct = item && total > 0 ? ((item.value / total) * 100).toFixed(0) : '0';
                          return <span className="text-slate-300 text-sm">{value} ({pct}%)</span>;
                        }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-slate-500">
                    <PieChartIcon className="w-8 h-8 mr-2"/> Veri yok
                  </div>
                )}
              </div>

              <div className="bg-slate-800/50 backdrop-blur-xl p-2 sm:p-3 md:p-4 lg:p-6 rounded-lg sm:rounded-xl border border-slate-700/50">
                <h3 className="text-white font-semibold text-xs sm:text-sm md:text-base lg:text-lg mb-2 sm:mb-3 md:mb-4">{t('analytics.genderDistribution')}</h3>
                 {(analyticsData.demographics?.genderDistributionChart ?? []).reduce((sum, item) => sum + (item?.value ?? 0), 0) > 0 ? (
                    <ResponsiveContainer width="100%" height={200} className="sm:h-[250px] md:h-[300px]">
                        <BarChart data={analyticsData.demographics?.genderDistributionChart ?? []} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis type="number" stroke="#9CA3AF" />
                            <YAxis type="category" dataKey="gender" stroke="#9CA3AF" width={60} />
                            <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
                            <Bar dataKey="value" name="Sayı" fill={chartColors.pink} />
                        </BarChart>
                    </ResponsiveContainer>
                 ) : (
                  <div className="flex items-center justify-center h-[300px] text-slate-500">
                    <PieChartIcon className="w-8 h-8 mr-2"/> Veri yok
                  </div>
                 )}
              </div>
            </motion.div>

            <motion.div variants={item} className="bg-slate-800/50 backdrop-blur-xl p-2 sm:p-3 md:p-4 lg:p-6 rounded-lg sm:rounded-xl border border-slate-700/50">
              <h3 className="text-white font-semibold text-[10px] sm:text-xs md:text-sm lg:text-base mb-2 sm:mb-3 md:mb-4">
                {selectedDate.toLocaleDateString('tr-TR')} Tarihli Saatlik Müşteri Akışı (10:00 - 22:00)
              </h3>
              <ResponsiveContainer width="100%" height={250} className="sm:h-[300px] md:h-[350px] lg:h-[400px]">
                {/* GÜNCELLEME: Grafik verisi filtrelenmiş analyticsData.hourlyCustomerFlow'dan besleniyor */}
                <ComposedChart data={analyticsData.hourlyCustomerFlow ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="hour" stroke="#9CA3AF" fontSize={9} className="sm:text-[10px] md:text-xs" tickFormatter={(hour) => formatTimeToUTC3(hour)} />
                  <YAxis stroke="#9CA3AF" fontSize={9} className="sm:text-[10px] md:text-xs" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                    labelFormatter={(label) => `Saat: ${formatTimeToUTC3(label)}`}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="entering" stroke={chartColors.secondary} name="Giren" />
                  <Line type="monotone" dataKey="exiting" stroke={chartColors.danger} name="Çıkan" />
                </ComposedChart>
              </ResponsiveContainer>
            </motion.div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default CustomerAnalytics;