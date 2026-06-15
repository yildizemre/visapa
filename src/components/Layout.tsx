import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { apiFetch } from '../lib/api';
import LanguageToggle from './LanguageToggle';
import HealthStatusIndicator from './HealthStatusIndicator';
import ServiceHeartbeatIndicator from './ServiceHeartbeatIndicator';
import WeatherForecastIndicator from './WeatherForecastIndicator';
import StoreSwitcher from './StoreSwitcher';
import FloatingChatBot from './shared/FloatingChatBot';
import NotificationBell from './shared/NotificationBell';
import CameraViewer from './shared/CameraViewer';
import {
  Home,
  Users,
  UserCheck,
  Map,
  Clock,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User,
  Calendar,
  BarChart3,
  Shield,
  MessageCircle,
  FileText,
  Headphones,
  HeartPulse,
  Database,
  ArrowLeftCircle,
  Video,
  Sun,
  CloudRain,
  Cloud,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  onLogout?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, onLogout }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [userLogo, setUserLogo] = useState<string | null>(null);
  const [showStoreSwitcher, setShowStoreSwitcher] = useState(false);
  const [ticketUnreadCount, setTicketUnreadCount] = useState(0);
  const [weather, setWeather] = useState<{ temp: number; condition: string } | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [cropModal, setCropModal] = useState<{ dataUrl: string } | null>(null);
  const [cropScale, setCropScale] = useState<number>(1);
  const [cropX, setCropX] = useState<number>(0);
  const [cropY, setCropY] = useState<number>(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language } = useLanguage();

  React.useEffect(() => {
    const fetchTopWeather = () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      const userId = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}').id || 'default'; } catch { return 'default'; } })();
      const lat = localStorage.getItem(`weather_lat_${userId}`) || localStorage.getItem('weather_lat') || '36.8969';
      const lon = localStorage.getItem(`weather_lon_${userId}`) || localStorage.getItem('weather_lon') || '30.7133';
      apiFetch(`/api/weather/forecast?lat=${lat}&lon=${lon}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) {
            setWeather({ temp: data.temperature, condition: data.condition });
          }
        })
        .catch(() => {});
    };

    fetchTopWeather();
    window.addEventListener('weatherLocationChanged', fetchTopWeather);
    return () => window.removeEventListener('weatherLocationChanged', fetchTopWeather);
  }, []);

  // Logo - dosya secildiginde oncelikle modal ac
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Dosya 5MB\'den küçük olmalı'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setCropScale(1);
      setCropX(0);
      setCropY(0);
      setCropModal({ dataUrl });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveCroppedLogo = () => {
    if (!cropModal) return;
    const img = new Image();
    img.src = cropModal.dataUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Fill with white background (or transparent if preferred, white is cleaner for circular avatars)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 256, 256);

      ctx.save();
      // Translate to canvas center + crop offsets
      ctx.translate(128 + cropX, 128 + cropY);
      ctx.scale(cropScale, cropScale);

      const iw = img.width;
      const ih = img.height;
      const scaleToFit = Math.min(256 / iw, 256 / ih);
      const dw = iw * scaleToFit;
      const dh = ih * scaleToFit;

      ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();

      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      confirmLogoUpload(croppedDataUrl);
    };
  };

  const confirmLogoUpload = async (dataUrl: string) => {
    setCropModal(null);
    setLogoUploading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await apiFetch('/api/auth/me/logo', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ logo_base64: dataUrl }),
      });
      if (res.ok) {
        setUserLogo(dataUrl);
        const stored = localStorage.getItem('user');
        if (stored) {
          try { const u = JSON.parse(stored); u.logo_base64 = dataUrl; localStorage.setItem('user', JSON.stringify(u)); } catch { /* ignore */ }
        }
      } else {
        const err = await res.json().catch(() => ({}));
        alert('Logo yuklenemedi: ' + (err.error || res.status));
      }
    } catch (e) {
      alert('Sunucuya ulaşılamadı: ' + String(e));
    } finally { setLogoUploading(false); }
  };

  // Kullanıcı adı ve rolünü al (storage event ile de güncelle)
  const loadUserFromStorage = React.useCallback(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserName(user.full_name || user.username || '');
        setUserRole(user.role || 'user');
        setUserLogo(user.logo_base64 || null);
        setShowStoreSwitcher(user.role === 'brand_manager' && (user.managed_stores?.length ?? 0) > 0);
        return;
      } catch {
        setUserName('');
        setUserRole('user');
      }
    }
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        setUserRole(payload.role || 'user');
        setUserName(payload.username || '');
      } catch {
        setUserRole('user');
      }
    }
  }, []);

  React.useEffect(() => {
    loadUserFromStorage();
    window.addEventListener('storage', loadUserFromStorage);
    return () => window.removeEventListener('storage', loadUserFromStorage);
  }, [loadUserFromStorage]);

  // Sayfa görüntüleme logu (ekranda kaçta girdi)
  React.useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !location.pathname) return;
    apiFetch('/api/log/page-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        route: location.pathname,
        title: document.title,
        entered_at: new Date().toISOString(),
      }),
    }).catch(() => {});
  }, [location.pathname]);

  const fetchTicketUnreadCount = React.useCallback(() => {
    if (userRole === 'admin') {
      setTicketUnreadCount(0);
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) return;
    apiFetch('/api/tickets/unread-count')
      .then((r) => r.ok ? r.json() : { unread_count: 0 })
      .then((data) => setTicketUnreadCount(data?.unread_count ?? 0))
      .catch(() => setTicketUnreadCount(0));
  }, [userRole]);

  // Okunmamış destek sayısı (menüde badge; sadece admin olmayan kullanıcılar)
  React.useEffect(() => {
    fetchTicketUnreadCount();
  }, [fetchTicketUnreadCount, location.pathname]);

  React.useEffect(() => {
    const handler = () => fetchTicketUnreadCount();
    window.addEventListener('ticket-unread-update', handler);
    return () => window.removeEventListener('ticket-unread-update', handler);
  }, [fetchTicketUnreadCount]);

  const isImpersonating = !!localStorage.getItem('admin_token');

  const handleReturnToAdmin = () => {
    const adminToken = localStorage.getItem('admin_token');
    const adminUser = localStorage.getItem('admin_user');
    if (adminToken) {
      localStorage.setItem('token', adminToken);
      if (adminUser) localStorage.setItem('user', adminUser);
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/admin/users';
    }
  };

  const roleLabel = userRole === 'admin' ? t('role.admin') : userRole === 'brand_manager' ? t('role.brandManager') : t('role.storeManager');

  const baseMenuItems = [
    { icon: Home, label: t('nav.dashboard'), path: '/dashboard' },
    { icon: Users, label: t('nav.customerAnalytics'), path: '/customer-analytics' },
    { icon: UserCheck, label: t('nav.staffManagement'), path: '/staff-management' },
    { icon: Map, label: t('nav.heatmaps'), path: '/heatmaps' },
    { icon: Clock, label: t('nav.queueAnalysis'), path: '/queue-analysis' },
    ...(userRole === 'admin' ? [{ icon: BarChart3, label: t('nav.reportAnalytics'), path: '/report-analytics' }] : []),
    { icon: MessageCircle, label: t('nav.chat'), path: '/chat' },
    ...(userRole === 'admin'
      ? [{ icon: Headphones, label: t('nav.ticketManagement'), path: '/admin/tickets' }]
      : [{ icon: Headphones, label: t('nav.tickets'), path: '/tickets', badge: ticketUnreadCount }]),
    ...(userRole === 'admin' ? [
      { icon: Shield, label: t('nav.userManagement'), path: '/admin/users' },
      { icon: HeartPulse, label: t('nav.healthOverview'), path: '/admin/health' },
      { icon: FileText, label: t('nav.activityLogs'), path: '/admin/activity-logs' },
      { icon: Database, label: t('nav.dataEditor'), path: '/admin/data-editor' },
    ] : []),
    { icon: Video, label: t('nav.cameraHealth'), path: '/camera-health' },
    { icon: Settings, label: t('nav.settings'), path: '/settings' },
  ];
  const menuItems = baseMenuItems;

  const currentTime = new Date().toLocaleString(language === 'tr' ? 'tr-TR' : 'en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex h-full min-h-0 flex-1 bg-[#0c1222] overflow-hidden" style={{ maxHeight: '100vh' }}>
      {/* Sidebar - min-h-0 ile taşmayı önleyip nav scroll çalışsın */}
      <motion.div
        animate={{ width: isCollapsed ? 80 : 300 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="h-full min-h-0 flex-shrink-0 flex flex-col bg-gradient-to-b from-[#111827] to-[#0f172a] backdrop-blur-xl border-r border-slate-700/30 relative z-10 lg:flex hidden overflow-hidden"
      >
        {/* Logo - sabit üst */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-5 border-b border-slate-700/50">
          <motion.div
            animate={{ opacity: isCollapsed ? 0 : 1 }}
            className="flex items-center min-w-0"
          >
            <img
              src="/camera_feeds/vislivis_logo_web.png"
              alt="VISLIVIS"
              className="h-8 w-auto object-contain flex-shrink-0"
            />
          </motion.div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg bg-slate-700/30 hover:bg-slate-600/30 transition-colors border border-slate-600/20"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-slate-400" />
            )}
          </button>
        </div>

        {/* Navigation - dikeyde yay, boşlukları doldur */}
        <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-6 flex flex-col justify-center">
          <div className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <motion.button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative w-full flex items-center gap-4 px-5 py-3.5 rounded-xl transition-all duration-300 text-left group overflow-hidden ${
                    isActive
                      ? 'bg-white/[0.10] text-white shadow-lg shadow-white/5 border border-white/10'
                      : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200 border border-transparent hover:border-white/[0.06]'
                  }`}
                >
                  {/* Hover beyaz geçiş efekti */}
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/[0.02] to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-9 bg-gradient-to-b from-blue-400 to-indigo-500 rounded-r-full"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                  {/* Hover alt çizgi efekti */}
                  <div className={`absolute bottom-0 left-4 right-4 h-[1px] transition-all duration-300 ${
                    isActive ? 'bg-gradient-to-r from-transparent via-white/20 to-transparent' : 'bg-gradient-to-r from-transparent via-white/0 to-transparent group-hover:via-white/10'
                  }`} />
                  <Icon className={`w-5 h-5 flex-shrink-0 transition-colors duration-200 relative z-10 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`} />
                  {!isCollapsed && (
                    <span className={`font-medium text-sm leading-snug relative z-10 transition-colors duration-200 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                      {item.label}
                      {'badge' in item && typeof item.badge === 'number' && item.badge > 0 && (
                        <span className="ml-1.5 text-amber-400">({item.badge})</span>
                      )}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </nav>

        {/* Çıkış Yap - her zaman altta görünür, scroll dışında */}
        <div className="flex-shrink-0 border-t border-slate-700/20 bg-[#0f172a]/80 px-4 pt-3 pb-4">
          <motion.button
            onClick={onLogout}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-rose-400/80 hover:bg-rose-500/10 hover:text-rose-400 transition-all duration-200 text-left border border-transparent hover:border-rose-500/20"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="font-medium text-sm">{t('nav.logout')}</span>}
          </motion.button>
        </div>
      </motion.div>

      {/* Mobile Sidebar */}
      <motion.div
        initial={false}
        animate={{ x: isCollapsed ? '-100%' : 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="lg:hidden fixed inset-y-0 left-0 z-50 w-[300px] h-full flex flex-col overflow-hidden bg-gradient-to-b from-[#111827] to-[#0f172a] backdrop-blur-xl border-r border-slate-700/30"
      >
        {/* Logo */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-5 border-b border-slate-700/30">
          <img
            src="/camera_feeds/vislivis_logo_web.png"
            alt="VISLIVIS"
            className="h-8 w-auto object-contain"
          />
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-2 rounded-lg bg-slate-700/30 hover:bg-slate-600/30 transition-colors border border-slate-600/20"
          >
            <ChevronLeft className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Navigation - scroll */}
        <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-4 pb-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <motion.button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setIsCollapsed(true);
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 text-left ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-500/15 to-purple-500/10 border border-indigo-500/25 text-indigo-300 shadow-sm shadow-indigo-500/5'
                    : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200 border border-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-indigo-400' : ''}`} />
                <span className="font-medium text-sm leading-snug">
                  {item.label}
                  {'badge' in item && typeof item.badge === 'number' && item.badge > 0 && (
                    <span className="ml-1.5 text-amber-400">({item.badge})</span>
                  )}
                </span>
              </motion.button>
            );
          })}
        </nav>

        {/* Çıkış Yap - altta sabit */}
        <div className="flex-shrink-0 border-t border-slate-700/20 bg-[#0f172a]/80 px-4 pt-3 pb-4">
          <motion.button
            onClick={onLogout}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-rose-400/80 hover:bg-rose-500/10 hover:text-rose-400 transition-all duration-200 text-left border border-transparent hover:border-rose-500/20"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium text-sm">{t('nav.logout')}</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Mobile Overlay */}
      {!isCollapsed && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsCollapsed(true)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Header */}
        <header className="bg-[#111827]/80 backdrop-blur-xl border-b border-slate-700/20 p-2.5 sm:p-3 md:p-4 lg:p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsCollapsed(false)}
                className="lg:hidden p-1.5 sm:p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 transition-colors flex-shrink-0"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
              </button>
              <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-100 truncate">
                {(() => {
                const item = menuItems.find((i) => i.path === location.pathname);
                const label = item?.label || t('nav.dashboard');
                const badge = item != null && 'badge' in item && typeof (item as { badge?: number }).badge === 'number' && (item as { badge?: number }).badge! > 0 ? (item as { badge?: number }).badge! : 0;
                return (
                  <>
                    {label}
                    {badge > 0 && <span className="ml-1.5 text-amber-400">({badge})</span>}
                  </>
                );
              })()}
              </h2>
            </div>
            
            <div className="flex items-center space-x-2 lg:space-x-6">
              {isImpersonating && (
                <button
                  onClick={handleReturnToAdmin}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600/90 to-orange-600/90 hover:from-amber-500 hover:to-orange-500 text-white text-xs sm:text-sm font-medium shadow-lg shadow-amber-500/20 transition-all"
                >
                  <ArrowLeftCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Admin'e Dön</span>
                </button>
              )}
              {showStoreSwitcher && <StoreSwitcher />}
              {/* Weather Widget */}
              {weather && (
                <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/40 border border-slate-700/30 text-slate-300 text-xs font-semibold shadow-inner">
                  {weather.condition === 'rainy' ? (
                    <CloudRain className="w-4 h-4 text-blue-400 animate-pulse" />
                  ) : weather.condition === 'cloudy' ? (
                    <Cloud className="w-4 h-4 text-slate-400" />
                  ) : (
                    <Sun className="w-4 h-4 text-amber-400" />
                  )}
                  <span>{weather.temp}°C</span>
                </div>
              )}

              {/* Quick Cameras Access Button */}
              <div className="relative">
                <CameraViewer />
              </div>

              {/* Notification Bell */}
              <NotificationBell />

              {/* Language Toggle */}
              <LanguageToggle />
              
              {/* Date & Time */}
              <div className="hidden sm:flex items-center space-x-1 md:space-x-2 text-slate-300">
                <Calendar className="w-3 h-3 md:w-4 md:h-4" />
                <span className="text-xs md:text-sm">{currentTime.split(',')[0]}</span>
                <Clock className="w-3 h-3 md:w-4 md:h-4 ml-1 md:ml-2" />
                <span className="text-xs md:text-sm hidden md:inline">{currentTime.split(',')[1]}</span>
              </div>

              {/* User Profile */}
              <div className="hidden md:flex items-center space-x-2 lg:space-x-3">
                <div className="text-right hidden lg:block">
                  {(() => {
                    const name = (userName || '').trim();
                    const isRedundant = userRole === 'admin' && (name.toLowerCase() === 'admin' || name === roleLabel);
                    if (isRedundant || !name) {
                      return <p className="text-sm font-medium text-white">{roleLabel}</p>;
                    }
                    return (
                      <>
                        <p className="text-sm font-medium text-white">{name}</p>
                        <p className="text-xs text-slate-400">{roleLabel}</p>
                      </>
                    );
                  })()}
                </div>
                {/* Avatar - click to upload logo */}
                <div className="relative group cursor-pointer" onClick={() => logoInputRef.current?.click()} title="Logo yükle">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden border-2 border-transparent group-hover:border-indigo-400 transition-all">
                    {userLogo
                      ? <img src={userLogo} alt="logo" className="w-full h-full object-cover" />
                      : <User className="w-4 h-4 lg:w-5 lg:h-5 text-white" />}
                  </div>
                  {logoUploading && <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full"><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /></div>}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-indigo-500 rounded-full border border-slate-900 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[7px] text-white font-bold">+</span>
                  </div>
                </div>
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </div>
              {/* Mobile user icon */}
              <div className="md:hidden relative group cursor-pointer" onClick={() => logoInputRef.current?.click()} title="Logo yükle">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden border-2 border-transparent group-hover:border-indigo-400 transition-all">
                  {userLogo
                    ? <img src={userLogo} alt="logo" className="w-full h-full object-cover" />
                    : <User className="w-4 h-4 text-white" />}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden bg-[#0c1222]">
          <div className="min-h-full pb-4">
            {children}
          </div>
        </main>
      </div>
      <FloatingChatBot />
      <div className="fixed bottom-2 sm:bottom-4 right-24 z-50 flex flex-row gap-1.5 sm:gap-2 items-center">
        <WeatherForecastIndicator />
        <ServiceHeartbeatIndicator />
        <HealthStatusIndicator />
      </div>

      {/* Logo Kırpma / Önizleme Modalı */}
      {cropModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 flex flex-col items-center gap-5">
            <h3 className="text-base font-bold text-white">Logo Ayarlama Aracın</h3>
            
            {/* Circular Preview Area */}
            <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-indigo-500/50 bg-slate-950 flex items-center justify-center relative shadow-inner">
              <div 
                style={{
                  transform: `translate(${cropX}px, ${cropY}px) scale(${cropScale})`,
                  transition: 'transform 0.05s ease-out',
                }}
                className="w-full h-full flex items-center justify-center pointer-events-none"
              >
                <img src={cropModal.dataUrl} alt="preview" className="max-w-full max-h-full object-contain" />
              </div>
              
              {/* Central target reticle */}
              <div className="absolute inset-0 rounded-full border border-dashed border-white/20 pointer-events-none" />
            </div>

            <p className="text-xs text-slate-400 text-center px-2">Aşağıdaki kaydırıcıları kullanarak logonuzu daireye ortalayın ve sığdırın.</p>
            
            {/* Sliders Container */}
            <div className="w-full space-y-4 px-1">
              {/* Zoom Slider */}
              <div className="w-full space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  <span>Boyut (Büyüt / Küçült)</span>
                  <span className="text-indigo-400">{Math.round(cropScale * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0.4" 
                  max="3.0" 
                  step="0.02" 
                  value={cropScale} 
                  onChange={(e) => setCropScale(parseFloat(e.target.value))} 
                  className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Horizontal Slider */}
              <div className="w-full space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  <span>Yatay Konum</span>
                  <span className="text-indigo-400">{cropX}px</span>
                </div>
                <input 
                  type="range" 
                  min="-100" 
                  max="100" 
                  step="1" 
                  value={cropX} 
                  onChange={(e) => setCropX(parseInt(e.target.value))} 
                  className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Vertical Slider */}
              <div className="w-full space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  <span>Dikey Konum</span>
                  <span className="text-indigo-400">{cropY}px</span>
                </div>
                <input 
                  type="range" 
                  min="-100" 
                  max="100" 
                  step="1" 
                  value={cropY} 
                  onChange={(e) => setCropY(parseInt(e.target.value))} 
                  className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            <div className="flex gap-3 w-full mt-2">
              <button
                type="button"
                onClick={() => setCropModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-white text-sm font-bold transition-all"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleSaveCroppedLogo}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 active:brightness-95 text-white text-sm font-bold shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2"
              >
                {logoUploading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;