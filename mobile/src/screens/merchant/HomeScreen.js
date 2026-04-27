import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LanguageContext';
import { t } from '../../utils/i18n';
import api from '../../utils/api';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', red:'#B23A48', amber:'#C28B2C' };

const STATUS_COLOR = {
  AWAITING_PAYMENT: C.amber,
  POSTED: C.bronze,
  MATCHED: C.forest,
  IN_TRANSIT: C.forest,
  DELIVERED: C.forest,
  COMPLETED: C.muted,
  CANCELLED: C.red,
  DISPUTED: C.red,
};

export default function MerchantHomeScreen({ navigation }) {
  const { user } = useAuth();
  const { lang } = useLang();
  const [active, setActive] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await api.get('/jobs', { params: { status: 'POSTED,MATCHED,IN_TRANSIT,AWAITING_PAYMENT' } });
      setActive(res.data.jobs || res.data.data || []);
    } catch (e) {
      // silent — empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = () => { setRefreshing(true); load(); };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>{t('merchantHome.hello', lang, { name: user?.firstName || t('merchantHome.thereName', lang) })}</Text>
          <Text style={s.companyName}>{user?.businessProfile?.companyName || t('merchantHome.yourBusiness', lang)}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
          <Ionicons name="notifications-outline" size={24} color={C.forest} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 12 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.forest} />}>
        <TouchableOpacity style={s.cta} activeOpacity={0.9} onPress={() => navigation.navigate('NewDelivery')}>
          <View style={{ flex: 1 }}>
            <Text style={s.ctaTitle}>{t('merchantHome.send', lang)}</Text>
            <Text style={s.ctaSub}>{t('merchantHome.sendSub', lang)}</Text>
          </View>
          <View style={s.ctaIcon}><Ionicons name="add" size={28} color={C.paper} /></View>
        </TouchableOpacity>

        <Text style={s.sectionTitle}>{t('merchantHome.activeDeliveries', lang)}</Text>
        {loading ? <ActivityIndicator color={C.forest} style={{ marginTop: 24 }} /> :
         active.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="cube-outline" size={36} color={C.subtle} />
            <Text style={s.emptyTitle}>{t('merchantHome.noActive', lang)}</Text>
            <Text style={s.emptySub}>{t('merchantHome.noActiveSub', lang)}</Text>
          </View>
         ) : active.map(job => (
          <TouchableOpacity key={job.id} style={s.jobCard} onPress={() => navigation.navigate('JobDetail', { jobId: job.id })} activeOpacity={0.85}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={s.jobRef}>#{(job.referenceCode || job.id || '').toString().slice(-6).toUpperCase()}</Text>
              <Text style={[s.jobStatus, { color: STATUS_COLOR[job.status] || C.muted }]}>{t(`status.${job.status}`, lang)}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Ionicons name="ellipse" size={8} color={C.bronze} />
              <Text style={s.jobAddr} numberOfLines={1}>{job.pickupAddress || t('merchantHome.pickup', lang)}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="location" size={10} color={C.forest} />
              <Text style={s.jobAddr} numberOfLines={1}>{job.dropoffAddress || t('merchantHome.dropoff', lang)}</Text>
            </View>
          </TouchableOpacity>
         ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.cream },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greeting: { fontSize: 13, color: C.muted },
  companyName: { fontSize: 20, fontWeight: '600', color: C.ink, marginTop: 2 },
  cta: { backgroundColor: C.forest, borderRadius: 14, padding: 18, flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  ctaTitle: { color: C.paper, fontSize: 17, fontWeight: '600' },
  ctaSub: { color: '#D7CDB7', fontSize: 13, marginTop: 2 },
  ctaIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 11, color: C.muted, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 },
  jobCard: { backgroundColor: C.paper, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: C.border, marginBottom: 10 },
  jobRef: { fontSize: 12, color: C.bronze, fontWeight: '700', letterSpacing: 1 },
  jobStatus: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  jobAddr: { fontSize: 13, color: C.ink, marginLeft: 10, flex: 1 },
  empty: { alignItems: 'center', paddingVertical: 36 },
  emptyTitle: { fontSize: 15, color: C.ink, marginTop: 10, fontWeight: '600' },
  emptySub: { fontSize: 13, color: C.muted, marginTop: 4, textAlign: 'center', paddingHorizontal: 32 },
});
