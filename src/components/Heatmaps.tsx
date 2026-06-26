// Heatmaps.tsx dosyasının TAMAMI

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Clock, 
  MapPin,
  BarChart2,
  Filter,
  Save,
  XCircle,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Minus,
  TrendingUp,
  TrendingDown,
  Camera,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { apiUrl } from '../lib/api';
import { useStoreChange } from '../hooks/useStoreChange';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import { useContainerWidth } from '../hooks/useContainerWidth';
import { useWorkHours } from '../hooks/useWorkHours';
import InsightsPanel from './shared/InsightsPanel';
import DateRangePicker from './shared/DateRangePicker';
import ExportPDFButton from './shared/ExportPDFButton';
import CustomDropdown from './shared/CustomDropdown';

// Veri tipleri
interface ComparisonStat {
  period: string;
  change: number | null;
}
interface HourlySummary {
  hour: string;
  totalVisitors: number;
  avgDwellTime: number; // saniye cinsinden
  editable_id: number | null;
}
interface OverallStats {
  totalVisitors: number;
  avgDwellTime: number;
  busiestZone: string;
}
interface DwellTimeDistribution {
  range: string;
  count: number;
}
interface ZonePerformance {
  zone: string;
  totalVisitors: number;
  avgDwell: number; // saniye cinsinden
}
interface DailyData {
    overallStats: OverallStats;
    hourlySummary: HourlySummary[];
    dwellTimeDistribution: DwellTimeDistribution[];
    zonePerformance: ZonePerformance[];
    allZones: string[];
    comparisonStats: {
        totalVisitors: ComparisonStat[];
    }
}
type EditableFields = {
    totalVisitors?: number | '';
    avgDwellTime?: number | '';
};

const ComparisonStatCard: React.FC<{ stat: ComparisonStat }> = ({ stat }) => {
    const { change, period } = stat;
    let color = 'text-slate-400';
    let Icon = Minus;
  
    if (change !== null) {
      if (change > 0) {
        color = 'text-green-400';
        Icon = TrendingUp;
      } else if (change < 0) {
        color = 'text-red-400';
        Icon = TrendingDown;
      }
    }
  
    const displayChange = change === null ? 'N/A' : `${change > 0 ? '+' : ''}${change}%`;
  
    return (
      <div className="flex items-center gap-1 sm:gap-2 text-[9px] sm:text-xs">
        <span className="text-slate-500 w-12 sm:w-16 md:w-20">{period}:</span>
        <div className={`flex items-center font-semibold ${color}`}>
          <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-0.5 sm:mr-1" />
          <span>{displayChange}</span>
        </div>
      </div>
    );
};

const ChangeIndicator = ({ change }: { change: number | null }) => {
    if (change === null || isNaN(change) || !isFinite(change)) {
      return <span className="flex items-center text-slate-500 text-[9px] sm:text-xs"><Minus size={12} className="sm:w-3.5 sm:h-3.5" /> N/A</span>;
    }
    const isIncrease = change > 0;
    const isDecrease = change < 0;
    const color = isIncrease ? 'text-green-400' : isDecrease ? 'text-red-400' : 'text-slate-400';
    const Icon = isIncrease ? ArrowUp : isDecrease ? ArrowDown : Minus;
  
    return (
      <span className={`flex items-center text-[9px] sm:text-xs font-medium ${color}`}>
        <Icon size={12} className="sm:w-3.5 sm:h-3.5 mr-0.5 sm:mr-1" />
        {Math.abs(change).toFixed(1)}%
      </span>
    );
};

