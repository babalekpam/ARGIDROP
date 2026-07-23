import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { t, getLang } from '../../utils/i18n';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', red:'#B23A48' };

const Row = ({ icon, label, hint, onPress, value }) => (
  <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.7}>
    <View style={s.rowIcon}><Ionicons name={icon} size={20} color={C.forest} /></View>
    <View style={{ flex: 1 }}>
      <Text style={s.rowLabel}>{label}</Text>
      {hint ? <Text style={s.rowHint}>{hint}</Text> : null}
    </View>
    {value ? <Text style={s.rowValue}>{value}</Text> : null}
    <Ionicons name="chevron-forward" size={20} color={C.subtle} />
  </TouchableOpacity>
);

export default function MerchantMoreScreen({ navigation }) {
  const { user, logout } = useAuth();
  const lang = getLang(user);

  const confirmLogout = () => {
    Alert.alert(t('more.signOut.confirmTitle', lang), t('more.signOut.confirmBody', lang), [
      { text: lang === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
      { text: t('more.signOut', lang), style: 'destructive', onPress: logout },
    ]);
  };

  const langValue = lang === 'fr' ? 'Français' : 'English';

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={s.header}>
        <View style={s.avatar}><Text style={s.avatarText}>{(user?.firstName?.[0] || 'M').toUpperCase()}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{user?.firstName} {user?.lastName}</Text>
          <Text style={s.email}>{user?.email}</Text>
          {user?.businessProfile?.companyName ? <Text style={s.company}>{user.businessProfile.companyName}</Text> : null}
        </View>
      </View>

      <Text style={s.section}>{t('more.section.business', lang)}</Text>
      <View style={s.group}>
        <Row icon="business-outline" label={t('more.businessProfile', lang)} hint={t('more.businessProfileHint', lang)}
             onPress={() => navigation.navigate('SettingsBusiness')} />
        <Row icon="people-outline" label={t('more.team', lang)} hint={t('more.teamHint', lang)}
             onPress={() => navigation.navigate('SettingsTeam')} />
        <Row icon="grid-outline" label={t('more.catalog', lang)} hint={t('more.catalogHint', lang)}
             onPress={() => navigation.navigate('Catalog')} />
        <Row icon="document-text-outline" label={t('more.invoices', lang)} hint={t('more.invoicesHint', lang)}
             onPress={() => navigation.navigate('SettingsRoadmap', { feature: 'invoices' })} />
      </View>

      <Text style={s.section}>{t('more.section.grow', lang)}</Text>
      <View style={s.group}>
        <Row icon="gift-outline" label={t('more.invite', lang)} hint={t('more.inviteHint', lang)}
             onPress={() => navigation.navigate('Invite')} />
      </View>

      <Text style={s.section}>{t('more.section.account', lang)}</Text>
      <View style={s.group}>
        <Row icon="person-outline" label={t('more.personal', lang)}
             onPress={() => navigation.navigate('SettingsPersonal')} />
        <Row icon="lock-closed-outline" label={t('more.password', lang)}
             onPress={() => navigation.navigate('SettingsPassword')} />
        <Row icon="language-outline" label={t('more.language', lang)} value={langValue}
             onPress={() => navigation.navigate('SettingsLanguage')} />
        <Row icon="help-circle-outline" label={t('more.support', lang)}
             onPress={() => navigation.navigate('SettingsSupport')} />
        <Row icon="trash-outline" label={t('more.deleteAccount', lang)} hint={t('more.deleteAccountHint', lang)}
             onPress={() => navigation.navigate('DeleteAccount')} />
      </View>

      <TouchableOpacity style={s.signOut} onPress={confirmLogout}>
        <Ionicons name="log-out-outline" size={18} color={C.red} />
        <Text style={s.signOutText}>{t('more.signOut', lang)}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.cream },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 20, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.forest, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avatarText: { color: C.paper, fontWeight: '700', fontSize: 22 },
  name: { fontSize: 17, fontWeight: '600', color: C.ink },
  email: { fontSize: 13, color: C.muted, marginTop: 2 },
  company: { fontSize: 13, color: C.bronze, fontWeight: '600', marginTop: 2 },
  section: { fontSize: 11, color: C.muted, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 12, marginBottom: 8, paddingHorizontal: 20 },
  group: { backgroundColor: C.paper, marginHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  rowIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowLabel: { fontSize: 14, color: C.ink, fontWeight: '500' },
  rowHint: { fontSize: 12, color: C.muted, marginTop: 2 },
  rowValue: { fontSize: 13, color: C.bronze, marginRight: 8, fontWeight: '600' },
  signOut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 28, padding: 14 },
  signOutText: { color: C.red, fontWeight: '600', marginLeft: 8, fontSize: 14 },
});
