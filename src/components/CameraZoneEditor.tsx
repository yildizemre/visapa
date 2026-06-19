import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Trash2, Save, RefreshCw, CheckCircle, AlertTriangle, PenTool } from 'lucide-react';
import { apiUrl } from '../lib/api';

interface ZonePoint {
  x: number; // 0-1 normalized
  y: number;
}

interface Zone {
  id?: number;
  camera_id: number;
  name: string;
  points: ZonePoint[];
  color: string;
  sort_order: number;
}

interface CameraZoneEditorProps {
  cameraId: number;
  cameraName: string;
  imageUrl: string;
  onClose: () => void;
}

const ZONE_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1',
];

const CameraZoneEditor: React.FC<CameraZoneEditorProps> = ({ cameraId, cameraName, imageUrl, onClose }) => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawing, setDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<ZonePoint[]>([]);
  const [newZoneName, setNewZoneName] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Zone'ları API'den çek
  const fetchZones = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl(`/api/settings/cameras/${cameraId}/zones`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setZones((data.zones || []).map((z: { id: number; camera_id: number; name: string; points: number[][]; color: string; sort_order: number }) => ({
          ...z,
          points: (z.points || []).map((p: number[]) => ({ x: p[0], y: p[1] })),
        })));
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [cameraId]);

  useEffect(() => { fetchZones(); }, [fetchZones]);

  // Canvas'a zone'ları çiz
  const drawZones = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const rect = img.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Mevcut zone'ları çiz
    for (const zone of zones) {
      if (zone.points.length < 2) continue;
      ctx.beginPath();
      const first = zone.points[0];
      ctx.moveTo(first.x * canvas.width, first.y * canvas.height);
      for (let i = 1; i < zone.points.length; i++) {
        ctx.lineTo(zone.points[i].x * canvas.width, zone.points[i].y * canvas.height);
      }
      ctx.closePath();

      // Fill
      const color = zone.color || '#3b82f6';
      ctx.fillStyle = color + '25';
      ctx.fill();

      // Stroke
      ctx.strokeStyle = color;
      ctx.lineWidth = selectedZoneId === zone.id ? 3 : 2;
      ctx.stroke();

      // Label
      const cx = zone.points.reduce((s, p) => s + p.x, 0) / zone.points.length * canvas.width;
      const cy = zone.points.reduce((s, p) => s + p.y, 0) / zone.points.length * canvas.height;
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(zone.name, cx - ctx.measureText(zone.name).width / 2, cy + 4);
      ctx.fillText(zone.name, cx - ctx.measureText(zone.name).width / 2, cy + 4);

      // Noktalar
      for (const p of zone.points) {
        ctx.beginPath();
        ctx.arc(p.x * canvas.width, p.y * canvas.height, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // Çizim modundaki noktalar
    if (currentPoints.length > 0) {
      ctx.beginPath();
      const first = currentPoints[0];
      ctx.moveTo(first.x * canvas.width, first.y * canvas.height);
      for (let i = 1; i < currentPoints.length; i++) {
        ctx.lineTo(currentPoints[i].x * canvas.width, currentPoints[i].y * canvas.height);
      }
      if (currentPoints.length >= 3) {
        ctx.closePath();
        ctx.fillStyle = '#3b82f625';
        ctx.fill();
      }
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Noktalar
      for (let i = 0; i < currentPoints.length; i++) {
        const p = currentPoints[i];
        ctx.beginPath();
        ctx.arc(p.x * canvas.width, p.y * canvas.height, 5, 0, Math.PI * 2);
        ctx.fillStyle = i === 0 ? '#10b981' : '#3b82f6';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Numara
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.fillStyle = '#fff';
        ctx.fillText(String(i + 1), p.x * canvas.width + 8, p.y * canvas.height - 8);
      }
    }
  }, [zones, currentPoints, selectedZoneId]);

  useEffect(() => { drawZones(); }, [drawZones]);

  // Resize observer
  useEffect(() => {
    const handleResize = () => drawZones();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawZones]);

  // Canvas click — nokta ekle
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setCurrentPoints(prev => [...prev, { x, y }]);
  };

  // Çizimi tamamla — kaydet
  const handleSaveZone = async () => {
    if (currentPoints.length < 3) {
      setMsg({ ok: false, text: 'En az 3 nokta gerekli' });
      return;
    }
    if (!newZoneName.trim()) {
      setMsg({ ok: false, text: 'Alan adı gerekli' });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const token = localStorage.getItem('token');
      const color = ZONE_COLORS[zones.length % ZONE_COLORS.length];
      const res = await fetch(apiUrl(`/api/settings/cameras/${cameraId}/zones`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: newZoneName.trim(),
          points: currentPoints.map(p => [p.x, p.y]),
          color,
        }),
      });
      if (res.ok) {
        setMsg({ ok: true, text: 'Alan kaydedildi' });
        setDrawing(false);
        setCurrentPoints([]);
        setNewZoneName('');
        fetchZones();
      } else {
        const err = await res.json().catch(() => ({}));
        setMsg({ ok: false, text: err.error || 'Hata oluştu' });
      }
    } catch {
      setMsg({ ok: false, text: 'Bağlantı hatası' });
    } finally {
      setSaving(false);
    }
  };

  // Zone sil
  const handleDeleteZone = async (zoneId: number) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl(`/api/settings/cameras/${cameraId}/zones/${zoneId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setZones(prev => prev.filter(z => z.id !== zoneId));
        if (selectedZoneId === zoneId) setSelectedZoneId(null);
        setMsg({ ok: true, text: 'Alan silindi' });
      }
    } catch {
      setMsg({ ok: false, text: 'Silinemedi' });
    }
  };

  // Son noktayı geri al
  const handleUndo = () => {
    setCurrentPoints(prev => prev.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
          <div>
            <h3 className="text-lg font-bold text-white">{cameraName} — Alan Çizimi</h3>
            <p className="text-xs text-slate-400 mt-0.5">Kamera görüntüsü üzerinde polygon alanlar tanımlayın</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 flex flex-col lg:flex-row gap-4">
          {/* Sol: Kamera görüntüsü + canvas */}
          <div className="flex-1 min-w-0">
            <div ref={containerRef} className="relative bg-black rounded-xl overflow-hidden">
              {imageUrl ? (
                <img
                  ref={imgRef}
                  src={imageUrl}
                  alt={cameraName}
                  className="w-full h-auto"
                  onLoad={drawZones}
                  draggable={false}
                />
              ) : (
                <div className="w-full aspect-video bg-slate-800 flex items-center justify-center text-slate-500 text-sm">
                  Kamera görüntüsü yok
                </div>
              )}
              <canvas
                ref={canvasRef}
                className={`absolute inset-0 ${drawing ? 'cursor-crosshair' : 'cursor-default'}`}
                onClick={handleCanvasClick}
              />
            </div>

            {/* Çizim kontrolleri */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {!drawing ? (
                <button
                  onClick={() => { setDrawing(true); setCurrentPoints([]); setMsg(null); }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <PenTool className="w-4 h-4" />
                  Alan Çiz
                </button>
              ) : (
                <>
                  <input
                    type="text"
                    value={newZoneName}
                    onChange={e => setNewZoneName(e.target.value)}
                    placeholder="Alan adı (ör: Giriş, Kasa, Vitrin)"
                    className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 w-48"
                  />
                  <span className="text-xs text-slate-400">{currentPoints.length} nokta</span>
                  {currentPoints.length > 0 && (
                    <button onClick={handleUndo} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs font-medium transition-colors">
                      Geri Al
                    </button>
                  )}
                  <button
                    onClick={handleSaveZone}
                    disabled={saving || currentPoints.length < 3}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Kaydet
                  </button>
                  <button
                    onClick={() => { setDrawing(false); setCurrentPoints([]); setNewZoneName(''); }}
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                  >
                    İptal
                  </button>
                </>
              )}
            </div>
            {drawing && (
              <p className="text-xs text-blue-400 mt-2">Görüntüye tıklayarak polygon köşelerini belirleyin. En az 3 nokta gerekli.</p>
            )}
          </div>

          {/* Sağ: Zone listesi */}
          <div className="w-full lg:w-64 flex-shrink-0">
            <h4 className="text-sm font-semibold text-white mb-2">Tanımlı Alanlar ({zones.length})</h4>
            {loading ? (
              <div className="text-slate-500 text-xs">Yükleniyor...</div>
            ) : zones.length === 0 ? (
              <div className="text-slate-500 text-xs p-3 bg-slate-800/50 rounded-lg text-center">
                Henüz alan tanımlanmadı
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {zones.map(zone => (
                  <div
                    key={zone.id}
                    onClick={() => setSelectedZoneId(selectedZoneId === zone.id ? null : (zone.id ?? null))}
                    className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all ${
                      selectedZoneId === zone.id
                        ? 'bg-blue-500/10 border border-blue-500/30'
                        : 'bg-slate-800/50 border border-slate-700/30 hover:bg-slate-700/50'
                    }`}
                  >
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: zone.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{zone.name}</p>
                      <p className="text-[10px] text-slate-500">{zone.points.length} nokta</p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); if (zone.id) handleDeleteZone(zone.id); }}
                      className="p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
                      title="Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        {msg && (
          <div className={`px-4 py-2 border-t border-slate-700/50 flex items-center gap-1.5 text-xs ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>
            {msg.ok ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            {msg.text}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default CameraZoneEditor;
