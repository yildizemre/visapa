import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, AlertTriangle, Loader, CheckCircle, XCircle } from 'lucide-react';
import { apiUrl } from '../lib/api';

interface ModuleStatus {
  alive: boolean;
  last_ping_at: string | null;
}

interface StoreStatus {
  id: number;
  username: string;
  full_name: string | null;
  is_alive: boolean;
  overall: 'alive' | 'partial' | 'dead';
  last_ping_at: string | null;
  received_pings?: number;
  expected_pings?: number;
  ratio?: string;
  modules?: Record<string, ModuleStatus>;
}

interface OwnStatus {
  is_alive: boolean;
  overall: 'alive' | 'partial' | 'dead';
  last_ping_at: string | null;
  modules: Record<string, ModuleStatus>;
  message: string;
}

const MODULE_LABELS: Record<string, string> = {
  counting: 'Kişi Sayım',
  heatmap: 'Isı Haritası',
  queue: 'Kasa Analizi',
  camera: 'Kamera',
};

function getRole(): string {
  try {
    const u = localStorage.getItem('user');
    if (u) return JSON.parse(u).role || 'user';
  } catch { /* ignore */ }
  return 'user';
}

function formatPing(iso: string | null): string {
  if (!iso) return 'Hiç sinyal gelmedi';
  const d = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1) return 'Az önce';
  if (diffMin < 60) return `${diffMin} dk önce`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return `${h} sa önce`;
  return `${Math.floor(h / 24)} gün önce`;
}

