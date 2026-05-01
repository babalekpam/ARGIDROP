import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { t, getLang } from '../../utils/i18n';
import api from '../../utils/api';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', border:'#E4DCC9' };

export default function SettingsPersonalScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const lang = getLang(user);

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await api.patch('/auth/me', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
      });
      await refreshUser();
      Alert.alert(t('personal.saved', lang), t('personal.savedBody', lang),
        [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err) {
      const msg = err.response?.status === 409
        ? t('personal.phoneInUse', lang)
        : err.response?.data?.message || t('personal.errorBody', lang);
      Alert.alert(t('personal.errorTitle', lang), msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={C.ink} />
        </TouchableOpacity>
        <Text style={s.title}>{t('personal.title', lang)}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text style={s.subtitle}>{t('personal.subtitle', lang)}</Text>

        <Text style={s.label}>{t('personal.firstName', lang)}</Text>
        <TextInput style={s.input} value={firstName} onChangeText={setFirstName} autoCapitalize="words" />

        <Text style={s.label}>{t('personal.lastName', lang)}</Text>
        <TextInput style={s.input} value={lastName} onChangeText={setLastName} autoCapitalize="words" />

        <Text style={s.label}>{t('personal.email', lang)}</Text>
        <TextInput style={[s.input, s.inputDisabled]} value={user?.email || ''} editable={false} />
        <Text style={s.helper}>{t('personal.emailLocked', lang)}</Text>

        <Text style={s.label}>{t('personal.phone', lang)}</Text>
        <TextInput style={s.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+228 90 00 00 00" />

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
  input: { backgroundColor: C.paper, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.ink },
  inputDisabled: { backgroundColor: '#EFEAD8', color: C.muted },
  helper: { fontSize: 11, color: C.muted, marginTop: 4 },
  btn: { backgroundColor: C.forest, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 28 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
