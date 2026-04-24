import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9' };

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !password) return Alert.alert('Champs requis', 'Please enter your email and password');
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err) {
      Alert.alert('Login failed', err.response?.data?.message || 'Invalid credentials');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}>
        <Text style={s.brand}>ArgiDrop</Text>
        <Text style={s.brandSub}>by ARGILETTE</Text>
        <Text style={s.title}>Sign in</Text>
        <Text style={s.subtitle}>Welcome back, driver</Text>
      </View>
      <View style={s.form}>
        <Text style={s.label}>Email address</Text>
        <TextInput style={s.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholderTextColor={C.subtle} placeholder="your@email.com" />
        <Text style={[s.label, { marginTop: 14 }]}>Password</Text>
        <TextInput style={s.input} value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor={C.subtle} placeholder="••••••••" />
        <TouchableOpacity style={[s.btn, loading && { opacity: 0.7 }]} onPress={submit} disabled={loading}>
          {loading ? <ActivityIndicator color={C.paper} /> : <Text style={s.btnText}>Sign in</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Register')} style={{ marginTop: 16, alignItems: 'center' }}>
          <Text style={s.link}>New driver? <Text style={{ color: C.forest, fontWeight: '600' }}>Register here</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.cream, padding: 28, justifyContent: 'center' },
  header: { marginBottom: 36 },
  brand: { fontFamily: 'serif', fontSize: 28, fontWeight: '700', color: C.forest, letterSpacing: -0.5 },
  brandSub: { fontSize: 11, color: C.bronze, fontWeight: '500', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2, marginBottom: 24 },
  title: { fontSize: 26, fontWeight: '500', color: C.ink, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: C.muted, marginTop: 4 },
  form: { backgroundColor: C.paper, borderRadius: 12, padding: 24, borderWidth: 1, borderColor: C.border },
  label: { fontSize: 12, color: C.muted, fontWeight: '600', marginBottom: 6, letterSpacing: 0.3 },
  input: { backgroundColor: C.cream, borderWidth: 1, borderColor: C.border, borderRadius: 6, padding: 13, fontSize: 15, color: C.ink, marginBottom: 2 },
  btn: { backgroundColor: C.forest, borderRadius: 6, padding: 14, alignItems: 'center', marginTop: 20 },
  btnText: { color: C.paper, fontWeight: '600', fontSize: 15 },
  link: { fontSize: 14, color: C.muted },
});
