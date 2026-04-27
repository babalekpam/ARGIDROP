import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Linking, Share, ScrollView, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', accent:'#D4A574' };

// Centralized invite copy. Kept short — WhatsApp deep-links truncate
// aggressively on some Android keyboards and we want the code visible.
function buildInviteMessage({ code, role, firstName }) {
  const who = firstName || (role === 'DRIVER' ? 'A driver friend' : 'A merchant friend');
  if (role === 'DRIVER') {
    return `${who} invited you to drive with ArgiDrop. Sign up with code ${code} and earn a bonus on your first deliveries.`;
  }
  return `${who} invited you to ArgiDrop — fast delivery for your business. Sign up with code ${code} and get a discount on your first delivery.`;
}

export default function InviteScreen({ navigation }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get('/referrals/me');
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load your invite code');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onCopy = async () => {
    if (!data?.code) return;
    await Clipboard.setStringAsync(data.code);
    Alert.alert('Copied', `Code ${data.code} copied to clipboard`);
  };

  const onShareWhatsApp = async () => {
    if (!data?.code) return;
    const msg = buildInviteMessage({ code: data.code, role: data.role, firstName: user?.firstName });
    const url = `whatsapp://send?text=${encodeURIComponent(msg)}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        // Fallback to system share sheet (covers SMS, Telegram, Messenger…).
        await Share.share({ message: msg });
      }
    } catch (e) {
      await Share.share({ message: msg }).catch(() => Alert.alert('Share failed'));
    }
  };

  const onShareGeneric = async () => {
    if (!data?.code) return;
    const msg = buildInviteMessage({ code: data.code, role: data.role, firstName: user?.firstName });
    try { await Share.share({ message: msg }); } catch {}
  };

  if (loading) {
    return (
      <View style={[s.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={C.forest} />
      </View>
    );
  }

  return (
    <ScrollView style={s.safe} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color={C.forest} />
        </TouchableOpacity>
        <Text style={s.title}>Invite & earn</Text>
        <View style={{ width: 26 }} />
      </View>

      {error ? (
        <View style={s.errorBox}>
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity onPress={load}><Text style={s.retry}>Try again</Text></TouchableOpacity>
        </View>
      ) : null}

      {data && (
        <>
          <View style={s.hero}>
            <Text style={s.heroEyebrow}>YOUR PERSONAL CODE</Text>
            <Text style={s.code}>{data.code}</Text>
            <Text style={s.heroBody}>
              {data.role === 'DRIVER'
                ? 'Share with other drivers. You earn a bonus when they complete their first delivery.'
                : 'Share with other shop owners. You get a free delivery credit when they complete their first delivery.'}
            </Text>
            <View style={s.actions}>
              <TouchableOpacity style={s.primaryBtn} onPress={onShareWhatsApp}>
                <Ionicons name="logo-whatsapp" size={18} color={C.paper} />
                <Text style={s.primaryBtnText}>Share on WhatsApp</Text>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <TouchableOpacity style={s.secondaryBtn} onPress={onCopy}>
                  <Ionicons name="copy-outline" size={16} color={C.forest} />
                  <Text style={s.secondaryBtnText}>Copy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.secondaryBtn} onPress={onShareGeneric}>
                  <Ionicons name="share-outline" size={16} color={C.forest} />
                  <Text style={s.secondaryBtnText}>More…</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <Text style={s.section}>Your referrals</Text>
          <View style={s.statsGrid}>
            <Stat label="Pending" value={data.summary.pending} />
            <Stat label="Qualified" value={data.summary.qualified} />
            <Stat label="Paid" value={data.summary.paid} />
          </View>
          <View style={s.earnedRow}>
            <Text style={s.earnedLabel}>Total earned</Text>
            <Text style={s.earnedValue}>
              {Math.round(data.summary.totalEarned).toLocaleString()} XOF
            </Text>
          </View>

          <Text style={s.fineprint}>
            Rewards are paid after your invitee completes their first delivery and passes verification.
            One reward per phone number. ArgiDrop may withhold rewards in case of suspected abuse.
          </Text>
        </>
      )}
    </ScrollView>
  );
}

function Stat({ label, value }) {
  return (
    <View style={s.statBox}>
      <Text style={s.statValue}>{value ?? 0}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 8 },
  title: { fontSize: 17, fontWeight: '600', color: C.ink },
  hero: { backgroundColor: C.paper, marginHorizontal: 16, marginTop: 12, borderRadius: 16, padding: 22, borderWidth: 1, borderColor: C.border },
  heroEyebrow: { fontSize: 11, color: C.bronze, letterSpacing: 1.5, fontWeight: '700' },
  code: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 32, fontWeight: '700', color: C.forest, marginVertical: 10, letterSpacing: 1 },
  heroBody: { fontSize: 13, color: C.muted, lineHeight: 19 },
  actions: { marginTop: 18 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#25D366', borderRadius: 8, paddingVertical: 14, gap: 8 },
  primaryBtnText: { color: C.paper, fontWeight: '600', fontSize: 15 },
  secondaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingVertical: 12, gap: 6, backgroundColor: C.cream },
  secondaryBtnText: { color: C.forest, fontWeight: '600', fontSize: 13 },
  section: { fontSize: 11, color: C.muted, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 24, marginBottom: 8, paddingHorizontal: 20 },
  statsGrid: { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
  statBox: { flex: 1, backgroundColor: C.paper, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 14, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '700', color: C.ink },
  statLabel: { fontSize: 11, color: C.muted, marginTop: 2 },
  earnedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginHorizontal: 16, marginTop: 14, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: C.paper, borderRadius: 10, borderWidth: 1, borderColor: C.border },
  earnedLabel: { fontSize: 13, color: C.muted },
  earnedValue: { fontSize: 18, fontWeight: '700', color: C.forest },
  fineprint: { fontSize: 11, color: C.subtle, lineHeight: 16, marginTop: 18, paddingHorizontal: 24, textAlign: 'center' },
  errorBox: { marginHorizontal: 16, marginTop: 16, padding: 14, backgroundColor: '#FEE', borderRadius: 8 },
  errorText: { color: '#B23A48' },
  retry: { color: C.forest, fontWeight: '600', marginTop: 6 },
});
