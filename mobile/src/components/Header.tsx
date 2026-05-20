import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useLanguage } from '../contexts/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Menu,
  X,
  Home,
  Users,
  UserCheck,
  Map,
  Clock,
  BarChart3,
  MessageCircle,
  FileText,
  Settings,
  LogOut,
  Shield,
} from 'lucide-react-native';
import HealthStatusIndicator from './HealthStatusIndicator';

type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  CustomerAnalytics: undefined;
  StaffManagement: undefined;
  Heatmaps: undefined;
  QueueAnalysis: undefined;
  ReportAnalytics: undefined;
  Chat: undefined;
  Settings: undefined;
  AdminUsers: undefined;
  ActivityLogs: undefined;
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
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const menuWidth = Math.min(280, windowWidth * 0.85);
  const headerLogoHeight = Math.min(28, windowWidth * 0.06);
  const menuLogoHeight = Math.min(44, windowHeight * 0.055);

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
    { name: 'Chat', label: t('nav.chat'), icon: MessageCircle },
    ...(isAdmin ? [
      { name: 'AdminUsers', label: t('nav.userManagement'), icon: Shield },
      { name: 'ActivityLogs', label: t('nav.activityLogs'), icon: FileText },
    ] : []),
    { name: 'Settings', label: t('nav.settings'), icon: Settings },
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
        <Image
          source={require('../../vislivis_logo.png')}
          style={[styles.headerLogo, { height: headerLogoHeight, maxWidth: 120 }]}
          resizeMode="contain"
        />
        <View style={styles.headerRight}>
          <HealthStatusIndicator />
        </View>
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
          <View
            style={[styles.menuContainer, { width: menuWidth, maxHeight: windowHeight }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.menuHeader}>
              <Image
                source={require('../../vislivis_logo.png')}
                style={[styles.menuLogo, { height: menuLogoHeight }]}
                resizeMode="contain"
              />
              <TouchableOpacity
                onPress={() => setMenuVisible(false)}
                style={styles.closeButton}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.menuScroll}
              contentContainerStyle={styles.menuScrollContent}
              showsVerticalScrollIndicator={true}
              bounces={true}
              keyboardShouldPersistTaps="handled"
            >
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
                    <Text style={styles.menuItemText} numberOfLines={1}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <LogOut size={20} color="#ef4444" />
                <Text style={styles.logoutText}>{t('nav.logout')}</Text>
              </TouchableOpacity>
            </ScrollView>
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
    paddingHorizontal: 12,
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
  headerLogo: {
    flex: 1,
    marginHorizontal: 8,
  },
  headerRight: {
    minWidth: 48,
    alignItems: 'flex-end',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuContainer: {
    flex: 1,
    backgroundColor: '#1e293b',
    alignSelf: 'flex-start',
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  menuLogo: {
    width: 120,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  menuScroll: {
    flex: 1,
  },
  menuScrollContent: {
    paddingTop: 12,
    paddingBottom: 32,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#94a3b8',
    flex: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 12,
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
