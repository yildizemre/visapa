import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { apiUrl } from '../../lib/api';

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

const FloatingChatBot = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Welcome bubble: 3s sonra göster, 10s sonra kapat
  useEffect(() => {
    const dismissed = sessionStorage.getItem('chatbot_welcome_dismissed');
    if (dismissed) { setWelcomeDismissed(true); return; }
    const show = setTimeout(() => setShowWelcome(true), 3000);
    const hide = setTimeout(() => setShowWelcome(false), 13000);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const dismissWelcome = () => {
    setShowWelcome(false);
    setWelcomeDismissed(true);
    sessionStorage.setItem('chatbot_welcome_dismissed', 'true');
  };

  const toggleChat = () => {
    if (!isChatOpen) {
      dismissWelcome();
      setIsChatOpen(true);
    } else {
      setIsChatOpen(false);
    }
  };

  const sendMessage = async () => {
    const msg = input.trim();
    if (!msg || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl('/api/chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ message: msg, conversation_id: conversationId }),
      });
      const data = await res.json();
      if (data.conversation_id) setConversationId(data.conversation_id);
      setMessages(prev => [...prev, { role: 'assistant', content: data.response || 'Yanıt alınamadı.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Bağlantı hatası. Lütfen tekrar deneyin.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Welcome bubble */}
      <AnimatePresence>
        {showWelcome && !welcomeDismissed && !isChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative max-w-[260px] bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-4 shadow-2xl shadow-black/30"
          >
            <button onClick={dismissWelcome} className="absolute top-2 right-2 p-1 rounded-full text-slate-500 hover:text-white hover:bg-slate-700/50 transition-colors">
              <X className="w-3 h-3" />
            </button>
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex-shrink-0">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white mb-0.5">AI Asistan</p>
                <p className="text-[11px] text-slate-300 leading-relaxed">Merhaba! Mağaza verileriniz hakkında sorular sorabilirsiniz.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mini Chat Panel */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="w-[340px] h-[440px] bg-gradient-to-b from-[#111827] to-[#0f172a] border border-slate-700/50 rounded-2xl shadow-2xl shadow-black/40 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border-b border-slate-700/50">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">AI Asistan</p>
                  <p className="text-[10px] text-slate-400">Mağaza verilerinizi sorgulayın</p>
                </div>
              </div>
              <button onClick={toggleChat} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scrollbar-thin">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 mb-3">
                    <Bot className="w-8 h-8 text-indigo-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-300 mb-1">AI Asistanınız Hazır</p>
                  <p className="text-xs text-slate-500 leading-relaxed">Mağaza performansı, müşteri analizleri veya öneriler hakkında soru sorun.</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  <div className={`max-w-[75%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-slate-800 text-slate-200 border border-slate-700/50 rounded-bl-sm'
                  }`}>
                    {msg.content}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-2 justify-start">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="bg-slate-800 border border-slate-700/50 px-3 py-2 rounded-xl rounded-bl-sm">
                    <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-3 pb-3 pt-1">
              <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/50 rounded-xl px-3 py-2 focus-within:border-indigo-500/50 transition-colors">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Bir soru yazın..."
                  className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
                  disabled={loading}
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white disabled:opacity-40 hover:shadow-lg hover:shadow-indigo-500/20 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating button */}
      <motion.button
        onClick={toggleChat}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 shadow-xl shadow-indigo-500/30 flex items-center justify-center text-white hover:shadow-indigo-500/50 transition-shadow"
      >
        {isChatOpen ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </motion.button>
    </div>
  );
};

export default FloatingChatBot;
