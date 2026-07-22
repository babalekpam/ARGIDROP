import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', borderSoft:'#EFE8D7' };

export default function FoodRestaurant() {
  const { t } = useTranslation();
  const { idOrSlug } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState({}); // menuItemId -> { item, qty }
  const [checkout, setCheckout] = useState(false);
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(null);

  useEffect(() => {
    api.get(`/food/${idOrSlug}`)
      .then(r => setData(r.data))
      .catch(() => toast.error(t('food.notFound')))
      .finally(() => setLoading(false));
  }, [idOrSlug]);

  if (loading) return <div style={{ padding:48, textAlign:'center', color:C.muted, fontFamily:'Inter, sans-serif' }}>{t('food.loading')}</div>;
  if (!data?.restaurant) return (
    <div style={{ padding:48, textAlign:'center', fontFamily:'Inter, sans-serif' }}>
      <div style={{ color:C.muted, marginBottom:12 }}>{t('food.notFound')}</div>
      <Link to="/dashboard/food" style={{ color:C.forest }}>{t('food.backToList')}</Link>
    </div>
  );

  const { restaurant: r, menu } = data;
  const items = Object.values(cart);
  const subtotal = items.reduce((s, { item, qty }) => s + parseFloat(item.price) * qty, 0);
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
    if (!address.trim()) return toast.error(t('food.addressRequired'));
    setPlacing(true);
    try {
      const res = await api.post('/food/orders', {
        restaurantId: r.id,
        items: items.map(({ item, qty }) => ({ menuItemId: item.id, quantity: qty })),
        deliveryAddress: address.trim(),
        deliveryNotes: notes.trim() || undefined,
        cashOnDelivery: true,
      });
      setPlaced(res.data);
      setCart({});
      setCheckout(false);
    } catch (err) {
      toast.error(err.response?.data?.error || t('food.orderFailed'));
    } finally { setPlacing(false); }
  };

  if (placed) return (
    <div style={{ padding:'48px 32px', fontFamily:'Inter, sans-serif', maxWidth:520, margin:'0 auto', textAlign:'center' }}>
      <div style={{ fontSize:44, marginBottom:16 }}>✅</div>
      <h2 style={{ fontFamily:'Fraunces, serif', fontSize:24, fontWeight:500, marginBottom:8 }}>{t('food.orderPlaced')}</h2>
      <p style={{ color:C.muted, fontSize:14, marginBottom:8 }}>{t('food.orderPlacedBody', { name: r.name })}</p>
      <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, padding:20, margin:'20px 0', textAlign:'left' }}>
        <Row label={t('food.orderNumber')} value={placed.trackingToken} />
        <Row label={t('food.total')} value={`${Math.round(placed.order.total)} XOF`} bold />
        <Row label={t('food.payment')} value={t('food.cashOnDelivery')} />
      </div>
      <button onClick={() => navigate('/dashboard/food')}
        style={{ background:C.forest, color:C.paper, border:'none', borderRadius:4, padding:'12px 24px', fontWeight:500, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
        {t('food.backToList')}
      </button>
    </div>
  );

  return (
    <div style={{ padding:'28px 32px', fontFamily:'Inter, sans-serif' }}>
      <Link to="/dashboard/food" style={{ color:C.muted, fontSize:13, textDecoration:'none' }}>← {t('food.backToList')}</Link>

      <div style={{ height:160, borderRadius:8, margin:'16px 0 20px', background:r.coverUrl ? `url(${r.coverUrl}) center/cover` : `linear-gradient(135deg, ${C.forest}, #2D6A4F)`, position:'relative' }}>
        {!r.isOnline && (
          <div style={{ position:'absolute', inset:0, background:'rgba(26,26,26,0.55)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', color:C.paper, fontSize:15, fontWeight:500 }}>
            {t('food.closedNow')}
          </div>
        )}
      </div>

      <div style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom:24, flexWrap:'wrap' }}>
        {r.logoUrl && <img src={r.logoUrl} alt="" style={{ width:52, height:52, borderRadius:8, objectFit:'cover' }} />}
        <div style={{ flex:1 }}>
          <h1 style={{ fontFamily:'Fraunces, serif', fontSize:26, fontWeight:500, margin:'0 0 4px', letterSpacing:'-0.02em' }}>{r.name}</h1>
          <div style={{ display:'flex', gap:14, fontSize:13, color:C.muted, flexWrap:'wrap' }}>
            <span>★ {parseFloat(r.rating || 0).toFixed(1)} ({r.ratingCount || 0})</span>
            <span>🕐 {r.averageDeliveryMins || 35} min</span>
            <span>🚴 {Math.round(deliveryFee)} XOF</span>
            {minOrder > 0 && <span>{t('food.min')} {Math.round(minOrder)} XOF</span>}
          </div>
          {r.description && <p style={{ color:C.muted, fontSize:14, margin:'8px 0 0' }}>{r.description}</p>}
        </div>
      </div>

      <div style={{ display:'flex', gap:24, alignItems:'flex-start', flexWrap:'wrap' }}>
        {/* Menu */}
        <div style={{ flex:'1 1 460px', minWidth:0 }}>
          {Object.keys(menu || {}).length === 0 ? (
            <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, padding:40, textAlign:'center', color:C.muted, fontSize:14 }}>
              {t('food.noMenu')}
            </div>
          ) : Object.entries(menu).map(([cat, catItems]) => (
            <div key={cat} style={{ marginBottom:28 }}>
              <h3 style={{ fontFamily:'Fraunces, serif', fontSize:18, fontWeight:500, margin:'0 0 12px' }}>{cat}</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {catItems.map(item => {
                  const qty = cart[item.id]?.qty || 0;
                  return (
                    <div key={item.id} style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, padding:'14px 16px', display:'flex', gap:14, alignItems:'center' }}>
                      {item.imageUrl && <img src={item.imageUrl} alt="" style={{ width:56, height:56, borderRadius:6, objectFit:'cover', flexShrink:0 }} />}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:500, fontSize:14, display:'flex', alignItems:'center', gap:8 }}>
                          {item.name}
                          {item.isPopular && <span style={{ fontSize:10, color:C.bronze, background:C.cream, border:`1px solid ${C.borderSoft}`, borderRadius:100, padding:'2px 7px', fontWeight:600 }}>{t('food.popular')}</span>}
                        </div>
                        {item.description && <div style={{ fontSize:12, color:C.muted, marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.description}</div>}
                        <div style={{ fontSize:13, fontWeight:600, marginTop:4 }}>{Math.round(item.price)} {item.currency || 'XOF'}</div>
                      </div>
                      {r.isOnline && (
                        qty === 0 ? (
                          <button onClick={() => add(item)}
                            style={{ background:C.forest, color:C.paper, border:'none', borderRadius:4, padding:'8px 16px', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>
                            {t('food.add')}
                          </button>
                        ) : (
                          <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                            <QtyBtn onClick={() => remove(item)}>−</QtyBtn>
                            <span style={{ fontWeight:600, fontSize:14, minWidth:18, textAlign:'center' }}>{qty}</span>
                            <QtyBtn onClick={() => add(item)}>+</QtyBtn>
                          </div>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Cart */}
        <div style={{ flex:'0 1 320px', position:'sticky', top:20, background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, padding:20, minWidth:280 }}>
          <h3 style={{ fontFamily:'Fraunces, serif', fontSize:17, fontWeight:500, margin:'0 0 14px' }}>{t('food.yourOrder')}</h3>
          {items.length === 0 ? (
            <p style={{ color:C.muted, fontSize:13, margin:0 }}>{t('food.cartEmpty')}</p>
          ) : (
            <>
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:14 }}>
                {items.map(({ item, qty }) => (
                  <div key={item.id} style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                    <span style={{ color:C.ink }}>{qty}× {item.name}</span>
                    <span style={{ fontWeight:500 }}>{Math.round(item.price * qty)}</span>
                  </div>
                ))}
              </div>
              <div style={{ borderTop:`1px solid ${C.borderSoft}`, paddingTop:12, fontSize:13, display:'flex', flexDirection:'column', gap:6 }}>
                <Row label={t('food.subtotal')} value={`${Math.round(subtotal)} XOF`} />
                <Row label={t('food.deliveryFee')} value={`${Math.round(deliveryFee)} XOF`} />
                <Row label={t('food.serviceFee')} value={`${serviceFee} XOF`} />
                <Row label={t('food.total')} value={`${Math.round(total)} XOF`} bold />
              </div>
              {subtotal < minOrder && (
                <div style={{ fontSize:12, color:'#9B2C2C', marginTop:10 }}>{t('food.minWarning', { amount: Math.round(minOrder) })}</div>
              )}

              {!checkout ? (
                <button onClick={() => setCheckout(true)} disabled={subtotal < minOrder}
                  style={{ width:'100%', marginTop:14, background:subtotal < minOrder ? C.subtle : C.forest, color:C.paper, border:'none', borderRadius:4, padding:'12px', fontWeight:500, fontSize:14, cursor:subtotal < minOrder ? 'not-allowed' : 'pointer', fontFamily:'inherit' }}>
                  {t('food.checkout')}
                </button>
              ) : (
                <div style={{ marginTop:14 }}>
                  <label style={{ display:'block', fontSize:12, color:C.muted, fontWeight:600, marginBottom:5 }}>{t('food.deliveryAddress')} *</label>
                  <textarea value={address} onChange={e => setAddress(e.target.value)} rows={2} placeholder={t('food.addressPlaceholder')}
                    style={{ width:'100%', background:C.cream, border:`1px solid ${C.border}`, borderRadius:4, padding:'9px 12px', fontSize:13, fontFamily:'inherit', resize:'vertical', boxSizing:'border-box' }} />
                  <label style={{ display:'block', fontSize:12, color:C.muted, fontWeight:600, margin:'10px 0 5px' }}>{t('food.notes')}</label>
                  <input value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('food.notesPlaceholder')}
                    style={{ width:'100%', background:C.cream, border:`1px solid ${C.border}`, borderRadius:4, padding:'9px 12px', fontSize:13, fontFamily:'inherit', boxSizing:'border-box' }} />
                  <div style={{ fontSize:12, color:C.muted, margin:'10px 0' }}>💵 {t('food.codNote')}</div>
                  <button onClick={placeOrder} disabled={placing}
                    style={{ width:'100%', background:C.forest, color:C.paper, border:'none', borderRadius:4, padding:'12px', fontWeight:500, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
                    {placing ? t('food.placing') : t('food.placeOrder', { amount: Math.round(total) })}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function QtyBtn({ onClick, children }) {
  return (
    <button onClick={onClick}
      style={{ width:28, height:28, borderRadius:4, border:`1px solid ${C.border}`, background:C.cream, color:C.ink, fontSize:15, cursor:'pointer', fontFamily:'inherit', lineHeight:1 }}>
      {children}
    </button>
  );
}

function Row({ label, value, bold }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', fontSize:bold ? 14 : 13, fontWeight:bold ? 600 : 400, padding:'2px 0' }}>
      <span style={{ color:bold ? C.ink : C.muted }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
