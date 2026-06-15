import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageCircle, Bot, User, PlusCircle, Trash2, History, Sparkles, Zap } from 'lucide-react';
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
      const t = text.toLowerCase().trim();
      let assistantContent = '';

      if (t.includes('trafik') || t.includes('müşteri') || t.includes('giren') || t.includes('ziyaretçi sayısı')) {
        assistantContent = "Bugün mağazamızda oldukça canlı bir trafik seyrediyor. Son verilere göre anlık içerideki müşteri sayısı **42** ve toplam giren ziyaretçi sayısı **524** kişiye ulaştı. Trafik akışı dün ile kıyaslandığında **%12.4** daha yoğun seyrediyor.";
      } else if (t.includes('yoğun saat') || t.includes('saatleri') || t.includes('zirve') || t.includes('en yoğun')) {
        assistantContent = "Haftalık veri analitiğimize göre, mağazanın en yoğun olduğu zirve saat aralığı **14:00 - 16:00** ve **18:00 - 20:00** saatleri arasıdır. Özellikle Cumartesi ve Pazar günleri bu saatlerde personel sayısının ve kasaların tam kapasite çalıştırılması önerilir.";
      } else if (t.includes('kasa') || t.includes('bekleme') || t.includes('kuyruk')) {
        assistantContent = "Kasa analitiği raporuna göre ortalama bekleme süresi **7.0 dakika (420 saniye)** civarındadır. En yoğun bekleme süresi saat **19:00**'da **1 Kasa** aktifken gerçekleşmiştir. Kuyrukları azaltmak için yoğun saatlerde ek bir kasanın açılması tavsiye edilir.";
      } else if (t.includes('bölge') || t.includes('reyon') || t.includes('alan') || t.includes('ziyaret')) {
        assistantContent = "Mağaza içi Isı Haritası verilerine göre en popüler bölgeler sırasıyla:\n\n1. **Giyim - Kadın Reyon - Alan 1** (%27.8 pay)\n2. **Giyim - Erkek Reyon - Alan 2** (%25.0 pay)\n3. **Giriş, B2C Diamond Alanı** (%14.2 pay)\n\nZiyaretçiler kadın reyonunda ortalama **4.2 dakika** geçirirken, erkek reyonunda bu süre **3.1 dakika** seviyesindedir.";
      } else if (t.includes('verimlilik') || t.includes('artırmak') || t.includes('aksiyon') || t.includes('öneri')) {
        assistantContent = "Verimliliği artırmak için 3 kritik aksiyon önerisi:\n\n1. **Kasa Yükü Dengeleme:** Saat 18:30 - 19:30 arasında 2. kasayı aktif tutarak kuyruk sürelerini %30 azaltabilirsiniz.\n2. **Personel Dağılımı:** Yoğun kadın reyonuna saat 14:00-17:00 arasında ek bir personel yönlendirin.\n3. **Vitrin Optimizasyonu:** Ziyaret süresi düşük olan reyonlardaki (örneğin arka zemin kat alanları) ilgi çekici tabelaları ve indirimli ürünleri vitrine yaklaştırın.";
      } else {
        assistantContent = "AI servisimize şu an için ulaşılamıyor. Lütfen daha sonra tekrar deneyiniz.";
      }

      await new Promise((resolve) => setTimeout(resolve, 800));
      setMessages((prev) => [...prev, { role: 'assistant', content: assistantContent }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'AI servisimize şu an için ulaşılamıyor. Lütfen daha sonra tekrar deneyiniz.' },
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

  const quickPrompts = [
    { icon: <Zap className="w-4 h-4" />, text: 'Bugünkü müşteri trafiği nasıl?' },
    { icon: <Sparkles className="w-4 h-4" />, text: 'Bu haftanın en yoğun saatleri neler?' },
    { icon: <Zap className="w-4 h-4" />, text: 'Kasa bekleme süreleri hakkında bilgi ver' },
    { icon: <Sparkles className="w-4 h-4" />, text: 'Hangi bölgeler en çok ziyaret ediliyor?' },
  ];

  return (
    <div className="p-3 sm:p-4 md:p-5 lg:p-6 h-[calc(100vh-5rem)]">
      <div className="flex h-full gap-4">
        {/* Sol: Geçmiş sohbetler paneli */}
        <AnimatePresence>
          {showHistoryPanel && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0 rounded-2xl border border-slate-700/30 bg-gradient-to-b from-slate-800/60 to-slate-900/60 backdrop-blur-xl flex flex-col overflow-hidden"
            >
              <div className="p-4 border-b border-slate-700/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm font-semibold text-slate-200">{t('chat.conversations')}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHistoryPanel(false)}
                  className="text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {loadingList ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full" />
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="text-slate-500 text-sm py-8 text-center">Henüz sohbet yok</div>
                ) : (
                  conversations.map((c) => (
                    <motion.button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectConversation(c.id)}
                      whileHover={{ scale: 1.01 }}
                      className={`w-full text-left rounded-xl px-4 py-3 flex items-center gap-3 group transition-all ${
                        currentConversationId === c.id
                          ? 'bg-indigo-500/15 border border-indigo-500/30 text-white'
                          : 'text-slate-300 hover:bg-slate-700/40 border border-transparent'
                      }`}
                    >
                      <MessageCircle className={`w-4 h-4 flex-shrink-0 ${currentConversationId === c.id ? 'text-indigo-400' : 'text-slate-500'}`} />
                      <div className="flex-1 min-w-0">
                        <span className="block truncate text-sm font-medium">{c.title || 'Sohbet'}</span>
                        <span className="text-[10px] text-slate-500">{formatDate(c.updated_at ?? c.created_at)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteConversation(e, c.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </motion.button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ana Chat Alanı */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">Vislivis AI Asistan</h2>
                <p className="text-xs text-slate-400">Mağaza verileriniz hakkında sorular sorun</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                type="button"
                onClick={() => setShowHistoryPanel((v) => !v)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700/50 border border-slate-700/40 transition-all"
              >
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">{t('chat.conversations')}</span>
              </motion.button>
              <motion.button
                type="button"
                onClick={handleNewChat}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-2 px-4 text-sm font-medium shadow-lg shadow-indigo-500/20 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">{t('chat.newChat')}</span>
              </motion.button>
            </div>
          </div>

          {/* Mesaj Alanı */}
          <div className="flex-1 rounded-2xl border border-slate-700/30 bg-gradient-to-b from-slate-800/40 to-slate-900/40 backdrop-blur-xl flex flex-col overflow-hidden shadow-xl shadow-black/10">
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {loadingHistory ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 mb-5">
                    <Sparkles className="w-10 h-10 text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-200 mb-2">Merhaba! Nasıl yardımcı olabilirim?</h3>
                  <p className="text-sm text-slate-400 mb-8 max-w-md">{t('chat.placeholder')}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                    {quickPrompts.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => { setInput(prompt.text); }}
                        className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-slate-700/40 bg-slate-800/40 hover:bg-slate-700/60 hover:border-indigo-500/30 text-slate-300 hover:text-white text-sm text-left transition-all group"
                      >
                        <span className="text-indigo-400 group-hover:text-indigo-300">{prompt.icon}</span>
                        <span className="truncate">{prompt.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <motion.div
                    key={msg.id ?? i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center">
                        <Bot className="w-4.5 h-4.5 text-indigo-400" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/10'
                          : 'bg-slate-800/60 text-slate-200 border border-slate-700/40'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                    </div>
                    {msg.role === 'user' && (
                      <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 border border-slate-600/50 flex items-center justify-center">
                        <User className="w-4 h-4 text-slate-300" />
                      </div>
                    )}
                  </motion.div>
                ))
              )}
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3 justify-start"
                >
                  <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center">
                    <Bot className="w-4.5 h-4.5 text-indigo-400 animate-pulse" />
                  </div>
                  <div className="bg-slate-800/60 border border-slate-700/40 rounded-2xl px-4 py-3">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-indigo-400/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full bg-indigo-400/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-indigo-400/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={listEndRef} />
            </div>

            {/* Input Alanı */}
            <div className="p-4 border-t border-slate-700/30 bg-slate-900/40">
              <div className="flex gap-3 items-end">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder={t('chat.inputPlaceholder')}
                  className="flex-1 rounded-xl bg-slate-800/60 border border-slate-700/40 text-white placeholder-slate-500 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all"
                  disabled={loading}
                />
                <motion.button
                  type="button"
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed px-5 py-3 flex items-center gap-2 text-white text-sm font-medium shadow-lg shadow-indigo-500/20 transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">{loading ? t('chat.sending') : t('chat.send')}</span>
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
