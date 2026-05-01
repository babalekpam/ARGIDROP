import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { t, getLang } from '../../utils/i18n';
import api from '../../utils/api';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', ink:'#1A1A1A', muted:'#6B6560', border:'#E4DCC9' };

export default function SettingsPasswordScreen({ navigation }) {
  const { user } = useAuth();
  const lang = getLang(user);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (saving) return;
    if (!current || !next || !confirm) {
      return Alert.alert(t('pwd.requiredTitle', lang), t('pwd.requiredBody', lang));
    }
    if (next.length < 8) {
      return Alert.alert(t('pwd.requiredTitle', lang), t('pwd.tooShort', lang));
    }
    if (next !== confirm) {
      return Alert.alert(t('pwd.mismatchTitle', lang), t('pwd.mismatchBody', lang));
    }
    setSaving(true);
    try {
      await api.post('/auth/change-password', { currentPassword: current, newPassword: next });
      Alert.alert(t('pwd.successTitle', lang), t('pwd.successBody', lang),
        [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err) {
      const status = err.response?.status;
      const msg = status === 401
        ? t('pwd.wrongCurrent', lang)
        : err.response?.data?.message || t('personal.errorBody', lang);
      Alert.alert(t('pwd.errorTitle', lang), msg);
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
        <Text style={s.title}>{t('pwd.title', lang)}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text style={s.subtitle}>{t('pwd.subtitle', lang)}</Text>

        <Text style={s.label}>{t('pwd.current', lang)}</Text>
        <TextInput style={s.input} value={current} onChangeText={setCurrent} secureTextEntry autoCapitalize="none" />

        <Text style={s.label}>{t('pwd.new', lang)}</Text>
        <TextInput style={s.input} value={next} onChangeText={setNext} secureTextEntry autoCapitalize="none" />

        <Text style={s.label}>{t('pwd.confirm', lang)}</Text>
        <TextInput style={s.input} value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" />

        <TouchableOpacity style={[s.btn, saving && { opacity: 0.6 }]} onPress={submit} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>{t('pwd.update', lang)}</Text>}
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
  btn: { backgroundColor: C.forest, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 28 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
