import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../utils/api';
import { useSocket } from '../../context/SocketContext';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', amber:'#C28B2C' };

// route.params: { jobId }
export default function PickupQRScreen({ route, navigation }) {
  const { jobId } = route.params;
  const { getSocket, connect } = useSocket();
  const [job, setJob] = useState(null);
  const [driver, setDriver] = useState(null);
  const [qrImage, setQrImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef(null);

  const refreshQr = useCallback(async () => {
    try {
      const detailRes = await api.get(`/jobs/${jobId}`);
      const j = detailRes.data?.job || detailRes.data;
      const d = detailRes.data?.driver || null;
      setJob(j);
      setDriver(d);

      if (j?.status === 'IN_TRANSIT') {
        // Driver has already picked up — head to live track
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        navigation.replace('LiveTrack', { jobId });
        return;
      }
      if (j?.status === 'DELIVERED' || j?.status === 'COMPLETED') {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        navigation.replace('RateDriver', { jobId, ratedUserId: null });
        return;
      }

      if (j?.status === 'MATCHED') {
        try {
          const qrRes = await api.get(`/scans/jobs/${jobId}/pickup-qr`);
          setQrImage(qrRes.data?.qrImage || null);
        } catch {}
      }
    } catch {}
    finally { setLoading(false); }
  }, [jobId, navigation]);

  useEffect(() => {
    refreshQr();
    pollRef.current = setInterval(refreshQr, 4000);
    // Socket signals — `job:matched`, `job:picked_up`, `job:delivered` are
    // emitted to the auto-joined business room. We also `join:job` so we get
    // `job:status_change` (which goes to the per-job room).
    let activeSock = null;
    (async () => {
      const sock = getSocket() || await connect();
      if (sock) {
        activeSock = sock;
        sock.emit('join:job', jobId);
        sock.on('job:matched', (payload) => { if (payload?.jobId === jobId) refreshQr(); });
        sock.on('job:status_change', (payload) => { if (payload?.jobId === jobId) refreshQr(); });
        sock.on('job:picked_up', (payload) => { if (payload?.jobId === jobId) refreshQr(); });
      }
    })();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      const sock = activeSock || getSocket();
      sock?.off('job:matched');
      sock?.off('job:status_change');
      sock?.off('job:picked_up');
      sock?.emit('leave:job', jobId);
    };
  }, [jobId, refreshQr, connect, getSocket]);

  return (
    <View style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.navigate('MerchantTabs')}>
          <Ionicons name="close" size={26} color={C.forest} />
        </TouchableOpacity>
        <Text style={s.title}>Pickup</Text>
        <TouchableOpacity onPress={() => navigation.navigate('LiveTrack', { jobId })}>
          <Ionicons name="map-outline" size={22} color={C.forest} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {loading && !job ? (
          <ActivityIndicator color={C.forest} style={{ marginTop: 60 }} />
        ) : !job ? (
          <Text style={{ color: C.muted, textAlign: 'center', marginTop: 60 }}>Could not load this delivery.</Text>
        ) : job.status === 'POSTED' ? (
          <View style={s.statusCard}>
            <View style={s.spinnerRow}><ActivityIndicator color={C.amber} /><Text style={s.statusText}>Looking for a driver…</Text></View>
            <Text style={s.statusSub}>We're broadcasting this delivery to drivers near {job.pickupAddress?.split(',')[0] || 'your pickup location'}.</Text>
          </View>
        ) : job.status === 'AWAITING_PAYMENT' ? (
          <View style={s.statusCard}>
            <View style={s.spinnerRow}><ActivityIndicator color={C.amber} /><Text style={s.statusText}>Awaiting payment…</Text></View>
            <Text style={s.statusSub}>Once payment is confirmed your delivery goes live.</Text>
          </View>
        ) : job.status === 'MATCHED' ? (
          <>
            {driver && (
              <View style={s.driverCard}>
                <Text style={s.kicker}>Driver assigned</Text>
                <Text style={s.driverLine}>
                  {driver.vehicleMake || ''} {driver.vehicleModel || ''}{driver.vehicleColor ? ` · ${driver.vehicleColor}` : ''}
                </Text>
                {driver.vehiclePlate && <Text style={s.driverPlate}>{driver.vehiclePlate}</Text>}
                {driver.rating && <Text style={s.driverRating}>★ {parseFloat(driver.rating).toFixed(1)}</Text>}
              </View>
            )}
            <View style={s.qrCard}>
              <Text style={s.qrTitle}>Show this QR to your driver</Text>
              <Text style={s.qrSub}>The driver scans this code to confirm pickup.</Text>
              {qrImage ? (
                <Image source={{ uri: qrImage }} style={s.qrImage} resizeMode="contain" />
              ) : (
                <ActivityIndicator color={C.forest} style={{ marginVertical: 32 }} />
              )}
              <Text style={s.codeHint}>#{job.trackingToken}</Text>
            </View>
          </>
        ) : (
          <View style={s.statusCard}>
            <Text style={s.statusText}>Status: {job.status}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 52, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.paper },
  title: { fontSize: 17, fontWeight: '600', color: C.ink },

  statusCard: { backgroundColor: C.paper, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 24, alignItems: 'center', marginTop: 24 },
  spinnerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusText: { fontSize: 15, fontWeight: '600', color: C.ink },
  statusSub: { fontSize: 13, color: C.muted, marginTop: 12, textAlign: 'center', lineHeight: 18 },

  driverCard: { backgroundColor: C.paper, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 12 },
  kicker: { fontSize: 11, color: C.bronze, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  driverLine: { fontSize: 16, color: C.ink, fontWeight: '500' },
  driverPlate: { fontFamily: 'monospace', fontSize: 13, color: C.muted, marginTop: 4, letterSpacing: 1 },
  driverRating: { fontSize: 13, color: C.amber, marginTop: 4, fontWeight: '600' },

  qrCard: { backgroundColor: C.paper, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 20, alignItems: 'center' },
  qrTitle: { fontSize: 16, fontWeight: '600', color: C.ink },
  qrSub: { fontSize: 12, color: C.muted, marginTop: 4, textAlign: 'center' },
  qrImage: { width: 240, height: 240, marginTop: 16 },
  codeHint: { fontFamily: 'monospace', fontSize: 12, color: C.subtle, marginTop: 8, letterSpacing: 1 },
});
