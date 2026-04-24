import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../../utils/api';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9' };

export default function ProofOfDeliveryScreen({ route, navigation }) {
  const { jobId } = route.params;
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Camera access needed', 'Please allow camera access in settings');
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: true, aspect: [4, 3] });
    if (!result.canceled) setPhoto(result.assets[0]);
  };

  const submit = async () => {
    if (!photo) return Alert.alert('Photo required', 'Take a photo of the delivered package first');
    setLoading(true);
    try {
      const form = new FormData();
      form.append('photo', { uri: photo.uri, name: 'proof.jpg', type: 'image/jpeg' });
      form.append('jobId', jobId);
      await api.post(`/jobs/${jobId}/proof`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      navigation.navigate('RateDelivery', { jobId });
    } catch (err) {
      Alert.alert('Failed', err.response?.data?.message || 'Please try again');
    } finally { setLoading(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>Proof of delivery</Text>
        <Text style={s.subtitle}>Take a photo showing the package was delivered</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <TouchableOpacity style={[s.photoArea, photo && { padding: 0, overflow: 'hidden' }]} onPress={takePhoto}>
          {photo ? (
            <Image source={{ uri: photo.uri }} style={{ width: '100%', aspectRatio: 4 / 3 }} resizeMode="cover" />
          ) : (
            <View style={{ alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 48 }}>📷</Text>
              <Text style={{ fontSize: 15, fontWeight: '500', color: C.ink }}>Tap to take photo</Text>
              <Text style={{ fontSize: 13, color: C.muted, textAlign: 'center' }}>Show the package at the dropoff location</Text>
            </View>
          )}
        </TouchableOpacity>

        {photo && (
          <TouchableOpacity style={s.retakeBtn} onPress={takePhoto}>
            <Text style={{ color: C.forest, fontSize: 14, fontWeight: '500' }}>Retake photo</Text>
          </TouchableOpacity>
        )}

        <View style={s.tipsCard}>
          <Text style={s.tipsTitle}>Good photo tips</Text>
          {['Show the package clearly','Include a recognizable landmark','Capture the door number if visible','Good lighting, no blur'].map(tip => (
            <Text key={tip} style={s.tip}>· {tip}</Text>
          ))}
        </View>

        <TouchableOpacity style={[s.submitBtn, (!photo || loading) && { opacity: 0.5 }]} onPress={submit} disabled={!photo || loading}>
          {loading ? <ActivityIndicator color={C.paper} /> : <Text style={s.submitText}>Submit proof & complete delivery</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: { backgroundColor: C.paper, paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  back: { color: C.forest, fontSize: 14, fontWeight: '500', marginBottom: 10 },
  title: { fontSize: 24, fontWeight: '500', color: C.ink, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: C.muted, marginTop: 4 },
  photoArea: { backgroundColor: C.paper, borderWidth: 2, borderColor: C.border, borderStyle: 'dashed', borderRadius: 10, padding: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 10, minHeight: 220 },
  retakeBtn: { alignItems: 'center', padding: 12, marginBottom: 8 },
  tipsCard: { backgroundColor: C.paper, borderRadius: 8, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 20 },
  tipsTitle: { fontSize: 13, fontWeight: '600', color: C.ink, marginBottom: 8 },
  tip: { fontSize: 13, color: C.muted, marginBottom: 5 },
  submitBtn: { backgroundColor: C.forest, borderRadius: 6, padding: 15, alignItems: 'center' },
  submitText: { color: C.paper, fontWeight: '600', fontSize: 15 },
});
