import React, { useState } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onApply?: () => void;
  className?: string;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onApply,
  className = '',
}) => {
  const [showPresets, setShowPresets] = useState(false);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  const shiftDay = (direction: -1 | 1) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + direction);
    const newDate = formatDate(d);
    if (direction === 1 && newDate > todayStr) return;
    onStartDateChange(newDate);
    onEndDateChange(newDate);
  };

  const presets = [
    { label: 'Bugün', days: 0 },
    { label: 'Dün', days: 1 },
    { label: 'Son 7 Gün', days: 7 },
    { label: 'Son 14 Gün', days: 14 },
    { label: 'Son 30 Gün', days: 30 },
    { label: 'Bu Ay', days: -1 },
    { label: 'Geçen Ay', days: -2 },
  ];

  const applyPreset = (preset: { label: string; days: number }) => {
    let start: Date;
    let end: Date = today;

    if (preset.days === 0) {
      start = today;
    } else if (preset.days === 1) {
      start = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      end = start;
    } else if (preset.days === -1) {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (preset.days === -2) {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
    } else {
      start = new Date(today.getTime() - preset.days * 24 * 60 * 60 * 1000);
    }

    onStartDateChange(formatDate(start));
    onEndDateChange(formatDate(end));
    setShowPresets(false);
    if (onApply) onApply();
  };

  return (
    <div className={`flex items-center gap-1.5 sm:gap-2 flex-wrap ${className}`}>
      {/* Sola git */}
      <button
        onClick={() => shiftDay(-1)}
        className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50 hover:bg-slate-700/60 transition-colors flex-shrink-0"
        aria-label="Önceki gün"
      >
        <ChevronLeft className="w-4 h-4 text-slate-300" />
      </button>

      {/* Tarih inputları */}
      <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-800/60 border border-slate-700/50 rounded-xl px-2 sm:px-3 py-2 min-w-0">
        <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0 hidden sm:block" />
        <input
          type="date"
          value={startDate}
          max={todayStr}
          onChange={(e) => {
            const newStart = e.target.value;
            if (newStart > endDate) {
              onStartDateChange(endDate);
              onEndDateChange(newStart);
            } else {
              onStartDateChange(newStart);
            }
          }}
          className="bg-transparent text-xs sm:text-sm text-slate-200 outline-none w-[105px] sm:w-[120px] [color-scheme:dark]"
        />
        <span className="text-slate-500 mx-0.5">—</span>
        <input
          type="date"
          value={endDate}
          max={todayStr}
          onChange={(e) => {
            const newEnd = e.target.value;
            if (newEnd < startDate) {
              onEndDateChange(startDate);
              onStartDateChange(newEnd);
            } else {
              onEndDateChange(newEnd);
            }
          }}
          className="bg-transparent text-xs sm:text-sm text-slate-200 outline-none w-[105px] sm:w-[120px] [color-scheme:dark]"
        />
      </div>

      {/* Sağa git */}
      <button
        onClick={() => shiftDay(1)}
        disabled={startDate >= todayStr}
        className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50 hover:bg-slate-700/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        aria-label="Sonraki gün"
      >
        <ChevronRight className="w-4 h-4 text-slate-300" />
      </button>

      {/* Hızlı seçim */}
      <div className="relative">
        <button
          onClick={() => setShowPresets(!showPresets)}
          className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs sm:text-sm text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
        >
          <span className="hidden xs:inline">Hızlı</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        {showPresets && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowPresets(false)} />
            <div className="absolute top-full mt-1 right-0 z-50 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden min-w-[130px]">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset)}
                  className="w-full text-left px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-slate-300 hover:bg-slate-800/80 hover:text-white transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Uygula butonu */}
      {onApply && (
        <button
          onClick={onApply}
          className="px-3 sm:px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-medium shadow-sm shadow-indigo-500/20 transition-colors flex-shrink-0"
        >
          Uygula
        </button>
      )}
    </div>
  );
};

export default DateRangePicker;
