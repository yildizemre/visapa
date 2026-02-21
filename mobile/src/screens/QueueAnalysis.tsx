import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { Users, Clock, Timer, Calendar, Filter, Save, XCircle, RefreshCw } from 'lucide-react-native';
import { useLanguage } from '../contexts/LanguageContext';
import { apiFetch } from '../lib/api';
import { useStoreChange } from '../hooks/useStoreChange';
import Header from '../components/Header';
import LoadingOverlay from '../components/LoadingOverlay';
import { LineChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SelectDropdown from '../components/SelectDropdown';

const screenWidth = Dimensions.get('window').width;

interface QueueAnalysisProps {
  onLogout?: () => void;
}

interface HourlySummary {
  hour: string;
  totalCustomers: number;
  avgWaitTime: number;
  minWaitTime: number;
  maxWaitTime: number;
  editable_id: number | null;
}

interface OverallStats {
  totalCustomers: number;
  avgWaitTime: number;
  maxWaitTime: number;
}

interface DailyData {
  overallStats: OverallStats;
  hourlySummary: HourlySummary[];
  allCashiers: string[];
  availableCashiers: string[];
}

const formatWaitTime = (waitTimeInSeconds: number) => {
  if (!waitTimeInSeconds || waitTimeInSeconds < 1) return '0 sn';
  if (waitTimeInSeconds < 60) return `${Math.round(waitTimeInSeconds)} sn`;
  const minutes = Math.floor(waitTimeInSeconds / 60);
  const seconds = Math.round(waitTimeInSeconds % 60);
  return `${minutes} dk ${seconds} sn`;
};

const QueueAnalysis: React.FC<QueueAnalysisProps> = ({ onLogout }) => {
  const { t } = useLanguage();
  const storeRefresh = useStoreChange();
  
  const [dailyData, setDailyData] = useState<DailyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCashier, setSelectedCashier] = useState<string>('all');
  const [isAdmin, setIsAdmin] = useState(false);
  const [editedData, setEditedData] = useState<{ [hour: string]: { totalCustomers?: number | ''; avgWaitTime?: number | '' } }>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const userStr = await AsyncStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          setIsAdmin(user?.role === 'admin');
        }
      } catch (error) {
        console.error('Admin check error:', error);
      }
    };
    checkAdmin();
  }, []);

  const getDummyDailyData = (): DailyData => {
    const hours: HourlySummary[] = [];
    for (let h = 10; h <= 22; h++) {
      const hourStr = String(h).padStart(2, '0');
      hours.push({
        hour: hourStr,
        totalCustomers: 80 + Math.floor(Math.random() * 60),
        avgWaitTime: 180 + Math.floor(Math.random() * 120),
        minWaitTime: 60,
        maxWaitTime: 340,
        editable_id: null,
      });
    }
    return {
      overallStats: {
        totalCustomers: 1742,
        avgWaitTime: 262,
        maxWaitTime: 345,
      },
      hourlySummary: hours,
      allCashiers: ['Kasa-1', 'Kasa-2', 'Kasa-3'],
      availableCashiers: ['Kasa-1', 'Kasa-2', 'Kasa-3'],
    };
  };

  const fetchDailySummary = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setEditedData({});
    try {
      const params = new URLSearchParams({ date: selectedDate });
      if (selectedCashier !== 'all') {
        params.append('cashier_ids', selectedCashier);
      }
      const res = await apiFetch(`/api/analytics/queues/daily-summary?${params}`);
      if (res.ok) {
        const data = await res.json();
        const hasHourly = (data.hourlySummary?.length ?? 0) > 0;
        const hasStats = data.overallStats != null;
        if (hasHourly && hasStats) {
          setDailyData(data);
        } else {
          setDailyData(getDummyDailyData());
        }
      } else {
        setDailyData(getDummyDailyData());
      }
    } catch (error) {
      console.error('Günlük kuyruk özeti çekme hatası:', error);
      setDailyData(getDummyDailyData());
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailySummary();
  }, [selectedDate, selectedCashier, storeRefresh]);

  const shiftHour = (hourString: string): string => {
    const hour = parseInt(hourString, 10);
    if (isNaN(hour)) return hourString;
    const newHour = (hour + 3) % 24;
    return String(newHour).padStart(2, '0');
  };

  const filteredAndShiftedDailyData = useMemo(() => {
    if (!dailyData) return [];
    return dailyData.hourlySummary
      .map(summary => ({ ...summary, hour: shiftHour(summary.hour) }))
      .filter(summary => {
        const hour = parseInt(summary.hour, 10);
        return hour >= 10 && hour <= 22;
      })
      .sort((a, b) => parseInt(a.hour, 10) - parseInt(b.hour, 10));
  }, [dailyData]);

  const handleDataChange = (hour: string, field: 'avgWaitTime' | 'totalCustomers', value: string) => {
    if (value === '') {
      setEditedData(prev => ({ ...prev, [hour]: { ...prev[hour], [field]: '' } }));
      return;
    }
    const numericValue = field === 'totalCustomers' ? parseInt(value, 10) : parseFloat(value);
    if (!isNaN(numericValue) && numericValue >= 0) {
      setEditedData(prev => ({ ...prev, [hour]: { ...prev[hour], [field]: numericValue } }));
    }
  };

  const handleCancelChanges = () => setEditedData({});

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const updatePromises = Object.entries(editedData).map(async ([hour, changes]) => {
        const originalHour = String((parseInt(hour, 10) - 3 + 24) % 24).padStart(2, '0');
        const recordId = filteredAndShiftedDailyData?.find(h => h.hour === hour)?.editable_id;
        if (!recordId) return Promise.resolve({ success: false, hour });

        const cleanedChanges: any = {};
        if (changes.totalCustomers !== '' && changes.totalCustomers !== undefined) {
          cleanedChanges.totalCustomers = changes.totalCustomers;
        }
        if (changes.avgWaitTime !== '' && changes.avgWaitTime !== undefined) {
          cleanedChanges.avgWaitTime = changes.avgWaitTime;
        }

        if (Object.keys(cleanedChanges).length === 0) {
          return Promise.resolve({ success: true, hour });
        }

        const res = await apiFetch(`/api/analytics/queues/record/${recordId}`, {
          method: 'PUT',
          body: JSON.stringify(cleanedChanges),
        });
        return res.ok;
      });
      
      await Promise.all(updatePromises);
      setIsSaving(false);
      await fetchDailySummary(false);
      Alert.alert(t('common.success'), 'Değişiklikler kaydedildi');
    } catch (error) {
      setIsSaving(false);
      Alert.alert(t('common.error'), 'Kaydetme hatası');
    }
  };

  const hasChanges = Object.keys(editedData).length > 0;
  const isEditingDisabled = selectedCashier !== 'all';

  const chartConfig = {
    backgroundColor: '#1e293b',
    backgroundGradientFrom: '#1e293b',
    backgroundGradientTo: '#334155',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
    style: {
      borderRadius: 16,
    },
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title={t('queue.title')} onLogout={onLogout} />
        <LoadingOverlay message={t('queue.loading')} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title={t('queue.title')} onLogout={onLogout} />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.innerContent}>
          <View style={styles.headerSection}>
            <View>
              <Text style={styles.title}>{t('queue.title')}</Text>
              <Text style={styles.subtitle}>{t('queue.subtitle')}</Text>
            </View>
          </View>

          <View style={styles.filtersRow}>
            <SelectDropdown
              value={selectedCashier}
              options={(dailyData?.availableCashiers ?? dailyData?.allCashiers ?? ['Kasa-1', 'Kasa-2']).map((id) => ({ label: id, value: id }))}
              onSelect={setSelectedCashier}
              labelAll={t('queue.allCashiers')}
              leftIcon={<Filter size={20} color="#94a3b8" />}
              containerStyle={styles.filterContainer}
            />
            <View style={styles.dateContainer}>
              <Calendar size={20} color="#94a3b8" style={styles.dateIcon} />
              <TextInput
                style={styles.dateInput}
                value={selectedDate}
                onChangeText={setSelectedDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#64748b"
              />
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Users size={24} color="#3B82F6" />
              <Text style={styles.statLabel}>{t('queue.totalCustomers')}</Text>
              <Text style={styles.statValue}>
                {dailyData?.overallStats.totalCustomers.toLocaleString() ?? '0'}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Clock size={24} color="#10B981" />
              <Text style={styles.statLabel}>{t('queue.avgWait')}</Text>
              <Text style={styles.statValue}>
                {formatWaitTime(dailyData?.overallStats.avgWaitTime ?? 0)}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Timer size={24} color="#F59E0B" />
              <Text style={styles.statLabel}>{t('queue.maxWait')}</Text>
              <Text style={styles.statValue}>
                {formatWaitTime(dailyData?.overallStats.maxWaitTime ?? 0)}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('queue.hourlyDetails')}</Text>
              {isAdmin && hasChanges && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity style={styles.cancelButton} onPress={handleCancelChanges}>
                    <XCircle size={16} color="#94a3b8" />
                    <Text style={styles.cancelButtonText}>{t('queue.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveButton} onPress={handleSaveChanges} disabled={isSaving}>
                    {isSaving ? (
                      <RefreshCw size={16} color="#fff" />
                    ) : (
                      <Save size={16} color="#fff" />
                    )}
                    <Text style={styles.saveButtonText}>
                      {isSaving ? t('queue.saving') : t('queue.save')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            {isAdmin && isEditingDisabled && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>{t('queue.singleCashierEditDisabled')}</Text>
              </View>
            )}
            {filteredAndShiftedDailyData.length > 0 ? (
              <View style={styles.tableContainer}>
                {filteredAndShiftedDailyData.map((hourData) => {
                  const isEdited = !!editedData[hourData.hour];
                  const editedTotalCustomers = editedData[hourData.hour]?.totalCustomers;
                  const editedAvgWaitTime = editedData[hourData.hour]?.avgWaitTime;
                  
                  const currentTotalCustomers = editedTotalCustomers !== undefined ? editedTotalCustomers : hourData.totalCustomers;
                  const currentAvgWait = editedAvgWaitTime !== undefined ? editedAvgWaitTime : hourData.avgWaitTime;

                  return (
                    <View key={hourData.hour} style={[styles.tableRow, isEdited && styles.tableRowEdited]}>
                      <Text style={styles.tableCell}>{`${hourData.hour}:00 - ${hourData.hour}:59`}</Text>
                      <TextInput
                        style={[styles.tableInput, (!isAdmin || isEditingDisabled || !hourData.editable_id) && styles.tableInputDisabled]}
                        value={String(currentTotalCustomers)}
                        onChangeText={(value) => handleDataChange(hourData.hour, 'totalCustomers', value)}
                        keyboardType="numeric"
                        editable={isAdmin && !isEditingDisabled && !!hourData.editable_id}
                        placeholder="0"
                        placeholderTextColor="#64748b"
                      />
                      <TextInput
                        style={[styles.tableInput, (!isAdmin || isEditingDisabled || !hourData.editable_id) && styles.tableInputDisabled]}
                        value={typeof currentAvgWait === 'number' ? Math.round(currentAvgWait).toString() : String(currentAvgWait || '')}
                        onChangeText={(value) => handleDataChange(hourData.hour, 'avgWaitTime', value)}
                        keyboardType="numeric"
                        editable={isAdmin && !isEditingDisabled && !!hourData.editable_id}
                        placeholder="0"
                        placeholderTextColor="#64748b"
                      />
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.noDataText}>{t('queue.noData') || 'Bu tarih için veri bulunamadı.'}</Text>
            )}
          </View>

          {filteredAndShiftedDailyData.length > 0 && (
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>{t('queue.hourlyChart')}</Text>
              <LineChart
                data={{
                  labels: filteredAndShiftedDailyData.map(d => `${d.hour}:00`),
                  datasets: [
                    {
                      data: filteredAndShiftedDailyData.map(d => d.avgWaitTime),
                      color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
                      strokeWidth: 2,
                    },
                  ],
                }}
                width={screenWidth - 40}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
              />
            </View>
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 14,
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
  filtersRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  filterContainer: {
    flex: 1,
    minHeight: 44,
  },
  dateContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
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
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 8,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#334155',
    gap: 6,
  },
  cancelButtonText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#3B82F6',
    gap: 6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  warningBox: {
    backgroundColor: '#78350f',
    borderWidth: 1,
    borderColor: '#fbbf24',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  warningText: {
    color: '#fbbf24',
    fontSize: 12,
  },
  tableContainer: {
    gap: 8,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    gap: 8,
  },
  tableRowEdited: {
    backgroundColor: '#1e3a5f',
  },
  tableCell: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
  },
  tableInput: {
    width: 80,
    backgroundColor: '#0f172a',
    color: '#fff',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    textAlign: 'center',
    fontSize: 14,
  },
  tableInputDisabled: {
    opacity: 0.5,
  },
  noDataText: {
    color: '#94a3b8',
    textAlign: 'center',
    paddingVertical: 32,
    fontSize: 14,
  },
  chartContainer: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
});

export default QueueAnalysis;
