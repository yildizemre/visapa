import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, Sun, CloudRain, CloudSnow, Zap, Wind, Search, MapPin, X, ChevronDown } from 'lucide-react';
import { apiUrl } from '../lib/api';

interface ForecastDay {
  day: string;
  date: string;
  temp: number | null;
  temp_max: number | null;
  temp_min: number | null;
  cond: string;
  precip: number;
}

interface WeatherData {
  temperature: number;
  condition: string;
  windspeed: number;
  isRainExpected: boolean;
  nextRainyDay: string | null;
  forecast: ForecastDay[];
  lat: string;
  lon: string;
}

interface LocationResult {
  name: string;
  country: string;
  admin1: string;
  lat: number;
  lon: number;
}

const COND_ICON: Record<string, React.ReactNode> = {
  sunny: <Sun className="w-4 h-4 text-yellow-400" />,
  cloudy: <Cloud className="w-4 h-4 text-slate-400" />,
  foggy: <Cloud className="w-4 h-4 text-slate-500" />,
  rainy: <CloudRain className="w-4 h-4 text-blue-400" />,
  snowy: <CloudSnow className="w-4 h-4 text-sky-300" />,
  stormy: <Zap className="w-4 h-4 text-yellow-300" />,
};

const COND_LABEL: Record<string, string> = {
  sunny: 'Açık', cloudy: 'Bulutlu', foggy: 'Sisli',
  rainy: 'Yağmurlu', snowy: 'Karlı', stormy: 'Fırtınalı',
};

const WeatherForecastIndicator: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<LocationResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [currentCity, setCurrentCity] = useState(() => localStorage.getItem('weather_city') || 'İstanbul');
  const [currentLat, setCurrentLat] = useState(() => localStorage.getItem('weather_lat') || '41.0082');
  const [currentLon, setCurrentLon] = useState(() => localStorage.getItem('weather_lon') || '28.9784');

  const fetchWeather = async (lat: string, lon: string) => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/weather/forecast?lat=${lat}&lon=${lon}`));
      if (res.ok) setWeather(await res.json());
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchWeather(currentLat, currentLon);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLat, currentLon]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false); setSearchMode(false); setSearchQ('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!searchQ || searchQ.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(apiUrl(`/api/weather/location-search?q=${encodeURIComponent(searchQ)}`));
        if (res.ok) { const d = await res.json(); setSearchResults(d.results || []); }
      } catch { /* ignore */ } finally { setSearchLoading(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQ]);

  const selectLocation = (r: LocationResult) => {
    const lat = String(r.lat);
    const lon = String(r.lon);
    localStorage.setItem('weather_lat', lat);
    localStorage.setItem('weather_lon', lon);
    localStorage.setItem('weather_city', r.name);
    setCurrentLat(lat);
    setCurrentLon(lon);
    setCurrentCity(r.name);
    setSearchMode(false); setSearchQ(''); setSearchResults([]);
    fetchWeather(lat, lon);
  };

  const cond = weather?.condition || 'cloudy';

  return (
    <div ref={wrapperRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(p => !p)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
          weather?.isRainExpected
            ? 'bg-blue-500/10 border-blue-500/30 text-blue-300 hover:bg-blue-500/20'
            : 'bg-slate-800/60 border-slate-700/40 text-slate-300 hover:bg-slate-700/60'
        }`}
      >
        {loading ? <Cloud className="w-3.5 h-3.5 animate-pulse" /> : (COND_ICON[cond] ?? <Cloud className="w-3.5 h-3.5" />)}
        <span className="hidden sm:inline">
          {loading ? '...' : `${weather?.temperature ?? '--'}°C`}
        </span>
        <span className="hidden md:inline text-slate-500">·</span>
        <span className="hidden md:inline truncate max-w-[80px]">{currentCity}</span>
        <ChevronDown className="w-3 h-3 text-slate-500" />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full right-0 mb-2 w-72 bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/50 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-800/60">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-semibold text-slate-200">{currentCity}</span>
              </div>
              <button
                onClick={() => setSearchMode(p => !p)}
                className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-700/50 hover:bg-slate-700"
              >
                <Search className="w-3 h-3" /> Konum Değiştir
              </button>
            </div>

            {/* Location search */}
            {searchMode && (
              <div className="px-4 py-3 border-b border-slate-700/30">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    autoFocus
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    placeholder="Şehir ara..."
                    className="w-full bg-slate-800 border border-slate-600/50 rounded-lg pl-8 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500/60"
                  />
                  {searchQ && (
                    <button onClick={() => { setSearchQ(''); setSearchResults([]); }} className="absolute right-2 top-1/2 -translate-y-1/2">
                      <X className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                  )}
                </div>
                {searchLoading && <p className="text-[10px] text-slate-500 mt-1.5">Aranıyor...</p>}
                {searchResults.length > 0 && (
                  <div className="mt-1.5 space-y-0.5">
                    {searchResults.map((r, i) => (
                      <button
                        key={i}
                        onClick={() => selectLocation(r)}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-700/60 text-xs text-slate-200 flex items-center gap-2"
                      >
                        <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                        <span>{r.name}{r.admin1 ? `, ${r.admin1}` : ''}</span>
                        <span className="text-slate-500 ml-auto">{r.country}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Current weather */}
            {weather && !loading && (
              <div className="px-4 py-3 flex items-center justify-between border-b border-slate-700/30">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/40">
                    {COND_ICON[cond] ?? <Cloud className="w-5 h-5 text-slate-400" />}
                  </div>
                  <div>
                    <p className="text-xl font-bold text-white">{weather.temperature}°C</p>
                    <p className="text-[10px] text-slate-400">{COND_LABEL[cond] ?? cond}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 justify-end">
                    <Wind className="w-3 h-3" /> {weather.windspeed} km/h
                  </div>
                  {weather.isRainExpected && (
                    <p className="text-[10px] text-blue-400 mt-1">
                      <CloudRain className="inline w-3 h-3 mr-0.5" />
                      Yağış: {weather.nextRainyDay}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 7-day forecast */}
            {weather?.forecast && weather.forecast.length > 0 && (
              <div className="px-4 py-3">
                <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold mb-2">7 Günlük Tahmin</p>
                <div className="space-y-1">
                  {weather.forecast.map((day, i) => (
                    <div key={i} className="flex items-center justify-between py-1">
                      <span className="text-[11px] text-slate-400 w-8">{day.day}</span>
                      <span className="text-[10px] text-slate-500 flex-1 ml-1">{COND_LABEL[day.cond] ?? day.cond}</span>
                      <div className="flex items-center gap-1.5">
                        {COND_ICON[day.cond] ?? <Cloud className="w-3.5 h-3.5" />}
                        <span className="text-[11px] text-blue-300">{day.temp_min ?? '--'}°</span>
                        <span className="text-[10px] text-slate-600">/</span>
                        <span className="text-[11px] text-orange-300 font-medium">{day.temp_max ?? '--'}°</span>
                        {(day.precip ?? 0) > 0 && (
                          <span className="text-[9px] text-blue-400">{day.precip}mm</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WeatherForecastIndicator;
