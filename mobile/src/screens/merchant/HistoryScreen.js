import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../utils/api';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', amber:'#C28B2C', red:'#B23A48' };

const STATUS_LABEL = { COMPLETED: 'Completed', DELIVERED: 'Delivered', CANCELLED: 'Cancelled', DISPUTED: 'Disputed' };
const STATUS_COLOR = { COMPLETED: C.muted, DELIVERED: C.forest, CANCELLED: C.red, DISPUTED: C.red };

export default function MerchantHistoryScreen({ navigation }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await api.get('/jobs', { params: { status: 'COMPLETED,DELIVERED,CANCELLED,DISPUTED' } });
      setJobs(res.data.jobs || res.data.data || []);
    } catch (e) {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  return (
    <View style={s.container}>
      <View style={s.header}><Text style={s.title}>History</Text></View>
      {loading ? <ActivityIndicator color={C.forest} style={{ marginTop: 24 }} /> :
       jobs.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="archive-outline" size={36} color={C.subtle} />
          <Text style={s.emptyTitle}>No past deliveries yet</Text>
          <Text style={s.emptySub}>Completed deliveries will show here.</Text>
        </View>
       ) : (
        <FlatList
          data={jobs}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.forest} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.card} onPress={() => navigation.navigate('JobDetail', { jobId: item.id })}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={s.ref}>#{(item.referenceCode || item.id || '').toString().slice(-6).toUpperCase()}</Text>
                <Text style={[s.status, { color: STATUS_COLOR[item.status] || C.muted }]}>{STATUS_LABEL[item.status] || item.status}</Text>
              </View>
              <Text style={s.addr} numberOfLines={1}>{item.dropoffAddress || 'Drop-off'}</Text>
              <Text style={s.date}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}</Text>
            </TouchableOpacity>
          )}
        />
       )
      }
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.cream },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  title: { fontSize: 22, fontWeight: '600', color: C.ink },
  card: { backgroundColor: C.paper, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: C.border, marginBottom: 10 },
  ref: { fontSize: 12, color: C.bronze, fontWeight: '700', letterSpacing: 1 },
  status: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  addr: { fontSize: 14, color: C.ink, marginBottom: 4 },
  date: { fontSize: 12, color: C.muted },
  empty: { alignItems: 'center', paddingVertical: 80 },
  emptyTitle: { fontSize: 15, color: C.ink, marginTop: 10, fontWeight: '600' },
  emptySub: { fontSize: 13, color: C.muted, marginTop: 4 },
});
