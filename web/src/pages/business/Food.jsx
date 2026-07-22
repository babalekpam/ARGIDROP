import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', borderSoft:'#EFE8D7' };

const STATUS_COLORS = {
  PENDING:'#8B6F47', CONFIRMED:'#1B4332', PREPARING:'#1B4332', READY_FOR_PICKUP:'#1B4332',
  PICKED_UP:'#1B4332', DELIVERED:'#2F855A', CANCELLED:'#9B2C2C', REFUNDED:'#9B2C2C',
};

export default function Food() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('browse');
  const [restaurants, setRestaurants] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    if (tab === 'browse') {
      api.get('/food?limit=50')
        .then(r => setRestaurants(r.data.restaurants || []))
        .catch(() => toast.error(t('food.loadFailed')))
        .finally(() => setLoading(false));
    } else {
      api.get('/food/orders/me')
        .then(r => setOrders(r.data.orders || []))
        .catch(() => toast.error(t('food.loadFailed')))
        .finally(() => setLoading(false));
    }
  }, [tab]);

  const filtered = restaurants.filter(r =>
    !search || (r.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding:'28px 32px', fontFamily:'Inter, sans-serif' }}>
      <div style={{ paddingBottom:20, borderBottom:`1px solid ${C.borderSoft}`, marginBottom:24 }}>
        <div style={{ fontSize:11, color:C.bronze, letterSpacing:'0.16em', fontWeight:500, textTransform:'uppercase', marginBottom:6 }}>ArgiDrop Food</div>
        <h1 style={{ fontFamily:'Fraunces, serif', fontSize:26, fontWeight:500, margin:'0 0 4px', letterSpacing:'-0.02em' }}>{t('food.title')}</h1>
        <p style={{ color:C.muted, fontSize:14, margin:0 }}>{t('food.subtitle')}</p>
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        {[['browse', t('food.tabBrowse')], ['orders', t('food.tabOrders')]].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ background:tab===k?C.forest:C.paper, color:tab===k?C.paper:C.muted, border:`1px solid ${tab===k?C.forest:C.border}`, borderRadius:100, padding:'8px 18px', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'browse' && (
        <>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('food.searchPlaceholder')}
            style={{ width:'100%', maxWidth:420, background:C.paper, border:`1px solid ${C.border}`, borderRadius:4, padding:'9px 14px', fontSize:14, color:C.ink, fontFamily:'inherit', marginBottom:20, display:'block' }} />

          {loading ? (
            <div style={{ padding:48, textAlign:'center', color:C.muted }}>{t('food.loading')}</div>
          ) : filtered.length === 0 ? (
            <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, padding:48, textAlign:'center' }}>
              <div style={{ fontSize:32, marginBottom:12 }}>🍽️</div>
              <div style={{ fontFamily:'Fraunces, serif', fontSize:18, marginBottom:8 }}>{t('food.emptyTitle')}</div>
              <div style={{ color:C.muted, fontSize:14 }}>{t('food.emptyBody')}</div>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:14 }}>
              {filtered.map(r => (
                <Link key={r.id} to={`/dashboard/food/${r.slug || r.id}`} style={{ textDecoration:'none', color:'inherit' }}>
                  <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, overflow:'hidden', cursor:'pointer', transition:'box-shadow 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(27,67,50,0.10)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                    <div style={{ height:120, background:r.coverUrl ? `url(${r.coverUrl}) center/cover` : `linear-gradient(135deg, ${C.forest}, #2D6A4F)`, position:'relative' }}>
                      {!r.isOnline && (
                        <div style={{ position:'absolute', inset:0, background:'rgba(26,26,26,0.55)', display:'flex', alignItems:'center', justifyContent:'center', color:C.paper, fontSize:13, fontWeight:500 }}>
                          {t('food.closed')}
                        </div>
                      )}
                      {r.isFeatured && r.isOnline && (
                        <span style={{ position:'absolute', top:10, left:10, background:C.bronze, color:C.paper, fontSize:10, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', padding:'3px 8px', borderRadius:3 }}>
                          {t('food.featured')}
                        </span>
                      )}
                    </div>
                    <div style={{ padding:'14px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                        {r.logoUrl && <img src={r.logoUrl} alt="" style={{ width:32, height:32, borderRadius:6, objectFit:'cover' }} />}
                        <div style={{ fontFamily:'Fraunces, serif', fontSize:16, fontWeight:500 }}>{r.name}</div>
                      </div>
                      <div style={{ display:'flex', gap:12, fontSize:12, color:C.muted, flexWrap:'wrap' }}>
                        <span>★ {parseFloat(r.rating || 0).toFixed(1)} ({r.ratingCount || 0})</span>
                        <span>🕐 {r.averageDeliveryMins || 35} min</span>
                        {parseFloat(r.minimumOrderAmount || 0) > 0 && <span>{t('food.min')} {Math.round(r.minimumOrderAmount)} XOF</span>}
                      </div>
                      {Array.isArray(r.cuisineTypes) && r.cuisineTypes.length > 0 && (
                        <div style={{ marginTop:8, display:'flex', gap:5, flexWrap:'wrap' }}>
                          {r.cuisineTypes.slice(0,3).map(ct => (
                            <span key={ct} style={{ fontSize:11, color:C.bronze, background:C.cream, border:`1px solid ${C.borderSoft}`, borderRadius:100, padding:'2px 8px' }}>{ct}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'orders' && (
        loading ? (
          <div style={{ padding:48, textAlign:'center', color:C.muted }}>{t('food.loading')}</div>
        ) : orders.length === 0 ? (
          <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, padding:48, textAlign:'center' }}>
            <div style={{ fontFamily:'Fraunces, serif', fontSize:18, marginBottom:8 }}>{t('food.noOrders')}</div>
            <div style={{ color:C.muted, fontSize:14 }}>{t('food.noOrdersBody')}</div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {orders.map(o => (
              <div key={o.id} style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, padding:'14px 18px', display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
                {o.restaurantLogo && <img src={o.restaurantLogo} alt="" style={{ width:38, height:38, borderRadius:6, objectFit:'cover' }} />}
                <div style={{ flex:1, minWidth:160 }}>
                  <div style={{ fontWeight:500, fontSize:14 }}>{o.restaurantName || t('food.restaurant')}</div>
                  <div style={{ fontSize:12, color:C.muted }}>{new Date(o.createdAt).toLocaleString()}</div>
                </div>
                <div style={{ fontWeight:600, fontSize:14 }}>{Math.round(o.total)} {o.currency}</div>
                <span style={{ fontSize:11, fontWeight:600, letterSpacing:'0.06em', color:STATUS_COLORS[o.status] || C.muted, background:C.cream, border:`1px solid ${C.borderSoft}`, borderRadius:100, padding:'4px 10px' }}>
                  {t(`food.status.${o.status}`, o.status)}
                </span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
