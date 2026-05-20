import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';
import { apiUrl } from '../lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Heart, AlertCircle } from 'lucide-react-native';

type HealthStatus = 'loading' | 'healthy' | 'unhealthy' | 'error';

const HealthStatusIndicator: React.FC = () => {
  const { t } = useLanguage();
  const [healthStatus, setHealthStatus] = useState<HealthStatus>('loading');
  const [statusMessage, setStatusMessage] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);

  const fetchHealthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const url = apiUrl('/api/health/status');
      const response = await fetch(url, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = response.ok ? await response.json().catch(() => ({})) : {};

      if (response.ok) {
        setHealthStatus('healthy');
        setStatusMessage(`${t('health.systemActive')}${data.message ? `: ${data.message}` : ''}`);
      } else {
        setHealthStatus('unhealthy');
        setStatusMessage(`${t('health.systemError')}${data.message ? `: ${data.message}` : ''}`);
      }
    } catch {
      setHealthStatus('error');
      setStatusMessage(t('health.connectionFailed'));
    }
  };

  useEffect(() => {
    setStatusMessage(t('health.checking'));
    fetchHealthStatus();
    const interval = setInterval(fetchHealthStatus, 30000);
    return () => clearInterval(interval);
  }, [t]);

  const dotColor =
    healthStatus === 'healthy'
      ? '#22c55e'
      : healthStatus === 'loading'
        ? '#eab308'
        : '#ef4444';

  return (
    <TouchableOpacity
      style={[styles.container, { borderColor: dotColor + '50', backgroundColor: dotColor + '15' }]}
      onPress={() => setShowTooltip(!showTooltip)}
      activeOpacity={0.8}
    >
      {healthStatus === 'loading' ? (
        <ActivityIndicator size="small" color="#eab308" />
      ) : healthStatus === 'healthy' ? (
        <Heart size={14} color="#22c55e" fill="#22c55e" />
      ) : (
        <AlertCircle size={14} color="#ef4444" />
      )}
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      {showTooltip && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipTitle}>{t('health.title')}</Text>
          <Text style={styles.tooltipMessage}>{statusMessage}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tooltip: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 6,
    minWidth: 200,
    backgroundColor: '#334155',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#475569',
    zIndex: 100,
  },
  tooltipTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  tooltipMessage: {
    fontSize: 11,
    color: '#94a3b8',
  },
});

export default HealthStatusIndicator;
