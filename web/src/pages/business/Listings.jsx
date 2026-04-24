import React, { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', borderSoft:'#EFE8D7' };
const CATEGORIES = ['Pharmacy','Restaurant','Grocery','Electronics','Fashion','Beauty','Bakery','Hardware','Other'];
const TIER_COLORS = { FREE:'#9A9489', STANDARD:'#8B6F47', PREMIUM:'#1B4332', PRO:'#C9A84C' };

export default function Listings() {
  const [listings, setListings] = useState([]);
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editListing, setEditListing] = useState(null);
  const [uploading, setUploading] = useState(null);
  const fileRef = useRef();

  const load = async () => {
    try {
      const [lr, sr] = await Promise.all([api.get('/listings/listings'), api.get('/listings/subscription')]);
      setListings(lr.data.listings || []);
      setSub(sr.data.subscription);
    } catch { toast.error('Failed to load listings'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const saveListing = async (data) => {
    try {
      if (editListing?.id) {
        await api.patch(`/listings/listings/${editListing.id}`, data);
        toast.success('Listing updated');
      } else {
        await api.post('/listings/listings', data);
        toast.success('Listing created');
      }
      setShowForm(false); setEditListing(null); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
  };

  const deleteListing = async (id) => {
    if (!confirm('Archive this listing?')) return;
    await api.delete(`/listings/listings/${id}`);
    toast.success('Listing archived'); load();
  };

  const uploadPhotos = async (listingId, files) => {
    if (!sub?.canUploadMore) {
      toast.error(`Photo limit reached (${sub?.photoLimit} on ${sub?.tier} plan). Contact us to upgrade.`);
      return;
    }
    setUploading(listingId);
    try {
      const form = new FormData();
      Array.from(files).forEach(f => form.append('photos', f));
      await api.post(`/listings/listings/${listingId}/photos`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(`${files.length} photo(s) uploaded`); load();
    } catch (err) {
      const msg = err.response?.data;
      if (msg?.code === 'PHOTO_LIMIT_EXCEEDED') toast.error(`Photo limit reached! Upgrade to add more.`);
      else toast.error('Upload failed');
    }
    finally { setUploading(null); }
  };

  const deletePhoto = async (photoId) => {
    await api.delete(`/listings/photos/${photoId}`);
    toast.success('Photo deleted'); load();
  };

  const setPrimary = async (photoId) => {
    await api.patch(`/listings/photos/${photoId}/primary`);
    load();
  };

  if (loading) return <Loader />;

  return (
    <div style={{ padding:'28px 32px', fontFamily:'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', paddingBottom:20, borderBottom:`1px solid ${C.borderSoft}`, marginBottom:24 }}>
        <div>
          <div style={{ fontSize:11, color:C.bronze, letterSpacing:'0.16em', fontWeight:500, textTransform:'uppercase', marginBottom:6 }}>Merchant store</div>
          <h1 style={{ fontFamily:'Fraunces, serif', fontSize:26, fontWeight:500, margin:0, letterSpacing:'-0.02em' }}>My listings</h1>
          <p style={{ color:C.muted, fontSize:14, margin:'4px 0 0' }}>Products and services visible to customers on ArgiDrop Marketplace</p>
        </div>
        <button onClick={() => { setEditListing(null); setShowForm(true); }}
          style={{ background:C.forest, color:C.paper, border:'none', borderRadius:4, padding:'10px 20px', fontWeight:500, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
          + Add listing
        </button>
      </div>

      {/* Subscription tier badge */}
      {sub && (
        <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, padding:'14px 20px', marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ padding:'4px 12px', borderRadius:100, background:TIER_COLORS[sub.tier] || C.forest, color:C.paper, fontSize:12, fontWeight:600, letterSpacing:'0.06em' }}>
              {sub.tier}
            </div>
            <span style={{ fontSize:14, color:C.ink }}>
              <strong>{sub.photosUsed}</strong> / {sub.photoLimit === null ? 'Unlimited' : sub.photoLimit} photos used
            </span>
            {sub.photoLimit !== null && (
              <div style={{ width:140, height:6, background:C.cream, borderRadius:3, border:`1px solid ${C.border}` }}>
                <div style={{ height:'100%', borderRadius:3, background: sub.photosUsed / sub.photoLimit > 0.8 ? '#9B2C2C' : C.forest, width:`${Math.min(100, (sub.photosUsed / sub.photoLimit) * 100)}%`, transition:'width 0.3s' }} />
              </div>
            )}
          </div>
          <div style={{ fontSize:13, color:C.muted }}>
            {sub.tier === 'FREE' && <>Free · 5 photos · <span style={{ color:C.bronze, fontWeight:500, cursor:'pointer' }}>Upgrade for more ↗</span></>}
            {sub.tier === 'STANDARD' && '10,000 XOF/month · 20 photos'}
            {sub.tier === 'PREMIUM' && '25,000 XOF/month · 50 photos'}
            {sub.tier === 'PRO' && '50,000 XOF/month · Unlimited photos'}
          </div>
        </div>
      )}

      {/* Photo tiers info */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:24 }}>
        {[
          { tier:'FREE', fee:'Free', photos:5, desc:'Get started' },
          { tier:'STANDARD', fee:'10,000 XOF/mo', photos:20, desc:'Full catalog' },
          { tier:'PREMIUM', fee:'25,000 XOF/mo', photos:50, desc:'Featured + priority' },
          { tier:'PRO', fee:'50,000 XOF/mo', photos:'∞', desc:'Unlimited + top placement' },
        ].map(t => (
          <div key={t.tier} style={{ background:sub?.tier === t.tier ? '#F0F5F1' : C.paper, border:`1px solid ${sub?.tier === t.tier ? C.forest : C.border}`, borderRadius:8, padding:'14px 16px' }}>
            <div style={{ fontSize:11, fontWeight:700, color:TIER_COLORS[t.tier], letterSpacing:'0.08em', marginBottom:6 }}>{t.tier}</div>
            <div style={{ fontFamily:'Fraunces, serif', fontSize:20, fontWeight:500, color:C.ink }}>{t.photos} <span style={{ fontSize:12 }}>photos</span></div>
            <div style={{ fontSize:12, color:C.muted, marginTop:3 }}>{t.fee}</div>
            <div style={{ fontSize:11, color:C.subtle, marginTop:3 }}>{t.desc}</div>
            {sub?.tier === t.tier && <div style={{ fontSize:11, color:C.forest, fontWeight:600, marginTop:6 }}>✓ Current plan</div>}
          </div>
        ))}
      </div>

      {/* Listings grid */}
      {listings.length === 0 ? (
        <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, padding:48, textAlign:'center' }}>
          <div style={{ fontFamily:'Fraunces, serif', fontSize:20, fontWeight:400, marginBottom:8 }}>No listings yet</div>
          <div style={{ color:C.muted, fontSize:14, marginBottom:20 }}>Add your products and services to appear on the ArgiDrop Marketplace</div>
          <button onClick={() => setShowForm(true)}
            style={{ background:C.forest, color:C.paper, border:'none', borderRadius:4, padding:'10px 24px', cursor:'pointer', fontFamily:'inherit', fontWeight:500 }}>
            Add your first listing
          </button>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:14 }}>
          {listings.map(listing => (
            <div key={listing.id} style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:10, overflow:'hidden' }}>
              {/* Primary photo or placeholder */}
              <div style={{ position:'relative', aspectRatio:'4/3', background:C.cream, overflow:'hidden' }}>
                {listing.photos?.[0] ? (
                  <img src={listing.photos[0].fileUrl} alt={listing.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                ) : (
                  <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:C.subtle, fontSize:13 }}>No photo yet</div>
                )}
                <div style={{ position:'absolute', top:8, right:8, background: listing.status === 'ACTIVE' ? C.forest : C.muted, color:C.paper, fontSize:10, fontWeight:600, padding:'3px 8px', borderRadius:100 }}>
                  {listing.status}
                </div>
                {listing.photos?.length > 0 && (
                  <div style={{ position:'absolute', bottom:8, left:8, background:'rgba(0,0,0,0.5)', color:'#fff', fontSize:11, padding:'3px 8px', borderRadius:100 }}>
                    {listing.photos.length} photo{listing.photos.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>

              {/* Photos row */}
              <div style={{ display:'flex', gap:4, padding:'8px 12px', borderBottom:`1px solid ${C.borderSoft}`, flexWrap:'wrap' }}>
                {listing.photos?.slice(0,4).map(p => (
                  <div key={p.id} style={{ position:'relative', group:true }}>
                    <img src={p.fileUrl} alt="" onClick={() => setPrimary(p.id)}
                      style={{ width:36, height:36, objectFit:'cover', borderRadius:4, border:`1.5px solid ${p.isPrimary ? C.forest : C.border}`, cursor:'pointer' }} />
                    <button onClick={() => deletePhoto(p.id)}
                      style={{ position:'absolute', top:-4, right:-4, width:14, height:14, borderRadius:'50%', background:'#9B2C2C', color:'#fff', border:'none', cursor:'pointer', fontSize:9, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      ×
                    </button>
                  </div>
                ))}
                {/* Upload button */}
                <label style={{ width:36, height:36, border:`1.5px dashed ${sub?.canUploadMore ? C.border : '#F1B9A7'}`, borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center', cursor: sub?.canUploadMore ? 'pointer' : 'not-allowed', color:C.muted, fontSize:18 }}>
                  {uploading === listing.id ? '…' : '+'}
                  <input type="file" multiple accept="image/*" style={{ display:'none' }}
                    onChange={e => uploadPhotos(listing.id, e.target.files)} disabled={!sub?.canUploadMore} />
                </label>
              </div>

              <div style={{ padding:'12px 14px' }}>
                <div style={{ fontFamily:'Fraunces, serif', fontSize:15, fontWeight:500, color:C.ink, marginBottom:3 }}>{listing.name}</div>
                {listing.nameFr && <div style={{ fontSize:11, color:C.muted, marginBottom:4 }}>FR: {listing.nameFr}</div>}
                {listing.price && <div style={{ fontSize:14, fontWeight:600, color:C.forest, marginBottom:4 }}>{parseFloat(listing.price).toLocaleString()} {listing.currency}</div>}
                {listing.category && <div style={{ fontSize:11, color:C.subtle }}>{listing.category}</div>}
                <div style={{ display:'flex', gap:8, marginTop:10 }}>
                  <button onClick={() => { setEditListing(listing); setShowForm(true); }}
                    style={{ flex:1, background:'transparent', border:`1px solid ${C.border}`, color:C.muted, borderRadius:4, padding:'7px', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                    Edit
                  </button>
                  <button onClick={() => deleteListing(listing.id)}
                    style={{ background:'transparent', border:`1px solid ${C.border}`, color:'#9B2C2C', borderRadius:4, padding:'7px 10px', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                    Archive
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit modal */}
      {showForm && (
        <ListingModal
          listing={editListing}
          onSave={saveListing}
          onClose={() => { setShowForm(false); setEditListing(null); }}
        />
      )}
    </div>
  );
}

function ListingModal({ listing, onSave, onClose }) {
  const [form, setForm] = useState({
    name: listing?.name || '', nameFr: listing?.nameFr || '', nameEn: listing?.nameEn || '',
    description: listing?.description || '', descriptionFr: listing?.descriptionFr || '',
    price: listing?.price || '', currency: listing?.currency || 'XOF',
    unit: listing?.unit || '', category: listing?.category || '',
    listingType: listing?.listingType || 'PRODUCT', inStock: listing?.inStock !== false,
  });
  const set = k => e => setForm(p => ({ ...p, [k]: e.target?.value ?? e }));

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
      <div style={{ background:C.paper, borderRadius:10, padding:28, maxWidth:520, width:'90%', border:`1px solid ${C.border}`, maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h3 style={{ fontFamily:'Fraunces, serif', fontSize:18, fontWeight:500, margin:0 }}>{listing ? 'Edit listing' : 'New listing'}</h3>
          <button onClick={onClose} style={{ background:'transparent', border:'none', fontSize:20, cursor:'pointer', color:C.muted }}>×</button>
        </div>
        <div style={{ display:'grid', gap:12 }}>
          <div>
            <label style={lbl}>Name (default language) *</label>
            <input value={form.name} onChange={set('name')} placeholder="Paracétamol 500mg" style={inp} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div><label style={lbl}>Name in French</label><input value={form.nameFr} onChange={set('nameFr')} placeholder="Paracétamol 500mg" style={inp} /></div>
            <div><label style={lbl}>Name in English</label><input value={form.nameEn} onChange={set('nameEn')} placeholder="Paracetamol 500mg" style={inp} /></div>
          </div>
          <div>
            <label style={lbl}>Description</label>
            <textarea value={form.description} onChange={set('description')} placeholder="Brief description of the product or service" rows={2} style={{ ...inp, resize:'vertical' }} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
            <div><label style={lbl}>Price</label><input type="number" value={form.price} onChange={set('price')} placeholder="1500" style={inp} /></div>
            <div>
              <label style={lbl}>Currency</label>
              <select value={form.currency} onChange={set('currency')} style={inp}>
                {['XOF','GHS','NGN','EUR','USD'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Unit</label><input value={form.unit} onChange={set('unit')} placeholder="per box" style={inp} /></div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>
              <label style={lbl}>Category</label>
              <select value={form.category} onChange={set('category')} style={inp}>
                <option value="">Select…</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Type</label>
              <select value={form.listingType} onChange={set('listingType')} style={inp}>
                {['PRODUCT','SERVICE','MENU_ITEM','PROMOTION'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, cursor:'pointer' }}>
            <input type="checkbox" checked={form.inStock} onChange={e => setForm(p => ({ ...p, inStock:e.target.checked }))} style={{ accentColor:C.forest }} />
            In stock / available now
          </label>
        </div>
        <div style={{ display:'flex', gap:10, marginTop:20 }}>
          <button onClick={onClose} style={{ flex:1, background:'transparent', border:`1px solid ${C.border}`, color:C.muted, borderRadius:4, padding:'10px', cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
          <button onClick={() => onSave(form)} style={{ flex:2, background:C.forest, color:C.paper, border:'none', borderRadius:4, padding:'10px', cursor:'pointer', fontFamily:'inherit', fontWeight:500 }}>
            {listing ? 'Save changes' : 'Create listing'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Loader() {
  return <div style={{ padding:48, textAlign:'center', color:'#6B6560' }}>Loading…</div>;
}

const lbl = { display:'block', fontSize:12, color:'#6B6560', fontWeight:600, marginBottom:5 };
const inp = { width:'100%', background:'#F7F3EB', border:'1px solid #E4DCC9', borderRadius:4, padding:'9px 12px', fontSize:13, color:'#1A1A1A', fontFamily:'inherit', boxSizing:'border-box' };
