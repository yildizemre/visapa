import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Image,
} from 'react-native';
import { User, Camera, Mail, X, Trash2, RefreshCw, CheckCircle, AlertTriangle, Eye } from 'lucide-react-native';
import { useLanguage } from '../contexts/LanguageContext';
import { apiFetch } from '../lib/api';
import { useStoreChange } from '../hooks/useStoreChange';
import Header from '../components/Header';

interface SettingsProps {
  onLogout?: () => void;
}

interface CameraInfo {
  id: number;
  name: string;
  type: string;
  rtsp: string;
  imageUrl: string;
}

interface ReportRecipient {
  id: number;
  email: string;
}

const Settings: React.FC<SettingsProps> = ({ onLogout }) => {
  const { t } = useLanguage();
  const storeRefresh = useStoreChange();
  const [activeTab, setActiveTab] = useState('profile');
  const [cameras, setCameras] = useState<CameraInfo[]>([]);
  const [siteName, setSiteName] = useState<string | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<CameraInfo | null>(null);

  const [profile, setProfile] = useState<{ username: string; email: string; full_name: string | null } | null>(null);
  const [profileForm, setProfileForm] = useState({ full_name: '', email: '' });
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [recipients, setRecipients] = useState<ReportRecipient[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const tabs = [
    { id: 'profile', label: t('settings.profileTab'), icon: User },
    { id: 'cameras', label: t('settings.camerasTab'), icon: Camera },
    { id: 'reporting', label: t('settings.reportingTab'), icon: Mail },
  ];

  useEffect(() => {
    if (activeTab === 'profile') {
      const fetchProfile = async () => {
        try {
          const res = await apiFetch('/api/settings/profile');
          if (res.ok) {
            const data = await res.json();
            setProfile(data);
            setProfileForm({ full_name: data.full_name || '', email: data.email || '' });
          }
        } catch {
          setProfile(null);
        }
      };
      fetchProfile();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'cameras') {
      const fetchCameras = async () => {
        try {
          const res = await apiFetch('/api/settings/cameras');
          if (res.ok) {
            const data = await res.json();
            setSiteName(data.site_name || null);
            setCameras((data.cameras || []).map((c: any) => ({
              id: c.id,
              name: c.name,
              type: c.type || 'Kapı',
              rtsp: c.rtsp || '',
              imageUrl: c.imageUrl || '',
            })));
          }
        } catch {
          setCameras([]);
        }
      };
      fetchCameras();
    }
  }, [activeTab, storeRefresh]);

  useEffect(() => {
    if (activeTab === 'reporting') {
      const fetchRecipients = async () => {
        try {
          const res = await apiFetch('/api/settings/report-recipients');
          if (res.ok) {
            const data = await res.json();
            setRecipients(data.recipients || data || []);
          }
        } catch (error) {
          console.error('Alıcılar çekilemedi:', error);
        }
      };
      fetchRecipients();
    }
  }, [activeTab]);

  const handleProfileSave = async () => {
    setProfileMessage({ type: '', text: '' });
    setIsSavingProfile(true);
    try {
      const res = await apiFetch('/api/settings/profile', {
        method: 'PUT',
        body: JSON.stringify({ fullName: profileForm.full_name, email: profileForm.email }),
      });
      const data = await res.json();
      if (res.ok) {
        setProfileMessage({ type: 'success', text: t('settings.profileUpdated') });
        setProfile(data);
      } else {
        setProfileMessage({ type: 'error', text: data.error || t('settings.updateFailed') });
      }
    } catch {
      setProfileMessage({ type: 'error', text: t('settings.serverError') });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAddEmail = async () => {
    setEmailError('');
    if (!newEmail) {
      setEmailError('E-posta adresi boş olamaz.');
      return;
    }
    try {
      const res = await apiFetch('/api/settings/report-recipients', {
        method: 'POST',
        body: JSON.stringify({ email: newEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setRecipients([data, ...recipients]);
        setNewEmail('');
      } else {
        setEmailError(data.error || 'Bir hata oluştu.');
      }
    } catch (error) {
      setEmailError('Sunucuya bağlanılamadı.');
    }
  };

  const handleDeleteEmail = async (id: number) => {
    Alert.alert(t('common.warning'), 'Bu e-posta adresini silmek istediğinizden emin misiniz?', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await apiFetch(`/api/settings/report-recipients/${id}`, {
              method: 'DELETE',
            });
            if (res.ok) {
              setRecipients(recipients.filter(r => r.id !== id));
            } else {
              Alert.alert(t('settings.deleteFailed'));
            }
          } catch (error) {
            Alert.alert(t('settings.serverError'));
          }
        },
      },
    ]);
  };
  
  const handlePasswordChange = async () => {
    setPasswordMessage({ type: '', text: '' });
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({ type: 'error', text: t('settings.passwordsMismatch') });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: t('settings.passwordMinLength') });
      return;
    }
    setIsSavingPassword(true);
    try {
      const res = await apiFetch('/api/settings/password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordMessage({ type: 'success', text: data.message });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setPasswordMessage({ type: 'error', text: data.error || t('settings.passwordUpdateFailed') });
      }
    } catch (error) {
      setPasswordMessage({ type: 'error', text: t('settings.passwordError') });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <View style={styles.tabContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('settings.profileInfo')}</Text>
              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('settings.username')}</Text>
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  value={profile?.username ?? ''}
                  editable={false}
                />
                <Text style={styles.helperText}>{t('settings.usernameReadonly')}</Text>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('settings.fullName')}</Text>
                <TextInput
                  style={styles.input}
                  value={profileForm.full_name}
                  onChangeText={(text) => setProfileForm({ ...profileForm, full_name: text })}
                  placeholder={t('settings.fullNamePlaceholder')}
                  placeholderTextColor="#64748b"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('settings.email')}</Text>
                <TextInput
                  style={styles.input}
                  value={profileForm.email}
                  onChangeText={(text) => setProfileForm({ ...profileForm, email: text })}
                  placeholder={t('settings.emailPlaceholder')}
                  placeholderTextColor="#64748b"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              {profileMessage.text && (
                <View
                  style={[
                    styles.messageBox,
                    profileMessage.type === 'success' ? styles.messageBoxSuccess : styles.messageBoxError,
                  ]}
                >
                  {profileMessage.type === 'success' ? (
                    <CheckCircle size={16} color="#10B981" />
                  ) : (
                    <AlertTriangle size={16} color="#EF4444" />
                  )}
                  <Text
                    style={[
                      styles.messageText,
                      profileMessage.type === 'success' ? styles.messageTextSuccess : styles.messageTextError,
                    ]}
                  >
                    {profileMessage.text}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={[styles.saveButton, isSavingProfile && styles.saveButtonDisabled]}
                onPress={handleProfileSave}
                disabled={isSavingProfile}
              >
                {isSavingProfile ? (
                  <RefreshCw size={16} color="#fff" />
                ) : (
                  <CheckCircle size={16} color="#fff" />
                )}
                <Text style={styles.saveButtonText}>{t('settings.saveProfile')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('settings.changePassword')}</Text>
              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('settings.currentPassword')}</Text>
                <TextInput
                  style={styles.input}
                  value={passwordData.currentPassword}
                  onChangeText={(text) => setPasswordData({ ...passwordData, currentPassword: text })}
                  secureTextEntry
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('settings.newPassword')}</Text>
                <TextInput
                  style={styles.input}
                  value={passwordData.newPassword}
                  onChangeText={(text) => setPasswordData({ ...passwordData, newPassword: text })}
                  secureTextEntry
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('settings.newPasswordConfirm')}</Text>
                <TextInput
                  style={styles.input}
                  value={passwordData.confirmPassword}
                  onChangeText={(text) => setPasswordData({ ...passwordData, confirmPassword: text })}
                  secureTextEntry
                />
              </View>
              {passwordMessage.text && (
                <View
                  style={[
                    styles.messageBox,
                    passwordMessage.type === 'success' ? styles.messageBoxSuccess : styles.messageBoxError,
                  ]}
                >
                  {passwordMessage.type === 'success' ? (
                    <CheckCircle size={16} color="#10B981" />
                  ) : (
                    <AlertTriangle size={16} color="#EF4444" />
                  )}
                  <Text
                    style={[
                      styles.messageText,
                      passwordMessage.type === 'success' ? styles.messageTextSuccess : styles.messageTextError,
                    ]}
                  >
                    {passwordMessage.text}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={[styles.saveButton, isSavingPassword && styles.saveButtonDisabled]}
                onPress={handlePasswordChange}
                disabled={isSavingPassword}
              >
                {isSavingPassword ? (
                  <RefreshCw size={16} color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>{t('settings.updatePassword')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'cameras':
        return (
          <View style={styles.tabContent}>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('settings.cameraFlows')}</Text>
                {siteName && (
                  <Text style={styles.siteName}>
                    {t('settings.setup')}: {siteName}
                  </Text>
                )}
              </View>
              <Text style={styles.sectionDescription}>{t('settings.cameraSetupDesc')}</Text>
              {cameras.length === 0 ? (
                <Text style={styles.noDataText}>{t('settings.noCameras')}</Text>
              ) : (
                <View style={styles.camerasList}>
                  {cameras.map((camera) => (
                    <View key={camera.id} style={styles.cameraCard}>
                      <View style={styles.cameraInfo}>
                        <Text style={styles.cameraName}>{camera.name}</Text>
                        <Text style={styles.cameraType}>{camera.type}</Text>
                        <Text style={styles.cameraRtsp} numberOfLines={2}>
                          {camera.rtsp}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.viewButton}
                        onPress={() => setSelectedCamera(camera)}
                      >
                        <Eye size={16} color="#fff" />
                        <Text style={styles.viewButtonText}>{t('settings.view')}</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        );

      case 'reporting':
        return (
          <View style={styles.tabContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('settings.reportRecipients')}</Text>
              <Text style={styles.sectionDescription}>{t('settings.reportRecipientsDesc')}</Text>
              <View style={styles.emailForm}>
                <TextInput
                  style={styles.emailInput}
                  value={newEmail}
                  onChangeText={setNewEmail}
                  placeholder={t('settings.addEmailPlaceholder')}
                  placeholderTextColor="#64748b"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TouchableOpacity style={styles.addButton} onPress={handleAddEmail}>
                  <Text style={styles.addButtonText}>{t('settings.add')}</Text>
                </TouchableOpacity>
              </View>
              {emailError && <Text style={styles.errorText}>{emailError}</Text>}

              <View style={styles.recipientsSection}>
                <Text style={styles.recipientsTitle}>{t('settings.currentRecipients')}</Text>
                {recipients.length === 0 ? (
                  <Text style={styles.noDataText}>{t('settings.noRecipients')}</Text>
                ) : (
                  <View style={styles.recipientsList}>
                    {recipients.map((recipient) => (
                      <View key={recipient.id} style={styles.recipientItem}>
                        <Text style={styles.recipientEmail}>{recipient.email}</Text>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDeleteEmail(recipient.id)}
                        >
                          <Trash2 size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <Header title={t('settings.title')} onLogout={onLogout} />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.innerContent}>
          <View style={styles.headerSection}>
            <Text style={styles.title}>{t('settings.title')}</Text>
            <Text style={styles.subtitle}>{t('settings.subtitleFull')}</Text>
          </View>

          <View style={styles.tabsContainer}>
            <View style={styles.tabs}>
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={[styles.tab, activeTab === tab.id && styles.tabActive]}
                    onPress={() => setActiveTab(tab.id)}
                  >
                    <Icon size={20} color={activeTab === tab.id ? '#3B82F6' : '#94a3b8'} />
                    <Text
                      style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {renderTabContent()}
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={selectedCamera !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedCamera(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedCamera?.name}</Text>
              <TouchableOpacity onPress={() => setSelectedCamera(null)}>
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            {selectedCamera?.imageUrl ? (
              <Image
                source={{ uri: selectedCamera.imageUrl }}
                style={styles.cameraImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.noImageContainer}>
                <Text style={styles.noImageText}>{t('settings.noImage')}</Text>
              </View>
            )}
            <View style={styles.rtspContainer}>
              <Text style={styles.rtspLabel}>{t('settings.rtspLabel')}</Text>
              <Text style={styles.rtspValue}>{selectedCamera?.rtsp}</Text>
            </View>
          </View>
        </View>
      </Modal>
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
  tabsContainer: {
    gap: 16,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 8,
  },
  tabActive: {
    backgroundColor: '#1e3a5f',
  },
  tabText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  tabContent: {
    gap: 16,
  },
  section: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 16,
  },
  siteName: {
    fontSize: 12,
    color: '#94a3b8',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#cbd5e1',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  helperText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  messageBoxSuccess: {
    backgroundColor: '#065f46',
  },
  messageBoxError: {
    backgroundColor: '#7f1d1d',
  },
  messageText: {
    fontSize: 12,
    flex: 1,
  },
  messageTextSuccess: {
    color: '#10B981',
  },
  messageTextError: {
    color: '#EF4444',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
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
  camerasList: {
    gap: 12,
  },
  cameraCard: {
    backgroundColor: '#0f172a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cameraInfo: {
    marginBottom: 12,
  },
  cameraName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  cameraType: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 8,
  },
  cameraRtsp: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'monospace',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  viewButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emailForm: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  emailInput: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
  },
  addButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginBottom: 12,
  },
  recipientsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  recipientsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  recipientsList: {
    gap: 8,
  },
  recipientItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  recipientEmail: {
    flex: 1,
    fontSize: 14,
    color: '#cbd5e1',
  },
  deleteButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 500,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  cameraImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    backgroundColor: '#000',
    marginBottom: 16,
  },
  noImageContainer: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  noImageText: {
    color: '#64748b',
    fontSize: 14,
  },
  rtspContainer: {
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 8,
  },
  rtspLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  rtspValue: {
    fontSize: 11,
    color: '#cbd5e1',
    fontFamily: 'monospace',
  },
});

export default Settings;
