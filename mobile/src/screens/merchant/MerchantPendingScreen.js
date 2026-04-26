import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9' };

export default function MerchantPendingScreen() {
  const { refreshUser, logout } = useAuth();
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <View style={s.iconWrap}><Ionicons name="time-outline" size={48} color={C.forest} /></View>
        <Text style={s.title}>Verification in progress</Text>
        <Text style={s.text}>Your business profile is under review. We typically approve merchants within 24 hours. You'll get a notification when it's done.</Text>
        <TouchableOpacity style={s.btn} onPress={refreshUser}>
          <Text style={s.btnText}>Refresh status</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ marginTop: 18 }} onPress={logout}>
          <Text style={s.signOut}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  iconWrap: { width: 96, height: 96, borderRadius: 48, backgroundColor: C.paper, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: '600', color: C.ink, textAlign: 'center', marginBottom: 12 },
  text: { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 21, paddingHorizontal: 12 },
  btn: { backgroundColor: C.forest, borderRadius: 6, paddingHorizontal: 28, paddingVertical: 13, marginTop: 28 },
  btnText: { color: C.paper, fontWeight: '600', fontSize: 15 },
  signOut: { color: C.bronze, fontSize: 13, fontWeight: '600' },
});
