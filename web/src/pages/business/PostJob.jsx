import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import AddressPicker from '../../components/AddressPicker';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', borderSoft:'#EFE8D7' };
const STEPS = ['Pickup', 'Dropoff', 'Package', 'Review & Pay'];
const PKG_TYPES = ['Document','Small parcel','Medium parcel','Large parcel','Fragile item','Food & beverage','Medication','Electronics','Other'];
const VEHICLES = ['Any','MOTORCYCLE','CAR','VAN','TRICYCLE','BICYCLE'];

const label = { display:'block', fontSize:12, color:C.muted, fontWeight:600, marginBottom:6, letterSpacing:'0.3px' };
const input = { width:'100%', background:C.cream, border:`1px solid ${C.border}`, borderRadius:4, padding:'10px 12px', fontSize:14, color:C.ink, fontFamily:'inherit', boxSizing:'border-box' };

function Field({ label:l, value, onChange, placeholder, type='text', multiline }) {
  return (
    <div style={{ marginBottom:14, flex:1 }}>
      <label style={label}>{l}</label>
      {multiline
        ? <textarea value={value} onChange={onChange} placeholder={placeholder} rows={2} style={{ ...input, resize:'vertical' }} />
        : <input type={type} value={value} onChange={onChange} placeholder={placeholder} style={input} />}
    </div>
  );
}
function Row({ children }) { return <div style={{ display:'flex', gap:12 }}>{children}</div>; }

