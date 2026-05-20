import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Clock, 
  TrendingUp, 
  BarChart3,
  MapPin,
  Search,
  Coffee,
  Activity,
  UserCheck,
  Timer,
  Filter,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useStoreChange } from '../hooks/useStoreChange';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import DateRangePicker from './shared/DateRangePicker';
import InsightsPanel from './shared/InsightsPanel';
import CameraViewer from './shared/CameraViewer';

// Mock veri - API entegrasyonu sonra yapılacak
const MOCK_STAFF = [
  { id: '1', name: 'Ahmet Yılmaz', zone: 'Kasa 1', position: 'Kasiyer', status: 'active', efficiency: 87, productiveHours: 6.5, breakHours: 1.2, totalHours: 8, breakCount: 3 },
  { id: '2', name: 'Elif Demir', zone: 'Giriş', position: 'Satış Danışmanı', status: 'active', efficiency: 92, productiveHours: 7.1, breakHours: 0.8, totalHours: 8, breakCount: 2 },
  { id: '3', name: 'Mehmet Kaya', zone: 'Kat 2', position: 'Güvenlik', status: 'break', efficiency: 78, productiveHours: 5.8, breakHours: 1.5, totalHours: 8, breakCount: 4 },
  { id: '4', name: 'Zeynep Ak', zone: 'Kasa 2', position: 'Kasiyer', status: 'active', efficiency: 95, productiveHours: 7.4, breakHours: 0.6, totalHours: 8, breakCount: 1 },
  { id: '5', name: 'Ali Çelik', zone: 'Depo', position: 'Depo Sorumlusu', status: 'inactive', efficiency: 65, productiveHours: 4.2, breakHours: 2.1, totalHours: 8, breakCount: 5 },
  { id: '6', name: 'Fatma Şen', zone: 'Kat 1', position: 'Satış Danışmanı', status: 'active', efficiency: 89, productiveHours: 6.8, breakHours: 1.0, totalHours: 8, breakCount: 2 },
  { id: '7', name: 'Murat Öz', zone: 'Giriş', position: 'Güvenlik', status: 'active', efficiency: 82, productiveHours: 6.2, breakHours: 1.3, totalHours: 8, breakCount: 3 },
  { id: '8', name: 'Ayşe Koç', zone: 'Kasa 3', position: 'Kasiyer', status: 'active', efficiency: 91, productiveHours: 7.0, breakHours: 0.9, totalHours: 8, breakCount: 2 },
];

const MOCK_ZONE_SUMMARY = [
  { zone: 'Kasa 1', staffCount: 2, avgEfficiency: 87, totalProductiveHours: 13 },
  { zone: 'Kasa 2', staffCount: 1, avgEfficiency: 95, totalProductiveHours: 7.4 },
  { zone: 'Kasa 3', staffCount: 1, avgEfficiency: 91, totalProductiveHours: 7.0 },
  { zone: 'Giriş', staffCount: 2, avgEfficiency: 87, totalProductiveHours: 13.3 },
  { zone: 'Kat 1', staffCount: 1, avgEfficiency: 89, totalProductiveHours: 6.8 },
  { zone: 'Kat 2', staffCount: 1, avgEfficiency: 78, totalProductiveHours: 5.8 },
  { zone: 'Depo', staffCount: 1, avgEfficiency: 65, totalProductiveHours: 4.2 },
];

const MOCK_DAILY_TREND = [
  { day: 'Pzt', efficiency: 82, productiveHours: 48, breakHours: 12 },
  { day: 'Sal', efficiency: 85, productiveHours: 51, breakHours: 10 },
  { day: 'Çar', efficiency: 79, productiveHours: 46, breakHours: 14 },
  { day: 'Per', efficiency: 88, productiveHours: 54, breakHours: 8 },
  { day: 'Cum', efficiency: 91, productiveHours: 56, breakHours: 7 },
  { day: 'Cmt', efficiency: 86, productiveHours: 52, breakHours: 10 },
  { day: 'Paz', efficiency: 74, productiveHours: 40, breakHours: 16 },
];

