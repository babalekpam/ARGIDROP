import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

const C = {
  cream: '#F7F3EB', paper: '#FDFBF6', forest: '#1B4332', bronze: '#8B6F47',
  ink: '#1A1A1A', muted: '#6B6560', subtle: '#9A9489', border: '#E4DCC9',
  bubbleMine: '#1B4332', bubbleTheirs: '#FDFBF6',
};

/**
 * Shared chat screen for merchant↔driver conversation tied to a job.
 * route.params: { jobId, peerName? }
 *
 * Loads history via REST, then subscribes to the `chat:message` socket event
 * (server persists each message before broadcasting). Sending also goes over
 * the socket; the broadcast comes back to us as the canonical record.
 */
export default function ChatScreen({ route, navigation }) {
  const { jobId, peerName } = route.params || {};
  const { user } = useAuth();
  const { getSocket, connect } = useSocket();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);
  const seenIds = useRef(new Set());

  const appendUnique = useCallback((m) => {
    if (!m) return;
    if (m.id && seenIds.current.has(m.id)) return;
    if (m.id) seenIds.current.add(m.id);
    setMessages(prev => [...prev, m]);
  }, []);

  useEffect(() => {
    let mounted = true;
    let activeSock = null;

    (async () => {
      // Connect + attach listener + join the room BEFORE fetching history.
      // Otherwise a message that lands during the REST round-trip (between
      // history snapshot and listener attach) is dropped and never recovered
      // until next reload. The appendUnique de-dupes by id, so any echo of a
      // message already in history is harmless.
      const sock = getSocket() || (await connect());
      if (sock && mounted) {
        activeSock = sock;
        sock.on('chat:message', (m) => {
          if (m?.jobId !== jobId) return;
          appendUnique(m);
        });
        sock.emit('join:job', jobId);
      }

      try {
        const r = await api.get(`/jobs/${jobId}/messages`);
        if (!mounted) return;
        const rows = r.data?.messages || [];
        const merged = [...rows];
        rows.forEach(m => m.id && seenIds.current.add(m.id));
        setMessages(merged);
      } catch (e) {
        console.warn('Load chat history failed:', e?.response?.data || e?.message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      const sock = activeSock || getSocket();
      sock?.off('chat:message');
      sock?.emit('leave:job', jobId);
    };
  }, [jobId, getSocket, connect, appendUnique]);

  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  }, [messages.length]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    const sock = getSocket() || (await connect());
    if (!sock) return;
    setSending(true);
    sock.emit('chat:message', { jobId, content: trimmed });
    setText('');
    setSending(false);
  };

  const renderItem = ({ item }) => {
    const mine = item.senderId === user?.id;
    return (
      <View style={[s.row, mine ? s.rowMine : s.rowTheirs]}>
        <View style={[s.bubble, mine ? s.bubbleMine : s.bubbleTheirs]}>
          <Text style={[s.msgText, mine ? s.msgTextMine : s.msgTextTheirs]}>{item.content}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={{ color: C.forest, fontSize: 16 }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.kicker}>Conversation</Text>
          <Text style={s.title} numberOfLines={1}>{peerName || 'Chat'}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={C.forest} />
          </View>
        ) : messages.length === 0 ? (
          <View style={s.empty}>
            <Text style={{ color: C.muted, fontSize: 14 }}>No messages yet — say hello.</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m, i) => m.id || `tmp-${i}`}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 12, paddingBottom: 20 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        <View style={s.composer}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message…"
            placeholderTextColor={C.subtle}
            style={s.input}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            style={[s.sendBtn, (!text.trim() || sending) && { opacity: 0.4 }]}
            onPress={send}
            disabled={!text.trim() || sending}
          >
            <Text style={s.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 14, backgroundColor: C.paper,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: { paddingRight: 12, paddingVertical: 4 },
  kicker: { fontSize: 10, color: C.bronze, letterSpacing: 1.4, fontWeight: '600', textTransform: 'uppercase' },
  title: { fontSize: 16, fontWeight: '600', color: C.ink },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  row: { marginBottom: 8, flexDirection: 'row' },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMine: { backgroundColor: C.bubbleMine, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: C.bubbleTheirs, borderWidth: 1, borderColor: C.border, borderBottomLeftRadius: 4 },
  msgText: { fontSize: 14, lineHeight: 19 },
  msgTextMine: { color: C.paper },
  msgTextTheirs: { color: C.ink },
  composer: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 12, paddingVertical: 8, gap: 8,
    borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.paper,
  },
  input: {
    flex: 1, minHeight: 40, maxHeight: 120,
    borderWidth: 1, borderColor: C.border, borderRadius: 18,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    fontSize: 14, color: C.ink, backgroundColor: C.cream,
  },
  sendBtn: { backgroundColor: C.forest, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 18 },
  sendText: { color: C.paper, fontWeight: '600', fontSize: 13 },
});
