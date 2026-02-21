import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { Plus, Edit2, Trash2, Shield, Search, X, ExternalLink } from 'lucide-react-native';
import { useLanguage } from '../contexts/LanguageContext';
import { apiFetch } from '../lib/api';
import Header from '../components/Header';
import LoadingOverlay from '../components/LoadingOverlay';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

interface AdminUsersProps {
  onLogout?: () => void;
}

interface UserItem {
  id: number;
  username: string;
  email: string;
  role: string;
  full_name?: string;
  camera_count?: number;
  site_name?: string;
  managed_store_ids?: number[];
}

type RootStackParamList = {
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

const AdminUsers: React.FC<AdminUsersProps> = ({ onLogout }) => {
  const { t } = useLanguage();
  const navigation = useNavigation<NavigationProp>();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user',
    full_name: '',
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: '20' });
      const res = await apiFetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setTotal(data.total || 0);
      } else if (res.status === 401) {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
        Alert.alert(t('admin.sessionExpired'));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const handleSubmit = async () => {
    try {
      const path = modal === 'add' ? '/api/admin/users' : `/api/admin/users/${editingUser?.id}`;
      const method = modal === 'add' ? 'POST' : 'PUT';
      const body: Record<string, unknown> = {
        username: form.username,
        email: form.email,
        role: form.role,
        full_name: form.full_name,
      };
      if (form.password) (body as Record<string, string>).password = form.password;

      const res = await apiFetch(path, {
        method,
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setModal(null);
        setEditingUser(null);
        setForm({ username: '', email: '', password: '', role: 'user', full_name: '' });
        fetchUsers();
        Alert.alert(t('common.success'), 'Kullanıcı başarıyla kaydedildi');
      } else if (res.status === 401) {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
        Alert.alert(t('admin.sessionExpired'));
      } else {
        const err = await res.json();
        Alert.alert(t('admin.error'), err.error || err.message || 'Hata oluştu');
      }
    } catch (error) {
      Alert.alert(t('admin.error'), 'Bağlantı hatası');
    }
  };

  const handleImpersonate = async (u: UserItem) => {
    try {
      const res = await apiFetch(`/api/admin/users/${u.id}/impersonate`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json();
        Alert.alert(t('admin.error'), err.error || t('admin.error'));
        return;
      }
      const data = await res.json();
      
      // Token ve user bilgilerini kaydet
      await AsyncStorage.setItem('token', data.access_token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
      
      // Store ID varsa kaydet (eğer brand_manager ise)
      if (data.user?.role === 'brand_manager' && data.user?.managed_store_ids?.length > 0) {
        // İlk store ID'yi seç
        await AsyncStorage.setItem('selectedStoreId', String(data.user.managed_store_ids[0]));
      } else {
        // Store ID yoksa temizle
        await AsyncStorage.removeItem('selectedStoreId');
      }
      
      // Dashboard'a yönlendir
      navigation.reset({
        index: 0,
        routes: [{ name: 'Dashboard' }],
      });
      
      Alert.alert(
        t('common.success'),
        `${u.username} kullanıcısı olarak giriş yapıldı`
      );
    } catch (e) {
      console.error(e);
      Alert.alert(t('admin.connectionError'));
    }
  };

  const handleDelete = async (id: number, username: string) => {
    Alert.alert(
      t('common.warning'),
      `"${username}" ${t('admin.deleteConfirm')}`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            const res = await apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
            if (res.ok) {
              fetchUsers();
            } else {
              const err = await res.json();
              Alert.alert(t('admin.error'), err.error || t('admin.error'));
            }
          },
        },
      ]
    );
  };

  const openEdit = (u: UserItem) => {
    setEditingUser(u);
    setForm({
      username: u.username,
      email: u.email,
      password: '',
      role: u.role,
      full_name: u.full_name || '',
    });
    setModal('edit');
  };

  const openAdd = () => {
    setEditingUser(null);
    setForm({ username: '', email: '', password: '', role: 'user', full_name: '' });
    setModal('add');
  };

  const filtered = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title={t('admin.title')} onLogout={onLogout} />
        <LoadingOverlay message={t('common.loading')} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title={t('admin.title')} onLogout={onLogout} />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.innerContent}>
          <View style={styles.headerSection}>
            <View>
              <Text style={styles.title}>{t('admin.title')}</Text>
              <Text style={styles.subtitle}>{t('admin.subtitle')}</Text>
            </View>
            <TouchableOpacity style={styles.addButton} onPress={openAdd}>
              <Plus size={20} color="#fff" />
              <Text style={styles.addButtonText}>{t('admin.newUser')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Search size={20} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder={t('admin.searchUsers')}
              placeholderTextColor="#64748b"
              value={search}
              onChangeText={setSearch}
            />
          </View>

          <>
            <View style={styles.statsRow}>
                <Text style={styles.statsText}>
                  {total} {t('admin.usersCount')}
                </Text>
              </View>

              {filtered.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>{t('common.noData')}</Text>
                </View>
              ) : (
                <View style={styles.usersList}>
                  {filtered.map((user) => (
                    <View key={user.id} style={styles.userCard}>
                      <View style={styles.userInfo}>
                        <View style={styles.userHeader}>
                          <Text style={styles.userName}>{user.username}</Text>
                          {user.role === 'admin' && (
                            <View style={styles.adminBadge}>
                              <Shield size={14} color="#3B82F6" />
                              <Text style={styles.adminBadgeText}>{t('role.admin')}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.userEmail}>{user.email}</Text>
                        {user.full_name && (
                          <Text style={styles.userFullName}>{user.full_name}</Text>
                        )}
                        {user.camera_count !== undefined && (
                          <Text style={styles.userMeta}>
                            {user.camera_count} {t('admin.cameras')}
                          </Text>
                        )}
                      </View>
                      <View style={styles.userActions}>
                        <TouchableOpacity
                          style={styles.impersonateButton}
                          onPress={() => handleImpersonate(user)}
                        >
                          <ExternalLink size={18} color="#10B981" />
                        </TouchableOpacity>
                        {user.username !== 'admin' && (
                          <>
                            <TouchableOpacity
                              style={styles.editButton}
                              onPress={() => openEdit(user)}
                            >
                              <Edit2 size={18} color="#3B82F6" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.deleteButton}
                              onPress={() => handleDelete(user.id, user.username)}
                            >
                              <Trash2 size={18} color="#EF4444" />
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
        </View>
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={modal !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modal === 'add' ? t('admin.newUser') : t('admin.editUser')}
              </Text>
              <TouchableOpacity onPress={() => setModal(null)}>
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('admin.user')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Kullanıcı adı"
                  placeholderTextColor="#64748b"
                  value={form.username}
                  onChangeText={(text) => setForm({ ...form, username: text })}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>E-posta</Text>
                <TextInput
                  style={styles.input}
                  placeholder="email@example.com"
                  placeholderTextColor="#64748b"
                  value={form.email}
                  onChangeText={(text) => setForm({ ...form, email: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  {modal === 'edit' ? t('settings.newPassword') : t('login.password')}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={modal === 'edit' ? t('admin.leaveEmptyNoChange') : 'Şifre'}
                  placeholderTextColor="#64748b"
                  value={form.password}
                  onChangeText={(text) => setForm({ ...form, password: text })}
                  secureTextEntry
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('admin.role')}</Text>
                <View style={styles.roleButtons}>
                  {['user', 'admin', 'store_manager', 'brand_manager'].map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.roleButton,
                        form.role === role && styles.roleButtonActive,
                      ]}
                      onPress={() => setForm({ ...form, role })}
                    >
                      <Text
                        style={[
                          styles.roleButtonText,
                          form.role === role && styles.roleButtonTextActive,
                        ]}
                      >
                        {t(`role.${role}`) || role}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('settings.fullName')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('settings.fullNamePlaceholder')}
                  placeholderTextColor="#64748b"
                  value={form.full_name}
                  onChangeText={(text) => setForm({ ...form, full_name: text })}
                />
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModal(null)}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSubmit}>
                <Text style={styles.saveButtonText}>{t('common.save')}</Text>
              </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  statsRow: {
    marginBottom: 16,
  },
  statsText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 16,
  },
  usersList: {
    gap: 12,
  },
  userCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  adminBadgeText: {
    fontSize: 10,
    color: '#3B82F6',
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 4,
  },
  userFullName: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 4,
  },
  userMeta: {
    fontSize: 12,
    color: '#64748b',
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  impersonateButton: {
    padding: 8,
  },
  editButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalBody: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  roleButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
  },
  roleButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  roleButtonText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  roleButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#334155',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default AdminUsers;