const StaffManagement = () => {
  useLanguage();
  useStoreChange();

  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedZone, setSelectedZone] = useState('all');
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);

  const chartColors = {
    primary: '#6366f1',
    secondary: '#3b82f6',
    accent: '#f43f5e',
    emerald: '#10b981',
    amber: '#f59e0b',
    purple: '#8b5cf6',
    teal: '#06b6d4',
    pink: '#ec4899',
  };

  const tooltipStyle = {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    borderRadius: '12px',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
    padding: '12px 16px',
    color: '#F9FAFB',
  };

  // Filtrelenmiş personel listesi
  const filteredStaff = useMemo(() => {
    return MOCK_STAFF.filter((s) => {
      if (searchTerm && !s.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (selectedZone !== 'all' && s.zone !== selectedZone) return false;
      return true;
    });
  }, [searchTerm, selectedZone]);

  // Seçili kişi detayı
  const personDetail = selectedPerson ? MOCK_STAFF.find((s) => s.id === selectedPerson) : null;

  // Genel istatistikler
  const overallStats = useMemo(() => {
    const list = filteredStaff;
    const total = list.length;
    const active = list.filter((s) => s.status === 'active').length;
    const avgEff = total > 0 ? list.reduce((a, b) => a + b.efficiency, 0) / total : 0;
    const totalProd = list.reduce((a, b) => a + b.productiveHours, 0);
    const totalBreak = list.reduce((a, b) => a + b.breakHours, 0);
    return { total, active, avgEff, totalProd, totalBreak };
  }, [filteredStaff]);

  // Zone listesi
  const allZones = useMemo(() => [...new Set(MOCK_STAFF.map((s) => s.zone))], []);

  // Verimlilik dağılım pie data
  const efficiencyPieData = useMemo(() => {
    const high = filteredStaff.filter((s) => s.efficiency >= 90).length;
    const mid = filteredStaff.filter((s) => s.efficiency >= 70 && s.efficiency < 90).length;
    const low = filteredStaff.filter((s) => s.efficiency < 70).length;
    return [
      { name: 'Yüksek (90+%)', value: high },
      { name: 'Orta (70-89%)', value: mid },
      { name: 'Düşük (<70%)', value: low },
    ].filter((d) => d.value > 0);
  }, [filteredStaff]);

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const item = { hidden: { y: 16, opacity: 0 }, show: { y: 0, opacity: 1, transition: { duration: 0.35 } } };

  return (
    <div className="p-3 sm:p-4 md:p-5 lg:p-8">
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-4 sm:space-y-5 lg:space-y-7">

        {/* Header */}
        <motion.div variants={item} className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
                <Users className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight">Personel Verimlilik</h1>
            </div>
            <p className="text-sm text-slate-400 ml-12">Kişi bazlı ve alan bazlı verimlilik takibi</p>
          </div>
          <div className="w-full xl:w-auto flex flex-col sm:flex-row gap-2 sm:gap-3 flex-wrap">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />
            <div className="flex items-center gap-1 bg-slate-800/60 border border-slate-700/50 rounded-xl p-0.5">
              {(['daily', 'weekly', 'monthly'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    viewMode === m ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {m === 'daily' ? 'Günlük' : m === 'weekly' ? 'Haftalık' : 'Aylık'}
                </button>
              ))}
            </div>
            <CameraViewer />
          </div>
        </motion.div>

        {/* Insights */}
        <motion.div variants={item}>
          <InsightsPanel module="staff" />
        </motion.div>

        {/* KPI Cards */}
        <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
          {[
            { label: 'Toplam Personel', value: overallStats.total, icon: <Users className="w-5 h-5 text-blue-400" />, gradient: 'from-blue-500/15 to-indigo-500/15', border: 'border-blue-500/25' },
            { label: 'Aktif', value: overallStats.active, icon: <UserCheck className="w-5 h-5 text-emerald-400" />, gradient: 'from-emerald-500/15 to-green-500/15', border: 'border-emerald-500/25' },
            { label: 'Ort. Verimlilik', value: `%${overallStats.avgEff.toFixed(0)}`, icon: <TrendingUp className="w-5 h-5 text-violet-400" />, gradient: 'from-violet-500/15 to-purple-500/15', border: 'border-violet-500/25' },
            { label: 'Verimli Saat', value: `${overallStats.totalProd.toFixed(1)}h`, icon: <Activity className="w-5 h-5 text-amber-400" />, gradient: 'from-amber-500/15 to-orange-500/15', border: 'border-amber-500/25' },
            { label: 'Mola Süresi', value: `${overallStats.totalBreak.toFixed(1)}h`, icon: <Coffee className="w-5 h-5 text-rose-400" />, gradient: 'from-rose-500/15 to-pink-500/15', border: 'border-rose-500/25' },
          ].map((kpi) => (
            <div key={kpi.label} className={`bg-gradient-to-br ${kpi.gradient} p-4 sm:p-5 rounded-2xl border ${kpi.border}`}>
              <div className="mb-2">{kpi.icon}</div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-white">{kpi.value}</h3>
              <p className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-wider mt-1 font-semibold">{kpi.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Filters */}
        <motion.div variants={item} className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Personel ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none w-full sm:w-auto min-w-[160px]"
            >
              <option value="all">Tüm Alanlar</option>
              {allZones.map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>
        </motion.div>

        {/* Kişi Detay - eğer bir kişi seçiliyse */}
        {personDetail && (
          <motion.div variants={item} className="bg-gradient-to-br from-indigo-900/30 to-slate-900/60 p-5 sm:p-6 rounded-2xl border border-indigo-500/20">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">{personDetail.name}</h3>
                <p className="text-sm text-slate-400">{personDetail.position} — {personDetail.zone}</p>
              </div>
              <button onClick={() => setSelectedPerson(null)} className="px-3 py-1.5 text-xs text-slate-300 bg-slate-800/60 border border-slate-700/50 rounded-lg hover:text-white transition-colors">
                Kapat
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Verimlilik', value: `%${personDetail.efficiency}`, color: personDetail.efficiency >= 90 ? 'text-emerald-400' : personDetail.efficiency >= 70 ? 'text-amber-400' : 'text-rose-400' },
                { label: 'Verimli Saat', value: `${personDetail.productiveHours}h`, color: 'text-blue-400' },
                { label: 'Mola Süresi', value: `${personDetail.breakHours}h`, color: 'text-orange-400' },
                { label: 'Mola Sayısı', value: personDetail.breakCount, color: 'text-purple-400' },
              ].map((d) => (
                <div key={d.label} className="bg-slate-800/40 rounded-xl p-3 text-center">
                  <p className={`text-xl font-bold ${d.color}`}>{d.value}</p>
                  <p className="text-[10px] text-slate-500 uppercase mt-1">{d.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Personel Tablo */}
        <motion.div variants={item} className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl border border-slate-700/50 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-700/30">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Personel Listesi</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] sm:text-xs md:text-sm">
              <thead>
                <tr className="bg-slate-800/40">
                  <th className="text-left px-3 sm:px-4 py-3 text-slate-400 font-semibold uppercase tracking-wider text-[10px] sm:text-xs">Personel</th>
                  <th className="text-left px-3 sm:px-4 py-3 text-slate-400 font-semibold uppercase tracking-wider text-[10px] sm:text-xs hidden sm:table-cell">Alan</th>
                  <th className="text-center px-3 sm:px-4 py-3 text-slate-400 font-semibold uppercase tracking-wider text-[10px] sm:text-xs">Durum</th>
                  <th className="text-center px-3 sm:px-4 py-3 text-blue-400 font-semibold uppercase tracking-wider text-[10px] sm:text-xs">Verimlilik</th>
                  <th className="text-center px-3 sm:px-4 py-3 text-emerald-400 font-semibold uppercase tracking-wider text-[10px] sm:text-xs hidden md:table-cell">Verimli Saat</th>
                  <th className="text-center px-3 sm:px-4 py-3 text-orange-400 font-semibold uppercase tracking-wider text-[10px] sm:text-xs hidden md:table-cell">Mola</th>
                  <th className="text-center px-3 sm:px-4 py-3 text-purple-400 font-semibold uppercase tracking-wider text-[10px] sm:text-xs hidden lg:table-cell">Mola Sayısı</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((staff) => (
                  <tr
                    key={staff.id}
                    onClick={() => setSelectedPerson(staff.id === selectedPerson ? null : staff.id)}
                    className={`border-b border-slate-700/20 cursor-pointer transition-colors ${
                      selectedPerson === staff.id ? 'bg-indigo-900/20' : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <td className="px-3 sm:px-4 py-3 text-white font-medium">{staff.name}<span className="block sm:hidden text-[10px] text-slate-500">{staff.zone}</span></td>
                    <td className="px-3 sm:px-4 py-3 text-slate-300 hidden sm:table-cell">{staff.zone}</td>
                    <td className="px-3 sm:px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${
                        staff.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' :
                        staff.status === 'break' ? 'bg-amber-500/15 text-amber-400' :
                        'bg-rose-500/15 text-rose-400'
                      }`}>
                        {staff.status === 'active' ? 'Aktif' : staff.status === 'break' ? 'Mola' : 'Pasif'}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="hidden sm:block w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${staff.efficiency >= 90 ? 'bg-emerald-500' : staff.efficiency >= 70 ? 'bg-amber-500' : 'bg-rose-500'}`}
                            style={{ width: `${staff.efficiency}%` }}
                          />
                        </div>
                        <span className={`font-bold ${staff.efficiency >= 90 ? 'text-emerald-400' : staff.efficiency >= 70 ? 'text-amber-400' : 'text-rose-400'}`}>
                          %{staff.efficiency}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-center text-slate-200 hidden md:table-cell">{staff.productiveHours}h</td>
                    <td className="px-3 sm:px-4 py-3 text-center text-slate-200 hidden md:table-cell">{staff.breakHours}h</td>
                    <td className="px-3 sm:px-4 py-3 text-center text-slate-200 hidden lg:table-cell">{staff.breakCount}</td>
                  </tr>
                ))}
                {filteredStaff.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-8 text-slate-500">Sonuç bulunamadı</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Charts Grid */}
        <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-5">

          {/* Haftalık Verimlilik Trendi */}
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-5 sm:p-6 rounded-2xl border border-slate-700/50">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-5 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" /> Haftalık Verimlilik Trendi
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={MOCK_DAILY_TREND}>
                <defs>
                  <linearGradient id="gradEff" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="efficiency" stroke={chartColors.primary} strokeWidth={2.5} fill="url(#gradEff)" name="Verimlilik %" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Verimlilik Dağılım Pie */}
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-5 sm:p-6 rounded-2xl border border-slate-700/50">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-5 flex items-center gap-2">
              <Timer className="w-4 h-4 text-indigo-400" /> Verimlilik Dağılımı
            </h3>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie data={efficiencyPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4}>
                    {efficiencyPieData.map((_, i) => (
                      <Cell key={i} fill={[chartColors.emerald, chartColors.amber, chartColors.accent][i]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2">
                {efficiencyPieData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: [chartColors.emerald, chartColors.amber, chartColors.accent][i] }} />
                    <span className="text-xs text-slate-300">{d.name}</span>
                    <span className="text-xs font-bold text-white ml-auto">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Verimli Saat vs Mola */}
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-5 sm:p-6 rounded-2xl border border-slate-700/50">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-5 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" /> Verimli Saat vs Mola
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={MOCK_DAILY_TREND} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" iconSize={8} />
                <Bar dataKey="productiveHours" fill={chartColors.secondary} name="Verimli Saat" radius={[4, 4, 0, 0]} />
                <Bar dataKey="breakHours" fill={chartColors.accent} name="Mola Saat" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Alan Bazlı Performans */}
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-5 sm:p-6 rounded-2xl border border-slate-700/50">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-5 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-indigo-400" /> Alan Bazlı Verimlilik
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={MOCK_ZONE_SUMMARY} layout="vertical" barCategoryGap="15%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                <YAxis type="category" dataKey="zone" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} width={60} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="avgEfficiency" fill={chartColors.teal} name="Ort. Verimlilik %" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
};

export default StaffManagement;