const PremiumDonut = ({ data, colors, total, labelTitle }: { data: { name: string; value: number }[]; colors: string[]; total: number; labelTitle: string }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  
  const onPieEnter = (_: unknown, index: number) => {
    setActiveIndex(index);
  };
  
  const onPieLeave = () => {
    setActiveIndex(null);
  };

  const hoveredItem = activeIndex !== null ? data[activeIndex] : null;

  return (
    <div className="flex flex-col md:flex-row items-center gap-8 w-full p-2">
      <div className="relative w-[260px] h-[260px] shrink-0 mx-auto">
        <PieChart width={260} height={260}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={activeIndex !== null ? 76 : 84}
            outerRadius={activeIndex !== null ? 120 : 112}
            paddingAngle={2.5}
            onMouseEnter={onPieEnter}
            onMouseLeave={onPieLeave}
            stroke="rgba(15,23,42,0.6)"
            strokeWidth={1.5}
            animationDuration={400}
          >
            {data.map((_, i) => (
              <Cell 
                key={i} 
                fill={colors[i % colors.length]} 
                style={{
                  filter: activeIndex === i ? 'drop-shadow(0px 6px 12px rgba(0,0,0,0.6))' : 'none',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
              />
            ))}
          </Pie>
        </PieChart>
        
        {/* Central Text HUD */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-all duration-300">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold text-center max-w-[150px] truncate">
            {hoveredItem ? hoveredItem.name : labelTitle}
          </span>
          <span className="text-2xl font-black text-white mt-1 tracking-tight">
            {hoveredItem ? hoveredItem.value.toLocaleString() : total.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 font-bold">
            {hoveredItem && total > 0 ? `%${((hoveredItem.value / total) * 100).toFixed(0)}` : 'Ziyaretçi'}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 flex-1 w-full max-h-[260px] overflow-y-auto pr-1 scrollbar-thin">
        {data.map((item, i) => {
          const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
          const isHovered = activeIndex === i;
          return (
            <div 
              key={item.name} 
              className={`flex items-center gap-2 px-2 py-1 rounded-lg transition-all duration-200 ${isHovered ? 'bg-slate-700/40 border-l-[3px]' : 'bg-transparent border-l-[3px] border-transparent'}`}
              style={{ borderLeftColor: isHovered ? colors[i % colors.length] : 'transparent' }}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
              <span className="text-[11px] text-slate-300 flex-1 truncate font-medium">{item.name}</span>
              <span className="text-[11px] font-bold text-white shrink-0">{pct}%</span>
              <span className="text-[10px] text-slate-500 shrink-0 ml-1">({item.value})</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Kamera Alan Galerisi Bileşeni
interface CameraZoneData {
  id: number;
  name: string;
  points: number[][];
  color: string;
}
interface CameraWithZones {
  id: number;
  name: string;
  type: string;
  imageUrl: string;
  zones?: CameraZoneData[];
}

const CameraZoneGallery: React.FC = () => {
  const [cameras, setCameras] = useState<CameraWithZones[]>([]);
  const [expandedCamera, setExpandedCamera] = useState<CameraWithZones | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(apiUrl('/api/settings/cameras?include_zones=true'), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.cameras) {
          // Sadece ısı haritası kameraları veya resmi olan kameralar
          const heatmapCams = d.cameras.filter((c: CameraWithZones) =>
            c.type === 'Isı Haritası' || (c.imageUrl && c.zones && c.zones.length > 0)
          );
          // Resmi olan tüm kameralar (fallback)
          const allWithImage = heatmapCams.length > 0 ? heatmapCams : d.cameras.filter((c: CameraWithZones) => c.imageUrl);
          setCameras(allWithImage);
        }
      })
      .catch(() => {});
  }, []);

  const scroll = (dir: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === 'left' ? -280 : 280, behavior: 'smooth' });
    }
  };

  if (cameras.length === 0) return null;

  return (
    <>
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl border border-slate-700/50 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Kamera Alanları</h3>
            <span className="text-[10px] text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded-full">{cameras.length} kamera</span>
          </div>
          {cameras.length > 2 && (
            <div className="flex items-center gap-1">
              <button onClick={() => scroll('left')} className="p-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-white transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => scroll('right')} className="p-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-white transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent snap-x">
          {cameras.map((cam) => (
            <div
              key={cam.id}
              onClick={() => setExpandedCamera(cam)}
              className="relative flex-shrink-0 w-[240px] sm:w-[280px] h-[160px] sm:h-[180px] rounded-xl overflow-hidden border border-slate-700/50 hover:border-blue-500/50 transition-all cursor-pointer group snap-start"
            >
              {cam.imageUrl ? (
                <img src={cam.imageUrl} alt={cam.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-slate-600" />
                </div>
              )}
              {/* Overlay with zone count */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-sm font-bold text-white truncate">{cam.name}</p>
                <p className="text-[10px] text-slate-300">
                  {cam.zones && cam.zones.length > 0 ? `${cam.zones.length} alan tanımlı` : 'Alan tanımlanmamış'}
                </p>
              </div>
              {/* Hover effect */}
              <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-xs font-medium text-white bg-blue-600/80 px-3 py-1.5 rounded-lg backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  Büyüt
                </span>
              </div>
              {/* Zone indicators on thumbnail */}
              {cam.imageUrl && cam.zones && cam.zones.length > 0 && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {cam.zones.map((zone) => {
                    if (!zone.points || zone.points.length < 3) return null;
                    const pts = zone.points.map(p => `${p[0] * 100},${p[1] * 100}`).join(' ');
                    return (
                      <polygon
                        key={zone.id}
                        points={pts}
                        fill={`${zone.color}20`}
                        stroke={zone.color}
                        strokeWidth="0.5"
                      />
                    );
                  })}
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Expanded Modal */}
      <AnimatePresence>
        {expandedCamera && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setExpandedCamera(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-4xl w-full max-h-[85vh] bg-slate-900 rounded-2xl border border-slate-700/50 overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700/50 bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">{expandedCamera.name}</h3>
                  {expandedCamera.zones && expandedCamera.zones.length > 0 && (
                    <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">{expandedCamera.zones.length} alan</span>
                  )}
                </div>
                <button onClick={() => setExpandedCamera(null)} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {/* Image with zones */}
              <div className="relative w-full" style={{ maxHeight: 'calc(85vh - 120px)' }}>
                {expandedCamera.imageUrl ? (
                  <img src={expandedCamera.imageUrl} alt={expandedCamera.name} className="w-full h-auto max-h-[70vh] object-contain bg-black" />
                ) : (
                  <div className="w-full h-[400px] bg-slate-950 flex items-center justify-center">
                    <Camera className="w-16 h-16 text-slate-700" />
                  </div>
                )}
                {/* Zone overlays */}
                {expandedCamera.imageUrl && expandedCamera.zones && expandedCamera.zones.length > 0 && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {expandedCamera.zones.map((zone) => {
                      if (!zone.points || zone.points.length < 3) return null;
                      const pts = zone.points.map(p => `${p[0] * 100},${p[1] * 100}`).join(' ');
                      const cx = zone.points.reduce((s, p) => s + p[0], 0) / zone.points.length * 100;
                      const cy = zone.points.reduce((s, p) => s + p[1], 0) / zone.points.length * 100;
                      return (
                        <g key={zone.id}>
                          <polygon
                            points={pts}
                            fill={`${zone.color}30`}
                            stroke={zone.color}
                            strokeWidth="0.4"
                          />
                          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="2.5" fontWeight="bold" style={{ textShadow: '0 0 3px rgba(0,0,0,0.8)' }}>
                            {zone.name}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                )}
              </div>
              {/* Zone legend */}
              {expandedCamera.zones && expandedCamera.zones.length > 0 && (
                <div className="px-5 py-3 border-t border-slate-700/50 flex flex-wrap gap-2">
                  {expandedCamera.zones.map((zone) => (
                    <div key={zone.id} className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/50">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: zone.color }} />
                      <span className="text-xs text-slate-300 font-medium">{zone.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const Heatmaps = () => {
  const { t } = useLanguage();
  const storeRefresh = useStoreChange();
  const workHours = useWorkHours();
  const [chart1Ref, chart1W] = useContainerWidth(800);
  const [chart2Ref, chart2W] = useContainerWidth(800);
  const [chart3Ref, chart3W] = useContainerWidth(800);

  const [dailyData, setDailyData] = useState<DailyData | null>(null);
  const [loading, setLoading] = useState(true);
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [latestDateLoaded, setLatestDateLoaded] = useState(false);
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [isAdmin, setIsAdmin] = useState(false);
  const [viewMode, setViewMode] = useState<'charts' | 'floorplan'>('charts');

  const zoneCoordinates: Record<string, { top: string; left: string }> = {
    'genel': { top: '50%', left: '50%' },
    'kasa': { top: '80%', left: '20%' },
    'reyon-a': { top: '30%', left: '40%' },
    'reyon-b': { top: '25%', left: '75%' },
    'giris': { top: '90%', left: '50%' },
    'vitrin': { top: '15%', left: '15%' },
    'Kasa Önü': { top: '75%', left: '25%' },
    'A-Reyonu': { top: '35%', left: '45%' },
    'B-Reyonu': { top: '30%', left: '70%' },
    'Giriş': { top: '85%', left: '50%' },
    'Vitrin': { top: '20%', left: '20%' },
  };

  const [editedData, setEditedData] = useState<{ [hour: string]: EditableFields }>({});
  const [isSaving, setIsSaving] = useState(false);
  const hasChanges = Object.keys(editedData).length > 0;
  const isEditingDisabled = selectedZone !== 'all';

  const chartColors = { primary: '#3b82f6', secondary: '#f43f5e', accent: '#3b82f6', purple: '#3b82f6' };

  const tooltipStyle = {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    borderRadius: '12px',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
    padding: '12px 16px',
  };

  const formatDwellTime = (seconds: number) => {
    if (!seconds || seconds < 1) return '0 sn';
    if (seconds < 60) return `${Math.round(seconds)} sn`;
    const minutes = Math.floor(seconds / 60);
    const sec = Math.round(seconds % 60);
    return `${minutes} dk ${sec} sn`;
  };

  const fetchDailySummary = React.useCallback(async (showLoading = true, sDate?: string, eDate?: string, signal?: AbortSignal) => {
    if (showLoading) setLoading(true);
    setEditedData({});
    try {
      const token = localStorage.getItem('token');
      const from = sDate ?? startDate;
      const to = eDate ?? endDate;
      const params = new URLSearchParams({ date_from: from, date_to: to });
      if (selectedZone !== 'all') params.append('zone_ids', selectedZone);
      const response = await fetch(apiUrl(`/api/analytics/heatmaps/daily-summary?${params}`), {
        headers: { 'Authorization': `Bearer ${token}` },
        signal
      });
      if (response.ok) {
        const data = await response.json();
        if (!signal?.aborted) setDailyData(data);
      } else {
        if (!signal?.aborted) setDailyData(null);
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error('Günlük heatmap özeti çekme hatası:', error);
      if (!signal?.aborted) setDailyData(null);
    } finally {
      if (showLoading && !signal?.aborted) setLoading(false);
    }
  }, [startDate, endDate, selectedZone]);

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
    if (!latestDateLoaded) {
      const token = localStorage.getItem('token');
      fetch(apiUrl('/api/analytics/heatmaps/latest-date'), {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(r => r.json())
        .then((d: { date?: string }) => {
          const latest = d?.date || todayStr;
          setStartDate(latest);
          setEndDate(latest);
          setSelectedDate(latest);
          setLatestDateLoaded(true);
        })
        .catch(() => setLatestDateLoaded(true));
      return;
    }
    const controller = new AbortController();
    fetchDailySummary(true, startDate, endDate, controller.signal);
    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, startDate, endDate, selectedZone, storeRefresh, latestDateLoaded]);
  
  // GÜNCELLEME: Filtrelenmiş veri (sadece 10:00-22:00 arası)
  const filteredAndShiftedHourlyData = useMemo(() => {
    if (!dailyData?.hourlySummary) return [];
    
    return dailyData.hourlySummary
      .map(summary => ({
          ...summary,
          hour: String(parseInt(summary.hour, 10)).padStart(2, '0'),
      }))
      .filter(summary => {
          const hour = parseInt(summary.hour, 10);
          return hour >= workHours.work_start && hour < workHours.work_end;
      })
      .sort((a, b) => parseInt(a.hour, 10) - parseInt(b.hour, 10));
  }, [dailyData?.hourlySummary, workHours.work_start, workHours.work_end]);


  const handleDataChange = (hour: string, field: 'totalVisitors' | 'avgDwellTime', value: string) => {
    const numericValue = value === '' ? '' : field === 'totalVisitors' ? parseInt(value, 10) : parseFloat(value);
    if (value === '' || (!isNaN(numericValue as number) && (numericValue as number) >= 0)) {
        setEditedData(prev => ({ ...prev, [hour]: { ...prev[hour], [field]: numericValue } }));
    }
  };

  const handleCancelChanges = () => setEditedData({});

  const handleSaveChanges = async () => {
    setIsSaving(true);
    const token = localStorage.getItem('token');
    const updatePromises = Object.entries(editedData).map(([hour, changes]) => {
      const recordId = dailyData?.hourlySummary.find(h => {
        const hHour = String(parseInt(h.hour, 10)).padStart(2, '0');
        return hHour === hour;
      })?.editable_id;
      if (!recordId) return Promise.resolve({ success: false, hour });

      const cleanedChanges: Partial<EditableFields> = {};
      if (changes.totalVisitors !== '' && changes.totalVisitors !== undefined) {
        cleanedChanges.totalVisitors = changes.totalVisitors;
      }
      if (changes.avgDwellTime !== '' && changes.avgDwellTime !== undefined) {
        cleanedChanges.avgDwellTime = changes.avgDwellTime;
      }
      if (Object.keys(cleanedChanges).length === 0) return Promise.resolve({ success: true, hour });

      return fetch(apiUrl(`/api/analytics/heatmaps/record/${recordId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(cleanedChanges)
      }).then(res => res.ok);
    });
    
    await Promise.all(updatePromises);
    setIsSaving(false);
    await fetchDailySummary(false);
  };

  const hourlyDataWithComparison = useMemo(() => {
    return filteredAndShiftedHourlyData.map((current, index) => {
      if (index === 0) return { ...current, visitorChange: null, dwellChange: null };
      const previous = filteredAndShiftedHourlyData[index - 1];
      const visitorChange = previous.totalVisitors > 0 ? ((current.totalVisitors - previous.totalVisitors) / previous.totalVisitors) * 100 : current.totalVisitors > 0 ? Infinity : 0;
      const dwellChange = previous.avgDwellTime > 0 ? ((current.avgDwellTime - previous.avgDwellTime) / previous.avgDwellTime) * 100 : current.avgDwellTime > 0 ? Infinity : 0;
      return { ...current, visitorChange, dwellChange };
    });
  }, [filteredAndShiftedHourlyData]);

  if (loading) {
    return (
      <div className="p-6 text-white text-center flex flex-col justify-center items-center h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        {t('heatmap.loading')}
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-5 lg:p-8" id="heatmap-analytics-content">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 sm:space-y-6 lg:space-y-8">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/25">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight">{t('heatmap.title')}</h1>
            </div>
            <p className="text-sm text-slate-400 ml-12">{t('heatmap.subtitle')}</p>
          </div>
          <div className="w-full xl:w-auto flex flex-col sm:flex-row gap-3 flex-wrap items-center">
            <ExportPDFButton elementId="heatmap-analytics-content" filename={`Isi_Haritasi_${startDate}`} />
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={(d) => { setStartDate(d); setSelectedDate(d); }}
              onEndDateChange={setEndDate}
              onApply={() => fetchDailySummary(true, startDate, endDate)}
            />
            <CustomDropdown
              value={selectedZone}
              onChange={setSelectedZone}
              options={[
                { value: 'all', label: t('heatmap.allZones') },
                ...(dailyData?.allZones ?? []).map(zone => ({ value: zone, label: zone }))
              ]}
              icon={Filter}
              placeholder={t('heatmap.allZones')}
            />
          </div>
        </div>

        {/* Otomatik Öneriler */}
        <InsightsPanel module="heatmap" />

        <div className="flex justify-center w-full my-4">
          <div className="relative flex bg-slate-800/50 p-1.5 rounded-2xl border border-slate-700/50 w-full max-w-lg shadow-xl shadow-blue-500/5">
            <button
              onClick={() => {
                setViewMode('charts');
                setTimeout(() => {
                  document.getElementById('heatmap-render-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
              }}
              className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
                viewMode === 'charts' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {viewMode === 'charts' && (
                <motion.div
                  layoutId="activeHeatmapTab"
                  className="absolute inset-0 bg-blue-600 rounded-xl shadow-lg shadow-blue-600/20 -z-10"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <BarChart2 className="w-4 h-4" />
              Grafik Görünümü
            </button>
            <button
              onClick={() => {
                setViewMode('floorplan');
                setTimeout(() => {
                  document.getElementById('heatmap-render-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
              }}
              className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
                viewMode === 'floorplan' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {viewMode === 'floorplan' && (
                <motion.div
                  layoutId="activeHeatmapTab"
                  className="absolute inset-0 bg-blue-600 rounded-xl shadow-lg shadow-blue-600/20 -z-10"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <MapPin className="w-4 h-4" />
              {t('heatmap.floorplan')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
            <div className="bg-gradient-to-br from-blue-600/10 to-blue-700/10 p-5 sm:p-6 rounded-2xl border border-blue-500/20 flex flex-col justify-between">
                <div className="flex items-center space-x-4 mb-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/20"><Users className="w-5 h-5 text-white" /></div>
                    <div>
                        <p className="text-xs font-semibold text-blue-300/70 uppercase tracking-wider">{t('heatmap.visitorChange')}</p>
                        <h3 className="text-3xl font-extrabold text-white">{(dailyData?.overallStats.totalVisitors ?? 0).toLocaleString()}</h3>
                    </div>
                </div>
                <div className="flex flex-col gap-1.5 border-t border-blue-500/15 pt-3">
                    {(dailyData?.comparisonStats?.totalVisitors ?? []).map(stat => <ComparisonStatCard key={stat.period} stat={stat} />)}
                </div>
            </div>
          <div className="bg-gradient-to-br from-orange-600/10 to-rose-600/10 p-5 sm:p-6 rounded-2xl border border-orange-500/20 flex items-center space-x-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 shadow-lg shadow-orange-500/20"><Clock className="w-5 h-5 text-white" /></div>
            <div>
              <p className="text-xs font-semibold text-orange-300/70 uppercase tracking-wider">{t('heatmap.avgDwell')}</p>
              <h3 className="text-3xl font-extrabold text-white">{formatDwellTime(dailyData?.overallStats.avgDwellTime ?? 0)}</h3>
            </div>
          </div>
          <div className="bg-gradient-to-br from-emerald-600/10 to-teal-600/10 p-5 sm:p-6 rounded-2xl border border-emerald-500/20 flex items-center space-x-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/20"><MapPin className="w-5 h-5 text-white" /></div>
            <div>
              <p className="text-xs font-semibold text-emerald-300/70 uppercase tracking-wider">{t('heatmap.busiestZone')}</p>
              <h3 className="text-3xl font-extrabold text-white">{dailyData?.overallStats.busiestZone ?? 'N/A'}</h3>
            </div>
          </div>
        </div>
        
        {/* Kamera Alan Galerisi */}
        <CameraZoneGallery />

        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-5 sm:p-6 rounded-2xl border border-slate-700/50">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 mb-4 sm:mb-5">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">{t('heatmap.hourlyDetails')}</h3>
            {isAdmin && hasChanges && (
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <button onClick={handleCancelChanges} className="flex items-center gap-1 text-xs sm:text-sm text-slate-300 hover:text-white px-2 sm:px-3 py-1 rounded-md hover:bg-slate-700 transition-colors"><XCircle className="w-3 h-3 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">{t('heatmap.cancel')}</span></button>
                    <button onClick={handleSaveChanges} disabled={isSaving} className="flex items-center gap-1 text-xs sm:text-sm text-white bg-blue-600 hover:bg-blue-700 px-2 sm:px-3 py-1 rounded-md transition-colors disabled:opacity-50">{isSaving ? <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" /> : <Save className="w-3 h-3 sm:w-4 sm:h-4" />} <span className="hidden sm:inline">{isSaving ? t('heatmap.saving') : t('heatmap.save')}</span></button>
                </div>
            )}
          </div>
          {isAdmin && isEditingDisabled && (
              <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-yellow-900/20 border border-yellow-700 text-yellow-400 text-xs sm:text-sm rounded-lg">
                {t('heatmap.singleZoneEditDisabled')}
              </div>
          )}
          <div className="overflow-x-auto">
            {hourlyDataWithComparison && hourlyDataWithComparison.length > 0 ? (
              <table className="w-full text-[10px] sm:text-xs md:text-sm text-left min-w-[360px] sm:min-w-0">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-800/80 to-slate-800/60">
                    <th scope="col" className="px-2 sm:px-3 md:px-4 lg:px-6 py-2.5 sm:py-3 md:py-3.5 text-[9px] sm:text-xs text-slate-400 uppercase font-bold tracking-widest whitespace-nowrap">{t('heatmap.timeRange')}</th>
                    <th scope="col" className="px-2 sm:px-3 md:px-4 lg:px-6 py-2.5 sm:py-3 md:py-3.5 text-[9px] sm:text-xs text-blue-400 uppercase font-bold tracking-widest text-center whitespace-nowrap">{t('heatmap.visitorCount')}</th>
                    <th scope="col" className="px-2 sm:px-3 md:px-4 lg:px-6 py-2.5 sm:py-3 md:py-3.5 text-[9px] sm:text-xs text-orange-400 uppercase font-bold tracking-widest text-center whitespace-nowrap">{t('heatmap.avgDwellSec')}</th>
                    <th scope="col" className="px-2 sm:px-3 md:px-4 lg:px-6 py-2.5 sm:py-3 md:py-3.5 text-[9px] sm:text-xs text-emerald-400 uppercase font-bold tracking-widest text-center hidden md:table-cell whitespace-nowrap">{t('heatmap.visitorChangeCol')}</th>
                    <th scope="col" className="px-2 sm:px-3 md:px-4 lg:px-6 py-2.5 sm:py-3 md:py-3.5 text-[9px] sm:text-xs text-blue-400 uppercase font-bold tracking-widest text-center hidden lg:table-cell whitespace-nowrap">{t('heatmap.dwellChange')}</th>
                  </tr>
                </thead>
                <tbody>
                  {/* GÜNCELLEME: Filtrelenmiş veri üzerinden map yapılıyor */}
                  {hourlyDataWithComparison.map((hourData) => {
                    const isEdited = !!editedData[hourData.hour];
                    const editedDwellTime = editedData[hourData.hour]?.avgDwellTime;
                    const currentDwellTime = editedDwellTime !== undefined ? editedDwellTime : hourData.avgDwellTime;

                    return (
                      <tr key={hourData.hour} className={`border-b border-slate-700/30 hover:bg-white/[0.02] transition-colors ${isEdited ? 'bg-blue-900/15' : ''}`}>
                        <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-1.5 sm:py-2 md:py-3 lg:py-4 font-medium text-white whitespace-nowrap text-[10px] sm:text-xs md:text-sm">{`${hourData.hour}:00-${hourData.hour}:59`}</td>
                        <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-1.5 sm:py-2 md:py-3 lg:py-4 text-center">
                          <input type="number" value={editedData[hourData.hour]?.totalVisitors !== undefined ? editedData[hourData.hour]?.totalVisitors : hourData.totalVisitors} onChange={e => handleDataChange(hourData.hour, 'totalVisitors', e.target.value)} className="w-16 sm:w-20 md:w-24 bg-slate-800 text-blue-400 font-semibold text-center rounded-md border border-slate-600 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-800/50 disabled:cursor-not-allowed text-[10px] sm:text-xs"
                          disabled={!isAdmin || isEditingDisabled || !hourData.editable_id}
                          title={!isAdmin ? "Bu alanı sadece adminler düzenleyebilir." : isEditingDisabled ? "Tekil bölge verisi düzenlenemez." : (!hourData.editable_id ? "Bu saat diliminde düzenlenecek veri yok." : "")} />
                        </td>
                        <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-1.5 sm:py-2 md:py-3 lg:py-4 text-center">
                          <input type="number" value={typeof currentDwellTime === 'number' ? Math.round(currentDwellTime) : currentDwellTime} onChange={e => handleDataChange(hourData.hour, 'avgDwellTime', e.target.value)} className="w-16 sm:w-20 md:w-24 bg-slate-800 text-slate-300 text-center rounded-md border border-slate-600 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-800/50 disabled:cursor-not-allowed text-[10px] sm:text-xs" 
                          disabled={!isAdmin || isEditingDisabled || !hourData.editable_id} 
                          title={!isAdmin ? "Bu alanı sadece adminler düzenleyebilir." : isEditingDisabled ? "Tekil bölge verisi düzenlenemez." : (!hourData.editable_id ? "Bu saat diliminde düzenlenecek veri yok." : "")} />
                        </td>
                        <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-1.5 sm:py-2 md:py-3 lg:py-4 text-center hidden md:table-cell"><ChangeIndicator change={hourData.visitorChange} /></td>
                        <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-1.5 sm:py-2 md:py-3 lg:py-4 text-center hidden lg:table-cell"><ChangeIndicator change={hourData.dwellChange} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-8 text-slate-400 text-sm">
                {t('heatmap.noData') || 'Bu tarih için veri bulunamadı.'}
              </div>
            )}
          </div>
        </div>

        {filteredAndShiftedHourlyData && filteredAndShiftedHourlyData.length > 0 && (
          <div id="heatmap-render-container" className="scroll-mt-24">
            {viewMode === 'floorplan' ? (
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-5 sm:p-6 rounded-2xl border border-slate-700/50">
              <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-orange-400" /> {t('heatmap.floorplanTitle')}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">{t('heatmap.floorplanDesc')}</p>
                </div>
              </div>

              {/* 2D Floor Plan Container */}
              <div className="relative w-full aspect-[16/10] min-h-[300px] md:min-h-[450px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-700/50 shadow-inner flex items-center justify-center">
                {/* Blueprint Background Grid / High-tech look */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
                
                {/* Tech Blueprint elements (mock store walls & registers to make it look premium out-of-the-box) */}
                <div className="absolute inset-x-[10%] inset-y-[15%] border-2 border-dashed border-blue-500/10 rounded-xl pointer-events-none flex items-center justify-center">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-700/60 select-none">MAĞAZA ALANI (Blueprint)</span>
                </div>

                {/* Mock registers at the bottom-left */}
                <div className="absolute bottom-[18%] left-[15%] w-16 h-12 border border-blue-500/20 bg-slate-900/50 rounded flex items-center justify-center pointer-events-none">
                  <span className="text-[9px] text-slate-500">KASA 1</span>
                </div>
                <div className="absolute bottom-[18%] left-[28%] w-16 h-12 border border-blue-500/20 bg-slate-900/50 rounded flex items-center justify-center pointer-events-none">
                  <span className="text-[9px] text-slate-500">KASA 2</span>
                </div>

                {/* Mock entrance at the bottom middle */}
                <div className="absolute bottom-[5%] left-[45%] right-[45%] h-4 border-t-2 border-dashed border-blue-400/40 flex items-center justify-center pointer-events-none">
                  <span className="text-[8px] tracking-widest text-blue-400/50 font-bold">GİRİŞ</span>
                </div>

                {/* Heatmap overlay dots */}
                {dailyData?.zonePerformance && dailyData.zonePerformance.length > 0 ? (
                  dailyData.zonePerformance.map((zp, idx) => {
                    const coord = zoneCoordinates[zp.zone] || { 
                      top: `${30 + (idx * 15) % 50}%`, 
                      left: `${20 + (idx * 20) % 65}%` 
                    };
                    
                    const maxVal = Math.max(...(dailyData?.zonePerformance ?? []).map(z => z.totalVisitors), 1);
                    const ratio = zp.totalVisitors / maxVal;
                    
                    // Calculate heat colors
                    let heatBg = 'bg-blue-500/60 border-blue-400 shadow-blue-500/50';
                    let pulseBg = 'bg-blue-400/30';
                    let textBadge = 'bg-blue-500/20 text-blue-300';
                    
                    if (ratio > 0.75) {
                      heatBg = 'bg-red-500/70 border-red-400 shadow-red-500/50';
                      pulseBg = 'bg-red-400/40';
                      textBadge = 'bg-red-500/20 text-red-300';
                    } else if (ratio > 0.35) {
                      heatBg = 'bg-orange-500/65 border-orange-400 shadow-orange-500/50';
                      pulseBg = 'bg-orange-400/35';
                      textBadge = 'bg-orange-500/20 text-orange-300';
                    } else if (ratio > 0.1) {
                      heatBg = 'bg-green-500/60 border-green-400 shadow-green-500/50';
                      pulseBg = 'bg-green-400/30';
                      textBadge = 'bg-green-500/20 text-green-300';
                    }

                    return (
                      <div
                        key={zp.zone}
                        className="absolute -translate-x-1/2 -translate-y-1/2 group z-20 cursor-pointer"
                        style={{ top: coord.top, left: coord.left }}
                      >
                        {/* Pulsing glow ring */}
                        <div className={`absolute -inset-4 rounded-full animate-ping ${pulseBg} opacity-75 pointer-events-none`} />
                        
                        {/* Main heat blob */}
                        <div className={`w-8 h-8 rounded-full border-2 shadow-lg flex items-center justify-center transition-transform group-hover:scale-125 ${heatBg}`}>
                          <span className="text-[10px] font-extrabold text-white">{Math.round(zp.totalVisitors)}</span>
                        </div>

                        {/* Detail tooltip overlay */}
                        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-48 bg-slate-900/95 border border-slate-700/80 rounded-xl p-3 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-30">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-white">{zp.zone}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${textBadge}`}>
                              {Math.round(ratio * 100)}% Yoğunluk
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-slate-400">
                              <span>Toplam Giriş:</span>
                              <span className="font-bold text-slate-200">{zp.totalVisitors}</span>
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-400">
                              <span>Ort. Kalma:</span>
                              <span className="font-bold text-slate-200">{formatDwellTime(zp.avgDwell)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-500">Bu tarih için haritada gösterebilecek veri bulunamadı.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
              {/* Grafik 1: Saatlik Ziyaretçi + Bekleme Süresi */}
              <ChartCard title={t('heatmap.hourlyVisitorDwell')}>
                <div ref={chart1Ref} style={{width:'100%',overflow:'hidden'}}>
                    <ComposedChart width={chart1W} height={360} data={filteredAndShiftedHourlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="hour" stroke="#9CA3AF" fontSize={9} tickFormatter={(hour) => `${hour}:00`}/>
                        <YAxis yAxisId="left" stroke="#9CA3AF" fontSize={9} />
                        <YAxis yAxisId="right" orientation="right" stroke={chartColors.secondary} fontSize={9} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => (name.includes("Bekleme") || name.includes("Dwell")) ? formatDwellTime(value) : value} />
                        <Legend iconType="circle" iconSize={8} />
                        <Bar yAxisId="left" dataKey="totalVisitors" fill={chartColors.primary} name={t('heatmap.visitorCount')} radius={[4, 4, 0, 0]} />
                        <Line yAxisId="right" type="monotone" dataKey="avgDwellTime" stroke={chartColors.secondary} strokeWidth={2.5} name={t('heatmap.avgDwellChart')} dot={{ fill: chartColors.secondary, r: 3 }} />
                    </ComposedChart>
                </div>
              </ChartCard>

              {/* Grafik 2: Bölge Performans Karşılaştırma */}
              {dailyData?.zonePerformance && dailyData.zonePerformance.length > 0 && (
                <ChartCard title={t('heatmap.zonePerformance')}>
                  <div ref={chart2Ref} style={{width:'100%',overflow:'hidden'}}>
                      <ComposedChart width={chart2W} height={360} data={dailyData.zonePerformance}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="zone" stroke="#9CA3AF" fontSize={9} />
                          <YAxis yAxisId="left" stroke="#9CA3AF" fontSize={9} />
                          <YAxis yAxisId="right" orientation="right" stroke={chartColors.accent} fontSize={9} />
                          <Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => (name.includes("Bekleme") || name.includes("Dwell")) ? formatDwellTime(value) : value} />
                          <Legend iconType="circle" iconSize={8} />
                          <Bar yAxisId="left" dataKey="totalVisitors" fill={chartColors.primary} name={t('heatmap.visitorCount')} radius={[4, 4, 0, 0]} />
                          <Line yAxisId="right" type="monotone" dataKey="avgDwell" stroke={chartColors.accent} strokeWidth={2.5} name={t('heatmap.avgDwellShort')} dot={{ fill: chartColors.accent, r: 3 }} />
                      </ComposedChart>
                  </div>
                </ChartCard>
              )}

              {/* Grafik 3: Saatlik Ziyaretçi Trend (Alan Grafiği) */}
              <ChartCard title="Saatlik Ziyaretçi Trendi">
                <div ref={chart3Ref} style={{width:'100%',overflow:'hidden'}}>
                  <AreaChart width={chart3W} height={360} data={filteredAndShiftedHourlyData}>
                    <defs>
                      <linearGradient id="gradVisitors" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="hour" stroke="#9CA3AF" fontSize={9} tickFormatter={(h) => `${h}:00`} />
                    <YAxis stroke="#9CA3AF" fontSize={9} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="totalVisitors" stroke={chartColors.primary} strokeWidth={2.5} fill="url(#gradVisitors)" name={t('heatmap.visitorCount')} />
                  </AreaChart>
                </div>
              </ChartCard>

              {/* Grafik 4: Bölge Ziyaretçi Dağılımı (Pie) */}
              {dailyData?.zonePerformance && dailyData.zonePerformance.length > 0 && (() => {
                const PIE_COLORS = ['#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899'];
                const totalZoneVisitors = dailyData.zonePerformance.reduce((s, z) => s + z.totalVisitors, 0);
                const donutData = dailyData.zonePerformance.map(z => ({ name: z.zone, value: z.totalVisitors }));
                return (
                  <ChartCard title="Bölge Ziyaretçi Dağılımı">
                    <PremiumDonut data={donutData} colors={PIE_COLORS} total={totalZoneVisitors} labelTitle="Bölgeler" />
                  </ChartCard>
                );
              })()}
            </div>
          )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (<div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-5 sm:p-6 rounded-2xl border border-slate-700/50 flex flex-col min-h-[420px] min-w-0 overflow-hidden"><h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2 shrink-0"><BarChart2 size={16} className="text-indigo-400" /> {title}</h3><div style={{flex:1,minHeight:300,width:'100%',overflow:'hidden'}}>{children}</div></div>);

export default Heatmaps;