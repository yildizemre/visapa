import React, { useState, useEffect, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { HeartPulse, RefreshCw, AlertCircle, ChevronUp, ChevronDown } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { apiFetch } from '../lib/api';

interface HealthUser {
  id: number;
  username: string;
  email: string;
  full_name: string | null;
  role: string;
  is_alive: boolean;
  last_ping_at: string | null;
}

type FilterStatus = 'all' | 'active' | 'inactive';
type SortKey = 'user' | 'status' | 'lastPing';

function formatRelative(dateStr: string | null, t: (k: string) => string): string {
  if (!dateStr) return t('healthOverview.never');
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffM = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);
  if (diffM < 1) return `< 1 ${t('healthOverview.minutes')} ${t('healthOverview.ago')}`;
  if (diffM < 60) return `${diffM} ${t('healthOverview.minutes')} ${t('healthOverview.ago')}`;
  if (diffH < 24) return `${diffH} ${t('healthOverview.hours')} ${t('healthOverview.ago')}`;
  if (diffD === 1) return `1 ${t('healthOverview.days')} ${t('healthOverview.ago')}`;
  if (diffD < 7) return `${diffD} ${t('healthOverview.days')} ${t('healthOverview.ago')}`;
  return d.toLocaleString();
}

export default function AdminHealthOverview() {
  const { t } = useLanguage();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<HealthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('status');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

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

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/health/admin/overview');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      } else {
        setUsers([]);
      }
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin === true) load();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || !autoRefresh) return;
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, [isAdmin, autoRefresh]);

  const filtered = useMemo(() => {
    let list = users;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (u) =>
          (u.full_name || '').toLowerCase().includes(q) ||
          (u.username || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q)
      );
    }
    if (filterStatus === 'active') list = list.filter((u) => u.is_alive);
    if (filterStatus === 'inactive') list = list.filter((u) => !u.is_alive);
    return list;
  }, [users, search, filterStatus]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'user') {
        const na = (a.full_name || a.username || '').toLowerCase();
        const nb = (b.full_name || b.username || '').toLowerCase();
        cmp = na.localeCompare(nb);
      } else if (sortKey === 'status') {
        cmp = (a.is_alive ? 1 : 0) - (b.is_alive ? 1 : 0);
      } else {
        const ta = a.last_ping_at ? new Date(a.last_ping_at).getTime() : 0;
        const tb = b.last_ping_at ? new Date(b.last_ping_at).getTime() : 0;
        cmp = ta - tb;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const total = filtered.length;
  const activeCount = filtered.filter((u) => u.is_alive).length;
  const inactiveCount = total - activeCount;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === 'status' ? 'desc' : 'asc');
    }
  };

  const getRoleLabel = (role: string) => {
    const k = `role.${role}` as keyof typeof t;
    const out = t(k as any);
    return typeof out === 'string' && out !== k ? out : role;
  };

  const formatDate = (d: string | null) => (d ? new Date(d).toLocaleString() : '-');

  if (isAdmin === null) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[200px]">
        <div className="animate-pulse text-slate-400">{t('healthOverview.loading')}</div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
            <HeartPulse className="w-6 h-6 text-emerald-400" />
          </div>
          {t('healthOverview.title')}
        </h1>
        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-slate-600 hover:bg-slate-500 text-white flex items-center gap-2 text-sm font-medium disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {t('healthOverview.refresh')}
        </button>
      </div>

      {/* Özet sayaçlar */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="text-slate-400">
          {t('healthOverview.total')}: <strong className="text-white">{total}</strong>
        </span>
        <span className="text-slate-400">
          {t('healthOverview.activeCount')}: <strong className="text-green-400">{activeCount}</strong>
        </span>
        <span className="text-slate-400">
          {t('healthOverview.inactiveCount')}: <strong className="text-red-400">{inactiveCount}</strong>
        </span>
      </div>

      {/* Arama, filtre, otomatik yenile */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('healthOverview.searchPlaceholder')}
          className="px-3 py-2 rounded-xl bg-slate-700/60 border border-slate-600 text-white placeholder-slate-500 text-sm min-w-[200px]"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
          className="px-3 py-2 rounded-xl bg-slate-700/60 border border-slate-600 text-white text-sm"
        >
          <option value="all">{t('healthOverview.filterAll')}</option>
          <option value="active">{t('healthOverview.filterActiveOnly')}</option>
          <option value="inactive">{t('healthOverview.filterInactiveOnly')}</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="rounded border-slate-500 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
          />
          {t('healthOverview.autoRefresh')}
        </label>
      </div>

      <div className="rounded-2xl border border-slate-600/80 overflow-hidden bg-slate-800/40">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b border-slate-600/80 bg-slate-800/80">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">
                  <button
                    type="button"
                    onClick={() => toggleSort('user')}
                    className="flex items-center gap-1 hover:text-white"
                  >
                    {t('healthOverview.user')}
                    {sortKey === 'user' && (sortDir === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                  </button>
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">
                  {t('healthOverview.role')}
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">
                  <button
                    type="button"
                    onClick={() => toggleSort('status')}
                    className="flex items-center gap-1 hover:text-white"
                  >
                    {t('healthOverview.status')}
                    {sortKey === 'status' && (sortDir === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                  </button>
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">
                  <button
                    type="button"
                    onClick={() => toggleSort('lastPing')}
                    className="flex items-center gap-1 hover:text-white"
                  >
                    {t('healthOverview.lastPing')}
                    {sortKey === 'lastPing' && (sortDir === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">
                    {t('healthOverview.loading')}
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">
                    {t('healthOverview.empty')}
                  </td>
                </tr>
              ) : (
                sorted.map((u) => (
                  <tr
                    key={u.id}
                    className={`border-b border-slate-700/60 transition ${
                      !u.is_alive ? 'bg-red-500/10' : 'hover:bg-slate-700/30'
                    }`}
                  >
                    <td className="py-3 px-4">
                      <span className="font-medium text-white">
                        {u.full_name || u.username || `#${u.id}`}
                      </span>
                      {u.email && (
                        <span className="block text-xs text-slate-500 mt-0.5">{u.email}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-400">
                      {getRoleLabel(u.role)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          u.is_alive
                            ? 'bg-green-500/20 text-green-300 border border-green-500/40'
                            : 'bg-red-500/20 text-red-300 border border-red-500/40'
                        }`}
                      >
                        {u.is_alive ? (
                          <>
                            <HeartPulse className="w-3.5 h-3.5" />
                            {t('healthOverview.active')}
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3.5 h-3.5" />
                            {t('healthOverview.inactive')}
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-400" title={formatDate(u.last_ping_at)}>
                      {formatRelative(u.last_ping_at, t)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
