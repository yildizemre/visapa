import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { FileText, Filter, RefreshCw } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { apiFetch } from '../lib/api';

interface LogEntry {
  id: number;
  user_id: number | null;
  type: string;
  ip: string | null;
  user_agent: string | null;
  method: string | null;
  path: string | null;
  extra: Record<string, unknown> | null;
  created_at: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  login_ok: 'Giriş başarılı',
  login_fail: 'Giriş başarısız',
  logout: 'Çıkış',
  page_view: 'Sayfa görüntüleme',
  chat_message: 'Sohbet mesajı',
  error: 'Hata',
};

const ActivityLogs: React.FC = () => {
  const { t } = useLanguage();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const perPage = 30;
  const [userIdFilter, setUserIdFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsAdmin(false);
      return;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setIsAdmin(payload.role === 'admin');
    } catch {
      setIsAdmin(false);
    }
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('per_page', String(perPage));
      if (userIdFilter.trim()) params.set('user_id', userIdFilter.trim());
      if (typeFilter.trim()) params.set('type', typeFilter.trim());
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      const res = await apiFetch(`/api/admin/activity-logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.total ?? 0);
      }
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin === true) fetchLogs();
  }, [isAdmin, page, userIdFilter, typeFilter, dateFrom, dateTo]);

  if (isAdmin === null) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[200px]">
        <div className="animate-pulse text-slate-400">Yükleniyor...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-400" />
          Aktivite Logları
        </h1>
        <button
          type="button"
          onClick={() => fetchLogs()}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Yenile
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <input
          type="number"
          placeholder="User ID"
          value={userIdFilter}
          onChange={(e) => { setUserIdFilter(e.target.value); setPage(1); }}
          className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
        />
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
        >
          <option value="">Tüm tipler</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
        />
      </div>

      {loading ? (
        <div className="text-slate-400 py-8 text-center">Yükleniyor...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700/50 bg-slate-800/30">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-left text-slate-300">
                <th className="p-3">Tarih</th>
                <th className="p-3">Tip</th>
                <th className="p-3">User ID</th>
                <th className="p-3">IP</th>
                <th className="p-3">Route / Açıklama</th>
                <th className="p-3">Cihaz (UA)</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                  <td className="p-3 text-slate-400 whitespace-nowrap">
                    {log.created_at ? new Date(log.created_at).toLocaleString('tr-TR') : '—'}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-600 text-white">
                      {TYPE_LABELS[log.type] || log.type}
                    </span>
                  </td>
                  <td className="p-3 text-slate-300">{log.user_id ?? '—'}</td>
                  <td className="p-3 text-slate-400 font-mono text-xs">{log.ip || '—'}</td>
                  <td className="p-3 text-slate-300 max-w-xs truncate">
                    {(log.extra as any)?.route || log.path || (log.extra ? JSON.stringify(log.extra).slice(0, 80) : '—')}
                  </td>
                  <td className="p-3 text-slate-500 text-xs max-w-[200px] truncate" title={log.user_agent || ''}>
                    {log.user_agent || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 0 && (
            <div className="p-8 text-center text-slate-500">Kayıt yok.</div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-slate-400 text-sm">
        <span>Toplam {total} kayıt</span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 rounded bg-slate-700 disabled:opacity-50"
          >
            Önceki
          </button>
          <span className="px-2">Sayfa {page} / {totalPages}</span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 rounded bg-slate-700 disabled:opacity-50"
          >
            Sonraki
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActivityLogs;
