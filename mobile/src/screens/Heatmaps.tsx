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
  Modal,
  FlatList,
} from 'react-native';
import { Users, Clock, MapPin, Calendar, Filter, Save, XCircle, RefreshCw, ChevronDown } from 'lucide-react-native';
import { useLanguage } from '../contexts/LanguageContext';
import { apiFetch } from '../lib/api';
import { useStoreChange } from '../hooks/useStoreChange';
import Header from '../components/Header';
import LoadingOverlay from '../components/LoadingOverlay';
import { LineChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';

const screenWidth = Dimensions.get('window').width;

interface HeatmapsProps {
  onLogout?: () => void;
}

interface ComparisonStat {
  period: string;
  change: number | null;
}

interface HourlySummary {
  hour: string;
  totalVisitors: number;
  avgDwellTime: number;
  editable_id: number | null;
}

interface OverallStats {
  totalVisitors: number;
  avgDwellTime: number;
  busiestZone: string;
}

interface DailyData {
  overallStats: OverallStats;
  hourlySummary: HourlySummary[];
  allZones: string[];
  comparisonStats: {
    totalVisitors: ComparisonStat[];
  };
}

const formatDwellTime = (seconds: number) => {
  if (!seconds || seconds < 1) return '0 sn';
  if (seconds < 60) return `${Math.round(seconds)} sn`;
  const minutes = Math.floor(seconds / 60);
  const sec = Math.round(seconds % 60);
  return `${minutes} dk ${sec} sn`;
};

const Heatmaps: React.FC<HeatmapsProps> = ({ onLogout }) => {
  const { t } = useLanguage();
  const storeRefresh = useStoreChange();
  
  const [dailyData, setDailyData] = useState<DailyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [zoneModalVisible, setZoneModalVisible] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editedData, setEditedData] = useState<{ [hour: string]: { avgDwellTime?: number | '' } }>({});
  const [isSaving, setIsSaving] = useState(false);

  const zoneOptions = useMemo(() => {
    const all: { value: string; label: string }[] = [
      { value: 'all', label: t('heatmap.allZones') },
    ];
    (dailyData?.allZones ?? []).forEach((z) => all.push({ value: z, label: z }));
    return all;
  }, [dailyData?.allZones, t]);

  const selectedZoneLabel = selectedZone === 'all' ? t('heatmap.allZones') : selectedZone;

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

  const fetchDailySummary = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setEditedData({});
    try {
      const params = new URLSearchParams({ date: selectedDate });
      if (selectedZone !== 'all') params.append('zone_ids', selectedZone);
      const res = await apiFetch(`/api/analytics/heatmaps/daily-summary?${params}`);
      if (res.ok) {
        const data = await res.json();
        setDailyData(data);
      } else {
        setDailyData(null);
      }
    } catch (error) {
      console.error('Günlük heatmap özeti çekme hatası:', error);
      setDailyData(null);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailySummary();
  }, [selectedDate, selectedZone, storeRefresh]);

  const filteredAndShiftedHourlyData = useMemo(() => {
    if (!dailyData?.hourlySummary) return [];
    
    return dailyData.hourlySummary
      .map(summary => {
        const hour = parseInt(summary.hour, 10);
        const newHour = (hour + 3) % 24;
        return { ...summary, hour: String(newHour).padStart(2, '0') };
      })
      .filter(summary => {
        const hour = parseInt(summary.hour, 10);
        return hour >= 10 && hour <= 22;
      })
      .sort((a, b) => parseInt(a.hour, 10) - parseInt(b.hour, 10));
  }, [dailyData?.hourlySummary]);

  const handleDataChange = (hour: string, value: string) => {
    const numericValue = value === '' ? '' : parseFloat(value);
    if (value === '' || (!isNaN(numericValue as number) && (numericValue as number) >= 0)) {
      setEditedData(prev => ({ ...prev, [hour]: { avgDwellTime: numericValue } }));
    }
  };

  const handleCancelChanges = () => setEditedData({});

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const updatePromises = Object.entries(editedData).map(async ([hour, changes]) => {
        const originalHour = String((parseInt(hour, 10) - 3 + 24) % 24).padStart(2, '0');
        const recordId = dailyData?.hourlySummary.find(h => h.hour === originalHour)?.editable_id;
        if (!recordId || changes.avgDwellTime === '' || changes.avgDwellTime === undefined) {
          return Promise.resolve({ success: false, hour });
        }

        const res = await apiFetch(`/api/analytics/heatmaps/record/${recordId}`, {
          method: 'PUT',
          body: JSON.stringify({ avgDwellTime: changes.avgDwellTime }),
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
  const isEditingDisabled = selectedZone !== 'all';

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
        <Header title={t('heatmap.title')} onLogout={onLogout} />
        <LoadingOverlay message={t('heatmap.loading')} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title={t('heatmap.title')} onLogout={onLogout} />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.innerContent}>
          <View style={styles.headerSection}>
            <View>
              <Text style={styles.title}>{t('heatmap.title')}</Text>
              <Text style={styles.subtitle}>{t('heatmap.subtitle')}</Text>
            </View>
          </View>

          <View style={styles.filtersRow}>
            <TouchableOpacity
              style={styles.filterContainer}
              onPress={() => setZoneModalVisible(true)}
              activeOpacity={0.7}
            >
              <Filter size={20} color="#94a3b8" style={styles.filterIcon} />
              <Text style={styles.pickerLabel} numberOfLines={1}>
                {selectedZoneLabel}
              </Text>
              <ChevronDown size={20} color="#94a3b8" style={styles.chevron} />
            </TouchableOpacity>

            <Modal
              visible={zoneModalVisible}
              transparent
              animationType="fade"
              onRequestClose={() => setZoneModalVisible(false)}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setZoneModalVisible(false)}
              >
                <TouchableOpacity
                  style={styles.modalContent}
                  activeOpacity={1}
                  onPress={() => {}}
                >
                  <Text style={styles.modalTitle}>{t('heatmap.zone')}</Text>
                  <FlatList
                    data={zoneOptions}
                    keyExtractor={(item) => item.value}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.modalOption,
                          selectedZone === item.value && styles.modalOptionSelected,
                        ]}
                        onPress={() => {
                          setSelectedZone(item.value);
                          setZoneModalVisible(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.modalOptionText,
                            selectedZone === item.value && styles.modalOptionTextSelected,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    )}
                  />
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => setZoneModalVisible(false)}
                  >
                    <Text style={styles.modalCloseText}>{t('common.close')}</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              </TouchableOpacity>
            </Modal>

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
              <Text style={styles.statLabel}>{t('heatmap.visitorChange')}</Text>
              {dailyData?.comparisonStats?.totalVisitors?.map((stat, idx) => (
                <Text key={idx} style={styles.statValue}>
                  {stat.period}: {stat.change !== null ? `${stat.change > 0 ? '+' : ''}${stat.change}%` : 'N/A'}
                </Text>
              ))}
            </View>
            <View style={styles.statCard}>
              <Clock size={24} color="#F59E0B" />
              <Text style={styles.statLabel}>{t('heatmap.avgDwell')}</Text>
              <Text style={styles.statValue}>
                {formatDwellTime(dailyData?.overallStats.avgDwellTime ?? 0)}
              </Text>
            </View>
            <View style={styles.statCard}>
              <MapPin size={24} color="#10B981" />
              <Text style={styles.statLabel}>{t('heatmap.busiestZone')}</Text>
              <Text style={styles.statValue}>
                {dailyData?.overallStats.busiestZone ?? 'N/A'}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('heatmap.hourlyDetails')}</Text>
              {isAdmin && hasChanges && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity style={styles.cancelButton} onPress={handleCancelChanges}>
                    <XCircle size={16} color="#94a3b8" />
                    <Text style={styles.cancelButtonText}>{t('heatmap.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveButton} onPress={handleSaveChanges} disabled={isSaving}>
                    {isSaving ? (
                      <RefreshCw size={16} color="#fff" />
                    ) : (
                      <Save size={16} color="#fff" />
                    )}
                    <Text style={styles.saveButtonText}>
                      {isSaving ? t('heatmap.saving') : t('heatmap.save')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            {isAdmin && isEditingDisabled && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>{t('heatmap.singleZoneEditDisabled')}</Text>
              </View>
            )}
            {filteredAndShiftedHourlyData.length > 0 ? (
              <View style={styles.tableContainer}>
                {filteredAndShiftedHourlyData.map((hourData) => {
                  const isEdited = !!editedData[hourData.hour];
                  const editedDwellTime = editedData[hourData.hour]?.avgDwellTime;
                  const currentDwellTime = editedDwellTime !== undefined ? editedDwellTime : hourData.avgDwellTime;

                  return (
                    <View key={hourData.hour} style={[styles.tableRow, isEdited && styles.tableRowEdited]}>
                      <Text style={styles.tableCell}>{`${hourData.hour}:00-${hourData.hour}:59`}</Text>
                      <TextInput
                        style={[styles.tableInput, !isAdmin && styles.tableInputDisabled]}
                        value={typeof currentDwellTime === 'number' ? Math.round(currentDwellTime).toString() : String(currentDwellTime || '')}
                        onChangeText={(value) => handleDataChange(hourData.hour, value)}
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
              <Text style={styles.noDataText}>{t('heatmap.noData') || 'Bu tarih için veri bulunamadı.'}</Text>
            )}
          </View>

          {filteredAndShiftedHourlyData.length > 0 && (
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>{t('heatmap.hourlyVisitorDwell')}</Text>
              <LineChart
                data={{
                  labels: filteredAndShiftedHourlyData.map(d => `${d.hour}:00`),
                  datasets: [
                    {
                      data: filteredAndShiftedHourlyData.map(d => d.avgDwellTime),
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    paddingLeft: 12,
  },
  filterIcon: {
    marginRight: 8,
  },
  pickerLabel: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    paddingVertical: 10,
  },
  chevron: {
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    width: '100%',
    maxWidth: 320,
    maxHeight: '70%',
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  modalOption: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  modalOptionSelected: {
    backgroundColor: '#1e3a5f',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#cbd5e1',
  },
  modalOptionTextSelected: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  modalCloseButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  modalCloseText: {
    color: '#94a3b8',
    fontSize: 16,
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

export default Heatmaps;
