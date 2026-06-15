import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Camera,
  Activity,
  Zap,
  Eye,
  MonitorSmartphone,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import InsightsPanel from './shared/InsightsPanel';

interface CameraInfo {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'warning';
  uptime: number;
  lastPing: string;
  avgFps: number;
  resolution: string;
  disconnections: number;
  weeklyUptime: number[];
}

const CAMERAS: CameraInfo[] = [
  { id: 'cam-01', name: 'Giriş', location: 'Ana Giriş', status: 'online', uptime: 99.8, lastPing: new Date(Date.now() - 4000).toISOString(), avgFps: 30, resolution: '1080p', disconnections: 0, weeklyUptime: [100, 100, 99.8, 100, 99.9, 100, 100] },
  { id: 'cam-02', name: 'Kasa', location: 'Kasa Bölgesi', status: 'online', uptime: 99.5, lastPing: new Date(Date.now() - 5000).toISOString(), avgFps: 30, resolution: '1080p', disconnections: 1, weeklyUptime: [99.5, 100, 100, 99.8, 100, 99.5, 100] },
  { id: 'cam-03', name: 'Depo', location: 'Arka Depo', status: 'online', uptime: 99.1, lastPing: new Date(Date.now() - 6000).toISOString(), avgFps: 28, resolution: '1080p', disconnections: 0, weeklyUptime: [99.0, 99.5, 100, 99.2, 99.8, 99.1, 100] },
  { id: 'cam-04', name: 'Kadın Giyim', location: 'Kadın Giyim', status: 'online', uptime: 100, lastPing: new Date(Date.now() - 3000).toISOString(), avgFps: 30, resolution: '1440p', disconnections: 0, weeklyUptime: [100, 100, 100, 100, 100, 100, 100] },
  { id: 'cam-05', name: 'Erkek Giyim', location: 'Erkek Giyim', status: 'online', uptime: 99.6, lastPing: new Date(Date.now() - 7000).toISOString(), avgFps: 29, resolution: '1080p', disconnections: 0, weeklyUptime: [99.5, 100, 99.8, 99.6, 100, 99.7, 100] },
  { id: 'cam-06', name: 'Kozmetik', location: 'Kozmetik', status: 'online', uptime: 99.7, lastPing: new Date(Date.now() - 5000).toISOString(), avgFps: 30, resolution: '1080p', disconnections: 0, weeklyUptime: [100, 99.5, 99.9, 100, 99.7, 100, 99.8] },
];

