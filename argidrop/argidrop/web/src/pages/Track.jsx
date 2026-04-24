import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../utils/api';

const C = { blue:'#2563EB', orange:'#F97316', green:'#16A34A', bg:'#0B1120', surface:'#111827', raised:'#1C2333', border:'#253044', txt:'#F1F5F9', muted:'#94A3B8', dim:'#64748B' };
const STATUS_STEPS = ['POSTED','MATCHED','IN_TRANSIT','DELIVERED'];
const STATUS_LABELS = { POSTED:'Job Posted', MATCHED:'Driver Assigned', IN_TRANSIT:'Package In Transit', DELIVERED:'Delivered!' };

export default function Track() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(()=>{ api.get(`/track/${token}`).then(r=>setData(r.data.tracking)).catch(()=>setError(true)); },[token]);

  if(error) return (
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Inter'}}>
      <div style={{textAlign:'center'}}><div style={{fontSize:48,marginBottom:16}}>❓</div><h1 style={{fontFamily:'Plus Jakarta Sans',fontSize:20,fontWeight:800,marginBottom:8}}>Tracking not found</h1><p style={{color:C.dim,fontSize:14}}>This tracking token is invalid or expired.</p></div>
    </div>
  );

  if(!data) return (
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:32,height:32,border:`3px solid ${C.blue}`,borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
    </div>
  );

  const currentStep = STATUS_STEPS.indexOf(data.status);

  return (
    <div style={{minHeight:'100vh',background:C.bg,fontFamily:'Inter, sans-serif',color:C.txt}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=Inter:wght@400;500;600&display=swap'); *{box-sizing:border-box;} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:'0 24px'}}>
        <div style={{maxWidth:600,margin:'0 auto',height:56,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{fontFamily:'Plus Jakarta Sans',fontWeight:800,fontSize:18}}><span style={{color:C.blue}}>DEL</span>IVIO</div>
          <div style={{fontSize:12,color:C.dim,fontFamily:'monospace'}}>#{token}</div>
        </div>
      </div>

      <div style={{maxWidth:600,margin:'0 auto',padding:'32px 24px'}}>
        {/* Status header */}
        <div style={{background: data.status==='DELIVERED'?'rgba(22,163,74,0.08)':C.surface, border:`1px solid ${data.status==='DELIVERED'?'rgba(22,163,74,0.3)':C.border}`, borderRadius:14, padding:'24px', marginBottom:20, textAlign:'center'}}>
          <div style={{fontSize:40, marginBottom:12}}>
            {data.status==='DELIVERED'?'✅':data.status==='IN_TRANSIT'?'🚗':data.status==='MATCHED'?'🧑‍✈️':'⏳'}
          </div>
          <h1 style={{fontFamily:'Plus Jakarta Sans',fontSize:22,fontWeight:800,marginBottom:6,color:data.status==='DELIVERED'?C.green:C.txt}}>{STATUS_LABELS[data.status]||data.status}</h1>
          {data.status==='IN_TRANSIT'&&<p style={{fontSize:13,color:C.muted}}>Your package is on its way</p>}
        </div>

        {/* Progress */}
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:13,padding:20,marginBottom:16}}>
          <div style={{display:'flex',alignItems:'center',gap:0}}>
            {STATUS_STEPS.map((s,i)=>(
              <React.Fragment key={s}>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',flex:i<3?0:1}}>
                  <div style={{width:28,height:28,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,background:i<=currentStep?C.blue:C.raised,color:i<=currentStep?'#fff':C.dim,border:`2px solid ${i<=currentStep?C.blue:C.border}`,flexShrink:0}}>
                    {i<currentStep?'✓':i+1}
                  </div>
                  <div style={{fontSize:10,color:i<=currentStep?C.muted:C.dim,marginTop:6,textAlign:'center',fontWeight:500}}>{STATUS_LABELS[s]}</div>
                </div>
                {i<3&&<div style={{flex:1,height:2,background:i<currentStep?C.blue:C.border,margin:'0 6px',marginBottom:20,transition:'background 0.3s'}}/>}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Route */}
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:13,padding:20,marginBottom:16}}>
          <div style={{fontSize:11,fontWeight:700,color:C.dim,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:14}}>Route</div>
          <div style={{display:'flex',gap:14,marginBottom:14,paddingBottom:14,borderBottom:`1px dashed ${C.border}`}}>
            <div style={{width:28,height:28,borderRadius:8,background:`${C.blue}15`,border:`1px solid ${C.blue}40`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,flexShrink:0}}>📍</div>
            <div><div style={{fontSize:10,color:C.dim,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:3}}>Pickup</div><div style={{fontSize:13,fontWeight:500}}>{data.pickupAddress}</div></div>
          </div>
          <div style={{display:'flex',gap:14}}>
            <div style={{width:28,height:28,borderRadius:8,background:`${C.orange}15`,border:`1px solid ${C.orange}40`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,flexShrink:0}}>🎯</div>
            <div><div style={{fontSize:10,color:C.dim,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:3}}>Dropoff</div><div style={{fontSize:13,fontWeight:500}}>{data.dropoffAddress}</div></div>
          </div>
        </div>

        {/* Driver */}
        {data.driver&&(
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:13,padding:20,marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:C.dim,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:12}}>Your Driver</div>
            <div style={{display:'flex',gap:14,alignItems:'center'}}>
              <div style={{width:44,height:44,borderRadius:12,background:'rgba(37,99,235,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>🚗</div>
              <div>
                <div style={{fontSize:14,fontWeight:700,marginBottom:2}}>{data.driver.firstName}</div>
                <div style={{fontSize:12,color:C.dim}}>⭐ {data.driver.rating||'5.0'} · {data.driver.vehicleColor||''} {data.driver.vehicleMake||''} {data.driver.vehicleModel||''}</div>
                <div style={{fontSize:12,color:C.muted,marginTop:2}}>{data.driver.vehiclePlate}</div>
              </div>
            </div>
            {data.driver.currentLat&&(
              <div style={{marginTop:12,background:'rgba(22,163,74,0.08)',border:'1px solid rgba(22,163,74,0.2)',borderRadius:8,padding:'9px 13px',fontSize:12,color:C.green}}>
                🟢 Driver location last updated: {data.driver.lastLocationAt?new Date(data.driver.lastLocationAt).toLocaleTimeString():'—'}
              </div>
            )}
          </div>
        )}

        {/* Timestamps */}
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:13,padding:20}}>
          <div style={{fontSize:11,fontWeight:700,color:C.dim,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:12}}>Timeline</div>
          {[['Job posted',data.matchedAt?data.matchedAt:null,true],['Driver assigned',data.matchedAt,!!data.matchedAt],['Picked up',data.pickedUpAt,!!data.pickedUpAt],['Delivered',data.deliveredAt,!!data.deliveredAt]].map(([label,ts,done],i)=>(
            <div key={i} style={{display:'flex',gap:12,alignItems:'flex-start',marginBottom:12}}>
              <div style={{width:20,height:20,borderRadius:'50%',background:done?`${C.green}20`:`${C.dim}15`,border:`1px solid ${done?C.green:C.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,flexShrink:0,marginTop:1}}>{done?'✓':''}</div>
              <div>
                <div style={{fontSize:13,fontWeight:done?600:400,color:done?C.txt:C.dim}}>{label}</div>
                {ts&&<div style={{fontSize:11,color:C.dim,marginTop:1}}>{new Date(ts).toLocaleString()}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
