import React, { useState, useEffect } from 'react';
import { Headphones, Send, MessageSquare, ArrowLeft, Tag, Clock, XCircle } from 'lucide-react';
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
  created_at: string | null;
  updated_at: string | null;
  closed_at?: string | null;
  closed_by?: string | null;
  closed_by_role?: string | null;
  unread?: boolean;
  replies?: TicketReply[];
  user?: { id: number; username?: string; email?: string; full_name?: string };
}

export default function Ticket() {
  const { t } = useLanguage();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<TicketItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const [formSubject, setFormSubject] = useState('');
  const [formCategory, setFormCategory] = useState<string>('genel');
  const [formPriority, setFormPriority] = useState<string>('normal');
  const [formMessage, setFormMessage] = useState('');

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
      const res = await apiFetch('/api/tickets');
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
    loadList();
  }, []);

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
        if (!isAdmin) window.dispatchEvent(new CustomEvent('ticket-unread-update'));
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSubject.trim() || !formMessage.trim()) return;
    setSending(true);
    try {
      const res = await apiFetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: formSubject.trim(),
          category: formCategory,
          priority: formPriority,
          message: formMessage.trim(),
        }),
      });
      if (res.ok) {
        setFormSubject('');
        setFormCategory('genel');
        setFormPriority('normal');
        setFormMessage('');
        setShowForm(false);
        loadList();
      }
    } finally {
      setSending(false);
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

  const labelCategory = (c: string) => t(`ticket.category.${c}` as keyof typeof t) || c;
  const labelPriority = (p: string) => t(`ticket.priority.${p}` as keyof typeof t) || p;
  const labelStatus = (s: string) => t(`ticket.status.${s}` as keyof typeof t) || s;
  const formatDate = (d: string | null) => (d ? new Date(d).toLocaleString() : '-');

  const statusColor = (s: string) =>
    s === 'closed' ? 'bg-slate-600/80' : s === 'answered' ? 'bg-emerald-600/80' : 'bg-amber-600/80';

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
        <div className="rounded-2xl bg-slate-800/80 border border-slate-600/80 shadow-xl shadow-black/20 p-5 backdrop-blur-sm">
          <h2 className="text-xl font-semibold text-white">{detail.subject}</h2>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white ${statusColor(detail.status)}`}>
              <Tag className="w-3 h-3" />
              {labelStatus(detail.status)}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-600/60 text-slate-200">
              {labelCategory(detail.category)}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-600/60 text-slate-200">
              {labelPriority(detail.priority)}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <Clock className="w-3 h-3" />
              {formatDate(detail.created_at)}
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
        <div className="space-y-3">
          {(detail.replies || []).map((r) => (
            <div
              key={r.id}
              className={`rounded-2xl border p-4 shadow-lg backdrop-blur-sm ${
                r.is_staff
                  ? 'bg-blue-900/30 border-blue-500/50 ml-4 md:ml-8'
                  : 'bg-slate-800/60 border-slate-600/80'
              }`}
            >
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-white">{r.author_name}</span>
                <span className="text-slate-500 text-xs">{formatDate(r.created_at)}</span>
              </div>
              <p className="mt-2 text-slate-300 whitespace-pre-wrap text-sm leading-relaxed">{r.message}</p>
            </div>
          ))}
        </div>
        {detail.status !== 'closed' && (
          <div className="space-y-3">
            <form onSubmit={handleReply} className="flex flex-col sm:flex-row gap-3">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={t('ticket.reply')}
                className="flex-1 min-h-[88px] rounded-xl bg-slate-800/80 border border-slate-600 text-white placeholder-slate-500 p-3 text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                rows={3}
              />
              <div className="flex gap-2 self-end sm:self-auto">
                <button
                  type="submit"
                  disabled={sending || !replyText.trim()}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 flex items-center justify-center gap-2 font-medium transition shadow-lg"
                >
                  <Send className="w-4 h-4" />
                  {t('ticket.sendReply')}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!selectedId) return;
                    const res = await apiFetch(`/api/tickets/${selectedId}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ status: 'closed' }),
                    });
                    if (res.ok) { loadDetail(selectedId); loadList(); }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-red-600/80 hover:bg-red-500 text-white flex items-center gap-2 font-medium"
                >
                  <XCircle className="w-4 h-4" />
                  {t('ticket.close')}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-500/30">
            <Headphones className="w-6 h-6 text-blue-400" />
          </div>
          {t('ticket.title')}
        </h1>
        {isAdmin !== true && (
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-2 font-medium shadow-lg transition"
          >
            <MessageSquare className="w-4 h-4" />
            {t('ticket.newTicket')}
          </button>
        )}
      </div>

      {isAdmin === true && (
        <div className="rounded-2xl bg-slate-800/60 border border-slate-600/80 p-4 text-slate-400 text-sm">
          {t('ticket.adminNoCreate')}
        </div>
      )}

      {!isAdmin && showForm && (
        <form onSubmit={handleCreate} className="rounded-2xl bg-slate-800/80 border border-slate-600/80 shadow-xl p-5 space-y-4 backdrop-blur-sm">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">{t('ticket.subject')}</label>
            <input
              value={formSubject}
              onChange={(e) => setFormSubject(e.target.value)}
              className="w-full rounded-xl bg-slate-900/80 border border-slate-600 text-white px-4 py-2.5 focus:ring-2 focus:ring-blue-500/50"
              placeholder={t('ticket.subject')}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">{t('ticket.category')}</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full rounded-xl bg-slate-900/80 border border-slate-600 text-white px-4 py-2.5"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{labelCategory(c)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">{t('ticket.priority')}</label>
              <select
                value={formPriority}
                onChange={(e) => setFormPriority(e.target.value)}
                className="w-full rounded-xl bg-slate-900/80 border border-slate-600 text-white px-4 py-2.5"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{labelPriority(p)}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">{t('ticket.message')}</label>
            <textarea
              value={formMessage}
              onChange={(e) => setFormMessage(e.target.value)}
              className="w-full rounded-xl bg-slate-900/80 border border-slate-600 text-white px-4 py-2.5 min-h-[120px] focus:ring-2 focus:ring-blue-500/50"
              placeholder={t('ticket.message')}
              required
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={sending} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 font-medium">
              {t('ticket.submit')}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl bg-slate-600 hover:bg-slate-500 text-white font-medium">
              İptal
            </button>
          </div>
        </form>
      )}

      <h2 className="text-lg font-semibold text-slate-300">{isAdmin ? t('ticket.allRequests') : t('ticket.myTickets')}</h2>
      {loading ? (
        <div className="rounded-2xl bg-slate-800/40 border border-slate-700 p-8 text-center text-slate-500">Yükleniyor...</div>
      ) : tickets.length === 0 ? (
        <div className="rounded-2xl bg-slate-800/40 border border-slate-700 p-8 text-center text-slate-500">{t('ticket.empty')}</div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <button
              key={ticket.id}
              type="button"
              onClick={() => loadDetail(ticket.id)}
              className={`w-full text-left rounded-2xl p-4 border transition shadow-lg flex flex-wrap items-center justify-between gap-3 ${
                ticket.unread ? 'bg-amber-900/20 border-amber-500/50' : 'bg-slate-800/60 border-slate-600/80 hover:border-slate-500 hover:bg-slate-800/80'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                {ticket.unread && <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />}
                <span className="font-medium text-white">{ticket.subject}</span>
                {isAdmin && ticket.user && (
                  <span className="text-xs text-slate-500 truncate">
                    {ticket.user.full_name || ticket.user.username || ticket.user.email || ''}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium text-white ${statusColor(ticket.status)}`}>
                  {labelStatus(ticket.status)}
                </span>
                <span className="text-xs text-slate-500">{labelCategory(ticket.category)}</span>
                <span className="text-xs text-slate-500">{formatDate(ticket.created_at)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
