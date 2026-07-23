import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, RefreshControl, Image, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { t, getLang } from '../../utils/i18n';
import api from '../../utils/api';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', red:'#B23A48', amber:'#C28B2C' };

// Merchant-side transitions matching the backend ORDER_STATUS_FLOW
const NEXT_ACTIONS = {
  PENDING: [{ status: 'CONFIRMED', key: 'catalog.confirm' }, { status: 'CANCELLED', key: 'catalog.cancelOrder', danger: true }],
  CONFIRMED: [{ status: 'READY_FOR_PICKUP', key: 'catalog.markReady' }],
  PREPARING: [{ status: 'READY_FOR_PICKUP', key: 'catalog.markReady' }],
  READY_FOR_PICKUP: [{ status: 'PICKED_UP', key: 'catalog.markPickedUp' }],
  PICKED_UP: [{ status: 'DELIVERED', key: 'catalog.markDelivered' }],
};

const EMPTY_FORM = { name: '', price: '', category: '', unit: '', description: '' };

export default function CatalogScreen({ navigation }) {
  const { user } = useAuth();
  const lang = getLang(user);

  const [tab, setTab] = useState('products'); // 'products' | 'orders'
  const [listings, setListings] = useState(null);
  const [orders, setOrders] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState(null); // null | { id?, ...EMPTY_FORM, inStock }
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const [lRes, oRes] = await Promise.all([
        api.get('/listings/listings').catch(() => ({ data: { listings: [] } })),
        api.get('/listings/orders/received').catch(() => ({ data: { orders: [] } })),
      ]);
      setListings(lRes.data.listings || []);
      setOrders(oRes.data.orders || []);
    } catch (e) {
      setListings([]); setOrders([]);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const saveProduct = async () => {
    if (!form.name.trim()) return Alert.alert('', t('catalog.nameRequired', lang));
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        price: form.price ? String(parseFloat(form.price)) : undefined,
        category: form.category.trim() || undefined,
        unit: form.unit.trim() || undefined,
        description: form.description.trim() || undefined,
      };
      if (form.id) {
        await api.patch(`/listings/listings/${form.id}`, { ...payload, inStock: form.inStock });
      } else {
        await api.post('/listings/listings', payload);
      }
      setForm(null);
      load();
    } catch (err) {
      Alert.alert('', err.response?.data?.message || t('catalog.saveFailed', lang));
    } finally { setSaving(false); }
  };

  const deleteProduct = (item) => {
    Alert.alert(t('catalog.deleteTitle', lang), item.name, [
      { text: t('common.cancel', lang) },
      { text: t('catalog.delete', lang), style: 'destructive', onPress: async () => {
        try { await api.delete(`/listings/listings/${item.id}`); load(); }
        catch (err) { Alert.alert('', err.response?.data?.message || ''); }
      } },
    ]);
  };

  const addPhoto = async (item) => {
    const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!lib.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7,
    });
    if (result.canceled || !result.assets?.length) return;
    setUploadingId(item.id);
    try {
      const formData = new FormData();
      formData.append('photos', { uri: result.assets[0].uri, name: 'photo.jpg', type: 'image/jpeg' });
      await api.post(`/listings/listings/${item.id}/photos`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      load();
    } catch (err) {
      const code = err.response?.data?.code;
      Alert.alert('', code === 'PHOTO_LIMIT_EXCEEDED' ? t('catalog.photoLimit', lang) : (err.response?.data?.message || t('catalog.saveFailed', lang)));
    } finally { setUploadingId(null); }
  };

  const advanceOrder = async (order, status) => {
    try {
      await api.patch(`/listings/orders/${order.id}/status`, { status });
      load();
    } catch (err) {
      Alert.alert('', err.response?.data?.message || '');
    }
  };

  const toggleStock = async (item, inStock) => {
    setListings(ls => ls.map(l => l.id === item.id ? { ...l, inStock } : l));
    try { await api.patch(`/listings/listings/${item.id}`, { inStock }); }
    catch { load(); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={C.ink} />
        </TouchableOpacity>
        <Text style={s.title}>{t('catalog.title', lang)}</Text>
      </View>

      <View style={s.tabs}>
        {['products', 'orders'].map(k => (
          <TouchableOpacity key={k} style={[s.tab, tab === k && s.tabActive]} onPress={() => setTab(k)}>
            <Text style={[s.tabText, tab === k && s.tabTextActive]}>
              {t(k === 'products' ? 'catalog.products' : 'catalog.orders', lang)}
              {k === 'orders' && orders?.length ? ` (${orders.filter(o => o.status === 'PENDING').length})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.forest} />}
        keyboardShouldPersistTaps="handled">

        {tab === 'products' && (
          <>
            {!form && (
              <TouchableOpacity style={s.btn} onPress={() => setForm({ ...EMPTY_FORM, inStock: true })}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={s.btnText}>  {t('catalog.addProduct', lang)}</Text>
              </TouchableOpacity>
            )}

            {form && (
              <View style={s.form}>
                <Text style={s.formTitle}>{form.id ? t('catalog.editProduct', lang) : t('catalog.addProduct', lang)}</Text>
                <Text style={s.label}>{t('catalog.name', lang)}</Text>
                <TextInput style={s.input} value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} />
                <Text style={s.label}>{t('catalog.price', lang)} (XOF)</Text>
                <TextInput style={s.input} value={form.price} onChangeText={v => setForm(f => ({ ...f, price: v.replace(/[^\d.]/g, '') }))} keyboardType="decimal-pad" />
                <Text style={s.label}>{t('catalog.category', lang)}</Text>
                <TextInput style={s.input} value={form.category} onChangeText={v => setForm(f => ({ ...f, category: v }))} placeholder={t('catalog.categoryPh', lang)} placeholderTextColor={C.subtle} />
                <Text style={s.label}>{t('catalog.unit', lang)}</Text>
                <TextInput style={s.input} value={form.unit} onChangeText={v => setForm(f => ({ ...f, unit: v }))} placeholder="kg, pièce, bouteille…" placeholderTextColor={C.subtle} />
                <Text style={s.label}>{t('catalog.description', lang)}</Text>
                <TextInput style={[s.input, { minHeight: 70 }]} value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))} multiline />
                {form.id ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
                    <Text style={s.label}>{t('catalog.inStock', lang)}</Text>
                    <Switch value={form.inStock} onValueChange={v => setForm(f => ({ ...f, inStock: v }))} trackColor={{ true: C.forest, false: C.border }} thumbColor={C.paper} />
                  </View>
                ) : null}
                <TouchableOpacity style={[s.btn, saving && { opacity: 0.6 }]} onPress={saveProduct} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>{t('catalog.save', lang)}</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={{ alignItems: 'center', marginTop: 12 }} onPress={() => setForm(null)}>
                  <Text style={{ color: C.muted, fontSize: 13 }}>{t('common.cancel', lang)}</Text>
                </TouchableOpacity>
              </View>
            )}

            {listings === null ? (
              <ActivityIndicator color={C.forest} style={{ marginTop: 24 }} />
            ) : listings.length === 0 && !form ? (
              <Text style={s.empty}>{t('catalog.empty', lang)}</Text>
            ) : listings.map(item => {
              const photo = (item.photos || []).find(p => p.isPrimary) || (item.photos || [])[0];
              return (
                <View key={item.id} style={s.card}>
                  <TouchableOpacity style={s.thumbWrap} onPress={() => addPhoto(item)} disabled={uploadingId === item.id}>
                    {uploadingId === item.id ? (
                      <ActivityIndicator color={C.forest} />
                    ) : photo ? (
                      <Image source={{ uri: photo.fileUrl }} style={s.thumb} />
                    ) : (
                      <Ionicons name="camera-outline" size={22} color={C.subtle} />
                    )}
                  </TouchableOpacity>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={s.cardName} numberOfLines={1}>{item.name}</Text>
                    <Text style={s.cardMeta} numberOfLines={1}>
                      {[item.price != null ? `${Math.round(parseFloat(item.price))} XOF${item.unit ? `/${item.unit}` : ''}` : t('catalog.noPrice', lang), item.category].filter(Boolean).join(' · ')}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                      <Switch value={!!item.inStock} onValueChange={v => toggleStock(item, v)} trackColor={{ true: C.forest, false: C.border }} thumbColor={C.paper}
                        style={{ transform: [{ scale: 0.8 }], marginLeft: -6 }} />
                      <Text style={{ fontSize: 11, color: item.inStock ? C.forest : C.muted }}>{t(item.inStock ? 'catalog.inStock' : 'catalog.outOfStock', lang)}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 10 }}>
                    <TouchableOpacity onPress={() => setForm({ id: item.id, name: item.name || '', price: item.price != null ? String(item.price) : '', category: item.category || '', unit: item.unit || '', description: item.description || '', inStock: !!item.inStock })}>
                      <Ionicons name="pencil-outline" size={18} color={C.bronze} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteProduct(item)}>
                      <Ionicons name="trash-outline" size={18} color={C.red} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {tab === 'orders' && (
          orders === null ? (
            <ActivityIndicator color={C.forest} style={{ marginTop: 24 }} />
          ) : orders.length === 0 ? (
            <Text style={s.empty}>{t('catalog.ordersEmpty', lang)}</Text>
          ) : orders.map(o => (
            <View key={o.id} style={s.orderCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={s.orderToken}>#{o.trackingToken}</Text>
                <View style={[s.statusBadge, o.status === 'PENDING' && { backgroundColor: '#F6EBD6', borderColor: C.amber }]}>
                  <Text style={[s.statusText, o.status === 'PENDING' && { color: C.amber }]}>{t(`orderStatus.${o.status}`, lang)}</Text>
                </View>
              </View>
              {(o.items || []).map(i => (
                <Text key={i.id} style={s.orderItem}>{i.quantity} × {i.name} — {Math.round(parseFloat(i.subtotal))} XOF</Text>
              ))}
              <Text style={s.orderMeta}>{o.customer ? `${o.customer.firstName} ${o.customer.lastName}${o.customer.phone ? ` · ${o.customer.phone}` : ''}` : ''}</Text>
              <Text style={s.orderMeta}>{o.deliveryAddress}</Text>
              <View style={s.rowBetween}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: C.ink }}>{t('consumer.total', lang)}</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: C.forest }}>{Math.round(parseFloat(o.total))} XOF{o.cashOnDelivery ? ` · ${t('consumer.cashOnDelivery', lang)}` : ''}</Text>
              </View>
              {(NEXT_ACTIONS[o.status] || []).length > 0 && (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  {NEXT_ACTIONS[o.status].map(a => (
                    <TouchableOpacity key={a.status} style={[s.orderBtn, a.danger && { backgroundColor: C.paper, borderWidth: 1, borderColor: C.red }]}
                      onPress={() => advanceOrder(o, a.status)}>
                      <Text style={[s.orderBtnText, a.danger && { color: C.red }]}>{t(a.key, lang)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ))
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
  tabs: { flexDirection: 'row', backgroundColor: C.paper, borderBottomWidth: 1, borderBottomColor: C.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: C.forest },
  tabText: { fontSize: 13, fontWeight: '600', color: C.muted },
  tabTextActive: { color: C.forest },
  btn: { flexDirection: 'row', backgroundColor: C.forest, padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  form: { backgroundColor: C.paper, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 16 },
  formTitle: { fontSize: 15, fontWeight: '600', color: C.ink },
  label: { fontSize: 13, fontWeight: '600', color: C.ink, marginTop: 14, marginBottom: 6 },
  input: { backgroundColor: C.cream, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.ink },
  empty: { fontSize: 13, color: C.muted, backgroundColor: C.paper, borderRadius: 8, borderWidth: 1, borderColor: C.border, padding: 14 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.paper, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 8 },
  thumbWrap: { width: 56, height: 56, borderRadius: 8, backgroundColor: C.cream, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumb: { width: 56, height: 56 },
  cardName: { fontSize: 14, fontWeight: '600', color: C.ink },
  cardMeta: { fontSize: 12, color: C.muted, marginTop: 2 },
  orderCard: { backgroundColor: C.paper, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 10 },
  orderToken: { fontSize: 13, fontWeight: '700', color: C.ink },
  statusBadge: { backgroundColor: C.cream, borderRadius: 6, borderWidth: 1, borderColor: C.border, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 10, fontWeight: '700', color: C.forest, letterSpacing: 0.4 },
  orderItem: { fontSize: 13, color: C.ink, marginTop: 6 },
  orderMeta: { fontSize: 12, color: C.muted, marginTop: 4 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8 },
  orderBtn: { flex: 1, backgroundColor: C.forest, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  orderBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
