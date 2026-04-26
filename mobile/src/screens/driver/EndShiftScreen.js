// End-of-shift cash-out: shows pending earnings + PIN keypad to authorize transfer.
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../utils/api';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', forestSoft:'#2D5E3E', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', red:'#B23A48', success:'#2D5E3E' };

export default function EndShiftScreen({ navigation, route }) {
  const onComplete = route?.params?.onComplete;
  const [pin, setPin] = useState('');
  const [status, setStatus] = useState(null); // {pendingEarnings, payoutPhone, pinSet, isOnShift}
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/drivers/payout-status');
        setStatus(res.data);
      } catch (err) {
        Alert.alert('Error', 'Could not load shift status');
      } finally { setLoading(false); }
    })();
  }, []);

  const press = (n) => { if (pin.length < 6) setPin(pin + n); };
  const back = () => setPin(pin.slice(0, -1));

  const submit = async () => {
    if (pin.length < 4) return Alert.alert('PIN required', 'Enter your 4–6 digit PIN');
    setSubmitting(true);
    try {
      const res = await api.post('/drivers/shift/end', { pin });
      const p = res.data.payout; // null if no earnings, else {status, amount, providerRef}
      let msg;
      if (!p) {
        msg = res.data.message || 'Shift ended. Nothing to cash out.';
      } else {
        const amt = Math.round(parseFloat(p.amount || 0)).toLocaleString();
        if (p.status === 'SUCCESS') msg = `${amt} XOF sent to ${status.payoutPhone}. You'll receive an SMS confirmation.`;
        else if (p.status === 'PENDING') msg = `${amt} XOF queued for transfer to ${status.payoutPhone}. It will arrive within a few hours.`;
        else msg = res.data.message || 'Shift ended.';
      }
      Alert.alert('Shift ended', msg, [
        { text: 'OK', onPress: () => { onComplete?.(); navigation.goBack(); } },
      ]);
    } catch (err) {
      const m = err.response?.data?.message || 'Could not end shift';
      Alert.alert('Failed', m);
      setPin('');
    } finally { setSubmitting(false); }
  };

  if (loading) return <SafeAreaView style={[s.safe, { justifyContent:'center', alignItems:'center' }]}><ActivityIndicator color={C.forest} size="large" /></SafeAreaView>;

  if (!status?.pinSet) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="close" size={26} color={C.forest} /></TouchableOpacity>
          <Text style={s.title}>End shift</Text>
          <View style={{ width: 26 }} />
        </View>
        <View style={s.pad}>
          <Text style={s.bigAmt}>Set up your PIN first</Text>
          <Text style={s.bigSub}>You need a payout PIN before you can cash out earnings.</Text>
          <TouchableOpacity style={s.btn} onPress={() => navigation.replace('PayoutPinSetup')}>
            <Text style={s.btnText}>Set up PIN</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const pending = parseFloat(status.pendingEarnings || 0);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="close" size={26} color={C.forest} /></TouchableOpacity>
        <Text style={s.title}>End shift</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={s.summary}>
        <Text style={s.summaryLabel}>READY TO CASH OUT</Text>
        <Text style={s.bigAmt}>{Math.round(pending).toLocaleString()} <Text style={s.bigCur}>XOF</Text></Text>
        <Text style={s.summarySub}>To {status.payoutPhone || 'your mobile money number'}</Text>
      </View>

      <Text style={s.pinLabel}>{pending > 0 ? 'Enter your PIN to authorize' : 'Enter your PIN to end your shift'}</Text>
      <View style={s.dots}>
        {[0,1,2,3,4,5].map(i => (
          <View key={i} style={[s.dot, i < pin.length && s.dotFill]} />
        ))}
      </View>

      <View style={s.keypad}>
        {[['1','2','3'],['4','5','6'],['7','8','9'],['','0','⌫']].map((row, ri) => (
          <View key={ri} style={s.row}>
            {row.map((k, ki) => (
              k === '' ? <View key={ki} style={s.key} /> :
              <TouchableOpacity key={ki} style={s.key} onPress={() => k === '⌫' ? back() : press(k)}>
                <Text style={s.keyText}>{k}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>

      <TouchableOpacity style={[s.btn, (pin.length < 4 || submitting) && s.btnDisabled]} onPress={submit} disabled={pin.length < 4 || submitting}>
        {submitting ? <ActivityIndicator color={C.paper} /> : <Text style={s.btnText}>{pending > 0 ? 'Cash out & end shift' : 'End shift'}</Text>}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 12, backgroundColor: C.paper, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { fontSize: 17, fontWeight: '600', color: C.ink },
  summary: { padding: 28, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.paper },
  summaryLabel: { fontSize: 11, color: C.muted, letterSpacing: 1.4, fontWeight: '700' },
  bigAmt: { fontSize: 44, fontWeight: '300', color: C.forest, marginTop: 8, letterSpacing: -1 },
  bigCur: { fontSize: 18, color: C.muted, fontWeight: '500' },
  bigSub: { fontSize: 13, color: C.muted, marginTop: 8, textAlign: 'center', paddingHorizontal: 24 },
  summarySub: { fontSize: 13, color: C.muted, marginTop: 8 },
  pinLabel: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 22, fontWeight: '500' },
  dots: { flexDirection: 'row', justifyContent: 'center', marginTop: 14, gap: 14 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.paper },
  dotFill: { backgroundColor: C.forest, borderColor: C.forest },
  keypad: { paddingHorizontal: 28, marginTop: 24 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  key: { width: '30%', height: 56, borderRadius: 8, backgroundColor: C.paper, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontSize: 22, color: C.ink, fontWeight: '500' },
  btn: { backgroundColor: C.forest, marginHorizontal: 28, borderRadius: 6, padding: 14, alignItems: 'center', marginTop: 10 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: C.paper, fontWeight: '600', fontSize: 15 },
});
