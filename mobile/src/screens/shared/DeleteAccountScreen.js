import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { t, getLang } from '../../utils/i18n';
import api from '../../utils/api';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', ink:'#1A1A1A', muted:'#6B6560', border:'#E4DCC9', danger:'#9B2C2C', dangerSoft:'#FBEAE5' };

export default function DeleteAccountScreen({ navigation }) {
  const { user, logout } = useAuth();
  const lang = getLang(user);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const doDelete = async () => {
    if (!password) {
      Alert.alert(t('delete.title', lang), t('delete.passwordRequired', lang));
      return;
    }
    setSubmitting(true);
    try {
      await api.delete('/auth/me', { data: { password } });
      Alert.alert(t('delete.doneTitle', lang), t('delete.doneMsg', lang), [
        { text: 'OK', onPress: logout },
      ]);
    } catch (e) {
      const msg = e?.response?.data?.message || t('delete.error', lang);
      Alert.alert(t('delete.title', lang), msg);
      setSubmitting(false);
    }
  };

  const confirm = () => {
    Alert.alert(
      t('delete.confirmTitle', lang),
      t('delete.confirmMsg', lang),
      [
        { text: t('delete.cancel', lang), style: 'cancel' },
        { text: t('delete.confirmCta', lang), style: 'destructive', onPress: doDelete },
      ],
    );
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={C.ink} />
        </TouchableOpacity>
        <Text style={s.title}>{t('delete.title', lang)}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <View style={s.warnBox}>
          <Ionicons name="warning-outline" size={22} color={C.danger} style={{ marginRight: 10 }} />
          <Text style={s.warnText}>{t('delete.warning', lang)}</Text>
        </View>

        <Text style={s.sectionLabel}>{t('delete.willRemove', lang)}</Text>
        <View style={{ marginTop: 8, marginBottom: 22 }}>
          {[
            t('delete.bullet.profile', lang),
            t('delete.bullet.history', lang),
            t('delete.bullet.docs', lang),
            t('delete.bullet.notif', lang),
          ].map((line, i) => (
            <View key={i} style={s.bulletRow}>
              <Text style={s.bulletDot}>•</Text>
              <Text style={s.bulletText}>{line}</Text>
            </View>
          ))}
        </View>

        <Text style={s.sectionLabel}>{t('delete.confirmLabel', lang)}</Text>
        <Text style={s.helper}>{t('delete.confirmHelper', lang)}</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={t('delete.passwordPlaceholder', lang)}
          placeholderTextColor={C.muted}
          style={s.input}
        />

        <TouchableOpacity style={[s.btnDanger, submitting && { opacity: 0.6 }]} onPress={confirm} disabled={submitting}>
          {submitting
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnDangerText}>{t('delete.cta', lang)}</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={s.btnCancel} onPress={() => navigation.goBack()} disabled={submitting}>
          <Text style={s.btnCancelText}>{t('delete.cancel', lang)}</Text>
        </TouchableOpacity>

        <Text style={s.legal}>{t('delete.legal', lang)}</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.cream },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.paper },
  backBtn: { padding: 8 },
  title: { fontSize: 17, fontWeight: '600', color: C.ink, marginLeft: 4 },
  warnBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: C.dangerSoft, borderWidth: 1, borderColor: '#F1B9A7', borderRadius: 12, padding: 14, marginBottom: 22 },
  warnText: { flex: 1, fontSize: 13, color: C.danger, lineHeight: 19, fontWeight: '500' },
  sectionLabel: { fontSize: 11, color: C.muted, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 6 },
  helper: { fontSize: 12, color: C.muted, marginBottom: 10, lineHeight: 17 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  bulletDot: { color: C.forest, marginRight: 8, fontSize: 14, lineHeight: 19 },
  bulletText: { flex: 1, fontSize: 13, color: C.ink, lineHeight: 19 },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 13, fontSize: 15, color: C.ink, backgroundColor: C.paper, marginBottom: 18 },
  btnDanger: { backgroundColor: C.danger, borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 10 },
  btnDangerText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  btnCancel: { padding: 14, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.paper },
  btnCancelText: { color: C.ink, fontWeight: '500', fontSize: 14 },
  legal: { fontSize: 11, color: C.muted, marginTop: 24, lineHeight: 16, textAlign: 'center' },
});
