import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView, Image, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', amber:'#C28B2C', red:'#B23A48' };

// route.params:
//   jobInput: { ...job fields, priceOffered, currency }
//   quote: { totalPrice, currency }
export default function PaymentSheetScreen({ route, navigation }) {
  const { jobInput, quote, promoPreview } = route.params || {};
  // Compute the amount the merchant actually pays. The backend recomputes
  // this and is the source of truth, but we mirror it here so the UI is
  // consistent across the funnel.
  const baseAmount = parseFloat(quote?.totalPrice ?? jobInput?.priceOffered ?? 0) || 0;
  const discount = promoPreview?.discount || 0;
  const dueAmount = Math.max(0, +(baseAmount - discount).toFixed(2));
  const displayCurrency = quote?.currency || jobInput?.currency || 'XOF';
  const { user } = useAuth();
  const country = user?.businessProfile?.country || 'TG';

  const [providers, setProviders] = useState([]);
  const [provider, setProvider] = useState(null); // selected code
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [phone, setPhone] = useState(user?.phone || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // After job is created and we have a paymentUrl
  const [job, setJob] = useState(null);
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    api.get('/payments/providers', { params: { country } })
      .then(res => {
        if (cancelled) return;
        const list = res.data?.providers || [];
        setProviders(list);
        const def = res.data?.defaultProvider;
        setProvider(def || list[0]?.code || null);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load payment providers');
      })
      .finally(() => { if (!cancelled) setLoadingProviders(false); });
    return () => { cancelled = true; };
  }, [country]);

  // Stop polling on unmount
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const startPolling = useCallback((jobId) => {
    setPolling(true);
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/jobs/${jobId}`);
        const j = res.data?.job || res.data;
        if (j?.status && j.status !== 'AWAITING_PAYMENT' && j.status !== 'DRAFT') {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setPolling(false);
          if (j.status === 'POSTED' || j.status === 'MATCHED' || j.status === 'IN_TRANSIT') {
            // Payment confirmed → close webview, reset stack so user can't
            // back-navigate into stale NewDelivery/PaymentSheet and re-pay.
            setPaymentUrl(null);
            navigation.reset({
              index: 1,
              routes: [
                { name: 'MerchantTabs' },
                { name: 'PickupQR', params: { jobId } },
              ],
            });
          } else if (j.status === 'CANCELLED' || j.status === 'EXPIRED') {
            setPaymentUrl(null);
            Alert.alert('Payment failed', 'The payment was not completed. You can try again.');
            navigation.goBack();
          }
        }
      } catch {
        // transient — keep polling
      }
    }, 3000);
  }, [navigation]);

  const submit = async () => {
    if (!provider) return Alert.alert('Pick a provider', 'Choose a payment method');
    if (!phone.trim()) return Alert.alert('Phone required', 'Enter the phone number to pay from');
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post('/jobs', {
        ...jobInput,
        paymentMethod: 'momo',
        paymentProvider: provider,
        paymentPhone: phone.trim(),
      });
      const data = res.data;
      setJob(data.job);
      if (data.payment?.paymentUrl) {
        setPaymentUrl(data.payment.paymentUrl);
        startPolling(data.job.id);
      } else if (data.job?.status === 'POSTED') {
        // unlikely with momo, but handle wallet-style success
        navigation.replace('PickupQR', { jobId: data.job.id });
      } else {
        setError('Payment was not initiated. Please try again.');
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Could not create the delivery');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelPayment = () => {
    Alert.alert(
      'Cancel payment?',
      'The delivery will not be posted to drivers until payment is confirmed.',
      [
        { text: 'Keep waiting' },
        { text: 'Cancel', style: 'destructive', onPress: () => {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setPaymentUrl(null);
          setPolling(false);
          navigation.goBack();
        } },
      ]
    );
  };

  return (
    <View style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} disabled={submitting}>
          <Ionicons name="chevron-back" size={26} color={submitting ? C.subtle : C.forest} />
        </TouchableOpacity>
        <Text style={s.title}>Payment</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={s.amountCard}>
          <Text style={s.amountLabel}>Amount due</Text>
          <Text style={s.amountValue}>
            {Math.round(dueAmount).toLocaleString()}
            <Text style={s.amountCurr}> {displayCurrency}</Text>
          </Text>
          {promoPreview ? (
            <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: C.muted }}>Subtotal</Text>
              <Text style={{ fontSize: 12, color: C.muted }}>{Math.round(baseAmount).toLocaleString()} {displayCurrency}</Text>
            </View>
          ) : null}
          {promoPreview ? (
            <View style={{ marginTop: 4, flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: C.forest, fontWeight: '600' }}>Promo · {promoPreview.code}</Text>
              <Text style={{ fontSize: 12, color: C.forest, fontWeight: '600' }}>− {Math.round(discount).toLocaleString()} {displayCurrency}</Text>
            </View>
          ) : null}
        </View>

        <Text style={s.sectionLabel}>Choose payment method</Text>
        {loadingProviders ? (
          <ActivityIndicator color={C.forest} style={{ marginTop: 24 }} />
        ) : providers.length === 0 ? (
          <Text style={{ color: C.muted, marginTop: 12 }}>No providers available for your country.</Text>
        ) : (
          <View style={{ gap: 8, marginTop: 8 }}>
            {providers.map(p => {
              const selected = provider === p.code;
              return (
                <TouchableOpacity
                  key={p.code}
                  style={[s.provider, selected && s.providerSelected]}
                  onPress={() => setProvider(p.code)}
                  activeOpacity={0.85}
                >
                  <View style={[s.providerSwatch, { backgroundColor: p.colors?.bg || C.bronze }]}>
                    <Text style={[s.providerInitial, { color: p.colors?.fg || C.paper }]}>
                      {(p.displayName || p.code).slice(0, 1)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.providerName}>{p.displayName || p.code}</Text>
                    {!p.live && <Text style={s.providerSandbox}>SANDBOX</Text>}
                  </View>
                  <Ionicons
                    name={selected ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={selected ? C.forest : C.subtle}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Text style={[s.sectionLabel, { marginTop: 20 }]}>Phone number to pay from</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          style={s.input}
          keyboardType="phone-pad"
          placeholder="+228..."
          placeholderTextColor={C.subtle}
        />

        {error ? <Text style={s.errText}>{error}</Text> : null}

        <TouchableOpacity
          style={[s.btn, (!provider || submitting) && { opacity: 0.5 }]}
          onPress={submit}
          disabled={submitting || !provider}
        >
          {submitting
            ? <ActivityIndicator color={C.paper} />
            : <Text style={s.btnText}>Pay {Math.round(dueAmount).toLocaleString()} {displayCurrency}</Text>}
        </TouchableOpacity>

        <Text style={s.legal}>
          You'll be redirected to the provider's secure checkout. Your delivery will go live to drivers as soon as the payment is confirmed.
        </Text>
      </ScrollView>

      {/* Payment WebView modal */}
      <Modal visible={!!paymentUrl} animationType="slide" onRequestClose={cancelPayment}>
        <View style={s.safe}>
          <View style={s.header}>
            <TouchableOpacity onPress={cancelPayment}>
              <Ionicons name="close" size={26} color={C.forest} />
            </TouchableOpacity>
            <Text style={s.title}>Complete payment</Text>
            <View style={{ width: 26 }} />
          </View>
          <View style={s.pollBanner}>
            {polling
              ? <><ActivityIndicator size="small" color={C.amber} /><Text style={s.pollText}>Waiting for payment confirmation…</Text></>
              : <Text style={s.pollText}>Loading checkout…</Text>}
          </View>
          {paymentUrl && (
            <WebView
              source={{ uri: paymentUrl }}
              style={{ flex: 1 }}
              startInLoadingState
              renderLoading={() => (
                <View style={s.webLoader}><ActivityIndicator color={C.forest} /></View>
              )}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 52, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.paper },
  title: { fontSize: 17, fontWeight: '600', color: C.ink },

  amountCard: { backgroundColor: C.paper, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 18, marginBottom: 20 },
  amountLabel: { fontSize: 11, color: C.muted, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  amountValue: { fontSize: 32, color: C.forest, fontWeight: '500', marginTop: 6 },
  amountCurr: { fontSize: 14, color: C.muted, fontWeight: '400' },

  sectionLabel: { fontSize: 11, color: C.muted, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 },

  provider: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.paper },
  providerSelected: { borderColor: C.forest, borderWidth: 2 },
  providerSwatch: { width: 38, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  providerInitial: { fontSize: 16, fontWeight: '700' },
  providerName: { fontSize: 14, color: C.ink, fontWeight: '500' },
  providerSandbox: { fontSize: 9, color: C.amber, fontWeight: '700', letterSpacing: 0.6, marginTop: 2 },

  input: { borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 12, fontSize: 14, color: C.ink, backgroundColor: C.paper },

  btn: { backgroundColor: C.forest, borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 16 },
  btnText: { color: C.paper, fontWeight: '600', fontSize: 14 },

  legal: { fontSize: 11, color: C.muted, marginTop: 12, lineHeight: 16, textAlign: 'center' },
  errText: { color: C.red, fontSize: 12, marginTop: 12 },

  pollBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 10, backgroundColor: '#FFF3E0', borderBottomWidth: 1, borderBottomColor: C.border },
  pollText: { fontSize: 12, color: C.muted, fontWeight: '500' },
  webLoader: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: C.cream },
});
