import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../utils/api';
import { useSocket } from '../../context/SocketContext';
import MapView from '../../components/MapView';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', amber:'#C28B2C', red:'#B23A48' };

const STATUS_LABELS = {
  POSTED: 'Looking for driver',
  MATCHED: 'Driver heading to pickup',
  IN_TRANSIT: 'On the way to drop-off',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export default function LiveTrackScreen({ route, navigation }) {
  const { jobId } = route.params;
  const { getSocket, connect } = useSocket();
  const [job, setJob] = useState(null);
  const [driver, setDriver] = useState(null);
  const [driverPos, setDriverPos] = useState(null); // { lat, lng }
  const [loading, setLoading] = useState(true);
  const pollRef = useRef(null);

  const fetchJob = useCallback(async () => {
    try {
      const res = await api.get(`/jobs/${jobId}`);
      const j = res.data?.job || res.data;
      const d = res.data?.driver || null;
      setJob(j);
      setDriver(d);
      if (d?.currentLat && d?.currentLng) {
        setDriverPos({ lat: parseFloat(d.currentLat), lng: parseFloat(d.currentLng) });
      }
      if (j?.status === 'DELIVERED' || j?.status === 'COMPLETED') {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
      }
    } catch {}
    finally { setLoading(false); }
  }, [jobId]);

  useEffect(() => {
    fetchJob();
    pollRef.current = setInterval(fetchJob, 6000);
    let mounted = true;
    let activeSock = null;
    (async () => {
      const sock = getSocket() || await connect();
      if (!sock || !mounted) return;
      activeSock = sock;
      // join:job is gated by isJobParticipant on the backend, so this only
      // succeeds for the owning business / assigned driver / admin.
      sock.emit('join:job', jobId);
      sock.on('driver:location_update', (payload) => {
        if (payload?.lat && payload?.lng) setDriverPos({ lat: payload.lat, lng: payload.lng });
      });
      sock.on('job:status_change', (payload) => { if (payload?.jobId === jobId) fetchJob(); });
      sock.on('job:picked_up', (payload) => { if (payload?.jobId === jobId) fetchJob(); });
      sock.on('job:delivered', (payload) => { if (payload?.jobId === jobId) fetchJob(); });
    })();
    return () => {
      mounted = false;
      if (pollRef.current) clearInterval(pollRef.current);
      const sock = activeSock || getSocket();
      sock?.off('driver:location_update');
      sock?.off('job:status_change');
      sock?.off('job:picked_up');
      sock?.off('job:delivered');
      sock?.emit('leave:job', jobId);
    };
  }, [jobId, fetchJob, connect, getSocket]);

  const callDriver = async () => {
    const phone = driver?.phone;
    if (!phone) return Alert.alert('No phone', 'Driver phone number is not available.');
    Linking.openURL(`tel:${phone}`).catch(() => Alert.alert('Could not call'));
  };

  if (loading && !job) {
    return <View style={s.loadCenter}><ActivityIndicator color={C.forest} /></View>;
  }
  if (!job) {
    return (
      <View style={s.loadCenter}>
        <Text style={{ color: C.muted }}>Could not load this delivery.</Text>
      </View>
    );
  }

  const markers = [];
  if (job.pickupLat && job.pickupLng) {
    markers.push({ lat: parseFloat(job.pickupLat), lng: parseFloat(job.pickupLng), type: 'pickup' });
  }
  if (job.dropoffLat && job.dropoffLng) {
    markers.push({ lat: parseFloat(job.dropoffLat), lng: parseFloat(job.dropoffLng), type: 'dropoff' });
  }
  if (driverPos) {
    markers.push({ lat: driverPos.lat, lng: driverPos.lng, type: 'job', label: '🚚' });
  }

  const center = driverPos
    ? { latitude: driverPos.lat, longitude: driverPos.lng }
    : (job.pickupLat && job.pickupLng
        ? { latitude: parseFloat(job.pickupLat), longitude: parseFloat(job.pickupLng) }
        : null);

  const isFinal = ['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(job.status);

  return (
    <View style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.navigate('MerchantTabs')}>
          <Ionicons name="chevron-back" size={26} color={C.forest} />
        </TouchableOpacity>
        <Text style={s.title}>Live track</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={s.statusBar}>
        <View style={s.statusDot} />
        <Text style={s.statusText}>{STATUS_LABELS[job.status] || job.status}</Text>
        <Text style={s.refText}>#{job.trackingToken}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <MapView
          center={center}
          zoom={13}
          markers={markers}
          style={{ flex: 1 }}
        />
      </View>

      <View style={s.bottomCard}>
        {driver ? (
          <View style={s.driverRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.driverLabel}>Driver</Text>
              <Text style={s.driverName}>
                {driver.vehicleMake || ''} {driver.vehicleModel || 'Driver'}{driver.vehicleColor ? ` · ${driver.vehicleColor}` : ''}
              </Text>
              {driver.vehiclePlate && <Text style={s.driverPlate}>{driver.vehiclePlate}</Text>}
            </View>
            <TouchableOpacity
              style={s.chatBtn}
              onPress={() => navigation.navigate('Chat', { jobId, peerName: driver.firstName || 'Driver' })}
            >
              <Ionicons name="chatbubble-ellipses" size={18} color={C.forest} />
            </TouchableOpacity>
            {driver.phone && (
              <TouchableOpacity style={s.callBtn} onPress={callDriver}>
                <Ionicons name="call" size={18} color={C.paper} />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <Text style={{ color: C.muted, fontSize: 13 }}>Waiting for a driver to accept this delivery…</Text>
        )}

        {job.status === 'MATCHED' && (
          <TouchableOpacity style={s.btn} onPress={() => navigation.navigate('PickupQR', { jobId })}>
            <Text style={s.btnText}>Show pickup QR</Text>
          </TouchableOpacity>
        )}
        {(job.status === 'DELIVERED' || job.status === 'COMPLETED') && (
          <TouchableOpacity style={s.btn} onPress={() => navigation.navigate('RateDriver', { jobId })}>
            <Text style={s.btnText}>Rate the driver</Text>
          </TouchableOpacity>
        )}
        {isFinal && (
          <TouchableOpacity style={s.btnGhost} onPress={() => navigation.navigate('MerchantTabs')}>
            <Text style={s.btnGhostText}>Back to home</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream },
  loadCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 52, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.paper },
  title: { fontSize: 17, fontWeight: '600', color: C.ink },

  statusBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: C.paper, borderBottomWidth: 1, borderBottomColor: C.border },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.forest },
  statusText: { fontSize: 13, color: C.ink, fontWeight: '500', flex: 1 },
  refText: { fontSize: 11, color: C.subtle, fontFamily: 'monospace', letterSpacing: 1 },

  bottomCard: { backgroundColor: C.paper, borderTopWidth: 1, borderTopColor: C.border, padding: 16, paddingBottom: 28 },
  driverRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  driverLabel: { fontSize: 11, color: C.muted, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  driverName: { fontSize: 15, color: C.ink, fontWeight: '500', marginTop: 2 },
  driverPlate: { fontFamily: 'monospace', fontSize: 12, color: C.muted, marginTop: 2, letterSpacing: 1 },
  callBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.forest, alignItems: 'center', justifyContent: 'center' },
  chatBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.cream, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', marginRight: 8 },

  btn: { backgroundColor: C.forest, borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 4 },
  btnText: { color: C.paper, fontWeight: '600', fontSize: 14 },
  btnGhost: { padding: 12, alignItems: 'center', marginTop: 4 },
  btnGhostText: { color: C.muted, fontSize: 13, fontWeight: '500' },
});
