import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { FileText, Calendar, Plus, Users, MapPin, Clock, Zap, RefreshCw } from 'lucide-react-native';
import { useLanguage } from '../contexts/LanguageContext';
import { apiFetch } from '../lib/api';
import { useStoreChange } from '../hooks/useStoreChange';
import Header from '../components/Header';

interface ReportAnalyticsProps {
  onLogout?: () => void;
}

interface AiReport {
  id: string;
  name: string;
  analysis_type: 'customer' | 'heatmap' | 'queue';
  result: string;
  status: 'completed' | 'processing' | 'failed';
  createdAt: string;
}

const ReportAnalytics: React.FC<ReportAnalyticsProps> = ({ onLogout }) => {
  const { t } = useLanguage();
  const storeRefresh = useStoreChange();

  const [analysisType, setAnalysisType] = useState<'customer' | 'heatmap' | 'queue' | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reports, setReports] = useState<AiReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    setDateTo(today.toISOString().split('T')[0]);
    setDateFrom(thirtyDaysAgo.toISOString().split('T')[0]);
    fetchReports();
  }, [storeRefresh]);

  const analysisOptions = [
    { id: 'customer', label: t('report.customerAnalysis'), icon: Users },
    { id: 'heatmap', label: t('report.heatmapAnalysis'), icon: MapPin },
    { id: 'queue', label: t('report.queueAnalysis'), icon: Clock },
  ];

  const fetchReports = async () => {
    try {
      const res = await apiFetch('/api/analytics/reports');
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } catch (err) {
      console.error('Raporlar getirilemedi:', err);
    }
  };

  const createAnalysis = async () => {
    if (!analysisType || !dateFrom || !dateTo) {
      setError(t('report.selectTypeAndDate'));
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch('/api/analytics/create-report', {
        method: 'POST',
        body: JSON.stringify({ analysisType, dateFrom, dateTo }),
      });

      if (res.ok) {
        const result = await res.json();
        setReports(prev => [result.report, ...prev]);
        setAnalysisType(null);
        Alert.alert(t('common.success'), 'Analiz oluşturuldu');
      } else {
        const errorData = await res.json();
        setError(errorData.error || t('report.errorCreating'));
      }
    } catch (err) {
      setError(t('report.networkError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title={t('report.title')} onLogout={onLogout} />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.innerContent}>
          <View style={styles.headerSection}>
            <Text style={styles.title}>{t('report.title')}</Text>
            <Text style={styles.subtitle}>{t('report.subtitle')}</Text>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Plus size={20} color="#3B82F6" />
              <Text style={styles.sectionTitle}>{t('report.newAnalysis')}</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('report.selectType')}</Text>
              <View style={styles.optionsGrid}>
                {analysisOptions.map(opt => {
                  const Icon = opt.icon;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      onPress={() => setAnalysisType(opt.id as any)}
                      style={[
                        styles.optionButton,
                        analysisType === opt.id && styles.optionButtonSelected,
                      ]}
                    >
                      <Icon size={24} color={analysisType === opt.id ? '#3B82F6' : '#94a3b8'} />
                      <Text
                        style={[
                          styles.optionText,
                          analysisType === opt.id && styles.optionTextSelected,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('report.selectDateRange')}</Text>
              <View style={styles.dateRow}>
                <View style={styles.dateInputContainer}>
                  <Calendar size={16} color="#94a3b8" style={styles.dateIcon} />
                  <TextInput
                    style={styles.dateInput}
                    value={dateFrom}
                    onChangeText={setDateFrom}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#64748b"
                  />
                </View>
                <Text style={styles.dateSeparator}>-</Text>
                <View style={styles.dateInputContainer}>
                  <Calendar size={16} color="#94a3b8" style={styles.dateIcon} />
                  <TextInput
                    style={styles.dateInput}
                    value={dateTo}
                    onChangeText={setDateTo}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#64748b"
                  />
                </View>
              </View>
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.createButton, (!analysisType || loading) && styles.createButtonDisabled]}
              onPress={createAnalysis}
              disabled={!analysisType || loading}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} color="#fff" />
                  <Text style={styles.createButtonText}>{t('report.creatingAnalysis')}</Text>
                </>
              ) : (
                <>
                  <Zap size={16} color="#fff" />
                  <Text style={styles.createButtonText}>{t('report.createAnalysis')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <FileText size={20} color="#10B981" />
              <Text style={styles.sectionTitle}>{t('report.createdAnalyses')}</Text>
            </View>

            {reports.length === 0 ? (
              <Text style={styles.noDataText}>{t('report.noAnalyses')}</Text>
            ) : (
              <View style={styles.reportsList}>
                {reports.map(report => (
                  <View key={report.id} style={styles.reportCard}>
                    <View style={styles.reportHeader}>
                      <View>
                        <Text style={styles.reportName}>{report.name}</Text>
                        <Text style={styles.reportDate}>
                          {new Date(report.createdAt).toLocaleString('tr-TR')}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          report.status === 'completed' && styles.statusBadgeCompleted,
                          report.status === 'processing' && styles.statusBadgeProcessing,
                          report.status === 'failed' && styles.statusBadgeFailed,
                        ]}
                      >
                        <Text style={styles.statusText}>
                          {report.status === 'completed'
                            ? t('report.completed')
                            : report.status === 'processing'
                            ? t('report.processing')
                            : report.status === 'failed'
                            ? t('report.failed')
                            : report.status}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.reportContent}>
                      <Text style={styles.reportResult}>{report.result}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    flex: 1,
  },
  innerContent: {
    padding: 16,
  },
  headerSection: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
  },
  section: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#cbd5e1',
    marginBottom: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionButton: {
    flex: 1,
    minWidth: '30%',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#334155',
    backgroundColor: '#0f172a',
    gap: 8,
  },
  optionButtonSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#1e3a5f',
  },
  optionText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  optionTextSelected: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    paddingLeft: 12,
    paddingRight: 12,
  },
  dateIcon: {
    marginRight: 8,
  },
  dateInput: {
    flex: 1,
    color: '#fff',
    height: 40,
    fontSize: 14,
  },
  dateSeparator: {
    color: '#94a3b8',
    fontSize: 16,
  },
  errorBox: {
    backgroundColor: '#7f1d1d',
    borderWidth: 1,
    borderColor: '#dc2626',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 12,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  createButtonDisabled: {
    backgroundColor: '#334155',
    opacity: 0.5,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  noDataText: {
    color: '#94a3b8',
    textAlign: 'center',
    paddingVertical: 32,
    fontSize: 14,
  },
  reportsList: {
    gap: 12,
  },
  reportCard: {
    backgroundColor: '#0f172a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reportName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  reportDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#334155',
  },
  statusBadgeCompleted: {
    backgroundColor: '#065f46',
  },
  statusBadgeProcessing: {
    backgroundColor: '#78350f',
  },
  statusBadgeFailed: {
    backgroundColor: '#7f1d1d',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  reportContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  reportResult: {
    fontSize: 14,
    color: '#cbd5e1',
    lineHeight: 20,
  },
});

export default ReportAnalytics;
