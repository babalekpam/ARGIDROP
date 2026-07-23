import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, RefreshControl, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { t, getLang } from '../../utils/i18n';
import api from '../../utils/api';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', red:'#B23A48' };

export default function SettingsTeamScreen({ navigation }) {
  const { user } = useAuth();
  const lang = getLang(user);

  const [team, setTeam] = useState(null); // { owner, staff, myRole }
  const [refreshing, setRefreshing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [tempCred, setTempCred] = useState(null); // { email, password }

  const load = useCallback(async () => {
    try {
      const res = await api.get('/businesses/team');
      setTeam(res.data);
    } catch (e) {
      setTeam(null);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const isOwner = team?.myRole === 'OWNER';

  const addMember = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      return Alert.alert('', t('team.fillRequired', lang));
    }
    setAdding(true);
    try {
      const res = await api.post('/businesses/team', {
        firstName: firstName.trim(), lastName: lastName.trim(),
        email: email.trim().toLowerCase(), phone: phone.trim() || undefined,
      });
      setTempCred({ email: res.data.member.user.email, password: res.data.tempPassword });
      setFirstName(''); setLastName(''); setEmail(''); setPhone('');
      setShowForm(false);
      load();
    } catch (err) {
      Alert.alert(t('team.addFailed', lang), err.response?.data?.message || '');
    } finally { setAdding(false); }
  };

  const removeMember = (member) => {
    Alert.alert(
      t('team.removeTitle', lang),
      `${member.user?.firstName} ${member.user?.lastName} — ${t('team.removeBody', lang)}`,
      [
        { text: t('common.cancel', lang) },
        { text: t('team.remove', lang), style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/businesses/team/${member.staffId}`);
            load();
          } catch (err) {
            Alert.alert('', err.response?.data?.message || '');
          }
        } },
      ]
    );
  };

  const Member = ({ name, email: memberEmail, badge, onRemove }) => (
    <View style={s.member}>
      <View style={s.avatar}><Ionicons name="person" size={18} color={C.bronze} /></View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={s.memberName}>{name}</Text>
        <Text style={s.memberEmail} numberOfLines={1}>{memberEmail}</Text>
      </View>
      <View style={s.badge}><Text style={s.badgeText}>{badge}</Text></View>
      {onRemove ? (
        <TouchableOpacity onPress={onRemove} style={{ marginLeft: 10, padding: 4 }}>
          <Ionicons name="trash-outline" size={18} color={C.red} />
        </TouchableOpacity>
      ) : null}
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={C.ink} />
        </TouchableOpacity>
        <Text style={s.title}>{t('team.title', lang)}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.forest} />}
        keyboardShouldPersistTaps="handled">
        <Text style={s.subtitle}>{t('team.subtitle', lang)}</Text>

        {tempCred && (
          <View style={s.credCard}>
            <Ionicons name="key-outline" size={18} color={C.forest} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={s.credTitle}>{t('team.credTitle', lang)}</Text>
              <Text style={s.credLine}>{tempCred.email}</Text>
              <Text style={[s.credLine, { fontWeight: '700' }]}>{tempCred.password}</Text>
              <Text style={s.credHint}>{t('team.credHint', lang)}</Text>
            </View>
            <TouchableOpacity onPress={() => setTempCred(null)}><Ionicons name="close" size={18} color={C.muted} /></TouchableOpacity>
          </View>
        )}

        {!team ? (
          <ActivityIndicator color={C.forest} style={{ marginTop: 24 }} />
        ) : (
          <>
            {team.owner ? (
              <Member name={`${team.owner.firstName} ${team.owner.lastName}`} email={team.owner.email} badge={t('team.owner', lang)} />
            ) : null}
            {(team.staff || []).map(m => (
              <Member key={m.staffId}
                name={`${m.user?.firstName || ''} ${m.user?.lastName || ''}`}
                email={m.user?.email || ''}
                badge={t('team.staff', lang)}
                onRemove={isOwner ? () => removeMember(m) : null} />
            ))}
            {(team.staff || []).length === 0 && (
              <Text style={s.empty}>{t('team.empty', lang)}</Text>
            )}
          </>
        )}

        {isOwner && !showForm && (
          <TouchableOpacity style={s.btn} onPress={() => setShowForm(true)}>
            <Ionicons name="person-add-outline" size={18} color="#fff" />
            <Text style={s.btnText}>  {t('team.add', lang)}</Text>
          </TouchableOpacity>
        )}

        {isOwner && showForm && (
          <View style={s.form}>
            <Text style={s.formTitle}>{t('team.add', lang)}</Text>
            <Text style={s.label}>{t('personal.firstName', lang)}</Text>
            <TextInput style={s.input} value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
            <Text style={s.label}>{t('personal.lastName', lang)}</Text>
            <TextInput style={s.input} value={lastName} onChangeText={setLastName} autoCapitalize="words" />
            <Text style={s.label}>{t('personal.email', lang)}</Text>
            <TextInput style={s.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            <Text style={s.label}>{t('personal.phone', lang)}</Text>
            <TextInput style={s.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+228 90 00 00 00" placeholderTextColor={C.subtle} />
            <TouchableOpacity style={[s.btn, adding && { opacity: 0.6 }]} onPress={addMember} disabled={adding}>
              {adding ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>{t('team.create', lang)}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={{ alignItems: 'center', marginTop: 12 }} onPress={() => setShowForm(false)}>
              <Text style={{ color: C.muted, fontSize: 13 }}>{t('common.cancel', lang)}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.cream },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.paper },
  backBtn: { padding: 8 },
  title: { fontSize: 17, fontWeight: '600', color: C.ink, marginLeft: 4 },
  subtitle: { fontSize: 13, color: C.muted, lineHeight: 19, marginBottom: 16 },
  member: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.paper, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 8 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  memberName: { fontSize: 14, fontWeight: '600', color: C.ink },
  memberEmail: { fontSize: 12, color: C.muted, marginTop: 1 },
  badge: { backgroundColor: C.cream, borderRadius: 6, borderWidth: 1, borderColor: C.border, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '700', color: C.bronze, letterSpacing: 0.4 },
  empty: { fontSize: 13, color: C.muted, backgroundColor: C.paper, borderRadius: 8, borderWidth: 1, borderColor: C.border, padding: 14, marginTop: 4 },
  btn: { flexDirection: 'row', backgroundColor: C.forest, padding: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  form: { backgroundColor: C.paper, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 16, marginTop: 20 },
  formTitle: { fontSize: 15, fontWeight: '600', color: C.ink },
  label: { fontSize: 13, fontWeight: '600', color: C.ink, marginTop: 14, marginBottom: 6 },
  input: { backgroundColor: C.cream, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.ink },
  credCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#EAF3ED', borderRadius: 10, borderWidth: 1, borderColor: C.forest, padding: 14, marginBottom: 16 },
  credTitle: { fontSize: 13, fontWeight: '700', color: C.forest },
  credLine: { fontSize: 13, color: C.ink, marginTop: 3 },
  credHint: { fontSize: 11, color: C.muted, marginTop: 6, lineHeight: 15 },
});
