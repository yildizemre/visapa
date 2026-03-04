import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Database, Users, Map, Clock, Save, XCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { apiUrl } from '../lib/api';

type TabKey = 'customers' | 'heatmaps' | 'queues';

interface CustomerRow {
  hour: string;
  entered: number;
  exited: number;
  editable_id: number | null;
}

interface HeatmapRow {
  hour: string;
  zone: string;
  totalVisitors: number;
  avgDwellTime: number;
  editable_id: number | null;
}

interface QueueRow {
  hour: string;
  cashier_id: string;
  totalCustomers: number;
  avgWaitTime: number;
  editable_id: number | null;
}

interface UserOption {
  id: number;
  label: string;
}

const AdminDataEditor: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('customers');
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | 'all'>('all');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const [customerRows, setCustomerRows] = useState<CustomerRow[]>([]);
  const [heatmapRows, setHeatmapRows] = useState<HeatmapRow[]>([]);
  const [queueRows, setQueueRows] = useState<QueueRow[]>([]);

  const [edited, setEdited] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Admin check
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

  // Admin kullanıcı listesi (mağaza seçimi için)
  useEffect(() => {
    if (!isAdmin) return;
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token')?.trim();
        const params = new URLSearchParams({ page: '1', per_page: '200' });
        const res = await fetch(apiUrl(`/api/admin/users?${params.toString()}`), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return;
        const data = await res.json();
        const list = (data.users ?? []).map((u: any) => ({
          id: u.id,
          label: u.full_name || u.username || u.email || `User #${u.id}`,
        }));
        setUsers(list);
      } catch {
        setUsers([]);
      }
    };
    fetchUsers();
  }, [isAdmin]);

  // Redirect non-admins
  useEffect(() => {
    if (isAdmin === false) navigate('/dashboard', { replace: true });
  }, [isAdmin, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    const fetchData = async () => {
      setLoading(true);
      setEdited({});
      try {
        const token = localStorage.getItem('token')?.trim();
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

        if (activeTab === 'customers') {
          const params = new URLSearchParams({ date_from: date, camera_id: 'all' });
          if (selectedUserId !== 'all') params.append('store_id', String(selectedUserId));
          const url = apiUrl(`/api/analytics/customers/flow-data?${params.toString()}`);
          const res = await fetch(url, { headers });
          if (res.ok) {
            const json = await res.json();
            const flow = json.data?.[date]?.hourly_data ?? {};
            const rows: CustomerRow[] = [];
            for (let h = 10; h <= 22; h += 1) {
              const key = `${String(h).padStart(2, '0')}:00`;
              const value: any = (flow as any)[key] || {};
              rows.push({
                hour: key,
                entered: value.entered ?? 0,
                exited: value.exited ?? 0,
                editable_id: value.editable_id ?? null,
              });
            }
            setCustomerRows(rows);
          } else {
            setCustomerRows([]);
          }
        } else if (activeTab === 'heatmaps') {
          const params = new URLSearchParams({ date });
          if (selectedUserId !== 'all') params.append('store_id', String(selectedUserId));
          const url = apiUrl(`/api/analytics/heatmaps/daily-summary?${params.toString()}`);
          const res = await fetch(url, { headers });
          if (res.ok) {
            const json = await res.json();
            const hourlySummary = json.hourlySummary ?? [];
            const zoneMap = json.zonePerformance ?? [];
            const defaultZone = (zoneMap[0]?.zone as string | undefined) ?? 'genel';
            const rows: HeatmapRow[] = hourlySummary.map((h: any) => ({
              hour: String(h.hour).padStart(2, '0'),
              zone: defaultZone,
              totalVisitors: h.totalVisitors ?? 0,
              avgDwellTime: h.avgDwellTime ?? 0,
              editable_id: h.editable_id ?? null,
            }));
            setHeatmapRows(
              rows
                .filter((r) => {
                  const h = parseInt(r.hour, 10);
                  return h >= 10 && h <= 22;
                })
                .sort((a, b) => a.hour.localeCompare(b.hour)),
            );
          } else {
            setHeatmapRows([]);
          }
        } else if (activeTab === 'queues') {
          const params = new URLSearchParams({ date });
          if (selectedUserId !== 'all') params.append('store_id', String(selectedUserId));
          const url = apiUrl(`/api/analytics/queues/daily-summary?${params.toString()}`);
          const res = await fetch(url, { headers });
          if (res.ok) {
            const json = await res.json();
            const hourlySummary = json.hourlySummary ?? [];
            const rows: QueueRow[] = hourlySummary.map((h: any) => ({
              hour: String(h.hour).padStart(2, '0'),
              cashier_id: h.cashier_id ?? 'All',
              totalCustomers: h.totalCustomers ?? 0,
              avgWaitTime: h.avgWaitTime ?? 0,
              editable_id: h.editable_id ?? null,
            }));
            setQueueRows(
              rows
                .filter((r) => {
                  const h = parseInt(r.hour, 10);
                  return h >= 10 && h <= 22;
                })
                .sort((a, b) => a.hour.localeCompare(b.hour)),
            );
          } else {
            setQueueRows([]);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab, date, isAdmin, selectedUserId]);

  const hasChanges = useMemo(() => Object.keys(edited).length > 0, [edited]);

  const handleChange = (key: string, field: string, value: string) => {
    setEdited((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] ?? {}),
        [field]: value,
      },
    }));
  };

  const handleCancel = () => setEdited({});

  const handleSave = async () => {
    if (!hasChanges) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('token')?.trim();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const promises: Promise<any>[] = [];

      if (activeTab === 'customers') {
        // Sadece belirli kullanıcı seçiliyken saatlik toplamı set et
        if (selectedUserId === 'all') {
          setSaving(false);
          return;
        }
        Object.entries(edited).forEach(([hour, change]) => {
          if (!change) return;
          const body: any = { date, hour };
          if (change.entered !== undefined) body.entered = Number(change.entered);
          if (change.exited !== undefined) body.exited = Number(change.exited);
          // Sadece date+hour varsa değişiklik yok
          if (Object.keys(body).length <= 2) return;
          const qs = `?store_id=${selectedUserId}`;
          promises.push(
            fetch(apiUrl(`/api/analytics/customers/hourly-edit${qs}`), {
              method: 'PUT',
              headers,
              body: JSON.stringify(body),
            }),
          );
        });
      } else if (activeTab === 'heatmaps') {
        heatmapRows.forEach((row) => {
          const change = edited[row.hour];
          if (!change || !row.editable_id) return;
          const body: any = {};
          if (change.totalVisitors !== undefined) body.totalVisitors = Number(change.totalVisitors);
          if (change.avgDwellTime !== undefined) body.avgDwellTime = Number(change.avgDwellTime);
          if (Object.keys(body).length === 0) return;
          const qs = selectedUserId === 'all' ? '' : `?store_id=${selectedUserId}`;
          promises.push(
            fetch(apiUrl(`/api/analytics/heatmaps/record/${row.editable_id}${qs}`), {
              method: 'PUT',
              headers,
              body: JSON.stringify(body),
            }),
          );
        });
      } else if (activeTab === 'queues') {
        queueRows.forEach((row) => {
          const change = edited[row.hour];
          if (!change || !row.editable_id) return;
          const body: any = {};
          if (change.totalCustomers !== undefined) body.totalCustomers = Number(change.totalCustomers);
          if (change.avgWaitTime !== undefined) body.avgWaitTime = Number(change.avgWaitTime);
          if (Object.keys(body).length === 0) return;
          const qs = selectedUserId === 'all' ? '' : `?store_id=${selectedUserId}`;
          promises.push(
            fetch(apiUrl(`/api/analytics/queues/record/${row.editable_id}${qs}`), {
              method: 'PUT',
              headers,
              body: JSON.stringify(body),
            }),
          );
        });
      }

      await Promise.all(promises);
      setEdited({});
    } finally {
      setSaving(false);
    }
  };

  if (isAdmin === null) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[200px]">
        <div className="animate-pulse text-slate-400">Yükleniyor...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const renderTable = () => {
    if (activeTab === 'customers') {
      const canEdit = selectedUserId !== 'all';
      return (
        <table className="w-full text-xs sm:text-sm text-left">
          <thead className="text-slate-400 bg-slate-700/50">
            <tr>
              <th className="px-3 py-2">Saat</th>
              <th className="px-3 py-2 text-center">Giren</th>
              <th className="px-3 py-2 text-center">Çıkan</th>
            </tr>
          </thead>
          <tbody>
            {customerRows.map((row) => {
              const editedRow = edited[row.hour] ?? {};
              const entered = editedRow.entered ?? row.entered;
              const exited = editedRow.exited ?? row.exited;
              return (
                <tr key={row.hour} className="border-b border-slate-700">
                  <td className="px-3 py-2 text-white whitespace-nowrap">
                    {row.hour} - {row.hour.replace(':00', ':59')}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="number"
                      className="w-20 bg-slate-800 text-slate-100 text-center rounded border border-slate-600 px-1 py-0.5"
                      value={entered}
                      disabled={!canEdit}
                      onChange={(e) => handleChange(row.hour, 'entered', e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="number"
                      className="w-20 bg-slate-800 text-slate-100 text-center rounded border border-slate-600 px-1 py-0.5"
                      value={exited}
                      disabled={!canEdit}
                      onChange={(e) => handleChange(row.hour, 'exited', e.target.value)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      );
    }

    if (activeTab === 'heatmaps') {
      return (
        <table className="w-full text-xs sm:text-sm text-left">
          <thead className="text-slate-400 bg-slate-700/50">
            <tr>
              <th className="px-3 py-2">Saat</th>
              <th className="px-3 py-2">Zone</th>
              <th className="px-3 py-2 text-center">Ziyaretçi</th>
              <th className="px-3 py-2 text-center">Ort. Bekleme (sn)</th>
            </tr>
          </thead>
          <tbody>
            {heatmapRows.map((row) => {
              const editedRow = edited[row.hour] ?? {};
              const totalVisitors = editedRow.totalVisitors ?? row.totalVisitors;
              const avgDwellTime = editedRow.avgDwellTime ?? row.avgDwellTime;
              return (
                <tr key={row.hour} className="border-b border-slate-700">
                  <td className="px-3 py-2 text-white whitespace-nowrap">
                    {row.hour}:00 - {row.hour}:59
                  </td>
                  <td className="px-3 py-2 text-slate-200">{row.zone}</td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="number"
                      className="w-20 bg-slate-800 text-slate-100 text-center rounded border border-slate-600 px-1 py-0.5"
                      value={totalVisitors}
                      onChange={(e) => handleChange(row.hour, 'totalVisitors', e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="number"
                      className="w-24 bg-slate-800 text-slate-100 text-center rounded border border-slate-600 px-1 py-0.5"
                      value={avgDwellTime}
                      onChange={(e) => handleChange(row.hour, 'avgDwellTime', e.target.value)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      );
    }

    return (
      <table className="w-full text-xs sm:text-sm text-left">
        <thead className="text-slate-400 bg-slate-700/50">
          <tr>
            <th className="px-3 py-2">Saat</th>
            <th className="px-3 py-2">Kasa</th>
            <th className="px-3 py-2 text-center">Toplam Müşteri</th>
            <th className="px-3 py-2 text-center">Ort. Bekleme (sn)</th>
          </tr>
        </thead>
        <tbody>
          {queueRows.map((row) => {
            const editedRow = edited[row.hour] ?? {};
            const totalCustomers = editedRow.totalCustomers ?? row.totalCustomers;
            const avgWaitTime = editedRow.avgWaitTime ?? row.avgWaitTime;
            return (
              <tr key={`${row.hour}-${row.cashier_id}`} className="border-b border-slate-700">
                <td className="px-3 py-2 text-white whitespace-nowrap">
                  {row.hour}:00 - {row.hour}:59
                </td>
                <td className="px-3 py-2 text-slate-200">{row.cashier_id}</td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="number"
                    className="w-24 bg-slate-800 text-slate-100 text-center rounded border border-slate-600 px-1 py-0.5"
                    value={totalCustomers}
                    onChange={(e) => handleChange(row.hour, 'totalCustomers', e.target.value)}
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="number"
                    className="w-24 bg-slate-800 text-slate-100 text-center rounded border border-slate-600 px-1 py-0.5"
                    value={avgWaitTime}
                    onChange={(e) => handleChange(row.hour, 'avgWaitTime', e.target.value)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-400" />
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-white">Veri Düzenleme (Admin)</h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Müşteri sayımı, yoğunluk ve kuyruk verilerini saatlik olarak güncelle.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Kullanıcı seçici - custom dropdown, koyu tema */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setUserDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 hover:bg-slate-700 text-xs sm:text-sm min-w-[160px] justify-between"
            >
              <span className="flex items-center gap-2 truncate">
                <Users className="w-4 h-4 text-slate-400" />
                <span className="truncate max-w-[120px]">
                  {selectedUserId === 'all'
                    ? 'Tüm Kullanıcılar'
                    : users.find((u) => u.id === selectedUserId)?.label || 'Seçili kullanıcı yok'}
                </span>
              </span>
              <span className={`transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {userDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setUserDropdownOpen(false)}
                  aria-hidden
                />
                <div className="absolute right-0 mt-1 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 max-h-72 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUserId('all');
                      setUserDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs sm:text-sm hover:bg-slate-700/60 ${
                      selectedUserId === 'all' ? 'bg-blue-600/30 text-blue-300' : 'text-slate-100'
                    }`}
                  >
                    Tüm Kullanıcılar
                  </button>
                  {users.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setSelectedUserId(u.id);
                        setUserDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs sm:text-sm hover:bg-slate-700/60 ${
                        selectedUserId === u.id ? 'bg-blue-600/30 text-blue-300' : 'text-slate-100'
                      }`}
                    >
                      {u.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5">
            <Calendar className="w-4 h-4 text-slate-400 mr-2" />
            <input
              type="date"
              className="bg-transparent text-sm text-white focus:outline-none [color-scheme:dark]"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          {hasChanges && (
            <>
              <button
                onClick={handleCancel}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs sm:text-sm bg-slate-700 hover:bg-slate-600 text-slate-100"
              >
                <XCircle className="w-4 h-4" />
                İptal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('customers')}
          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs sm:text-sm ${
            activeTab === 'customers'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
          }`}
        >
          <Users className="w-4 h-4" />
          Müşteri Sayımı
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('heatmaps')}
          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs sm:text-sm ${
            activeTab === 'heatmaps'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
          }`}
        >
          <Map className="w-4 h-4" />
          Yoğunluk (Heatmap)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('queues')}
          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs sm:text-sm ${
            activeTab === 'queues'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
          }`}
        >
          <Clock className="w-4 h-4" />
          Günlük Kuyruk Analizi
        </button>
      </div>

      <motion.div
        key={activeTab + date}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 sm:p-4 overflow-x-auto"
      >
        {loading ? (
          <div className="text-center py-10 text-slate-300">Veriler yükleniyor...</div>
        ) : (
          renderTable()
        )}
      </motion.div>
    </div>
  );
};

export default AdminDataEditor;

