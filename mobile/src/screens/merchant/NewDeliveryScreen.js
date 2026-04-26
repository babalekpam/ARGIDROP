import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Switch, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../utils/api';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', amber:'#C28B2C', red:'#B23A48' };

const PACKAGE_TYPES = [
  { code: 'DOCS', label: 'Documents' },
  { code: 'FOOD', label: 'Food' },
  { code: 'SMALL_BOX', label: 'Small box' },
  { code: 'LARGE_BOX', label: 'Large box' },
  { code: 'OTHER', label: 'Other' },
];

const URGENCIES = [
  { code: 'STANDARD', label: 'Standard', sub: '~30–60 min' },
  { code: 'EXPRESS', label: 'Express', sub: 'Priority dispatch' },
];

export default function NewDeliveryScreen({ navigation }) {
  const [pickup, setPickup] = useState(null); // { lat, lng, address }
  const [dropoff, setDropoff] = useState(null);

  const [pickupContactName, setPickupContactName] = useState('');
  const [pickupContactPhone, setPickupContactPhone] = useState('');
  const [pickupNotes, setPickupNotes] = useState('');

  const [dropoffContactName, setDropoffContactName] = useState('');
  const [dropoffContactPhone, setDropoffContactPhone] = useState('');
  const [dropoffNotes, setDropoffNotes] = useState('');

  const [packageType, setPackageType] = useState('SMALL_BOX');
  const [packageDescription, setPackageDescription] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [isFragile, setIsFragile] = useState(false);
  const [urgency, setUrgency] = useState('STANDARD');

  const [quote, setQuote] = useState(null); // { totalPrice, currency, breakdown }
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState('');

  // Reset quote whenever inputs that affect price change
  const invalidateQuote = () => setQuote(null);

  const openPicker = (mode) => {
    navigation.navigate('MapPicker', {
      mode,
      initial: mode === 'pickup' ? pickup : dropoff,
      onPick: (loc) => {
        if (mode === 'pickup') setPickup(loc);
        else setDropoff(loc);
        invalidateQuote();
      },
    });
  };

  const canQuote = pickup && dropoff;
  const canSubmit = canQuote
    && dropoffContactName.trim()
    && dropoffContactPhone.trim()
    && quote;

  const fetchQuote = async () => {
    if (!canQuote) return;
    setQuoteLoading(true);
    setQuoteError('');
    try {
      const res = await api.post('/pricing/quote', {
        pickupLat: pickup.lat, pickupLng: pickup.lng,
        dropoffLat: dropoff.lat, dropoffLng: dropoff.lng,
        weightKg: parseFloat(weightKg) || 0,
        isFragile,
        urgency,
      });
      const d = res.data || {};
      setQuote({
        totalPrice: d.totalPrice ?? d.total ?? d.price,
        currency: d.currency || 'XOF',
        distanceKm: d.distanceKm ?? d.breakdown?.distanceKm,
        breakdown: d.breakdown || {},
      });
    } catch (e) {
      setQuoteError(e.response?.data?.message || 'Could not get a price quote');
    } finally {
      setQuoteLoading(false);
    }
  };

  const goToPayment = () => {
    if (!canSubmit) return;
    navigation.navigate('PaymentSheet', {
      jobInput: {
        pickupAddress: pickup.address, pickupLat: pickup.lat, pickupLng: pickup.lng,
        pickupContactName: pickupContactName.trim() || null,
        pickupContactPhone: pickupContactPhone.trim() || null,
        pickupNotes: pickupNotes.trim() || null,
        dropoffAddress: dropoff.address, dropoffLat: dropoff.lat, dropoffLng: dropoff.lng,
        dropoffContactName: dropoffContactName.trim(),
        dropoffContactPhone: dropoffContactPhone.trim(),
        dropoffNotes: dropoffNotes.trim() || null,
        packageType,
        packageDescription: packageDescription.trim() || null,
        weightKg: parseFloat(weightKg) || null,
        isFragile,
        urgency,
        priceOffered: quote.totalPrice,
        currency: quote.currency,
      },
      quote,
    });
  };

  return (
    <View style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color={C.forest} />
        </TouchableOpacity>
        <Text style={s.title}>New delivery</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {/* Pickup */}
        <Section title="Pickup">
          <LocationButton
            color={C.bronze}
            location={pickup}
            placeholder="Choose pickup on map"
            onPress={() => openPicker('pickup')}
          />
          <Field label="Contact name (optional)">
            <TextInput value={pickupContactName} onChangeText={setPickupContactName} style={s.input} placeholder="e.g. Yawa" placeholderTextColor={C.subtle} />
          </Field>
          <Field label="Contact phone (optional)">
            <TextInput value={pickupContactPhone} onChangeText={setPickupContactPhone} style={s.input} keyboardType="phone-pad" placeholder="+228..." placeholderTextColor={C.subtle} />
          </Field>
          <Field label="Pickup notes (optional)">
            <TextInput value={pickupNotes} onChangeText={setPickupNotes} style={[s.input, s.multiline]} multiline placeholder="Gate code, floor, instructions" placeholderTextColor={C.subtle} />
          </Field>
        </Section>

        {/* Dropoff */}
        <Section title="Drop-off">
          <LocationButton
            color={C.forest}
            location={dropoff}
            placeholder="Choose drop-off on map"
            onPress={() => openPicker('dropoff')}
          />
          <Field label="Recipient name *">
            <TextInput value={dropoffContactName} onChangeText={setDropoffContactName} style={s.input} placeholder="Who receives the package?" placeholderTextColor={C.subtle} />
          </Field>
          <Field label="Recipient phone *">
            <TextInput value={dropoffContactPhone} onChangeText={setDropoffContactPhone} style={s.input} keyboardType="phone-pad" placeholder="+228..." placeholderTextColor={C.subtle} />
          </Field>
          <Field label="Drop-off notes (optional)">
            <TextInput value={dropoffNotes} onChangeText={setDropoffNotes} style={[s.input, s.multiline]} multiline placeholder="Apartment number, landmark…" placeholderTextColor={C.subtle} />
          </Field>
        </Section>

        {/* Package */}
        <Section title="Package">
          <Field label="Type">
            <View style={s.pillRow}>
              {PACKAGE_TYPES.map(t => (
                <TouchableOpacity key={t.code} style={[s.pill, packageType === t.code && s.pillActive]} onPress={() => { setPackageType(t.code); invalidateQuote(); }}>
                  <Text style={[s.pillText, packageType === t.code && s.pillTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Field>
          <Field label="Weight (kg, optional)">
            <TextInput value={weightKg} onChangeText={(v) => { setWeightKg(v.replace(/[^\d.]/g, '')); invalidateQuote(); }} style={s.input} keyboardType="decimal-pad" placeholder="e.g. 2.5" placeholderTextColor={C.subtle} />
          </Field>
          <View style={[s.row, { marginTop: 12 }]}>
            <Text style={s.toggleLabel}>Fragile package</Text>
            <Switch value={isFragile} onValueChange={(v) => { setIsFragile(v); invalidateQuote(); }} trackColor={{ true: C.forest, false: C.border }} thumbColor={C.paper} />
          </View>
          <Field label="Description (optional)">
            <TextInput value={packageDescription} onChangeText={setPackageDescription} style={[s.input, s.multiline]} multiline placeholder="What's inside?" placeholderTextColor={C.subtle} />
          </Field>
        </Section>

        {/* Urgency */}
        <Section title="Urgency">
          <View style={s.urgencyRow}>
            {URGENCIES.map(u => (
              <TouchableOpacity key={u.code} style={[s.urgencyCard, urgency === u.code && s.urgencyCardActive]} onPress={() => { setUrgency(u.code); invalidateQuote(); }}>
                <Text style={[s.urgencyLabel, urgency === u.code && { color: C.forest }]}>{u.label}</Text>
                <Text style={[s.urgencySub, urgency === u.code && { color: C.forest }]}>{u.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        {/* Quote + submit */}
        <View style={s.quoteCard}>
          {quote ? (
            <>
              <Text style={s.quoteLabel}>Estimated price</Text>
              <Text style={s.quotePrice}>{Math.round(parseFloat(quote.totalPrice)).toLocaleString()} <Text style={s.quoteCurrency}>{quote.currency}</Text></Text>
              {quote.distanceKm != null && (
                <Text style={s.quoteSub}>{Number(quote.distanceKm).toFixed(1)} km · {URGENCIES.find(u => u.code === urgency)?.label}</Text>
              )}
            </>
          ) : (
            <>
              <Text style={s.quoteLabel}>Price</Text>
              <Text style={s.quoteEmpty}>Get a quote once both locations are set</Text>
            </>
          )}
          {quoteError ? <Text style={s.errText}>{quoteError}</Text> : null}

          {!quote ? (
            <TouchableOpacity
              style={[s.btn, !canQuote && { opacity: 0.5 }]}
              onPress={fetchQuote}
              disabled={!canQuote || quoteLoading}
            >
              {quoteLoading
                ? <ActivityIndicator color={C.paper} />
                : <Text style={s.btnText}>Get price quote</Text>}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[s.btn, !canSubmit && { opacity: 0.5 }]}
              onPress={goToPayment}
              disabled={!canSubmit}
            >
              <Text style={s.btnText}>Continue to payment</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionBody}>{children}</View>
    </View>
  );
}

function Field({ label, children }) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function LocationButton({ location, placeholder, onPress, color }) {
  return (
    <TouchableOpacity style={s.locBtn} onPress={onPress} activeOpacity={0.85}>
      <View style={[s.locDot, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        {location ? (
          <>
            <Text style={s.locAddress} numberOfLines={2}>{location.address}</Text>
            <Text style={s.locCoords}>{location.lat.toFixed(5)}, {location.lng.toFixed(5)}</Text>
          </>
        ) : (
          <Text style={s.locPlaceholder}>{placeholder}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={C.muted} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 52, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.paper },
  title: { fontSize: 17, fontWeight: '600', color: C.ink },

  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 11, color: C.muted, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
  sectionBody: { backgroundColor: C.paper, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 14 },

  fieldLabel: { fontSize: 11, color: C.muted, fontWeight: '600', marginBottom: 6, letterSpacing: 0.3 },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 12, fontSize: 14, color: C.ink, backgroundColor: C.cream },
  multiline: { minHeight: 64, textAlignVertical: 'top' },

  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { fontSize: 14, color: C.ink },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: C.border, borderRadius: 20, backgroundColor: C.cream },
  pillActive: { backgroundColor: C.forest, borderColor: C.forest },
  pillText: { fontSize: 13, color: C.ink },
  pillTextActive: { color: C.paper, fontWeight: '600' },

  urgencyRow: { flexDirection: 'row', gap: 10 },
  urgencyCard: { flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.cream },
  urgencyCardActive: { borderColor: C.forest, backgroundColor: C.paper, borderWidth: 2 },
  urgencyLabel: { fontSize: 14, fontWeight: '600', color: C.ink },
  urgencySub: { fontSize: 11, color: C.muted, marginTop: 4 },

  locBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  locDot: { width: 12, height: 12, borderRadius: 6 },
  locAddress: { fontSize: 14, color: C.ink, lineHeight: 18 },
  locCoords: { fontSize: 11, color: C.subtle, marginTop: 2, fontFamily: 'monospace' },
  locPlaceholder: { fontSize: 14, color: C.subtle },

  quoteCard: { backgroundColor: C.paper, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 18, marginTop: 4 },
  quoteLabel: { fontSize: 11, color: C.muted, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  quotePrice: { fontSize: 32, fontWeight: '500', color: C.forest, marginTop: 6, letterSpacing: -0.5 },
  quoteCurrency: { fontSize: 14, color: C.muted, fontWeight: '400' },
  quoteSub: { fontSize: 12, color: C.muted, marginTop: 4 },
  quoteEmpty: { fontSize: 14, color: C.subtle, marginTop: 8 },
  errText: { color: C.red, fontSize: 12, marginTop: 8 },

  btn: { backgroundColor: C.forest, borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 14 },
  btnText: { color: C.paper, fontWeight: '600', fontSize: 14 },
});
