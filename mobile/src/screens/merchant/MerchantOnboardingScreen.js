import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { t, getLang } from '../../utils/i18n';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9' };

const COUNTRIES = [
  { code: 'TG', label: 'Togo' }, { code: 'BJ', label: 'Benin' }, { code: 'CI', label: "Côte d'Ivoire" },
  { code: 'GH', label: 'Ghana' }, { code: 'NG', label: 'Nigeria' }, { code: 'SN', label: 'Senegal' },
  { code: 'BF', label: 'Burkina Faso' }, { code: 'ML', label: 'Mali' }, { code: 'NE', label: 'Niger' },
  { code: 'KE', label: 'Kenya' }, { code: 'TZ', label: 'Tanzania' }, { code: 'UG', label: 'Uganda' },
  { code: 'CM', label: 'Cameroon' }, { code: 'GA', label: 'Gabon' }, { code: 'CD', label: 'DR Congo' },
];

export default function MerchantOnboardingScreen({ navigation }) {
  const { refreshUser, user } = useAuth();
  const lang = getLang(user);
  const [form, setForm] = useState({
    companyName: user?.businessProfile?.companyName || '',
    taxId: '',
    businessType: '',
    address: '',
    city: '',
    country: 'TG',
  });
  const [loading, setLoading] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const set = k => v => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    const companyName = (form.companyName || '').trim();
    const address = (form.address || '').trim();
    const city = (form.city || '').trim();
    const missing = [];
    if (!companyName) missing.push(t('biz.field.companyName', lang).replace(' *', ''));
    if (!city) missing.push(t('biz.field.city', lang).replace(' *', ''));
    if (!address) missing.push(t('biz.field.address', lang).replace(' *', ''));
    if (missing.length) {
      return Alert.alert(t('biz.missingTitle', lang), t('biz.missingBody', lang, { fields: missing.join(', ') }));
    }
    setLoading(true);
    try {
      await api.patch('/businesses/profile', { ...form, companyName, address, city, ein: form.taxId });
      await refreshUser();
      navigation.replace('MerchantKYC');
    } catch (err) {
      Alert.alert(t('biz.saveFailedTitle', lang), err.response?.data?.message || t('biz.saveFailedBody', lang));
    } finally {
      setLoading(false);
    }
  };

  const selectedCountry = COUNTRIES.find(c => c.code === form.country);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.cream }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <View style={{ marginBottom: 24, marginTop: 36 }}>
          <Text style={s.brand}>ArgiDrop</Text>
          <Text style={s.brandSub}>{t('biz.setup.brandSub', lang)}</Text>
          <Text style={s.title}>{t('biz.setup.title', lang)}</Text>
          <Text style={s.subtitle}>{t('biz.setup.subtitle', lang)}</Text>
        </View>

        <View style={s.form}>
          <Text style={s.label}>{t('biz.field.companyName', lang)}</Text>
          <TextInput style={s.input} value={form.companyName} onChangeText={set('companyName')} autoCapitalize="words" placeholderTextColor={C.subtle} placeholder={t('biz.field.companyNamePh', lang)} />

          <Text style={[s.label, { marginTop: 14 }]}>{t('biz.field.businessType', lang)}</Text>
          <TextInput style={s.input} value={form.businessType} onChangeText={set('businessType')} placeholderTextColor={C.subtle} placeholder={t('biz.field.businessTypePh', lang)} />

          <Text style={[s.label, { marginTop: 14 }]}>{t('biz.field.taxId', lang)}</Text>
          <TextInput style={s.input} value={form.taxId} onChangeText={set('taxId')} placeholderTextColor={C.subtle} placeholder={t('biz.field.taxIdPh', lang)} />

          <Text style={[s.label, { marginTop: 14 }]}>{t('biz.field.country', lang)}</Text>
          <TouchableOpacity style={[s.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]} onPress={() => setShowCountryPicker(v => !v)}>
            <Text style={{ color: C.ink, fontSize: 15 }}>{selectedCountry?.label || t('biz.field.countryPh', lang)}</Text>
            <Ionicons name={showCountryPicker ? 'chevron-up' : 'chevron-down'} size={18} color={C.muted} />
          </TouchableOpacity>
          {showCountryPicker && (
            <View style={s.countryList}>
              {COUNTRIES.map(c => (
                <TouchableOpacity key={c.code} style={s.countryItem} onPress={() => { set('country')(c.code); setShowCountryPicker(false); }}>
                  <Text style={{ color: c.code === form.country ? C.forest : C.ink, fontWeight: c.code === form.country ? '600' : '400' }}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={[s.label, { marginTop: 14 }]}>{t('biz.field.city', lang)}</Text>
          <TextInput style={s.input} value={form.city} onChangeText={set('city')} placeholderTextColor={C.subtle} placeholder={t('biz.field.cityPh', lang)} />

          <Text style={[s.label, { marginTop: 14 }]}>{t('biz.field.address', lang)}</Text>
          <TextInput style={[s.input, { height: 80, textAlignVertical: 'top' }]} value={form.address} onChangeText={set('address')} multiline placeholderTextColor={C.subtle} placeholder={t('biz.field.addressPh', lang)} />

          <TouchableOpacity style={[s.btn, loading && { opacity: 0.7 }]} onPress={submit} disabled={loading}>
            {loading ? <ActivityIndicator color={C.paper} /> : <Text style={s.btnText}>{t('common.continue', lang)}</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { padding: 24, paddingBottom: 48 },
  brand: { fontFamily: 'serif', fontSize: 22, fontWeight: '700', color: C.forest, letterSpacing: -0.5 },
  brandSub: { fontSize: 11, color: C.bronze, fontWeight: '500', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2, marginBottom: 18 },
  title: { fontSize: 22, fontWeight: '500', color: C.ink, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 19 },
  form: { backgroundColor: C.paper, borderRadius: 12, padding: 20, borderWidth: 1, borderColor: C.border },
  label: { fontSize: 12, color: C.muted, fontWeight: '600', marginBottom: 6, letterSpacing: 0.3 },
  input: { backgroundColor: C.cream, borderWidth: 1, borderColor: C.border, borderRadius: 6, padding: 13, fontSize: 15, color: C.ink },
  countryList: { backgroundColor: C.cream, borderWidth: 1, borderColor: C.border, borderRadius: 6, marginTop: 6, maxHeight: 220 },
  countryItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  btn: { backgroundColor: C.forest, borderRadius: 6, padding: 14, alignItems: 'center', marginTop: 22 },
  btnText: { color: C.paper, fontWeight: '600', fontSize: 15 },
});
