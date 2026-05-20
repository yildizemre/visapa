import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Headphones, Search, Send, XCircle, ArrowLeft, User, Clock, Globe, Monitor, FilterX } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { apiFetch } from '../lib/api';

const CATEGORIES = ['teknik', 'fatura', 'genel', 'diger'] as const;
const PRIORITIES = ['acil', 'yuksek', 'normal', 'dusuk'] as const;
const STATUSES = ['open', 'answered', 'closed'] as const;

interface TicketReply {
  id: number;
  message: string;
  author_name: string;
  is_staff: boolean;
  created_at: string | null;
}

interface TicketItem {
  id: number;
  subject: string;
  category: string;
  priority: string;
  status: string;
  message: string;
  unread?: boolean;
  created_at: string | null;
  updated_at: string | null;
  closed_at?: string | null;
  closed_by?: string | null;
  closed_by_role?: string | null;
  created_ip?: string | null;
  created_user_agent?: string | null;
  replies?: TicketReply[];
  user?: { username?: string; email?: string; full_name?: string };
}

interface TicketUser {
  id: number;
  full_name?: string;
  username?: string;
  email?: string;
}

export default function AdminTickets() {
  const { t } = useLanguage();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterUserId, setFilterUserId] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [ticketUsers, setTicketUsers] = useState<TicketUser[]>([]);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<TicketItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

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

  const loadList = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      if (filterStatus) params.set('status', filterStatus);
      if (filterPriority) params.set('priority', filterPriority);
      if (filterCategory) params.set('category', filterCategory);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      if (filterUserId) params.set('user_id', filterUserId);
      if (unreadOnly) params.set('unread', 'true');
      const res = await apiFetch(`/api/tickets?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      }
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin === true) loadList();
  }, [isAdmin, search, filterStatus, filterPriority, filterCategory, dateFrom, dateTo, filterUserId, unreadOnly]);

  useEffect(() => {
    if (!isAdmin) return;
    apiFetch('/api/tickets/users').then((r) => r.ok && r.json()).then((data) => {
      setTicketUsers(data?.users || []);
    }).catch(() => setTicketUsers([]));
  }, [isAdmin]);

  const loadDetail = async (id: number) => {
    setSelectedId(id);
    setDetail(null);
    setDetailLoading(true);
    setReplyText('');
    try {
      const res = await apiFetch(`/api/tickets/${id}`);
      if (res.ok) {
        const data = await res.json();
        setDetail(data);
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !replyText.trim()) return;
    setSending(true);
    try {
      const res = await apiFetch(`/api/tickets/${selectedId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyText.trim() }),
      });
      if (res.ok) {
        setReplyText('');
        loadDetail(selectedId);
        loadList();
      }
    } finally {
      setSending(false);
    }
  };

  const handleClose = async () => {
    if (!selectedId || !detail) return;
    try {
      const res = await apiFetch(`/api/tickets/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      });
      if (res.ok) {
        loadDetail(selectedId);
        loadList();
      }
    } catch {}
  };

  const labelCategory = (c: string) => t(`ticket.category.${c}` as keyof typeof t) || c;
  const labelPriority = (p: string) => t(`ticket.priority.${p}` as keyof typeof t) || p;
  const labelStatus = (s: string) => t(`ticket.status.${s}` as keyof typeof t) || s;
  const formatDate = (d: string | null) => (d ? new Date(d).toLocaleString() : '-');

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

  if (detail !== null && selectedId) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
        <button
          type="button"
          onClick={() => { setDetail(null); setSelectedId(null); }}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('ticket.back')}
        </button>

        {/* Talep bilgisi: kullanıcı, saat, IP, tarayıcı */}
        <div className="rounded-2xl bg-slate-800/80 border border-slate-600/80 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {detail.user && (
            <div className="flex items-center gap-2 text-slate-300">
              <User className="w-4 h-4 text-slate-500 shrink-0" />
              <span>
                {t('ticket.admin.user')}: <strong className="text-white">{detail.user.full_name || detail.user.username || detail.user.email || '-'}</strong>
                {detail.user.email && detail.user.username !== detail.user.email && (
                  <span className="text-slate-500 ml-1">({detail.user.email})</span>
                )}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 text-slate-300">
            <Clock className="w-4 h-4 text-slate-500 shrink-0" />
            <span>{t('ticket.createdAt')}: <strong className="text-white">{formatDate(detail.created_at)}</strong></span>
          </div>
          {detail.created_ip != null && detail.created_ip !== '' && (
            <div className="flex items-center gap-2 text-slate-300">
              <Globe className="w-4 h-4 text-slate-500 shrink-0" />
              <span>{t('ticket.admin.ip')}: <code className="text-amber-300/90 bg-slate-900/60 px-1.5 py-0.5 rounded">{detail.created_ip}</code></span>
            </div>
          )}
          {detail.created_user_agent != null && detail.created_user_agent !== '' && (
            <div className="flex items-start gap-2 text-slate-300 sm:col-span-2">
              <Monitor className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <span className="break-all text-xs">{t('ticket.admin.userAgent')}: {detail.created_user_agent}</span>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-slate-800/80 border border-slate-600/80 shadow-xl p-5 backdrop-blur-sm">
          <h2 className="text-xl font-semibold text-white">{detail.subject}</h2>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-600/60 text-slate-200">
              {labelCategory(detail.category)}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-600/60 text-slate-200">
              {labelPriority(detail.priority)}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium text-white bg-slate-500/80">
              {labelStatus(detail.status)}
            </span>
          </div>
          {detail.status === 'closed' && (detail.closed_at || detail.closed_by) && (
            <p className="mt-2 text-sm text-slate-500">
              {detail.closed_by_role === 'admin'
                ? t('ticket.closedByAdmin')
                : t('ticket.closedByUser')}
              {detail.closed_by && <span className="ml-1">({detail.closed_by})</span>}
              {detail.closed_at && <span className="ml-2">{formatDate(detail.closed_at)}</span>}
            </p>
          )}
          <p className="mt-4 text-slate-300 whitespace-pre-wrap leading-relaxed">{detail.message}</p>
        </div>
        {(detail.replies || []).map((r) => (
          <div
            key={r.id}
            className={`rounded-2xl border p-4 shadow-lg ${
              r.is_staff ? 'bg-blue-900/30 border-blue-500/50 ml-4 md:ml-8' : 'bg-slate-800/60 border-slate-600/80'
            }`}
          >
            <div className="flex justify-between text-sm">
              <span className="font-medium text-white">{r.author_name}</span>
              <span className="text-slate-500 text-xs">{formatDate(r.created_at)}</span>
            </div>
            <p className="mt-2 text-slate-300 whitespace-pre-wrap text-sm leading-relaxed">{r.message}</p>
          </div>
        ))}
        {detail.status !== 'closed' && (
          <div className="flex flex-col gap-3">
            <form onSubmit={handleReply} className="flex flex-col sm:flex-row gap-3">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={t('ticket.admin.replyPlaceholder')}
                className="flex-1 min-h-[88px] rounded-xl bg-slate-800/80 border border-slate-600 text-white placeholder-slate-500 p-3 text-sm focus:ring-2 focus:ring-blue-500/50"
                rows={3}
              />
              <div className="flex gap-2 self-end sm:self-auto">
                <button
                  type="submit"
                  disabled={sending || !replyText.trim()}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 flex items-center gap-2 font-medium shadow-lg"
                >
                  <Send className="w-4 h-4" />
                  {t('ticket.sendReply')}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-2.5 rounded-xl bg-red-600/80 hover:bg-red-500 text-white flex items-center gap-2 font-medium"
                >
                  <XCircle className="w-4 h-4" />
                  {t('ticket.admin.closeTicket')}
                </button>
              </div>
            </form>
          </div>
        )}
        {detail.status === 'closed' && (
          <p className="text-slate-500 text-sm rounded-xl bg-slate-800/40 px-4 py-2">{t('ticket.status.closed')}</p>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-500/30">
          <Headphones className="w-6 h-6 text-blue-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">{t('ticket.admin.title')}</h1>
      </div>

      <div className="rounded-2xl bg-slate-800/60 border border-slate-600/80 p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('ticket.admin.search')}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900/80 border border-slate-600 text-white placeholder-slate-500 text-sm"
            />
          </div>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-xl bg-slate-900/80 border border-slate-600 text-white px-3 py-2.5 text-sm"
            title={t('ticket.admin.dateFrom')}
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-xl bg-slate-900/80 border border-slate-600 text-white px-3 py-2.5 text-sm"
            title={t('ticket.admin.dateTo')}
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl bg-slate-900/80 border border-slate-600 text-white px-3 py-2.5 text-sm min-w-[100px]"
          >
            <option value="">{t('ticket.admin.filterStatus')}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{labelStatus(s)}</option>
            ))}
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="rounded-xl bg-slate-900/80 border border-slate-600 text-white px-3 py-2.5 text-sm min-w-[100px]"
          >
            <option value="">{t('ticket.admin.filterPriority')}</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{labelPriority(p)}</option>
            ))}
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-xl bg-slate-900/80 border border-slate-600 text-white px-3 py-2.5 text-sm min-w-[120px]"
          >
            <option value="">{t('ticket.admin.filterCategory')}</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{labelCategory(c)}</option>
            ))}
          </select>
          <select
            value={filterUserId}
            onChange={(e) => setFilterUserId(e.target.value)}
            className="rounded-xl bg-slate-900/80 border border-slate-600 text-white px-3 py-2.5 text-sm min-w-[140px]"
          >
            <option value="">{t('ticket.admin.filterUser')}</option>
            {ticketUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name || u.username || u.email || `#${u.id}`}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-slate-400 cursor-pointer text-sm whitespace-nowrap">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
              className="rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500/50"
            />
            {t('ticket.admin.unreadOnly')}
          </label>
          <button
            type="button"
            onClick={() => loadList()}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium flex items-center gap-2 shrink-0"
          >
            <Search className="w-4 h-4" />
            {t('ticket.admin.searchButton')}
          </button>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setDateFrom('');
              setDateTo('');
              setFilterStatus('');
              setFilterPriority('');
              setFilterCategory('');
              setFilterUserId('');
              setUnreadOnly(false);
            }}
            className="px-4 py-2.5 rounded-xl bg-slate-600 hover:bg-slate-500 text-white text-sm font-medium flex items-center gap-2 shrink-0"
          >
            <FilterX className="w-4 h-4" />
            {t('ticket.admin.clearFilters')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-slate-800/40 border border-slate-700 p-8 text-center text-slate-500">Yükleniyor...</div>
      ) : tickets.length === 0 ? (
        <div className="rounded-2xl bg-slate-800/40 border border-slate-700 p-8 text-center text-slate-500">{t('ticket.empty')}</div>
      ) : (
        <div className="space-y-2">
          {tickets.map((ticket) => (
            <button
              key={ticket.id}
              type="button"
              onClick={() => loadDetail(ticket.id)}
              className={`w-full text-left rounded-2xl p-4 border transition flex flex-wrap items-center justify-between gap-3 ${
                ticket.unread
                  ? 'bg-amber-900/25 border-amber-500/50 hover:border-amber-400 font-semibold shadow-lg shadow-amber-900/10'
                  : 'bg-slate-800/60 border-slate-600/80 hover:border-slate-500 hover:bg-slate-800/80'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                {ticket.unread && (
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" title="Okunmamış" />
                )}
                <span className={ticket.unread ? 'text-amber-100' : 'text-white'}>{ticket.subject}</span>
                {ticket.user && (
                  <span className="text-xs text-slate-500">
                    {ticket.user.username || ticket.user.email}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                <span>{labelCategory(ticket.category)}</span>
                <span>{labelPriority(ticket.priority)}</span>
                <span className="font-medium">{labelStatus(ticket.status)}</span>
                <span>{formatDate(ticket.created_at)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
