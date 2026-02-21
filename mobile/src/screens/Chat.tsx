import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { MessageCircle, Send, PlusCircle, Trash2, History } from 'lucide-react-native';
import { useLanguage } from '../contexts/LanguageContext';
import { apiFetch } from '../lib/api';
import Header from '../components/Header';

interface ChatMessageType {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string | null;
}

interface ConversationType {
  id: number;
  title: string;
  created_at: string | null;
  updated_at: string | null;
}

interface ChatProps {
  onLogout?: () => void;
}

const Chat: React.FC<ChatProps> = ({ onLogout }) => {
  const { t } = useLanguage();
  const [conversations, setConversations] = useState<ConversationType[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const messagesScrollRef = useRef<ScrollView>(null);

  const loadConversations = async () => {
    setLoadingList(true);
    try {
      const res = await apiFetch('/api/chat/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingList(false);
    }
  };

  const loadHistory = async (convId: number | null) => {
    setLoadingHistory(true);
    try {
      const url = convId != null
        ? `/api/chat/history?conversation_id=${convId}`
        : '/api/chat/history';
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      } else {
        setMessages([]);
      }
    } catch {
      setMessages([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    loadHistory(currentConversationId);
  }, [currentConversationId]);

  const handleNewChat = () => {
    setCurrentConversationId(null);
    setMessages([]);
  };

  const handleSelectConversation = (id: number) => {
    setCurrentConversationId(id);
    setShowHistoryModal(false);
  };

  const handleDeleteConversation = (id: number) => {
    Alert.alert(t('chat.deleteChat'), t('chat.deleteChat') + '?', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await apiFetch(`/api/chat/conversations/${id}`, { method: 'DELETE' });
            if (res.ok) {
              setConversations((prev) => prev.filter((c) => c.id !== id));
              if (currentConversationId === id) {
                setCurrentConversationId(null);
                setMessages([]);
              }
            }
          } catch {
            /* ignore */
          }
        },
      },
    ]);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    const userMsg: ChatMessageType = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const body: { message: string; conversation_id?: number } = { message: text };
      if (currentConversationId != null) body.conversation_id = currentConversationId;
      const res = await apiFetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      const msg =
        (data.response && String(data.response).trim()) ||
        data.error ||
        data.msg;
      const assistantContent =
        msg || (res.ok ? '' : (t('chat.noResponse') || 'Yanıt alınamadı. Lütfen tekrar deneyin.'));

      setMessages((prev) => [...prev, { role: 'assistant', content: assistantContent }]);

      if (data.conversation_id != null && currentConversationId !== data.conversation_id) {
        setCurrentConversationId(data.conversation_id);
        loadConversations();
      } else if (data.conversation_id != null) {
        loadConversations();
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: (t('chat.connectionError') || 'Bağlantı hatası. Lütfen tekrar deneyin.') },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <View style={styles.container}>
      <Header title={t('nav.chat')} onLogout={onLogout} />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.newChatButton} onPress={handleNewChat}>
            <PlusCircle size={20} color="#fff" />
            <Text style={styles.newChatText}>{t('chat.newChat')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.historyButton} onPress={() => setShowHistoryModal(true)}>
            <History size={20} color="#94a3b8" />
            <Text style={styles.historyButtonText}>{t('chat.conversations')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.chatArea}>
          {loadingHistory ? (
            <View style={styles.messagesWrap}>
              <ActivityIndicator size="small" color="#3B82F6" />
            </View>
          ) : (
            <ScrollView
              style={styles.messagesScroll}
              contentContainerStyle={styles.messagesContent}
              ref={messagesScrollRef}
              onContentSizeChange={() => messagesScrollRef.current?.scrollToEnd({ animated: true })}
            >
              {messages.length === 0 && (
                <Text style={styles.placeholderText}>{t('chat.placeholder')}</Text>
              )}
              {messages.map((m, idx) => (
                <View
                  key={idx}
                  style={[styles.bubbleWrap, m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}
                >
                  <Text style={m.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAssistant}>
                    {m.content}
                  </Text>
                </View>
              ))}
              {loading && (
                <View style={[styles.bubbleWrap, styles.bubbleAssistant]}>
                  <ActivityIndicator size="small" color="#94a3b8" />
                </View>
              )}
            </ScrollView>
          )}

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder={t('chat.inputPlaceholder')}
              placeholderTextColor="#64748b"
              multiline
              maxLength={2000}
              editable={!loading}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!input.trim() || loading) && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!input.trim() || loading}
            >
              <Send size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={showHistoryModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowHistoryModal(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('chat.conversations')}</Text>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)} hitSlop={12}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {loadingList ? (
              <ActivityIndicator size="small" color="#94a3b8" style={styles.loader} />
            ) : conversations.length === 0 ? (
              <Text style={styles.emptyText}>—</Text>
            ) : (
              <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
                {conversations.map((c) => (
                  <View key={c.id} style={styles.convRow}>
                    <TouchableOpacity
                      style={[styles.convButton, currentConversationId === c.id && styles.convButtonActive]}
                      onPress={() => handleSelectConversation(c.id)}
                    >
                      <Text style={styles.convTitle} numberOfLines={1}>{c.title || 'Sohbet'}</Text>
                      <Text style={styles.convDate}>{formatDate(c.updated_at ?? c.created_at)}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteConvBtn}
                      onPress={() => handleDeleteConversation(c.id)}
                    >
                      <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  keyboardView: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flex: 1,
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  newChatText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  historyButtonText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  loader: {
    marginVertical: 8,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
  },
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  convButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  convButtonActive: {
    backgroundColor: '#334155',
  },
  convTitle: {
    color: '#e2e8f0',
    fontSize: 14,
  },
  deleteConvBtn: {
    padding: 8,
    marginLeft: 4,
  },
  convDate: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  modalClose: {
    fontSize: 22,
    color: '#94a3b8',
    padding: 4,
  },
  modalList: {
    maxHeight: 320,
  },
  chatArea: {
    flex: 1,
    padding: 16,
  },
  messagesWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    paddingBottom: 16,
  },
  placeholderText: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 24,
  },
  bubbleWrap: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: '#2563eb',
  },
  bubbleAssistant: {
    alignSelf: 'flex-start',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  bubbleTextUser: {
    color: '#fff',
    fontSize: 15,
  },
  bubbleTextAssistant: {
    color: '#e2e8f0',
    fontSize: 15,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    color: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

export default Chat;
