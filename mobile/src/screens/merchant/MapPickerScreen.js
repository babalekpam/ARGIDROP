import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView from '../../components/MapView';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9' };

const LOME = { latitude: 6.1319, longitude: 1.2228 };

// route.params:
//   mode: 'pickup' | 'dropoff'
//   initial: { lat, lng, address } | null
//   onPick: ({ lat, lng, address }) => void   (passed via navigation callback param)
//
// We use the navigation pattern: parent passes a callback ref via params, we
// call it with the picked location and goBack. (React Navigation supports
// passing functions through params; the warning is benign for transient screens.)
export default function MapPickerScreen({ route, navigation }) {
  const { mode = 'pickup', initial = null, onPick } = route.params || {};
  const [center, setCenter] = useState(
    initial?.lat && initial?.lng ? { latitude: initial.lat, longitude: initial.lng } : LOME
  );
  const [picked, setPicked] = useState(
    initial?.lat && initial?.lng ? { lat: initial.lat, lng: initial.lng } : null
  );
  const [address, setAddress] = useState(initial?.address || '');
  const [resolvingMe, setResolvingMe] = useState(false);
  const [reverseLoading, setReverseLoading] = useState(false);

  const useMyLocation = useCallback(async () => {
    try {
      setResolvingMe(true);
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permission needed', 'Allow location access to use your current position.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      setCenter({ latitude: lat, longitude: lng });
      setPicked({ lat, lng });
      reverseGeocode(lat, lng);
    } catch (e) {
      Alert.alert('Location error', 'Could not read your location.');
    } finally {
      setResolvingMe(false);
    }
  }, []);

  const reverseGeocode = useCallback(async (lat, lng) => {
    try {
      setReverseLoading(true);
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (results && results[0]) {
        const r = results[0];
        const parts = [r.name, r.street, r.district, r.city, r.region].filter(Boolean);
        const seen = new Set();
        const unique = parts.filter(p => { if (seen.has(p)) return false; seen.add(p); return true; });
        const a = unique.join(', ');
        if (a) setAddress(a);
      }
    } catch {}
    finally { setReverseLoading(false); }
  }, []);

  const handleMapPress = useCallback((lat, lng) => {
    setPicked({ lat, lng });
    setCenter({ latitude: lat, longitude: lng });
    reverseGeocode(lat, lng);
  }, [reverseGeocode]);

  const confirm = () => {
    if (!picked) return Alert.alert('Pick a location', 'Tap the map to drop a pin first.');
    if (!address.trim()) return Alert.alert('Address required', 'Enter or refine the street address.');
    if (typeof onPick === 'function') {
      onPick({ lat: picked.lat, lng: picked.lng, address: address.trim() });
    }
    navigation.goBack();
  };

  const markers = picked ? [{ lat: picked.lat, lng: picked.lng, type: mode }] : [];

  return (
    <View style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={26} color={C.forest} />
        </TouchableOpacity>
        <Text style={s.title}>{mode === 'pickup' ? 'Pickup location' : 'Drop-off location'}</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={s.tipBar}>
        <Ionicons name="information-circle-outline" size={14} color={C.muted} />
        <Text style={s.tipText}>Tap the map to drop a pin, or use your current location.</Text>
      </View>

      <View style={s.mapWrap}>
        <MapView
          center={center}
          zoom={14}
          markers={markers}
          showUserLocation={false}
          onMapPress={handleMapPress}
          style={{ flex: 1 }}
        />
        <TouchableOpacity style={s.locBtn} onPress={useMyLocation} disabled={resolvingMe}>
          {resolvingMe
            ? <ActivityIndicator color={C.forest} size="small" />
            : <Ionicons name="locate" size={20} color={C.forest} />}
        </TouchableOpacity>
      </View>

      <View style={s.bottomCard}>
        <Text style={s.label}>Address {reverseLoading && <Text style={s.loadingHint}>· resolving…</Text>}</Text>
        <TextInput
          value={address}
          onChangeText={setAddress}
          placeholder="Street, neighborhood, landmark"
          placeholderTextColor={C.subtle}
          style={s.input}
          multiline
        />
        <TouchableOpacity
          style={[s.btn, (!picked || !address.trim()) && { opacity: 0.5 }]}
          onPress={confirm}
          disabled={!picked || !address.trim()}
        >
          <Text style={s.btnText}>Use this location</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 52, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.paper },
  title: { fontSize: 16, fontWeight: '600', color: C.ink },
  tipBar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: C.paper, borderBottomWidth: 1, borderBottomColor: C.border },
  tipText: { fontSize: 12, color: C.muted, flex: 1 },
  mapWrap: { flex: 1, position: 'relative' },
  locBtn: { position: 'absolute', right: 14, bottom: 14, width: 44, height: 44, borderRadius: 22, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 4, elevation: 3 },
  bottomCard: { backgroundColor: C.paper, borderTopWidth: 1, borderTopColor: C.border, padding: 16, paddingBottom: 28 },
  label: { fontSize: 11, color: C.muted, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  loadingHint: { fontSize: 11, color: C.bronze, fontWeight: '500', textTransform: 'none', letterSpacing: 0 },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 12, fontSize: 14, color: C.ink, backgroundColor: C.cream, minHeight: 56 },
  btn: { backgroundColor: C.forest, borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 12 },
  btnText: { color: C.paper, fontWeight: '600', fontSize: 14 },
});
