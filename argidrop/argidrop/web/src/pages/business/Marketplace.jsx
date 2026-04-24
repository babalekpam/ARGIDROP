import React, { useState, useEffect } from 'react';
import api from '../../utils/api';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', borderSoft:'#EFE8D7' };
const CATEGORIES = ['All','Pharmacy','Restaurant','Grocery','Electronics','Fashion','Beauty','Bakery','Hardware'];

export default function Marketplace() {
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selected, setSelected] = useState(null); // selected merchant detail

  useEffect(() => {
    api.get('/listings/public/merchants?limit=50')
      .then(r => setMerchants(r.data.merchants || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = merchants.filter(m => {
    const name = m.business?.companyName?.toLowerCase() || '';
    const cats = m.profile?.categories || [];
    const matchSearch = !search || name.includes(search.toLowerCase());
    const matchCat = activeCategory === 'All' || cats.includes(activeCategory);
    return matchSearch && matchCat;
  });

  return (
    <div style={{ padding:'28px 32px', fontFamily:'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ paddingBottom:20, borderBottom:`1px solid ${C.borderSoft}`, marginBottom:24 }}>
        <div style={{ fontSize:11, color:C.bronze, letterSpacing:'0.16em', fontWeight:500, textTransform:'uppercase', marginBottom:6 }}>ArgiDrop Marketplace</div>
        <h1 style={{ fontFamily:'Fraunces, serif', fontSize:26, fontWeight:500, margin:'0 0 4px', letterSpacing:'-0.02em' }}>Browse merchants</h1>
        <p style={{ color:C.muted, fontSize:14, margin:0 }}>Order from local businesses. We deliver.</p>
      </div>

      {/* Search + filter */}
      <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search merchants…"
          style={{ flex:1, minWidth:200, background:C.paper, border:`1px solid ${C.border}`, borderRadius:4, padding:'9px 14px', fontSize:14, color:C.ink, fontFamily:'inherit' }} />
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              style={{ background:activeCategory === cat ? C.forest : C.paper, color:activeCategory === cat ? C.paper : C.muted, border:`1px solid ${activeCategory === cat ? C.forest : C.border}`, borderRadius:100, padding:'7px 14px', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding:48, textAlign:'center', color:C.muted }}>Loading merchants…</div>
      ) : filtered.length === 0 ? (
        <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, padding:48, textAlign:'center' }}>
          <div style={{ fontFamily:'Fraunces, serif', fontSize:18, marginBottom:8 }}>No merchants found</div>
          <div style={{ color:C.muted, fontSize:14 }}>Try a different search or category</div>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:14 }}>
          {filtered.map(m => (
            <MerchantCard key={m.profile?.id} merchant={m} onClick={() => setSelected(m)} />
          ))}
        </div>
      )}

      {/* Merchant detail modal */}
      {selected && <MerchantModal merchant={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function MerchantCard({ merchant, onClick }) {
  const profile = merchant.profile || {};
  const biz = merchant.business || {};
  return (
    <div onClick={onClick}
      style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:10, overflow:'hidden', cursor:'pointer', transition:'all 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(27,67,50,0.1)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none'; }}>
      {/* Cover */}
      <div style={{ height:120, background:`linear-gradient(135deg, ${C.forest}, #3A7A55)`, position:'relative', overflow:'hidden' }}>
        {profile.coverPhotoUrl ? (
          <img src={profile.coverPhotoUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
        ) : (
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontFamily:'Fraunces, serif', fontSize:32, color:'rgba(255,255,255,0.15)', fontWeight:700 }}>{biz.companyName?.[0]}</span>
          </div>
        )}
        {/* Logo */}
        <div style={{ position:'absolute', bottom:-20, left:16, width:40, height:40, borderRadius:8, background:C.paper, border:`2px solid ${C.paper}`, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 8px rgba(0,0,0,0.1)' }}>
          {profile.logoUrl
            ? <img src={profile.logoUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            : <span style={{ fontFamily:'Fraunces, serif', fontSize:16, fontWeight:700, color:C.forest }}>{biz.companyName?.[0]}</span>}
        </div>
        {profile.isFeatured && (
          <div style={{ position:'absolute', top:8, right:8, background:C.bronze, color:C.paper, fontSize:10, fontWeight:600, padding:'3px 8px', borderRadius:100 }}>⭐ Featured</div>
        )}
      </div>

      <div style={{ padding:'24px 14px 14px' }}>
        <div style={{ fontFamily:'Fraunces, serif', fontSize:15, fontWeight:500, color:C.ink, marginBottom:3 }}>{biz.companyName}</div>
        {profile.tagline && <div style={{ fontSize:12, color:C.muted, marginBottom:6, lineHeight:1.4 }}>{profile.tagline}</div>}
        <div style={{ display:'flex', gap:12, fontSize:12, color:C.muted }}>
          {biz.city && <span>📍 {biz.city}</span>}
          {profile.averageDeliveryTime && <span>⏱ {profile.averageDeliveryTime} min</span>}
          {biz.rating > 0 && <span>⭐ {parseFloat(biz.rating).toFixed(1)}</span>}
        </div>
        {(profile.categories || []).length > 0 && (
          <div style={{ display:'flex', gap:4, marginTop:8, flexWrap:'wrap' }}>
            {(profile.categories || []).slice(0,3).map(cat => (
              <span key={cat} style={{ fontSize:10, background:C.cream, border:`1px solid ${C.borderSoft}`, borderRadius:100, padding:'2px 8px', color:C.muted }}>
                {cat}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MerchantModal({ merchant, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const profile = merchant.profile || {};
  const biz = merchant.business || {};

  useEffect(() => {
    if (!profile.slug) { setLoading(false); return; }
    api.get(`/listings/public/merchants/${profile.slug}`)
      .then(r => setDetail(r.data.merchant))
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [profile.slug]);

  const listings = detail?.listings || [];

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:C.paper, borderRadius:12, maxWidth:640, width:'100%', maxHeight:'85vh', overflow:'hidden', display:'flex', flexDirection:'column', border:`1px solid ${C.border}` }}>
        {/* Cover */}
        <div style={{ height:140, background:`linear-gradient(135deg, ${C.forest}, #3A7A55)`, position:'relative', flexShrink:0 }}>
          {profile.coverPhotoUrl && <img src={profile.coverPhotoUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />}
          <button onClick={onClose} style={{ position:'absolute', top:12, right:12, background:'rgba(0,0,0,0.4)', border:'none', color:'#fff', width:28, height:28, borderRadius:'50%', cursor:'pointer', fontSize:16 }}>×</button>
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY:'auto', flex:1 }}>
          <div style={{ padding:'20px 24px', borderBottom:`1px solid ${C.borderSoft}` }}>
            <h2 style={{ fontFamily:'Fraunces, serif', fontSize:22, fontWeight:500, margin:'0 0 4px' }}>{biz.companyName}</h2>
            {profile.tagline && <p style={{ color:C.muted, fontSize:14, margin:'0 0 10px' }}>{profile.tagline}</p>}
            <div style={{ display:'flex', gap:16, fontSize:13, color:C.muted, flexWrap:'wrap' }}>
              {biz.city && <span>📍 {biz.city}</span>}
              {profile.averageDeliveryTime && <span>⏱ Avg {profile.averageDeliveryTime} min delivery</span>}
              {profile.minimumOrderAmount && <span>Min order: {parseFloat(profile.minimumOrderAmount).toLocaleString()} XOF</span>}
              {profile.deliveryRadius && <span>Delivers within {profile.deliveryRadius} km</span>}
            </div>
          </div>

          <div style={{ padding:'20px 24px' }}>
            {loading ? (
              <div style={{ textAlign:'center', color:C.muted, padding:24 }}>Loading products…</div>
            ) : listings.length === 0 ? (
              <div style={{ textAlign:'center', color:C.muted, padding:24 }}>No products listed yet</div>
            ) : (
              <>
                <h3 style={{ fontFamily:'Fraunces, serif', fontSize:16, fontWeight:500, margin:'0 0 14px' }}>Products & services</h3>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:10 }}>
                  {listings.map(listing => {
                    const primaryPhoto = listing.photos?.find(p => p.isPrimary) || listing.photos?.[0];
                    return (
                      <div key={listing.id} style={{ border:`1px solid ${C.border}`, borderRadius:8, overflow:'hidden', background:C.cream }}>
                        <div style={{ height:110, background:C.borderSoft, overflow:'hidden' }}>
                          {primaryPhoto
                            ? <img src={primaryPhoto.fileUrl} alt={listing.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                            : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:C.subtle, fontSize:11 }}>No photo</div>}
                        </div>
                        <div style={{ padding:'10px 10px 12px' }}>
                          <div style={{ fontSize:13, fontWeight:500, color:C.ink, marginBottom:3 }}>{listing.nameFr || listing.name}</div>
                          {listing.price && (
                            <div style={{ fontFamily:'Fraunces, serif', fontSize:15, fontWeight:600, color:C.forest }}>
                              {parseFloat(listing.price).toLocaleString()} {listing.currency}
                              {listing.unit && <span style={{ fontSize:11, fontWeight:400, color:C.muted }}> / {listing.unit}</span>}
                            </div>
                          )}
                          <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:6 }}>
                            <div style={{ width:6, height:6, borderRadius:'50%', background: listing.inStock ? C.forest : '#9B2C2C' }} />
                            <span style={{ fontSize:11, color:C.muted }}>{listing.inStock ? 'In stock' : 'Out of stock'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Order CTA */}
        <div style={{ padding:'16px 24px', borderTop:`1px solid ${C.border}`, background:C.cream, flexShrink:0 }}>
          <button style={{ width:'100%', background:C.forest, color:C.paper, border:'none', borderRadius:6, padding:'13px', fontWeight:500, fontSize:15, cursor:'pointer', fontFamily:'inherit' }}>
            Request delivery from {biz.companyName}
          </button>
        </div>
      </div>
    </div>
  );
}
