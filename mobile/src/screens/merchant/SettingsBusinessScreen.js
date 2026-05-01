import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { t, getLang } from '../../utils/i18n';
import api from '../../utils/api';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', ink:'#1A1A1A', muted:'#6B6560', border:'#E4DCC9' };

export default function SettingsBusinessScreen({ navigation }) {
  const { user } = useAuth();
  const lang = getLang(user);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    companyName: '', businessType: '', ein: '',
    address: '', city: '', country: '',
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/businesses/profile');
        const b = res.data.business || {};
        setForm({
          companyName: b.companyName || '',
          businessType: b.businessType || '',
          ein: b.ein || '',
          address: b.address || '',
          city: b.city || '',
          country: b.country || '',
        });
      } catch {
        // empty form is fine for new businesses
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await api.patch('/businesses/profile', form);
      Alert.alert(t('bizProfile.saved', lang), '', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err) {
      Alert.alert(t('personal.errorTitle', lang), err.response?.data?.message || t('personal.errorBody', lang));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[s.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={C.forest} />
      </View>
    );
  }

  const Field = ({ k, label, ph, ...rest }) => (
    <>
      <Text style={s.label}>{label}</Text>
      <TextInput style={s.input} value={form[k]} onChangeText={set(k)} placeholder={ph} placeholderTextColor="#B7AE9F" {...rest} />
    </>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={C.ink} />
        </TouchableOpacity>
        <Text style={s.title}>{t('bizProfile.title', lang)}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text style={s.subtitle}>{t('bizProfile.subtitle', lang)}</Text>

        <Field k="companyName" label={t('biz.field.companyName', lang)} ph={t('biz.field.companyNamePh', lang)} />
        <Field k="businessType" label={t('biz.field.businessType', lang)} ph={t('biz.field.businessTypePh', lang)} />
        <Field k="ein" label={t('biz.field.taxId', lang)} ph={t('biz.field.taxIdPh', lang)} />
        <Field k="country" label={t('biz.field.country', lang)} ph={t('biz.field.countryPh', lang)} />
        <Field k="city" label={t('biz.field.city', lang)} ph={t('biz.field.cityPh', lang)} />
        <Field k="address" label={t('biz.field.address', lang)} ph={t('biz.field.addressPh', lang)} multiline />

        <TouchableOpacity style={[s.btn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>{t('personal.save', lang)}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.cream },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.paper },
  backBtn: { padding: 8 },
  title: { fontSize: 17, fontWeight: '600', color: C.ink, marginLeft: 4 },
  subtitle: { fontSize: 13, color: C.muted, lineHeight: 19 },
  label: { fontSize: 13, fontWeight: '600', color: C.ink, marginTop: 18, marginBottom: 6 },
  input: { backgroundColor: C.paper, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.ink, minHeight: 44 },
  btn: { backgroundColor: C.forest, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 28 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
