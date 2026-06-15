// --- START OF FILE DailyFlowAnalytics.tsx ---

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { apiUrl } from '../lib/api';
import { useStoreChange } from '../hooks/useStoreChange';
import {
  Calendar, UserPlus, Clock, AlertCircle, BarChart3,
  Thermometer, ChevronLeft, ChevronRight, Save, XCircle, RefreshCw,
  TrendingUp, TrendingDown, Minus, Sun, Cloud, CloudRain, Users
} from 'lucide-react';


// --- Veri Modelleri ---
interface HourlyFlowData {
  entered: number;
  exited: number;
  editable_id: number | null;
}
interface DailySummary {
  total_entered: number;
  total_exited: number;
}
interface FlowData {
  summary: DailySummary;
  hourly_data: { [hour: string]: HourlyFlowData };
}
interface WeatherInfo {
  temp: number;
  description: string;
  icon: JSX.Element;
}
interface EditedData {
    [hour: string]: {
        entered?: string;
        exited?: string;
    };
}
interface ComparisonStat {
  period: string;
  change: number | null;
}

// --- Yardımcı Fonksiyonlar ---
const formatDateForAPI = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getWeatherInfo = (code: number): { text: string; icon: JSX.Element } => {
    if (code === 0) return { text: 'Açık', icon: <Sun className="w-4 h-4 text-yellow-300" /> };
    if (code >= 1 && code <= 3) return { text: 'Bulutlu', icon: <Cloud className="w-4 h-4 text-slate-300" /> };
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { text: 'Yağmurlu', icon: <CloudRain className="w-4 h-4 text-blue-300" /> };
    return { text: 'Bilinmiyor', icon: <Cloud className="w-4 h-4 text-slate-400" /> };
};

const fetchWeatherData = async (date: Date): Promise<{ [hour: string]: WeatherInfo } | null> => {
  const dateStr = formatDateForAPI(date);
  const url = `https://api.open-meteo.com/v1/forecast?latitude=41.0383&longitude=28.9744&hourly=temperature_2m,weathercode&start_date=${dateStr}&end_date=${dateStr}`;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.hourly || !data.hourly.time) return null;
    const weatherByHour: { [hour: string]: WeatherInfo } = {};
    data.hourly.time.forEach((timeStr: string, index: number) => {
      const hourKey = new Date(timeStr).toTimeString().slice(0, 5);
      const weatherDetails = getWeatherInfo(data.hourly.weathercode[index]);
      weatherByHour[hourKey] = {
        temp: Math.round(data.hourly.temperature_2m[index]),
        description: weatherDetails.text,
        icon: weatherDetails.icon,
      };
    });
    return weatherByHour;
  } catch (error) {
    console.error("Hava durumu API hatası:", error);
    return null;
  }
};

const isToday = (date: Date) => {
  const today = new Date();
  return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
};

// --- Bileşen Prop Tipleri ---
interface DailyFlowAnalyticsProps {
    onDateChange: (date: Date) => void;
    selectedDate: Date;
    selectedCamera: string;
    genderDistribution?: { male: number; female: number };
}



