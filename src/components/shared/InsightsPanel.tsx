import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, AlertTriangle, CheckCircle2, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { apiFetch } from '../../lib/api';

interface Insight {
  type: 'success' | 'warning' | 'danger' | 'info';
  title: string;
  description: string;
  metric: string;
  priority: 'high' | 'medium' | 'low';
}

interface InsightsPanelProps {
  module: 'dashboard' | 'customer' | 'queue' | 'heatmap' | 'staff' | 'flow';
  refreshTrigger?: number;
}

const typeConfig = {
  success: {
    icon: CheckCircle2,
    bg: 'from-emerald-500/10 to-teal-500/5',
    border: 'border-emerald-500/20',
    iconColor: 'text-emerald-400',
    metricColor: 'text-emerald-300',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'from-amber-500/10 to-yellow-500/5',
    border: 'border-amber-500/20',
    iconColor: 'text-amber-400',
    metricColor: 'text-amber-300',
  },
  danger: {
    icon: AlertTriangle,
    bg: 'from-rose-500/10 to-red-500/5',
    border: 'border-rose-500/20',
    iconColor: 'text-rose-400',
    metricColor: 'text-rose-300',
  },
  info: {
    icon: Info,
    bg: 'from-sky-500/10 to-blue-500/5',
    border: 'border-sky-500/20',
    iconColor: 'text-sky-400',
    metricColor: 'text-sky-300',
  },
};

const InsightsPanel: React.FC<InsightsPanelProps> = ({ module, refreshTrigger }) => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const res = await apiFetch(`/api/analytics/insights/${module}`);
        if (res.ok) {
          const data = await res.json();
          setInsights(data.insights || []);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchInsights();
  }, [module, refreshTrigger]);

  if (loading) {
    return (
      <div className="animate-pulse flex gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-1 h-20 rounded-xl bg-slate-800/50" />
        ))}
      </div>
    );
  }

  if (!insights.length) return null;

  return (
    <div className="w-full">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 mb-3 group"
      >
        <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20">
          <Lightbulb className="w-4 h-4 text-amber-400" />
        </div>
        <span className="text-sm font-bold text-slate-300 uppercase tracking-wider">
          Öneriler & Analizler
        </span>
        <span className="text-xs text-slate-500 ml-1">({insights.length})</span>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
        )}
      </button>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3"
        >
          {insights.map((insight, idx) => {
            const config = typeConfig[insight.type] || typeConfig.info;
            const Icon = config.icon;

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`relative overflow-hidden rounded-xl border ${config.border} bg-gradient-to-br ${config.bg} p-5`}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-slate-100 truncate">
                        {insight.title}
                      </h4>
                      <span className={`text-sm font-bold ${config.metricColor} whitespace-nowrap`}>
                        {insight.metric}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 mt-1.5 leading-relaxed line-clamp-3">
                      {insight.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
};

export default InsightsPanel;
