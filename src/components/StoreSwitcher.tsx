import React, { useState, useEffect, useCallback } from 'react';
import { Store, ChevronDown, RefreshCw } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { apiUrl } from '../lib/api';

interface CompanyOption {
  id: number;
  name: string;
}

const StoreSwitcher: React.FC = () => {
  const { t } = useLanguage();
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [currentCompanyId, setCurrentCompanyId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const token = localStorage.getItem('token')?.trim() || '';

  const fetchCompanies = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(apiUrl('/api/auth/me/companies'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.companies || []);
      }
    } catch {
      setCompanies([]);
    }
  }, [token]);

  useEffect(() => {
    fetchCompanies();
    // Mevcut company_id'yi user verisinden al
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setCurrentCompanyId(user.company_id || null);
      } catch { /* ignore */ }
    }
  }, [fetchCompanies]);

  // 1'den az şirket varsa gösterme (geçiş yapacak bir yer yok)
  if (companies.length <= 1) return null;

  const handleSwitch = async (companyId: number) => {
    if (companyId === currentCompanyId) {
      setOpen(false);
      return;
    }
    setSwitching(true);
    try {
      const res = await fetch(apiUrl('/api/auth/me/switch-company'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ company_id: companyId }),
      });
      if (res.ok) {
        const data = await res.json();
        // Yeni token ve user bilgisini kaydet
        if (data.access_token) localStorage.setItem('token', data.access_token);
        if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
        setCurrentCompanyId(companyId);
        setOpen(false);
        // Sayfayı yenile ki tüm veriler yeni şirkete göre yüklensin
        window.location.reload();
      } else {
        const err = await res.json().catch(() => ({}));
        alert((err as { error?: string }).error || 'Şirket değiştirilemedi');
      }
    } catch {
      alert('Sunucuya ulaşılamadı');
    } finally {
      setSwitching(false);
    }
  };

  const currentCompany = companies.find((c) => c.id === currentCompanyId);
  const label = currentCompany?.name || t('storeSwitcher.all');

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={switching}
        className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-slate-200 hover:bg-slate-600/50 text-xs sm:text-sm disabled:opacity-50"
      >
        {switching ? <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" /> : <Store className="w-3 h-3 sm:w-4 sm:h-4" />}
        <span className="max-w-[100px] sm:max-w-[160px] truncate">{label}</span>
        <ChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 top-full mt-1 py-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 min-w-[200px]">
            {companies.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSwitch(c.id)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-700/50 ${currentCompanyId === c.id ? 'bg-blue-500/20 text-blue-400' : 'text-slate-300'}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default StoreSwitcher;
