import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useLanguage } from '../contexts/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Menu, X, Home, Users, UserCheck, Map, Clock, BarChart3, Settings, LogOut, Shield } from 'lucide-react-native';
import HealthStatusIndicator from './HealthStatusIndicator';

type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  CustomerAnalytics: undefined;
  StaffManagement: undefined;
  Heatmaps: undefined;
  QueueAnalysis: undefined;
  ReportAnalytics: undefined;
  Settings: undefined;
  AdminUsers: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface HeaderProps {
  title: string;
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ title, onLogout }) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigation = useNavigation<NavigationProp>();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

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

  const menuItems = [
    { name: 'Dashboard', label: t('nav.dashboard'), icon: Home },
    { name: 'CustomerAnalytics', label: t('nav.customerAnalytics'), icon: Users },
    { name: 'StaffManagement', label: t('nav.staffManagement'), icon: UserCheck },
    { name: 'Heatmaps', label: t('nav.heatmaps'), icon: Map },
    { name: 'QueueAnalysis', label: t('nav.queueAnalysis'), icon: Clock },
    { name: 'ReportAnalytics', label: t('nav.reportAnalytics'), icon: BarChart3 },
    { name: 'Settings', label: t('nav.settings'), icon: Settings },
    ...(isAdmin ? [{ name: 'AdminUsers', label: t('nav.userManagement'), icon: Shield }] : []),
  ];

  const handleLogout = async () => {
    setMenuVisible(false);
    if (onLogout) {
      await onLogout();
    }
  };

  return (
    <>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuButton}>
          <Menu size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        <HealthStatusIndicator />
      </View>

      <Modal
        visible={menuVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuContainer}>
            <View style={styles.menuHeader}>
              <Image
                source={require('../../vislivis_logo.png')}
                style={styles.menuLogo}
                resizeMode="contain"
              />
              <TouchableOpacity onPress={() => setMenuVisible(false)}>
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.menuContent}>
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <TouchableOpacity
                    key={item.name}
                    style={styles.menuItem}
                    onPress={() => {
                      navigation.navigate(item.name as keyof RootStackParamList);
                      setMenuVisible(false);
                    }}
                  >
                    <Icon size={20} color="#94a3b8" />
                    <Text style={styles.menuItemText}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <LogOut size={20} color="#ef4444" />
              <Text style={styles.logoutText}>{t('nav.logout')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  menuButton: {
    padding: 12,
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuContainer: {
    width: 280,
    height: '100%',
    backgroundColor: '#1e293b',
    paddingTop: 50,
    alignSelf: 'flex-start',
    justifyContent: 'flex-start',
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  menuLogo: {
    width: 120,
    height: 40,
  },
  menuContent: {
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

export default Header;
