// Consumer home — restaurants, shops, and ride booking in one place
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import AddressPicker from '../../components/AddressPicker';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', borderSoft:'#EFE8D7' };

const VEHICLES = [
  { type:'MOTO', icon:'🏍' },
  { type:'ZEMIDJAN', icon:'🛵' },
  { type:'CAR', icon:'🚗' },
  { type:'TRICYCLE', icon:'🛺' },
];

const card = { background:C.paper, border:`1px solid ${C.border}`, borderRadius:14, padding:20 };

export default function ConsumerHome() {
  const { t } = useTranslation();
  const [restaurants, setRestaurants] = useState([]);
  const [shops, setShops] = useState([]);
  const [loadingLists, setLoadingLists] = useState(true);

  // Ride state
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [vehicle, setVehicle] = useState('MOTO');
  const [estimate, setEstimate] = useState(null);
  const [estimating, setEstimating] = useState(false);
  const [booking, setBooking] = useState(false);
  const [ride, setRide] = useState(null);

  useEffect(() => {
    Promise.allSettled([
      api.get('/food?limit=6'),
      api.get('/listings/public/merchants?limit=6'),
    ]).then(([f, m]) => {
      if (f.status === 'fulfilled') setRestaurants(f.value.data.restaurants || []);
      if (m.status === 'fulfilled') setShops(m.value.data.merchants || []);
      if (f.status === 'rejected' && m.status === 'rejected') toast.error(t('home.loadFailed'));
    }).finally(() => setLoadingLists(false));
  }, []);

  useEffect(() => {
    setEstimate(null); setRide(null);
    if (!from?.lat || !to?.lat) return;
    setEstimating(true);
    api.post('/rides/estimate', { fromLat:from.lat, fromLng:from.lng, toLat:to.lat, toLng:to.lng, vehicleType:vehicle })
      .then(r => setEstimate(r.data))
      .catch(() => toast.error(t('home.rideFailed')))
      .finally(() => setEstimating(false));
  }, [from, to, vehicle]);

  const bookRide = async () => {
    if (!from?.lat || !to?.lat) return toast.error(t('home.fillAddresses'));
    setBooking(true);
    try {
      const r = await api.post('/rides/request', {
        fromAddress: from.address, fromLat: from.lat, fromLng: from.lng,
        toAddress: to.address, toLat: to.lat, toLng: to.lng,
        vehicleType: vehicle, paymentMethod: 'CASH',
      });
      setRide(r.data.rideRequest);
    } catch (err) {
      toast.error(err.response?.data?.error || t('home.rideFailed'));
    } finally { setBooking(false); }
  };

  const sectionTitle = (txt, linkTo, linkLabel) => (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', margin:'0 0 12px' }}>
      <h2 style={{ fontFamily:'Fraunces, serif', fontSize:20, fontWeight:500, margin:0, letterSpacing:'-0.02em' }}>{txt}</h2>
      {linkTo && <Link to={linkTo} style={{ fontSize:13, color:C.bronze, textDecoration:'none', fontWeight:600 }}>{linkLabel} →</Link>}
    </div>
  );

  return (
    <div style={{ maxWidth:960, margin:'0 auto', padding:'8px 0 40px' }}>
      <h1 style={{ fontFamily:'Fraunces, serif', fontSize:26, fontWeight:500, margin:'0 0 4px', letterSpacing:'-0.02em' }}>{t('home.title')}</h1>
      <p style={{ color:C.muted, fontSize:14, margin:'0 0 24px' }}>{t('home.subtitle')}</p>

      {/* Quick actions */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:14, marginBottom:32 }}>
        {[
          { icon:'🍽', title:t('home.actionFood'), desc:t('home.actionFoodDesc'), to:'/dashboard/food' },
          { icon:'🛍', title:t('home.actionShops'), desc:t('home.actionShopsDesc'), to:'/dashboard/marketplace' },
          { icon:'🏍', title:t('home.actionRide'), desc:t('home.actionRideDesc'), href:'#ride' },
        ].map(a => {
          const inner = (
            <div style={{ ...card, display:'flex', gap:14, alignItems:'center', cursor:'pointer' }}>
              <span style={{ fontSize:30 }}>{a.icon}</span>
              <div>
                <div style={{ fontWeight:700, fontSize:15, color:C.ink }}>{a.title}</div>
                <div style={{ fontSize:12.5, color:C.muted }}>{a.desc}</div>
              </div>
            </div>
          );
          return a.to
            ? <Link key={a.title} to={a.to} style={{ textDecoration:'none' }}>{inner}</Link>
            : <a key={a.title} href={a.href} style={{ textDecoration:'none' }}>{inner}</a>;
        })}
      </div>

      {/* Restaurants */}
      <section style={{ marginBottom:32 }}>
        {sectionTitle(t('home.restaurantsTitle'), '/dashboard/food', t('home.seeAll'))}
        {loadingLists ? <div style={{ color:C.subtle, fontSize:13 }}>…</div>
        : restaurants.length === 0 ? (
          <div style={{ ...card, color:C.muted, fontSize:13.5 }}>{t('home.noRestaurants')}</div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:14 }}>
            {restaurants.map(r => (
              <Link key={r.id} to={`/dashboard/food/${r.slug || r.id}`} style={{ ...card, padding:16, textDecoration:'none', color:C.ink, opacity:r.isOnline ? 1 : 0.55 }}>
                <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
                  <div style={{ fontWeight:700, fontSize:15 }}>{r.name}</div>
                  <div style={{ fontSize:12.5, color:C.bronze, whiteSpace:'nowrap' }}>★ {Number(r.rating) ? Number(r.rating).toFixed(1) : '—'}</div>
                </div>
                <div style={{ fontSize:12.5, color:C.muted, marginTop:4 }}>
                  {(Array.isArray(r.cuisineTypes) ? r.cuisineTypes.join(' · ') : '') || r.city || ''}
                </div>
                <div style={{ fontSize:12, color:C.subtle, marginTop:8 }}>
                  {r.isOnline ? `⏱ ~${r.averageDeliveryMins || 30} min` : t('home.closed')}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Shops */}
      <section style={{ marginBottom:32 }}>
        {sectionTitle(t('home.shopsTitle'), '/dashboard/marketplace', t('home.seeAll'))}
        {loadingLists ? <div style={{ color:C.subtle, fontSize:13 }}>…</div>
        : shops.length === 0 ? (
          <div style={{ ...card, color:C.muted, fontSize:13.5 }}>{t('home.noShops')}</div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:14 }}>
            {shops.map(s => (
              <Link key={s.id || s.slug} to={`/dashboard/marketplace`} style={{ ...card, padding:16, textDecoration:'none', color:C.ink }}>
                <div style={{ fontWeight:700, fontSize:15 }}>{s.companyName || s.name}</div>
                <div style={{ fontSize:12.5, color:C.muted, marginTop:4 }}>{s.city || ''}</div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Ride booking */}
      <section id="ride">
        {sectionTitle(t('home.rideTitle'))}
        <div style={{ ...card }}>
          <p style={{ fontSize:13, color:C.muted, margin:'0 0 16px' }}>{t('home.rideSubtitle')}</p>

          <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:16, maxWidth:560 }}>
            <div>
              <label style={{ fontSize:12.5, fontWeight:700, color:C.ink, display:'block', marginBottom:6 }}>{t('home.rideFrom')}</label>
              <AddressPicker value={from} onChange={setFrom} color={C.forest} height={0} />
            </div>
            <div>
              <label style={{ fontSize:12.5, fontWeight:700, color:C.ink, display:'block', marginBottom:6 }}>{t('home.rideTo')}</label>
              <AddressPicker value={to} onChange={setTo} color={C.bronze} height={0} />
            </div>

            <div>
              <label style={{ fontSize:12.5, fontWeight:700, color:C.ink, display:'block', marginBottom:8 }}>{t('home.rideVehicle')}</label>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {VEHICLES.map(v => (
                  <button key={v.type} onClick={() => setVehicle(v.type)} style={{
                    padding:'8px 14px', borderRadius:999, cursor:'pointer', fontSize:13, fontWeight:600,
                    border:`1.5px solid ${vehicle === v.type ? C.forest : C.border}`,
                    background: vehicle === v.type ? C.forest : C.paper,
                    color: vehicle === v.type ? '#fff' : C.ink,
                  }}>{v.icon} {t(`home.vehicle.${v.type}`)}</button>
                ))}
              </div>
            </div>

            {estimating && <div style={{ fontSize:13, color:C.subtle }}>{t('home.estimating')}</div>}

            {estimate && !ride && (
              <div style={{ background:C.cream, border:`1px solid ${C.borderSoft}`, borderRadius:10, padding:14, fontSize:13.5 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ color:C.muted }}>{t('home.ridePrice')}</span>
                  <strong>{estimate.estimatedPrice?.toLocaleString()} XOF</strong>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ color:C.muted }}>{t('home.rideDistance')}</span>
                  <span>{estimate.distanceKm} km · ~{estimate.estimatedDurationMin} min</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ color:C.muted }}>{t('home.rideDrivers')}</span>
                  <span>{estimate.availableDriverCount}</span>
                </div>
                {estimate.availableDriverCount === 0 && (
                  <div style={{ marginTop:8, fontSize:12.5, color:C.bronze }}>{t('home.rideNoDrivers')}</div>
                )}
              </div>
            )}

            {ride ? (
              <div style={{ background:'#EAF3ED', border:'1px solid #CBE0D2', borderRadius:10, padding:16 }}>
                <div style={{ fontWeight:700, fontSize:15, color:C.forest, marginBottom:4 }}>
                  {ride.status === 'MATCHED' ? t('home.rideBookedMatched') : t('home.rideBookedSearching')}
                </div>
                <div style={{ fontSize:13, color:C.muted }}>
                  {t('home.ridePrice')}: <strong style={{ color:C.ink }}>{ride.estimatedPrice?.toLocaleString()} XOF</strong> · {t('home.payCash')}
                </div>
              </div>
            ) : (
              <button onClick={bookRide} disabled={booking || !estimate} style={{
                padding:'12px 20px', borderRadius:10, border:'none', cursor: booking || !estimate ? 'default' : 'pointer',
                background: booking || !estimate ? C.border : C.forest, color: booking || !estimate ? C.subtle : '#fff',
                fontWeight:700, fontSize:14, width:'fit-content',
              }}>{booking ? t('home.booking') : t('home.rideBook')}</button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
