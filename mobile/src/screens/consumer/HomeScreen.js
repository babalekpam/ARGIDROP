import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Image, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { t, getLang } from '../../utils/i18n';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', red:'#B23A48' };

export default function ConsumerHomeScreen({ navigation }) {
  const { user } = useAuth();
  const lang = getLang(user);
  const [restaurants, setRestaurants] = useState([]);
  const [shops, setShops] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const [rRes, sRes] = await Promise.all([
        api.get('/food?limit=6').catch(() => ({ data: { restaurants: [] } })),
        api.get('/listings/public/merchants?limit=6').catch(() => ({ data: { merchants: [] } })),
      ]);
      setRestaurants(rRes.data.restaurants || rRes.data || []);
      setShops(sRes.data.merchants || sRes.data || []);
    } catch (e) {
      setError(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const Action = ({ icon, title, desc, onPress }) => (
    <TouchableOpacity style={s.action} onPress={onPress} activeOpacity={0.85}>
      <View style={s.actionIcon}><Ionicons name={icon} size={24} color={C.forest} /></View>
      <View style={{ flex: 1 }}>
        <Text style={s.actionTitle}>{title}</Text>
        <Text style={s.actionDesc}>{desc}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={C.bronze} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
      <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.forest} />}>
        <Text style={s.greeting}>{t('consumer.greeting', lang)}, {user?.firstName} 👋</Text>
        <Text style={s.subtitle}>{t('consumer.homeSubtitle', lang)}</Text>

        <Action icon="restaurant-outline" title={t('consumer.actionFood', lang)} desc={t('consumer.actionFoodDesc', lang)}
          onPress={() => navigation.navigate('Food')} />
        <Action icon="bag-handle-outline" title={t('consumer.actionShops', lang)} desc={t('consumer.actionShopsDesc', lang)}
          onPress={() => navigation.navigate('Food')} />
        <Action icon="car-outline" title={t('consumer.actionRide', lang)} desc={t('consumer.actionRideDesc', lang)}
          onPress={() => navigation.navigate('Rides')} />

        {error ? <Text style={s.error}>{t('consumer.loadFailed', lang)}</Text> : null}

        <View style={s.sectionHead}>
          <Text style={s.sectionTitle}>{t('consumer.restaurants', lang)}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Food')}>
            <Text style={s.seeAll}>{t('consumer.seeAll', lang)}</Text>
          </TouchableOpacity>
        </View>
        {restaurants.length === 0 ? (
          <Text style={s.empty}>{t('consumer.noRestaurants', lang)}</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20 }}>
            {restaurants.map(r => (
              <TouchableOpacity key={r.id} style={s.card} activeOpacity={0.85}
                onPress={() => navigation.navigate('FoodRestaurant', { idOrSlug: r.slug || r.id })}>
                {r.coverImageUrl ? <Image source={{ uri: r.coverImageUrl }} style={s.cardImg} /> : <View style={[s.cardImg, s.cardImgPh]}><Ionicons name="restaurant-outline" size={28} color={C.subtle} /></View>}
                <Text style={s.cardName} numberOfLines={1}>{r.name}</Text>
                <Text style={s.cardMeta} numberOfLines={1}>
                  {r.cuisineType || ''}{r.isOpen === false ? ` · ${t('consumer.closed', lang)}` : r.estimatedPrepTimeMinutes ? ` · ${r.estimatedPrepTimeMinutes} ${t('consumer.min', lang)}` : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={s.sectionHead}>
          <Text style={s.sectionTitle}>{t('consumer.shops', lang)}</Text>
        </View>
        {shops.length === 0 ? (
          <Text style={s.empty}>{t('consumer.noShops', lang)}</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20 }}>
            {shops.map(m => (
              <View key={m.id} style={s.card}>
                {m.logoUrl ? <Image source={{ uri: m.logoUrl }} style={s.cardImg} /> : <View style={[s.cardImg, s.cardImgPh]}><Ionicons name="storefront-outline" size={28} color={C.subtle} /></View>}
                <Text style={s.cardName} numberOfLines={1}>{m.companyName || m.name}</Text>
                <Text style={s.cardMeta} numberOfLines={1}>{m.city || ''}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  greeting: { fontFamily: 'serif', fontSize: 26, fontWeight: '700', color: C.forest, letterSpacing: -0.5, marginTop: 8 },
  subtitle: { fontSize: 14, color: C.muted, marginTop: 4, marginBottom: 18 },
  action: { backgroundColor: C.paper, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: C.border, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  actionIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1, borderColor: C.border },
  actionTitle: { fontSize: 15, fontWeight: '600', color: C.ink },
  actionDesc: { fontSize: 12, color: C.muted, marginTop: 2 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: C.ink },
  seeAll: { fontSize: 13, color: C.bronze, fontWeight: '600' },
  card: { width: 150, backgroundColor: C.paper, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 10, marginRight: 10 },
  cardImg: { width: '100%', height: 84, borderRadius: 6, marginBottom: 8, backgroundColor: C.cream },
  cardImgPh: { alignItems: 'center', justifyContent: 'center' },
  cardName: { fontSize: 13, fontWeight: '600', color: C.ink },
  cardMeta: { fontSize: 11, color: C.muted, marginTop: 2 },
  empty: { fontSize: 13, color: C.muted, backgroundColor: C.paper, borderRadius: 8, borderWidth: 1, borderColor: C.border, padding: 14 },
  error: { fontSize: 13, color: C.red, marginTop: 10 },
});
