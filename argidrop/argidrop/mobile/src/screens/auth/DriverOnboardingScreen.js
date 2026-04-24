// Driver Onboarding — collect vehicle info + MoMo payout account after signup
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const C = { cream: '#F7F3EB', paper: '#FDFBF6', forest: '#1B4332', forestSoft: '#2D5E3E', bronze: '#8B6F47', ink: '#1A1A1A', muted: '#6B6560', subtle: '#9A9489', border: '#E4DCC9' };

const VEHICLES = [
  { id: 'BICYCLE', label: 'Vélo', hint: 'Small parcels, same zone' },
  { id: 'MOTORCYCLE', label: 'Moto', hint: 'Express, up to 15 kg' },
  { id: 'TRICYCLE', label: 'Tricycle', hint: 'Medium loads, up to 100 kg' },
  { id: 'CAR', label: 'Voiture', hint: 'Up to 200 kg, longer routes' },
  { id: 'VAN', label: 'Camionnette', hint: 'Large loads, up to 800 kg' },
];

const PAYOUT_PROVIDERS = [
  { id: 'MTN_MOMO', label: 'MTN MoMo', countries: ['TG','CI','BJ','GH','UG'] },
  { id: 'ORANGE_MONEY', label: 'Orange Money', countries: ['CI','SN','BF','ML','NE','TG'] },
  { id: 'MOOV', label: 'Moov Money', countries: ['TG','CI','BJ','BF'] },
  { id: 'TMONEY', label: 'T-Money', countries: ['TG'] },
  { id: 'WAVE', label: 'Wave', countries: ['SN','CI'] },
];

