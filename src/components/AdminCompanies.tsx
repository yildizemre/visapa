import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Users,
  ChevronDown,
  ChevronRight,
  UserPlus,
  Shield,
  User as UserIcon,
  X,
  Store,
  Link2,
  Unlink,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { apiUrl } from '../lib/api';

interface CompanyUser {
  id: number;
  username: string;
  email: string;
  role: string;
  full_name?: string;
  company_id: number;
  company_role: string;
}

interface ChildCompany {
  id: number;
  name: string;
  parent_id: number | null;
  user_count: number;
  is_active: boolean;
}

interface PrimaryUser {
  id: number;
  username: string;
  full_name?: string | null;
  email: string;
}

interface CompanyItem {
  id: number;
  name: string;
  parent_id: number | null;
  primary_user_id?: number | null;
  primary_user?: PrimaryUser | null;
  logo_base64?: string | null;
  is_active: boolean;
  user_count: number;
  created_at?: string;
  children?: ChildCompany[];
  users?: CompanyUser[];
}

const AdminCompanies: React.FC = () => {
  const { t } = useLanguage();
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedChildId, setExpandedChildId] = useState<number | null>(null);
  const [companyUsers, setCompanyUsers] = useState<Record<number, CompanyUser[]>>({});

  // Modals
  const [companyModal, setCompanyModal] = useState<'add' | 'edit' | null>(null);
  const [editingCompany, setEditingCompany] = useState<CompanyItem | ChildCompany | null>(null);
  const [companyForm, setCompanyForm] = useState({ name: '', parent_id: null as number | null });

  const [childModal, setChildModal] = useState<'new' | 'link' | null>(null);
  const [childParentId, setChildParentId] = useState<number | null>(null);
  const [childForm, setChildForm] = useState({ name: '' });

  const [userModal, setUserModal] = useState<'add' | 'edit' | null>(null);
  const [editingUser, setEditingUser] = useState<CompanyUser | null>(null);
  const [userTargetCompanyId, setUserTargetCompanyId] = useState<number | null>(null);
  const [userForm, setUserForm] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    company_role: 'user' as 'store_manager' | 'user',
  });

  // DB Sahibi Atama
  const [assignModal, setAssignModal] = useState<number | null>(null); // company_id
  const [allUsers, setAllUsers] = useState<{id: number; username: string; full_name?: string; email: string}[]>([]);
  const [selectedPrimaryUserId, setSelectedPrimaryUserId] = useState<number | null>(null);
  const [assignLoading, setAssignLoading] = useState(false);

  const token = localStorage.getItem('token')?.trim() || '';

  const fetchAllUsers = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/api/admin/users?per_page=100'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAllUsers((data.users || []).map((u: {id: number; username: string; full_name?: string; email: string}) => ({ id: u.id, username: u.username, full_name: u.full_name, email: u.email })));
      }
    } catch (e) {
      console.error(e);
    }
  }, [token]);

  const handleAssignPrimary = async () => {
    if (!assignModal || !selectedPrimaryUserId) return;
    setAssignLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/admin/companies/${assignModal}/assign-primary`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user_id: selectedPrimaryUserId }),
      });
      if (res.ok) {
        setAssignModal(null);
        setSelectedPrimaryUserId(null);
        fetchCompanies();
      } else {
        const err = await res.json().catch(() => ({}));
        alert((err as { error?: string }).error || 'Hata olustu');
      }
    } catch {
      alert('Sunucuya ulasilamadi');
    } finally {
      setAssignLoading(false);
    }
  };

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/admin/companies'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.companies || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchCompanyUsers = useCallback(async (companyId: number) => {
    try {
      const res = await fetch(apiUrl(`/api/admin/companies/${companyId}/users`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCompanyUsers((prev) => ({ ...prev, [companyId]: data.users || [] }));
      }
    } catch (e) {
      console.error(e);
    }
  }, [token]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const toggleExpand = (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedChildId(null);
    } else {
      setExpandedId(id);
      setExpandedChildId(null);
      if (!companyUsers[id]) fetchCompanyUsers(id);
    }
  };

  const toggleChildExpand = (id: number) => {
    if (expandedChildId === id) {
      setExpandedChildId(null);
    } else {
      setExpandedChildId(id);
      if (!companyUsers[id]) fetchCompanyUsers(id);
    }
  };

  // ─── Company CRUD ───
  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = companyModal === 'add'
      ? '/api/admin/companies'
      : `/api/admin/companies/${editingCompany?.id}`;
    const method = companyModal === 'add' ? 'POST' : 'PUT';

    const res = await fetch(apiUrl(path), {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: companyForm.name }),
    });
    if (res.ok) {
      setCompanyModal(null);
      setEditingCompany(null);
      setCompanyForm({ name: '', parent_id: null });
      fetchCompanies();
    } else {
      const err = await res.json().catch(() => ({}));
      alert((err as { error?: string }).error || 'Hata oluştu');
    }
  };

  const handleDeleteCompany = async (id: number, name: string) => {
    if (!confirm(`"${name}" şirketini silmek istediğinize emin misiniz?`)) return;
    const res = await fetch(apiUrl(`/api/admin/companies/${id}`), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      fetchCompanies();
      if (expandedId === id) setExpandedId(null);
    } else {
      const err = await res.json().catch(() => ({}));
      alert((err as { error?: string }).error || 'Hata oluştu');
    }
  };

  // ─── Child Company (Alt Mağaza) ───
  const handleChildSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!childParentId) return;

    const res = await fetch(apiUrl(`/api/admin/companies/${childParentId}/children`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(childModal === 'link'
        ? { child_id: parseInt(childForm.name) }
        : { name: childForm.name }
      ),
    });
    if (res.ok) {
      setChildModal(null);
      setChildParentId(null);
      setChildForm({ name: '' });
      fetchCompanies();
    } else {
      const err = await res.json().catch(() => ({}));
      alert((err as { error?: string }).error || 'Hata oluştu');
    }
  };

  const handleUnlinkChild = async (parentId: number, childId: number, childName: string) => {
    if (!confirm(`"${childName}" alt mağazasını "${companies.find(c => c.id === parentId)?.name || ''}" grubundan ayırmak istediğinize emin misiniz?`)) return;
    const res = await fetch(apiUrl(`/api/admin/companies/${parentId}/children/${childId}`), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      fetchCompanies();
    } else {
      const err = await res.json().catch(() => ({}));
      alert((err as { error?: string }).error || 'Hata oluştu');
    }
  };

  // ─── Company User CRUD ───
  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userTargetCompanyId) return;

    const path = userModal === 'add'
      ? `/api/admin/companies/${userTargetCompanyId}/users`
      : `/api/admin/companies/${userTargetCompanyId}/users/${editingUser?.id}`;
    const method = userModal === 'add' ? 'POST' : 'PUT';

    const body: Record<string, string> = {
      username: userForm.username,
      email: userForm.email,
      full_name: userForm.full_name,
      company_role: userForm.company_role,
    };
    if (userForm.password) body.password = userForm.password;

    const res = await fetch(apiUrl(path), {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setUserModal(null);
      setEditingUser(null);
      setUserForm({ username: '', email: '', password: '', full_name: '', company_role: 'user' });
      fetchCompanyUsers(userTargetCompanyId);
      fetchCompanies();
    } else {
      const err = await res.json().catch(() => ({}));
      alert((err as { error?: string }).error || 'Hata oluştu');
    }
  };

  const handleDeleteUser = async (companyId: number, userId: number, username: string) => {
    if (!confirm(`"${username}" kullanıcısını silmek istediğinize emin misiniz?`)) return;
    const res = await fetch(apiUrl(`/api/admin/companies/${companyId}/users/${userId}`), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      fetchCompanyUsers(companyId);
      fetchCompanies();
    } else {
      const err = await res.json().catch(() => ({}));
      alert((err as { error?: string }).error || 'Hata oluştu');
    }
  };

  // ─── Reusable: User list for a company ───
  const renderUsers = (companyId: number) => {
    const users = companyUsers[companyId];
    if (!users) return <p className="text-slate-400 text-sm py-2">Yükleniyor...</p>;
    if (users.length === 0) return <p className="text-slate-500 text-sm py-2">Henüz kullanıcı yok</p>;
    return (
      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                {u.company_role === 'store_manager' ? <Shield className="w-4 h-4 text-white" /> : <UserIcon className="w-4 h-4 text-white" />}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{u.full_name || u.username}</p>
                <p className="text-xs text-slate-400">{u.email}</p>
              </div>
              <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${u.company_role === 'store_manager' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-600/50 text-slate-300'}`}>
                {u.company_role === 'store_manager' ? 'Mağaza Yöneticisi' : 'Kullanıcı'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => { setUserTargetCompanyId(companyId); setEditingUser(u); setUserForm({ username: u.username, email: u.email, password: '', full_name: u.full_name || '', company_role: u.company_role as 'store_manager' | 'user' }); setUserModal('edit'); }} className="p-1.5 rounded hover:bg-slate-600/50 text-slate-400 hover:text-blue-400"><Edit2 className="w-3.5 h-3.5" /></button>
              <button onClick={() => handleDeleteUser(companyId, u.id, u.username)} className="p-1.5 rounded hover:bg-slate-600/50 text-slate-400 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ─── Flat list of top-level companies for link dropdown (exclude self + already-children) ───
  const availableForLink = (parentId: number) => {
    const parentCompany = companies.find(c => c.id === parentId);
    const childIds = new Set(parentCompany?.children?.map(ch => ch.id) || []);
    return companies.filter(c => c.id !== parentId && !childIds.has(c.id));
  };

  return (
    <div className="p-2 sm:p-3 md:p-4 lg:p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              <Building2 className="w-6 h-6 text-blue-400" />
              Şirket Yönetimi
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">Şirketleri, alt mağazaları ve kullanıcıları yönetin</p>
          </div>
          <button onClick={() => { setCompanyForm({ name: '', parent_id: null }); setEditingCompany(null); setCompanyModal('add'); }} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium text-sm transition-colors">
            <Plus className="w-4 h-4" />
            Şirket Ekle
          </button>
        </div>

        {/* Company List */}
        {loading ? (
          <div className="p-8 text-center text-slate-400">{t('common.loading')}</div>
        ) : companies.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Henüz şirket eklenmemiş</p>
          </div>
        ) : (
          <div className="space-y-3">
            {companies.map((company) => (
              <div key={company.id} className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden">
                {/* Company Header Row */}
                <div className="flex items-center justify-between px-4 sm:px-5 py-4 cursor-pointer hover:bg-slate-700/20 transition-colors" onClick={() => toggleExpand(company.id)}>
                  <div className="flex items-center gap-3">
                    {expandedId === company.id ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{company.name}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{company.user_count} kullanıcı</span>
                        {(company.children?.length || 0) > 0 && (
                          <span className="flex items-center gap-1"><Store className="w-3 h-3" />{company.children!.length} alt mağaza</span>
                        )}
                        {company.primary_user && (
                          <span className="flex items-center gap-1 text-amber-400"><Shield className="w-3 h-3" />{company.primary_user.full_name || company.primary_user.username}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => { setAssignModal(company.id); setSelectedPrimaryUserId(company.primary_user_id || null); fetchAllUsers(); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600/80 hover:bg-amber-500 text-white text-xs font-medium transition-colors" title="DB Sahibi Ata">
                      <Shield className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">DB Ata</span>
                    </button>
                    <button onClick={() => { setChildParentId(company.id); setChildForm({ name: '' }); setChildModal('new'); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/80 hover:bg-purple-500 text-white text-xs font-medium transition-colors" title="Alt Mağaza Ekle">
                      <Store className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Alt Mağaza</span>
                    </button>
                    <button onClick={() => { setUserTargetCompanyId(company.id); setUserForm({ username: '', email: '', password: '', full_name: '', company_role: 'user' }); setEditingUser(null); setUserModal('add'); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs font-medium transition-colors" title="Kullanıcı Ekle">
                      <UserPlus className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Kullanıcı</span>
                    </button>
                    <button onClick={() => { setEditingCompany(company); setCompanyForm({ name: company.name, parent_id: null }); setCompanyModal('edit'); }} className="p-2 rounded-lg hover:bg-slate-600/50 text-slate-400 hover:text-blue-400 transition-colors"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteCompany(company.id, company.name)} className="p-2 rounded-lg hover:bg-slate-600/50 text-slate-400 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>

                {/* Expanded Content */}
                <AnimatePresence>
                  {expandedId === company.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="border-t border-slate-700/50 overflow-hidden">
                      <div className="px-4 sm:px-5 py-3 bg-slate-900/30 space-y-4">
                        {/* Children (Alt Mağazalar) */}
                        {(company.children?.length || 0) > 0 && (
                          <div>
                            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <Store className="w-3.5 h-3.5" /> Alt Mağazalar
                            </h3>
                            <div className="space-y-2">
                              {company.children!.map((child) => (
                                <div key={child.id} className="rounded-lg bg-slate-800/40 border border-slate-700/40 overflow-hidden">
                                  <div className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-slate-700/20" onClick={() => toggleChildExpand(child.id)}>
                                    <div className="flex items-center gap-2.5">
                                      {expandedChildId === child.id ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                                      <Store className="w-4 h-4 text-purple-400" />
                                      <span className="text-sm font-medium text-white">{child.name}</span>
                                      <span className="text-xs text-slate-500">{child.user_count} kullanıcı</span>
                                    </div>
                                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                      <button onClick={() => { setUserTargetCompanyId(child.id); setUserForm({ username: '', email: '', password: '', full_name: '', company_role: 'user' }); setEditingUser(null); setUserModal('add'); }} className="p-1.5 rounded hover:bg-slate-600/50 text-slate-400 hover:text-emerald-400" title="Kullanıcı Ekle"><UserPlus className="w-3.5 h-3.5" /></button>
                                      <button onClick={() => handleUnlinkChild(company.id, child.id, child.name)} className="p-1.5 rounded hover:bg-slate-600/50 text-slate-400 hover:text-orange-400" title="Gruptan Ayır"><Unlink className="w-3.5 h-3.5" /></button>
                                      <button onClick={() => handleDeleteCompany(child.id, child.name)} className="p-1.5 rounded hover:bg-slate-600/50 text-slate-400 hover:text-red-400" title="Sil"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                  </div>
                                  {/* Child users */}
                                  <AnimatePresence>
                                    {expandedChildId === child.id && (
                                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="border-t border-slate-700/30 px-3 py-2 bg-slate-900/20 overflow-hidden">
                                        {renderUsers(child.id)}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Kullanıcılar */}
                        <div>
                          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" /> Kullanıcılar
                          </h3>
                          {renderUsers(company.id)}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ─── Company Modal ─── */}
      {companyModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md p-6 relative">
            <button onClick={() => { setCompanyModal(null); setEditingCompany(null); }} className="absolute top-3 right-3 p-1 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            <h2 className="text-xl font-bold text-white mb-4">{companyModal === 'add' ? 'Yeni Şirket' : 'Şirketi Düzenle'}</h2>
            <form onSubmit={handleCompanySubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Şirket Adı</label>
                <input type="text" value={companyForm.name} onChange={(e) => setCompanyForm((f) => ({ ...f, name: e.target.value }))} required placeholder="Örn: Emilio Lara" className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium">{companyModal === 'add' ? 'Oluştur' : 'Kaydet'}</button>
                <button type="button" onClick={() => { setCompanyModal(null); setEditingCompany(null); }} className="flex-1 py-2.5 bg-slate-600 hover:bg-slate-700 rounded-lg text-white">İptal</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ─── Child (Alt Mağaza) Modal ─── */}
      {childModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md p-6 relative">
            <button onClick={() => { setChildModal(null); setChildParentId(null); }} className="absolute top-3 right-3 p-1 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Store className="w-5 h-5 text-purple-400" />
              Alt Mağaza Ekle
            </h2>
            {/* Toggle between new/link */}
            <div className="flex gap-2 mb-4">
              <button onClick={() => setChildModal('new')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${childModal === 'new' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}>
                <Plus className="w-4 h-4 inline mr-1" />Yeni Oluştur
              </button>
              <button onClick={() => setChildModal('link')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${childModal === 'link' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}>
                <Link2 className="w-4 h-4 inline mr-1" />Mevcut Bağla
              </button>
            </div>
            <form onSubmit={handleChildSubmit} className="space-y-4">
              {childModal === 'new' ? (
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Alt Mağaza Adı</label>
                  <input type="text" value={childForm.name} onChange={(e) => setChildForm({ name: e.target.value })} required placeholder="Örn: Outlet Şubesi" className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400" />
                </div>
              ) : (
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Mevcut Şirketi Seçin</label>
                  <select value={childForm.name} onChange={(e) => setChildForm({ name: e.target.value })} required className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white">
                    <option value="">-- Şirket Seçin --</option>
                    {childParentId && availableForLink(childParentId).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">Seçtiğiniz şirket bu gruba alt mağaza olarak bağlanır</p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium">{childModal === 'new' ? 'Oluştur' : 'Bağla'}</button>
                <button type="button" onClick={() => { setChildModal(null); setChildParentId(null); }} className="flex-1 py-2.5 bg-slate-600 hover:bg-slate-700 rounded-lg text-white">İptal</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ─── DB Sahibi Atama Modal ─── */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md p-6 relative">
            <button onClick={() => { setAssignModal(null); setSelectedPrimaryUserId(null); }} className="absolute top-3 right-3 p-1 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-400" />
              DB Sahibi Ata
            </h2>
            <p className="text-sm text-slate-400 mb-4">
              Bu kullanıcının verileri (kameralar, sayaçlar, ısı haritası vb.) şirkete bağlanır.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Kullanıcı Seçin</label>
                <select
                  value={selectedPrimaryUserId ?? ''}
                  onChange={(e) => setSelectedPrimaryUserId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                  <option value="">-- Kullanıcı Seçin --</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.full_name || u.username} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleAssignPrimary}
                  disabled={!selectedPrimaryUserId || assignLoading}
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-lg text-white font-medium"
                >
                  {assignLoading ? 'Atanıyor...' : 'Ata'}
                </button>
                <button type="button" onClick={() => { setAssignModal(null); setSelectedPrimaryUserId(null); }} className="flex-1 py-2.5 bg-slate-600 hover:bg-slate-700 rounded-lg text-white">İptal</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ─── User Modal ─── */}
      {userModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md p-6 relative">
            <button onClick={() => { setUserModal(null); setEditingUser(null); }} className="absolute top-3 right-3 p-1 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            <h2 className="text-xl font-bold text-white mb-4">{userModal === 'add' ? 'Yeni Kullanıcı' : 'Kullanıcıyı Düzenle'}</h2>
            <form onSubmit={handleUserSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Kullanıcı Adı</label>
                <input type="text" value={userForm.username} onChange={(e) => setUserForm((f) => ({ ...f, username: e.target.value }))} required disabled={userModal === 'edit'} placeholder="Örn: lale" className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 disabled:opacity-50" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">E-posta</label>
                <input type="email" value={userForm.email} onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))} required placeholder="Örn: lale@vislivis.com" className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Şifre{userModal === 'edit' && ' (boş bırakırsanız değişmez)'}</label>
                <input type="password" value={userForm.password} onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))} required={userModal === 'add'} placeholder="••••••" className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Ad Soyad</label>
                <input type="text" value={userForm.full_name} onChange={(e) => setUserForm((f) => ({ ...f, full_name: e.target.value }))} placeholder="Örn: Lale Yılmaz" className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Rol</label>
                <select value={userForm.company_role} onChange={(e) => setUserForm((f) => ({ ...f, company_role: e.target.value as 'store_manager' | 'user' }))} className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white">
                  <option value="store_manager">Mağaza Yöneticisi (tam yetki)</option>
                  <option value="user">Kullanıcı (sadece görüntüleme)</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  {userForm.company_role === 'store_manager' ? 'Tüm ayarları değiştirebilir, kamera ekleyebilir, verileri yönetebilir. Grup şirketleri arasında geçiş yapabilir.' : 'Sadece verileri görüntüleyebilir, hiçbir ayar değiştiremez'}
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium">{userModal === 'add' ? 'Oluştur' : 'Kaydet'}</button>
                <button type="button" onClick={() => { setUserModal(null); setEditingUser(null); }} className="flex-1 py-2.5 bg-slate-600 hover:bg-slate-700 rounded-lg text-white">İptal</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminCompanies;
