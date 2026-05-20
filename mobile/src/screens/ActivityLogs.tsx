import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { FileText } from 'lucide-react-native';
import { useLanguage } from '../contexts/LanguageContext';
import { apiFetch } from '../lib/api';
import Header from '../components/Header';

interface LogEntry {
  id: number;
  user_id: number | null;
  type: string;
  ip: string | null;
  created_at: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  login_ok: 'Giriş başarılı',
  login_fail: 'Giriş başarısız',
  logout: 'Çıkış',
  page_view: 'Sayfa görüntüleme',
  chat_message: 'Sohbet mesajı',
  error: 'Hata',
};

interface ActivityLogsProps {
  onLogout?: () => void;
}

const ActivityLogs: React.FC<ActivityLogsProps> = ({ onLogout }) => {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/admin/activity-logs?page=1&per_page=50');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      } else {
        setError(t('common.error'));
      }
    } catch {
      setError(t('msg.serverError') || 'Sunucu hatası');
      setLogs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const formatDate = (iso: string | null) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return iso || '';
    }
  };

  return (
    <View style={styles.container}>
      <Header title={t('nav.activityLogs')} onLogout={onLogout} />
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchLogs(true)} colors={['#3B82F6']} />
          }
        >
          {logs.length === 0 ? (
            <View style={styles.empty}>
              <FileText size={48} color="#64748b" />
              <Text style={styles.emptyText}>{t('common.noData')}</Text>
            </View>
          ) : (
            logs.map((log) => (
              <View key={log.id} style={styles.card}>
                <View style={styles.cardRow}>
                  <Text style={styles.type}>{TYPE_LABELS[log.type] || log.type}</Text>
                  <Text style={styles.date}>{formatDate(log.created_at)}</Text>
                </View>
                {log.user_id != null && (
                  <Text style={styles.meta}>User ID: {log.user_id}</Text>
                )}
                {log.ip && (
                  <Text style={styles.meta}>IP: {log.ip}</Text>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    color: '#64748b',
    marginTop: 12,
    fontSize: 16,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  type: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  date: {
    color: '#94a3b8',
    fontSize: 12,
  },
  meta: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
});

export default ActivityLogs;
