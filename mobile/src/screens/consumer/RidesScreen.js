import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { t, getLang } from '../../utils/i18n';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', red:'#B23A48' };

const VEHICLES = [
  { key: 'MOTO', icon: 'bicycle-outline', label: 'Moto' },
  { key: 'ZEMIDJAN', icon: 'bicycle-outline', label: 'Zémidjan' },
  { key: 'CAR', icon: 'car-outline', label: lang => (lang === 'fr' ? 'Voiture' : 'Car') },
  { key: 'TRICYCLE', icon: 'cube-outline', label: 'Tricycle' },
];

export default function ConsumerRidesScreen({ navigation }) {
  const { user } = useAuth();
  const lang = getLang(user);

  const [from, setFrom] = useState(null); // { lat, lng, address }
  const [to, setTo] = useState(null);
  const [vehicle, setVehicle] = useState('MOTO');
  const [estimate, setEstimate] = useState(null);
  const [estimating, setEstimating] = useState(false);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    if (!from || !to) { setEstimate(null); return; }
    let cancelled = false;
    setEstimating(true);
    api.post('/rides/estimate', {
      fromLat: from.lat, fromLng: from.lng, toLat: to.lat, toLng: to.lng, vehicleType: vehicle,
    })
      .then(res => { if (!cancelled) setEstimate(res.data); })
      .catch(() => { if (!cancelled) setEstimate(null); })
      .finally(() => { if (!cancelled) setEstimating(false); });
    return () => { cancelled = true; };
  }, [from, to, vehicle]);

  const pick = (mode, setter, current) => {
    navigation.navigate('MapPicker', {
      mode,
      initial: current ? { lat: current.lat, lng: current.lng, address: current.address } : null,
      onPick: loc => setter(loc),
    });
  };

  const book = async () => {
    if (!from || !to) return Alert.alert('', t('consumer.fillAddresses', lang));
    setBooking(true);
    try {
      const res = await api.post('/rides/request', {
        fromAddress: from.address, fromLat: from.lat, fromLng: from.lng,
        toAddress: to.address, toLat: to.lat, toLng: to.lng,
        vehicleType: vehicle, paymentMethod: 'CASH',
      });
      const status = res.data?.rideRequest?.status || res.data?.status;
      Alert.alert('', status === 'MATCHED' ? t('consumer.rideBookedMatched', lang) : t('consumer.rideBookedSearching', lang));
      setFrom(null); setTo(null); setEstimate(null);
    } catch (err) {
      Alert.alert(t('consumer.rideFailed', lang), err.response?.data?.error || err.response?.data?.message || '');
    } finally { setBooking(false); }
  };

  const AddressRow = ({ icon, label, value, onPress }) => (
    <TouchableOpacity style={s.addrRow} onPress={onPress} activeOpacity={0.8}>
      <Ionicons name={icon} size={18} color={C.bronze} style={{ marginRight: 10 }} />
      <View style={{ flex: 1 }}>
        <Text style={s.addrLabel}>{label}</Text>
        <Text style={[s.addrValue, !value && { color: C.subtle }]} numberOfLines={1}>
          {value || t('consumer.choosePlace', lang)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={C.subtle} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text style={s.title}>{t('consumer.rideTitle', lang)}</Text>
        <Text style={s.subtitle}>{t('consumer.rideSubtitle', lang)}</Text>

        <View style={s.card}>
          <AddressRow icon="radio-button-on-outline" label={t('consumer.rideFrom', lang)} value={from?.address}
            onPress={() => pick('pickup', setFrom, from)} />
          <View style={s.divider} />
          <AddressRow icon="location-outline" label={t('consumer.rideTo', lang)} value={to?.address}
            onPress={() => pick('dropoff', setTo, to)} />
        </View>

        <Text style={s.label}>{t('consumer.rideVehicle', lang)}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {VEHICLES.map(v => {
            const selected = vehicle === v.key;
            const label = typeof v.label === 'function' ? v.label(lang) : v.label;
            return (
              <TouchableOpacity key={v.key} style={[s.chip, selected && s.chipSel]} onPress={() => setVehicle(v.key)}>
                <Ionicons name={v.icon} size={16} color={selected ? C.paper : C.forest} />
                <Text style={[s.chipText, selected && { color: C.paper }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {estimating ? (
          <View style={s.estimateCard}><ActivityIndicator color={C.forest} size="small" /><Text style={s.estimateHint}>{t('consumer.estimating', lang)}</Text></View>
        ) : estimate ? (
          <View style={s.estimateCard}>
            <View style={s.rowBetween}><Text style={s.rowLabel}>{t('consumer.ridePrice', lang)}</Text><Text style={s.price}>{estimate.estimatedPrice} XOF</Text></View>
            <View style={s.rowBetween}><Text style={s.rowLabel}>{t('consumer.rideDistance', lang)}</Text><Text style={s.rowValue}>{estimate.distanceKm} km · {estimate.estimatedDurationMin} {t('consumer.min', lang)}</Text></View>
            {estimate.availableDriverCount > 0 ? (
              <Text style={s.drivers}>{estimate.availableDriverCount} {t('consumer.rideDrivers', lang)}</Text>
            ) : (
              <Text style={s.noDrivers}>{t('consumer.rideNoDrivers', lang)}</Text>
            )}
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
          <Ionicons name="cash-outline" size={16} color={C.bronze} />
          <Text style={{ marginLeft: 6, fontSize: 12, color: C.muted }}>{t('consumer.payCash', lang)}</Text>
        </View>

        <TouchableOpacity style={[s.btn, (booking || !from || !to) && { opacity: 0.6 }]} onPress={book} disabled={booking || !from || !to}>
          {booking ? <ActivityIndicator color={C.paper} /> : <Text style={s.btnText}>{t('consumer.rideBook', lang)}{estimate ? ` · ${estimate.estimatedPrice} XOF` : ''}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  title: { fontFamily: 'serif', fontSize: 24, fontWeight: '700', color: C.forest, letterSpacing: -0.5, marginTop: 8 },
  subtitle: { fontSize: 13, color: C.muted, marginTop: 4, marginBottom: 18 },
  card: { backgroundColor: C.paper, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, marginBottom: 18 },
  addrRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  addrLabel: { fontSize: 11, color: C.muted, fontWeight: '600', letterSpacing: 0.3 },
  addrValue: { fontSize: 14, color: C.ink, marginTop: 2 },
  divider: { height: 1, backgroundColor: C.border, marginLeft: 28 },
  label: { fontSize: 12, color: C.muted, fontWeight: '600', marginBottom: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.paper, borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9 },
  chipSel: { backgroundColor: C.forest, borderColor: C.forest },
  chipText: { fontSize: 13, fontWeight: '600', color: C.forest },
  estimateCard: { backgroundColor: C.paper, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 16, marginTop: 18, flexDirection: 'column', gap: 4 },
  estimateHint: { fontSize: 13, color: C.muted, marginTop: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2 },
  rowLabel: { fontSize: 13, color: C.muted },
  rowValue: { fontSize: 13, color: C.ink },
  price: { fontSize: 18, fontWeight: '700', color: C.forest },
  drivers: { fontSize: 12, color: C.forest, marginTop: 6 },
  noDrivers: { fontSize: 12, color: C.red, marginTop: 6 },
  btn: { backgroundColor: C.forest, borderRadius: 6, padding: 14, alignItems: 'center', marginTop: 14 },
  btnText: { color: C.paper, fontWeight: '600', fontSize: 15 },
});
