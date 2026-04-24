import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', borderSoft:'#EFE8D7' };
const STATUS = {
  AWAITING_PAYMENT:{ label:'Awaiting payment', bg:'#FAF3E5', fg:'#B87333' },
  POSTED:{ label:'Finding driver', bg:'#FAF3E5', fg:'#B87333' },
  MATCHED:{ label:'Driver matched', bg:'#E8F0EA', fg:'#1B4332' },
  IN_TRANSIT:{ label:'In transit', bg:'#E8F0EA', fg:'#1B4332' },
  DELIVERED:{ label:'Delivered', bg:'#F0EDE0', fg:'#6B6560' },
  COMPLETED:{ label:'Completed', bg:'#F0EDE0', fg:'#6B6560' },
  CANCELLED:{ label:'Cancelled', bg:'#FCEDE9', fg:'#9B2C2C' },
  DISPUTED:{ label:'Disputed', bg:'#FCEDE9', fg:'#9B2C2C' },
};

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [driver, setDriver] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    api.get(`/jobs/${id}`).then(r => {
      setJob(r.data.job || r.data);
      if (r.data.driver) setDriver(r.data.driver);
    }).catch(() => navigate('/dashboard/jobs'));
  }, [id]);

  const cancel = async () => {
    if (!confirm('Cancel this delivery? Any held funds will be returned to your wallet.')) return;
    setCancelling(true);
    try {
      await api.post(`/jobs/${id}/cancel`, { reason: 'Cancelled by business' });
      toast.success('Delivery cancelled, funds returned');
      setJob(j => ({ ...j, status: 'CANCELLED' }));
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setCancelling(false); }
  };

  if (!job) return <div style={{ padding:48, color:C.muted, fontFamily:'Inter, sans-serif' }}>Loading…</div>;

  const st = STATUS[job.status] || { label:job.status, bg:C.cream, fg:C.muted };
  const canCancel = ['AWAITING_PAYMENT','POSTED'].includes(job.status);
  const canTrack = ['MATCHED','IN_TRANSIT'].includes(job.status);
  const canShowPickupQR = job.status === 'MATCHED';

  const timeline = [
    { label:'Created', time:job.createdAt, done:true },
    { label:'Payment confirmed', time:job.paymentConfirmedAt, done:!!job.paymentConfirmedAt },
    { label:'Driver matched', time:job.matchedAt, done:!!job.matchedAt },
    { label:'Package picked up', time:job.pickedUpAt, done:!!job.pickedUpAt },
    { label:'Delivered', time:job.deliveredAt, done:!!job.deliveredAt },
  ];

  return (
    <div style={{ padding:'28px 32px', fontFamily:'Inter, sans-serif', maxWidth:900 }}>
      <div style={{ marginBottom:24 }}>
        <Link to="/dashboard/jobs" style={{ color:C.muted, fontSize:13, textDecoration:'none' }}>← All deliveries</Link>
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28, paddingBottom:20, borderBottom:`1px solid ${C.borderSoft}` }}>
        <div>
          <div style={{ fontSize:11, color:C.bronze, letterSpacing:'0.16em', textTransform:'uppercase', fontWeight:500, marginBottom:6 }}>Delivery</div>
          <h1 style={{ fontFamily:'Fraunces, serif', fontSize:28, fontWeight:500, margin:0, letterSpacing:'-0.02em' }}>
            <span style={{ fontFamily:'monospace', fontSize:18 }}>{job.trackingToken}</span>
          </h1>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <span style={{ background:st.bg, color:st.fg, padding:'5px 14px', borderRadius:4, fontSize:12, fontWeight:500 }}>{st.label}</span>
          {canShowPickupQR && (
            <Link to={`/pickup-qr/${id}`}>
              <button style={{ background:C.forest, color:C.paper, border:'none', borderRadius:4, padding:'8px 16px', fontWeight:500, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>Show Pickup QR</button>
            </Link>
          )}
          {canTrack && (
            <Link to={`/track/${job.trackingToken}`}>
              <button style={{ background:'transparent', color:C.forest, border:`1px solid ${C.forest}`, borderRadius:4, padding:'8px 16px', fontWeight:500, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>Track live</button>
            </Link>
          )}
          {canCancel && (
            <button onClick={cancel} disabled={cancelling}
              style={{ background:'transparent', color:'#9B2C2C', border:`1px solid #9B2C2C`, borderRadius:4, padding:'8px 16px', fontWeight:500, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
              {cancelling ? 'Cancelling…' : 'Cancel'}
            </button>
          )}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
        {/* Route */}
        <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, padding:20 }}>
          <h3 style={{ fontFamily:'Fraunces, serif', fontSize:14, fontWeight:600, margin:'0 0 14px', color:C.muted, textTransform:'uppercase', letterSpacing:'0.06em' }}>Route</h3>
          {[
            ['Pickup', job.pickupAddress, job.pickupContactName, job.pickupContactPhone, C.bronze],
            ['Dropoff', job.dropoffAddress, job.dropoffContactName, job.dropoffContactPhone, C.forest],
          ].map(([label, addr, name, phone, color]) => (
            <div key={label} style={{ display:'flex', gap:12, marginBottom:label==='Pickup'?14:0, paddingBottom:label==='Pickup'?14:0, borderBottom:label==='Pickup'?`1px solid ${C.borderSoft}`:'none' }}>
              <div style={{ width:4, background:color, borderRadius:2, flexShrink:0 }} />
              <div>
                <div style={{ fontSize:10, color:C.muted, textTransform:'uppercase', letterSpacing:'0.1em', fontWeight:600 }}>{label}</div>
                <div style={{ fontSize:13, color:C.ink, marginTop:3, lineHeight:1.4 }}>{addr}</div>
                {name && <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>{name}{phone ? ` · ${phone}` : ''}</div>}
              </div>
            </div>
          ))}
        </div>

        {/* Package + Price */}
        <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, padding:20 }}>
          <h3 style={{ fontFamily:'Fraunces, serif', fontSize:14, fontWeight:600, margin:'0 0 14px', color:C.muted, textTransform:'uppercase', letterSpacing:'0.06em' }}>Package & payment</h3>
          {[
            ['Type', job.packageType],
            ['Weight', job.weightKg ? `${job.weightKg} kg` : '—'],
            ['Fragile', job.isFragile ? 'Yes' : 'No'],
            ['Urgency', job.urgency],
          ].map(([k,v]) => <Row key={k} k={k} v={v} />)}
          <div style={{ marginTop:14, paddingTop:14, borderTop:`1px solid ${C.borderSoft}`, display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontFamily:'Fraunces, serif', fontSize:16, fontWeight:500 }}>Total paid</span>
            <span style={{ fontFamily:'Fraunces, serif', fontSize:20, fontWeight:500, color:C.forest }}>{job.priceOffered} {job.currency}</span>
          </div>
        </div>
      </div>

      {/* Driver info */}
      {driver && (
        <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, padding:20, marginBottom:20 }}>
          <h3 style={{ fontFamily:'Fraunces, serif', fontSize:14, fontWeight:600, margin:'0 0 14px', color:C.muted, textTransform:'uppercase', letterSpacing:'0.06em' }}>Driver</h3>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:44, height:44, borderRadius:4, background:C.forest, color:C.paper, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Fraunces, serif', fontSize:18, fontWeight:500 }}>
              {driver.firstName?.[0] || 'D'}
            </div>
            <div>
              <div style={{ fontSize:15, fontWeight:500, color:C.ink }}>{driver.firstName} {driver.lastName}</div>
              <div style={{ fontSize:12, color:C.muted }}>{driver.rating} ★ · {driver.vehicleType} · {driver.vehicleColor} {driver.vehicleMake} {driver.vehicleModel}</div>
            </div>
            {driver.vehiclePlate && (
              <div style={{ marginLeft:'auto', fontFamily:'monospace', fontSize:13, fontWeight:600, background:C.cream, border:`1px solid ${C.border}`, borderRadius:3, padding:'4px 10px' }}>{driver.vehiclePlate}</div>
            )}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, padding:20 }}>
        <h3 style={{ fontFamily:'Fraunces, serif', fontSize:14, fontWeight:600, margin:'0 0 16px', color:C.muted, textTransform:'uppercase', letterSpacing:'0.06em' }}>Timeline</h3>
        {timeline.map((t, i) => (
          <div key={t.label} style={{ display:'flex', gap:14, paddingBottom: i < timeline.length-1 ? 14 : 0 }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', width:16 }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:t.done ? C.forest : C.border, border:`1.5px solid ${t.done ? C.forest : C.border}`, flexShrink:0 }} />
              {i < timeline.length-1 && <div style={{ width:1, flex:1, background:t.done ? C.forest : C.border, marginTop:2, marginBottom:-2, opacity:0.4 }} />}
            </div>
            <div style={{ paddingBottom:14 }}>
              <div style={{ fontSize:13, fontWeight:t.done ? 500 : 400, color: t.done ? C.ink : C.muted }}>{t.label}</div>
              {t.time && <div style={{ fontSize:11, color:C.subtle, marginTop:2 }}>{new Date(t.time).toLocaleString()}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', fontSize:13, borderBottom:`1px solid ${C.borderSoft}` }}>
      <span style={{ color:C.muted }}>{k}</span>
      <span style={{ color:C.ink, fontWeight:500 }}>{v}</span>
    </div>
  );
}
