import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LanguageContext';
import { t } from '../../utils/i18n';
import LanguageToggle from '../../components/LanguageToggle';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9' };

export default function RegisterScreen({ navigation, route }) {
  const { register } = useAuth();
  const { lang } = useLang();
  const role = route?.params?.role || 'DRIVER';
  const isIndividual = !!route?.params?.individual;
  const isMerchant = role === 'BUSINESS' && !isIndividual;

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', password: '',
    companyName: '', referralCode: '',
  });
  const [showReferral, setShowReferral] = useState(false);
  const [loading, setLoading] = useState(false);
  const set = k => v => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.firstName || !form.email || !form.password) return Alert.alert(t('register.requiredFields', lang), t('register.requiredMsg', lang));
    if (isMerchant && !form.companyName) return Alert.alert(t('register.requiredFields', lang), t('register.businessRequired', lang));
    if (form.password.length < 8) return Alert.alert(t('register.passwordTooShort', lang), t('register.passwordTooShortMsg', lang));
    setLoading(true);
    try {
      const payload = {
        firstName: form.firstName, lastName: form.lastName,
        email: form.email.trim().toLowerCase(),
        phone: form.phone, password: form.password, role,
      };
      if (isMerchant) payload.companyName = form.companyName;
      if (isIndividual) {
        payload.isIndividual = true;
        payload.companyName = `${form.firstName} ${form.lastName}`.trim();
      }
      const refCode = (form.referralCode || '').trim();
      if (refCode) payload.referralCode = refCode.toUpperCase();
      await register(payload);
    } catch (err) {
      Alert.alert(t('register.failed', lang), err.response?.data?.message || t('register.tryAgain', lang));
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.cream }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={26} color={C.forest} />
          </TouchableOpacity>
          <LanguageToggle />
        </View>
        <View style={{ marginBottom: 24 }}>
          <Text style={s.brand}>ArgiDrop</Text>
          <Text style={s.brandSub}>{isIndividual ? t('register.consumerSub', lang) : isMerchant ? t('register.merchantSub', lang) : t('register.driverSub', lang)}</Text>
          <Text style={s.title}>{t('register.title', lang)}</Text>
          <Text style={s.subtitle}>{isIndividual ? t('register.consumerSubtitle', lang) : isMerchant ? t('register.merchantSubtitle', lang) : t('register.driverSubtitle', lang)}</Text>
        </View>
        <View style={s.form}>
          {isMerchant && (
            <>
              <Text style={s.label}>{t('register.businessName', lang)}</Text>
              <TextInput style={s.input} value={form.companyName} onChangeText={set('companyName')} autoCapitalize="words" placeholderTextColor={C.subtle} placeholder="Boutique Akossiwa" />
              <View style={{ height: 14 }} />
            </>
          )}

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>{t('register.firstName', lang)}</Text>
              <TextInput style={s.input} value={form.firstName} onChangeText={set('firstName')} autoCapitalize="words" placeholderTextColor={C.subtle} placeholder="Kodjo" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>{t('register.lastName', lang)}</Text>
              <TextInput style={s.input} value={form.lastName} onChangeText={set('lastName')} autoCapitalize="words" placeholderTextColor={C.subtle} placeholder="Amenuvor" />
            </View>
          </View>
          <Text style={[s.label, { marginTop: 14 }]}>{t('register.email', lang)}</Text>
          <TextInput style={s.input} value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={C.subtle} placeholder="your@email.com" />
          <Text style={[s.label, { marginTop: 14 }]}>{t('register.phone', lang)}</Text>
          <TextInput style={s.input} value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" placeholderTextColor={C.subtle} placeholder="+228 90 00 00 00" />
          <Text style={[s.label, { marginTop: 14 }]}>{t('register.password', lang)}</Text>
          <TextInput style={s.input} value={form.password} onChangeText={set('password')} secureTextEntry placeholderTextColor={C.subtle} placeholder={t('register.passwordPlaceholder', lang)} />

          <TouchableOpacity onPress={() => setShowReferral(v => !v)} style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name={showReferral ? 'chevron-up' : 'chevron-down'} size={16} color={C.bronze} />
            <Text style={{ marginLeft: 6, color: C.bronze, fontSize: 13, fontWeight: '600' }}>
              {showReferral ? t('register.hideReferral', lang) : t('register.haveReferral', lang)}
            </Text>
          </TouchableOpacity>
          {showReferral && (
            <>
              <Text style={[s.label, { marginTop: 10 }]}>{t('register.referral', lang)}</Text>
              <TextInput
                style={s.input}
                value={form.referralCode}
                onChangeText={set('referralCode')}
                autoCapitalize="characters"
                autoCorrect={false}
                placeholderTextColor={C.subtle}
                placeholder={isMerchant ? 'SHOP-A1B2' : 'RIDER-A1B2'}
              />
            </>
          )}

          <TouchableOpacity style={[s.btn, loading && { opacity: 0.7 }]} onPress={submit} disabled={loading}>
            {loading ? <ActivityIndicator color={C.paper} /> : <Text style={s.btnText}>{isIndividual ? t('register.submitConsumer', lang) : isMerchant ? t('register.submitMerchant', lang) : t('register.submitDriver', lang)}</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginTop: 14, alignItems: 'center' }}>
            <Text style={s.link}>{t('register.alreadyAccount', lang)} <Text style={{ color: C.forest, fontWeight: '600' }}>{t('register.signin', lang)}</Text></Text>
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
