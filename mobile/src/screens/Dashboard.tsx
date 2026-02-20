import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Calendar,
  Target,
  ShoppingCart,
  UserCheck,
} from 'lucide-react-native';
import { useLanguage } from '../contexts/LanguageContext';
import { apiFetch, testConnection } from '../lib/api';
import { useStoreChange } from '../hooks/useStoreChange';
import Header from '../components/Header';
import {
  LineChart,
  BarChart,
} from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

interface DashboardProps {
  onLogout?: () => void;
}

interface DashboardData {
  weeklyStats: {
    customersEntered: number;
    customersExited: number;
    ageDistribution: { mostDominantGroup: string };
    genderDistribution: { male: number; female: number };
    avgQueueTime: number;
    busiestCashier: { name: string; weeklyCustomers: number; avgWaitTime: number };
  };
  dailyCustomerFlow: Array<{ date: string; entered: number; exited: number }>;
  dailyGenderChartData: Array<{ date: string; male: number; female: number }>;
  dailyAgeChartData: Array<{ date: string; age_18_30: number; age_30_50: number; age_50_plus: number }>;
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const { t, language } = useLanguage();
  const storeRefresh = useStoreChange();

  const [dashboardData, setDashboardData] = useState<DashboardData>({
    weeklyStats: {
      customersEntered: 0,
      customersExited: 0,
      ageDistribution: { mostDominantGroup: 'N/A' },
      genderDistribution: { male: 0, female: 0 },
      avgQueueTime: 0,
      busiestCashier: { name: 'N/A', weeklyCustomers: 0, avgWaitTime: 0 },
    },
    dailyCustomerFlow: [],
    dailyGenderChartData: [],
    dailyAgeChartData: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dateRange, setDateRange] = useState<{ start: string | null; end: string | null }>({
    start: null,
    end: null,
  });

  const chartColors = {
    primary: '#3B82F6',
    secondary: '#10B981',
    accent: '#F59E0B',
    danger: '#EF4444',
    purple: '#8B5CF6',
    pink: '#EC4899',
    orange: '#F97316',
    teal: '#14B8A6',
  };

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
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#fff',
    },
  };

  const formatSecondsToMinutes = (seconds: number) => {
    if (typeof seconds !== 'number' || isNaN(seconds)) return '0.00';
    return (seconds / 60).toFixed(2);
  };

  const formatDateForRange = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Önce bağlantıyı test et
      const connectionTest = await testConnection();
      if (!connectionTest.success) {
        setError(connectionTest.message);
        setLoading(false);
        return;
      }

      const response = await apiFetch('/api/dashboard/weekly-overview');

      if (!response.ok) {
        if (response.status === 401) {
          // Token geçersiz, logout yap
          if (onLogout) {
            onLogout();
          }
          return;
        }
        const errorData = await response.json().catch(() => ({ error: `API hatası: ${response.status}` }));
        throw new Error(errorData.error || `API hatası: ${response.status}`);
      }

      const data = await response.json();

      const totals = data.totals ?? {};
      const customers = totals.customers ?? {};
      const queues = totals.queues ?? {};
      const timeseries = data.timeseries ?? {};

      if (timeseries.daily_customer_flow && timeseries.daily_customer_flow.length > 0) {
        const firstDay = timeseries.daily_customer_flow[0].date;
        const lastDay = timeseries.daily_customer_flow[timeseries.daily_customer_flow.length - 1].date;
        setDateRange({ start: firstDay, end: lastDay });
      }

      const transformedData: DashboardData = {
        weeklyStats: {
          customersEntered: customers.total_entered ?? 0,
          customersExited: customers.total_exited ?? 0,
          ageDistribution: { mostDominantGroup: customers.busiest_age_group ?? 'N/A' },
          genderDistribution: {
            male: customers.male ?? 0,
            female: customers.female ?? 0,
          },
          avgQueueTime: queues.avg_wait_time ?? 0,
          busiestCashier: {
            name: 'Kasa 3',
            weeklyCustomers: queues.total_queues ?? 0,
            avgWaitTime: queues.avg_wait_time ?? 0,
          },
        },
        dailyCustomerFlow: (timeseries.daily_customer_flow ?? []).map((item: any) => {
          let dateStr = item.date;
          try {
            // Date string'i parse et
            const dateObj = typeof item.date === 'string' ? new Date(item.date) : item.date;
            if (!isNaN(dateObj.getTime())) {
              dateStr = dateObj.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', {
                day: '2-digit',
                month: 'short',
              });
            }
          } catch (e) {
            // Parse edilemezse direkt kullan
            dateStr = String(item.date).substring(5, 11) || item.date;
          }
          return {
            ...item,
            date: dateStr,
            entered: Number(item.entered || 0),
            exited: Number(item.exited || 0),
          };
        }),
        dailyGenderChartData: (timeseries.daily_gender ?? []).map((item: any) => ({
          ...item,
          date: new Date(item.date).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', {
            day: '2-digit',
            month: 'short',
          }),
        })),
        dailyAgeChartData: (timeseries.daily_age ?? []).map((item: any) => ({
          ...item,
          date: new Date(item.date).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', {
            day: '2-digit',
            month: 'short',
          }),
        })),
      };

      setDashboardData(transformedData);
      setError(null);
    } catch (error: any) {
      console.error('Dashboard veri çekme sırasında kritik hata:', error);
      setError(error?.message || 'Veri çekilemedi. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [language, storeRefresh]);

  useEffect(() => {
    const dateInterval = setInterval(() => setCurrentDate(new Date()), 1000);
    return () => clearInterval(dateInterval);
  }, []);

  const getFormattedDate = () => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return currentDate.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', options);
  };

  if (loading && !error) {
    return (
      <View style={styles.container}>
        <Header title={t('nav.dashboard')} onLogout={onLogout} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Header title={t('nav.dashboard')} onLogout={onLogout} />
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>{t('common.error')}</Text>
            <Text style={styles.errorText}>{error}</Text>
            <View style={styles.errorSteps}>
              <Text style={styles.errorStepsTitle}>Adım adım çözüm:</Text>
              <Text style={styles.errorStep}>1. Backend klasörüne gidin</Text>
              <Text style={styles.errorStepCode}>   cd backend</Text>
              <Text style={styles.errorStep}>2. Backend'i başlatın</Text>
              <Text style={styles.errorStepCode}>   python app.py</Text>
              <Text style={styles.errorStep}>3. Bilgisayarınızın IP adresini kontrol edin</Text>
              <Text style={styles.errorStepCode}>   Windows: ipconfig</Text>
              <Text style={styles.errorStepCode}>   Mac/Linux: ifconfig</Text>
              <Text style={styles.errorStep}>4. IP adresini mobile/src/lib/api.ts dosyasında güncelleyin</Text>
            </View>
            <TouchableOpacity style={styles.retryButton} onPress={fetchDashboardData}>
              <Text style={styles.retryButtonText}>Tekrar Dene</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Chart verilerini hazırla
  const customerFlowLabels = dashboardData.dailyCustomerFlow.map((item) => item.date || '');
  const customerFlowEntered = dashboardData.dailyCustomerFlow.map((item) => Number(item.entered || 0));
  const customerFlowExited = dashboardData.dailyCustomerFlow.map((item) => Number(item.exited || 0));
  
  // Veri kontrolü - eğer tüm değerler 0 ise minimum değerler ekle (görselleştirme için)
  const hasData = customerFlowEntered.some(v => v > 0) || customerFlowExited.some(v => v > 0);
  const maxValue = Math.max(...customerFlowEntered, ...customerFlowExited, 1);

  const genderLabels = dashboardData.dailyGenderChartData.map((item) => {
    const date = new Date(item.date);
    if (isNaN(date.getTime())) {
      return item.date.length > 6 ? item.date.substring(0, 6) : item.date;
    }
    return date.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', {
      day: '2-digit',
      month: 'short',
    });
  });
  const genderMale = dashboardData.dailyGenderChartData.map((item) => Number(item.male || 0));
  const genderFemale = dashboardData.dailyGenderChartData.map((item) => Number(item.female || 0));

  const ageLabels = dashboardData.dailyAgeChartData.map((item) => {
    const date = new Date(item.date);
    if (isNaN(date.getTime())) {
      return item.date.length > 6 ? item.date.substring(0, 6) : item.date;
    }
    return date.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', {
      day: '2-digit',
      month: 'short',
    });
  });
  const age18_30 = dashboardData.dailyAgeChartData.map((item) => Number(item.age_18_30 || 0));
  const age30_50 = dashboardData.dailyAgeChartData.map((item) => Number(item.age_30_50 || 0));
  const age50Plus = dashboardData.dailyAgeChartData.map((item) => Number(item.age_50_plus || 0));

  return (
    <View style={styles.container}>
      <Header title={t('nav.dashboard')} onLogout={onLogout} />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.innerContent}>
          {/* Başlık */}
          <View style={styles.headerSection}>
            <View>
              <Text style={styles.title}>{t('dashboard.title')}</Text>
              <View style={styles.subtitleRow}>
                <Text style={styles.subtitle}>{t('dashboard.weeklyOverview')}</Text>
                {dateRange.start && dateRange.end && (
                  <View style={styles.dateRangeBadge}>
                    <Text style={styles.dateRangeText}>
                      {formatDateForRange(dateRange.start)} - {formatDateForRange(dateRange.end)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.dateContainer}>
              <Calendar size={16} color="#94a3b8" />
              <Text style={styles.dateText}>{getFormattedDate()}</Text>
            </View>
          </View>

          {/* İstatistik Kartları */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <View style={[styles.iconContainer, { backgroundColor: '#3B82F6' }]}>
                  <TrendingUp size={20} color="#fff" />
                </View>
                <Text style={styles.statLabel}>Haftalık</Text>
              </View>
              <Text style={styles.statValue}>
                {dashboardData.weeklyStats.customersEntered.toLocaleString()}
              </Text>
              <Text style={styles.statDescription}>{t('dashboard.customersEntered')}</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <View style={[styles.iconContainer, { backgroundColor: '#10B981' }]}>
                  <TrendingDown size={20} color="#fff" />
                </View>
                <Text style={styles.statLabel}>Haftalık</Text>
              </View>
              <Text style={styles.statValue}>
                {dashboardData.weeklyStats.customersExited.toLocaleString()}
              </Text>
              <Text style={styles.statDescription}>{t('dashboard.customersExited')}</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <View style={[styles.iconContainer, { backgroundColor: '#8B5CF6' }]}>
                  <Target size={20} color="#fff" />
                </View>
                <Text style={styles.statLabel}>En Yoğun Grup</Text>
              </View>
              <Text style={styles.statValue}>
                {dashboardData.weeklyStats.ageDistribution.mostDominantGroup}
              </Text>
              <Text style={styles.statDescription}>{t('dashboard.ageDistribution')}</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <View style={[styles.iconContainer, { backgroundColor: '#EC4899' }]}>
                  <UserCheck size={20} color="#fff" />
                </View>
                <Text style={styles.statLabel}>Haftalık</Text>
              </View>
              <View style={styles.genderRow}>
                <View>
                  <Text style={styles.genderValue}>
                    {dashboardData.weeklyStats.genderDistribution.male.toLocaleString()}
                  </Text>
                  <Text style={styles.genderLabel}>{t('chart.male')}</Text>
                </View>
                <View>
                  <Text style={styles.genderValue}>
                    {dashboardData.weeklyStats.genderDistribution.female.toLocaleString()}
                  </Text>
                  <Text style={styles.genderLabel}>{t('chart.female')}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* İkinci İstatistik Satırı */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <View style={[styles.iconContainer, { backgroundColor: '#F97316' }]}>
                  <Clock size={20} color="#fff" />
                </View>
                <Text style={styles.statLabel}>Haftalık Ortalama</Text>
              </View>
              <Text style={styles.statValue}>
                {formatSecondsToMinutes(dashboardData.weeklyStats.avgQueueTime)} dk
              </Text>
              <Text style={styles.statDescription}>{t('dashboard.avgQueueTime')}</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <View style={[styles.iconContainer, { backgroundColor: '#14B8A6' }]}>
                  <ShoppingCart size={20} color="#fff" />
                </View>
                <Text style={styles.statLabel}>Haftanın Lideri</Text>
              </View>
              <Text style={styles.statValue}>
                {dashboardData.weeklyStats.busiestCashier.name}
              </Text>
              <Text style={styles.statDescription}>
                {dashboardData.weeklyStats.busiestCashier.weeklyCustomers.toLocaleString()}{' '}
                {t('dashboard.weeklyCustomers')} - Ort.{' '}
                {formatSecondsToMinutes(dashboardData.weeklyStats.busiestCashier.avgWaitTime)} dk
              </Text>
            </View>
          </View>

          {/* Grafikler */}
          {customerFlowLabels.length > 0 ? (
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>{t('dashboard.dailyCustomerFlowTrend')}</Text>
              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: chartColors.secondary }]} />
                  <Text style={styles.legendText}>{t('dashboard.customersEntered')}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: chartColors.danger }]} />
                  <Text style={styles.legendText}>{t('dashboard.customersExited')}</Text>
                </View>
              </View>
              {hasData ? (
                <>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={true} 
                    contentContainerStyle={styles.chartScrollContent}
                    style={styles.chartScrollView}
                  >
                    <LineChart
                      data={{
                        labels: customerFlowLabels,
                        datasets: [
                          {
                            data: customerFlowEntered,
                          },
                        ],
                      }}
                      width={Math.max(screenWidth - 32, customerFlowLabels.length * 55)}
                      height={220}
                      chartConfig={{
                        ...chartConfig,
                        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                      }}
                      bezier
                      style={styles.chart}
                      withInnerLines={true}
                      withOuterLines={true}
                      withVerticalLines={true}
                      withHorizontalLines={true}
                      withDots={true}
                      withShadow={false}
                      segments={4}
                      fromZero={true}
                    />
                  </ScrollView>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={true} 
                    contentContainerStyle={styles.chartScrollContent}
                    style={styles.chartScrollView}
                  >
                    <LineChart
                      data={{
                        labels: customerFlowLabels,
                        datasets: [
                          {
                            data: customerFlowExited,
                          },
                        ],
                      }}
                      width={Math.max(screenWidth - 32, customerFlowLabels.length * 55)}
                      height={220}
                      chartConfig={{
                        ...chartConfig,
                        color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                      }}
                      bezier
                      style={styles.chart}
                      withInnerLines={true}
                      withOuterLines={true}
                      withVerticalLines={true}
                      withHorizontalLines={true}
                      withDots={true}
                      withShadow={false}
                      segments={4}
                      fromZero={true}
                    />
                  </ScrollView>
                </>
              ) : (
                <View style={styles.noDataContainer}>
                  <Text style={styles.noDataText}>Henüz veri yok</Text>
                  <Text style={styles.noDataSubtext}>Bugün için müşteri akış verisi bulunmuyor</Text>
                </View>
              )}
            </View>
          ) : null}

          {genderLabels.length > 0 && (
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>{t('dashboard.dailyGenderDistribution')}</Text>
              <BarChart
                data={{
                  labels: genderLabels,
                  datasets: [
                    {
                      data: genderMale,
                    },
                    {
                      data: genderFemale,
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

          {ageLabels.length > 0 && (
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>{t('dashboard.dailyAgeDistribution')}</Text>
              <BarChart
                data={{
                  labels: ageLabels,
                  datasets: [
                    {
                      data: age18_30,
                    },
                    {
                      data: age30_50,
                    },
                    {
                      data: age50Plus,
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
    marginTop: 12,
    color: '#94a3b8',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#EF4444',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'left',
    marginBottom: 20,
    lineHeight: 20,
  },
  errorSteps: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  errorStepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  errorStep: {
    fontSize: 14,
    color: '#cbd5e1',
    marginBottom: 8,
    marginLeft: 8,
  },
  errorStepCode: {
    fontSize: 12,
    color: '#94a3b8',
    fontFamily: 'monospace',
    marginBottom: 4,
    marginLeft: 16,
    backgroundColor: '#0f172a',
    padding: 8,
    borderRadius: 6,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerSection: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
  },
  dateRangeBadge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dateRangeText: {
    fontSize: 12,
    color: '#64748b',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: '#94a3b8',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  statDescription: {
    fontSize: 12,
    color: '#94a3b8',
  },
  genderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  genderValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  genderLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
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
    marginBottom: 12,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  chartScrollView: {
    marginHorizontal: -16,
    marginBottom: 8,
  },
  chartScrollContent: {
    paddingHorizontal: 16,
  },
  chart: {
    marginVertical: 4,
    borderRadius: 16,
  },
  noDataContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 8,
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
});

export default Dashboard;
