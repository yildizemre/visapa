import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { DrawerContentScrollView, DrawerContentComponentProps } from '@react-navigation/drawer';
import { useLanguage } from '../contexts/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Home, Users, UserCheck, Map, Clock, BarChart3, Settings, LogOut } from 'lucide-react-native';

const Layout: React.FC<DrawerContentComponentProps & { onLogout?: () => void }> = ({ navigation, onLogout }) => {
  const { t } = useLanguage();

  const menuItems = [
    { name: 'Dashboard', label: t('nav.dashboard'), icon: Home },
    { name: 'CustomerAnalytics', label: t('nav.customerAnalytics'), icon: Users },
    { name: 'StaffManagement', label: t('nav.staffManagement'), icon: UserCheck },
    { name: 'Heatmaps', label: t('nav.heatmaps'), icon: Map },
    { name: 'QueueAnalysis', label: t('nav.queueAnalysis'), icon: Clock },
    { name: 'ReportAnalytics', label: t('nav.reportAnalytics'), icon: BarChart3 },
    { name: 'Settings', label: t('nav.settings'), icon: Settings },
  ];

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <DrawerContentScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>VISLIVIS</Text>
      </View>
      <View style={styles.menu}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <TouchableOpacity
              key={item.name}
              style={styles.menuItem}
              onPress={() => navigation.navigate(item.name)}
            >
              <Icon size={20} color="#94a3b8" />
              <Text style={styles.menuItemText}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <LogOut size={20} color="#ef4444" />
        <Text style={styles.logoutText}>{t('nav.logout')}</Text>
      </TouchableOpacity>
    </DrawerContentScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e293b',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  menu: {
    flex: 1,
    paddingTop: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#94a3b8',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    gap: 12,
  },
  logoutText: {
    fontSize: 16,
    color: '#ef4444',
    fontWeight: '600',
  },
});

export default Layout;
