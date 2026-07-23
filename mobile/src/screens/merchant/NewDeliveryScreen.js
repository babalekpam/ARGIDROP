import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Switch, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useLang } from '../../context/LanguageContext';
import { t } from '../../utils/i18n';
import api from '../../utils/api';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', amber:'#C28B2C', red:'#B23A48' };

const PACKAGE_TYPE_CODES = ['DOCS', 'FOOD', 'SMALL_BOX', 'LARGE_BOX', 'OTHER'];
const URGENCY_CODES = ['STANDARD', 'EXPRESS'];

export default function NewDeliveryScreen({ navigation }) {
  const { lang } = useLang();
  const [pickup, setPickup] = useState(null);
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

  // Scheduling (Phase 1). scheduleMode: 'now' | 'later'.
  // scheduledDate = ms since epoch of selected day (midnight local), null if "now".
  // scheduledHour = 0-23 selected hour, null if "now".
  const [scheduleMode, setScheduleMode] = useState('now');
  const [scheduledDate, setScheduledDate] = useState(null);
  const [scheduledHour, setScheduledHour] = useState(null);
  // Recurrence: null (one time) | 'DAILY' | 'WEEKLY'. Wallet-paid — the
  // backend auto-funds each repeat from the merchant wallet.
  const [recurrence, setRecurrence] = useState(null);

  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState('');

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

  // Build the full ISO timestamp from selected day + hour (local time).
  const scheduledPickupAt = useMemo(() => {
    if (scheduleMode !== 'later' || scheduledDate == null || scheduledHour == null) return null;
    const d = new Date(scheduledDate);
    d.setHours(scheduledHour, 0, 0, 0);
    return d;
  }, [scheduleMode, scheduledDate, scheduledHour]);

  // Server requires ≥1h lead time. Block submission if user picked a time
  // that's already in the past or too soon.
  const scheduleTooSoon = scheduledPickupAt && scheduledPickupAt.getTime() < Date.now() + 60 * 60 * 1000;

  const canQuote = pickup && dropoff;
  const canSubmit = canQuote
    && dropoffContactName.trim()
    && dropoffContactPhone.trim()
    && quote
    && (scheduleMode === 'now' || (scheduledPickupAt && !scheduleTooSoon));

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
      setQuoteError(e.response?.data?.message || t('newDelivery.couldNotQuote', lang));
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
        promoCode: promoApplied?.code || undefined,
        scheduledPickupAt: scheduledPickupAt ? scheduledPickupAt.toISOString() : undefined,
        isRecurring: scheduledPickupAt && recurrence ? true : undefined,
        recurrenceRule: scheduledPickupAt && recurrence ? recurrence : undefined,
      },
      quote,
      promoPreview: promoApplied || null,
    });
  };

  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [promoApplied, setPromoApplied] = useState(null);

  useEffect(() => { setPromoApplied(null); }, [quote?.totalPrice]);

  const applyPromo = async () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) return;
    if (!quote?.totalPrice) {
      setPromoError(t('newDelivery.promoFirst', lang));
      return;
    }
    setPromoLoading(true); setPromoError('');
    try {
      const res = await api.post('/promo/validate', { code, jobAmount: quote.totalPrice });
      const d = res.data;
      setPromoApplied({
        code: d.promo?.code || code,
        discount: d.discount,
        finalAmount: d.finalAmount,
        description: d.promo?.description,
      });
    } catch (e) {
      setPromoError(e.response?.data?.message || t('newDelivery.invalidPromo', lang));
      setPromoApplied(null);
    } finally { setPromoLoading(false); }
  };

  const removePromo = () => { setPromoApplied(null); setPromoCode(''); setPromoError(''); };

  return (
    <View style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color={C.forest} />
        </TouchableOpacity>
        <Text style={s.title}>{t('newDelivery.title', lang)}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Section title={t('newDelivery.pickup', lang)}>
          <LocationButton
            color={C.bronze}
            location={pickup}
            placeholder={t('newDelivery.choosePickup', lang)}
            onPress={() => openPicker('pickup')}
          />
          <Field label={t('newDelivery.contactName', lang)}>
            <TextInput value={pickupContactName} onChangeText={setPickupContactName} style={s.input} placeholder={t('newDelivery.contactNamePh', lang)} placeholderTextColor={C.subtle} />
          </Field>
          <Field label={t('newDelivery.contactPhone', lang)}>
            <TextInput value={pickupContactPhone} onChangeText={setPickupContactPhone} style={s.input} keyboardType="phone-pad" placeholder="+228..." placeholderTextColor={C.subtle} />
          </Field>
          <Field label={t('newDelivery.pickupNotes', lang)}>
            <TextInput value={pickupNotes} onChangeText={setPickupNotes} style={[s.input, s.multiline]} multiline placeholder={t('newDelivery.pickupNotesPh', lang)} placeholderTextColor={C.subtle} />
          </Field>
        </Section>

        <Section title={t('newDelivery.dropoff', lang)}>
          <LocationButton
            color={C.forest}
            location={dropoff}
            placeholder={t('newDelivery.chooseDropoff', lang)}
            onPress={() => openPicker('dropoff')}
          />
          <Field label={t('newDelivery.recipientName', lang)}>
            <TextInput value={dropoffContactName} onChangeText={setDropoffContactName} style={s.input} placeholder={t('newDelivery.recipientNamePh', lang)} placeholderTextColor={C.subtle} />
          </Field>
          <Field label={t('newDelivery.recipientPhone', lang)}>
            <TextInput value={dropoffContactPhone} onChangeText={setDropoffContactPhone} style={s.input} keyboardType="phone-pad" placeholder="+228..." placeholderTextColor={C.subtle} />
          </Field>
          <Field label={t('newDelivery.dropNotes', lang)}>
            <TextInput value={dropoffNotes} onChangeText={setDropoffNotes} style={[s.input, s.multiline]} multiline placeholder={t('newDelivery.dropNotesPh', lang)} placeholderTextColor={C.subtle} />
          </Field>
        </Section>

        <Section title={t('newDelivery.schedule', lang)}>
          <View style={s.urgencyRow}>
            <TouchableOpacity
              style={[s.urgencyCard, scheduleMode === 'now' && s.urgencyCardActive]}
              onPress={() => { setScheduleMode('now'); setScheduledDate(null); setScheduledHour(null); setRecurrence(null); }}
            >
              <Text style={[s.urgencyLabel, scheduleMode === 'now' && { color: C.forest }]}>{t('newDelivery.scheduleNow', lang)}</Text>
              <Text style={[s.urgencySub, scheduleMode === 'now' && { color: C.forest }]}>{t('newDelivery.scheduleNowSub', lang)}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.urgencyCard, scheduleMode === 'later' && s.urgencyCardActive]}
              onPress={() => setScheduleMode('later')}
            >
              <Text style={[s.urgencyLabel, scheduleMode === 'later' && { color: C.forest }]}>{t('newDelivery.scheduleLater', lang)}</Text>
              <Text style={[s.urgencySub, scheduleMode === 'later' && { color: C.forest }]}>{t('newDelivery.scheduleLaterSub', lang)}</Text>
            </TouchableOpacity>
          </View>

          {scheduleMode === 'later' && (
            <>
              <Field label={t('newDelivery.pickDay', lang)}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
                  {Array.from({ length: 30 }).map((_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() + i);
                    d.setHours(0, 0, 0, 0);
                    const ms = d.getTime();
                    const active = scheduledDate === ms;
                    const label = i === 0 ? t('newDelivery.day.today', lang)
                      : i === 1 ? t('newDelivery.day.tomorrow', lang)
                      : d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' });
                    return (
                      <TouchableOpacity key={ms} style={[s.pill, active && s.pillActive]} onPress={() => setScheduledDate(ms)}>
                        <Text style={[s.pillText, active && s.pillTextActive]}>{label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </Field>

              <Field label={t('newDelivery.pickTime', lang)}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
                  {Array.from({ length: 17 }).map((_, i) => {
                    const hour = 6 + i; // 06:00 to 22:00
                    const active = scheduledHour === hour;
                    return (
                      <TouchableOpacity key={hour} style={[s.pill, active && s.pillActive]} onPress={() => setScheduledHour(hour)}>
                        <Text style={[s.pillText, active && s.pillTextActive]}>{String(hour).padStart(2, '0')}:00</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </Field>

              <Field label={t('newDelivery.repeat', lang)}>
                <View style={s.pillRow}>
                  {[
                    { key: null, label: t('newDelivery.repeat.never', lang) },
                    { key: 'DAILY', label: t('newDelivery.repeat.daily', lang) },
                    { key: 'WEEKLY', label: t('newDelivery.repeat.weekly', lang) },
                  ].map(opt => {
                    const active = recurrence === opt.key;
                    return (
                      <TouchableOpacity key={String(opt.key)} style={[s.pill, active && s.pillActive]} onPress={() => setRecurrence(opt.key)}>
                        <Text style={[s.pillText, active && s.pillTextActive]}>{opt.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {recurrence && (
                  <Text style={{ fontSize: 11, color: C.bronze, marginTop: 6, lineHeight: 15 }}>{t('newDelivery.repeatHint', lang)}</Text>
                )}
              </Field>

              {scheduledPickupAt && (
                <View style={{ marginTop: 12, padding: 12, backgroundColor: C.cream, borderRadius: 8, borderWidth: 1, borderColor: scheduleTooSoon ? C.red : C.border }}>
                  <Text style={{ fontSize: 11, color: C.muted, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>{t('newDelivery.scheduledFor', lang)}</Text>
                  <Text style={{ fontSize: 15, color: scheduleTooSoon ? C.red : C.forest, fontWeight: '600', marginTop: 4 }}>
                    {scheduledPickupAt.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  {scheduleTooSoon && (
                    <Text style={{ fontSize: 12, color: C.red, marginTop: 4 }}>{t('newDelivery.scheduleHint', lang).split('.')[0]} ({lang === 'fr' ? '1 h minimum' : '1h minimum'})</Text>
                  )}
                </View>
              )}
              <Text style={{ fontSize: 11, color: C.muted, marginTop: 8, lineHeight: 15 }}>{t('newDelivery.scheduleHint', lang)}</Text>
            </>
          )}
        </Section>

        <Section title={t('newDelivery.package', lang)}>
          <Field label={t('newDelivery.type', lang)}>
            <View style={s.pillRow}>
              {PACKAGE_TYPE_CODES.map(code => (
                <TouchableOpacity key={code} style={[s.pill, packageType === code && s.pillActive]} onPress={() => { setPackageType(code); invalidateQuote(); }}>
                  <Text style={[s.pillText, packageType === code && s.pillTextActive]}>{t(`pkg.${code}`, lang)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Field>
          <Field label={t('newDelivery.weight', lang)}>
            <TextInput value={weightKg} onChangeText={(v) => { setWeightKg(v.replace(/[^\d.]/g, '')); invalidateQuote(); }} style={s.input} keyboardType="decimal-pad" placeholder={t('newDelivery.weightPh', lang)} placeholderTextColor={C.subtle} />
          </Field>
          <View style={[s.row, { marginTop: 12 }]}>
            <Text style={s.toggleLabel}>{t('newDelivery.fragile', lang)}</Text>
            <Switch value={isFragile} onValueChange={(v) => { setIsFragile(v); invalidateQuote(); }} trackColor={{ true: C.forest, false: C.border }} thumbColor={C.paper} />
          </View>
          <Field label={t('newDelivery.description', lang)}>
            <TextInput value={packageDescription} onChangeText={setPackageDescription} style={[s.input, s.multiline]} multiline placeholder={t('newDelivery.descriptionPh', lang)} placeholderTextColor={C.subtle} />
          </Field>
        </Section>

        <Section title={t('newDelivery.urgency', lang)}>
          <View style={s.urgencyRow}>
            {URGENCY_CODES.map(code => (
              <TouchableOpacity key={code} style={[s.urgencyCard, urgency === code && s.urgencyCardActive]} onPress={() => { setUrgency(code); invalidateQuote(); }}>
                <Text style={[s.urgencyLabel, urgency === code && { color: C.forest }]}>{t(`urgency.${code}`, lang)}</Text>
                <Text style={[s.urgencySub, urgency === code && { color: C.forest }]}>{t(`urgency.${code}.sub`, lang)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        <View style={s.quoteCard}>
          {quote ? (
            <>
              <Text style={s.quoteLabel}>{t('newDelivery.estimated', lang)}</Text>
              <Text style={s.quotePrice}>{Math.round(parseFloat(quote.totalPrice)).toLocaleString()} <Text style={s.quoteCurrency}>{quote.currency}</Text></Text>
              {quote.distanceKm != null && (
                <Text style={s.quoteSub}>{Number(quote.distanceKm).toFixed(1)} km · {t(`urgency.${urgency}`, lang)}</Text>
              )}
            </>
          ) : (
            <>
              <Text style={s.quoteLabel}>{t('newDelivery.priceLabel', lang)}</Text>
              <Text style={s.quoteEmpty}>{t('newDelivery.quoteOnce', lang)}</Text>
            </>
          )}
          {quoteError ? <Text style={s.errText}>{quoteError}</Text> : null}

          {quote && (
            <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.border }}>
              {promoApplied ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, color: C.muted }}>{t('newDelivery.promo', lang)} · {promoApplied.code}</Text>
                    <Text style={{ fontSize: 14, color: C.forest, fontWeight: '600', marginTop: 2 }}>
                      − {Math.round(promoApplied.discount).toLocaleString()} {quote.currency}
                    </Text>
                    {promoApplied.description ? <Text style={{ fontSize: 11, color: C.muted, marginTop: 2 }} numberOfLines={2}>{promoApplied.description}</Text> : null}
                  </View>
                  <TouchableOpacity onPress={removePromo}>
                    <Text style={{ color: C.muted, fontSize: 13, padding: 4 }}>{t('common.remove', lang)}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <Text style={s.fieldLabel}>{t('newDelivery.promoCode', lang)}</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      value={promoCode}
                      onChangeText={setPromoCode}
                      style={[s.input, { flex: 1 }]}
                      placeholder="LAUNCH-LOME"
                      placeholderTextColor={C.subtle}
                      autoCapitalize="characters"
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      style={{ backgroundColor: C.bronze, borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' }}
                      onPress={applyPromo}
                      disabled={promoLoading || !promoCode.trim()}
                    >
                      {promoLoading
                        ? <ActivityIndicator color={C.paper} />
                        : <Text style={{ color: C.paper, fontWeight: '600', fontSize: 13 }}>{t('common.apply', lang)}</Text>}
                    </TouchableOpacity>
                  </View>
                  {promoError ? <Text style={s.errText}>{promoError}</Text> : null}
                </View>
              )}
              {promoApplied && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                  <Text style={{ fontSize: 12, color: C.muted, fontWeight: '600' }}>{t('newDelivery.youPay', lang)}</Text>
                  <Text style={{ fontSize: 16, color: C.ink, fontWeight: '700' }}>
                    {Math.round(promoApplied.finalAmount).toLocaleString()} {quote.currency}
                  </Text>
                </View>
              )}
            </View>
          )}

          {!quote ? (
            <TouchableOpacity
              style={[s.btn, !canQuote && { opacity: 0.5 }]}
              onPress={fetchQuote}
              disabled={!canQuote || quoteLoading}
            >
              {quoteLoading
                ? <ActivityIndicator color={C.paper} />
                : <Text style={s.btnText}>{t('newDelivery.getQuote', lang)}</Text>}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[s.btn, !canSubmit && { opacity: 0.5 }]}
              onPress={goToPayment}
              disabled={!canSubmit}
            >
              <Text style={s.btnText}>{t('newDelivery.continuePay', lang)}</Text>
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
