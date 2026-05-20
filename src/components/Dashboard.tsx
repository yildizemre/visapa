// --- START OF FILE Dashboard.tsx ---

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Clock,
  Target,
  ShoppingCart,
  Lightbulb,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
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
  ResponsiveContainer,
  BarChart,
  Area,
  AreaChart,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import InsightsPanel from './shared/InsightsPanel';
import CameraViewer from './shared/CameraViewer';

const Dashboard = () => {
  const { t, language } = useLanguage();
  const storeRefresh = useStoreChange();
  
  const [dashboardData, setDashboardData] = useState({
    weeklyStats: {
      customersEntered: 0,
      customersExited: 0,
      ageDistribution: { mostDominantGroup: 'N/A' },
      genderDistribution: { male: 0, female: 0 },
      avgQueueTime: 0,
      busiestCashier: { name: 'N/A', weeklyCustomers: 0, avgWaitTime: 0 },
    },
    dailyCustomerFlow: [],
    dailyGenderChartData: [],
    dailyAgeChartData: [],
    hourlyQueueStaff: [],
  });

  const [loading, setLoading] = useState(true);
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
            ageDistribution: { mostDominantGroup: customers.busiest_age_group ?? 'N/A' },
            genderDistribution: {
              male: customers.male ?? 0,
              female: customers.female ?? 0,
            },
            avgQueueTime: queues.avg_wait_time ?? 0,
            busiestCashier: { 
              name: 'Kasa 3', 
              weeklyCustomers: queues.total_queues ?? 0, 
              avgWaitTime: queues.avg_wait_time ?? 0 
            },
          },
          dailyCustomerFlow: (timeseries.daily_customer_flow ?? []).map((item: Record<string, unknown>) => ({
            ...item,
            date: new Date(item.date as string).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: 'short' }),
          })),
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


  const genderPieData = useMemo(() => {
    const m = dashboardData.weeklyStats.genderDistribution.male;
    const f = dashboardData.weeklyStats.genderDistribution.female;
    if (m + f === 0) return [];
    return [
      { name: t('chart.male'), value: m, color: chartColors.blue },
      { name: t('chart.female'), value: f, color: chartColors.pink },
    ];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardData.weeklyStats.genderDistribution]);

  const insights = useMemo(() => {
    const stats = dashboardData.weeklyStats;
    const total = stats.customersEntered;
    const male = stats.genderDistribution.male;
    const female = stats.genderDistribution.female;
    const avgQueue = stats.avgQueueTime;
    const items = [];

    if (total > 0) {
      const dailyAvg = Math.round(total / 7);
      items.push({
        icon: <Zap className="w-5 h-5" />,
        color: 'from-blue-500/20 to-indigo-500/20',
        borderColor: 'border-blue-500/40',
        iconBg: 'text-blue-400',
        title: language === 'tr' ? 'Haftalık Trafik' : 'Weekly Traffic',
        desc: language === 'tr' 
          ? `Bu hafta toplam ${total.toLocaleString()} müşteri girişi yapıldı. Günlük ortalama ${dailyAvg.toLocaleString()} müşteri.`
          : `Total ${total.toLocaleString()} customer entries this week. Daily average ${dailyAvg.toLocaleString()} customers.`,
      });
    }

    if (male + female > 0) {
      const femalePercent = Math.round((female / (male + female)) * 100);
      items.push({
        icon: <Users className="w-5 h-5" />,
        color: 'from-pink-500/20 to-rose-500/20',
        borderColor: 'border-pink-500/40',
        iconBg: 'text-pink-400',
        title: language === 'tr' ? 'Demografik Analiz' : 'Demographic Analysis',
        desc: language === 'tr'
          ? `Kadın müşteri oranı %${femalePercent}. ${femalePercent > 50 ? 'Kadın odaklı kampanyalar daha etkili olabilir.' : 'Erkek müşteri yoğunluğu dikkat çekici.'}`
          : `Female customer rate ${femalePercent}%. ${femalePercent > 50 ? 'Female-focused campaigns may be more effective.' : 'Male customer density is notable.'}`,
      });
    }

    if (avgQueue > 0) {
      const queueMin = (avgQueue / 60).toFixed(1);
      const isHigh = avgQueue > 120;
      items.push({
        icon: isHigh ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />,
        color: isHigh ? 'from-amber-500/20 to-orange-500/20' : 'from-emerald-500/20 to-teal-500/20',
        borderColor: isHigh ? 'border-amber-500/40' : 'border-emerald-500/40',
        iconBg: isHigh ? 'text-amber-400' : 'text-emerald-400',
        title: language === 'tr' ? 'Kuyruk Performansı' : 'Queue Performance',
        desc: language === 'tr'
          ? `Ortalama bekleme süresi ${queueMin} dakika. ${isHigh ? 'Kasa sayısını artırmayı değerlendirin.' : 'Kuyruk süresi kabul edilebilir seviyede.'}`
          : `Average wait time ${queueMin} minutes. ${isHigh ? 'Consider increasing cashier count.' : 'Queue time is at acceptable level.'}`,
      });
    }

    return items;
  }, [dashboardData, language]);

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const item = { hidden: { y: 16, opacity: 0 }, show: { y: 0, opacity: 1, transition: { duration: 0.4 } } };

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

  const KpiCard = ({ icon, iconGradient, label, value, subtitle, trend }: {
    icon: React.ReactNode; iconGradient: string; label: string; value: string; subtitle?: string; trend?: { value: number; positive: boolean } | null;
  }) => (
    <div className="group relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl p-5 sm:p-6 rounded-2xl border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300 hover:shadow-lg hover:shadow-slate-900/50 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-2.5 rounded-xl bg-gradient-to-br ${iconGradient} shadow-lg`}>{icon}</div>
          {trend && (
            <div className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full ${trend.positive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
              {trend.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        <p className="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{label}</p>
        <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight leading-none mb-1">{value}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  );

  const totalGender = dashboardData.weeklyStats.genderDistribution.male + dashboardData.weeklyStats.genderDistribution.female;
  const malePercent = totalGender > 0 ? Math.round((dashboardData.weeklyStats.genderDistribution.male / totalGender) * 100) : 0;
  const femalePercent = totalGender > 0 ? 100 - malePercent : 0;

  return (
    <div className="p-3 sm:p-4 md:p-5 lg:p-8">
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 sm:space-y-6 lg:space-y-8">
        
        {/* Header */}
        <motion.div variants={item} className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight">{t('dashboard.title')}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 ml-12">
              <p className="text-sm text-slate-400">{t('dashboard.weeklyOverview')}</p>
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

        {/* Otomatik Öneriler */}
        <motion.div variants={item}>
          <InsightsPanel module="dashboard" />
        </motion.div>

        {/* KPI Grid */}
        <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
          <KpiCard 
            icon={<TrendingUp className="w-5 h-5 text-white" />}
            iconGradient="from-blue-500 to-cyan-500"
            label={t('dashboard.customersEntered')}
            value={dashboardData.weeklyStats.customersEntered.toLocaleString()}
            subtitle={`${t('dashboard.weeklyLabel')} • ${language === 'tr' ? 'Giriş' : 'Entries'}`}
          />
          <KpiCard 
            icon={<Zap className="w-5 h-5 text-white" />}
            iconGradient="from-emerald-500 to-teal-500"
            label={language === 'tr' ? 'Günlük Ortalama' : 'Daily Average'}
            value={dashboardData.weeklyStats.customersEntered > 0 ? Math.round(dashboardData.weeklyStats.customersEntered / 7).toLocaleString() : '0'}
            subtitle={language === 'tr' ? 'Haftalık giriş ortalaması' : 'Weekly entry average'}
          />
          <KpiCard 
            icon={<Clock className="w-5 h-5 text-white" />}
            iconGradient="from-amber-500 to-orange-500"
            label={t('dashboard.avgQueueTime')}
            value={`${formatSecondsToMinutes(dashboardData.weeklyStats.avgQueueTime)} ${t('dashboard.minuteShort')}`}
            subtitle={t('dashboard.weeklyAverage')}
          />
          <KpiCard 
            icon={<Target className="w-5 h-5 text-white" />}
            iconGradient="from-purple-500 to-indigo-500"
            label={t('dashboard.ageDistribution')}
            value={dashboardData.weeklyStats.ageDistribution.mostDominantGroup}
            subtitle={t('dashboard.busiestAgeGroup')}
          />
        </motion.div>

        {/* Insights Section - Boyner Rapor Stili */}
        {insights.length > 0 && (
          <motion.div variants={item}>
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-slate-200">{language === 'tr' ? 'Akıllı İçgörüler & Öneriler' : 'Smart Insights & Recommendations'}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {insights.map((insight, idx) => (
                <div key={idx} className={`relative p-5 rounded-2xl bg-gradient-to-br ${insight.color} border ${insight.borderColor} backdrop-blur-sm`}>
                  <div className={`mb-3 ${insight.iconBg}`}>{insight.icon}</div>
                  <h3 className="text-sm font-bold text-slate-200 mb-2">{insight.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{insight.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Gender + Kasa Summary Row */}
        <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
          {/* Gender Distribution Card */}
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-5 sm:p-6 rounded-2xl border border-slate-700/50">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-5">{t('dashboard.genderDistribution')}</h3>
            <div className="flex items-center gap-6">
              <div className="w-32 h-32 sm:w-36 sm:h-36">
                {genderPieData.length > 0 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={genderPieData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={4} dataKey="value" strokeWidth={0}>
                        {genderPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-400" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-300 font-medium">{t('chart.male')}</span>
                      <span className="text-sm font-bold text-slate-100">{dashboardData.weeklyStats.genderDistribution.male.toLocaleString()}</span>
                    </div>
                    <div className="mt-1.5 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-700" style={{ width: `${malePercent}%` }} />
                    </div>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">%{malePercent}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-pink-400" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-300 font-medium">{t('chart.female')}</span>
                      <span className="text-sm font-bold text-slate-100">{dashboardData.weeklyStats.genderDistribution.female.toLocaleString()}</span>
                    </div>
                    <div className="mt-1.5 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-pink-500 to-pink-400 rounded-full transition-all duration-700" style={{ width: `${femalePercent}%` }} />
                    </div>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">%{femalePercent}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Queue & Cashier Summary */}
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-5 sm:p-6 rounded-2xl border border-slate-700/50">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-5">{t('dashboard.busiestCashier')}</h3>
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 border border-teal-500/30">
                  <ShoppingCart className="w-6 h-6 text-teal-400" />
                </div>
                <div>
                  <h4 className="text-xl font-extrabold text-slate-100">{dashboardData.weeklyStats.busiestCashier.name}</h4>
                  <p className="text-xs text-slate-500">{t('dashboard.weekLeader')}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-700/30 border border-slate-600/30">
                  <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider mb-1">{t('dashboard.weeklyCustomers')}</p>
                  <p className="text-lg font-bold text-slate-100">{dashboardData.weeklyStats.busiestCashier.weeklyCustomers.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-700/30 border border-slate-600/30">
                  <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider mb-1">{t('dashboard.avgQueueTime')}</p>
                  <p className="text-lg font-bold text-slate-100">{formatSecondsToMinutes(dashboardData.weeklyStats.busiestCashier.avgWaitTime)} {t('dashboard.minuteShort')}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Charts Grid */}
        <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
          {/* Customer Flow Trend - Area Chart */}
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-5 sm:p-6 rounded-2xl border border-slate-700/50">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-5">{t('dashboard.dailyCustomerFlowTrend')}</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={dashboardData.dailyCustomerFlow}>
                <defs>
                  <linearGradient id="gradEntered" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColors.secondary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={chartColors.secondary} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradExited" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColors.danger} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={chartColors.danger} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" iconSize={8} />
                <Area type="monotone" dataKey="entered" stroke={chartColors.secondary} strokeWidth={2.5} fill="url(#gradEntered)" name={t('dashboard.enteringCustomers')} />
                <Area type="monotone" dataKey="exited" stroke={chartColors.danger} strokeWidth={2} fill="url(#gradExited)" name={t('dashboard.exitingCustomers')} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Gender Distribution Bar */}
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-5 sm:p-6 rounded-2xl border border-slate-700/50">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-5">{t('dashboard.dailyGenderDistribution')}</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dashboardData.dailyGenderChartData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" iconSize={8} />
                <Bar dataKey="male" fill={chartColors.blue} name={t('chart.male')} radius={[4, 4, 0, 0]} />
                <Bar dataKey="female" fill={chartColors.pink} name={t('chart.female')} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Age Distribution Stacked */}
          <div className="lg:col-span-2 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-5 sm:p-6 rounded-2xl border border-slate-700/50">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-5">{t('dashboard.dailyAgeDistribution')}</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dashboardData.dailyAgeChartData} barCategoryGap="15%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" iconSize={8} />
                <Bar dataKey="age_18_30" stackId="a" fill={chartColors.age1830} name="18-30" radius={[0, 0, 0, 0]} />
                <Bar dataKey="age_30_50" stackId="a" fill={chartColors.age3050} name="30-50" radius={[0, 0, 0, 0]} />
                <Bar dataKey="age_50_plus" stackId="a" fill={chartColors.age50plus} name="50+" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Dashboard;