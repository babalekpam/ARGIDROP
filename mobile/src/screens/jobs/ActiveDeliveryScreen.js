import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useSocket } from '../../context/SocketContext';
import api from '../../utils/api';

const C = { cream: '#F7F3EB', paper: '#FDFBF6', forest: '#1B4332', bronze: '#8B6F47', ink: '#1A1A1A', muted: '#6B6560', border: '#E4DCC9' };

export default function ActiveDeliveryScreen({ route, navigation }) {
  const { jobId } = route.params;
  const { getSocket } = useSocket();
  const [job, setJob] = useState(null);
  const [location, setLocation] = useState(null);
  const sub = useRef(null);

  const loadJob = () => api.get(`/jobs/${jobId}`).then(r => setJob(r.data.job || r.data));

  useEffect(() => {
    loadJob();
    (async () => {
      sub.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 8000, distanceInterval: 30 },
        async loc => {
          setLocation(loc.coords);
          await api.patch('/drivers/location', { lat: loc.coords.latitude, lng: loc.coords.longitude, jobId }).catch(()=>{});
          getSocket()?.emit('driver:location', { lat: loc.coords.latitude, lng: loc.coords.longitude, jobId });
        }
      );
    })();
    return () => sub.current?.remove();
  }, []);

  const status = job?.status;

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <MapView
        style={{ flex: 1 }}
        provider={PROVIDER_GOOGLE}
        showsUserLocation
        initialRegion={location ? { latitude: location.latitude, longitude: location.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 } : { latitude: 6.13, longitude: 1.21, latitudeDelta: 0.08, longitudeDelta: 0.08 }}>
        {job?.pickupLat && <Marker coordinate={{ latitude: parseFloat(job.pickupLat), longitude: parseFloat(job.pickupLng) }} title="Pickup" pinColor={C.bronze} />}
        {job?.dropoffLat && <Marker coordinate={{ latitude: parseFloat(job.dropoffLat), longitude: parseFloat(job.dropoffLng) }} title="Dropoff" pinColor={C.forest} />}
      </MapView>

      <View style={s.panel}>
        <Text style={s.label}>ACTIVE DELIVERY · {status === 'MATCHED' ? 'Head to pickup' : 'Head to dropoff'}</Text>
        <Text style={s.title}>{status === 'MATCHED' ? job?.pickupAddress : job?.dropoffAddress}</Text>
        <Text style={s.price}>{job?.priceOffered} {job?.currency}</Text>

        {status === 'MATCHED' && (
          <TouchableOpacity style={s.btnPrimary} onPress={() => navigation.navigate('ScanQR', { jobId, scanType: 'PICKUP' })}>
            <Text style={s.btnText}>Scan pickup QR</Text>
          </TouchableOpacity>
        )}
        {status === 'IN_TRANSIT' && (
          <TouchableOpacity style={s.btnPrimary} onPress={() => navigation.navigate('ScanQR', { jobId, scanType: 'DELIVERY' })}>
            <Text style={s.btnText}>Scan delivery QR</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  panel: { backgroundColor: C.paper, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, borderTopWidth: 1, borderTopColor: C.border },
  label: { fontSize: 10, color: C.bronze, letterSpacing: 1.2, fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '600', color: C.ink, marginBottom: 12 },
  price: { fontSize: 24, fontWeight: '500', color: C.forest, marginBottom: 16, fontFamily: 'System' },
  btnPrimary: { backgroundColor: C.forest, borderRadius: 6, padding: 14, alignItems: 'center' },
  btnText: { color: C.paper, fontWeight: '600', fontSize: 14 },
});
