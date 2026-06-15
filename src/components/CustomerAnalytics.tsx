// --- START OF FILE CustomerAnalytics.tsx ---

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PieChart as PieChartIcon,
  RefreshCw,
  AlertCircle,
  Camera, // Yeni ikon
  X
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
  ComposedChart,
  Line,
} from 'recharts';

import DailyFlowAnalytics from './DailyFlowAnalytics';
import { useContainerWidth } from '../hooks/useContainerWidth';
import InsightsPanel from './shared/InsightsPanel';
import CameraViewer from './shared/CameraViewer';
import DateRangePicker from './shared/DateRangePicker';
import ExportPDFButton from './shared/ExportPDFButton';
import CustomDropdown from './shared/CustomDropdown';

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
  const { t, language } = useLanguage();
  const storeRefresh = useStoreChange();
  const [flow1Ref, flow1W] = useContainerWidth(800);
  const [flow2Ref, flow2W] = useContainerWidth(800);
  const [ageChartRef, ageChartW] = useContainerWidth(500);
  const [genderChartRef, genderChartW] = useContainerWidth(500);
  const [dailyAgeChartRef, dailyAgeChartW] = useContainerWidth(800);

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

  // Karşılaştırma Modu State'leri
  const [compareDate, setCompareDate] = useState<string | null>(null);
  const [compareCustomerData, setCompareCustomerData] = useState<CustomerRow[] | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  // Kamera Önizleme State'leri
  const [previewCameraName, setPreviewCameraName] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewImageUrlLoading] = useState(false);

  const handleViewSelectedCamera = async (cameraName: string) => {
    if (!cameraName || cameraName === 'all') return;
    setPreviewCameraName(cameraName);
    setPreviewImageUrlLoading(true);
    setPreviewImageUrl(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl('/api/settings/cameras'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const found = (data.cameras || []).find((c: { name: string; id: number; imageUrl?: string }) => c.name === cameraName);
        if (found) {
          setPreviewImageUrl(found.imageUrl || null);
          const snapRes = await fetch(apiUrl(`/api/settings/cameras/${found.id}/snapshot`), {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (snapRes.ok) {
            const snapData = await snapRes.json();
            if (snapData.image_url) {
              setPreviewImageUrl(snapData.image_url);
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPreviewImageUrlLoading(false);
    }
  };

  const chartColors = {
    primary: '#6366f1',
    pink: '#ec4899',
    purple: '#8b5cf6',
    accent: '#f43f5e',
    secondary: '#3b82f6',
    danger: '#e11d48',
    indigo: '#6366f1',
    blue: '#3b82f6',
  };
  const PIE_COLORS = ['#6366f1', '#3b82f6', '#f43f5e', '#8b5cf6', '#ec4899'];

  const tooltipStyle = {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    borderRadius: '12px',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
    padding: '12px 16px',
  };

  const fetchCompareCustomerData = React.useCallback((dateStr: string) => {
    setCompareLoading(true);
    const token = localStorage.getItem('token');
    const params = new URLSearchParams({ date_from: dateStr, date_to: dateStr });
    if (selectedCamera !== 'all') params.append('camera_id', selectedCamera);
    fetch(apiUrl(`/api/analytics/customers?${params}`), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        const rows = Array.isArray(data?.data) ? data.data : [];
        setCompareCustomerData(rows);
      })
      .catch((err) => console.error("Karşılaştırma verisi çekme hatası:", err))
      .finally(() => setCompareLoading(false));
  }, [selectedCamera]);

  const fetchCustomerData = React.useCallback((sDate: string, eDate: string, signal?: AbortSignal) => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('token');
    const params = new URLSearchParams({ date_from: sDate, date_to: eDate });
    if (selectedCamera !== 'all') params.append('camera_id', selectedCamera);
    fetch(apiUrl(`/api/analytics/customers?${params}`), {
      headers: { 'Authorization': `Bearer ${token}` },
      signal
    })
      .then((res) => {
        if (!res.ok) throw new Error('Veri çekilemedi');
        return res.json();
      })
      .then((data: { data?: CustomerRow[]; all_cameras?: string[] }) => {
        if (cancelled || signal?.aborted) return;
        const rows = Array.isArray(data?.data) ? data.data : [];
        setRawCustomerData(rows);
        if (Array.isArray(data?.all_cameras) && data.all_cameras.length > 0) {
          setAllCameras(prev => {
            const merged = Array.from(new Set([...prev, ...(data.all_cameras || [])]));
            return merged.length > 0 ? merged : prev;
          });
        }
        // Tek gün modunda: en son veri tarihini selectedDate olarak ayarla
        if (rows.length > 0 && sDate === eDate) {
          const [y, m, d] = sDate.split('-').map(Number);
          if (y && m && d) setSelectedDate(new Date(y, m - 1, d));
        }
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        if (!cancelled && !signal?.aborted) setError(err instanceof Error ? err.message : 'Veri çekilemedi');
      })
      .finally(() => {
        if (!cancelled && !signal?.aborted) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedCamera]);

  useEffect(() => {
    const controller = new AbortController();
    // İlk yüklemede: veritabanındaki en son tarihi bul, ona göre filtrele
    const token = localStorage.getItem('token');
    fetch(apiUrl('/api/analytics/customers/latest-date'), {
      headers: { 'Authorization': `Bearer ${token}` },
      signal: controller.signal
    })
      .then(res => res.json())
      .then((data: { date?: string }) => {
        if (controller.signal.aborted) return;
        const latestDate = data?.date || todayStr;
        setStartDate(latestDate);
        setEndDate(latestDate);
        fetchCustomerData(latestDate, latestDate, controller.signal);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        fetchCustomerData(todayStr, todayStr, controller.signal);
      });
      
    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeRefresh, fetchCustomerData]);

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
      
      // DB "2026-06-14 13:00:00" veya "2026-06-14T13:00:00" formatında döner
      const match = ts.match(/[ T](\d{2}):/);
      const hour = match ? parseInt(match[1], 10) : -1;
      if (hour < 0) continue;
      
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

    // Karşılaştırma verileri için saatlik hesaplama
    const byHourCompare: Record<string, { entering: number; exiting: number }> = {};
    for (let h = 10; h <= 22; h++) {
      byHourCompare[`${String(h).padStart(2, '0')}:00`] = { entering: 0, exiting: 0 };
    }
    if (compareDate && Array.isArray(compareCustomerData)) {
      for (const r of compareCustomerData) {
        const ts = r?.timestamp;
        if (!ts) continue;
        const d = getDateFromTimestamp(ts);
        if (d !== compareDate) continue;
        
        const match = ts.match(/[ T](\d{2}):/);
        const hour = match ? parseInt(match[1], 10) : -1;
        if (hour < 0 || hour < 10 || hour > 22) continue;
        
        const key = `${String(hour).padStart(2, '0')}:00`;
        byHourCompare[key].entering += r.entered ?? 0;
        byHourCompare[key].exiting += r.exited ?? 0;
      }
    }

    const combinedHourlyFlow = hourlyCustomerFlow.map((item) => {
      const comp = byHourCompare[item.hour] || { entering: 0, exiting: 0 };
      return {
        ...item,
        compareEntering: comp.entering,
        compareExiting: comp.exiting,
      };
    });

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
      combinedHourlyFlow,
      dailyCustomerFlow,
      dailyAgeChartData: (() => {
        const byDayAge: Record<string, { age_18_30: number; age_30_50: number; age_50_plus: number }> = {};
        for (const r of filtered) {
          const d = getDateFromTimestamp(r?.timestamp);
          if (!d) continue;
          if (!byDayAge[d]) byDayAge[d] = { age_18_30: 0, age_30_50: 0, age_50_plus: 0 };
          byDayAge[d].age_18_30 += r.age_18_30 ?? 0;
          byDayAge[d].age_30_50 += r.age_30_50 ?? 0;
          byDayAge[d].age_50_plus += r.age_50_plus ?? 0;
        }
        return Object.entries(byDayAge)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, v]: [string, { age_18_30: number; age_30_50: number; age_50_plus: number }]) => ({
            date: new Date(date + 'T00:00:00').toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: 'short' }),
            age_18_30: v.age_18_30,
            age_30_50: v.age_30_50,
            age_50_plus: v.age_50_plus,
          }));
      })(),
      totalEntered: filtered.reduce((s, r) => s + (r.entered ?? 0), 0),
      totalExited: filtered.reduce((s, r) => s + (r.exited ?? 0), 0),
    };
  }, [rawCustomerData, dateStr, selectedCamera, isRangeMode, startDate, endDate, compareDate, compareCustomerData, language]);


  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const item = { hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } };

  return (
    <div className="p-3 sm:p-4 md:p-5 lg:p-8" id="customer-analytics-content">
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
            <ExportPDFButton elementId="customer-analytics-content" filename={`Musteri_Akisi_${startDate}`} />
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              onApply={() => fetchCustomerData(startDate, endDate)}
            />
            <CustomDropdown
              value={selectedCamera}
              onChange={setSelectedCamera}
              options={[
                { value: 'all', label: language === 'tr' ? 'Tüm Kameralar' : 'All Cameras' },
                ...allCameras.map(camera => ({ value: camera, label: camera }))
              ]}
              icon={Camera}
              placeholder={language === 'tr' ? 'Kamera Seçin' : 'Select Camera'}
              onEyeClick={handleViewSelectedCamera}
            />
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
              genderDistribution={{
                male: analyticsData.demographics?.genderDistributionChart?.[0]?.value ?? 0,
                female: analyticsData.demographics?.genderDistributionChart?.[1]?.value ?? 0
              }}
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
            <motion.div variants={item} className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl p-5 sm:p-6 rounded-2xl border border-slate-700/50 min-w-0">
              {isRangeMode ? (
                <>
                  <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-5">
                    {language === 'tr' 
                      ? `${startDate} — ${endDate} Günlük Müşteri Akışı` 
                      : `Daily Customer Flow for ${startDate} — ${endDate}`}
                  </h3>
                  <div ref={flow1Ref} style={{width:'100%', overflow:'hidden'}}>
                    <ComposedChart width={flow1W} height={340} data={analyticsData.dailyCustomerFlow ?? []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={tooltipStyle} labelFormatter={(label) => `${language === 'tr' ? 'Tarih' : 'Date'}: ${label}`} />
                      <Legend iconType="circle" iconSize={8} />
                      <Line type="monotone" dataKey="entering" stroke={chartColors.secondary} strokeWidth={2.5} name={language === 'tr' ? 'Giren' : 'Entered'} dot={{ fill: chartColors.secondary, r: 3 }} />
                    </ComposedChart>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-700/40 pb-5">
                    <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                      {language === 'tr' 
                        ? `${selectedDate.toLocaleDateString('tr-TR')} Tarihli Saatlik Müşteri Akışı (10:00 - 22:00)`
                        : `Hourly Customer Flow for ${selectedDate.toLocaleDateString('en-US')} (10:00 - 22:00)`}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => {
                          if (compareDate) { 
                            setCompareDate(null); 
                            setCompareCustomerData(null); 
                          } else {
                            const prev = new Date(selectedDate); 
                            prev.setDate(prev.getDate() - 7);
                            const ps = formatDateForAPI(prev); 
                            setCompareDate(ps); 
                            fetchCompareCustomerData(ps);
                          }
                        }}
                        className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border shadow-lg ${
                          compareDate 
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 border-emerald-500/30 text-white shadow-emerald-500/10' 
                            : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 border-indigo-500/20 text-white shadow-indigo-500/15'
                        }`}
                      >
                        <svg className={`w-4 h-4 ${compareDate ? 'animate-bounce' : 'group-hover:scale-110 transition-transform'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <span>{compareDate ? (language === 'tr' ? 'Karşılaştırma Aktif' : 'Comparison Active') : (language === 'tr' ? 'Karşılaştır' : 'Compare')}</span>
                        {compareDate && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full animate-ping" />}
                      </button>

                      {compareDate && (
                        <div className="flex items-center gap-2 bg-slate-900/60 p-1.5 rounded-xl border border-slate-700/50 shadow-inner">
                          <div className="flex items-center gap-1.5 px-2">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">{language === 'tr' ? '1. Tarih' : '1st Date'}</span>
                            <input 
                              type="date" 
                              value={formatDateForAPI(selectedDate)} 
                              onChange={(e) => {
                                const v = e.target.value;
                                if (v) {
                                  const d = new Date(v + 'T00:00:00');
                                  setSelectedDate(d);
                                  setStartDate(v);
                                  setEndDate(v);
                                  fetchCustomerData(v, v);
                                }
                              }}
                              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-300 outline-none focus:ring-1 focus:ring-indigo-500 [color-scheme:dark] cursor-pointer font-bold"
                            />
                          </div>
                          
                          <span className="text-[10px] text-slate-600 font-black">VS</span>

                          <div className="flex items-center gap-1.5 px-2">
                            <span className="text-[10px] text-indigo-400 font-bold uppercase">{language === 'tr' ? '2. Tarih' : '2nd Date'}</span>
                            <input 
                              type="date" 
                              value={compareDate} 
                              onChange={(e) => { 
                                const v = e.target.value; 
                                if (v) { 
                                  setCompareDate(v); 
                                  fetchCompareCustomerData(v); 
                                } 
                              }} 
                              className="bg-slate-800 border border-indigo-500/30 rounded-lg px-2.5 py-1 text-xs text-indigo-300 outline-none focus:ring-1 focus:ring-indigo-500 [color-scheme:dark] cursor-pointer font-bold shadow-sm animate-pulse" 
                            />
                          </div>
                          {compareLoading && <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin mr-1" />}
                        </div>
                      )}
                    </div>
                  </div>
                  <div ref={flow2Ref} style={{width:'100%', overflow:'hidden'}}>
                    <ComposedChart width={flow2W} height={340} data={analyticsData.combinedHourlyFlow ?? []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                      <XAxis dataKey="hour" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={tooltipStyle} labelFormatter={(label) => `${language === 'tr' ? 'Saat' : 'Hour'}: ${label}`} />
                      <Legend iconType="circle" iconSize={8} />
                      <Line type="monotone" dataKey="entering" stroke={chartColors.secondary} strokeWidth={2} name={compareDate ? `${language === 'tr' ? 'Giren' : 'Entered'} (${selectedDate.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'short' })})` : (language === 'tr' ? "Giren" : "Entered")} dot={{ fill: chartColors.secondary, r: 3 }} />
                      {compareDate && (
                        <Line type="monotone" dataKey="compareEntering" stroke={chartColors.pink} strokeWidth={2} strokeDasharray="4 2" name={`${language === 'tr' ? 'Giren' : 'Entered'} (${new Date(compareDate + 'T00:00:00').toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'short' })})`} dot={{ fill: chartColors.pink, r: 3 }} />
                      )}
                    </ComposedChart>
                  </div>
                </>
              )}
            </motion.div>

            <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-5">
              <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl p-5 sm:p-6 rounded-2xl border border-indigo-500/25 min-w-0 flex flex-col min-h-[380px]">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 shrink-0">{t('analytics.ageDistribution')}</h3>
                {(analyticsData.demographics?.ageGroupsChart ?? []).reduce((sum, item) => sum + (item?.value ?? 0), 0) > 0 ? (
                  <div ref={ageChartRef} style={{width:'100%', overflow:'hidden'}}>
                    <RechartsPieChart width={ageChartW} height={320} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
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
                        {(analyticsData.demographics?.ageGroupsChart ?? []).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value: number, name: string) => {
                          const total = (analyticsData.demographics?.ageGroupsChart ?? []).reduce((s, i) => s + (i?.value ?? 0), 0);
                          const pct = total > 0 ? ((Number(value) / total) * 100).toFixed(1) : '0';
                          return [`${value} ${language === 'tr' ? 'kişi' : 'people'} (${pct}%)`, name];
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
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-slate-500">
                    <PieChartIcon className="w-8 h-8 mr-2"/> Veri yok
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl p-5 sm:p-6 rounded-2xl border border-slate-700/50 min-w-0 flex flex-col min-h-[380px]">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 shrink-0">{t('analytics.genderDistribution')}</h3>
                 {(analyticsData.demographics?.genderDistributionChart ?? []).reduce((sum, item) => sum + (item?.value ?? 0), 0) > 0 ? (
                    <div ref={genderChartRef} style={{width:'100%', overflow:'hidden'}}>
                        <BarChart width={genderChartW} height={320} data={analyticsData.demographics?.genderDistributionChart ?? []} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                            <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis type="category" dataKey="gender" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={60} />
                            <Tooltip contentStyle={tooltipStyle} />
                            <Bar dataKey="value" name="Sayı" fill={chartColors.pink} radius={[0,6,6,0]} />
                        </BarChart>
                    </div>
                 ) : (
                  <div className="flex items-center justify-center h-[260px] text-slate-500">
                    <PieChartIcon className="w-8 h-8 mr-2"/> Veri yok
                  </div>
                 )}
              </div>
            </motion.div>

            {/* Günlük Yaş Analizi - tam genişlik */}
            {analyticsData.dailyAgeChartData.length > 0 && (
              <motion.div variants={item}>
                <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl p-5 sm:p-6 rounded-2xl border border-slate-700/50">
                  <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-5">Günlük Yaş Analizi</h3>
                  <div ref={dailyAgeChartRef} style={{width:'100%', overflow:'hidden'}}>
                    <BarChart width={dailyAgeChartW} height={260} data={analyticsData.dailyAgeChartData} barCategoryGap="25%" margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                      <XAxis dataKey="date" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="age_18_30" fill={chartColors.indigo} name="18-30" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="age_30_50" fill={chartColors.blue} name="30-50" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="age_50_plus" fill={chartColors.accent} name="50+" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </div>
                </div>
              </motion.div>
            )}

          </>
        )}
      </motion.div>

      {/* Live Camera Preview Modal */}
      <AnimatePresence>
        {previewCameraName && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-white text-sm sm:text-base">{previewCameraName}</h3>
                </div>
                <button
                  onClick={() => setPreviewCameraName(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 flex items-center justify-center min-h-[250px] bg-slate-950/40">
                {previewLoading ? (
                  <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                    <span className="text-xs text-slate-400">{language === 'tr' ? 'Kameraya bağlanılıyor...' : 'Connecting to camera...'}</span>
                  </div>
                ) : previewImageUrl ? (
                  <img
                    src={previewImageUrl}
                    alt={previewCameraName}
                    className="w-full h-auto max-h-[500px] object-contain rounded-lg shadow-lg border border-slate-800"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-500">
                    <AlertCircle className="w-10 h-10 text-rose-500" />
                    <span className="text-xs font-semibold text-rose-400">{language === 'tr' ? 'Görüntü Alınamadı' : 'Failed to retrieve image'}</span>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomerAnalytics;