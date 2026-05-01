import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { t, getLang } from '../../utils/i18n';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', border:'#E4DCC9' };

const SUPPORT_EMAIL = 'support@argidrop.com';
const SUPPORT_BASE  = 'https://argidrop.com';

export default function SettingsSupportScreen({ navigation }) {
  const { user } = useAuth();
  const lang = getLang(user);

  const open = async (url) => {
    try {
      const ok = await Linking.canOpenURL(url);
      if (!ok) throw new Error('cannot');
      await Linking.openURL(url);
    } catch {
      Alert.alert(t('support.cantOpen', lang), url);
    }
  };

  const Row = ({ icon, label, hint, onPress }) => (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.7}>
      <View style={s.iconWrap}><Ionicons name={icon} size={20} color={C.forest} /></View>
      <View style={{ flex: 1 }}>
        <Text style={s.rowLabel}>{label}</Text>
        {hint ? <Text style={s.rowHint}>{hint}</Text> : null}
      </View>
      <Ionicons name="open-outline" size={18} color={C.muted} />
    </TouchableOpacity>
  );

  const subjectPrefix = lang === 'fr' ? 'Demande de support ArgiDrop' : 'ArgiDrop support request';
  const helpPath = lang === 'fr' ? '/aide' : '/help';

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={C.ink} />
        </TouchableOpacity>
        <Text style={s.title}>{t('support.title', lang)}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text style={s.subtitle}>{t('support.subtitle', lang)}</Text>

        <View style={{ marginTop: 18 }}>
          <Row icon="mail-outline" label={t('support.email', lang)} hint={t('support.emailHint', lang)}
               onPress={() => open(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subjectPrefix)}`)} />
          <Row icon="help-circle-outline" label={t('support.faq', lang)} hint={t('support.faqHint', lang)}
               onPress={() => open(`${SUPPORT_BASE}${helpPath}`)} />
          <Row icon="document-text-outline" label={t('support.privacy', lang)}
               onPress={() => open(`${SUPPORT_BASE}/privacy`)} />
          <Row icon="document-text-outline" label={t('support.terms', lang)}
               onPress={() => open(`${SUPPORT_BASE}/terms`)} />
          <Row icon="trash-outline" label={t('support.deletion', lang)}
               onPress={() => open(`${SUPPORT_BASE}/account-deletion`)} />
        </View>

        <Text style={s.legal}>{t('support.legal', lang)}</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.cream },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.paper },
  backBtn: { padding: 8 },
  title: { fontSize: 17, fontWeight: '600', color: C.ink, marginLeft: 4 },
  subtitle: { fontSize: 13, color: C.muted, lineHeight: 19 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.paper, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginBottom: 10 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EFEAD8', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: C.ink },
  rowHint: { fontSize: 12, color: C.muted, marginTop: 3 },
  legal: { fontSize: 11, color: C.muted, marginTop: 24, lineHeight: 16, textAlign: 'center' },
});
