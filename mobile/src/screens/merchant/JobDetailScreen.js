import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../utils/api';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', amber:'#C28B2C', red:'#B23A48' };

const STATUS_LABELS = {
  AWAITING_PAYMENT: 'Awaiting payment',
  POSTED: 'Looking for driver',
  MATCHED: 'Driver assigned',
  IN_TRANSIT: 'On the way',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
};
const STATUS_COLORS = {
  AWAITING_PAYMENT: C.amber, POSTED: C.bronze, MATCHED: C.forest, IN_TRANSIT: C.forest,
  DELIVERED: C.forest, COMPLETED: C.muted, CANCELLED: C.red, EXPIRED: C.red,
};

export default function MerchantJobDetailScreen({ route, navigation }) {
  const { jobId } = route.params;
  const [job, setJob] = useState(null);
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await api.get(`/jobs/${jobId}`);
      setJob(r.data?.job || r.data);
      setDriver(r.data?.driver || null);
    } catch {}
    finally { setLoading(false); }
  }, [jobId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading && !job) return <View style={s.center}><ActivityIndicator color={C.forest} /></View>;
  if (!job) return <View style={s.center}><Text style={{ color: C.muted }}>Job not found</Text></View>;

  const statusColor = STATUS_COLORS[job.status] || C.muted;
  const statusLabel = STATUS_LABELS[job.status] || job.status;

  const isLive = ['MATCHED', 'IN_TRANSIT'].includes(job.status);
  const isWaiting = job.status === 'POSTED';
  const isDone = ['DELIVERED', 'COMPLETED'].includes(job.status);

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color={C.forest} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Delivery</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={s.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <View>
              <Text style={s.kicker}>{job.urgency}</Text>
              <Text style={s.price}>{Math.round(parseFloat(job.priceOffered)).toLocaleString()} <Text style={s.currency}>{job.currency}</Text></Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 4 }}>STATUS</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: statusColor }}>{statusLabel}</Text>
            </View>
          </View>
          <Text style={s.ref}>#{job.trackingToken}</Text>
        </View>

        <View style={s.card}>
          <Text style={s.sectionLabel}>Route</Text>
          {[
            ['Pickup', job.pickupAddress, job.pickupContactName, job.pickupContactPhone, C.bronze],
            ['Drop-off', job.dropoffAddress, job.dropoffContactName, job.dropoffContactPhone, C.forest],
          ].map(([l, a, name, phone, color], idx) => (
            <View key={l} style={[s.routeRow, idx > 0 && { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12, marginTop: 12 }]}>
              <View style={[s.routeBar, { backgroundColor: color }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.routeLabel}>{l}</Text>
                <Text style={s.routeAddr}>{a}</Text>
                {(name || phone) && <Text style={s.routeContact}>{name || ''}{name && phone ? ' · ' : ''}{phone || ''}</Text>}
              </View>
            </View>
          ))}
        </View>

        <View style={s.card}>
          <Text style={s.sectionLabel}>Package</Text>
          {[
            ['Type', job.packageType],
            ['Weight', job.weightKg ? `${job.weightKg} kg` : '—'],
            ['Fragile', job.isFragile ? 'Yes' : 'No'],
          ].map(([k, v]) => (
            <View key={k} style={s.row}>
              <Text style={s.rowKey}>{k}</Text>
              <Text style={s.rowVal}>{v}</Text>
            </View>
          ))}
          {job.packageDescription ? <Text style={s.descText}>{job.packageDescription}</Text> : null}
        </View>

        {(job.pickupNotes || job.dropoffNotes) ? (
          <View style={s.card}>
            <Text style={s.sectionLabel}>Notes</Text>
            {job.pickupNotes ? <View><Text style={s.rowKey}>Pickup</Text><Text style={s.noteText}>{job.pickupNotes}</Text></View> : null}
            {job.dropoffNotes ? <View style={{ marginTop: job.pickupNotes ? 10 : 0 }}><Text style={s.rowKey}>Drop-off</Text><Text style={s.noteText}>{job.dropoffNotes}</Text></View> : null}
          </View>
        ) : null}

        {driver && (job.status === 'MATCHED' || job.status === 'IN_TRANSIT' || isDone) ? (
          <View style={s.card}>
            <Text style={s.sectionLabel}>Driver</Text>
            <Text style={s.driverLine}>
              {driver.vehicleMake || ''} {driver.vehicleModel || 'Driver'}{driver.vehicleColor ? ` · ${driver.vehicleColor}` : ''}
            </Text>
            {driver.vehiclePlate ? <Text style={s.driverPlate}>{driver.vehiclePlate}</Text> : null}
            {driver.rating ? <Text style={s.driverRating}>★ {parseFloat(driver.rating).toFixed(1)}</Text> : null}
          </View>
        ) : null}

        {(isWaiting || isLive) ? (
          <TouchableOpacity style={s.btn} onPress={() => navigation.navigate('LiveTrack', { jobId: job.id })}>
            <Text style={s.btnText}>Live track</Text>
          </TouchableOpacity>
        ) : null}
        {job.status === 'MATCHED' ? (
          <TouchableOpacity style={s.btnGhost} onPress={() => navigation.navigate('PickupQR', { jobId: job.id })}>
            <Text style={s.btnGhostText}>Show pickup QR</Text>
          </TouchableOpacity>
        ) : null}
        {isDone ? (
          <TouchableOpacity style={s.btn} onPress={() => navigation.navigate('RateDriver', { jobId: job.id })}>
            <Text style={s.btnText}>Rate the driver</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 52, paddingBottom: 12, backgroundColor: C.paper, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 16, fontWeight: '600', color: C.ink },
  card: { backgroundColor: C.paper, borderRadius: 8, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 12 },
  kicker: { fontSize: 10, color: C.bronze, letterSpacing: 1.5, fontWeight: '600', textTransform: 'uppercase', marginBottom: 6 },
  price: { fontSize: 28, fontWeight: '500', color: C.forest, letterSpacing: -0.5 },
  currency: { fontSize: 13, color: C.muted, fontWeight: '400' },
  ref: { fontFamily: 'monospace', fontSize: 12, color: C.subtle, marginTop: 8, letterSpacing: 0.5 },
  sectionLabel: { fontSize: 10, color: C.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  routeRow: { flexDirection: 'row', gap: 12 },
  routeBar: { width: 4, borderRadius: 2 },
  routeLabel: { fontSize: 10, color: C.muted, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 },
  routeAddr: { fontSize: 14, color: C.ink, lineHeight: 18 },
  routeContact: { fontSize: 12, color: C.muted, marginTop: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border },
  rowKey: { fontSize: 12, color: C.muted, fontWeight: '500' },
  rowVal: { fontSize: 13, color: C.ink, fontWeight: '500' },
  descText: { fontSize: 13, color: C.muted, marginTop: 8, lineHeight: 18 },
  noteText: { fontSize: 13, color: C.ink, marginTop: 3 },
  driverLine: { fontSize: 14, color: C.ink, fontWeight: '500' },
  driverPlate: { fontFamily: 'monospace', fontSize: 12, color: C.muted, marginTop: 4, letterSpacing: 1 },
  driverRating: { fontSize: 12, color: C.amber, marginTop: 4, fontWeight: '600' },
  btn: { backgroundColor: C.forest, borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 8 },
  btnText: { color: C.paper, fontWeight: '600', fontSize: 14 },
  btnGhost: { padding: 12, alignItems: 'center', marginTop: 4, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.paper },
  btnGhostText: { color: C.forest, fontWeight: '500', fontSize: 13 },
});
