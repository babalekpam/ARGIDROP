// Driver Home — map with nearby jobs, online/offline toggle, current active delivery
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Switch, FlatList, RefreshControl, Alert } from 'react-native';
import MapView from '../../components/MapView';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useLang } from '../../context/LanguageContext';
import { t } from '../../utils/i18n';
import api from '../../utils/api';

const C = { cream: '#F7F3EB', paper: '#FDFBF6', forest: '#1B4332', forestSoft: '#2D5E3E', bronze: '#8B6F47', ink: '#1A1A1A', muted: '#6B6560', subtle: '#9A9489', border: '#E4DCC9', success: '#2D5E3E' };

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const { lang } = useLang();
  const { getSocket } = useSocket();
  const [isOnline, setIsOnline] = useState(false);
  const [location, setLocation] = useState(null);
  const [availableJobs, setAvailableJobs] = useState([]);
  const [scheduledJobs, setScheduledJobs] = useState([]);
  const [myScheduledJobs, setMyScheduledJobs] = useState([]);
  const [activeTab, setActiveTab] = useState('available'); // 'available' | 'scheduled'
  const [activeJob, setActiveJob] = useState(null);
  const [todayStats, setTodayStats] = useState({ earnings: 0, deliveries: 0 });
  const [payoutStatus, setPayoutStatus] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const locationSub = useRef(null);
  const mapRef = useRef(null);

  const loadJobs = useCallback(async () => {
    if (!location) return;
    try {
      const res = await api.get(`/jobs/available?lat=${location.latitude}&lng=${location.longitude}&radius=15`);
      setAvailableJobs(res.data.jobs || []);
    } catch (err) { console.error('Load jobs error:', err.message); }
  }, [location]);

  const loadScheduled = useCallback(async () => {
    try {
      const q = location ? `?lat=${location.latitude}&lng=${location.longitude}&radius=50` : '';
      const [open, mine] = await Promise.all([
        api.get(`/jobs/scheduled${q}`),
        api.get('/jobs/scheduled?mine=1'),
      ]);
      setScheduledJobs(open.data.jobs || []);
      setMyScheduledJobs(mine.data.jobs || []);
    } catch (err) { console.error('Load scheduled error:', err.message); }
  }, [location]);

  const preclaim = async (jobId) => {
    try {
      await api.post(`/jobs/${jobId}/preclaim`);
      Alert.alert(t('driverHome.preclaimed', lang), t('driverHome.preclaimSuccess', lang));
      await loadScheduled();
    } catch (e) {
      Alert.alert('', e.response?.data?.message || 'Could not reserve job');
    }
  };

  const releasePreclaim = async (jobId) => {
    try {
      await api.post(`/jobs/${jobId}/release-preclaim`);
      await loadScheduled();
    } catch (e) {
      Alert.alert('', e.response?.data?.message || 'Could not release');
    }
  };

  const loadActiveJob = async () => {
    try {
      const res = await api.get('/jobs?status=IN_TRANSIT&limit=1');
      const active = res.data.jobs?.[0];
      if (!active) {
        const matched = await api.get('/jobs?status=MATCHED&limit=1');
        setActiveJob(matched.data.jobs?.[0] || null);
      } else setActiveJob(active);
    } catch {}
  };

  const loadStats = async () => {
    try {
      const res = await api.get('/drivers/earnings');
      setTodayStats({ earnings: parseFloat(res.data.thisMonth || 0), deliveries: res.data.totalDeliveries || 0 });
    } catch {}
  };

  const loadPayoutStatus = async () => {
    try {
      const res = await api.get('/drivers/payout-status');
      setPayoutStatus(res.data);
      if (res.data.isOnShift) setIsOnline(true);
    } catch {}
  };

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation(loc.coords);
    })();
    loadActiveJob();
    loadStats();
    loadPayoutStatus();
  }, []);

  useEffect(() => { loadJobs(); loadScheduled(); }, [location, loadJobs, loadScheduled]);

  useEffect(() => {
    let cancelled = false;
    if (isOnline) {
      (async () => {
        if (!payoutStatus?.isOnShift) {
          try {
            await api.post('/drivers/shift/start', {});
            await loadPayoutStatus();
          } catch (err) {
            const code = err.response?.data?.code;
            const msg = err.response?.data?.message || t('driverHome.couldNotStart', lang);
            if (cancelled) return;
            setIsOnline(false);
            if (code === 'PAYOUT_NOT_CONFIGURED') {
              Alert.alert(t('driverHome.setupPayout', lang), msg, [
                { text: t('common.cancel', lang), style: 'cancel' },
                { text: t('driverHome.setupPin', lang), onPress: () => navigation.navigate('PayoutPinSetup') },
              ]);
            } else {
              Alert.alert(t('driverHome.cantOnline', lang), msg);
            }
            return;
          }
        }
        if (cancelled) return;
        locationSub.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 15000, distanceInterval: 50 },
          loc => {
            setLocation(loc.coords);
            api.patch('/drivers/location', { lat: loc.coords.latitude, lng: loc.coords.longitude }).catch(()=>{});
            getSocket()?.emit('driver:location', { lat: loc.coords.latitude, lng: loc.coords.longitude });
          }
        );
        api.patch('/drivers/online', { online: true }).catch(()=>{});
      })();
    } else {
      locationSub.current?.remove();
      api.patch('/drivers/online', { online: false }).catch(()=>{});
    }
    return () => { cancelled = true; locationSub.current?.remove(); };
  }, [isOnline]);

  const goToEndShift = () => {
    if (!payoutStatus?.pinSet) {
      navigation.navigate('PayoutPinSetup', { onSuccess: () => navigation.navigate('EndShift') });
    } else {
      navigation.navigate('EndShift');
    }
  };

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = (job) => {
      if (isOnline) navigation.navigate('JobAlert', { jobId: job.id });
    };
    socket.on('job:available', handler);
    return () => socket.off('job:available', handler);
  }, [isOnline]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadJobs(), loadScheduled(), loadActiveJob(), loadStats()]);
    setRefreshing(false);
  };

  const fmtDateTime = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const dateLocale = lang === 'fr' ? 'fr-FR' : 'en-US';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.cream }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.forest} />}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.greeting}>{t('driverHome.hello', lang, { name: user?.firstName })}</Text>
          <Text style={s.date}>{new Date().toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={s.onlineLabel}>{isOnline ? t('driverHome.online', lang) : t('driverHome.offline', lang)}</Text>
          <Switch value={isOnline} onValueChange={setIsOnline}
            trackColor={{ false: C.border, true: C.forestSoft }}
            thumbColor={isOnline ? C.forest : C.subtle} />
        </View>
      </View>

      {activeJob && (
        <TouchableOpacity style={s.activeBanner} onPress={() => navigation.navigate('ActiveDelivery', { jobId: (activeJob.job || activeJob).id })}>
          <View style={{ flex: 1 }}>
            <Text style={s.activeLabel}>{t('driverHome.activeLabel', lang)}</Text>
            <Text style={s.activeAddr} numberOfLines={1}>{(activeJob.job || activeJob).dropoffAddress}</Text>
            <Text style={s.activePrice}>{(activeJob.job || activeJob).priceOffered} {(activeJob.job || activeJob).currency}</Text>
          </View>
          <Text style={s.activeAction}>{t('driverHome.continue', lang)}</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('Earnings')}>
        <View style={[s.earningsCard, parseFloat(payoutStatus?.pendingEarnings || 0) > 0 && s.earningsCardActive]}>
          <View style={{ flex: 1 }}>
            <Text style={[s.cardLabel, parseFloat(payoutStatus?.pendingEarnings || 0) > 0 && { color: '#C4D4C8' }]}>{t('driverHome.readyCashout', lang)}</Text>
            <Text style={[s.cardAmount, parseFloat(payoutStatus?.pendingEarnings || 0) > 0 && { color: C.paper }]}>
              {Math.round(parseFloat(payoutStatus?.pendingEarnings || 0)).toLocaleString()}
            </Text>
            <Text style={[s.cardCurrency, parseFloat(payoutStatus?.pendingEarnings || 0) > 0 && { color: '#C4D4C8' }]}>{t('driverHome.xofPending', lang)}</Text>
          </View>
          {parseFloat(payoutStatus?.pendingEarnings || 0) > 0 ? (
            <TouchableOpacity style={s.cashoutPill} onPress={goToEndShift}>
              <Text style={s.cashoutPillText}>{t('driverHome.endShift', lang)}</Text>
            </TouchableOpacity>
          ) : (
            <>
              <View style={s.cardDivider} />
              <View style={{ flex: 1 }}>
                <Text style={s.cardLabel}>{t('driverHome.deliveriesLabel', lang)}</Text>
                <Text style={s.cardAmount}>{todayStats.deliveries}</Text>
                <Text style={s.cardCurrency}>{t('driverHome.allTime', lang)}</Text>
              </View>
            </>
          )}
        </View>
      </TouchableOpacity>

      {location && (
        <View style={s.mapWrap}>
          <View style={{ height: 240 }}>
            <MapView
              center={{ latitude: location.latitude, longitude: location.longitude }}
              zoom={12}
              showUserLocation
              userLocation={{ latitude: location.latitude, longitude: location.longitude }}
              markers={availableJobs
                .filter(({ job }) => job.pickupLat && job.pickupLng)
                .map(({ job }) => ({
                  lat: parseFloat(job.pickupLat),
                  lng: parseFloat(job.pickupLng),
                  type: 'job',
                  label: `${Math.round(parseFloat(job.priceOffered) / 1000)}k`,
                }))}
            />
          </View>
        </View>
      )}

      <View style={s.jobsSection}>
        <View style={s.tabRow}>
          <TouchableOpacity style={[s.tab, activeTab === 'available' && s.tabActive]} onPress={() => setActiveTab('available')}>
            <Text style={[s.tabText, activeTab === 'available' && s.tabTextActive]}>
              {t('driverHome.tabAvailable', lang)} · {availableJobs.length}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.tab, activeTab === 'scheduled' && s.tabActive]} onPress={() => setActiveTab('scheduled')}>
            <Text style={[s.tabText, activeTab === 'scheduled' && s.tabTextActive]}>
              {t('driverHome.tabScheduled', lang)} · {scheduledJobs.length + myScheduledJobs.length}
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'available' ? (
          !isOnline ? (
            <View style={s.emptyState}>
              <Text style={s.emptyTitle}>{t('driverHome.goOnline', lang)}</Text>
              <Text style={s.emptyText}>{t('driverHome.goOnlineDesc', lang)}</Text>
            </View>
          ) : availableJobs.length === 0 ? (
            <View style={s.emptyState}>
              <Text style={s.emptyTitle}>{t('driverHome.noJobs', lang)}</Text>
              <Text style={s.emptyText}>{t('driverHome.noJobsDesc', lang)}</Text>
            </View>
          ) : (
            availableJobs.slice(0, 10).map(({ job }) => (
              <TouchableOpacity key={job.id} style={s.jobCard}
                onPress={() => navigation.navigate('JobDetail', { jobId: job.id })}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <View style={s.urgencyChip}>
                    <Text style={s.urgencyText}>{t(`urgency.${job.urgency || 'STANDARD'}`, lang).toUpperCase()}</Text>
                  </View>
                  <Text style={s.jobPrice}>{job.priceOffered} {job.currency}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 4 }}>
                  <View style={{ width: 3, backgroundColor: C.bronze, borderRadius: 2 }} />
                  <Text style={s.jobAddr} numberOfLines={1}>{job.pickupAddress}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ width: 3, backgroundColor: C.forest, borderRadius: 2 }} />
                  <Text style={s.jobAddr} numberOfLines={1}>{job.dropoffAddress}</Text>
                </View>
                <Text style={s.jobMeta}>{t(`pkg.${job.packageType}`, lang)}{job.weightKg ? ` · ${job.weightKg} kg` : ''}</Text>
              </TouchableOpacity>
            ))
          )
        ) : (
          // SCHEDULED TAB
          (scheduledJobs.length + myScheduledJobs.length) === 0 ? (
            <View style={s.emptyState}>
              <Text style={s.emptyTitle}>{t('driverHome.scheduledEmpty', lang)}</Text>
              <Text style={s.emptyText}>{t('driverHome.scheduledEmptyDesc', lang)}</Text>
            </View>
          ) : (
            <>
              {myScheduledJobs.map(({ job }) => (
                <View key={job.id} style={[s.jobCard, { borderColor: C.forest, borderWidth: 1.5 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <View style={[s.urgencyChip, { backgroundColor: C.forest, borderColor: C.forest }]}>
                      <Text style={[s.urgencyText, { color: C.paper }]}>{t('driverHome.preclaimed', lang).toUpperCase()}</Text>
                    </View>
                    <Text style={s.jobPrice}>{job.priceOffered} {job.currency}</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: C.forest, fontWeight: '600', marginBottom: 8 }}>
                    {t('driverHome.scheduledFor', lang)}: {fmtDateTime(job.scheduledPickupAt)}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 4 }}>
                    <View style={{ width: 3, backgroundColor: C.bronze, borderRadius: 2 }} />
                    <Text style={s.jobAddr} numberOfLines={1}>{job.pickupAddress}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ width: 3, backgroundColor: C.forest, borderRadius: 2 }} />
                    <Text style={s.jobAddr} numberOfLines={1}>{job.dropoffAddress}</Text>
                  </View>
                  <TouchableOpacity onPress={() => releasePreclaim(job.id)} style={{ marginTop: 10, alignSelf: 'flex-end' }}>
                    <Text style={{ color: C.muted, fontSize: 12, fontWeight: '600' }}>{t('driverHome.releasePreclaim', lang)}</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {scheduledJobs.map(({ job }) => (
                <View key={job.id} style={s.jobCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <View style={s.urgencyChip}>
                      <Text style={s.urgencyText}>{t(`urgency.${job.urgency || 'STANDARD'}`, lang).toUpperCase()}</Text>
                    </View>
                    <Text style={s.jobPrice}>{job.priceOffered} {job.currency}</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: C.bronze, fontWeight: '600', marginBottom: 8 }}>
                    {t('driverHome.scheduledFor', lang)}: {fmtDateTime(job.scheduledPickupAt)}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 4 }}>
                    <View style={{ width: 3, backgroundColor: C.bronze, borderRadius: 2 }} />
                    <Text style={s.jobAddr} numberOfLines={1}>{job.pickupAddress}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ width: 3, backgroundColor: C.forest, borderRadius: 2 }} />
                    <Text style={s.jobAddr} numberOfLines={1}>{job.dropoffAddress}</Text>
                  </View>
                  <TouchableOpacity onPress={() => preclaim(job.id)} style={{ marginTop: 12, backgroundColor: C.forest, paddingVertical: 10, borderRadius: 6, alignItems: 'center' }}>
                    <Text style={{ color: C.paper, fontWeight: '600', fontSize: 13 }}>{t('driverHome.preclaim', lang)}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )
        )}
      </View>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 48, paddingBottom: 16 },
  greeting: { fontSize: 22, fontWeight: '500', color: C.ink },
  date: { fontSize: 12, color: C.muted, marginTop: 2 },
  onlineLabel: { fontSize: 10, color: C.muted, letterSpacing: 1, fontWeight: '600', marginBottom: 6 },
  activeBanner: { margin: 20, marginTop: 4, backgroundColor: C.forest, borderRadius: 8, padding: 16, flexDirection: 'row', alignItems: 'center' },
  activeLabel: { fontSize: 10, color: '#C4D4C8', letterSpacing: 1.5, fontWeight: '700', marginBottom: 4 },
  activeAddr: { fontSize: 14, color: C.paper, fontWeight: '500', marginBottom: 4 },
  activePrice: { fontSize: 18, color: C.paper, fontWeight: '600' },
  activeAction: { fontSize: 13, color: C.paper, fontWeight: '500' },
  earningsCard: { flexDirection: 'row', alignItems: 'center', margin: 20, marginTop: 4, backgroundColor: C.paper, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 20 },
  earningsCardActive: { backgroundColor: C.forest, borderColor: C.forest },
  cashoutPill: { backgroundColor: C.paper, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6 },
  cashoutPillText: { color: C.forest, fontWeight: '600', fontSize: 13 },
  cardLabel: { fontSize: 10, color: C.muted, letterSpacing: 1.2, fontWeight: '600', marginBottom: 8 },
  cardAmount: { fontSize: 26, fontWeight: '500', color: C.ink, lineHeight: 30 },
  cardCurrency: { fontSize: 11, color: C.subtle, marginTop: 2 },
  cardDivider: { width: 1, backgroundColor: C.border, marginHorizontal: 16 },
  mapWrap: { marginHorizontal: 20, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: C.border, marginBottom: 20 },
  jobsSection: { paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '500', color: C.ink },
  sectionCount: { fontSize: 11, color: C.muted, letterSpacing: 1, fontWeight: '600' },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  tab: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: C.forest },
  tabText: { fontSize: 13, color: C.muted, fontWeight: '500' },
  tabTextActive: { color: C.forest, fontWeight: '600' },
  emptyState: { backgroundColor: C.paper, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 24, alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '500', color: C.ink, marginBottom: 6 },
  emptyText: { fontSize: 13, color: C.muted, textAlign: 'center' },
  jobCard: { backgroundColor: C.paper, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 14, marginBottom: 8 },
  urgencyChip: { backgroundColor: '#FAF3E5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 3, borderWidth: 1, borderColor: '#E8D9B9' },
  urgencyText: { fontSize: 9, color: C.bronze, fontWeight: '700', letterSpacing: 0.8 },
  jobPrice: { fontSize: 18, fontWeight: '500', color: C.forest },
  jobAddr: { fontSize: 13, color: C.ink, flex: 1 },
  jobMeta: { fontSize: 11, color: C.subtle, marginTop: 8 },
});
