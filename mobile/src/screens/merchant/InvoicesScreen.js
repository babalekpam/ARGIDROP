import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../../context/AuthContext';
import { t, getLang } from '../../utils/i18n';
import api from '../../utils/api';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', red:'#B23A48' };

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export default function InvoicesScreen({ navigation }) {
  const { user } = useAuth();
  const lang = getLang(user);

  const [invoices, setInvoices] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/businesses/invoices');
      setInvoices(res.data.invoices || []);
    } catch (e) {
      setInvoices([]);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const download = async (row) => {
    const paymentId = row.payment.id;
    setDownloadingId(paymentId);
    try {
      const token = await SecureStore.getItemAsync('argidrop_token');
      const fileName = `INV-${(row.job?.trackingToken || paymentId.substring(0, 8)).toUpperCase()}.pdf`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      const result = await FileSystem.downloadAsync(
        `${API_URL}/businesses/invoices/${paymentId}/pdf`,
        fileUri,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (result.status !== 200) throw new Error(`HTTP ${result.status}`);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', dialogTitle: fileName });
      } else {
        Alert.alert('', t('invoices.saved', lang));
      }
    } catch (err) {
      Alert.alert(t('invoices.downloadFailed', lang), err.message || '');
    } finally { setDownloadingId(null); }
  };

  const statusLabel = (status) =>
    status === 'RELEASED' ? t('invoices.paid', lang)
    : status === 'HELD' ? t('invoices.held', lang)
    : status === 'REFUNDED' ? t('orderStatus.REFUNDED', lang)
    : status;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={C.ink} />
        </TouchableOpacity>
        <Text style={s.title}>{t('invoices.title', lang)}</Text>
      </View>
      <FlatList
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        data={invoices || []}
        keyExtractor={row => row.payment.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.forest} />}
        ListHeaderComponent={<Text style={s.subtitle}>{t('invoices.subtitle', lang)}</Text>}
        ListEmptyComponent={invoices === null
          ? <ActivityIndicator color={C.forest} style={{ marginTop: 24 }} />
          : <Text style={s.empty}>{t('invoices.empty', lang)}</Text>}
        renderItem={({ item: row }) => (
          <View style={s.card}>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>INV-{(row.job?.trackingToken || row.payment.id.substring(0, 8)).toUpperCase()}</Text>
              <Text style={s.cardMeta} numberOfLines={1}>
                {new Date(row.payment.createdAt).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US')} · {statusLabel(row.payment.status)}
              </Text>
              {row.job?.dropoffAddress ? <Text style={s.cardMeta} numberOfLines={1}>{row.job.dropoffAddress}</Text> : null}
            </View>
            <Text style={s.amount}>{Math.round(parseFloat(row.payment.grossAmount)).toLocaleString()} {row.payment.currency || 'XOF'}</Text>
            <TouchableOpacity style={s.dlBtn} onPress={() => download(row)} disabled={downloadingId === row.payment.id}>
              {downloadingId === row.payment.id
                ? <ActivityIndicator size="small" color={C.forest} />
                : <Ionicons name="download-outline" size={20} color={C.forest} />}
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.cream },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.paper },
  backBtn: { padding: 8 },
  title: { fontSize: 17, fontWeight: '600', color: C.ink, marginLeft: 4 },
  subtitle: { fontSize: 13, color: C.muted, lineHeight: 19, marginBottom: 14 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.paper, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 8 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: C.ink },
  cardMeta: { fontSize: 11, color: C.muted, marginTop: 2 },
  amount: { fontSize: 13, fontWeight: '700', color: C.forest, marginHorizontal: 10 },
  dlBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.cream, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  empty: { fontSize: 13, color: C.muted, backgroundColor: C.paper, borderRadius: 8, borderWidth: 1, borderColor: C.border, padding: 14 },
});
