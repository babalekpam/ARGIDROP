// QR Scanner — used for both Pickup scan and Delivery scan
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import * as Location from 'expo-location';
import api from '../../utils/api';

const C = { cream: '#F7F3EB', paper: '#FDFBF6', forest: '#1B4332', bronze: '#8B6F47', ink: '#1A1A1A', muted: '#6B6560' };

export default function ScanQRScreen({ route, navigation }) {
  const { jobId, scanType } = route.params; // scanType: 'PICKUP' | 'DELIVERY'
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ data }) => {
    if (scanned || processing) return;
    setScanned(true);
    setProcessing(true);
    try {
      // Parse QR payload
      let payload;
      try { payload = JSON.parse(data); } catch { throw new Error('Invalid QR code format'); }
      if (payload.type !== scanType) throw new Error(`Wrong QR type. Expected ${scanType}, got ${payload.type}`);
      if (payload.jobId !== jobId) throw new Error('This QR is for a different delivery');

      // Get GPS
      let coords = {};
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation });
        coords = { lat: loc.coords.latitude, lng: loc.coords.longitude, accuracy: loc.coords.accuracy };
      } catch (e) { console.warn('GPS unavailable:', e.message); }

      // Submit scan
      const endpoint = scanType === 'PICKUP' ? '/scans/pickup' : '/scans/delivery';
      const res = await api.post(endpoint, { jobId, code: payload.code, ...coords });

      if (scanType === 'PICKUP') {
        Alert.alert('✓ Pickup confirmed', 'Package picked up. Navigate to dropoff.', [
          { text: 'Continue', onPress: () => navigation.replace('ActiveDelivery', { jobId }) }
        ]);
      } else {
        // Delivery confirmed → ask for proof photo (optional but encouraged), then rate
        Alert.alert('✓ Delivery confirmed', 'Payment released. Add a proof photo so the customer has a record.', [
          { text: 'Skip', style: 'cancel', onPress: () => navigation.replace('RateDelivery', { jobId }) },
          { text: 'Add photo', onPress: () => navigation.replace('ProofOfDelivery', { jobId }) }
        ]);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Scan failed';
      Alert.alert('Scan failed', msg, [
        { text: 'Try again', onPress: () => { setScanned(false); setProcessing(false); } },
        { text: 'Cancel', onPress: () => navigation.goBack(), style: 'cancel' }
      ]);
    } finally {
      setProcessing(false);
    }
  };

  if (hasPermission === null) return <View style={s.center}><ActivityIndicator color={C.forest} /></View>;
  if (hasPermission === false) return (
    <View style={s.center}>
      <Text style={s.title}>Camera access needed</Text>
      <Text style={s.subtitle}>Please allow camera access to scan QR codes</Text>
    </View>
  );

  return (
    <View style={s.container}>
      <BarCodeScanner onBarCodeScanned={scanned ? undefined : handleBarCodeScanned} style={StyleSheet.absoluteFillObject} />

      <View style={s.overlay}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.closeBtn}>
            <Text style={{ color: '#fff', fontSize: 20 }}>✕</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>{scanType === 'PICKUP' ? 'Scan pickup QR' : 'Scan delivery QR'}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={s.frameWrap}>
          <View style={s.frame}>
            <View style={[s.corner, { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 }]} />
            <View style={[s.corner, { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 }]} />
            <View style={[s.corner, { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 }]} />
            <View style={[s.corner, { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 }]} />
          </View>
          <Text style={s.hint}>
            {scanType === 'PICKUP' ? 'Ask the sender to show the Pickup QR' : "Ask the recipient to show the QR on their phone"}
          </Text>
        </View>

        {processing && (
          <View style={s.processing}>
            <ActivityIndicator color={C.forest} />
            <Text style={{ color: '#fff', marginTop: 12, fontSize: 14 }}>Verifying scan…</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 18, fontWeight: '600', color: C.ink, marginBottom: 8 },
  subtitle: { fontSize: 14, color: C.muted, textAlign: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, justifyContent: 'space-between' },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  frameWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: { width: 260, height: 260, position: 'relative' },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: C.forest },
  hint: { color: '#fff', fontSize: 14, marginTop: 32, textAlign: 'center', paddingHorizontal: 40, opacity: 0.9 },
  processing: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center' },
});
