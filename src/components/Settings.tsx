// --- START OF FULLY UPDATED FILE Settings.tsx ---

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { apiUrl } from '../lib/api';
import { useStoreChange } from '../hooks/useStoreChange';
import { 
  User, 
  Camera,
  Database,
  Eye,
  X,
  Mail,
  Trash2,
  KeyRound,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  MapPin,
  Save,
  Edit3
} from 'lucide-react';

// Arayüzler
interface CameraModalProps {
  camera: CameraInfo | null;
  onClose: () => void;
}

interface CameraInfo {
  id: number;
  name: string;
  type: string;
  rtsp: string;
  imageUrl: string;
  location?: string;
}

// GÜNCELLENDİ: Rapor alıcısı için yeni arayüz
interface ReportRecipient {
    id: number;
    email: string;
}

// Kamera Görüntüleme Modalı
const CameraViewModal: React.FC<CameraModalProps & { t: (k: string) => string }> = ({ camera, onClose, t }) => {
  if (!camera) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-800 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 max-w-2xl w-full mx-2 sm:mx-4 border border-slate-700"
      >
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h3 className="text-sm sm:text-base md:text-lg font-semibold text-white">{camera.name}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div>
          {camera.imageUrl ? (
            <img 
              src={camera.imageUrl} 
              alt={`${camera.name} görüntüsü`}
              className="w-full h-auto max-h-[70vh] object-contain rounded-lg bg-black"
            />
          ) : (
            <div className="w-full h-48 bg-slate-800 rounded-lg flex items-center justify-center text-slate-500">{t('settings.noImage')}</div>
          )}
          <div className="mt-4 p-3 bg-slate-900/50 rounded-lg">
            <p className="text-sm text-slate-400">RTSP Adresi:</p>
            <p className="text-xs text-slate-200 font-mono break-all">{camera.rtsp}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};


