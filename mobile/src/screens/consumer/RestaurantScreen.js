import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Image, Alert, SafeAreaView, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { t, getLang } from '../../utils/i18n';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', red:'#B23A48' };

export default function ConsumerRestaurantScreen({ navigation, route }) {
  const { user } = useAuth();
  const lang = getLang(user);
  const idOrSlug = route?.params?.idOrSlug;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState({});
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(null);

  // Payment method: cash on delivery (default) or mobile money.
  const [pay, setPay] = useState('cash'); // 'cash' | 'momo'
  const [providers, setProviders] = useState(null);
  const [provider, setProvider] = useState(null);
  const [phone, setPhone] = useState(user?.phone || '');
  const [paymentUrl, setPaymentUrl] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    api.get(`/food/${idOrSlug}`)
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [idOrSlug]);

  useEffect(() => {
    if (pay !== 'momo' || providers !== null) return;
    api.get('/payments/providers', { params: { country: user?.businessProfile?.country || 'TG' } })
      .then(r => {
        const list = r.data?.providers || [];
        setProviders(list);
        setProvider(r.data?.defaultProvider || list[0]?.code || null);
      })
      .catch(() => setProviders([]));
  }, [pay, providers]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const pollPayment = (orderId, orderData) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const r = await api.get(`/food/orders/${orderId}`);
        const o = r.data?.order;
        if (o?.paymentConfirmedAt) {
          clearInterval(pollRef.current); pollRef.current = null;
          setPaymentUrl(null);
          setPlaced({ ...orderData, order: o, paid: true });
          setCart({});
        } else if (o?.status === 'CANCELLED') {
          clearInterval(pollRef.current); pollRef.current = null;
          setPaymentUrl(null);
          Alert.alert(t('consumer.orderFailed', lang), o.cancelReason || '');
        }
      } catch { /* transient — keep polling */ }
    }, 3000);
  };

  if (loading) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={C.forest} />
    </SafeAreaView>
  );

  if (!data?.restaurant) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <Text style={{ color: C.muted, marginBottom: 16 }}>{t('consumer.emptyMenu', lang)}</Text>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={{ color: C.forest, fontWeight: '600' }}>{t('consumer.backToRestaurants', lang)}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  const { restaurant: r, menu } = data;
  const items = Object.values(cart);
  const subtotal = items.reduce((sum, { item, qty }) => sum + parseFloat(item.price) * qty, 0);
  const deliveryFee = parseFloat(r.deliveryFeeOverride || 800);
  const serviceFee = Math.round(subtotal * 0.03);
  const total = subtotal + deliveryFee + serviceFee;
  const minOrder = parseFloat(r.minimumOrderAmount || 0);

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
    if (pay === 'momo' && !provider) return Alert.alert('', t('consumer.pickProvider', lang));
    if (pay === 'momo' && !phone.trim()) return Alert.alert('', t('consumer.momoNumberRequired', lang));
    setPlacing(true);
    try {
      const res = await api.post('/food/orders', {
        restaurantId: r.id,
        items: items.map(({ item, qty }) => ({ menuItemId: item.id, quantity: qty })),
        deliveryAddress: address.trim(),
        deliveryNotes: notes.trim() || undefined,
        cashOnDelivery: pay === 'cash',
        paymentProvider: pay === 'momo' ? provider : undefined,
        paymentPhone: pay === 'momo' ? phone.trim() : undefined,
      });
      if (res.data.payment?.paymentUrl) {
        // Mobile money — open the provider checkout and wait for confirmation.
        setPaymentUrl(res.data.payment.paymentUrl);
        pollPayment(res.data.order.id, res.data);
      } else {
        setPlaced(res.data);
        setCart({});
      }
    } catch (err) {
      Alert.alert(t('consumer.orderFailed', lang), err.response?.data?.error || err.response?.data?.message || '');
    } finally { setPlacing(false); }
  };

  const cancelPayment = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    setPaymentUrl(null);
  };

  if (placed) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Ionicons name="checkmark-circle" size={56} color={C.forest} />
        <Text style={s.placedTitle}>{t('consumer.orderPlaced', lang)}</Text>
        <Text style={s.placedBody}>{r.name} {t('consumer.orderPlacedBody', lang)}</Text>
        <View style={s.placedCard}>
          <View style={s.rowBetween}><Text style={s.rowLabel}>{t('consumer.orderNumber', lang)}</Text><Text style={s.rowValue}>{placed.trackingToken}</Text></View>
          <View style={s.rowBetween}><Text style={s.rowLabel}>{t('consumer.total', lang)}</Text><Text style={[s.rowValue, { fontWeight: '700' }]}>{Math.round(placed.order?.total || total)} XOF</Text></View>
          {placed.paid ? (
            <View style={s.rowBetween}><Text style={[s.rowLabel, { color: C.forest, fontWeight: '600' }]}>{t('consumer.paymentConfirmed', lang)}</Text><Ionicons name="checkmark-circle" size={18} color={C.forest} /></View>
          ) : (
            <View style={s.rowBetween}><Text style={s.rowLabel}>{t('consumer.cashOnDelivery', lang)}</Text><Ionicons name="cash-outline" size={18} color={C.bronze} /></View>
          )}
        </View>
        <TouchableOpacity style={s.btn} onPress={() => navigation.goBack()}>
          <Text style={s.btnText}>{t('consumer.backToRestaurants', lang)}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
          {r.coverImageUrl ? <Image source={{ uri: r.coverImageUrl }} style={s.cover} /> : null}
          <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 8 }}>
              <Ionicons name="chevron-back" size={26} color={C.forest} />
            </TouchableOpacity>
            <Text style={s.name}>{r.name}</Text>
            <Text style={s.meta}>
              {[r.cuisineType, r.estimatedPrepTimeMinutes ? `${r.estimatedPrepTimeMinutes} ${t('consumer.min', lang)}` : null].filter(Boolean).join(' · ')}
            </Text>
            {minOrder > 0 ? <Text style={s.minOrder}>{t('consumer.minOrder', lang)}: {Math.round(minOrder)} XOF</Text> : null}

            <Text style={s.sectionTitle}>{t('consumer.menu', lang)}</Text>
            {Object.keys(menu || {}).length === 0 ? (
              <Text style={s.empty}>{t('consumer.emptyMenu', lang)}</Text>
            ) : Object.entries(menu).map(([cat, catItems]) => (
              <View key={cat} style={{ marginBottom: 18 }}>
                <Text style={s.category}>{cat}</Text>
                {catItems.map(item => {
                  const qty = cart[item.id]?.qty || 0;
                  return (
                    <View key={item.id} style={s.itemRow}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={s.itemName}>{item.name}</Text>
                        {item.description ? <Text style={s.itemDesc} numberOfLines={2}>{item.description}</Text> : null}
                        <Text style={s.itemPrice}>{Math.round(parseFloat(item.price))} XOF</Text>
                      </View>
                      {qty === 0 ? (
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
                <View style={s.rowBetween}><Text style={s.rowLabel}>{t('consumer.deliveryFee', lang)}</Text><Text style={s.rowValue}>{Math.round(deliveryFee)} XOF</Text></View>
                <View style={s.rowBetween}><Text style={s.rowLabel}>{t('consumer.serviceFee', lang)}</Text><Text style={s.rowValue}>{serviceFee} XOF</Text></View>
                <View style={[s.rowBetween, { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8, marginTop: 4 }]}>
                  <Text style={[s.rowLabel, { fontWeight: '700', color: C.ink }]}>{t('consumer.total', lang)}</Text>
                  <Text style={[s.rowValue, { fontWeight: '700' }]}>{Math.round(total)} XOF</Text>
                </View>

                <Text style={s.label}>{t('consumer.deliveryAddress', lang)}</Text>
                <TextInput style={s.input} value={address} onChangeText={setAddress} placeholder={t('consumer.addressPlaceholder', lang)} placeholderTextColor={C.subtle} multiline />
                <Text style={s.label}>{t('consumer.notes', lang)}</Text>
                <TextInput style={s.input} value={notes} onChangeText={setNotes} placeholderTextColor={C.subtle} />

                <Text style={s.label}>{t('consumer.payMethod', lang)}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity style={[s.payOpt, pay === 'cash' && s.payOptSel]} onPress={() => setPay('cash')}>
                    <Ionicons name="cash-outline" size={16} color={pay === 'cash' ? C.paper : C.forest} />
                    <Text style={[s.payOptText, pay === 'cash' && { color: C.paper }]}>{t('consumer.payCashOption', lang)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.payOpt, pay === 'momo' && s.payOptSel]} onPress={() => setPay('momo')}>
                    <Ionicons name="phone-portrait-outline" size={16} color={pay === 'momo' ? C.paper : C.forest} />
                    <Text style={[s.payOptText, pay === 'momo' && { color: C.paper }]}>{t('consumer.payMomoOption', lang)}</Text>
                  </TouchableOpacity>
                </View>

                {pay === 'momo' && (
                  <>
                    {providers === null ? (
                      <ActivityIndicator color={C.forest} style={{ marginTop: 12 }} />
                    ) : (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                        {providers.map(p => {
                          const sel = provider === p.code;
                          return (
                            <TouchableOpacity key={p.code} style={[s.provChip, sel && s.provChipSel]} onPress={() => setProvider(p.code)}>
                              <Text style={[s.provChipText, sel && { color: C.paper }]}>{p.displayName || p.code}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                    <Text style={s.label}>{t('consumer.momoNumber', lang)}</Text>
                    <TextInput style={s.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+228..." placeholderTextColor={C.subtle} />
                  </>
                )}

                <TouchableOpacity style={[s.btn, placing && { opacity: 0.7 }]} onPress={placeOrder} disabled={placing}>
                  {placing ? <ActivityIndicator color={C.paper} /> : <Text style={s.btnText}>{pay === 'momo' ? t('consumer.payAndOrder', lang) : t('consumer.placeOrder', lang)} · {Math.round(total)} XOF</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Mobile money checkout WebView */}
      <Modal visible={!!paymentUrl} animationType="slide" onRequestClose={cancelPayment}>
        <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
          <View style={s.payHeader}>
            <TouchableOpacity onPress={cancelPayment}>
              <Ionicons name="close" size={26} color={C.forest} />
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: '600', color: C.ink }}>{t('consumer.payMomoOption', lang)}</Text>
            <View style={{ width: 26 }} />
          </View>
          <View style={s.payBanner}>
            <ActivityIndicator size="small" color={C.bronze} />
            <Text style={{ marginLeft: 8, fontSize: 12, color: C.muted }}>{t('consumer.waitingPayment', lang)}</Text>
          </View>
          {paymentUrl && (
            <WebView source={{ uri: paymentUrl }} style={{ flex: 1 }} startInLoadingState
              renderLoading={() => <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={C.forest} /></View>} />
          )}
        </SafeAreaView>
      </Modal>
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
  payOpt: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.cream, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingVertical: 11 },
  payOptSel: { backgroundColor: C.forest, borderColor: C.forest },
  payOptText: { fontSize: 13, fontWeight: '600', color: C.forest },
  provChip: { backgroundColor: C.cream, borderWidth: 1, borderColor: C.border, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  provChipSel: { backgroundColor: C.forest, borderColor: C.forest },
  provChipText: { fontSize: 12, fontWeight: '600', color: C.forest },
  payHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.paper },
  payBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, backgroundColor: C.paper, borderBottomWidth: 1, borderBottomColor: C.border },
});
