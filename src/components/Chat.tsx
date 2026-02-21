import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, MessageCircle, Bot, User, PlusCircle, Trash2, History } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { apiFetch } from '../lib/api';

interface ChatMessageType {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string | null;
}

interface ConversationType {
  id: number;
  title: string;
  created_at: string | null;
  updated_at: string | null;
}

const Chat: React.FC = () => {
  const { t } = useLanguage();
  const [conversations, setConversations] = useState<ConversationType[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const listEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = async () => {
    setLoadingList(true);
    try {
      const res = await apiFetch('/api/chat/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingList(false);
    }
  };

  const loadHistory = async (convId: number | null) => {
    setLoadingHistory(true);
    try {
      const url = convId != null
        ? `/api/chat/history?conversation_id=${convId}`
        : '/api/chat/history';
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      } else {
        setMessages([]);
      }
    } catch {
      setMessages([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    loadHistory(currentConversationId);
  }, [currentConversationId]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleNewChat = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setShowHistoryPanel(false);
  };

  const handleSelectConversation = (id: number) => {
    setCurrentConversationId(id);
    setShowHistoryPanel(false);
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm(t('chat.deleteChat') + '?')) return;
    try {
      const res = await apiFetch(`/api/chat/conversations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (currentConversationId === id) {
          setCurrentConversationId(null);
          setMessages([]);
        }
      }
    } catch {
      /* ignore */
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    const userMsg: ChatMessageType = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const body: { message: string; conversation_id?: number } = { message: text };
      if (currentConversationId != null) body.conversation_id = currentConversationId;
      const res = await apiFetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      const msg =
        (data.response && String(data.response).trim()) ||
        data.error ||
        data.msg; // backend/JWT hata mesajı
      const assistantContent =
        msg || (res.ok ? '' : 'Yanıt alınamadı. Lütfen tekrar deneyin.');

      setMessages((prev) => [...prev, { role: 'assistant', content: assistantContent }]);

      if (data.conversation_id != null && currentConversationId !== data.conversation_id) {
        setCurrentConversationId(data.conversation_id);
        loadConversations();
      } else if (data.conversation_id != null) {
        loadConversations();
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Bağlantı hatası. Lütfen tekrar deneyin.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[400px] gap-4">
      {/* Sol: Geçmiş sohbetler - sadece açıksa göster */}
      {showHistoryPanel && (
        <div className="w-56 flex-shrink-0 rounded-xl border border-slate-700/50 bg-slate-800/30 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-slate-700/50 flex items-center justify-between">
            <span className="text-xs text-slate-400">{t('chat.conversations')}</span>
            <button
              type="button"
              onClick={() => setShowHistoryPanel(false)}
              className="text-slate-400 hover:text-white p-1 rounded"
              aria-label="Kapat"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loadingList ? (
              <div className="text-slate-400 text-sm py-4 text-center">...</div>
            ) : conversations.length === 0 ? (
              <div className="text-slate-500 text-sm py-4 text-center">—</div>
            ) : (
              <ul className="space-y-1">
                {conversations.map((c) => (
                  <li key={c.id}>
                    <motion.button
                      type="button"
                      onClick={() => handleSelectConversation(c.id)}
                      whileHover={{ backgroundColor: 'rgba(51,65,85,0.5)' }}
                      className={`w-full text-left rounded-lg px-3 py-2 flex items-center gap-2 group ${
                        currentConversationId === c.id
                          ? 'bg-slate-600/60 text-white'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      <span className="flex-1 min-w-0 truncate text-sm">{c.title || 'Sohbet'}</span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteConversation(e, c.id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                        title={t('chat.deleteChat')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </motion.button>
                    <p className="text-xs text-slate-500 px-3 pb-1">{formatDate(c.updated_at ?? c.created_at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Mesajlar + input */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">{t('nav.chat')}</h2>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              type="button"
              onClick={() => setShowHistoryPanel((v) => !v)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700/50 border border-slate-600/50"
            >
              <History className="w-4 h-4" />
              {t('chat.conversations')}
            </motion.button>
            <motion.button
              type="button"
              onClick={handleNewChat}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white py-2 px-3 text-sm font-medium"
            >
              <PlusCircle className="w-4 h-4" />
              {t('chat.newChat')}
            </motion.button>
          </div>
        </div>

        <div className="flex-1 rounded-xl border border-slate-700/50 bg-slate-800/30 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loadingHistory ? (
              <div className="flex justify-center py-8 text-slate-400">{t('chat.loadingHistory')}</div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center">
                <Bot className="w-12 h-12 mb-3 opacity-60" />
                <p>{t('chat.placeholder')}</p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <motion.div
                  key={msg.id ?? i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-blue-400" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-xl px-4 py-2.5 ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700/60 text-slate-200 border border-slate-600/50'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>
                  {msg.role === 'user' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center">
                      <User className="w-4 h-4 text-slate-300" />
                    </div>
                  )}
                </motion.div>
              ))
            )}
            <div ref={listEndRef} />
          </div>

          <div className="p-3 border-t border-slate-700/50 bg-slate-800/50">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder={t('chat.inputPlaceholder')}
                className="flex-1 rounded-lg bg-slate-700/80 border border-slate-600 text-white placeholder-slate-400 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                disabled={loading}
              />
              <motion.button
                type="button"
                onClick={handleSend}
                disabled={loading || !input.trim()}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 flex items-center gap-2 text-white text-sm"
              >
                <Send className="w-4 h-4" />
                {loading ? t('chat.sending') : t('chat.send')}
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
