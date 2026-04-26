// PIN setup / change for end-of-shift payout.
// Used both during onboarding (no current PIN) and from Profile (change PIN, requires current).
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../utils/api';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', red:'#B23A48' };

export default function PayoutPinSetupScreen({ navigation, route }) {
  const onSuccess = route?.params?.onSuccess;
  const [hasPin, setHasPin] = useState(false);
  const [payoutPhone, setPayoutPhone] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResetFlow, setShowResetFlow] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/drivers/payout-status');
        setHasPin(!!res.data.pinSet);
        if (res.data.payoutPhone) setPayoutPhone(res.data.payoutPhone);
      } catch {}
    })();
  }, []);

  const submit = async () => {
    if (!/^\d{4,6}$/.test(pin)) return Alert.alert('Invalid PIN', 'PIN must be 4 to 6 digits');
    if (pin !== confirmPin) return Alert.alert('PINs do not match', 'Please re-enter your PIN');
    if (!payoutPhone || payoutPhone.replace(/\D/g, '').length < 8) return Alert.alert('Payout phone required', 'Enter your mobile money number');
    if (hasPin && !currentPin) return Alert.alert('Current PIN required', 'Enter your current PIN to change it');

    setLoading(true);
    try {
      await api.post('/drivers/payout-pin', { pin, currentPin: hasPin ? currentPin : undefined, payoutPhone });
      Alert.alert('PIN saved', 'You can now cash out your earnings at the end of each shift.', [
        { text: 'OK', onPress: () => { onSuccess ? onSuccess() : navigation.goBack(); } },
      ]);
    } catch (err) {
      Alert.alert('Failed', err.response?.data?.message || 'Could not save PIN');
    } finally {
      setLoading(false);
    }
  };

  const requestReset = async () => {
    setLoading(true);
    try {
      await api.post('/drivers/payout-pin/reset-request');
      setOtpSent(true);
      Alert.alert('Code sent', 'Enter the 6-digit code we sent to your phone.');
    } catch (err) {
      Alert.alert('Failed', err.response?.data?.message || 'Could not send code');
    } finally { setLoading(false); }
  };

  const submitReset = async () => {
    if (!/^\d{4,6}$/.test(pin)) return Alert.alert('Invalid PIN', 'PIN must be 4 to 6 digits');
    if (pin !== confirmPin) return Alert.alert('PINs do not match');
    if (!otpCode) return Alert.alert('Code required');
    setLoading(true);
    try {
      await api.post('/drivers/payout-pin/reset', { code: otpCode, newPin: pin, payoutPhone });
      Alert.alert('PIN reset', 'You can now cash out using your new PIN.', [
        { text: 'OK', onPress: () => { onSuccess ? onSuccess() : navigation.goBack(); } },
      ]);
    } catch (err) {
      Alert.alert('Failed', err.response?.data?.message || 'Could not reset PIN');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color={C.forest} />
        </TouchableOpacity>
        <Text style={s.title}>{hasPin ? (showResetFlow ? 'Reset PIN' : 'Change PIN') : 'Set up payout PIN'}</Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 22 }} keyboardShouldPersistTaps="handled">
          <View style={s.intro}>
            <Ionicons name="lock-closed-outline" size={28} color={C.forest} />
            <Text style={s.introTitle}>Your money, your control</Text>
            <Text style={s.introText}>Set a 4–6 digit PIN. You'll use it at the end of each shift to authorize the transfer of your earnings to your mobile money number.</Text>
          </View>

          {showResetFlow ? (
            <>
              {!otpSent ? (
                <TouchableOpacity style={s.btn} onPress={requestReset} disabled={loading}>
                  {loading ? <ActivityIndicator color={C.paper} /> : <Text style={s.btnText}>Send reset code to my phone</Text>}
                </TouchableOpacity>
              ) : (
                <>
                  <Text style={s.label}>6-digit code</Text>
                  <TextInput style={s.input} value={otpCode} onChangeText={setOtpCode} keyboardType="number-pad" maxLength={6} placeholderTextColor={C.subtle} placeholder="123456" />
                  <Text style={[s.label, { marginTop: 14 }]}>New PIN</Text>
                  <TextInput style={s.input} value={pin} onChangeText={setPin} keyboardType="number-pad" secureTextEntry maxLength={6} placeholderTextColor={C.subtle} placeholder="••••" />
                  <Text style={[s.label, { marginTop: 14 }]}>Confirm new PIN</Text>
                  <TextInput style={s.input} value={confirmPin} onChangeText={setConfirmPin} keyboardType="number-pad" secureTextEntry maxLength={6} placeholderTextColor={C.subtle} placeholder="••••" />
                  <Text style={[s.label, { marginTop: 14 }]}>Mobile money number</Text>
                  <TextInput style={s.input} value={payoutPhone} onChangeText={setPayoutPhone} keyboardType="phone-pad" placeholderTextColor={C.subtle} placeholder="+228 90 00 00 00" />
                  <TouchableOpacity style={s.btn} onPress={submitReset} disabled={loading}>
                    {loading ? <ActivityIndicator color={C.paper} /> : <Text style={s.btnText}>Reset PIN</Text>}
                  </TouchableOpacity>
                </>
              )}
            </>
          ) : (
            <>
              {hasPin && (
                <>
                  <Text style={s.label}>Current PIN</Text>
                  <TextInput style={s.input} value={currentPin} onChangeText={setCurrentPin} keyboardType="number-pad" secureTextEntry maxLength={6} placeholderTextColor={C.subtle} placeholder="••••" />
                </>
              )}
              <Text style={[s.label, hasPin && { marginTop: 14 }]}>{hasPin ? 'New PIN' : 'PIN (4–6 digits)'}</Text>
              <TextInput style={s.input} value={pin} onChangeText={setPin} keyboardType="number-pad" secureTextEntry maxLength={6} placeholderTextColor={C.subtle} placeholder="••••" />

              <Text style={[s.label, { marginTop: 14 }]}>Confirm PIN</Text>
              <TextInput style={s.input} value={confirmPin} onChangeText={setConfirmPin} keyboardType="number-pad" secureTextEntry maxLength={6} placeholderTextColor={C.subtle} placeholder="••••" />

              <Text style={[s.label, { marginTop: 14 }]}>Mobile money number for payouts</Text>
              <TextInput style={s.input} value={payoutPhone} onChangeText={setPayoutPhone} keyboardType="phone-pad" placeholderTextColor={C.subtle} placeholder="+228 90 00 00 00" />
              <Text style={s.hint}>This is where your earnings will be sent. Make sure it's correct — changing it later requires verification.</Text>

              <TouchableOpacity style={s.btn} onPress={submit} disabled={loading}>
                {loading ? <ActivityIndicator color={C.paper} /> : <Text style={s.btnText}>{hasPin ? 'Update PIN' : 'Save PIN'}</Text>}
              </TouchableOpacity>

              {hasPin && (
                <TouchableOpacity onPress={() => { setShowResetFlow(true); setCurrentPin(''); setPin(''); setConfirmPin(''); }} style={{ marginTop: 16, alignItems: 'center' }}>
                  <Text style={s.forgot}>Forgot your PIN? Reset via SMS code</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 12, backgroundColor: C.paper, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { fontSize: 17, fontWeight: '600', color: C.ink },
  intro: { backgroundColor: C.paper, borderRadius: 12, padding: 18, borderWidth: 1, borderColor: C.border, marginBottom: 22, alignItems: 'flex-start' },
  introTitle: { fontSize: 16, fontWeight: '600', color: C.ink, marginTop: 8 },
  introText: { fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 19 },
  label: { fontSize: 12, color: C.muted, fontWeight: '600', marginBottom: 6, letterSpacing: 0.3 },
  input: { backgroundColor: C.paper, borderWidth: 1, borderColor: C.border, borderRadius: 6, padding: 13, fontSize: 18, color: C.ink, letterSpacing: 4, textAlign: 'center', fontWeight: '500' },
  hint: { fontSize: 11, color: C.muted, marginTop: 6, lineHeight: 16 },
  btn: { backgroundColor: C.forest, borderRadius: 6, padding: 14, alignItems: 'center', marginTop: 22 },
  btnText: { color: C.paper, fontWeight: '600', fontSize: 15 },
  forgot: { fontSize: 13, color: C.bronze, fontWeight: '600' },
});
