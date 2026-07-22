import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, Image, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { t, getLang } from '../../utils/i18n';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', red:'#B23A48' };

export default function ConsumerFoodScreen({ navigation }) {
  const { user } = useAuth();
  const lang = getLang(user);
  const [restaurants, setRestaurants] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await api.get('/food?limit=50');
      setRestaurants(res.data.restaurants || res.data || []);
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
        data={restaurants}
        keyExtractor={r => String(r.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.forest} />}
        ListHeaderComponent={
          <View style={{ marginBottom: 16 }}>
            <Text style={s.title}>{t('consumer.foodTitle', lang)}</Text>
            <Text style={s.subtitle}>{t('consumer.foodSubtitle', lang)}</Text>
            {error ? <Text style={s.error}>{t('consumer.loadFailed', lang)}</Text> : null}
          </View>
        }
        ListEmptyComponent={loaded && !error ? <Text style={s.empty}>{t('consumer.noRestaurants', lang)}</Text> : null}
        renderItem={({ item: r }) => (
          <TouchableOpacity style={s.card} activeOpacity={0.85}
            onPress={() => navigation.navigate('FoodRestaurant', { idOrSlug: r.slug || r.id })}>
            {r.coverImageUrl ? <Image source={{ uri: r.coverImageUrl }} style={s.img} /> : <View style={[s.img, s.imgPh]}><Ionicons name="restaurant-outline" size={30} color={C.subtle} /></View>}
            <View style={{ padding: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={s.name} numberOfLines={1}>{r.name}</Text>
                {r.isOpen === false ? <Text style={s.closed}>{t('consumer.closed', lang)}</Text> : null}
              </View>
              <Text style={s.meta} numberOfLines={1}>
                {[r.cuisineType, r.estimatedPrepTimeMinutes ? `${r.estimatedPrepTimeMinutes} ${t('consumer.min', lang)}` : null, r.averageRating ? `★ ${Number(r.averageRating).toFixed(1)}` : null].filter(Boolean).join(' · ')}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  title: { fontFamily: 'serif', fontSize: 24, fontWeight: '700', color: C.forest, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: C.muted, marginTop: 4 },
  card: { backgroundColor: C.paper, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginBottom: 14, overflow: 'hidden' },
  img: { width: '100%', height: 140, backgroundColor: C.cream },
  imgPh: { alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '600', color: C.ink, flex: 1, marginRight: 8 },
  closed: { fontSize: 11, color: C.red, fontWeight: '600' },
  meta: { fontSize: 12, color: C.muted, marginTop: 3 },
  empty: { fontSize: 13, color: C.muted, backgroundColor: C.paper, borderRadius: 8, borderWidth: 1, borderColor: C.border, padding: 14 },
  error: { fontSize: 13, color: C.red, marginTop: 10 },
});
