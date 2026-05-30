import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Camera,
  Wifi,
  WifiOff,
  Activity,
  AlertTriangle,
  Clock,
  Signal,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import DateRangePicker from './shared/DateRangePicker';
import InsightsPanel from './shared/InsightsPanel';
import CameraViewer from './shared/CameraViewer';

// --- Dummy Data ---
interface CameraInfo {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'warning';
  uptime: number; // yüzde
  lastPing: string;
  avgFps: number;
  resolution: string;
  disconnections: number; // son 7 gün
  avgDisconnectDuration: number; // dakika
  dailyUptime: { date: string; uptime: number }[];
  hourlyFps: { hour: string; fps: number }[];
}

const DUMMY_CAMERAS: CameraInfo[] = [
  {
    id: 'cam-01',
    name: 'Giriş Kamerası',
    location: 'Ana Giriş',
    status: 'online',
    uptime: 99.2,
    lastPing: new Date(Date.now() - 12000).toISOString(),
    avgFps: 28.5,
    resolution: '1920x1080',
    disconnections: 2,
    avgDisconnectDuration: 3.5,
    dailyUptime: [
      { date: '05-24', uptime: 100 }, { date: '05-25', uptime: 99.5 }, { date: '05-26', uptime: 98.1 },
      { date: '05-27', uptime: 100 }, { date: '05-28', uptime: 99.8 }, { date: '05-29', uptime: 97.2 },
      { date: '05-30', uptime: 100 },
    ],
    hourlyFps: Array.from({ length: 13 }, (_, i) => ({ hour: `${10 + i}:00`, fps: 25 + Math.random() * 5 })),
  },
  {
    id: 'cam-02',
    name: 'Kasa Kamerası',
    location: 'Kasa Bölgesi',
    status: 'online',
    uptime: 97.8,
    lastPing: new Date(Date.now() - 8000).toISOString(),
    avgFps: 26.1,
    resolution: '1920x1080',
    disconnections: 5,
    avgDisconnectDuration: 8.2,
    dailyUptime: [
      { date: '05-24', uptime: 95.3 }, { date: '05-25', uptime: 98.1 }, { date: '05-26', uptime: 100 },
      { date: '05-27', uptime: 96.4 }, { date: '05-28', uptime: 99.1 }, { date: '05-29', uptime: 97.8 },
      { date: '05-30', uptime: 98.5 },
    ],
    hourlyFps: Array.from({ length: 13 }, (_, i) => ({ hour: `${10 + i}:00`, fps: 22 + Math.random() * 6 })),
  },
  {
    id: 'cam-03',
    name: 'Depo Kamerası',
    location: 'Arka Depo',
    status: 'offline',
    uptime: 78.4,
    lastPing: new Date(Date.now() - 3600000).toISOString(),
    avgFps: 0,
    resolution: '1280x720',
    disconnections: 14,
    avgDisconnectDuration: 22.5,
    dailyUptime: [
      { date: '05-24', uptime: 85.2 }, { date: '05-25', uptime: 72.1 }, { date: '05-26', uptime: 90.3 },
      { date: '05-27', uptime: 68.4 }, { date: '05-28', uptime: 81.2 }, { date: '05-29', uptime: 75.6 },
      { date: '05-30', uptime: 0 },
    ],
    hourlyFps: Array.from({ length: 13 }, (_, i) => ({ hour: `${10 + i}:00`, fps: i < 8 ? 18 + Math.random() * 4 : 0 })),
  },
  {
    id: 'cam-04',
    name: 'Kadın Giyim Kamerası',
    location: 'Kadın Giyim Bölgesi',
    status: 'online',
    uptime: 99.9,
    lastPing: new Date(Date.now() - 5000).toISOString(),
    avgFps: 29.8,
    resolution: '2560x1440',
    disconnections: 0,
    avgDisconnectDuration: 0,
    dailyUptime: [
      { date: '05-24', uptime: 100 }, { date: '05-25', uptime: 100 }, { date: '05-26', uptime: 99.9 },
      { date: '05-27', uptime: 100 }, { date: '05-28', uptime: 100 }, { date: '05-29', uptime: 100 },
      { date: '05-30', uptime: 100 },
    ],
    hourlyFps: Array.from({ length: 13 }, (_, i) => ({ hour: `${10 + i}:00`, fps: 28 + Math.random() * 3 })),
  },
  {
    id: 'cam-05',
    name: 'Erkek Giyim Kamerası',
    location: 'Erkek Giyim Bölgesi',
    status: 'warning',
    uptime: 91.3,
    lastPing: new Date(Date.now() - 180000).toISOString(),
    avgFps: 18.2,
    resolution: '1920x1080',
    disconnections: 8,
    avgDisconnectDuration: 12.1,
    dailyUptime: [
      { date: '05-24', uptime: 92.5 }, { date: '05-25', uptime: 88.3 }, { date: '05-26', uptime: 95.1 },
      { date: '05-27', uptime: 90.2 }, { date: '05-28', uptime: 93.4 }, { date: '05-29', uptime: 89.7 },
      { date: '05-30', uptime: 91.0 },
    ],
    hourlyFps: Array.from({ length: 13 }, (_, i) => ({ hour: `${10 + i}:00`, fps: 14 + Math.random() * 8 })),
  },
  {
    id: 'cam-06',
    name: 'Kozmetik Kamerası',
    location: 'Kozmetik Bölgesi',
    status: 'online',
    uptime: 98.5,
    lastPing: new Date(Date.now() - 15000).toISOString(),
    avgFps: 27.3,
    resolution: '1920x1080',
    disconnections: 3,
    avgDisconnectDuration: 5.0,
    dailyUptime: [
      { date: '05-24', uptime: 97.8 }, { date: '05-25', uptime: 99.2 }, { date: '05-26', uptime: 98.0 },
      { date: '05-27', uptime: 99.5 }, { date: '05-28', uptime: 97.1 }, { date: '05-29', uptime: 98.9 },
      { date: '05-30', uptime: 99.1 },
    ],
    hourlyFps: Array.from({ length: 13 }, (_, i) => ({ hour: `${10 + i}:00`, fps: 24 + Math.random() * 5 })),
  },
];

