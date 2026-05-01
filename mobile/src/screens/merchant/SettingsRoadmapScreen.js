import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { t, getLang } from '../../utils/i18n';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', border:'#E4DCC9' };

const FEATURES = {
  team:     { icon: 'people-outline',         titleKey: 'roadmap.team.title',     bodyKey: 'roadmap.team.body' },
  catalog:  { icon: 'pricetags-outline',      titleKey: 'roadmap.catalog.title',  bodyKey: 'roadmap.catalog.body' },
  invoices: { icon: 'document-text-outline',  titleKey: 'roadmap.invoices.title', bodyKey: 'roadmap.invoices.body' },
};

export default function SettingsRoadmapScreen({ navigation, route }) {
  const { user } = useAuth();
  const lang = getLang(user);
  const feature = FEATURES[route?.params?.feature] || FEATURES.team;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={C.ink} />
        </TouchableOpacity>
        <Text style={s.title}>{t(feature.titleKey, lang)}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
        <View style={s.iconBubble}>
          <Ionicons name={feature.icon} size={42} color={C.forest} />
        </View>
        <View style={s.etaPill}>
          <Ionicons name="time-outline" size={14} color={C.bronze} />
          <Text style={s.etaText}>{t('roadmap.eta', lang)}</Text>
        </View>
        <Text style={s.bigTitle}>{t(feature.titleKey, lang)}</Text>
        <Text style={s.body}>{t(feature.bodyKey, lang)}</Text>
        <Text style={s.notify}>{t('roadmap.notify', lang)}</Text>

        <TouchableOpacity style={s.contactBtn} onPress={() => Linking.openURL('mailto:support@argidrop.com')}>
          <Ionicons name="mail-outline" size={18} color={C.forest} />
          <Text style={s.contactText}>{t('roadmap.contactSupport', lang)}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.cream },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.paper },
  backBtn: { padding: 8 },
  title: { fontSize: 17, fontWeight: '600', color: C.ink, marginLeft: 4 },
  iconBubble: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#EFEAD8', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 24 },
  etaPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', backgroundColor: '#FBF5E5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, marginTop: 16, gap: 6 },
  etaText: { fontSize: 12, color: C.bronze, fontWeight: '600' },
  bigTitle: { fontSize: 22, fontWeight: '700', color: C.ink, textAlign: 'center', marginTop: 18 },
  body: { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 21, marginTop: 12 },
  notify: { fontSize: 13, color: C.forest, textAlign: 'center', marginTop: 20, fontStyle: 'italic' },
  contactBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper, borderWidth: 1, borderColor: C.border, padding: 14, borderRadius: 12, marginTop: 28, gap: 8 },
  contactText: { fontSize: 14, color: C.forest, fontWeight: '600' },
});
