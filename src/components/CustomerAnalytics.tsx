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
import InsightsPanel from './shared/InsightsPanel';
import CameraViewer from './shared/CameraViewer';
import DateRangePicker from './shared/DateRangePicker';

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

  // Tarih aralığı filtresi
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const isRangeMode = startDate !== endDate;

  const chartColors = {
    primary: '#6366f1',
    pink: '#ec4899',
    purple: '#8b5cf6',
    accent: '#f43f5e',
    secondary: '#3b82f6',
    danger: '#e11d48',
  };
  const PIE_COLORS = ['#6366f1', '#3b82f6', '#f43f5e', '#8b5cf6', '#ec4899'];

  const tooltipStyle = {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    borderRadius: '12px',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
    padding: '12px 16px',
  };

  const fetchCustomerData = React.useCallback((sDate: string, eDate: string) => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('token');
    const params = new URLSearchParams({ date_from: sDate, date_to: eDate });
    if (selectedCamera !== 'all') params.append('camera_id', selectedCamera);
    fetch(apiUrl(`/api/analytics/customers?${params}`), {
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
        // Tek gün modunda: en son veri tarihini selectedDate olarak ayarla
        if (rows.length > 0 && sDate === eDate) {
          const [y, m, d] = sDate.split('-').map(Number);
          if (y && m && d) setSelectedDate(new Date(y, m - 1, d));
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Veri çekilemedi');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedCamera, storeRefresh]);

  useEffect(() => {
    // İlk yüklemede: veritabanındaki en son tarihi bul, ona göre filtrele
    const token = localStorage.getItem('token');
    fetch(apiUrl('/api/analytics/customers/latest-date'), {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(res => res.json())
      .then((data: { date?: string }) => {
        const latestDate = data?.date || todayStr;
        setStartDate(latestDate);
        setEndDate(latestDate);
        fetchCustomerData(latestDate, latestDate);
      })
      .catch(() => {
        fetchCustomerData(todayStr, todayStr);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeRefresh]);

  const dateStr = formatDateForAPI(selectedDate);

  const analyticsData = useMemo(() => {
    const rows = rawCustomerData ?? [];
    // Range modda tüm satırları, tek gün modda seçili günü filtrele
    const filtered = rows.filter((r) => {
      const rowDate = getDateFromTimestamp(r?.timestamp);
      if (!rowDate) return false;
      if (!isRangeMode && rowDate !== dateStr) return false;
      if (isRangeMode && (rowDate < startDate || rowDate > endDate)) return false;
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

    // Günlük bazlı akış (aralık modunda kullanılır)
    const byDay: Record<string, { entering: number; exiting: number }> = {};
    for (const r of filtered) {
      const d = getDateFromTimestamp(r?.timestamp);
      if (!d) continue;
      if (!byDay[d]) byDay[d] = { entering: 0, exiting: 0 };
      byDay[d].entering += r.entered ?? 0;
      byDay[d].exiting += r.exited ?? 0;
    }
    const dailyCustomerFlow = Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date: date.slice(5), entering: v.entering, exiting: v.exiting }));

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
      dailyCustomerFlow,
      totalEntered: filtered.reduce((s, r) => s + (r.entered ?? 0), 0),
      totalExited: filtered.reduce((s, r) => s + (r.exited ?? 0), 0),
    };
  }, [rawCustomerData, dateStr, selectedCamera, isRangeMode, startDate, endDate]);


  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const item = { hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } };

  return (
    <div className="p-3 sm:p-4 md:p-5 lg:p-8">
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 sm:space-y-6 lg:space-y-8">
        {/* Header ve Kamera Filtresi */}
        <motion.div variants={item} className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
                <PieChartIcon className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                {t('analytics.title')}
              </h1>
            </div>
            <p className="text-sm text-slate-400 ml-12">
              {t('analytics.subtitle')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              onApply={() => fetchCustomerData(startDate, endDate)}
            />
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Camera className="w-5 h-5 text-slate-400" />
              </div>
              <select
                value={selectedCamera}
                onChange={(e) => setSelectedCamera(e.target.value)}
                className="bg-slate-800/60 border border-slate-700/50 text-white text-sm rounded-xl focus:ring-indigo-500/50 focus:border-indigo-500/50 block w-full pl-10 p-2.5"
                aria-label="Kamera Seçimi"
              >
                <option value="all">Tüm Kameralar</option>
                {allCameras.map(camera => (
                  <option key={camera} value={camera}>{camera}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <CameraViewer />
            </div>
          </div>
        </motion.div>

        {/* Otomatik Öneriler */}
        <motion.div variants={item}>
          <InsightsPanel module="customer" />
        </motion.div>

        {/* Range modda özet banner */}
        {isRangeMode && (
          <motion.div variants={item} className="bg-gradient-to-r from-indigo-600/10 to-blue-600/10 border border-indigo-500/20 rounded-2xl px-5 py-3 flex flex-wrap gap-6 items-center">
            <div>
              <p className="text-xs text-indigo-300/70 uppercase tracking-wider font-semibold">Toplam Giren</p>
              <p className="text-2xl font-extrabold text-white">{analyticsData.totalEntered.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">{startDate} — {endDate}</p>
              <p className="text-sm text-slate-300">{rawCustomerData?.length ?? 0} kayıt · Aralık görünümü</p>
            </div>
          </motion.div>
        )}

        {!isRangeMode && (
          <DailyFlowAnalytics
              selectedDate={selectedDate}
              onDateChange={(d) => {
                const ds = formatDateForAPI(d);
                setSelectedDate(d);
                setStartDate(ds);
                setEndDate(ds);
                fetchCustomerData(ds, ds);
              }}
              selectedCamera={selectedCamera}
          />
        )}

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
            <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-5">
              <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl p-5 sm:p-6 rounded-2xl border border-slate-700/50">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-5">{t('analytics.ageDistribution')}</h3>
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
                        contentStyle={tooltipStyle}
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
                        formatter={(value) => {
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

              <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl p-5 sm:p-6 rounded-2xl border border-slate-700/50">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-5">{t('analytics.genderDistribution')}</h3>
                 {(analyticsData.demographics?.genderDistributionChart ?? []).reduce((sum, item) => sum + (item?.value ?? 0), 0) > 0 ? (
                    <ResponsiveContainer width="100%" height={200} className="sm:h-[250px] md:h-[300px]">
                        <BarChart data={analyticsData.demographics?.genderDistributionChart ?? []} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                            <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis type="category" dataKey="gender" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={60} />
                            <Tooltip contentStyle={tooltipStyle} />
                            <Bar dataKey="value" name="Sayı" fill={chartColors.pink} radius={[0,6,6,0]} />
                        </BarChart>
                    </ResponsiveContainer>
                 ) : (
                  <div className="flex items-center justify-center h-[300px] text-slate-500">
                    <PieChartIcon className="w-8 h-8 mr-2"/> Veri yok
                  </div>
                 )}
              </div>
            </motion.div>

            <motion.div variants={item} className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl p-5 sm:p-6 rounded-2xl border border-slate-700/50">
              {isRangeMode ? (
                <>
                  <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-5">
                    {startDate} — {endDate} Günlük Müşteri Akışı
                  </h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <ComposedChart data={analyticsData.dailyCustomerFlow ?? []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={tooltipStyle} labelFormatter={(label) => `Tarih: ${label}`} />
                      <Legend iconType="circle" iconSize={8} />
                      <Line type="monotone" dataKey="entering" stroke={chartColors.secondary} strokeWidth={2.5} name="Giren" dot={{ fill: chartColors.secondary, r: 3 }} />
                      <Line type="monotone" dataKey="exiting" stroke={chartColors.danger} strokeWidth={2.5} name="Çıkan" dot={{ fill: chartColors.danger, r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <>
                  <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-5">
                    {selectedDate.toLocaleDateString('tr-TR')} Tarihli Saatlik Müşteri Akışı (10:00 - 22:00)
                  </h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <ComposedChart data={analyticsData.hourlyCustomerFlow ?? []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                      <XAxis dataKey="hour" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={tooltipStyle} labelFormatter={(label) => `Saat: ${label}`} />
                      <Legend iconType="circle" iconSize={8} />
                      <Line type="monotone" dataKey="entering" stroke={chartColors.secondary} strokeWidth={2.5} name="Giren" dot={{ fill: chartColors.secondary, r: 3 }} />
                      <Line type="monotone" dataKey="exiting" stroke={chartColors.danger} strokeWidth={2.5} name="Çıkan" dot={{ fill: chartColors.danger, r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </>
              )}
            </motion.div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default CustomerAnalytics;