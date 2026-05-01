import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { t, getLang } from '../../utils/i18n';
import api from '../../utils/api';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9' };

export default function SettingsLanguageScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const lang = getLang(user);
  const [saving, setSaving] = useState(null);

  const choose = async (next) => {
    if (next === lang || saving) return;
    setSaving(next);
    try {
      await api.patch('/auth/me', { language: next });
      // refreshUser may throw if /auth/me momentarily fails — treat that as an
      // error so the picker doesn't pretend the change took effect.
      await refreshUser();
      Alert.alert(t('langScreen.saved', next));
      navigation.goBack();
    } catch (err) {
      Alert.alert(t('personal.errorTitle', lang), err.response?.data?.message || t('personal.errorBody', lang));
    } finally {
      setSaving(null);
    }
  };

  const Option = ({ code, label, note }) => {
    const selected = code === lang;
    const isSaving = saving === code;
    return (
      <TouchableOpacity style={[s.opt, selected && s.optSelected]} onPress={() => choose(code)} disabled={!!saving} activeOpacity={0.85}>
        <View style={{ flex: 1 }}>
          <Text style={[s.optLabel, selected && { color: C.forest }]}>{label}</Text>
          <Text style={s.optNote}>{note}</Text>
        </View>
        {isSaving
          ? <ActivityIndicator size="small" color={C.forest} />
          : selected
            ? <Ionicons name="checkmark-circle" size={24} color={C.forest} />
            : <View style={s.radio} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={C.ink} />
        </TouchableOpacity>
        <Text style={s.title}>{t('langScreen.title', lang)}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={s.subtitle}>{t('langScreen.subtitle', lang)}</Text>
        <View style={{ marginTop: 18 }}>
          <Option code="fr" label={t('langScreen.fr.label', lang)} note={t('langScreen.fr.note', lang)} />
          <Option code="en" label={t('langScreen.en.label', lang)} note={t('langScreen.en.note', lang)} />
        </View>
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
  opt: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.paper, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginBottom: 10 },
  optSelected: { borderColor: C.forest, backgroundColor: '#F0EBDD' },
  optLabel: { fontSize: 16, fontWeight: '600', color: C.ink },
  optNote: { fontSize: 12, color: C.muted, marginTop: 4 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.subtle },
});
