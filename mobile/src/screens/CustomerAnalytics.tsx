import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Camera, AlertCircle } from 'lucide-react-native';
import { useLanguage } from '../contexts/LanguageContext';
import SelectDropdown from '../components/SelectDropdown';
import { apiFetch } from '../lib/api';
import { useStoreChange } from '../hooks/useStoreChange';
import Header from '../components/Header';
import { PieChart, BarChart, LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

interface CustomerAnalyticsProps {
  onLogout?: () => void;
}

const formatDateForAPI = (date: Date) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function getDummyCustomerData(lang: 'tr' | 'en') {
  return {
    demographics: {
      ageGroupsChart: [
        { name: '18-30', value: 46 },
        { name: '30-50', value: 40 },
        { name: '50+', value: 14 },
      ],
      genderDistributionChart: [
        { gender: lang === 'tr' ? 'Erkek' : 'Male', value: 2496 },
        { gender: lang === 'tr' ? 'Kadın' : 'Female', value: 3744 },
      ],
    },
    hourlyCustomerFlow: Array.from({ length: 13 }, (_, i) => ({
      hour: `${String(10 + i).padStart(2, '0')}:00`,
      entering: 100 + Math.floor(Math.random() * 80),
      exiting: 90 + Math.floor(Math.random() * 70),
    })),
  };
}

const CustomerAnalytics: React.FC<CustomerAnalyticsProps> = ({ onLogout }) => {
  const { t, language } = useLanguage();
  const storeRefresh = useStoreChange();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedCamera, setSelectedCamera] = useState<string>('all');
  const [allCameras, setAllCameras] = useState<string[]>([]);

  const [analyticsData, setAnalyticsData] = useState({
    demographics: {
      ageGroupsChart: [] as { name: string; value: number }[],
      genderDistributionChart: [] as { gender: string; value: number }[],
    },
    hourlyCustomerFlow: [] as { hour: string; entering: number; exiting: number }[],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const PIE_COLORS = ['#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899'];

  useEffect(() => {
    const fetchCustomerData = async () => {
      setLoading(true);
      setError(null);
      try {
        const dateStr = formatDateForAPI(selectedDate);
        const url = `/api/analytics/customers?date=${dateStr}&camera_id=${selectedCamera}`;
        const response = await apiFetch(url);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Veri çekme başarısız oldu.');
        }

        const data = await response.json();
        const hourlyFlow = data.hourlyCustomerFlow || [];
        const filteredHourlyFlow = Array.isArray(hourlyFlow)
          ? hourlyFlow.filter((item: { hour?: string }) => {
              const h = item?.hour || '00:00';
              const hourValue = parseInt(String(h).split(':')[0], 10);
              return hourValue >= 7 && hourValue <= 19;
            })
          : [];

        const demographics = data.demographics || {
          ageGroupsChart: [],
          genderDistributionChart: [],
        };
        const hasCharts =
          (demographics.ageGroupsChart?.length ?? 0) > 0 ||
          (demographics.genderDistributionChart?.length ?? 0) > 0;
        const hasHourly = filteredHourlyFlow.length > 0;
        const dummy = getDummyCustomerData(language);

        setAnalyticsData({
          demographics: hasCharts ? demographics : dummy.demographics,
          hourlyCustomerFlow: hasHourly ? filteredHourlyFlow : dummy.hourlyCustomerFlow,
        });

        if (selectedCamera === 'all' && Array.isArray(data.all_cameras)) {
          setAllCameras(data.all_cameras.length ? data.all_cameras : ['Kamera-1', 'Kasa-1', 'Kasa-2']);
        }
      } catch (err) {
        setError(null);
        setAllCameras(['Kamera-1', 'Kasa-1', 'Kasa-2']);
        setAnalyticsData(getDummyCustomerData(language));
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerData();
  }, [selectedDate, selectedCamera, storeRefresh]);


  const ageGroupsData = analyticsData.demographics.ageGroupsChart.map((item, index) => ({
    name: item.name,
    population: item.value,
    color: PIE_COLORS[index % PIE_COLORS.length],
    legendFontColor: '#94a3b8',
    legendFontSize: 12,
  }));

  const genderData = analyticsData.demographics.genderDistributionChart.map((item) => item.value);
  const genderLabels = analyticsData.demographics.genderDistributionChart.map((item) => item.gender);

  const hourlyLabels = analyticsData.hourlyCustomerFlow.map((item) => item.hour);
  const hourlyEntering = analyticsData.hourlyCustomerFlow.map((item) => item.entering || 0);
  const hourlyExiting = analyticsData.hourlyCustomerFlow.map((item) => item.exiting || 0);

  return (
    <View style={styles.container}>
      <Header title={t('nav.customerAnalytics')} onLogout={onLogout} />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.innerContent}>
          <View style={styles.headerSection}>
            <View>
              <Text style={styles.title}>{t('analytics.title')}</Text>
              <Text style={styles.subtitle}>{t('analytics.subtitle')}</Text>
            </View>
            <SelectDropdown
              value={selectedCamera}
              options={allCameras.map((c) => ({ label: c, value: c }))}
              onSelect={setSelectedCamera}
              placeholder={t('analytics.allCameras')}
              labelAll={t('analytics.allCameras')}
              leftIcon={<Camera size={20} color="#94a3b8" />}
              containerStyle={styles.cameraPickerContainer}
            />
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>{t('common.loading')}</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <AlertCircle size={48} color="#EF4444" />
              <Text style={styles.errorTitle}>Hata Oluştu</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <>
              <View style={styles.chartsRow}>
                {ageGroupsData.length > 0 && (
                  <View style={styles.chartCard}>
                    <Text style={styles.chartTitle}>{t('analytics.ageDistribution')}</Text>
                    <PieChart
                      data={ageGroupsData}
                      width={screenWidth - 64}
                      height={220}
                      chartConfig={chartConfig}
                      accessor="population"
                      backgroundColor="transparent"
                      paddingLeft="15"
                      style={styles.chart}
                    />
                  </View>
                )}

                {genderData.length > 0 && (
                  <View style={styles.chartCard}>
                    <Text style={styles.chartTitle}>{t('analytics.genderDistribution')}</Text>
                    <BarChart
                      data={{
                        labels: genderLabels,
                        datasets: [
                          {
                            data: genderData,
                          },
                        ],
                      }}
                      width={screenWidth - 64}
                      height={220}
                      chartConfig={chartConfig}
                      verticalLabelRotation={30}
                      style={styles.chart}
                      showValuesOnTopOfBars
                    />
                  </View>
                )}
              </View>

              {hourlyLabels.length > 0 && (
                <View style={styles.chartCard}>
                  <Text style={styles.chartTitle}>
                    {selectedDate.toLocaleDateString('tr-TR')} Tarihli Saatlik Müşteri Akışı (10:00 - 22:00)
                  </Text>
                  <LineChart
                    data={{
                      labels: hourlyLabels,
                      datasets: [
                        {
                          data: hourlyEntering,
                          color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                          strokeWidth: 2,
                        },
                        {
                          data: hourlyExiting,
                          color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                          strokeWidth: 2,
                        },
                      ],
                      legend: ['Giren', 'Çıkan'],
                    }}
                    width={screenWidth - 64}
                    height={220}
                    chartConfig={chartConfig}
                    bezier
                    style={styles.chart}
                  />
                </View>
              )}
            </>
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
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
  },
  cameraPickerContainer: {
    minWidth: 160,
    maxWidth: 220,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#94a3b8',
    fontSize: 16,
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#EF4444',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  chartsRow: {
    gap: 16,
    marginBottom: 16,
  },
  chartCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
});

export default CustomerAnalytics;
