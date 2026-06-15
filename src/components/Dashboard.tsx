// --- START OF FILE Dashboard.tsx ---

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  ShoppingCart,
  Users,
  BarChart3,
  UserPlus,
  Activity,
  Timer,
  CalendarDays,
  Trophy,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { apiUrl } from '../lib/api';
import { useStoreChange } from '../hooks/useStoreChange';
import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useContainerWidth } from '../hooks/useContainerWidth';
import CameraViewer from './shared/CameraViewer';

const PremiumDonut = ({ data, colors, total, labelTitle }: { data: { name: string; value: number }[]; colors: string[]; total: number; labelTitle: string }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  
  const onPieEnter = (_: unknown, index: number) => {
    setActiveIndex(index);
  };
  
  const onPieLeave = () => {
    setActiveIndex(null);
  };

  const hoveredItem = activeIndex !== null ? data[activeIndex] : null;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 w-full">
      <div className="relative w-[210px] h-[210px] shrink-0 mx-auto">
        <PieChart width={210} height={210}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={activeIndex !== null ? 58 : 64}
            outerRadius={activeIndex !== null ? 98 : 90}
            paddingAngle={2.5}
            onMouseEnter={onPieEnter}
            onMouseLeave={onPieLeave}
            stroke="rgba(15,23,42,0.6)"
            strokeWidth={1.5}
            animationDuration={400}
          >
            {data.map((_, i) => (
              <Cell 
                key={i} 
                fill={colors[i % colors.length]} 
                style={{
                  filter: activeIndex === i ? 'drop-shadow(0px 6px 12px rgba(0,0,0,0.6))' : 'none',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
              />
            ))}
          </Pie>
        </PieChart>
        
        {/* Central Text HUD */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-all duration-300">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold text-center max-w-[120px] truncate">
            {hoveredItem ? hoveredItem.name : labelTitle}
          </span>
          <span className="text-xl font-black text-white mt-0.5 tracking-tight">
            {hoveredItem ? hoveredItem.value.toLocaleString() : total.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 font-medium">
            {hoveredItem && total > 0 ? `%${((hoveredItem.value / total) * 100).toFixed(0)}` : 'Ziyaretçi'}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 flex-1 w-full max-h-[210px] overflow-y-auto pr-1 scrollbar-thin">
        {data.slice(0, 8).map((item, i) => {
          const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : '0';
          const isHovered = activeIndex === i;
          return (
            <div 
              key={item.name} 
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all duration-200 ${isHovered ? 'bg-slate-700/40 border-l-2' : 'bg-transparent border-l-2 border-transparent'}`}
              style={{ borderLeftColor: isHovered ? colors[i % colors.length] : 'transparent' }}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
              <span className="text-[11px] text-slate-300 flex-1 truncate font-medium">{item.name}</span>
              <span className="text-[11px] font-bold text-white shrink-0">{pct}%</span>
              <span className="text-[10px] text-slate-500 shrink-0 ml-1">({item.value})</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { language } = useLanguage();
  const storeRefresh = useStoreChange();
  
  const [userName, setUserName] = useState('');
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserName(user.full_name || user.username || '');
      } catch { /* ignore */ }
    }
  }, []);

  const [dashboardData, setDashboardData] = useState({
    weeklyStats: {
      customersEntered: 0,
      customersExited: 0,
      genderDistribution: { male: 0, female: 0 },
      avgQueueTime: 0,
      busiestCashier: { name: 'N/A', weeklyCustomers: 0, avgWaitTime: 0 },
    },
    dailyCustomerFlow: [] as Array<Record<string, unknown>>,
    dailyGenderChartData: [],
    dailyAgeChartData: [] as Array<Record<string, unknown>>,
    hourlyQueueStaff: [],
  });

  const [loading, setLoading] = useState(true);
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    const animInterval = setInterval(() => {
      setAnimationKey(prev => prev + 1);
    }, 20000);
    return () => clearInterval(animInterval);
  }, []);
  const [dateRange, setDateRange] = useState<{ start: string | null; end: string | null }>({
    start: null,
    end: null,
  });
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

  const chartColors = {
    primary: '#6366f1',
    secondary: '#3b82f6',
    accent: '#f43f5e',
    danger: '#e11d48',
    purple: '#8b5cf6',
    pink: '#ec4899',
    orange: '#f97316',
    teal: '#06b6d4',
    emerald: '#10b981',
    blue: '#3b82f6',
    indigo: '#6366f1',
    // Yaş grupları - stabil palet (dashboard ana renkleriyle uyumlu)
    age1830: '#6366f1',   // indigo
    age3050: '#3b82f6',   // blue
    age50plus: '#06b6d4', // cyan
  };

  const tooltipStyle = {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    borderRadius: '12px',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
    padding: '12px 16px',
  };

  const formatSecondsToMinutes = (seconds: number) => {
    if (typeof seconds !== 'number' || isNaN(seconds)) return '0.00';
    return (seconds / 60).toFixed(1);
  };

  const formatDateForRange = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const fetchDashboardData = async (dateFrom?: string, dateTo?: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      let url = '/api/dashboard/weekly-overview';
      if (dateFrom && dateTo) {
        url += `?date_from=${dateFrom}&date_to=${dateTo}`;
      }
      const response = await fetch(apiUrl(url), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const totals = data.totals ?? {};
        const customers = totals.customers ?? {};
        const queues = totals.queues ?? {};
        const timeseries = data.timeseries ?? {};

        if (timeseries.daily_customer_flow && timeseries.daily_customer_flow.length > 0) {
          const firstDay = timeseries.daily_customer_flow[0].date;
          const lastDay = timeseries.daily_customer_flow[timeseries.daily_customer_flow.length - 1].date;
          setDateRange({ start: firstDay, end: lastDay });
        }

        const transformedData = {
          weeklyStats: {
            customersEntered: customers.total_entered ?? 0,
            customersExited: customers.total_exited ?? 0,
            genderDistribution: {
              male: customers.male ?? 0,
              female: customers.female ?? 0,
            },
            avgQueueTime: queues.avg_wait_time ?? 0,
            busiestCashier: { 
              name: 'Kasa', 
              weeklyCustomers: queues.total_queues ?? 0, 
              avgWaitTime: queues.avg_wait_time ?? 0 
            },
          },
          dailyCustomerFlow: (timeseries.daily_customer_flow ?? []) as Array<Record<string, unknown>>,
          dailyGenderChartData: (timeseries.daily_gender ?? []).map((item: Record<string, unknown>) => ({
            ...item,
            date: new Date(item.date as string).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: 'short' }),
          })),
          dailyAgeChartData: (timeseries.daily_age ?? []).map((item: Record<string, unknown>) => ({
            ...item,
            date: new Date(item.date as string).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: 'short' }),
          })),
          hourlyQueueStaff: [],
        };
        
        setDashboardData(transformedData);
      }
    } catch (error) {
      console.error('Dashboard veri çekme sırasında kritik hata:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, storeRefresh]);


  const dailyFlowForChart = useMemo(() => {
    return dashboardData.dailyCustomerFlow.map((item) => ({
      ...item,
      date: new Date(item.date as string + 'T00:00:00').toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: 'short' }),
    }));
  }, [dashboardData.dailyCustomerFlow, language]);

  const peakDay = useMemo(() => {
    if (!dashboardData.dailyCustomerFlow.length) return null;
    return dashboardData.dailyCustomerFlow.reduce((max, row) =>
      Number(row.entered ?? 0) > Number(max.entered ?? 0) ? row : max
    );
  }, [dashboardData.dailyCustomerFlow]);

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const item = { hidden: { y: 16, opacity: 0 }, show: { y: 0, opacity: 1, transition: { duration: 0.4 } } };

  const [areaChartRef, areaChartW] = useContainerWidth(400);
  const [genderBarRef, genderBarW] = useContainerWidth(400);
  const [ageLineRef, ageLineW] = useContainerWidth(400);

  const [zoneData, setZoneData] = useState<Array<{zone: string; totalVisitors: number}>>([]);
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const storeId = sessionStorage.getItem('selectedStoreId');
    const params = new URLSearchParams();
    const todayStr = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    params.set('date_from', weekAgo.toISOString().split('T')[0]);
    params.set('date_to', todayStr);
    if (storeId) params.set('store_id', storeId);
    fetch(apiUrl(`/api/analytics/heatmaps/daily-summary?${params}`), { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.zonePerformance) setZoneData(d.zonePerformance); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeRefresh]);

  const totalGender = dashboardData.weeklyStats.genderDistribution.male + dashboardData.weeklyStats.genderDistribution.female;
  const malePercent = totalGender > 0 ? Math.round((dashboardData.weeklyStats.genderDistribution.male / totalGender) * 100) : 0;
  const femalePercent = totalGender > 0 ? 100 - malePercent : 0;
  const totalVisitors = dashboardData.weeklyStats.customersEntered;

  const top5Days = useMemo(() => {
    return [...dashboardData.dailyCustomerFlow]
      .sort((a, b) => Number(b.entered ?? 0) - Number(a.entered ?? 0))
      .slice(0, 5);
  }, [dashboardData.dailyCustomerFlow]);

  const maxTopDay = top5Days.length > 0 ? Number(top5Days[0].entered ?? 0) : 1;

  if (loading) {
    return (
      <div className="p-3 sm:p-4 md:p-5 lg:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-slate-700/50 rounded-xl w-1/3"></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (<div key={i} className="h-36 bg-slate-800/50 rounded-2xl"></div>))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[...Array(2)].map((_, i) => (<div key={i} className="h-72 bg-slate-800/50 rounded-2xl"></div>))}
          </div>
        </div>
      </div>
    );
  }

  const KpiCard = ({ icon, iconGradient, label, value, subtitle }: {
    icon: React.ReactNode; iconGradient: string; label: string; value: string; subtitle?: string;
  }) => (
    <div className="group relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl p-5 sm:p-6 rounded-2xl border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300 hover:shadow-lg hover:shadow-slate-900/50 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-2.5 rounded-xl bg-gradient-to-br ${iconGradient} shadow-lg`}>{icon}</div>
        </div>
        <p className="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{label}</p>
        <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight leading-none mb-1">{value}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  );

  return (
    <div className="p-3 sm:p-4 md:p-5 lg:p-8">
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 sm:space-y-6 lg:space-y-8">
        
        {/* Header */}
        <motion.div variants={item} className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25 animate-pulse">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400 flex items-center gap-2">
                <span>👋 Hoş geldiniz,</span>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 font-black relative group cursor-pointer transition-all duration-300 hover:brightness-110">
                  {userName || 'Emilio Lara'}
                  <span className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-indigo-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                </span>
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 ml-12">
              <p className="text-sm text-slate-400">Mağaza performansınızın gerçek zamanlı genel görünümü.</p>
              {dateRange.start && dateRange.end && (
                <span className="text-[11px] text-slate-500 bg-slate-800/80 border border-slate-700/50 px-2.5 py-1 rounded-lg font-medium">
                  {formatDateForRange(dateRange.start)} — {formatDateForRange(dateRange.end)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full xl:w-auto">
            <div className="relative">
              <CameraViewer />
            </div>
            {/* Hızlı tarih seçim butonları */}
            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
              {[
                { label: '1H', days: 7 },
                { label: '2H', days: 14 },
                { label: '1A', days: 30 },
                { label: '3A', days: 90 },
              ].map((p) => {
                const pTo = new Date();
                const pFrom = new Date(pTo.getTime() - p.days * 24 * 60 * 60 * 1000);
                const fmtD = (d: Date) => d.toISOString().split('T')[0];
                const isActive = customDateFrom === fmtD(pFrom) && customDateTo === fmtD(pTo);
                return (
                  <button
                    key={p.label}
                    onClick={() => {
                      const from = fmtD(pFrom);
                      const to = fmtD(pTo);
                      setCustomDateFrom(from);
                      setCustomDateTo(to);
                      fetchDashboardData(from, to);
                    }}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all border ${
                      isActive
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm shadow-indigo-500/30'
                        : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
              {(customDateFrom || customDateTo) && (
                <button
                  onClick={() => {
                    setCustomDateFrom('');
                    setCustomDateTo('');
                    fetchDashboardData();
                  }}
                  className="px-2 py-1.5 text-slate-400 hover:text-white text-xs transition-colors rounded-lg hover:bg-slate-800/60"
                  title="Sıfırla"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* KPI Grid - 4 kart, daha büyük */}
        <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
          <KpiCard 
            icon={<UserPlus className="w-5 h-5 text-white" />}
            iconGradient="from-blue-500 to-cyan-500"
            label={language === 'tr' ? 'Toplam Giren' : 'Total Entered'}
            value={dashboardData.weeklyStats.customersEntered.toLocaleString()}
            subtitle={dateRange.start ? `${formatDateForRange(dateRange.start)} — ${formatDateForRange(dateRange.end)}` : 'Dönem'}
          />
          <KpiCard 
            icon={<Activity className="w-5 h-5 text-white" />}
            iconGradient="from-emerald-500 to-teal-500"
            label={language === 'tr' ? 'Günlük Ortalama' : 'Daily Average'}
            value={totalVisitors > 0 ? Math.round(totalVisitors / Math.max(1, dashboardData.dailyCustomerFlow.length)).toLocaleString() : '0'}
            subtitle="Ziyaretçi / Gün"
          />
          <KpiCard 
            icon={<Timer className="w-5 h-5 text-white" />}
            iconGradient="from-amber-500 to-orange-500"
            label={language === 'tr' ? 'Ort. Bekleme' : 'Avg. Wait'}
            value={`${formatSecondsToMinutes(dashboardData.weeklyStats.avgQueueTime)} dk`}
            subtitle="Kasa bekleme süresi"
          />
          <KpiCard 
            icon={<CalendarDays className="w-5 h-5 text-white" />}
            iconGradient="from-violet-500 to-purple-500"
            label={language === 'tr' ? 'En Yoğun Gün' : 'Peak Day'}
            value={peakDay ? new Date((peakDay.date as string) + 'T00:00:00').toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }) : '—'}
            subtitle={peakDay ? `${Number(peakDay.entered ?? 0).toLocaleString()} giriş` : 'Veri yok'}
          />
        </motion.div>

        {/* Akıllı Öneriler - 3 kart */}
        {totalVisitors > 0 && (() => {
          const days = dashboardData.dailyCustomerFlow.length || 1;
          const dailyAvg = Math.round(totalVisitors / days);
          const peakVal = Number(peakDay?.entered ?? 0);
          const peakRatio = dailyAvg > 0 ? ((peakVal / dailyAvg - 1) * 100).toFixed(0) : '0';
          const queueSec = dashboardData.weeklyStats.avgQueueTime;
          const cashierName = dashboardData.weeklyStats.busiestCashier?.name ?? 'N/A';
          const cashierLoad = dashboardData.weeklyStats.busiestCashier?.weeklyCustomers ?? 0;
          const femPct = femalePercent; const malPct = malePercent;
          return (
            <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Zirve Gün Fırsatı */}
              <div className="flex items-start gap-4 p-5 rounded-2xl bg-gradient-to-br from-blue-500/15 to-indigo-500/10 border border-blue-500/30">
                <div className="p-2.5 rounded-xl bg-blue-500/20 shrink-0">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-200 mb-1">Zirve Gün Analizi</p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    En yoğun gün, günlük ortalamadan{' '}
                    <span className="text-blue-300 font-semibold">%{peakRatio} fazla</span> ziyaretçi çekti.{' '}
                    {Number(peakRatio) > 30
                      ? 'Bu gün için ekstra kasa ve personel planlanmalı.'
                      : Number(peakRatio) > 15
                      ? 'Yoğun günlerde stok ve personel hazırlığı yapın.'
                      : 'Trafik dağılımı oldukça dengeli seyredyor.'}
                  </p>
                </div>
              </div>
              {/* En Yoğun Kasa */}
              <div className={`flex items-start gap-4 p-5 rounded-2xl border ${
                queueSec > 120 ? 'bg-gradient-to-br from-amber-500/15 to-orange-500/10 border-amber-500/30'
                : 'bg-gradient-to-br from-emerald-500/15 to-teal-500/10 border-emerald-500/30'
              }`}>
                <div className={`p-2.5 rounded-xl shrink-0 ${queueSec > 120 ? 'bg-amber-500/20' : 'bg-emerald-500/20'}`}>
                  <ShoppingCart className={`w-5 h-5 ${queueSec > 120 ? 'text-amber-400' : 'text-emerald-400'}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-200 mb-1">Kasa Verimliliği</p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    <span className={`font-semibold ${queueSec > 120 ? 'text-amber-300' : 'text-emerald-300'}`}>{cashierName}</span>{' '}
                    kasası haftada <span className="text-slate-200 font-semibold">{cashierLoad.toLocaleString()}</span> müşteri işledi.{' '}
                    {queueSec > 120 ? 'Yük dengeleme için ek kasa devreye alınabilir.' : 'Kasa yükü dengeli dağılıyor.'}
                  </p>
                </div>
              </div>
              {/* Ürün/Kampanya Önerisi */}
              <div className="flex items-start gap-4 p-5 rounded-2xl bg-gradient-to-br from-violet-500/15 to-purple-500/10 border border-violet-500/30">
                <div className="p-2.5 rounded-xl bg-violet-500/20 shrink-0">
                  <Users className="w-5 h-5 text-violet-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-200 mb-1">Kampanya Stratejisi</p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {totalGender > 0
                      ? femPct >= malPct
                        ? <>Kadın ziyaretçi oranı <span className="text-pink-300 font-semibold">%{femPct}</span> ile baskın. Aksesuar, kozmetik ve kadın giyim ön planlarda konumlandırılmalı.</>
                        : <>Erkek ziyaretçi oranı <span className="text-blue-300 font-semibold">%{malPct}</span> ile öne çıkıyor. Erkek giyim ve elektronik aksesuar kampanyaları öncelikli değerlendirilebilir.</>
                      : 'Demografik veri biriktiğinde kişiselleştirilmiş kampanya önerileri burada görünecek.'}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })()}

        {/* 3-col: Pasta Grafik (cinsiyet) + Kuyruk stats + Top-5 Günler */}
        <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Bölge Ziyaretçi Dağılımı Donut */}
          {(() => {
            const ZONE_COLORS = ['#6366f1','#3b82f6','#06b6d4','#10b981','#f59e0b','#f43f5e','#8b5cf6','#ec4899'];
            const totalZone = zoneData.reduce((s, z) => s + z.totalVisitors, 0);
            const donutData = zoneData.map(z => ({ name: z.zone, value: z.totalVisitors }));
            return (
              <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-5 rounded-2xl border border-slate-700/50 flex flex-col justify-between min-h-[220px]">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-4 h-4 text-indigo-400 animate-pulse" />
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Bölge Dağılımı</h3>
                </div>
                {zoneData.length > 0 && totalZone > 0 ? (
                  <PremiumDonut data={donutData} colors={ZONE_COLORS} total={totalZone} labelTitle="Bölgeler" />
                ) : (
                  <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">Veri yok</div>
                )}
              </div>
            );
          })()}

          {/* Kuyruk Performansı */}
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-5 rounded-2xl border border-slate-700/50">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart className="w-4 h-4 text-teal-400" />
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Kuyruk & Trafik</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Ort. Bekleme', value: `${formatSecondsToMinutes(dashboardData.weeklyStats.avgQueueTime)} dk`, color: 'text-amber-400', icon: <Timer className="w-3.5 h-3.5" /> },
                { label: 'Toplam Kuyruk', value: dashboardData.weeklyStats.busiestCashier.weeklyCustomers.toLocaleString(), color: 'text-teal-400', icon: <Users className="w-3.5 h-3.5" /> },
                { label: 'Günlük Ort.', value: totalVisitors > 0 ? Math.round(totalVisitors / Math.max(1, dashboardData.dailyCustomerFlow.length)).toLocaleString() : '0', color: 'text-emerald-400', icon: <Activity className="w-3.5 h-3.5" /> },
                { label: 'Toplam Giren', value: totalVisitors.toLocaleString(), color: 'text-blue-400', icon: <UserPlus className="w-3.5 h-3.5" /> },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between bg-slate-800/50 rounded-xl px-3.5 py-2.5 border border-slate-700/30">
                  <div className="flex items-center gap-2">{row.icon}<span className="text-xs text-slate-400">{row.label}</span></div>
                  <span className={`text-sm font-bold ${row.color}`}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top 5 En Yoğun Günler */}
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-5 rounded-2xl border border-slate-700/50">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">En Yoğun 5 Gün</h3>
            </div>
            {top5Days.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-slate-500 text-sm">Veri yok</div>
            ) : (
              <div className="space-y-2.5">
                {top5Days.map((row, i) => {
                  const entered = Number(row.entered ?? 0);
                  const barW = Math.round((entered / maxTopDay) * 100);
                  const medal = ['🥇','🥈','🥉','4️⃣','5️⃣'][i];
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                          <span>{medal}</span>
                          {new Date((row.date as string) + 'T00:00:00').toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', weekday: 'short' })}
                        </span>
                        <span className="text-xs font-bold text-indigo-400">{entered.toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700" style={{ width: `${barW}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>

        {/* Ana Grafik - Area Chart tam genişlik */}
        <motion.div variants={item}>
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-5 sm:p-6 rounded-2xl border border-slate-700/50 overflow-hidden">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                Günlük Müşteri Akışı
              </h3>
              {dateRange.start && <span className="text-[11px] text-slate-500 bg-slate-800/80 border border-slate-700/40 px-2 py-1 rounded-lg">{formatDateForRange(dateRange.start)} — {formatDateForRange(dateRange.end)}</span>}
            </div>
            <div ref={areaChartRef} style={{width:'100%', overflow:'hidden'}}>
              <AreaChart key={animationKey} width={areaChartW} height={280} data={dailyFlowForChart} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashGradEntered" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis dataKey="date" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Area 
                  type="monotone" 
                  dataKey="entered" 
                  stroke="#3b82f6" 
                  strokeWidth={2.5} 
                  fill="url(#dashGradEntered)" 
                  name="Giren" 
                  dot={{ r: 4, stroke: '#3b82f6', strokeWidth: 1.5, fill: '#0f172a' }} 
                  activeDot={{ r: 6, stroke: '#60a5fa', strokeWidth: 2, fill: '#ffffff' }}
                  isAnimationActive={true}
                  animationDuration={1500}
                />
              </AreaChart>
            </div>
          </div>
        </motion.div>

        {/* Cinsiyet Bar Chart - tam genişlik */}
        {dashboardData.dailyGenderChartData.length > 0 && totalGender > 0 && (
          <motion.div variants={item}>
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-5 sm:p-6 rounded-2xl border border-slate-700/50">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-5">Günlük Cinsiyet Dağılımı</h3>
              <div ref={genderBarRef} style={{width:'100%', overflow:'hidden'}}>
                <BarChart width={genderBarW} height={220} data={dashboardData.dailyGenderChartData} barCategoryGap="25%" margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                  <XAxis dataKey="date" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="male" fill={chartColors.blue} name="Erkek" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="female" fill={chartColors.pink} name="Kadın" radius={[3, 3, 0, 0]} />
                </BarChart>
              </div>
            </div>
          </motion.div>
        )}

        {/* Günlük Yaş Analizi - tam genişlik */}
        {dashboardData.dailyAgeChartData.length > 0 && (
          <motion.div variants={item}>
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-5 sm:p-6 rounded-2xl border border-slate-700/50">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-5">Günlük Yaş Analizi</h3>
              <div ref={ageLineRef} style={{width:'100%', overflow:'hidden'}}>
                <BarChart width={ageLineW} height={220} data={dashboardData.dailyAgeChartData} barCategoryGap="25%" margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                  <XAxis dataKey="date" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="age_18_30" fill={chartColors.indigo} name="18-30" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="age_30_50" fill={chartColors.blue} name="30-50" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="age_50_plus" fill={chartColors.teal} name="50+" radius={[3, 3, 0, 0]} />
                </BarChart>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default Dashboard;