// --- Ana Bileşen ---
const DailyFlowAnalytics: React.FC<DailyFlowAnalyticsProps> = ({ onDateChange, selectedDate, selectedCamera, genderDistribution }) => {
  const { language } = useLanguage();
  const storeRefresh = useStoreChange();
  const [flowData, setFlowData] = useState<FlowData | null>(null);
  const [weatherData, setWeatherData] = useState<{ [hour: string]: WeatherInfo } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [comparisonStats, setComparisonStats] = useState<{ entered: ComparisonStat[], exited: ComparisonStat[] } | null>(null);

  const [editedData, setEditedData] = useState<EditedData>({});
  const [isSaving, setIsSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const hasChanges = Object.keys(editedData).length > 0;

  useEffect(() => {
    const userString = localStorage.getItem('user');
    if (userString) {
      try {
        const user = JSON.parse(userString);
        setIsAdmin(user && user.role === 'admin');
      } catch { setIsAdmin(false); }
    }

    const controller = new AbortController();
    const signal = controller.signal;

    setLoading(true);
    setError(null);
    setEditedData({});

    const token = localStorage.getItem('token');
    const dateStr = formatDateForAPI(selectedDate);
    const flowUrl = apiUrl(`/api/analytics/customers/flow-data?date_from=${dateStr}&camera_id=${selectedCamera}`);

    Promise.all([
      fetch(flowUrl, { headers: { 'Authorization': `Bearer ${token}` }, signal }),
      fetchWeatherData(selectedDate),
    ])
      .then(async ([flowResponse, weatherResponse]) => {
        if (!flowResponse.ok) {
          const errorJson = await flowResponse.json().catch(() => ({}));
          throw new Error(errorJson.error || 'Akış verisi çekme başarısız oldu.');
        }
        const flowJson = await flowResponse.json();
        const data = flowJson.data && typeof flowJson.data === 'object' ? flowJson.data : {};
        const dataForDate = data[dateStr];
        const fallbackDateKey = Object.keys(data).length > 0 ? Object.keys(data)[0] : null;
        const resolved = dataForDate ?? (fallbackDateKey ? data[fallbackDateKey] : null);
        setFlowData(resolved && resolved.hourly_data ? resolved : null);
        setWeatherData(weatherResponse);
        setComparisonStats(flowJson.comparison_stats || null);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.');
      })
      .finally(() => {
        if (!signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [selectedDate, selectedCamera, storeRefresh, refreshKey]);

  const displaySummary = useMemo(() => {
    if (!flowData) return { total_entered: 0, total_exited: 0 };
    let totalEntered = 0;
    let totalExited = 0;
    for (const [hourKey, originalHourData] of Object.entries(flowData.hourly_data)) {
        const editedHour = editedData[hourKey];
        const enteredValue = (editedHour?.entered !== undefined) ? (parseInt(editedHour.entered, 10) || 0) : originalHourData.entered;
        const exitedValue = (editedHour?.exited !== undefined) ? (parseInt(editedHour.exited, 10) || 0) : originalHourData.exited;
        totalEntered += enteredValue;
        totalExited += exitedValue;
    }
    return { total_entered: totalEntered, total_exited: totalExited };
  }, [flowData, editedData]);

  const handleDataChange = (hour: string, field: 'entered' | 'exited', value: string) => {
    if (!/^[0-9]*$/.test(value)) return;
    const originalValue = flowData?.hourly_data[hour]?.[field];
    setEditedData(prev => {
        const newEditedData = { ...prev };
        const newHourData = { ...(newEditedData[hour] || {}) };
        if (originalValue !== undefined && value === String(originalValue)) {
            delete newHourData[field];
        } else {
            newHourData[field] = value;
        }
        if (Object.keys(newHourData).length === 0) {
            delete newEditedData[hour];
        } else {
            newEditedData[hour] = newHourData;
        }
        return newEditedData;
    });
  };

  const handleCancelChanges = () => setEditedData({});

  const handleSaveChanges = async () => {
    setIsSaving(true);
    setError(null);
    const token = localStorage.getItem('token');
    const updatePromises = Object.entries(editedData).map(([hour, changes]) => {
      const recordId = flowData?.hourly_data[hour]?.editable_id;
      if (!recordId) return Promise.resolve({ success: false, hour });
      const payload: { entering?: number; exiting?: number } = {};
      if (changes.entered !== undefined) payload.entering = parseInt(changes.entered, 10) || 0;
      if (changes.exited !== undefined) payload.exiting = parseInt(changes.exited, 10) || 0;
      if (Object.keys(payload).length === 0) return Promise.resolve({ success: true, hour });
      return fetch(apiUrl(`/api/analytics/customers/record/${recordId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      }).then(res => res.json().then(data => ({ success: res.ok, data, hour })));
    });
    try {
      const results = await Promise.all(updatePromises);
      const failedUpdates = results.filter(r => !r.success);
      if (failedUpdates.length > 0) throw new Error(`Şu saatler güncellenemedi: ${failedUpdates.map(f => f.hour).join(', ')}`);
      setEditedData({});
      setRefreshKey(k => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kaydetme sırasında bir hata oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDateInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const dateString = event.target.value;
    if (dateString) onDateChange(new Date(dateString + 'T00:00:00'));
  };
  const handlePreviousDay = () => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); onDateChange(d); };
  const handleNextDay = () => { if (isToday(selectedDate)) return; const d = new Date(selectedDate); d.setDate(d.getDate() + 1); onDateChange(d); };

  const item = { hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } };

  // 10:00 - 22:00 sabit + API'den gelen ve bu aralık dışındaki saatler (veritabanındaki toplam tek saatte dönebiliyor)
  const filteredHourlyData = useMemo(() => {
      const hourly = flowData?.hourly_data ?? {};
      const baseSlots = Array.from({ length: 13 }, (_, i) => `${String(10 + i).padStart(2, '0')}:00`);
      const apiHours = Object.keys(hourly).filter((h) => !baseSlots.includes(h)).sort();
      const allSlots = [...baseSlots, ...apiHours];
      return allSlots.map((hour) => {
        const data = hourly[hour] ?? { entered: 0, exited: 0, editable_id: null };
        return [hour, data] as const;
      });
  }, [flowData]);


  const weatherInsight = useMemo(() => {
    if (!weatherData || !flowData || Object.keys(flowData.hourly_data).length === 0) return null;

    let totalRainVisitors = 0;
    let totalClearVisitors = 0;
    let rainHours = 0;
    let clearHours = 0;

    Object.entries(flowData.hourly_data).forEach(([hour, data]) => {
      const w = weatherData[hour];
      if (!w) return;
      
      const visitors = data.entered;
      if (w.description === 'Yağmurlu') {
        totalRainVisitors += visitors;
        rainHours++;
      } else if (w.description === 'Açık') {
        totalClearVisitors += visitors;
        clearHours++;
      }
    });

    if (rainHours === 0 || clearHours === 0) return null;

    const avgRain = totalRainVisitors / rainHours;
    const avgClear = totalClearVisitors / clearHours;

    if (avgRain > avgClear * 1.1) {
      return {
        title: 'Hava Durumu Korelasyonu',
        desc: `Bugün yağmurlu saatlerde müşteri girişiniz, güneşli saatlere kıyasla ortalama %${Math.round((avgRain/avgClear - 1)*100)} daha yüksek. Yağışlı havalar mağazanız için fırsat yaratıyor.`,
        type: 'success',
        icon: <CloudRain className="w-5 h-5 text-blue-400" />
      };
    } else if (avgClear > avgRain * 1.1) {
      return {
        title: 'Hava Durumu Korelasyonu',
        desc: `Güneşli saatlerdeki müşteri yoğunluğu, yağmurlu saatlere göre %${Math.round((avgClear/avgRain - 1)*100)} daha fazla. Dış mekan yaya trafiği satışlarınızı doğrudan etkiliyor.`,
        type: 'info',
        icon: <Sun className="w-5 h-5 text-yellow-400" />
      };
    }

    return null;
  }, [weatherData, flowData]);

  return (
    <motion.div variants={item} className="space-y-4">
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl p-4 sm:p-5 md:p-6 rounded-2xl border border-slate-700/50">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-4 sm:mb-5 md:mb-6 gap-3 sm:gap-4">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">{language === 'tr' ? 'Günlük Akış Analizi' : 'Daily Flow Analysis'}</h3>
        <div className="flex items-center gap-1 sm:gap-2 md:gap-4 bg-slate-800/60 p-1.5 sm:p-2 rounded-xl border border-slate-700/50">
            <button onClick={handlePreviousDay} className="p-1 sm:p-1.5 md:p-2 rounded-md hover:bg-slate-700" aria-label={language === 'tr' ? 'Önceki Gün' : 'Previous Day'}><ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300" /></button>
            <div className="relative flex items-center">
                <label htmlFor="date-picker" className="flex items-center cursor-pointer gap-1 sm:gap-2"><Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" /><span className="text-white font-medium text-center text-xs sm:text-sm w-28 sm:w-36 md:w-auto">{isToday(selectedDate) ? (language === 'tr' ? 'Bugün' : 'Today') : selectedDate.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</span></label>
                <input type="date" id="date-picker" value={formatDateForAPI(selectedDate)} max={formatDateForAPI(new Date())} onChange={handleDateInputChange} className="opacity-0 absolute inset-0 w-full h-full cursor-pointer" />
            </div>
            <button onClick={handleNextDay} disabled={isToday(selectedDate)} className="p-1 sm:p-1.5 md:p-2 rounded-md hover:bg-slate-700 disabled:opacity-50" aria-label={language === 'tr' ? 'Sonraki Gün' : 'Next Day'}><ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300" /></button>
        </div>
      </div>

      {loading ? ( <div className="text-center py-10"><RefreshCw className="w-8 h-8 mx-auto animate-spin text-blue-400" /></div> )
      : error ? ( <div className="text-center py-10 text-red-400 flex flex-col items-center"><AlertCircle className="w-12 h-12 mb-4" /><p className="font-semibold">{language === 'tr' ? 'Hata Oluştu' : 'Error Occurred'}</p><p className="text-sm">{error}</p></div> )
      : !flowData ? ( <div className="text-center py-10 text-slate-400 flex flex-col items-center"><BarChart3 className="w-12 h-12 mb-4" /><p className="font-semibold">{language === 'tr' ? 'Veri Bulunamadı' : 'No Data Found'}</p><p className="text-sm">{language === 'tr' ? `${selectedDate.toLocaleDateString('tr-TR')} için gösterilecek saat aralığında veri yok.` : `No hourly data to display for ${selectedDate.toLocaleDateString('en-US')}.`}</p></div> )
      : (
        <div>
          {weatherInsight && (
            <div className={`mb-4 sm:mb-5 md:mb-6 p-4 rounded-xl border flex items-start gap-4 ${
              weatherInsight.type === 'success' 
                ? 'bg-green-900/20 border-green-500/30' 
                : 'bg-blue-900/20 border-blue-500/30'
            }`}>
              <div className="shrink-0 p-2 bg-slate-800/50 rounded-lg">
                {weatherInsight.icon}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-1">{weatherInsight.title}</h4>
                <p className="text-xs sm:text-sm text-slate-300">{weatherInsight.desc}</p>
              </div>
            </div>
          )}

          <div className="mb-4 sm:mb-5 md:mb-6">
            <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-700/40 flex flex-col sm:flex-row items-center justify-center gap-6">
              {/* Sol: İkon + Sayı */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30">
                  <UserPlus className="w-5 h-5 text-emerald-400"/>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{language === 'tr' ? 'Giren Müşteri' : 'Entered Customers'}</p>
                  <p className="text-3xl font-extrabold text-slate-100">{displaySummary.total_entered}</p>
                </div>
              </div>
              {/* Sağ: Karşılaştırma istatistikleri yan yana */}
              {comparisonStats?.entered && comparisonStats.entered.length > 0 && (
                <div className="flex-1 flex flex-wrap items-center gap-3 sm:border-l sm:border-slate-600/60 sm:pl-4">
                  {comparisonStats.entered.map((stat) => {
                    const isUp = stat.change !== null && stat.change > 0;
                    const isDown = stat.change !== null && stat.change < 0;
                    const color = isUp ? 'text-emerald-400' : isDown ? 'text-red-400' : 'text-slate-400';
                    const bg = isUp ? 'bg-emerald-500/10 border-emerald-500/30' : isDown ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-700/30 border-slate-600/30';
                    const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
                    const displayChange = stat.change === null ? 'N/A' : `${stat.change > 0 ? '+' : ''}${stat.change}%`;
                    return (
                      <div key={stat.period} className={`flex flex-col items-center px-3 py-2 rounded-xl border ${bg} min-w-[72px]`}>
                        <span className="text-[10px] text-slate-500 font-medium mb-1">{stat.period}</span>
                        <div className={`flex items-center gap-1 font-bold text-sm ${color}`}>
                          <Icon className="w-3.5 h-3.5" />
                          <span>{displayChange}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {/* Cinsiyet Dağılımı (Gender Distribution) */}
              {genderDistribution && (
                <div className="flex items-center gap-3 shrink-0 sm:border-l sm:border-slate-600/60 sm:pl-6">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border border-indigo-500/30">
                    <Users className="w-5 h-5 text-indigo-400"/>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{language === 'tr' ? 'Cinsiyet Dağılımı' : 'Gender Distribution'}</p>
                    <p className="text-xl font-extrabold text-slate-100">
                      <span className="text-blue-400">{genderDistribution.male} E</span>
                      <span className="text-slate-500 mx-1">/</span>
                      <span className="text-pink-400">{genderDistribution.female} K</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 mb-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{language === 'tr' ? 'Saatlik Döküm (10:00 - 22:00)' : 'Hourly Breakdown (10:00 - 22:00)'}</h4>
                {isAdmin && hasChanges && (
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <button onClick={handleCancelChanges} className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1 rounded-md hover:bg-slate-700"><XCircle className="w-3 h-3 sm:w-4 sm:h-4 text-slate-300" /> <span className="hidden sm:inline text-slate-300">{language === 'tr' ? 'İptal' : 'Cancel'}</span></button>
                        <button onClick={handleSaveChanges} disabled={isSaving} className="flex items-center gap-1 text-xs sm:text-sm text-white bg-blue-600 hover:bg-blue-700 px-2 sm:px-3 py-1 rounded-md disabled:opacity-50">{isSaving ? <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" /> : <Save className="w-3 h-3 sm:w-4 sm:h-4" />} <span className="hidden sm:inline">{isSaving ? (language === 'tr' ? 'Kaydediliyor' : 'Saving') : (language === 'tr' ? 'Kaydet' : 'Save')}</span></button>
                    </div>
                )}
              </div>
              <div className="max-h-72 sm:max-h-96 overflow-y-auto overflow-x-auto bg-slate-900/30 rounded-xl border border-slate-700/30">
                <table className="w-full text-[10px] sm:text-xs md:text-sm min-w-[320px] sm:min-w-0">
                    <thead className="sticky top-0 bg-slate-800/90 backdrop-blur-sm z-10">
                        <tr>
                            <th className="text-left text-white py-1.5 sm:py-2 md:py-3 px-2 sm:px-3 md:px-4 font-medium text-[9px] sm:text-xs whitespace-nowrap"><Clock className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1 sm:mr-2"/>{language === 'tr' ? 'Saat' : 'Hour'}</th>
                            <th className="text-center text-white py-1.5 sm:py-2 md:py-3 px-2 sm:px-3 md:px-4 font-medium text-[9px] sm:text-xs whitespace-nowrap"><UserPlus className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1 sm:mr-2 text-green-400"/>{language === 'tr' ? 'Giren' : 'Entered'}</th>
                            <th className="text-left text-white py-1.5 sm:py-2 md:py-3 px-2 sm:px-3 md:px-4 font-medium text-[9px] sm:text-xs hidden sm:table-cell whitespace-nowrap"><Thermometer className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1 sm:mr-2 text-orange-400"/>{language === 'tr' ? 'Hava' : 'Weather'}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                        {filteredHourlyData.map(([hour, data]) => {
                            const editedHourData = editedData[hour] || {};
                            const currentEntering = editedHourData.entered ?? data.entered;
                            const isEdited = !!editedData[hour];
                            const weather = weatherData ? weatherData[hour] : null;

                            // Saat bilgisi backend'den zaten yerel (10:00, 11:00, ...) olarak geliyor.
                            const startHourValue = parseInt(hour.split(':')[0], 10);
                            const endHourValue = startHourValue + 1;
                            const startLabel = `${startHourValue.toString().padStart(2, '0')}:00`;
                            const endLabel = `${endHourValue.toString().padStart(2, '0')}:00`;
                            const timeRange = `${startLabel} - ${endLabel}`;

                            // GÜNCELLEME: Düzenlemenin ne zaman devre dışı kalacağını belirleyen değişken
                            const isEditingDisabled = !isAdmin || !data.editable_id || selectedCamera === 'all';

                            // GÜNCELLEME: Neden devre dışı olduğunu açıklayan dinamik başlık
                            const disabledTitle = selectedCamera === 'all'
                                ? (language === 'tr' ? "Veri düzenlemek için lütfen belirli bir kamera seçin." : "Please select a specific camera to edit data.")
                                : !isAdmin
                                ? (language === 'tr' ? "Bu alanı sadece adminler düzenleyebilir." : "Only admins can edit this area.")
                                : !data.editable_id
                                ? (language === 'tr' ? "Bu saatte düzenlenecek veri yok." : "No editable data for this hour.")
                                : "";

                            return (
                                <tr key={hour} className={`hover:bg-white/[0.02] transition-colors ${isEdited ? 'bg-indigo-900/20' : ''}`}>
                                    <td className="py-1.5 sm:py-2 px-2 sm:px-3 md:px-4 text-white font-mono text-[9px] sm:text-xs md:text-sm">{timeRange}</td>
                                    <td className="py-1.5 sm:py-2 px-2 sm:px-3 md:px-4 text-center">
                                        <input
                                            type="text"
                                            value={currentEntering}
                                            onChange={(e) => handleDataChange(hour, 'entered', e.target.value)}
                                            className="w-14 sm:w-16 md:w-20 bg-slate-800 text-green-400 font-semibold text-center rounded-md border border-slate-600 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-800/50 disabled:cursor-not-allowed text-[9px] sm:text-xs md:text-sm"
                                            disabled={isEditingDisabled} // GÜNCELLEME
                                            title={isEditingDisabled ? disabledTitle : "Giren müşteri sayısını düzenle"} // GÜNCELLEME
                                        />
                                    </td>
                                    <td className="py-1.5 sm:py-2 md:py-3 px-2 sm:px-3 md:px-4 text-slate-300 text-[9px] sm:text-xs md:text-sm hidden sm:table-cell">
                                        {weather ? (<div className="flex items-center gap-1 sm:gap-2">{weather.icon}<span>{`${weather.temp}°C, ${weather.description}`}</span></div>) : (<span>-</span>)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
          </div>
        </div>
      )}
      </div>
    </motion.div>
  );
};

export default DailyFlowAnalytics;