import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Video, Eye } from 'lucide-react';
import { apiFetch } from '../../lib/api';

interface CameraInfo {
  id: number;
  name: string;
  type: string;
  rtsp: string;
  imageUrl: string;
}

interface CameraViewerProps {
  className?: string;
}

const CameraViewer: React.FC<CameraViewerProps> = ({ className = '' }) => {
  const [cameras, setCameras] = useState<CameraInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<CameraInfo | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCameras = async () => {
      try {
        const res = await apiFetch('/api/settings/cameras');
        if (res.ok) {
          const data = await res.json();
          setCameras(data.cameras || []);
        }
      } catch {
        // silent
      }
    };
    fetchCameras();
  }, []);

  const handleViewCamera = async (cam: CameraInfo) => {
    setSelectedCamera(cam);
    setLoading(true);
    // Kamera görüntüsünü yenile
    try {
      const res = await apiFetch(`/api/settings/cameras/${cam.id}/snapshot`);
      if (res.ok) {
        const data = await res.json();
        setSelectedCamera({ ...cam, imageUrl: data.image_url || cam.imageUrl });
      }
    } catch {
      // use existing imageUrl
    } finally {
      setLoading(false);
    }
  };

  if (!cameras.length) return null;

  return (
    <>
      {/* Floating Camera Button */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-600/80 to-purple-600/80 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-medium shadow-lg shadow-indigo-500/20 transition-all ${className}`}
      >
        <Camera className="w-4 h-4" />
        <span className="hidden sm:inline">Kameralar</span>
      </button>

      {/* Camera Panel Dropdown */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute right-0 top-12 z-50 w-72 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white">Kamera Listesi</h3>
                </div>
                <button
                  onClick={() => setShowPanel(false)}
                  className="p-1 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              {cameras.map((cam) => (
                <button
                  key={cam.id}
                  onClick={() => handleViewCamera(cam)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800/80 transition-colors text-left group"
                >
                  <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/50 group-hover:border-indigo-500/30">
                    <Camera className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{cam.name}</p>
                    <p className="text-xs text-slate-500">{cam.type}</p>
                  </div>
                  <Eye className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Camera Stream Modal */}
      <AnimatePresence>
        {selectedCamera && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100]"
            onClick={() => setSelectedCamera(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-2xl border border-slate-700/50 w-full max-w-3xl mx-4 overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
                    <Camera className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{selectedCamera.name}</h3>
                    <p className="text-xs text-slate-400">{selectedCamera.type} • RTSP Stream</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCamera(null)}
                  className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4">
                {loading ? (
                  <div className="w-full h-80 bg-slate-800/50 rounded-xl flex items-center justify-center">
                    <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
                  </div>
                ) : selectedCamera.imageUrl ? (
                  <img
                    src={selectedCamera.imageUrl}
                    alt={selectedCamera.name}
                    className="w-full h-auto max-h-[60vh] object-contain rounded-xl bg-black"
                  />
                ) : (
                  <div className="w-full h-80 bg-slate-800/50 rounded-xl flex flex-col items-center justify-center gap-3">
                    <Camera className="w-12 h-12 text-slate-600" />
                    <p className="text-slate-500 text-sm">Kamera görüntüsü yüklenemedi</p>
                    <p className="text-slate-600 text-xs font-mono">{selectedCamera.rtsp}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CameraViewer;
