// Merchant KYC — upload business verification docs + selfie of owner, then submit for review.
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const C = { cream: '#F7F3EB', paper: '#FDFBF6', forest: '#1B4332', bronze: '#8B6F47', ink: '#1A1A1A', muted: '#6B6560', subtle: '#9A9489', border: '#E4DCC9', success: '#2D5E3E', alert: '#9B2C2C' };

const DOCS = [
  { type: 'BUSINESS_LICENSE', label: 'Business license', hint: 'Trade register, RCCM, or equivalent', required: true },
  { type: 'GOVT_ID_FRONT', label: "Owner's ID (front)", hint: 'National ID, passport, or driver license', required: true },
  { type: 'PROOF_OF_ADDRESS', label: 'Proof of address', hint: 'Utility bill or lease (last 3 months) — optional', required: false },
  { type: 'SELFIE_WITH_ID', label: 'Selfie holding your ID', hint: 'Helps confirm the account belongs to you', required: true },
];

export default function MerchantKYCScreen({ navigation }) {
  const { refreshUser, logout, user } = useAuth();
  const [documents, setDocuments] = useState({});
  const [uploading, setUploading] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadDocs(); }, []);

  const loadDocs = async () => {
    try {
      const res = await api.get('/businesses/me/documents');
      const map = {};
      (res.data.documents || []).forEach(d => { map[d.docType] = d; });
      setDocuments(map);
    } catch (err) {
      // silent — empty state OK on first load
    } finally {
      setLoading(false);
    }
  };

  const pickAndUpload = async (docType) => {
    const isSelfie = docType === 'SELFIE_WITH_ID';
    const cam = await ImagePicker.requestCameraPermissionsAsync();
    if (cam.status !== 'granted') {
      const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (lib.status !== 'granted') return Alert.alert('Permission needed', 'Allow camera or photo access to upload documents.');
    }
    Alert.alert('Upload document', 'Choose source', [
      { text: isSelfie ? 'Take selfie' : 'Take photo', onPress: () => capture(docType, 'camera') },
      { text: 'Choose from library', onPress: () => capture(docType, 'library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const capture = async (docType, source) => {
    try {
      const opts = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85,
        aspect: [4, 3],
        cameraType: docType === 'OWNER_SELFIE' ? ImagePicker.CameraType.front : ImagePicker.CameraType.back,
      };
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync(opts)
        : await ImagePicker.launchImageLibraryAsync(opts);
      if (result.canceled) return;
      setUploading(docType);
      const asset = result.assets[0];
      const form = new FormData();
      form.append('file', { uri: asset.uri, name: `${docType}.jpg`, type: 'image/jpeg' });
      form.append('docType', docType);
      await api.post('/businesses/documents', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      await loadDocs();
    } catch (err) {
      Alert.alert('Upload failed', err.response?.data?.message || err.message || 'Please try again.');
    } finally {
      setUploading(null);
    }
  };

  const requiredDocs = DOCS.filter(d => d.required);
  const allRequired = requiredDocs.every(d => documents[d.type]);

  const submit = async () => {
    if (!allRequired) return Alert.alert('Almost there', 'Please upload all required documents first.');
    setSubmitting(true);
    try {
      await api.post('/businesses/submit-for-review');
      await refreshUser();
      Alert.alert(
        'Submitted',
        "Your documents are under review. We'll notify you as soon as your account is approved — usually within 24 hours.",
        [{ text: 'OK', onPress: () => navigation.replace('MerchantPending') }],
      );
    } catch (err) {
      Alert.alert('Submission failed', err.response?.data?.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={C.forest} /></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 56, paddingBottom: 140 }}>
        <Text style={s.kicker}>STEP 2 OF 2</Text>
        <Text style={s.title}>Verify your business</Text>
        <Text style={s.subtitle}>
          We need a few documents to confirm {user?.businessProfile?.companyName || 'your business'} is legitimate. Most merchants are approved within 24 hours.
        </Text>

        {DOCS.map(doc => {
          const d = documents[doc.type];
          const status = d?.status;
          return (
            <TouchableOpacity
              key={doc.type}
              style={[s.docCard, status === 'APPROVED' && s.docCardApproved, status === 'REJECTED' && s.docCardRejected]}
              onPress={() => pickAndUpload(doc.type)}
              disabled={uploading === doc.type}
              activeOpacity={0.85}
            >
              <View style={{ flex: 1 }}>
                <Text style={s.docLabel}>
                  {doc.label}{doc.required ? ' *' : ''}
                </Text>
                <Text style={s.docHint}>{doc.hint}</Text>
                {d?.rejectionReason ? <Text style={s.docRejection}>⚠ {d.rejectionReason}</Text> : null}
              </View>
              <View style={s.docAction}>
                {uploading === doc.type ? <ActivityIndicator color={C.forest} size="small" /> :
                  status === 'APPROVED' ? <Text style={s.statusApproved}>✓ Approved</Text> :
                    status === 'REJECTED' ? <Text style={s.statusRejected}>Re-upload</Text> :
                      status === 'PENDING' ? <Text style={s.statusPending}>✓ Uploaded</Text> :
                        <Text style={s.statusUpload}>Upload</Text>}
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={s.infoBox}>
          <Ionicons name="lock-closed-outline" size={14} color={C.muted} style={{ marginRight: 6 }} />
          <Text style={s.infoText}>
            Documents are encrypted and reviewed by our verification team. Your information is never shared with drivers or recipients.
          </Text>
        </View>

        <TouchableOpacity onPress={logout} style={{ alignItems: 'center', marginTop: 24, padding: 8 }}>
          <Text style={s.signOut}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.btnPrimary, (!allRequired || submitting) && { opacity: 0.5 }]}
          onPress={submit}
          disabled={!allRequired || submitting}
        >
          {submitting ? <ActivityIndicator color={C.paper} /> : <Text style={s.btnText}>Submit for review</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center' },
  kicker: { fontSize: 11, color: C.bronze, letterSpacing: 2, fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '500', color: C.ink, marginBottom: 6, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: C.muted, marginBottom: 28, lineHeight: 20 },
  docCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.paper, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 16, marginBottom: 10 },
  docCardApproved: { borderColor: C.success, backgroundColor: '#F0F5F1' },
  docCardRejected: { borderColor: C.alert, backgroundColor: '#FCEDE9' },
  docLabel: { fontSize: 15, fontWeight: '500', color: C.ink, marginBottom: 3 },
  docHint: { fontSize: 12, color: C.muted, lineHeight: 17 },
  docRejection: { fontSize: 12, color: C.alert, marginTop: 4, fontWeight: '500' },
  docAction: { minWidth: 80, alignItems: 'flex-end' },
  statusUpload: { color: C.forest, fontSize: 13, fontWeight: '600' },
  statusPending: { color: C.bronze, fontSize: 12, fontWeight: '500' },
  statusApproved: { color: C.success, fontSize: 12, fontWeight: '600' },
  statusRejected: { color: C.alert, fontSize: 13, fontWeight: '600' },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: C.paper, borderWidth: 1, borderColor: C.border, borderRadius: 6, padding: 14, marginTop: 12 },
  infoText: { flex: 1, fontSize: 12, color: C.muted, lineHeight: 18 },
  signOut: { color: C.bronze, fontSize: 13, fontWeight: '600' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: C.cream, borderTopWidth: 1, borderTopColor: C.border },
  btnPrimary: { backgroundColor: C.forest, borderRadius: 6, padding: 14, alignItems: 'center' },
  btnText: { color: C.paper, fontWeight: '600', fontSize: 15 },
});
