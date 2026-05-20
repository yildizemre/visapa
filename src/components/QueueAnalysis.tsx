// QueueAnalysis.tsx dosyasının TAMAMI

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Clock, 
  Timer,
  BarChart2,
  Filter,
  Save,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { apiUrl } from '../lib/api';
import { useStoreChange } from '../hooks/useStoreChange';
import {
  Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart,
} from 'recharts';
import InsightsPanel from './shared/InsightsPanel';
import CameraViewer from './shared/CameraViewer';
import DateRangePicker from './shared/DateRangePicker';

interface HourlySummary {
  hour: string;
  totalCustomers: number;
  avgWaitTime: number;
  minWaitTime: number;
  maxWaitTime: number;
  editable_id: number | null;
}
interface OverallStats {
  totalCustomers: number;
  avgWaitTime: number;
  maxWaitTime: number;
}
interface WaitTimeDistribution {
  range: string;
  count: number;
}
interface CashierPerformance {
  cashier: string;
  avgWait: number;
  totalCustomers: number;
}

type EditableFields = {
    totalCustomers?: number | '';
    avgWaitTime?: number | '';
};

const QueueAnalysis = () => {
  const { t } = useLanguage();
  const storeRefresh = useStoreChange();
  
  const [dailyData, setDailyData] = useState<{
    overallStats: OverallStats;
    hourlySummary: HourlySummary[];
    waitTimeDistribution: WaitTimeDistribution[];
    cashierPerformance: CashierPerformance[];
    allCashiers: string[];
    availableCashiers: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [selectedCashier, setSelectedCashier] = useState<string>('all');
  const [isAdmin, setIsAdmin] = useState(false);

  const [editedData, setEditedData] = useState<{ [hour: string]: EditableFields }>({});
  const [isSaving, setIsSaving] = useState(false);
  const hasChanges = Object.keys(editedData).length > 0;
  const isEditingDisabled = selectedCashier !== 'all'; 

  const chartColors = { primary: '#3b82f6', secondary: '#f97316', accent: '#f43f5e', danger: '#e11d48', purple: '#8b5cf6', teal: '#06b6d4', emerald: '#10b981', pink: '#ec4899' };

  const tooltipStyle = {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    borderRadius: '12px',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
    padding: '12px 16px',
  };

  const formatWaitTime = (waitTimeInSeconds: number) => {
    if (!waitTimeInSeconds || waitTimeInSeconds < 1) return '0 sn';
    if (waitTimeInSeconds < 60) return `${Math.round(waitTimeInSeconds)} sn`;
    const minutes = Math.floor(waitTimeInSeconds / 60);
    const seconds = Math.round(waitTimeInSeconds % 60);
    return `${minutes} dk ${seconds} sn`;
  };

  const fetchDailySummary = async (showLoading = true, sDate?: string, eDate?: string) => {
    if (showLoading) setLoading(true);
    setEditedData({});
    try {
      const token = localStorage.getItem('token');
      const from = sDate ?? startDate;
      const to = eDate ?? endDate;
      const params = new URLSearchParams({ date_from: from, date_to: to });
      if (selectedCashier !== 'all') params.append('cashier_ids', selectedCashier);
      const response = await fetch(apiUrl(`/api/analytics/queues/daily-summary?${params}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDailyData(data);
      } else {
        setDailyData(null);
      }
    } catch (error) {
      console.error('Günlük kuyruk özeti çekme hatası:', error);
      setDailyData(null);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    const userString = localStorage.getItem('user');
    if (userString) {
        try {
            const user = JSON.parse(userString);
            setIsAdmin(user && user.role === 'admin');
        } catch {
            setIsAdmin(false);
        }
    }
    fetchDailySummary();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, startDate, endDate, selectedCashier, storeRefresh]);

  const handleDataChange = (hour: string, field: 'avgWaitTime' | 'totalCustomers', value: string) => {
    if (value === '') {
      setEditedData(prev => ({ ...prev, [hour]: { ...prev[hour], [field]: '' } }));
      return;
    }
    const numericValue = field === 'totalCustomers' ? parseInt(value, 10) : parseFloat(value);
    if (!isNaN(numericValue) && numericValue >= 0) {
      setEditedData(prev => ({ ...prev, [hour]: { ...prev[hour], [field]: numericValue } }));
    }
  };

  const handleCancelChanges = () => {
    setEditedData({});
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    const token = localStorage.getItem('token');

    const updatePromises = Object.entries(editedData).map(([hour, changes]) => {
      const recordId = filteredAndShiftedDailyData?.find(h => h.hour === hour)?.editable_id;
      if (!recordId) return Promise.resolve({ success: false, hour });

      const cleanedChanges: Partial<EditableFields> = {};
      if (changes.totalCustomers !== '' && changes.totalCustomers !== undefined) {
        cleanedChanges.totalCustomers = changes.totalCustomers;
      }
      if (changes.avgWaitTime !== '' && changes.avgWaitTime !== undefined) {
        cleanedChanges.avgWaitTime = changes.avgWaitTime;
      }

      if (Object.keys(cleanedChanges).length === 0) {
        return Promise.resolve({ success: true, hour });
      }

      return fetch(apiUrl(`/api/analytics/queues/record/${recordId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(cleanedChanges)
      }).then(res => res.ok);
    });
    
    await Promise.all(updatePromises);
    setIsSaving(false);
    await fetchDailySummary(false);
  };
  
  // GÜNCELLEME: Filtrelenmiş veri (sadece 10:00-22:00 arası)
  const filteredAndShiftedDailyData = useMemo(() => {
    if (!dailyData) return [];
    return dailyData.hourlySummary
      .map(summary => ({
        ...summary,
        hour: String(parseInt(summary.hour, 10)).padStart(2, '0'),
      }))
      .filter(summary => {
          const hour = parseInt(summary.hour, 10);
          return hour >= 10 && hour <= 22;
      })
      .sort((a, b) => parseInt(a.hour, 10) - parseInt(b.hour, 10));
  }, [dailyData]);

  if (loading) {
    return (<div className="p-6 text-white text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>{t('queue.loading')}</div>);
  }

  return (
    <div className="p-3 sm:p-4 md:p-5 lg:p-8">
      <motion.div initial="hidden" animate="show" className="space-y-5 sm:space-y-6 lg:space-y-8">
        <motion.div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25">
                <Timer className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight">{t('queue.title')}</h1>
            </div>
            <p className="text-sm text-slate-400 ml-12">{t('queue.subtitle')}</p>
          </div>
          <div className="w-full xl:w-auto flex flex-col sm:flex-row gap-3 flex-wrap">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={(d) => { setStartDate(d); setSelectedDate(d); }}
              onEndDateChange={setEndDate}
              onApply={() => fetchDailySummary(true, startDate, endDate)}
            />
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Filter className="w-5 h-5 text-slate-400" />
              </div>
              <select 
                id="cashier-filter" 
                value={selectedCashier} 
                onChange={(e) => setSelectedCashier(e.target.value)} 
                className="bg-slate-800/60 border border-slate-700/50 text-white text-sm rounded-xl focus:ring-indigo-500/50 focus:border-indigo-500/50 block w-full pl-10 p-2.5"
              >
                <option value="all">{t('queue.allCashiers')}</option>
                {(dailyData?.availableCashiers ?? dailyData?.allCashiers ?? []).map(cashierId => (<option key={cashierId} value={cashierId}>{cashierId}</option>))}
              </select>
            </div>
            <div className="relative">
              <CameraViewer />
            </div>
          </div>
        </motion.div>

        {/* Otomatik Öneriler */}
        <InsightsPanel module="queue" />

        <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
          <div className="bg-gradient-to-br from-blue-600/10 to-cyan-600/10 p-5 sm:p-6 rounded-2xl border border-blue-500/20 flex items-center space-x-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/20"><Users className="w-5 h-5 text-white" /></div>
            <div><p className="text-xs font-semibold text-blue-300/70 uppercase tracking-wider">{t('queue.totalCustomers')}</p><h3 className="text-3xl font-extrabold text-white">{dailyData?.overallStats.totalCustomers.toLocaleString() ?? '0'}</h3></div>
          </div>
          <div className="bg-gradient-to-br from-orange-600/10 to-amber-600/10 p-5 sm:p-6 rounded-2xl border border-orange-500/20 flex items-center space-x-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/20"><Clock className="w-5 h-5 text-white" /></div>
            <div><p className="text-xs font-semibold text-orange-300/70 uppercase tracking-wider">{t('queue.avgWait')}</p><h3 className="text-3xl font-extrabold text-white">{formatWaitTime(dailyData?.overallStats.avgWaitTime ?? 0)}</h3></div>
          </div>
          <div className="bg-gradient-to-br from-rose-600/10 to-pink-600/10 p-5 sm:p-6 rounded-2xl border border-rose-500/20 flex items-center space-x-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 shadow-lg shadow-rose-500/20"><Timer className="w-5 h-5 text-white" /></div>
            <div><p className="text-xs font-semibold text-rose-300/70 uppercase tracking-wider">{t('queue.maxWait')}</p><h3 className="text-3xl font-extrabold text-white">{formatWaitTime(dailyData?.overallStats.maxWaitTime ?? 0)}</h3></div>
          </div>
        </motion.div>
        
        <motion.div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-5 sm:p-6 rounded-2xl border border-slate-700/50">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">{t('queue.hourlyDetails')}</h3>
            {isAdmin && hasChanges && (
                <div className="flex items-center gap-2"><button onClick={handleCancelChanges} className="flex items-center gap-1 text-sm text-slate-300 hover:text-white px-3 py-1 rounded-md hover:bg-slate-700 transition-colors"><XCircle className="w-4 h-4" /> {t('queue.cancel')}</button><button onClick={handleSaveChanges} disabled={isSaving} className="flex items-center gap-1 text-sm text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-md transition-colors disabled:opacity-50">{isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {isSaving ? t('queue.saving') : t('queue.save')}</button></div>
            )}
          </div>
          {isAdmin && isEditingDisabled && (
              <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-700 text-yellow-400 text-sm rounded-lg">
                {t('queue.singleCashierEditDisabled')}
              </div>
          )}
          <div className="overflow-x-auto"><table className="w-full text-xs sm:text-sm text-left min-w-[650px] sm:min-w-0"><thead className="text-[10px] sm:text-xs text-slate-500 uppercase bg-slate-800/50 font-semibold tracking-wider"><tr><th scope="col" className="px-3 sm:px-6 py-2.5 sm:py-3 whitespace-nowrap">{t('queue.timeRange')}</th><th scope="col" className="px-3 sm:px-6 py-2.5 sm:py-3 text-center whitespace-nowrap">{t('queue.totalCustomersCol')}</th><th scope="col" className="px-3 sm:px-6 py-2.5 sm:py-3 text-center whitespace-nowrap">{t('queue.avgWaitSec')}</th><th scope="col" className="px-3 sm:px-6 py-2.5 sm:py-3 text-center hidden sm:table-cell whitespace-nowrap">{t('queue.minWait')}</th><th scope="col" className="px-3 sm:px-6 py-2.5 sm:py-3 text-center hidden sm:table-cell whitespace-nowrap">{t('queue.maxWaitCol')}</th></tr></thead>
              <tbody>
                {/* GÜNCELLEME: Filtrelenmiş veri üzerinden map yapılıyor */}
                {filteredAndShiftedDailyData.map((hourData, index) => {
                  const isEdited = !!editedData[hourData.hour];
                  const editedTotalCustomers = editedData[hourData.hour]?.totalCustomers;
                  const editedAvgWaitTime = editedData[hourData.hour]?.avgWaitTime;
                  
                  const currentTotalCustomers = editedTotalCustomers !== undefined ? editedTotalCustomers : hourData.totalCustomers;
                  const currentAvgWait = editedAvgWaitTime !== undefined ? editedAvgWaitTime : hourData.avgWaitTime;

                  return (
                    <tr key={`${hourData.hour}-${index}`} className={`border-b border-slate-700/30 hover:bg-white/[0.02] transition-colors ${isEdited ? 'bg-indigo-900/20' : ''}`}>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 font-medium text-white whitespace-nowrap">{`${hourData.hour}:00 - ${hourData.hour}:59`}</td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 text-center">
                        <input 
                          type="number" 
                          value={currentTotalCustomers}
                          onChange={e => handleDataChange(hourData.hour, 'totalCustomers', e.target.value)} 
                          className="w-16 sm:w-20 bg-slate-800 text-slate-300 text-center rounded-md border border-slate-600 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-800/50 disabled:cursor-not-allowed text-xs sm:text-sm" 
                          disabled={!isAdmin || isEditingDisabled || !hourData.editable_id}
                          title={!isAdmin ? t('queue.adminOnlyEdit') : isEditingDisabled ? t('queue.singleCashierNoEdit') : (!hourData.editable_id ? t('queue.noDataThisSlot') : '')}
                        />
                      </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 text-center">
                        <input 
                          type="number" 
                          value={typeof currentAvgWait === 'number' ? Math.round(currentAvgWait) : currentAvgWait}
                          onChange={e => handleDataChange(hourData.hour, 'avgWaitTime', e.target.value)} 
                          className="w-16 sm:w-20 bg-slate-800 text-slate-300 text-center rounded-md border border-slate-600 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-800/50 disabled:cursor-not-allowed text-xs sm:text-sm" 
                          disabled={!isAdmin || isEditingDisabled || !hourData.editable_id} 
                          title={!isAdmin ? t('queue.adminOnlyEdit') : isEditingDisabled ? t('queue.singleCashierNoEdit') : (!hourData.editable_id ? t('queue.noDataThisSlot') : '')} 
                        />
                      </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 text-center text-green-400 hidden sm:table-cell">{formatWaitTime(hourData.minWaitTime)}</td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 text-center text-red-400 hidden sm:table-cell">{formatWaitTime(hourData.maxWaitTime)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </motion.div>

        <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
          <ChartCard title={t('queue.hourlyChart')}><ResponsiveContainer width="100%" height={280}><ComposedChart data={filteredAndShiftedDailyData}><CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" /><XAxis dataKey="hour" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(hour) => `${hour}:00`}/><YAxis yAxisId="left" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} /><YAxis yAxisId="right" orientation="right" stroke={chartColors.accent} fontSize={11} tickLine={false} axisLine={false} /><Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => (name.includes("Bekleme") || name.includes("Wait")) ? formatWaitTime(value) : value} /><Legend iconType="circle" iconSize={8} /><Bar yAxisId="left" dataKey="totalCustomers" fill={chartColors.primary} name={t('queue.customerCount')} radius={[4,4,0,0]} /><Line yAxisId="right" type="monotone" dataKey="avgWaitTime" stroke={chartColors.accent} strokeWidth={2.5} name={t('queue.avgWaitSec')} dot={{ fill: chartColors.accent, r: 3 }} /></ComposedChart></ResponsiveContainer></ChartCard>
          <ChartCard title={t('queue.waitDistribution')}>
            {(dailyData?.waitTimeDistribution?.length && dailyData.waitTimeDistribution.some((d: WaitTimeDistribution) => (d?.count ?? 0) > 0)) ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={dailyData.waitTimeDistribution} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="range" stroke="#94A3B8" fontSize={10} tick={{ fill: '#94A3B8' }} />
                  <YAxis stroke="#94A3B8" fontSize={10} allowDecimals={false} tick={{ fill: '#94A3B8' }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [value, t('queue.customerCount')]} />
                  <Bar dataKey="count" fill={chartColors.teal} name={t('queue.customerCount')} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[240px] text-slate-500 text-sm">{t('queue.noData')}</div>
            )}
          </ChartCard>
        </motion.div>

        <motion.div><ChartCard title={t('queue.cashierPerformance')}><ResponsiveContainer width="100%" height={280}><BarChart data={dailyData?.cashierPerformance} layout="vertical" margin={{ top: 5, right: 15, left: 15, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" /><XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} /><YAxis type="category" dataKey="cashier" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={60} /><Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => (name.includes("Bekleme") || name.includes("Wait")) ? formatWaitTime(value) : value} /><Legend iconType="circle" iconSize={8} /><Bar dataKey="totalCustomers" fill={chartColors.emerald} name={t('queue.totalCustomers')} radius={[0,4,4,0]} /><Bar dataKey="avgWait" fill={chartColors.pink} name={t('queue.avgWait')} radius={[0,4,4,0]} /></BarChart></ResponsiveContainer></ChartCard></motion.div>
      </motion.div>
    </div>
  );
};

const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (<div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-5 sm:p-6 rounded-2xl border border-slate-700/50"><h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-5 flex items-center gap-2"><BarChart2 size={16} className="text-indigo-400" /> {title}</h3>{children}</div>);

export default QueueAnalysis;