const STATUS_STYLES = {
  online: { label: 'Aktif', dot: 'bg-emerald-400', ring: 'ring-emerald-400/30', text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  offline: { label: 'Kapalı', dot: 'bg-rose-400', ring: 'ring-rose-400/30', text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' },
  warning: { label: 'Uyarı', dot: 'bg-amber-400', ring: 'ring-amber-400/30', text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
};

const tooltipStyle = { backgroundColor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '10px', padding: '8px 12px' };

const CameraHealth = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const total = CAMERAS.length;
    const online = CAMERAS.filter(c => c.status === 'online').length;
    const offline = CAMERAS.filter(c => c.status === 'offline').length;
    const warning = CAMERAS.filter(c => c.status === 'warning').length;
    const avgUptime = CAMERAS.reduce((s, c) => s + c.uptime, 0) / total;
    return { total, online, offline, warning, avgUptime };
  }, []);

  const selected = selectedId ? CAMERAS.find(c => c.id === selectedId) : null;

  const uptimeBarData = CAMERAS.map(c => ({ name: c.name, uptime: c.uptime, kopma: c.disconnections }));

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
  const item = { hidden: { y: 12, opacity: 0 }, show: { y: 0, opacity: 1 } };

  const getUptimeColor = (u: number) => u >= 98 ? 'bg-emerald-500' : u >= 90 ? 'bg-amber-500' : 'bg-rose-500';
  const getUptimeTextColor = (u: number) => u >= 98 ? 'text-emerald-400' : u >= 90 ? 'text-amber-400' : 'text-rose-400';

  const getPingLabel = (lastPing: string) => {
    const s = Math.round((Date.now() - new Date(lastPing).getTime()) / 1000);
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}dk`;
    return `${Math.floor(s / 3600)}sa`;
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8">
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 sm:space-y-6">

        {/* Header */}
        <motion.div variants={item}>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white">Kamera Sağlığı</h1>
              <p className="text-xs text-slate-500">Gerçek zamanlı durum ve performans izleme</p>
            </div>
          </div>
        </motion.div>

        {/* Status Summary - Big colored pills */}
        <motion.div variants={item} className="flex flex-wrap gap-2 sm:gap-3">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-bold text-emerald-300">{stats.online} Aktif</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-rose-500/15 border border-rose-500/30">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            <span className="text-sm font-bold text-rose-300">{stats.offline} Kapalı</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-amber-500/15 border border-amber-500/30">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="text-sm font-bold text-amber-300">{stats.warning} Uyarı</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-violet-500/15 border border-violet-500/30">
            <Activity className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-bold text-violet-300">%{stats.avgUptime.toFixed(1)} Uptime</span>
          </div>
        </motion.div>

        {/* Insights */}
        <motion.div variants={item}>
          <InsightsPanel module="camera_health" />
        </motion.div>

        {/* Camera List */}
        <motion.div variants={item} className="space-y-3">
          {CAMERAS.map((cam) => {
            const style = STATUS_STYLES[cam.status];
            const isActive = selectedId === cam.id;

            return (
              <motion.button
                key={cam.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedId(isActive ? null : cam.id)}
                className={`w-full text-left rounded-2xl border p-4 sm:p-5 transition-all duration-200 ${
                  isActive
                    ? 'border-cyan-500/50 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 shadow-lg shadow-cyan-500/5'
                    : 'border-slate-700/40 bg-slate-800/40 hover:bg-slate-800/70 hover:border-slate-600/50'
                }`}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  {/* Status dot with ring */}
                  <div className={`relative shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${style.bg} border ${style.border} flex items-center justify-center`}>
                    <Camera className={`w-5 h-5 sm:w-6 sm:h-6 ${style.text}`} />
                    <div className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full ${style.dot} ring-4 ${style.ring}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="text-sm sm:text-base font-bold text-white truncate">{cam.name}</h4>
                      <span className={`text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full ${style.bg} ${style.text} border ${style.border}`}>
                        {style.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{cam.location} · {cam.resolution}</p>
                  </div>

                  {/* Quick stats */}
                  <div className="hidden sm:flex items-center gap-4 shrink-0">
                    <div className="text-center">
                      <p className={`text-lg font-extrabold ${getUptimeTextColor(cam.uptime)}`}>%{cam.uptime.toFixed(0)}</p>
                      <p className="text-[9px] text-slate-500 uppercase">Uptime</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-extrabold text-blue-300">{cam.avgFps || '-'}</p>
                      <p className="text-[9px] text-slate-500 uppercase">FPS</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-extrabold text-slate-200">{cam.disconnections}</p>
                      <p className="text-[9px] text-slate-500 uppercase">Kopma</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-slate-400">{getPingLabel(cam.lastPing)}</p>
                      <p className="text-[9px] text-slate-500 uppercase">Son Ping</p>
                    </div>
                  </div>
                </div>

                {/* Mobile stats row */}
                <div className="flex sm:hidden items-center gap-3 mt-3 pt-3 border-t border-slate-700/30">
                  <div className="flex-1 text-center">
                    <p className={`text-base font-bold ${getUptimeTextColor(cam.uptime)}`}>%{cam.uptime.toFixed(0)}</p>
                    <p className="text-[8px] text-slate-500 uppercase">Uptime</p>
                  </div>
                  <div className="flex-1 text-center">
                    <p className="text-base font-bold text-blue-300">{cam.avgFps || '-'}</p>
                    <p className="text-[8px] text-slate-500 uppercase">FPS</p>
                  </div>
                  <div className="flex-1 text-center">
                    <p className="text-base font-bold text-slate-200">{cam.disconnections}</p>
                    <p className="text-[8px] text-slate-500 uppercase">Kopma</p>
                  </div>
                  <div className="flex-1 text-center">
                    <p className="text-sm font-bold text-slate-400">{getPingLabel(cam.lastPing)}</p>
                    <p className="text-[8px] text-slate-500 uppercase">Ping</p>
                  </div>
                </div>

                {/* Uptime progress bar */}
                <div className="mt-3 h-1.5 rounded-full bg-slate-700/50 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${getUptimeColor(cam.uptime)}`}
                    style={{ width: `${cam.uptime}%` }}
                  />
                </div>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Selected Detail */}
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-slate-800/90 to-slate-900/90 p-5 sm:p-6 overflow-hidden min-w-0"
          >
            <div className="flex items-center gap-3 mb-5">
              <Eye className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base font-bold text-white">{selected.name} — Haftalık Performans</h3>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={selected.weeklyUptime.map((u, i) => ({ day: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'][i], uptime: u }))}>
                <defs>
                  <linearGradient id="uptimeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`%${v.toFixed(1)}`, 'Uptime']} />
                <Area type="monotone" dataKey="uptime" stroke="#22c55e" strokeWidth={2.5} fill="url(#uptimeGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Overall Chart */}
        <motion.div variants={item} className="rounded-2xl border border-slate-700/40 bg-slate-800/40 p-5 sm:p-6 overflow-hidden min-w-0">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Kamera Bazlı Uptime & Kopma</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={uptimeBarData} barCategoryGap="25%">
              <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="uptime" name="Uptime %" fill="#22c55e" radius={[6, 6, 0, 0]} />
              <Bar dataKey="kopma" name="Kopma" fill="#f43f5e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Info Banner */}
        <motion.div variants={item}>
          <div className="flex items-start gap-3 rounded-2xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 p-4 sm:p-5">
            <MonitorSmartphone className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-300">Demo Veriler</p>
              <p className="text-xs text-blue-200/60 mt-0.5">Bu sayfa örnek verilerle doldurulmuştur. Gerçek kamera heartbeat verileri otomatik olarak güncellenecektir.</p>
            </div>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
};

export default CameraHealth;