function ModuleBadges({ modules, overall }: { modules?: Record<string, ModuleStatus>; overall: string }) {
  if (!modules) {
    // Modül verisi yoksa hepsini overall'a göre göster
    return (
      <div className="flex gap-1.5 mt-2 pt-2 border-t border-slate-700/30 overflow-x-auto scrollbar-none">
        {Object.entries(MODULE_LABELS).map(([key, label]) => (
          <span
            key={key}
            className={`inline-flex items-center text-[9px] px-1.5 py-0.5 rounded-md font-medium gap-1 ${
              overall === 'dead'
                ? 'bg-red-500/5 text-red-400 border border-red-500/10'
                : 'bg-green-500/5 text-green-400 border border-green-500/10'
            }`}
          >
            <span className={`w-1 h-1 rounded-full ${overall === 'dead' ? 'bg-red-500' : 'bg-green-400 animate-pulse'}`} />
            {label}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-1.5 mt-2 pt-2 border-t border-slate-700/30 overflow-x-auto scrollbar-none">
      {Object.entries(MODULE_LABELS).map(([key, label]) => {
        const mod = modules[key];
        const alive = mod?.alive ?? false;
        return (
          <span
            key={key}
            className={`inline-flex items-center text-[9px] px-1.5 py-0.5 rounded-md font-medium gap-1 ${
              alive
                ? 'bg-green-500/5 text-green-400 border border-green-500/10'
                : 'bg-red-500/5 text-red-400 border border-red-500/10'
            }`}
          >
            <span className={`w-1 h-1 rounded-full ${alive ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`} />
            {label}
          </span>
        );
      })}
    </div>
  );
}

const ServiceHeartbeatIndicator: React.FC = () => {
  const role = getRole();
  const isAdmin = role === 'admin';

  const [stores, setStores] = useState<StoreStatus[]>([]);
  const [ownStatus, setOwnStatus] = useState<OwnStatus | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('token')?.trim();
    if (!token) { setLoading(false); return; }

    if (isAdmin) {
      try {
        const res = await fetch(apiUrl('/api/health/admin/overview'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setStores(data.users || []);
        }
      } catch { /* ignore */ }
    } else {
      try {
        const res = await fetch(apiUrl('/api/health/heartbeat/status'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setOwnStatus(data);
        }
      } catch { /* ignore */ }
    }
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 30000);
    return () => clearInterval(iv);
  }, [fetchData]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Genel durum hesapla
  const adminOverall = isAdmin
    ? stores.some(s => s.overall === 'dead') && stores.some(s => s.overall !== 'dead')
      ? 'partial'
      : stores.every(s => s.overall === 'dead')
      ? 'dead'
      : stores.some(s => s.overall === 'partial')
      ? 'partial'
      : stores.length > 0 ? 'alive' : 'dead'
    : null;

  const overall = isAdmin ? adminOverall : (ownStatus?.overall === 'alive' || ownStatus?.overall === 'partial') ? ownStatus.overall : 'alive';

  const deadCount = isAdmin ? stores.filter(s => s.overall === 'dead').length : 0;
  const partialCount = isAdmin ? stores.filter(s => s.overall === 'partial').length : 0;
  const aliveCount = isAdmin ? stores.filter(s => s.overall === 'alive').length : 0;

  const buttonStyle = loading
    ? 'bg-slate-500/10 border-slate-500/30 text-slate-400'
    : overall === 'alive'
    ? 'bg-green-500/10 border-green-500/30 text-green-300 hover:bg-green-500/20'
    : overall === 'partial'
    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
    : 'bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20';

  const dotStyle = loading
    ? 'bg-slate-400'
    : overall === 'alive'
    ? 'bg-green-400 animate-pulse'
    : overall === 'partial'
    ? 'bg-amber-400 animate-pulse'
    : 'bg-red-400 animate-pulse';

  const btnIcon = loading
    ? <Loader className="w-4 h-4 animate-spin" />
    : overall === 'alive'
    ? <Zap className="w-4 h-4" />
    : <AlertTriangle className="w-4 h-4" />;

  const deadStores = stores.filter(s => s.overall === 'dead');
  const partialStores = stores.filter(s => s.overall === 'partial');
  const aliveStores = stores.filter(s => s.overall === 'alive');

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <motion.button
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`flex items-center space-x-1.5 sm:space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border backdrop-blur-sm transition-all text-xs sm:text-sm ${buttonStyle}`}
      >
        {btnIcon}
        <span className="font-medium hidden sm:inline">Mağaza AI</span>
        {isAdmin && !loading && (
          <span className="hidden sm:inline text-xs opacity-70">
            {aliveCount > 0 && `${aliveCount}✓`}
            {partialCount > 0 && ` ${partialCount}⚠`}
            {deadCount > 0 && ` ${deadCount}✗`}
          </span>
        )}
        <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${dotStyle}`} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="absolute bottom-full right-0 mb-2 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden z-50"
            style={{ width: isAdmin ? 460 : 340 }}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-semibold text-white">Mağaza AI Servis Durumu</span>
              </div>
              {isAdmin && !loading && (
                <div className="flex items-center gap-2 text-xs">
                  {aliveCount > 0 && <span className="text-green-400 font-medium">{aliveCount} aktif</span>}
                  {partialCount > 0 && <span className="text-amber-400 font-medium">{partialCount} kısmi</span>}
                  {deadCount > 0 && <span className="text-red-400 font-medium">{deadCount} kapalı</span>}
                </div>
              )}
            </div>

            {/* Body */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-6 gap-2 text-slate-400 text-sm">
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Kontrol ediliyor…</span>
                </div>
              ) : isAdmin ? (
                <>
                  {/* DEAD */}
                  {deadStores.length > 0 && (
                    <div className="px-3 pt-3 pb-1">
                      <p className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-2">Sinyal Alınamayan</p>
                      <div className="space-y-2">
                        {deadStores.map(s => (
                          <div key={s.id} className="flex flex-col bg-red-500/10 rounded-xl px-3 py-2.5 border border-red-500/20">
                            <div className="flex items-center justify-between min-w-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                                <span className="text-sm font-medium text-white truncate">{s.full_name || s.username}</span>
                              </div>
                              <div className="flex flex-col items-end flex-shrink-0 ml-2">
                                <span className="text-[11px] text-red-300">{formatPing(s.last_ping_at)}</span>
                                {s.ratio && <span className="text-[10px] text-red-400 font-mono font-bold mt-0.5">{s.ratio}</span>}
                              </div>
                            </div>
                            <ModuleBadges modules={s.modules} overall="dead" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* PARTIAL */}
                  {partialStores.length > 0 && (
                    <div className="px-3 pt-3 pb-1">
                      <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-2">Kısmi Sinyal</p>
                      <div className="space-y-2">
                        {partialStores.map(s => (
                          <div key={s.id} className="flex flex-col bg-amber-500/10 rounded-xl px-3 py-2.5 border border-amber-500/20">
                            <div className="flex items-center justify-between min-w-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                                <span className="text-sm font-medium text-white truncate">{s.full_name || s.username}</span>
                              </div>
                              <div className="flex flex-col items-end flex-shrink-0 ml-2">
                                <span className="text-[11px] text-amber-300">{formatPing(s.last_ping_at)}</span>
                                {s.ratio && <span className="text-[10px] text-amber-400 font-mono font-bold mt-0.5">{s.ratio}</span>}
                              </div>
                            </div>
                            <ModuleBadges modules={s.modules} overall="partial" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ALIVE */}
                  {aliveStores.length > 0 && (
                    <div className="px-3 pt-3 pb-3">
                      <p className="text-xs font-semibold text-green-400 uppercase tracking-wide mb-2">Aktif Mağazalar</p>
                      <div className="space-y-2">
                        {aliveStores.map(s => (
                          <div key={s.id} className="flex flex-col bg-green-500/10 rounded-xl px-3 py-2.5 border border-green-500/20">
                            <div className="flex items-center justify-between min-w-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                                <span className="text-sm font-medium text-white truncate">{s.full_name || s.username}</span>
                              </div>
                              <div className="flex flex-col items-end flex-shrink-0 ml-2">
                                <span className="text-[11px] text-green-300">{formatPing(s.last_ping_at)}</span>
                                {s.ratio && <span className="text-[10px] text-green-400 font-mono font-bold mt-0.5">{s.ratio}</span>}
                              </div>
                            </div>
                            <ModuleBadges modules={s.modules} overall="alive" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {stores.length === 0 && (
                    <p className="text-center text-slate-400 text-sm py-6">Henüz kayıtlı mağaza yok</p>
                  )}
                </>
              ) : (
                /* Non-admin: kendi durumu */
                <div className="px-4 py-4 space-y-4">
                  <div className={`flex items-start gap-3 rounded-xl px-3.5 py-3 border ${
                    ownStatus?.overall === 'alive'
                      ? 'bg-green-500/10 border-green-500/20'
                      : ownStatus?.overall === 'partial'
                      ? 'bg-amber-500/10 border-amber-500/20'
                      : 'bg-red-500/10 border-red-500/20'
                  }`}>
                    {ownStatus?.overall === 'alive'
                      ? <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      : ownStatus?.overall === 'partial'
                      ? <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                      : <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />}
                    <p className={`text-sm leading-relaxed ${
                      ownStatus?.overall === 'alive'
                        ? 'text-green-300'
                        : ownStatus?.overall === 'partial'
                        ? 'text-amber-300'
                        : 'text-red-300'
                    }`}>
                      {ownStatus?.message || (ownStatus?.is_alive ? 'Servis ayakta' : 'Sinyal alınamıyor')}
                    </p>
                  </div>

                  {/* Modül bazlı durum */}
                  <div className="border-t border-slate-700/50 pt-3 space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Modül Durumları</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(MODULE_LABELS).map(([key, label]) => {
                        const mod = ownStatus?.modules?.[key];
                        const alive = mod?.alive ?? false;
                        return (
                          <div key={key} className={`flex items-center gap-2 p-2 rounded-lg border ${
                            alive
                              ? 'bg-green-500/10 border-green-500/20'
                              : 'bg-red-500/10 border-red-500/20'
                          }`}>
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${alive ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`} />
                            <div className="min-w-0">
                              <p className={`text-[11px] font-medium ${alive ? 'text-green-300' : 'text-red-300'}`}>{label}</p>
                              {mod?.last_ping_at && (
                                <p className="text-[9px] text-slate-500 truncate">{formatPing(mod.last_ping_at)}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-slate-700 bg-slate-800/60">
              <p className="text-xs text-slate-500">Her 30 sn güncellenir • 30 dk içinde sinyal gelmezse modül kapalı sayılır</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ServiceHeartbeatIndicator;
