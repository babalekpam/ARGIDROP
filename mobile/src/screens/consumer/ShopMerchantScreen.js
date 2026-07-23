import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Image, Alert, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { t, getLang } from '../../utils/i18n';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', red:'#B23A48' };

const DELIVERY_FEE = 800;      // XOF — mirrors the backend default
const SERVICE_FEE_RATE = 0.03; // mirrors the backend

export default function ConsumerShopMerchantScreen({ navigation, route }) {
  const { user } = useAuth();
  const lang = getLang(user);
  const slug = route?.params?.slug;

  const [merchant, setMerchant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState({});
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(null);

  useEffect(() => {
    api.get(`/listings/public/merchants/${slug}`)
      .then(r => setMerchant(r.data.merchant))
      .catch(() => setMerchant(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={C.forest} />
    </SafeAreaView>
  );

  if (!merchant) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <Text style={{ color: C.muted, marginBottom: 16 }}>{t('consumer.emptyShop', lang)}</Text>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={{ color: C.forest, fontWeight: '600' }}>{t('consumer.backToShops', lang)}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  const listings = (merchant.listings || []).filter(l => l.price != null);
  const byCategory = listings.reduce((acc, l) => {
    const cat = l.category || t('consumer.products', lang);
    (acc[cat] = acc[cat] || []).push(l);
    return acc;
  }, {});

  const items = Object.values(cart);
  const subtotal = items.reduce((sum, { item, qty }) => sum + parseFloat(item.price) * qty, 0);
  const serviceFee = Math.round(subtotal * SERVICE_FEE_RATE);
  const total = subtotal + DELIVERY_FEE + serviceFee;
  const minOrder = parseFloat(merchant.minimumOrderAmount || 0);
  const companyName = merchant.business?.companyName || slug;

  const add = item => setCart(p => ({ ...p, [item.id]: { item, qty: (p[item.id]?.qty || 0) + 1 } }));
  const remove = item => setCart(p => {
    const qty = (p[item.id]?.qty || 0) - 1;
    const n = { ...p };
    if (qty <= 0) delete n[item.id]; else n[item.id] = { item, qty };
    return n;
  });

  const placeOrder = async () => {
    if (!address.trim()) return Alert.alert('', t('consumer.addressRequired', lang));
    if (subtotal < minOrder) return Alert.alert('', `${t('consumer.belowMinOrder', lang)} ${Math.round(minOrder)} XOF`);
    setPlacing(true);
    try {
      const res = await api.post('/listings/orders', {
        merchantSlug: slug,
        items: items.map(({ item, qty }) => ({ listingId: item.id, quantity: qty })),
        deliveryAddress: address.trim(),
        deliveryNotes: notes.trim() || undefined,
        cashOnDelivery: true,
      });
      setPlaced(res.data);
      setCart({});
    } catch (err) {
      Alert.alert(t('consumer.orderFailed', lang), err.response?.data?.error || err.response?.data?.message || '');
    } finally { setPlacing(false); }
  };

  if (placed) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Ionicons name="checkmark-circle" size={56} color={C.forest} />
        <Text style={s.placedTitle}>{t('consumer.orderPlaced', lang)}</Text>
        <Text style={s.placedBody}>{companyName} {t('consumer.orderPlacedBody', lang)}</Text>
        <View style={s.placedCard}>
          <View style={s.rowBetween}><Text style={s.rowLabel}>{t('consumer.orderNumber', lang)}</Text><Text style={s.rowValue}>{placed.trackingToken}</Text></View>
          <View style={s.rowBetween}><Text style={s.rowLabel}>{t('consumer.total', lang)}</Text><Text style={[s.rowValue, { fontWeight: '700' }]}>{Math.round(placed.order?.total || total)} XOF</Text></View>
          <View style={s.rowBetween}><Text style={s.rowLabel}>{t('consumer.cashOnDelivery', lang)}</Text><Ionicons name="cash-outline" size={18} color={C.bronze} /></View>
        </View>
        <TouchableOpacity style={s.btn} onPress={() => navigation.goBack()}>
          <Text style={s.btnText}>{t('consumer.backToShops', lang)}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
          {merchant.coverPhotoUrl ? <Image source={{ uri: merchant.coverPhotoUrl }} style={s.cover} /> : null}
          <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 8 }}>
              <Ionicons name="chevron-back" size={26} color={C.forest} />
            </TouchableOpacity>
            <Text style={s.name}>{companyName}</Text>
            {merchant.tagline ? <Text style={s.meta}>{merchant.tagline}</Text> : null}
            {minOrder > 0 ? <Text style={s.minOrder}>{t('consumer.minOrder', lang)}: {Math.round(minOrder)} XOF</Text> : null}

            <Text style={s.sectionTitle}>{t('consumer.products', lang)}</Text>
            {listings.length === 0 ? (
              <Text style={s.empty}>{t('consumer.emptyShop', lang)}</Text>
            ) : Object.entries(byCategory).map(([cat, catItems]) => (
              <View key={cat} style={{ marginBottom: 18 }}>
                <Text style={s.category}>{cat}</Text>
                {catItems.map(item => {
                  const qty = cart[item.id]?.qty || 0;
                  const photo = (item.photos || []).find(p => p.isPrimary) || (item.photos || [])[0];
                  const outOfStock = item.inStock === false;
                  return (
                    <View key={item.id} style={[s.itemRow, outOfStock && { opacity: 0.55 }]}>
                      {photo ? <Image source={{ uri: photo.fileUrl }} style={s.itemImg} /> : null}
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={s.itemName}>{item.name}</Text>
                        {item.description ? <Text style={s.itemDesc} numberOfLines={2}>{item.description}</Text> : null}
                        <Text style={s.itemPrice}>
                          {Math.round(parseFloat(item.price))} XOF{item.unit ? ` / ${item.unit}` : ''}
                          {outOfStock ? `  ·  ${t('consumer.outOfStock', lang)}` : ''}
                        </Text>
                      </View>
                      {outOfStock ? null : qty === 0 ? (
                        <TouchableOpacity style={s.addBtn} onPress={() => add(item)}>
                          <Ionicons name="add" size={20} color={C.paper} />
                        </TouchableOpacity>
                      ) : (
                        <View style={s.qtyWrap}>
                          <TouchableOpacity onPress={() => remove(item)} style={s.qtyBtn}><Ionicons name="remove" size={18} color={C.forest} /></TouchableOpacity>
                          <Text style={s.qtyText}>{qty}</Text>
                          <TouchableOpacity onPress={() => add(item)} style={s.qtyBtn}><Ionicons name="add" size={18} color={C.forest} /></TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}

            {items.length > 0 && (
              <View style={s.checkout}>
                <Text style={s.sectionTitle}>{t('consumer.yourOrder', lang)}</Text>
                <View style={s.rowBetween}><Text style={s.rowLabel}>{t('consumer.subtotal', lang)}</Text><Text style={s.rowValue}>{Math.round(subtotal)} XOF</Text></View>
                <View style={s.rowBetween}><Text style={s.rowLabel}>{t('consumer.deliveryFee', lang)}</Text><Text style={s.rowValue}>{DELIVERY_FEE} XOF</Text></View>
                <View style={s.rowBetween}><Text style={s.rowLabel}>{t('consumer.serviceFee', lang)}</Text><Text style={s.rowValue}>{serviceFee} XOF</Text></View>
                <View style={[s.rowBetween, { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8, marginTop: 4 }]}>
                  <Text style={[s.rowLabel, { fontWeight: '700', color: C.ink }]}>{t('consumer.total', lang)}</Text>
                  <Text style={[s.rowValue, { fontWeight: '700' }]}>{Math.round(total)} XOF</Text>
                </View>

                <Text style={s.label}>{t('consumer.deliveryAddress', lang)}</Text>
                <TextInput style={s.input} value={address} onChangeText={setAddress} placeholder={t('consumer.addressPlaceholder', lang)} placeholderTextColor={C.subtle} multiline />
                <Text style={s.label}>{t('consumer.notes', lang)}</Text>
                <TextInput style={s.input} value={notes} onChangeText={setNotes} placeholderTextColor={C.subtle} />

                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                  <Ionicons name="cash-outline" size={16} color={C.bronze} />
                  <Text style={{ marginLeft: 6, fontSize: 12, color: C.muted }}>{t('consumer.cashOnDelivery', lang)}</Text>
                </View>

                <TouchableOpacity style={[s.btn, placing && { opacity: 0.7 }]} onPress={placeOrder} disabled={placing}>
                  {placing ? <ActivityIndicator color={C.paper} /> : <Text style={s.btnText}>{t('consumer.placeOrder', lang)} · {Math.round(total)} XOF</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  cover: { width: '100%', height: 160, backgroundColor: C.cream },
  name: { fontFamily: 'serif', fontSize: 24, fontWeight: '700', color: C.forest, letterSpacing: -0.5 },
  meta: { fontSize: 13, color: C.muted, marginTop: 3 },
  minOrder: { fontSize: 12, color: C.bronze, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: C.ink, marginTop: 20, marginBottom: 10 },
  category: { fontSize: 13, fontWeight: '700', color: C.bronze, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  itemRow: { backgroundColor: C.paper, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  itemImg: { width: 52, height: 52, borderRadius: 8, marginRight: 10, backgroundColor: C.cream },
  itemName: { fontSize: 14, fontWeight: '600', color: C.ink },
  itemDesc: { fontSize: 12, color: C.muted, marginTop: 2 },
  itemPrice: { fontSize: 13, color: C.forest, fontWeight: '600', marginTop: 4 },
  addBtn: { backgroundColor: C.forest, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  qtyWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.cream, borderRadius: 17, borderWidth: 1, borderColor: C.border },
  qtyBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 14, fontWeight: '600', color: C.ink, minWidth: 20, textAlign: 'center' },
  checkout: { marginTop: 8, backgroundColor: C.paper, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 16 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  rowLabel: { fontSize: 13, color: C.muted },
  rowValue: { fontSize: 13, color: C.ink },
  label: { fontSize: 12, color: C.muted, fontWeight: '600', marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: C.cream, borderWidth: 1, borderColor: C.border, borderRadius: 6, padding: 12, fontSize: 14, color: C.ink },
  btn: { backgroundColor: C.forest, borderRadius: 6, padding: 14, alignItems: 'center', marginTop: 16, alignSelf: 'stretch' },
  btnText: { color: C.paper, fontWeight: '600', fontSize: 15 },
  empty: { fontSize: 13, color: C.muted, backgroundColor: C.paper, borderRadius: 8, borderWidth: 1, borderColor: C.border, padding: 14 },
  placedTitle: { fontFamily: 'serif', fontSize: 22, fontWeight: '700', color: C.forest, marginTop: 14 },
  placedBody: { fontSize: 14, color: C.muted, textAlign: 'center', marginTop: 6 },
  placedCard: { alignSelf: 'stretch', backgroundColor: C.paper, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 16, marginTop: 20 },
});