export default function PostJob() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [form, setForm] = useState({
    pickupAddress:'', pickupCity:'', pickupLat:'', pickupLng:'',
    pickupContactName:'', pickupContactPhone:'', pickupNotes:'',
    dropoffAddress:'', dropoffCity:'', dropoffLat:'', dropoffLng:'',
    dropoffContactName:'', dropoffContactPhone:'', dropoffNotes:'',
    packageType:'', packageDescription:'', weightKg:'',
    isFragile:false, requiresRefrigeration:false,
    urgency:'STANDARD', vehicleTypeRequired:'', paymentMethod:'momo',
  });

  const set = k => e => setForm(p => ({ ...p, [k]: e?.target ? e.target.value : e }));

  useEffect(() => {
    if (!form.pickupLat || !form.dropoffLat) return;
    const t = setTimeout(fetchQuote, 700);
    return () => clearTimeout(t);
  }, [form.pickupLat, form.pickupLng, form.dropoffLat, form.dropoffLng, form.weightKg, form.isFragile, form.urgency]);

  async function fetchQuote() {
    if (!form.pickupLat || !form.dropoffLat) return;
    setQuoting(true);
    try {
      const res = await api.post('/pricing/quote', {
        pickupLat: parseFloat(form.pickupLat), pickupLng: parseFloat(form.pickupLng),
        dropoffLat: parseFloat(form.dropoffLat), dropoffLng: parseFloat(form.dropoffLng),
        weightKg: parseFloat(form.weightKg) || 0, isFragile: form.isFragile, urgency: form.urgency,
      });
      setQuote(res.data);
    } catch { setQuote(null); }
    finally { setQuoting(false); }
  }

  const canNext = () => {
    if (step === 0) return form.pickupAddress && form.pickupContactPhone;
    if (step === 1) return form.dropoffAddress && form.dropoffContactName && form.dropoffContactPhone;
    if (step === 2) return form.packageType;
    return true;
  };

  const submit = async () => {
    if (!quote) return toast.error('Price quote required — add GPS coordinates');
    setSubmitting(true);
    try {
      const res = await api.post('/jobs', { ...form, priceOffered: quote.total, currency: quote.currency });
      const d = res.data;
      if (d.payment?.paymentUrl) {
        navigate(`/pay/${d.job.id}`, { state: { paymentData: d.payment } });
      } else {
        toast.success('Delivery posted!');
        navigate(`/dashboard/jobs/${d.job.id}`);
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to post'); }
    finally { setSubmitting(false); }
  };

  return (
    <div style={{ padding:'28px 32px', fontFamily:'Inter, sans-serif', maxWidth:680 }}>
      <div style={{ paddingBottom:18, borderBottom:`1px solid ${C.borderSoft}`, marginBottom:24 }}>
        <div style={{ fontSize:11, color:C.bronze, letterSpacing:'0.16em', fontWeight:500, textTransform:'uppercase', marginBottom:6 }}>New delivery</div>
        <h1 style={{ fontFamily:'Fraunces, serif', fontSize:26, fontWeight:500, margin:0, letterSpacing:'-0.02em' }}>Post a delivery</h1>
      </div>

      {/* Progress bar */}
      <div style={{ display:'flex', alignItems:'center', gap:0, marginBottom:24 }}>
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
              <div style={{ width:26, height:26, borderRadius:'50%', background:i < step ? C.forest : i === step ? C.paper : C.paper, border:`1.5px solid ${i <= step ? C.forest : C.border}`, color: i < step ? C.paper : i === step ? C.forest : C.subtle, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600 }}>
                {i < step ? '✓' : i + 1}
              </div>
              <span style={{ fontSize:11, color:i === step ? C.ink : C.muted, fontWeight:i === step ? 600 : 400, whiteSpace:'nowrap' }}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div style={{ flex:1, height:1.5, background:i < step ? C.forest : C.border, margin:'0 6px', marginBottom:14 }} />}
          </React.Fragment>
        ))}
      </div>

      <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, padding:24, marginBottom:14 }}>

        {/* STEP 0 — Pickup */}
        {step === 0 && <>
          <h3 style={{ fontFamily:'Fraunces, serif', fontSize:16, fontWeight:500, margin:'0 0 18px' }}>Pickup location</h3>
          <AddressPicker
            label="Pickup address *"
            color={C.bronze}
            value={{ address: form.pickupAddress, city: form.pickupCity, lat: form.pickupLat, lng: form.pickupLng }}
            onChange={loc => setForm(p => ({ ...p, pickupAddress: loc.address, pickupCity: loc.city || p.pickupCity, pickupLat: loc.lat, pickupLng: loc.lng }))}
          />
          <Row>
            <Field label="Contact name" value={form.pickupContactName} onChange={set('pickupContactName')} placeholder="Your name or staff" />
            <Field label="Contact phone *" value={form.pickupContactPhone} onChange={set('pickupContactPhone')} placeholder="+228 90 00 00 00" />
          </Row>
          <Field label="Pickup instructions" value={form.pickupNotes} onChange={set('pickupNotes')} placeholder="Ground floor, ask for reception…" multiline />
        </>}

        {/* STEP 1 — Dropoff */}
        {step === 1 && <>
          <h3 style={{ fontFamily:'Fraunces, serif', fontSize:16, fontWeight:500, margin:'0 0 18px' }}>Dropoff location</h3>
          <AddressPicker
            label="Dropoff address *"
            color={C.forest}
            value={{ address: form.dropoffAddress, city: form.dropoffCity, lat: form.dropoffLat, lng: form.dropoffLng }}
            onChange={loc => setForm(p => ({ ...p, dropoffAddress: loc.address, dropoffCity: loc.city || p.dropoffCity, dropoffLat: loc.lat, dropoffLng: loc.lng }))}
          />
          <Row>
            <Field label="Recipient name *" value={form.dropoffContactName} onChange={set('dropoffContactName')} placeholder="Ama Kofi" />
            <Field label="Recipient phone *" value={form.dropoffContactPhone} onChange={set('dropoffContactPhone')} placeholder="+228 91 00 00 00" />
          </Row>
          <Field label="Delivery instructions" value={form.dropoffNotes} onChange={set('dropoffNotes')} placeholder="Call on arrival, leave at gate if absent…" multiline />
        </>}

        {/* STEP 2 — Package */}
        {step === 2 && <>
          <h3 style={{ fontFamily:'Fraunces, serif', fontSize:16, fontWeight:500, margin:'0 0 18px' }}>Package details</h3>
          <div style={{ marginBottom:14 }}>
            <label style={label}>Package type *</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:6 }}>
              {PKG_TYPES.map(t => (
                <button key={t} type="button" onClick={() => setForm(p => ({ ...p, packageType:t }))}
                  style={{ background:form.packageType === t ? C.forest : C.cream, color:form.packageType === t ? C.paper : C.muted, border:`1px solid ${form.packageType === t ? C.forest : C.border}`, borderRadius:4, padding:'7px 14px', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <Row>
            <Field label="Weight (kg)" value={form.weightKg} onChange={set('weightKg')} placeholder="0.5" type="number" />
            <div style={{ flex:1 }}>
              <label style={label}>Vehicle required</label>
              <select value={form.vehicleTypeRequired} onChange={set('vehicleTypeRequired')} style={{ ...input }}>
                {VEHICLES.map(v => <option key={v} value={v === 'Any' ? '' : v}>{v}</option>)}
              </select>
            </div>
          </Row>
          <Field label="Description" value={form.packageDescription} onChange={set('packageDescription')} placeholder="Briefly describe what is being delivered" multiline />
          <div style={{ display:'flex', gap:24, marginTop:4 }}>
            {[['isFragile','🥚 Fragile'], ['requiresRefrigeration','❄️ Refrigeration']].map(([k, lbl]) => (
              <label key={k} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:C.ink, cursor:'pointer' }}>
                <input type="checkbox" checked={form[k]} onChange={e => setForm(p => ({ ...p, [k]:e.target.checked }))} style={{ accentColor:C.forest }} />
                {lbl}
              </label>
            ))}
          </div>
          <div style={{ marginTop:18 }}>
            <label style={label}>Urgency</label>
            <div style={{ display:'flex', gap:8, marginTop:6 }}>
              {[['STANDARD','Standard','2–4 hours'],['EXPRESS','Express','1–2h · ×1.3'],['INSTANT','Instant','< 1h · ×1.8']].map(([v, lbl, hint]) => (
                <button key={v} type="button" onClick={() => setForm(p => ({ ...p, urgency:v }))}
                  style={{ flex:1, background:form.urgency === v ? C.forest : C.cream, color:form.urgency === v ? C.paper : C.muted, border:`1px solid ${form.urgency === v ? C.forest : C.border}`, borderRadius:6, padding:'10px 8px', cursor:'pointer', fontFamily:'inherit', textAlign:'center' }}>
                  <div style={{ fontSize:13, fontWeight:500 }}>{lbl}</div>
                  <div style={{ fontSize:11, opacity:0.75, marginTop:2 }}>{hint}</div>
                </button>
              ))}
            </div>
          </div>
        </>}

        {/* STEP 3 — Review */}
        {step === 3 && <>
          <h3 style={{ fontFamily:'Fraunces, serif', fontSize:16, fontWeight:500, margin:'0 0 18px' }}>Review & confirm</h3>

          {/* Route summary */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
            {[['Pickup', form.pickupAddress, form.pickupContactPhone, C.bronze], ['Dropoff', form.dropoffAddress, `${form.dropoffContactName} · ${form.dropoffContactPhone}`, C.forest]].map(([l, addr, contact, col]) => (
              <div key={l} style={{ display:'flex', gap:10 }}>
                <div style={{ width:4, borderRadius:2, background:col, flexShrink:0 }} />
                <div>
                  <div style={{ fontSize:10, color:C.muted, textTransform:'uppercase', letterSpacing:'0.1em', fontWeight:600 }}>{l}</div>
                  <div style={{ fontSize:13, color:C.ink, marginTop:2 }}>{addr}</div>
                  <div style={{ fontSize:11, color:C.muted }}>{contact}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Package summary */}
          <div style={{ background:C.cream, border:`1px solid ${C.borderSoft}`, borderRadius:6, padding:'10px 14px', marginBottom:16 }}>
            {[['Package', form.packageType], ['Weight', form.weightKg ? `${form.weightKg} kg` : '—'], ['Urgency', form.urgency], ['Fragile', form.isFragile ? 'Yes' : 'No']].map(([k, v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'4px 0', borderBottom:`1px solid ${C.borderSoft}` }}>
                <span style={{ color:C.muted }}>{k}</span><span style={{ color:C.ink, fontWeight:500 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Price quote */}
          {quoting ? (
            <div style={{ textAlign:'center', padding:20, color:C.muted, fontSize:14 }}>Calculating price…</div>
          ) : quote ? (
            <div style={{ border:`1px solid ${C.border}`, borderRadius:8, overflow:'hidden', marginBottom:16 }}>
              <div style={{ padding:'12px 16px', background:C.cream, fontSize:11, color:C.bronze, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em' }}>Price breakdown</div>
              {[
                ['Base fare', `${quote.breakdown.baseFare} ${quote.currency}`],
                [`Distance (${quote.breakdown.distanceKm} km)`, `+${quote.breakdown.distanceFee} ${quote.currency}`],
                ...(quote.breakdown.weightFee > 0 ? [['Weight surcharge', `+${quote.breakdown.weightFee} ${quote.currency}`]] : []),
                ...(quote.breakdown.fragileFee > 0 ? [['Fragile surcharge', `+${quote.breakdown.fragileFee} ${quote.currency}`]] : []),
                ...(quote.breakdown.finalMultiplier > 1 ? [[`${quote.urgency} multiplier ×${quote.breakdown.finalMultiplier}`, '']] : []),
                ...(quote.isPeakHour ? [['⚡ Peak hours active', '']] : []),
              ].map(([k, v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'8px 16px', borderTop:`1px solid ${C.borderSoft}`, fontSize:13 }}>
                  <span style={{ color:C.muted }}>{k}</span><span>{v}</span>
                </div>
              ))}
              <div style={{ display:'flex', justifyContent:'space-between', padding:'14px 16px', background:C.cream, borderTop:`1px solid ${C.border}` }}>
                <span style={{ fontFamily:'Fraunces, serif', fontSize:17, fontWeight:500 }}>Total</span>
                <span style={{ fontFamily:'Fraunces, serif', fontSize:22, fontWeight:600, color:C.forest }}>{quote.total.toLocaleString()} {quote.currency}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 16px', borderTop:`1px solid ${C.borderSoft}`, fontSize:12, color:C.muted }}>
                <span>Driver receives</span>
                <span style={{ color:C.forest, fontWeight:500 }}>{quote.driverPayout.toLocaleString()} {quote.currency} (82%)</span>
              </div>
            </div>
          ) : (
            <div style={{ background:'#FCEDE9', border:'1px solid #F1B9A7', borderRadius:6, padding:14, marginBottom:16, fontSize:13, color:'#9B2C2C' }}>
              Add GPS coordinates in the Pickup and Dropoff steps to get a price quote.
            </div>
          )}

          {/* Payment method */}
          <div>
            <label style={label}>Payment method</label>
            <div style={{ display:'flex', gap:8, marginTop:6 }}>
              {[['momo','📱 Mobile money'],['wallet','💼 ArgiDrop wallet']].map(([v, lbl]) => (
                <button key={v} type="button" onClick={() => setForm(p => ({ ...p, paymentMethod:v }))}
                  style={{ flex:1, background:form.paymentMethod === v ? C.forest : C.cream, color:form.paymentMethod === v ? C.paper : C.muted, border:`1px solid ${form.paymentMethod === v ? C.forest : C.border}`, borderRadius:6, padding:'12px', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        </>}
      </div>

      {/* Nav buttons */}
      <div style={{ display:'flex', gap:10 }}>
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)}
            style={{ background:C.paper, border:`1px solid ${C.border}`, color:C.ink, borderRadius:4, padding:'11px 22px', fontSize:14, cursor:'pointer', fontFamily:'inherit', fontWeight:500 }}>
            ← Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button onClick={() => canNext() && setStep(s => s + 1)} disabled={!canNext()}
            style={{ flex:1, background:canNext() ? C.forest : C.border, color:C.paper, border:'none', borderRadius:4, padding:'11px 22px', fontSize:14, cursor:canNext() ? 'pointer' : 'not-allowed', fontFamily:'inherit', fontWeight:500 }}>
            Continue →
          </button>
        ) : (
          <button onClick={submit} disabled={submitting || !quote}
            style={{ flex:1, background:quote ? C.forest : C.border, color:C.paper, border:'none', borderRadius:4, padding:'11px 22px', fontSize:14, cursor:quote ? 'pointer' : 'not-allowed', fontFamily:'inherit', fontWeight:500 }}>
            {submitting ? 'Posting…' : `Confirm · ${quote ? `${quote.total.toLocaleString()} ${quote.currency}` : 'price loading…'}`}
          </button>
        )}
      </div>
    </div>
  );
}
