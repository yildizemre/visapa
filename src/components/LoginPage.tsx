import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, AlertCircle, X, ChevronRight, Activity, Cpu, BarChart3, Radio } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageToggle from './LanguageToggle';

interface LoginPageProps {
  onLogin: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const { t, language } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorHint(null);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? '' : 'http://127.0.0.1:5000')}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: email,
          password: password
        })
      });

      if (response.ok) {
        const data = await response.json();
        const token = String(data.access_token || '').trim();
        if (!token) {
          setError(t('msg.tokenError') || 'Geçersiz token received');
          return;
        }
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLogin();
      } else {
        setError(t('login.errorWrongCredentials') || 'E-posta veya şifre hatalı!');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(t('msg.serverError') || 'Sunucu bağlantı hatası!');
    }
  };

  const tags = language === 'tr' 
    ? ['Canlı İzleme', 'Müşteri Sayımı', 'Kuyruk Analizi', 'Isı Haritası'] 
    : ['Live Feeds', 'Customer Counting', 'Queue Analysis', 'Heatmaps'];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col md:flex-row bg-[#0b0f19] text-white relative overflow-hidden font-sans"
    >
      {/* LEFT SIDE: AI Banner with Dark Teal/Cyan Gradient & Grid */}
      <div className="relative flex-1 hidden md:flex flex-col justify-between p-12 lg:p-16 bg-gradient-to-br from-[#061727] via-[#09101b] to-[#04111d] overflow-hidden border-r border-slate-800/40">
        
        {/* Subtle Tech Grid Lines Background */}
        <div 
          className="absolute inset-0 opacity-[0.06] pointer-events-none" 
          style={{
            backgroundImage: `radial-gradient(#06b6d4 1px, transparent 1px), linear-gradient(to right, rgba(6,182,212,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(6,182,212,0.1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px, 40px 40px, 40px 40px',
            backgroundPosition: 'center'
          }}
        />

        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full bg-blue-600/10 blur-[100px] pointer-events-none" />

        {/* Top Header: Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <img
            src="/camera_feeds/vislivis_logo_web.png"
            alt="Vislivis logo"
            className="h-9 w-auto object-contain"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <span className="text-xl font-black bg-gradient-to-r from-white via-slate-100 to-indigo-400 bg-clip-text text-transparent tracking-tight">
            vislivis<span className="text-indigo-500 font-medium">.</span>
          </span>
        </div>

        {/* Center: Title & Subtitle & Tech Tags */}
        <div className="relative z-10 my-auto max-w-2xl space-y-10">
          <div className="space-y-5">
            <motion.h2 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-5xl lg:text-6xl xl:text-7xl font-black tracking-tight leading-[1.05]"
              style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
            >
              {language === 'tr' ? 'Yapay zeka ile' : 'AI-powered'}<br />
              <span className="bg-gradient-to-r from-blue-500 via-indigo-400 to-indigo-600 bg-clip-text text-transparent">
                {language === 'tr' ? 'akıllı mağazacılık' : 'smart retail insights'}
              </span>
            </motion.h2>
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-slate-400 text-sm lg:text-base leading-relaxed font-semibold max-w-lg"
            >
              {language === 'tr' 
                ? 'Kamera analizi, müşteri sayımı, personel verimliliği ve akıllı içgörüler — tek panelde.'
                : 'Camera analytics, customer counting, staff efficiency, and smart insights — on a single dashboard.'}
            </motion.p>
          </div>

          {/* Tech Capsules */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap gap-2 lg:gap-3"
          >
            {tags.map((tag, i) => {
              const icons = [Radio, Cpu, BarChart3, Activity];
              const TagIcon = icons[i % icons.length];
              return (
                <div 
                  key={tag} 
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900/60 border border-slate-800 text-slate-300 hover:border-indigo-500/30 hover:text-indigo-300 transition-all cursor-default text-xs font-semibold backdrop-blur-md shadow-sm"
                >
                  <TagIcon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{tag}</span>
                </div>
              );
            })}
          </motion.div>
        </div>

        {/* Bottom Footer: Copyright */}
        <div className="relative z-10 text-slate-500 text-xs font-medium">
          © {new Date().getFullYear()} Vislivis AI Analytics. All rights reserved.
        </div>
      </div>

      {/* RIGHT SIDE: Solid Dark Login Card Container */}
      <div 
        className="flex-1 flex flex-col justify-between p-8 sm:p-12 lg:p-16 bg-[#070b13] relative font-sans"
        style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif' }}
      >
        
        {/* Language Selector Top Right */}
        <div className="absolute top-6 right-6 z-20">
          <LanguageToggle />
        </div>

        {/* Small Logo for Mobile/Tablet view */}
        <div className="md:hidden flex items-center gap-2 mb-8">
          <img
            src="/camera_feeds/vislivis_logo_web.png"
            alt="Vislivis logo"
            className="h-8 w-auto object-contain"
          />
          <span className="text-lg font-black tracking-tight text-white">
            vislivis<span className="text-indigo-500 font-medium">.</span>
          </span>
        </div>

        {/* Login Form Wrapper */}
        <div className="my-auto w-full max-w-md mx-auto">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-900/35 border border-slate-800/80 backdrop-blur-2xl p-7 sm:p-9 rounded-3xl shadow-2xl space-y-7 shadow-indigo-950/5"
          >
            {/* HOŞ GELDİNİZ Header */}
            <div className="space-y-2">
              <span className="text-[10px] font-black text-indigo-400 tracking-[0.2em] uppercase block">
                {language === 'tr' ? 'HOŞ GELDİNİZ' : 'WELCOME'}
              </span>
              <h1 className="text-3xl font-black text-white tracking-tight leading-none animate-pulse">
                {language === 'tr' ? 'Hesabınıza giriş yapın' : 'Sign in to your account'}
              </h1>
              <p className="text-xs text-slate-500 font-semibold tracking-wide">
                {language === 'tr' ? 'Yönetici paneline erişin.' : 'Access your administrative panel.'}
              </p>
            </div>

            {/* Error alerts */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-rose-300 text-sm font-bold leading-tight">{error}</p>
                    {errorHint && (
                      <p className="text-slate-500 text-xs mt-1 font-medium">{errorHint}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setError(null); setErrorHint(null); }}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-2.5 uppercase tracking-[0.15em]">
                  {language === 'tr' ? 'E-posta' : 'E-mail'}
                </label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); setErrorHint(null); }}
                  className="w-full px-4.5 py-4 bg-slate-950/40 border border-slate-800/80 focus:border-indigo-500 rounded-2xl focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-white placeholder-slate-600 text-sm font-semibold shadow-inner"
                  placeholder={language === 'tr' ? 'Kullanıcı adı veya e-posta' : 'Username or e-mail'}
                  required
                  autoComplete="username"
                  style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-2.5 uppercase tracking-[0.15em]">
                  {language === 'tr' ? 'Şifre' : 'Password'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null); setErrorHint(null); }}
                    className="w-full px-4.5 py-4 bg-slate-950/40 border border-slate-800/80 focus:border-indigo-500 rounded-2xl focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-white placeholder-slate-600 text-sm font-semibold pr-12 shadow-inner"
                    placeholder="••••••"
                    required
                    autoComplete="current-password"
                    style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center cursor-pointer group">
                  <input 
                    type="checkbox" 
                    className="rounded-md border-slate-800 bg-slate-950 text-indigo-600 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer transition-colors" 
                  />
                  <span className="ml-2.5 text-xs text-slate-400 group-hover:text-slate-300 transition-colors font-semibold select-none">
                    {language === 'tr' ? 'Beni Hatırla' : 'Remember Me'}
                  </span>
                </label>
              </div>

              <motion.button
                whileHover={{ scale: 1.01, filter: 'brightness(1.08)' }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                className="w-full mt-2 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-2xl shadow-xl shadow-indigo-500/10 transition-all text-sm flex items-center justify-center gap-2 group tracking-wide"
              >
                <span>{language === 'tr' ? 'Giriş Yap' : 'Sign In'}</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </motion.button>
            </form>
          </motion.div>
        </div>

        {/* Small Mobile Copyright Footer */}
        <div className="md:hidden text-center text-slate-600 text-[10px] font-medium mt-8">
          © {new Date().getFullYear()} Vislivis AI Analytics. All rights reserved.
        </div>
      </div>
    </motion.div>
  );
};

export default LoginPage;