const STATUS_CONFIG = {
  online: { label: 'Çevrimiçi', color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
  offline: { label: 'Çevrimdışı', color: 'text-rose-400', bg: 'bg-rose-500/20', border: 'border-rose-500/30', dot: 'bg-rose-400' },
  warning: { label: 'Uyarı', color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30', dot: 'bg-amber-400' },
};

const PIE_COLORS = ['#22c55e', '#f43f5e', '#f59e0b'];

const tooltipStyle = {
  backgroundColor: 'rgba(15, 23, 42, 0.95)',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  borderRadius: '12px',
  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
  padding: '12px 16px',
};

const CameraHealth = () => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);

  const cameras = DUMMY_CAMERAS;

  const overallStats = useMemo(() => {
    const total = cameras.length;
    const online = cameras.filter((c) => c.status === 'online').length;
    const offline = cameras.filter((c) => c.status === 'offline').length;
    const warning = cameras.filter((c) => c.status === 'warning').length;
    const avgUptime = cameras.reduce((s, c) => s + c.uptime, 0) / total;
    const totalDisconnections = cameras.reduce((s, c) => s + c.disconnections, 0);
    const avgFps = cameras.filter((c) => c.status !== 'offline').reduce((s, c) => s + c.avgFps, 0) / Math.max(online + warning, 1);
    return { total, online, offline, warning, avgUptime, totalDisconnections, avgFps };
  }, [cameras]);

  const statusPieData = [
    { name: 'Çevrimiçi', value: overallStats.online },
    { name: 'Çevrimdışı', value: overallStats.offline },
    { name: 'Uyarı', value: overallStats.warning },
  ].filter((d) => d.value > 0);

  const disconnectionBarData = cameras.map((c) => ({
    name: c.name.replace(' Kamerası', ''),
    kopma: c.disconnections,
    sure: Math.round(c.avgDisconnectDuration),
  }));

  const selected = selectedCamera ? cameras.find((c) => c.id === selectedCamera) : null;

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const item = { hidden: { y: 16, opacity: 0 }, show: { y: 0, opacity: 1, transition: { duration: 0.35 } } };

  return (
    <div className="p-3 sm:p-4 md:p-5 lg:p-8">
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-4 sm:space-y-5 lg:space-y-7">

        {/* Header */}
        <motion.div variants={item} className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/25">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight">Kamera Sağlığı</h1>
            </div>
            <p className="text-sm text-slate-400 ml-12">Kamera durumu, çalışma süreleri ve performans metrikleri</p>
          </div>
          <div className="w-full xl:w-auto flex flex-col sm:flex-row gap-2 sm:gap-3 flex-wrap">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />
            <CameraViewer />
          </div>
        </motion.div>

        {/* Demo Banner */}
        <motion.div variants={item}>
          <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 sm:px-5 py-3 sm:py-4">
            <div className="mt-0.5 shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-300">Örnek Veri Gösterimi</p>
              <p className="text-xs text-amber-200/70 mt-0.5 leading-relaxed">
                Bu sayfada görüntülenen veriler <strong>örnek (demo) verilerdir</strong>. Gerçek kamera sağlık verileri, mağaza AI servisiniz heartbeat göndermeye başladığında otomatik olarak güncellenecektir.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Insights */}
        <motion.div variants={item}>
          <InsightsPanel module="camera_health" />
        </motion.div>

        {/* KPI Cards */}
        <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
          {[
            { label: 'Toplam Kamera', value: overallStats.total, icon: <Camera className="w-5 h-5 text-blue-400" />, gradient: 'from-blue-500/15 to-indigo-500/15', border: 'border-blue-500/25' },
            { label: 'Aktif / Çevrimiçi', value: `${overallStats.online}/${overallStats.total}`, icon: <Wifi className="w-5 h-5 text-emerald-400" />, gradient: 'from-emerald-500/15 to-green-500/15', border: 'border-emerald-500/25' },
            { label: 'Ort. Uptime', value: `%${overallStats.avgUptime.toFixed(1)}`, icon: <Activity className="w-5 h-5 text-violet-400" />, gradient: 'from-violet-500/15 to-purple-500/15', border: 'border-violet-500/25' },
            { label: 'Toplam Kopma', value: overallStats.totalDisconnections, icon: <WifiOff className="w-5 h-5 text-rose-400" />, gradient: 'from-rose-500/15 to-pink-500/15', border: 'border-rose-500/25' },
          ].map((kpi) => (
            <div key={kpi.label} className={`bg-gradient-to-br ${kpi.gradient} p-4 sm:p-5 rounded-2xl border ${kpi.border}`}>
              <div className="mb-2">{kpi.icon}</div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-white">{kpi.value}</h3>
              <p className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-wider mt-1 font-semibold">{kpi.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Camera Cards Grid */}
        <motion.div variants={item}>
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Kamera Durumları</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {cameras.map((cam) => {
              const cfg = STATUS_CONFIG[cam.status];
              const isSelected = selectedCamera === cam.id;
              const timeSinceLastPing = Math.round((Date.now() - new Date(cam.lastPing).getTime()) / 1000);
              const pingLabel = timeSinceLastPing < 60
                ? `${timeSinceLastPing}s önce`
                : timeSinceLastPing < 3600
                ? `${Math.floor(timeSinceLastPing / 60)}dk önce`
                : `${Math.floor(timeSinceLastPing / 3600)}sa önce`;

              return (
                <button
                  key={cam.id}
                  onClick={() => setSelectedCamera(isSelected ? null : cam.id)}
                  className={`text-left w-full p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
                    isSelected
                      ? 'border-cyan-500/50 bg-cyan-500/5 ring-1 ring-cyan-500/30'
                      : 'border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 hover:border-slate-600/50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${cfg.bg} border ${cfg.border}`}>
                        <Camera className={`w-4 h-4 ${cfg.color}`} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{cam.name}</h4>
                        <p className="text-[10px] text-slate-500">{cam.location}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${cfg.dot} ${cam.status === 'online' ? 'animate-pulse' : ''}`} />
                      <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold text-white">%{cam.uptime.toFixed(1)}</p>
                      <p className="text-[9px] text-slate-500 uppercase">Uptime</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">{cam.avgFps > 0 ? cam.avgFps.toFixed(0) : '-'}</p>
                      <p className="text-[9px] text-slate-500 uppercase">Ort. FPS</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">{cam.disconnections}</p>
                      <p className="text-[9px] text-slate-500 uppercase">Kopma</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="flex items-center gap-1"><Signal className="w-3 h-3" />{cam.resolution}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{pingLabel}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Selected Camera Detail */}
        {selected && (
          <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-5">
            {/* Daily Uptime */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl p-5 sm:p-6 rounded-2xl border border-slate-700/50">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">
                {selected.name} — Günlük Uptime (%)
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={selected.dailyUptime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(val: number) => [`%${val.toFixed(1)}`, 'Uptime']} />
                  <Bar dataKey="uptime" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Hourly FPS */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl p-5 sm:p-6 rounded-2xl border border-slate-700/50">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">
                {selected.name} — Saatlik FPS
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={selected.hourlyFps}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                  <XAxis dataKey="hour" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(val: number) => [val.toFixed(1), 'FPS']} />
                  <Line type="monotone" dataKey="fps" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* Charts Row */}
        <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-5">
          {/* Status Distribution Pie */}
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl p-5 sm:p-6 rounded-2xl border border-slate-700/50">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Durum Dağılımı</h3>
            <ResponsiveContainer width="100%" height={280}>
              <RechartsPieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius="50%"
                  outerRadius="75%"
                  paddingAngle={3}
                  dataKey="value"
                  stroke="rgba(15,23,42,0.6)"
                  strokeWidth={1.5}
                >
                  {statusPieData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span className="text-slate-300 text-sm">{value}</span>}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>

          {/* Disconnection Bar Chart */}
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl p-5 sm:p-6 rounded-2xl border border-slate-700/50">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Kamera Bazlı Kopma Sayısı & Ort. Süre (dk)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={disconnectionBarData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} width={80} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="kopma" name="Kopma Sayısı" fill="#f43f5e" radius={[0, 4, 4, 0]} />
                <Bar dataKey="sure" name="Ort. Süre (dk)" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Uptime Trend - All Cameras */}
        <motion.div variants={item} className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl p-5 sm:p-6 rounded-2xl border border-slate-700/50">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Tüm Kameralar — 7 Günlük Uptime Trendi</h3>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart
              data={cameras[0].dailyUptime.map((d, idx) => {
                const point: Record<string, string | number> = { date: d.date };
                cameras.forEach((cam) => {
                  point[cam.name.replace(' Kamerası', '')] = cam.dailyUptime[idx]?.uptime ?? 0;
                });
                return point;
              })}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" iconSize={8} />
              {cameras.map((cam, idx) => (
                <Line
                  key={cam.id}
                  type="monotone"
                  dataKey={cam.name.replace(' Kamerası', '')}
                  stroke={['#6366f1', '#3b82f6', '#f43f5e', '#22c55e', '#f59e0b', '#8b5cf6'][idx % 6]}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

      </motion.div>
    </div>
  );
};

export default CameraHealth;