export default function DriverOnboardingScreen({ navigation }) {
  const { refreshUser } = useAuth();
  const [step, setStep] = useState(1);
  const [vehicle, setVehicle] = useState({ vehicleType: '', vehicleMake: '', vehicleModel: '', vehicleYear: '', vehiclePlate: '', vehicleColor: '' });
  const [payout, setPayout] = useState({ provider: '', account: '' });
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!vehicle.vehicleType) return Alert.alert('Missing info', 'Select your vehicle type');
    if (!payout.provider || !payout.account) return Alert.alert('Missing info', 'Add your payout account');
    setSubmitting(true);
    try {
      await api.post('/drivers/onboarding', {
        vehicleType: vehicle.vehicleType,
        vehicleMake: vehicle.vehicleMake,
        vehicleModel: vehicle.vehicleModel,
        vehicleYear: vehicle.vehicleYear ? parseInt(vehicle.vehicleYear) : null,
        vehiclePlate: vehicle.vehiclePlate,
        vehicleColor: vehicle.vehicleColor,
        payoutProvider: payout.provider,
        payoutAccount: payout.account,
      });
      await refreshUser();
      navigation.replace('DriverDocuments');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save');
    } finally { setSubmitting(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.cream }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 56 }}>
        <Text style={s.kicker}>STEP {step} OF 3</Text>
        <Text style={s.title}>{step === 1 ? 'Your vehicle' : 'Your payout account'}</Text>
        <Text style={s.subtitle}>{step === 1 ? 'Tell us what you drive' : 'Where should we send your earnings?'}</Text>

        {step === 1 && (
          <View>
            <Text style={s.label}>Vehicle type</Text>
            {VEHICLES.map(v => (
              <TouchableOpacity key={v.id} style={[s.optCard, vehicle.vehicleType === v.id && s.optCardActive]}
                onPress={() => setVehicle({ ...vehicle, vehicleType: v.id })}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.optLabel, vehicle.vehicleType === v.id && { color: C.forest }]}>{v.label}</Text>
                  <Text style={s.optHint}>{v.hint}</Text>
                </View>
                <View style={[s.radio, vehicle.vehicleType === v.id && s.radioActive]} />
              </TouchableOpacity>
            ))}

            <Text style={[s.label, { marginTop: 20 }]}>Vehicle details</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput style={[s.input, { flex: 1 }]} placeholder="Make (e.g. Toyota)" placeholderTextColor={C.subtle}
                value={vehicle.vehicleMake} onChangeText={t => setVehicle({ ...vehicle, vehicleMake: t })} />
              <TextInput style={[s.input, { flex: 1 }]} placeholder="Model" placeholderTextColor={C.subtle}
                value={vehicle.vehicleModel} onChangeText={t => setVehicle({ ...vehicle, vehicleModel: t })} />
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput style={[s.input, { flex: 1 }]} placeholder="Year" placeholderTextColor={C.subtle} keyboardType="numeric"
                value={vehicle.vehicleYear} onChangeText={t => setVehicle({ ...vehicle, vehicleYear: t })} />
              <TextInput style={[s.input, { flex: 1 }]} placeholder="Color" placeholderTextColor={C.subtle}
                value={vehicle.vehicleColor} onChangeText={t => setVehicle({ ...vehicle, vehicleColor: t })} />
            </View>
            <TextInput style={s.input} placeholder="License plate" placeholderTextColor={C.subtle}
              autoCapitalize="characters" value={vehicle.vehiclePlate}
              onChangeText={t => setVehicle({ ...vehicle, vehiclePlate: t })} />

            <TouchableOpacity style={s.btnPrimary} onPress={() => {
              if (!vehicle.vehicleType) return Alert.alert('Select a vehicle type');
              setStep(2);
            }}>
              <Text style={s.btnText}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={s.label}>Mobile money provider</Text>
            {PAYOUT_PROVIDERS.map(p => (
              <TouchableOpacity key={p.id} style={[s.optCard, payout.provider === p.id && s.optCardActive]}
                onPress={() => setPayout({ ...payout, provider: p.id })}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.optLabel, payout.provider === p.id && { color: C.forest }]}>{p.label}</Text>
                  <Text style={s.optHint}>{p.countries.join(', ')}</Text>
                </View>
                <View style={[s.radio, payout.provider === p.id && s.radioActive]} />
              </TouchableOpacity>
            ))}

            <Text style={[s.label, { marginTop: 20 }]}>Phone number for payouts</Text>
            <TextInput style={s.input} placeholder="+228 90 00 00 00" placeholderTextColor={C.subtle} keyboardType="phone-pad"
              value={payout.account} onChangeText={t => setPayout({ ...payout, account: t })} />
            <Text style={s.hint}>This is where your earnings will be sent after each delivery.</Text>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 24 }}>
              <TouchableOpacity style={[s.btnSecondary, { flex: 1 }]} onPress={() => setStep(1)}>
                <Text style={[s.btnText, { color: C.ink }]}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btnPrimary, { flex: 2 }]} onPress={submit} disabled={submitting}>
                <Text style={s.btnText}>{submitting ? 'Saving…' : 'Continue to documents'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  kicker: { fontSize: 11, color: C.bronze, letterSpacing: 2, fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '500', color: C.ink, marginBottom: 6 },
  subtitle: { fontSize: 14, color: C.muted, marginBottom: 28 },
  label: { fontSize: 12, color: C.muted, fontWeight: '600', marginBottom: 10, letterSpacing: 0.4 },
  optCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.paper, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 14, marginBottom: 8 },
  optCardActive: { borderColor: C.forest, backgroundColor: '#F0EDE0' },
  optLabel: { fontSize: 15, fontWeight: '500', color: C.ink, marginBottom: 2 },
  optHint: { fontSize: 12, color: C.muted },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: C.border },
  radioActive: { borderColor: C.forest, backgroundColor: C.forest },
  input: { backgroundColor: C.paper, borderWidth: 1, borderColor: C.border, borderRadius: 6, padding: 12, fontSize: 14, color: C.ink, marginBottom: 10 },
  hint: { fontSize: 12, color: C.muted, marginTop: -4, marginBottom: 12, lineHeight: 16 },
  btnPrimary: { backgroundColor: C.forest, borderRadius: 6, padding: 14, alignItems: 'center', marginTop: 24 },
  btnSecondary: { backgroundColor: C.paper, borderWidth: 1, borderColor: C.border, borderRadius: 6, padding: 14, alignItems: 'center', marginTop: 24 },
  btnText: { color: C.paper, fontWeight: '600', fontSize: 14 },
});
