import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { t, getLang } from '../../utils/i18n';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', red:'#B23A48' };

const Row = ({ icon, label, onPress, value }) => (
  <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.7}>
    <View style={s.rowIcon}><Ionicons name={icon} size={20} color={C.forest} /></View>
    <Text style={s.rowLabel}>{label}</Text>
    {value ? <Text style={s.rowValue}>{value}</Text> : null}
    <Ionicons name="chevron-forward" size={20} color={C.subtle} />
  </TouchableOpacity>
);

export default function ConsumerMoreScreen({ navigation }) {
  const { user, logout } = useAuth();
  const lang = getLang(user);

  const confirmLogout = () => {
    Alert.alert(t('more.signOut.confirmTitle', lang), t('more.signOut.confirmBody', lang), [
      { text: lang === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
      { text: t('more.signOut', lang), style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
      <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={s.header}>
          <View style={s.avatar}><Text style={s.avatarText}>{(user?.firstName?.[0] || 'C').toUpperCase()}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{user?.firstName} {user?.lastName}</Text>
            <Text style={s.email}>{user?.email}</Text>
          </View>
        </View>

        <Text style={s.section}>{t('consumer.more.title', lang)}</Text>
        <View style={s.group}>
          <Row icon="person-outline" label={t('more.personal', lang)} onPress={() => navigation.navigate('SettingsPersonal')} />
          <Row icon="lock-closed-outline" label={t('more.password', lang)} onPress={() => navigation.navigate('SettingsPassword')} />
          <Row icon="language-outline" label={t('more.language', lang)} value={lang === 'fr' ? 'Français' : 'English'}
               onPress={() => navigation.navigate('SettingsLanguage')} />
          <Row icon="gift-outline" label={t('more.invite', lang)} onPress={() => navigation.navigate('Invite')} />
          <Row icon="help-circle-outline" label={t('more.support', lang)} onPress={() => navigation.navigate('SettingsSupport')} />
          <Row icon="trash-outline" label={t('more.deleteAccount', lang)} onPress={() => navigation.navigate('DeleteAccount')} />
        </View>

        <TouchableOpacity style={s.signOut} onPress={confirmLogout}>
          <Ionicons name="log-out-outline" size={18} color={C.red} />
          <Text style={s.signOutText}>{t('more.signOut', lang)}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 22, marginTop: 8 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.forest, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avatarText: { color: C.paper, fontSize: 20, fontWeight: '700' },
  name: { fontSize: 17, fontWeight: '600', color: C.ink },
  email: { fontSize: 13, color: C.muted, marginTop: 2 },
  section: { fontSize: 12, fontWeight: '700', color: C.bronze, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  group: { backgroundColor: C.paper, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginBottom: 20, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  rowIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowLabel: { flex: 1, fontSize: 14, color: C.ink, fontWeight: '500' },
  rowValue: { fontSize: 13, color: C.muted, marginRight: 6 },
  signOut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.paper },
  signOutText: { color: C.red, fontWeight: '600', fontSize: 14 },
});
