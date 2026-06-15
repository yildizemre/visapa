import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, AlertTriangle, Loader, CheckCircle, XCircle } from 'lucide-react';
import { apiUrl } from '../lib/api';

interface StoreStatus {
  id: number;
  username: string;
  full_name: string | null;
  is_alive: boolean;
  last_ping_at: string | null;
  received_pings?: number;
  expected_pings?: number;
  ratio?: string;
}

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

const ServiceHeartbeatIndicator: React.FC = () => {
  const role = getRole();
  const isAdmin = role === 'admin';

  // Admin: list of all stores; User: own status
  const [stores, setStores] = useState<StoreStatus[]>([]);
  const [ownAlive, setOwnAlive] = useState<boolean | null>(null);
  const [ownMessage, setOwnMessage] = useState('');
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
          setOwnAlive(data.is_alive);
          setOwnMessage(data.message || '');
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

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const deadCount = isAdmin ? stores.filter(s => !s.is_alive).length : 0;
  const aliveCount = isAdmin ? stores.filter(s => s.is_alive).length : 0;
  const hasDead = isAdmin ? deadCount > 0 : ownAlive === false;

  const buttonStyle = loading
    ? 'bg-slate-500/10 border-slate-500/30 text-slate-400'
    : hasDead
    ? 'bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20'
    : 'bg-green-500/10 border-green-500/30 text-green-300 hover:bg-green-500/20';

  const dotStyle = loading
    ? 'bg-slate-400'
    : hasDead
    ? 'bg-red-400 animate-pulse'
    : 'bg-green-400';

  const deadStores = stores.filter(s => !s.is_alive);
  const aliveStores = stores.filter(s => s.is_alive);

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
        {loading
          ? <Loader className="w-4 h-4 animate-spin" />
          : hasDead
          ? <AlertTriangle className="w-4 h-4" />
          : <Zap className="w-4 h-4" />}
        <span className="font-medium hidden sm:inline">Mağaza AI</span>
        {isAdmin && !loading && (
          <span className="hidden sm:inline text-xs opacity-70">
            {aliveCount > 0 && `${aliveCount}✓`}{deadCount > 0 && ` ${deadCount}✗`}
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
            style={{ width: isAdmin ? 440 : 340 }}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-semibold text-white">Mağaza AI Servis Durumu</span>
              </div>
              {isAdmin && !loading && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-green-400 font-medium">{aliveCount} aktif</span>
                  {deadCount > 0 && <span className="text-red-400 font-medium">{deadCount} kapalı</span>}
                </div>
              )}
            </div>

            {/* Body */}
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-6 gap-2 text-slate-400 text-sm">
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Kontrol ediliyor…</span>
                </div>
              ) : isAdmin ? (
                <>
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
                            
                            {/* Modüller */}
                            <div className="flex gap-1.5 mt-2 pt-2 border-t border-slate-700/30 overflow-x-auto scrollbar-none">
                              {[
                                { name: 'Kişi Sayım', key: 'counting' },
                                { name: 'Isı Haritası', key: 'heatmap' },
                                { name: 'Kasa Analizi', key: 'queue' },
                                { name: 'Kamera Sağlığı', key: 'camera' }
                              ].map((m) => (
                                <span
                                  key={m.key}
                                  className="inline-flex items-center text-[9px] px-1.5 py-0.5 rounded-md font-medium gap-1 bg-red-500/5 text-red-400 border border-red-500/10"
                                >
                                  <span className="w-1 h-1 rounded-full bg-red-500" />
                                  {m.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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

                            {/* Modüller */}
                            <div className="flex gap-1.5 mt-2 pt-2 border-t border-slate-700/30 overflow-x-auto scrollbar-none">
                              {[
                                { name: 'Kişi Sayım', key: 'counting' },
                                { name: 'Isı Haritası', key: 'heatmap' },
                                { name: 'Kasa Analizi', key: 'queue' },
                                { name: 'Kamera Sağlığı', key: 'camera' }
                              ].map((m) => (
                                <span
                                  key={m.key}
                                  className="inline-flex items-center text-[9px] px-1.5 py-0.5 rounded-md font-medium gap-1 bg-green-500/5 text-green-400 border border-green-500/10"
                                >
                                  <span className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />
                                  {m.name}
                                </span>
                              ))}
                            </div>
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
                <div className="px-4 py-4 space-y-4">
                  <div className={`flex items-center gap-3 rounded-xl px-3.5 py-3 border ${ownAlive ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                    {ownAlive
                      ? <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                      : <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
                    <p className={`text-sm leading-relaxed ${ownAlive ? 'text-green-300' : 'text-red-300'}`}>{ownMessage || (ownAlive ? 'Servis ayakta' : 'Sinyal alınamıyor')}</p>
                  </div>

                  {/* Modüller Listesi */}
                  <div className="border-t border-slate-700/50 pt-3 space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Aktif Modüller</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { name: 'Kişi Sayım', key: 'counting' },
                        { name: 'Isı Haritası', key: 'heatmap' },
                        { name: 'Kasa Analizi', key: 'queue' },
                        { name: 'Kamera Sağlığı', key: 'camera' }
                      ].map((m) => (
                        <div key={m.key} className="flex items-center gap-2 bg-slate-800/40 p-2 rounded-lg border border-slate-700/30">
                          <span className={`w-2 h-2 rounded-full ${ownAlive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                          <span className="text-[11px] text-slate-300 font-medium">{m.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-slate-700 bg-slate-800/60">
              <p className="text-xs text-slate-500">Her 30 sn güncellenir • Son 1 saat içinde sinyal gelmezse kapalı</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ServiceHeartbeatIndicator;
