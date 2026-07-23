import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, Image, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { t, getLang } from '../../utils/i18n';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', red:'#B23A48' };

export default function ConsumerShopsScreen({ navigation }) {
  const { user } = useAuth();
  const lang = getLang(user);
  const [merchants, setMerchants] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await api.get('/listings/public/merchants?limit=50');
      const rows = res.data.merchants || [];
      // Only merchants with a public slug can be browsed
      setMerchants(rows.filter(m => m.profile?.slug));
    } catch (e) {
      setError(true);
    } finally { setLoaded(true); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
        data={merchants}
        keyExtractor={m => String(m.profile.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.forest} />}
        ListHeaderComponent={
          <View style={{ marginBottom: 16 }}>
            <Text style={s.title}>{t('consumer.shopsTitle', lang)}</Text>
            <Text style={s.subtitle}>{t('consumer.shopsSubtitle', lang)}</Text>
            {error ? <Text style={s.error}>{t('consumer.loadFailed', lang)}</Text> : null}
          </View>
        }
        ListEmptyComponent={loaded && !error ? <Text style={s.empty}>{t('consumer.noShops', lang)}</Text> : null}
        renderItem={({ item: m }) => {
          const p = m.profile;
          const b = m.business || {};
          const cats = Array.isArray(p.categories) ? p.categories.join(' · ') : '';
          return (
            <TouchableOpacity style={s.card} activeOpacity={0.85}
              onPress={() => navigation.navigate('ShopMerchant', { slug: p.slug })}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {p.logoUrl
                  ? <Image source={{ uri: p.logoUrl }} style={s.logo} />
                  : <View style={[s.logo, s.logoPh]}><Ionicons name="storefront-outline" size={26} color={C.subtle} /></View>}
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.name} numberOfLines={1}>{b.companyName || p.slug}</Text>
                  {p.tagline ? <Text style={s.tagline} numberOfLines={1}>{p.tagline}</Text> : null}
                  <Text style={s.meta} numberOfLines={1}>
                    {[b.city, cats || null, p.rating && parseFloat(p.rating) > 0 ? `★ ${Number(p.rating).toFixed(1)}` : null].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={C.bronze} />
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  title: { fontFamily: 'serif', fontSize: 24, fontWeight: '700', color: C.forest, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: C.muted, marginTop: 4 },
  card: { backgroundColor: C.paper, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginBottom: 12, padding: 14 },
  logo: { width: 54, height: 54, borderRadius: 10, backgroundColor: C.cream },
  logoPh: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  name: { fontSize: 15, fontWeight: '600', color: C.ink },
  tagline: { fontSize: 12, color: C.muted, marginTop: 2 },
  meta: { fontSize: 11, color: C.subtle, marginTop: 3 },
  empty: { fontSize: 13, color: C.muted, backgroundColor: C.paper, borderRadius: 8, borderWidth: 1, borderColor: C.border, padding: 14 },
  error: { fontSize: 13, color: C.red, marginTop: 10 },
});
