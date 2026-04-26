import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9' };

export default function RegisterScreen({ navigation, route }) {
  const { register } = useAuth();
  const role = route?.params?.role || 'DRIVER';
  const isMerchant = role === 'BUSINESS';

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', password: '',
    companyName: '',
  });
  const [loading, setLoading] = useState(false);
  const set = k => v => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.firstName || !form.email || !form.password) return Alert.alert('Required fields', 'First name, email, and password are required');
    if (isMerchant && !form.companyName) return Alert.alert('Required fields', 'Business name is required');
    if (form.password.length < 8) return Alert.alert('Password too short', 'Password must be at least 8 characters');
    setLoading(true);
    try {
      const payload = {
        firstName: form.firstName, lastName: form.lastName,
        email: form.email.trim().toLowerCase(),
        phone: form.phone, password: form.password, role,
      };
      if (isMerchant) payload.companyName = form.companyName;
      await register(payload);
    } catch (err) {
      Alert.alert('Registration failed', err.response?.data?.message || 'Please try again');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.cream }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 8 }}>
          <Ionicons name="chevron-back" size={26} color={C.forest} />
        </TouchableOpacity>
        <View style={{ marginBottom: 24 }}>
          <Text style={s.brand}>ArgiDrop</Text>
          <Text style={s.brandSub}>{isMerchant ? 'Merchant registration' : 'Driver registration'}</Text>
          <Text style={s.title}>Create account</Text>
          <Text style={s.subtitle}>{isMerchant ? 'Join thousands of merchants moving goods across West Africa' : 'Join the ArgiDrop driver network'}</Text>
        </View>
        <View style={s.form}>
          {isMerchant && (
            <>
              <Text style={s.label}>Business name *</Text>
              <TextInput style={s.input} value={form.companyName} onChangeText={set('companyName')} autoCapitalize="words" placeholderTextColor={C.subtle} placeholder="Boutique Akossiwa" />
              <View style={{ height: 14 }} />
            </>
          )}

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>First name *</Text>
              <TextInput style={s.input} value={form.firstName} onChangeText={set('firstName')} autoCapitalize="words" placeholderTextColor={C.subtle} placeholder="Kodjo" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Last name</Text>
              <TextInput style={s.input} value={form.lastName} onChangeText={set('lastName')} autoCapitalize="words" placeholderTextColor={C.subtle} placeholder="Amenuvor" />
            </View>
          </View>
          <Text style={[s.label, { marginTop: 14 }]}>Email address *</Text>
          <TextInput style={s.input} value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={C.subtle} placeholder="your@email.com" />
          <Text style={[s.label, { marginTop: 14 }]}>Phone number</Text>
          <TextInput style={s.input} value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" placeholderTextColor={C.subtle} placeholder="+228 90 00 00 00" />
          <Text style={[s.label, { marginTop: 14 }]}>Password *</Text>
          <TextInput style={s.input} value={form.password} onChangeText={set('password')} secureTextEntry placeholderTextColor={C.subtle} placeholder="At least 8 characters" />

          <TouchableOpacity style={[s.btn, loading && { opacity: 0.7 }]} onPress={submit} disabled={loading}>
            {loading ? <ActivityIndicator color={C.paper} /> : <Text style={s.btnText}>{isMerchant ? 'Create merchant account' : 'Create driver account'}</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginTop: 14, alignItems: 'center' }}>
            <Text style={s.link}>Already have an account? <Text style={{ color: C.forest, fontWeight: '600' }}>Sign in</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { padding: 28, paddingBottom: 48 },
  brand: { fontFamily: 'serif', fontSize: 24, fontWeight: '700', color: C.forest, letterSpacing: -0.5 },
  brandSub: { fontSize: 11, color: C.bronze, fontWeight: '500', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '500', color: C.ink, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: C.muted, marginTop: 4, lineHeight: 20 },
  form: { backgroundColor: C.paper, borderRadius: 12, padding: 22, borderWidth: 1, borderColor: C.border },
  label: { fontSize: 12, color: C.muted, fontWeight: '600', marginBottom: 6, letterSpacing: 0.3 },
  input: { backgroundColor: C.cream, borderWidth: 1, borderColor: C.border, borderRadius: 6, padding: 13, fontSize: 15, color: C.ink, marginBottom: 2 },
  btn: { backgroundColor: C.forest, borderRadius: 6, padding: 14, alignItems: 'center', marginTop: 20 },
  btnText: { color: C.paper, fontWeight: '600', fontSize: 15 },
  link: { fontSize: 13, color: C.muted },
});
