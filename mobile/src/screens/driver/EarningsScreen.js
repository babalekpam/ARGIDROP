// Driver Earnings: pending balance + lifetime stats + payout history.
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../utils/api';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', forestSoft:'#2D5E3E', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', success:'#2D5E3E', red:'#B23A48', amber:'#B8821C' };

const STATUS_META = {
  PAID:    { color: C.success, bg: '#E8EFE9', label: 'Paid' },
  PENDING: { color: C.amber,   bg: '#FAF3E0', label: 'Pending' },
  FAILED:  { color: C.red,     bg: '#F9E5E8', label: 'Failed' },
  RETRY:   { color: C.amber,   bg: '#FAF3E0', label: 'Retrying' },
};

export default function EarningsScreen({ navigation }) {
  const [status, setStatus] = useState(null);
  const [stats, setStats] = useState({ totalEarnings: 0, thisMonth: 0, totalDeliveries: 0 });
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [st, ea, pa] = await Promise.all([
        api.get('/drivers/payout-status'),
        api.get('/drivers/earnings'),
        api.get('/drivers/payouts'),
      ]);
      setStatus(st.data);
      setStats({ totalEarnings: parseFloat(ea.data.totalEarnings || 0), thisMonth: parseFloat(ea.data.thisMonth || 0), totalDeliveries: ea.data.totalDeliveries || 0 });
      setPayouts(pa.data.payouts || []);
    } catch (err) {
      console.error('Earnings load:', err.message);
    }
  };

  useFocusEffect(useCallback(() => { setLoading(true); load().finally(() => setLoading(false)); }, []));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (loading) return <SafeAreaView style={[s.safe, { justifyContent:'center', alignItems:'center' }]}><ActivityIndicator color={C.forest} size="large" /></SafeAreaView>;

  const pending = parseFloat(status?.pendingEarnings || 0);
  const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.forest} />}>
        <View style={s.headerWrap}>
          <Text style={s.h1}>Earnings</Text>
        </View>

        {/* Pending card — call to action */}
        <View style={s.pendingCard}>
          <Text style={s.pendingLabel}>READY TO CASH OUT</Text>
          <Text style={s.pendingAmt}>{Math.round(pending).toLocaleString()} <Text style={s.pendingCur}>XOF</Text></Text>
          {pending > 0 ? (
            <>
              <Text style={s.pendingHint}>{status?.payoutPhone ? `To ${status.payoutPhone}` : 'Add a payout number to cash out'}</Text>
              <TouchableOpacity style={s.cashoutBtn} onPress={() => navigation.navigate('EndShift')}>
                <Text style={s.cashoutText}>End shift & cash out</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={s.pendingHint}>Complete a delivery to start earning. Cash out anytime by ending your shift.</Text>
          )}
        </View>

        {/* PIN status row */}
        <TouchableOpacity style={s.row} onPress={() => navigation.navigate('PayoutPinSetup')}>
          <Ionicons name={status?.pinSet ? 'lock-closed' : 'lock-open-outline'} size={18} color={status?.pinSet ? C.success : C.amber} />
          <Text style={s.rowText}>{status?.pinSet ? 'Payout PIN set · tap to change' : 'Set up your payout PIN'}</Text>
          <Ionicons name="chevron-forward" size={18} color={C.subtle} />
        </TouchableOpacity>

        {/* Lifetime stats */}
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statLabel}>THIS MONTH</Text>
            <Text style={s.statVal}>{Math.round(stats.thisMonth).toLocaleString()}</Text>
            <Text style={s.statCur}>XOF paid out</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statLabel}>ALL TIME</Text>
            <Text style={s.statVal}>{Math.round(stats.totalEarnings).toLocaleString()}</Text>
            <Text style={s.statCur}>XOF earned</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statLabel}>JOBS</Text>
            <Text style={s.statVal}>{stats.totalDeliveries}</Text>
            <Text style={s.statCur}>completed</Text>
          </View>
        </View>

        {/* History */}
        <Text style={s.sectionTitle}>Payout history</Text>
        {payouts.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>No payouts yet</Text>
            <Text style={s.emptyText}>Your end-of-shift cash-outs will appear here.</Text>
          </View>
        ) : (
          payouts.map(p => {
            const meta = STATUS_META[p.status] || { color: C.muted, bg: C.cream, label: p.status };
            return (
              <View key={p.id} style={s.payoutItem}>
                <View style={{ flex: 1 }}>
                  <Text style={s.payoutAmt}>{Math.round(parseFloat(p.amount)).toLocaleString()} <Text style={{ fontSize:11, color:C.muted, fontWeight:'500' }}>XOF</Text></Text>
                  <Text style={s.payoutMeta}>{fmtDate(p.createdAt)} · {p.trigger === 'NIGHTLY_AUTO' ? 'Auto' : p.trigger === 'END_SHIFT' ? 'End of shift' : 'Manual'}</Text>
                  {p.providerRef ? <Text style={s.payoutRef}>Ref: {p.providerRef}</Text> : null}
                </View>
                <View style={[s.statusChip, { backgroundColor: meta.bg }]}>
                  <Text style={[s.statusText, { color: meta.color }]}>{meta.label}</Text>
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream },
  headerWrap: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8 },
  h1: { fontSize: 24, fontWeight: '500', color: C.ink },
  pendingCard: { margin: 20, marginTop: 10, backgroundColor: C.forest, borderRadius: 12, padding: 22, alignItems: 'center' },
  pendingLabel: { fontSize: 11, color: '#C4D4C8', letterSpacing: 1.5, fontWeight: '700' },
  pendingAmt: { fontSize: 44, fontWeight: '300', color: C.paper, marginTop: 6, letterSpacing: -1 },
  pendingCur: { fontSize: 16, color: '#C4D4C8', fontWeight: '500' },
  pendingHint: { fontSize: 12, color: '#D4DFD7', marginTop: 6, textAlign: 'center' },
  cashoutBtn: { backgroundColor: C.paper, borderRadius: 6, paddingHorizontal: 22, paddingVertical: 11, marginTop: 18 },
  cashoutText: { color: C.forest, fontSize: 14, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.paper, marginHorizontal: 20, paddingHorizontal: 16, paddingVertical: 13, borderRadius: 8, borderWidth: 1, borderColor: C.border, gap: 10 },
  rowText: { flex: 1, fontSize: 13, color: C.ink, fontWeight: '500' },
  statsRow: { flexDirection: 'row', marginHorizontal: 20, marginTop: 14, gap: 8 },
  statBox: { flex: 1, backgroundColor: C.paper, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 12 },
  statLabel: { fontSize: 9, color: C.muted, letterSpacing: 1, fontWeight: '700' },
  statVal: { fontSize: 18, fontWeight: '500', color: C.ink, marginTop: 6 },
  statCur: { fontSize: 10, color: C.subtle, marginTop: 2 },
  sectionTitle: { fontSize: 13, color: C.muted, fontWeight: '700', letterSpacing: 1, paddingHorizontal: 22, marginTop: 24, marginBottom: 8 },
  payoutItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.paper, marginHorizontal: 20, marginBottom: 8, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: C.border },
  payoutAmt: { fontSize: 17, fontWeight: '500', color: C.ink },
  payoutMeta: { fontSize: 11, color: C.muted, marginTop: 3 },
  payoutRef: { fontSize: 10, color: C.subtle, marginTop: 2, fontFamily: 'Menlo' },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  empty: { backgroundColor: C.paper, marginHorizontal: 20, padding: 22, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  emptyTitle: { fontSize: 14, fontWeight: '500', color: C.ink },
  emptyText: { fontSize: 12, color: C.muted, marginTop: 4, textAlign: 'center' },
});
