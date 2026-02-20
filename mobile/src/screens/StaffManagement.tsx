import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ShieldAlert } from 'lucide-react-native';
import { useLanguage } from '../contexts/LanguageContext';
import Header from '../components/Header';

interface StaffManagementProps {
  onLogout?: () => void;
}

const StaffManagement: React.FC<StaffManagementProps> = ({ onLogout }) => {
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      <Header title={t('staff.title')} onLogout={onLogout} />
      <View style={styles.content}>
        <View style={styles.messageCard}>
          <ShieldAlert size={56} color="#94a3b8" />
          <Text style={styles.messageTitle}>{t('staff.noAuthorization')}</Text>
          <Text style={styles.messageSubtitle}>
            {t('staff.subtitle')}
          </Text>
        </View>
      </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  messageCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    maxWidth: 320,
  },
  messageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f59e0b',
    marginTop: 16,
    marginBottom: 8,
  },
  messageSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
});

export default StaffManagement;
