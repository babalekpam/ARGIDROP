// Shown to drivers after they submit docs, waiting for admin approval
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const C = { cream: '#F7F3EB', paper: '#FDFBF6', forest: '#1B4332', bronze: '#8B6F47', ink: '#1A1A1A', muted: '#6B6560', border: '#E4DCC9' };

export default function DriverPendingScreen({ navigation }) {
  const { refreshUser, logout } = useAuth();
  const [status, setStatus] = useState(null);
  const [pinSet, setPinSet] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await api.get('/drivers/me');
        setStatus(res.data.verificationStatus);
        if (res.data.verificationStatus === 'APPROVED' && res.data.isActive) {
          await refreshUser();
          navigation.replace('DriverTabs');
        }
      } catch {}
      try {
        const ps = await api.get('/drivers/payout-status');
        setPinSet(!!ps.data.pinSet);
      } catch {}
    };
    check();
    const id = setInterval(check, 30000); // poll every 30s
    return () => clearInterval(id);
  }, []);

  return (
    <View style={s.container}>
      <View style={s.card}>
        <Text style={s.kicker}>UNDER REVIEW</Text>
        <View style={s.circle}>
          <ActivityIndicator size="large" color={C.forest} />
        </View>
        <Text style={s.title}>Your documents are being reviewed</Text>
        <Text style={s.subtitle}>
          Our team typically approves drivers within 24 hours. We'll send you a notification as soon as you're ready to start delivering.
        </Text>
        {status === 'REJECTED' && (
          <View style={s.rejectedBox}>
            <Text style={s.rejectedTitle}>Re-submission needed</Text>
            <Text style={s.rejectedText}>One or more documents need to be re-uploaded.</Text>
            <TouchableOpacity style={s.btnOutline} onPress={() => navigation.replace('DriverDocuments')}>
              <Text style={s.btnOutlineText}>Review documents</Text>
            </TouchableOpacity>
          </View>
        )}
        {!pinSet && (
          <View style={s.prepBox}>
            <Text style={s.prepTitle}>While you wait</Text>
            <Text style={s.prepText}>Set up your payout PIN now so your earnings are ready to cash out the moment you're approved.</Text>
            <TouchableOpacity style={s.btnPrimary} onPress={() => navigation.navigate('PayoutPinSetup', { onSuccess: () => setPinSet(true) })}>
              <Text style={s.btnPrimaryText}>Set up payout PIN</Text>
            </TouchableOpacity>
          </View>
        )}
        <TouchableOpacity style={s.btnGhost} onPress={logout}>
          <Text style={s.btnGhostText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: C.paper, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 32, alignItems: 'center', maxWidth: 420, width: '100%' },
  kicker: { fontSize: 11, color: C.bronze, letterSpacing: 2.5, fontWeight: '600', marginBottom: 24 },
  circle: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title: { fontSize: 20, fontWeight: '500', color: C.ink, textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  rejectedBox: { backgroundColor: '#FCEDE9', borderWidth: 1, borderColor: '#F1B9A7', borderRadius: 6, padding: 16, marginBottom: 20, width: '100%' },
  rejectedTitle: { fontSize: 14, fontWeight: '600', color: '#9B2C2C', marginBottom: 4 },
  rejectedText: { fontSize: 13, color: '#9B2C2C', marginBottom: 12 },
  btnOutline: { backgroundColor: C.paper, borderWidth: 1, borderColor: C.forest, borderRadius: 6, padding: 10, alignItems: 'center' },
  btnOutlineText: { color: C.forest, fontWeight: '600', fontSize: 13 },
  btnGhost: { paddingVertical: 8 },
  btnGhostText: { color: C.muted, fontSize: 13 },
  prepBox: { backgroundColor: C.cream, borderWidth: 1, borderColor: C.border, borderRadius: 6, padding: 16, marginBottom: 14, width: '100%' },
  prepTitle: { fontSize: 12, color: C.bronze, letterSpacing: 1.2, fontWeight: '700', marginBottom: 6 },
  prepText: { fontSize: 13, color: C.muted, marginBottom: 12, lineHeight: 18 },
  btnPrimary: { backgroundColor: C.forest, borderRadius: 6, padding: 11, alignItems: 'center' },
  btnPrimaryText: { color: C.paper, fontWeight: '600', fontSize: 13 },
});