const Settings = () => {
  const { t } = useLanguage();
  const storeRefresh = useStoreChange();
  const [activeTab, setActiveTab] = useState('profile');
  const [cameras, setCameras] = useState<CameraInfo[]>([]);
  const [siteName, setSiteName] = useState<string | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<CameraInfo | null>(null);

  const [profile, setProfile] = useState<{ username: string; email: string; full_name: string | null } | null>(null);
  const [profileForm, setProfileForm] = useState({ full_name: '', email: '' });
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Rapor gönderimi için state'ler
  const [recipients, setRecipients] = useState<ReportRecipient[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  
  // Şifre değiştirme için state'ler
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Kamera düzenleme için state'ler
  const [editingCameraId, setEditingCameraId] = useState<number | null>(null);
  const [cameraEditForm, setCameraEditForm] = useState({ name: '', type: '', location: '' });
  const [savingCameraId, setSavingCameraId] = useState<number | null>(null);
  const [cameraEditMsg, setCameraEditMsg] = useState<{ id: number; ok: boolean; text: string } | null>(null);

  const CAMERA_TYPES = ['Kapı', 'Giriş', 'Çıkış', 'Kişi Sayım', 'Isı Haritası', 'Kasa Analizi', 'Vitrin', 'Diğer'];

  const handleCameraEditStart = (cam: CameraInfo) => {
    setEditingCameraId(cam.id);
    setCameraEditForm({ name: cam.name, type: cam.type, location: cam.location || '' });
    setCameraEditMsg(null);
  };

  const handleCameraEditSave = async (camId: number) => {
    setSavingCameraId(camId);
    setCameraEditMsg(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl(`/api/settings/cameras/${camId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: cameraEditForm.name, type: cameraEditForm.type, location: cameraEditForm.location }),
      });
      if (res.ok) {
        const updated = await res.json();
        setCameras(prev => prev.map(c => c.id === camId ? { ...c, name: updated.name, type: updated.type, location: cameraEditForm.location } : c));
        setCameraEditMsg({ id: camId, ok: true, text: 'Kaydedildi' });
        setEditingCameraId(null);
      } else {
        setCameraEditMsg({ id: camId, ok: false, text: 'Hata oluştu' });
      }
    } catch {
      setCameraEditMsg({ id: camId, ok: false, text: 'Bağlantı hatası' });
    } finally {
      setSavingCameraId(null);
    }
  };

  // GÜNCELLENDİ: Sekme listesi
  const tabs = [
    { id: 'profile', label: t('settings.profileTab'), icon: User },
    { id: 'cameras', label: t('settings.camerasTab'), icon: Camera },
    { id: 'reporting', label: t('settings.reportingTab'), icon: Mail },
  ];

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const item = { hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } };

  // Profil verilerini API'den çek
  useEffect(() => {
    if (activeTab === 'profile') {
      const fetchProfile = async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(apiUrl('/api/settings/profile'), { headers: { Authorization: `Bearer ${token}` } });
          if (res.ok) {
            const data = await res.json();
            setProfile(data);
            setProfileForm({ full_name: data.full_name || '', email: data.email || '' });
          }
        } catch {
          setProfile(null);
        }
      };
      fetchProfile();
    }
  }, [activeTab]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage({ type: '', text: '' });
    setIsSavingProfile(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl('/api/settings/profile'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fullName: profileForm.full_name, email: profileForm.email }),
      });
      const data = await res.json();
      if (res.ok) {
        setProfileMessage({ type: 'success', text: t('settings.profileUpdated') });
        setProfile(data);
        // localStorage'daki user objesini güncelle → Layout header'da isim anında değişsin
        try {
          const stored = JSON.parse(localStorage.getItem('user') || '{}');
          stored.full_name = data.full_name || profileForm.full_name;
          stored.email = data.email || profileForm.email;
          localStorage.setItem('user', JSON.stringify(stored));
          // Layout'un re-render olması için storage event tetikle
          window.dispatchEvent(new Event('storage'));
        } catch { /* ignore */ }
      } else {
        setProfileMessage({ type: 'error', text: data.error || t('settings.updateFailed') });
      }
    } catch {
      setProfileMessage({ type: 'error', text: t('settings.serverError') });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Kamera verilerini API'den çek
  useEffect(() => {
    if (activeTab === 'cameras') {
      const fetchCameras = async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(apiUrl('/api/settings/cameras'), { headers: { Authorization: `Bearer ${token}` } });
          if (res.ok) {
            const data = await res.json();
            setSiteName(data.site_name || null);
            setCameras((data.cameras || []).map((c: { id: number; name: string; type: string; rtsp: string; imageUrl: string }) => ({
              id: c.id,
              name: c.name,
              type: c.type || 'Kapı',
              rtsp: c.rtsp || '',
              imageUrl: c.imageUrl || '',
            })));
          }
        } catch {
          setCameras([]);
        }
      };
      fetchCameras();
    }
  }, [activeTab, storeRefresh]);

  // Rapor alıcılarını çeken fonksiyon
  useEffect(() => {
    if (activeTab === 'reporting') {
      const fetchRecipients = async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(apiUrl('/api/settings/report-recipients'), {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const data = await response.json();
            setRecipients(data.recipients || data || []);
          }
        } catch (error) {
          console.error("Alıcılar çekilemedi:", error);
        }
      };
      fetchRecipients();
    }
  }, [activeTab]);

  // YENİ: E-posta ekleme fonksiyonu
  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    if (!newEmail) {
      setEmailError('E-posta adresi boş olamaz.');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(apiUrl('/api/settings/report-recipients'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ email: newEmail })
      });
      const data = await response.json();
      if (response.ok) {
        setRecipients([data, ...recipients]);
        setNewEmail('');
      } else {
        setEmailError(data.error || 'Bir hata oluştu.');
      }
    } catch {
      setEmailError('Sunucuya bağlanılamadı.');
    }
  };

  // YENİ: E-posta silme fonksiyonu
  const handleDeleteEmail = async (id: number) => {
    if (!window.confirm("Bu e-posta adresini silmek istediğinizden emin misiniz?")) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(apiUrl(`/api/settings/report-recipients/${id}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setRecipients(recipients.filter(r => r.id !== id));
      } else {
        alert(t('settings.deleteFailed'));
      }
    } catch {
      alert(t('settings.serverError'));
    }
  };
  
  // YENİ: Şifre değiştirme fonksiyonu
  const handlePasswordChange = async (e: React.FormEvent) => {
      e.preventDefault();
      setPasswordMessage({ type: '', text: '' });
      if (passwordData.newPassword !== passwordData.confirmPassword) {
          setPasswordMessage({ type: 'error', text: t('settings.passwordsMismatch') });
          return;
      }
      if (passwordData.newPassword.length < 6) {
          setPasswordMessage({ type: 'error', text: t('settings.passwordMinLength') });
          return;
      }
      setIsSavingPassword(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(apiUrl('/api/settings/password'), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword,
            })
        });
        const data = await response.json();
        if (response.ok) {
            setPasswordMessage({ type: 'success', text: data.message });
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } else {
            setPasswordMessage({ type: 'error', text: data.error || t('settings.passwordUpdateFailed') });
        }
      } catch {
          setPasswordMessage({ type: 'error', text: t('settings.passwordError') });
      } finally {
          setIsSavingPassword(false);
      }
  };

  // Sekme içeriğini render eden fonksiyon
  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 sm:space-y-6 md:space-y-8">
            <div>
                <h3 className="text-xs sm:text-sm md:text-base lg:text-lg font-semibold text-white mb-2 sm:mb-3 md:mb-4">{t('settings.profileInfo')}</h3>
                <form onSubmit={handleProfileSave} className="space-y-3 sm:space-y-4 max-w-md">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1 sm:mb-2">{t('settings.username')}</label>
                    <input type="text" value={profile?.username ?? ''} readOnly className="w-full bg-slate-800/50 border border-slate-600 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-slate-400 cursor-not-allowed text-xs sm:text-sm" />
                    <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1">{t('settings.usernameReadonly')}</p>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1 sm:mb-2">{t('settings.fullName')}</label>
                    <input type="text" value={profileForm.full_name} onChange={e => setProfileForm({ ...profileForm, full_name: e.target.value })} placeholder={t('settings.fullNamePlaceholder')} className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-white text-xs sm:text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1 sm:mb-2">{t('settings.email')}</label>
                    <input type="email" value={profileForm.email} onChange={e => setProfileForm({ ...profileForm, email: e.target.value })} placeholder={t('settings.emailPlaceholder')} className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-white text-xs sm:text-sm" required />
                  </div>
                  {profileMessage.text && (
                    <div className={`flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3 rounded-lg ${profileMessage.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      {profileMessage.type === 'success' ? <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />}
                      <span>{profileMessage.text}</span>
                    </div>
                  )}
                  <button type="submit" disabled={isSavingProfile} className="flex items-center gap-1.5 sm:gap-2 py-1.5 sm:py-2 px-3 sm:px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:bg-slate-600 text-xs sm:text-sm">
                    {isSavingProfile ? <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />}
                    {t('settings.saveProfile')}
                  </button>
                </form>
            </div>
            <div className="border-t border-slate-700 pt-4 sm:pt-6 md:pt-8">
                <h3 className="text-xs sm:text-sm md:text-base lg:text-lg font-semibold text-white mb-2 sm:mb-3 md:mb-4 flex items-center gap-1.5 sm:gap-2"><KeyRound className="w-4 h-4 sm:w-5 sm:h-5"/> {t('settings.changePassword')}</h3>
                <form onSubmit={handlePasswordChange} className="space-y-3 sm:space-y-4 max-w-md">
                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1 sm:mb-2">{t('settings.currentPassword')}</label>
                        <input type="password" value={passwordData.currentPassword} onChange={e => setPasswordData({...passwordData, currentPassword: e.target.value})} className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-white text-xs sm:text-sm" required />
                    </div>
                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1 sm:mb-2">{t('settings.newPassword')}</label>
                        <input type="password" value={passwordData.newPassword} onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})} className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-white text-xs sm:text-sm" required />
                    </div>
                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1 sm:mb-2">{t('settings.newPasswordConfirm')}</label>
                        <input type="password" value={passwordData.confirmPassword} onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})} className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-white text-xs sm:text-sm" required />
                    </div>
                    {passwordMessage.text && (
                        <div className={`flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3 rounded-lg ${passwordMessage.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                            {passwordMessage.type === 'success' ? <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"/> : <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"/>}
                            <span>{passwordMessage.text}</span>
                        </div>
                    )}
                    <button type="submit" disabled={isSavingPassword} className="w-full flex items-center justify-center gap-1.5 sm:gap-2 py-1.5 sm:py-2 px-3 sm:px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:bg-slate-600 text-xs sm:text-sm">
                        {isSavingPassword ? <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 animate-spin"/> : t('settings.updatePassword')}
                    </button>
                </form>
            </div>
          </motion.div>
        );

      case 'cameras':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 sm:space-y-4 md:space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 md:gap-4 mb-2 sm:mb-3 md:mb-4">
              <h3 className="text-xs sm:text-sm md:text-base lg:text-lg font-semibold text-white">{t('settings.cameraFlows')}</h3>
              {siteName && <span className="text-slate-400 text-[10px] sm:text-xs md:text-sm">{t('settings.setup')}: {siteName}</span>}
            </div>
            <p className="text-slate-400 text-[10px] sm:text-xs md:text-sm -mt-1 sm:-mt-2 mb-2 sm:mb-3 md:mb-4">{t('settings.cameraSetupDesc')}</p>
            <div className="space-y-3">
              {cameras.length === 0 && (
                <div className="px-4 py-8 text-center text-slate-500 text-sm">{t('settings.noCameras')}</div>
              )}
              {cameras.map((camera) => {
                const isEditing = editingCameraId === camera.id;
                const isSaving = savingCameraId === camera.id;
                const msg = cameraEditMsg?.id === camera.id ? cameraEditMsg : null;
                return (
                  <div key={camera.id} className="bg-slate-800/40 border border-slate-700/40 rounded-xl overflow-hidden transition-all">
                    {/* Üst satır: thumbnail + bilgi + düzenle butonu */}
                    <div className="flex items-center gap-3 p-3">
                      <button
                        onClick={() => setSelectedCamera(camera)}
                        className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-slate-700/60 border border-slate-600/50 hover:border-blue-500/60 transition-all hover:scale-105 relative group"
                        title="Kamera görüntüsü"
                      >
                        {camera.imageUrl ? (
                          <img src={camera.imageUrl} alt={camera.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Eye className="w-5 h-5 text-slate-400 group-hover:text-blue-400 transition-colors" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all rounded-xl" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{camera.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">{camera.type}</span>
                          {camera.location && (
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <MapPin className="w-3 h-3" />{camera.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => isEditing ? setEditingCameraId(null) : handleCameraEditStart(camera)}
                        className={`flex-shrink-0 p-2 rounded-lg transition-colors ${isEditing ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20'}`}
                        title={isEditing ? 'İptal' : 'Düzenle'}
                      >
                        {isEditing ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Düzenleme formu - sadece aktif kamerada görünür */}
                    {isEditing && (
                      <div className="border-t border-slate-700/40 p-3 bg-slate-900/30 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Kamera Adı</label>
                            <input
                              type="text"
                              value={cameraEditForm.name}
                              onChange={e => setCameraEditForm(f => ({ ...f, name: e.target.value }))}
                              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Kamera adı"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Kamera Tipi</label>
                            <select
                              value={cameraEditForm.type}
                              onChange={e => setCameraEditForm(f => ({ ...f, type: e.target.value }))}
                              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 [color-scheme:dark]"
                            >
                              {CAMERA_TYPES.map(ct => <option key={ct} value={ct}>{ct}</option>)}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> Konum / Yer
                          </label>
                          <input
                            type="text"
                            value={cameraEditForm.location}
                            onChange={e => setCameraEditForm(f => ({ ...f, location: e.target.value }))}
                            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Örn: Giriş Kapısı, 1. Kat, Mağaza Girişi..."
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          {msg && (
                            <span className={`text-xs flex items-center gap-1 ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                              {msg.ok ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                              {msg.text}
                            </span>
                          )}
                          {!msg && <span />}
                          <button
                            onClick={() => handleCameraEditSave(camera.id)}
                            disabled={isSaving}
                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            Kaydet
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        );

      // YENİ: Rapor gönderimi sekmesi
      case 'reporting':
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 sm:space-y-4 md:space-y-6">
                <h3 className="text-xs sm:text-sm md:text-base lg:text-lg font-semibold text-white mb-2 sm:mb-3 md:mb-4">{t('settings.reportRecipients')}</h3>
                <p className="text-slate-400 text-[10px] sm:text-xs md:text-sm -mt-1 sm:-mt-2 md:-mt-4 mb-3 sm:mb-4 md:mb-6">{t('settings.reportRecipientsDesc')}</p>
                <form onSubmit={handleAddEmail} className="flex flex-col sm:flex-row gap-2 items-start">
                    <div className="flex-grow w-full sm:w-auto">
                        <input 
                            type="email" 
                            value={newEmail} 
                            onChange={e => setNewEmail(e.target.value)} 
                            placeholder={t('settings.addEmailPlaceholder')} 
                            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-white text-xs sm:text-sm" 
                        />
                         {emailError && <p className="text-red-400 text-[10px] sm:text-xs md:text-sm mt-0.5 sm:mt-1">{emailError}</p>}
                    </div>
                    <button type="submit" className="w-full sm:w-auto px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-xs sm:text-sm">{t('settings.add')}</button>
                </form>

                <div className="border-t border-slate-700 pt-3 sm:pt-4 md:pt-6">
                    <h4 className="text-xs sm:text-sm md:text-base font-semibold text-white mb-2 sm:mb-3">{t('settings.currentRecipients')}</h4>
                    <ul className="space-y-1.5 sm:space-y-2">
                        {recipients.map(recipient => (
                            <li key={recipient.id} className="flex items-center justify-between bg-slate-700/30 p-2 sm:p-2.5 md:p-3 rounded-lg">
                                <span className="text-slate-200 text-xs sm:text-sm break-all pr-2">{recipient.email}</span>
                                <button onClick={() => handleDeleteEmail(recipient.id)} className="text-red-400 hover:text-red-300 p-1 rounded-full hover:bg-red-500/10 flex-shrink-0">
                                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                </button>
                            </li>
                        ))}
                        {recipients.length === 0 && <p className="text-slate-500 text-center py-3 sm:py-4 text-xs sm:text-sm">{t('settings.noRecipients')}</p>}
                    </ul>
                </div>
            </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <CameraViewModal camera={selectedCamera} onClose={() => setSelectedCamera(null)} t={t} />
      <div className="p-3 sm:p-4 md:p-5 lg:p-8">
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 sm:space-y-6 lg:space-y-8">
          <motion.div variants={item} className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg shadow-blue-500/25">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight">{t('settings.title')}</h1>
              <p className="text-sm text-slate-400">{t('settings.subtitleFull')}</p>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
            <motion.div variants={item} className="lg:col-span-1 bg-gradient-to-b from-slate-800/60 to-slate-900/60 backdrop-blur-xl p-4 rounded-2xl border border-slate-700/30 h-fit">
              <nav className="space-y-1.5">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                        activeTab === tab.id
                          ? 'bg-blue-500/15 border border-blue-500/30 text-blue-300'
                          : 'text-slate-300 hover:bg-slate-700/40 hover:text-white border border-transparent'
                      }`}
                    >
                      <Icon className={`w-5 h-5 flex-shrink-0 ${activeTab === tab.id ? 'text-blue-400' : 'text-slate-500'}`} />
                      <span className="font-medium text-sm">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </motion.div>

            <motion.div variants={item} className="lg:col-span-3 bg-gradient-to-b from-slate-800/60 to-slate-900/60 backdrop-blur-xl p-5 sm:p-6 lg:p-8 rounded-2xl border border-slate-700/30 min-h-[400px]">
              {renderTabContent()}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default Settings;

// --- END OF FULLY UPDATED FILE Settings.tsx ---