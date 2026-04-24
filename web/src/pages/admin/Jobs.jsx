import React, { useEffect, useState } from 'react';
import api from '../../utils/api';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', borderSoft:'#EFE8D7' };
const STATUS = { AWAITING_PAYMENT:{bg:'#FAF3E5',fg:'#B87333'}, POSTED:{bg:'#FAF3E5',fg:'#B87333'}, MATCHED:{bg:'#E8F0EA',fg:'#1B4332'}, IN_TRANSIT:{bg:'#E8F0EA',fg:'#1B4332'}, DELIVERED:{bg:'#F0EDE0',fg:'#6B6560'}, COMPLETED:{bg:'#F0EDE0',fg:'#6B6560'}, CANCELLED:{bg:'#FCEDE9',fg:'#9B2C2C'}, DISPUTED:{bg:'#FCEDE9',fg:'#9B2C2C'} };

export default function AdminJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.get(filter ? `/admin/jobs?status=${filter}` : '/admin/jobs').then(r => setJobs((r.data.jobs||[]).map(x=>x.job||x))).finally(() => setLoading(false));
  }, [filter]);

  return (
    <div style={{ padding:'28px 32px', fontFamily:'Inter, sans-serif' }}>
      <div style={{ paddingBottom:20, borderBottom:`1px solid ${C.borderSoft}`, marginBottom:24 }}>
        <div style={{ fontSize:11, color:C.bronze, letterSpacing:'0.16em', textTransform:'uppercase', fontWeight:500, marginBottom:6 }}>Operations</div>
        <h1 style={{ fontFamily:'Fraunces, serif', fontSize:30, fontWeight:500, margin:0, letterSpacing:'-0.02em' }}>All jobs</h1>
        <p style={{ color:C.muted, fontSize:14, margin:'4px 0 0' }}>Platform-wide delivery jobs</p>
      </div>

      <div style={{ display:'flex', gap:6, marginBottom:20, flexWrap:'wrap' }}>
        {['','POSTED','MATCHED','IN_TRANSIT','DELIVERED','COMPLETED','CANCELLED','DISPUTED'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{ background:filter===s?C.forest:'transparent', color:filter===s?C.paper:C.muted, border:`1px solid ${filter===s?C.forest:C.border}`, borderRadius:4, padding:'6px 14px', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:selected?'1fr 320px':'1fr', gap:20 }}>
        <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, overflow:'hidden' }}>
          {loading ? <div style={{ padding:48, textAlign:'center', color:C.muted }}>Loading…</div> : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr style={{ background:C.cream, borderBottom:`1px solid ${C.borderSoft}` }}>
                {['Ref','From','To','Status','Driver','Price','Date'].map(h => (
                  <th key={h} style={{ padding:'10px 18px', textAlign:'left', fontSize:10, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {jobs.map((j, i) => {
                  const st = STATUS[j.status] || { bg:C.cream, fg:C.muted };
                  return (
                    <tr key={j.id} onClick={() => setSelected(selected?.id===j.id?null:j)}
                      style={{ borderBottom:i<jobs.length-1?`1px solid ${C.borderSoft}`:'none', cursor:'pointer', background:selected?.id===j.id?C.cream:'transparent' }}>
                      <td style={{ padding:'12px 18px', fontFamily:'monospace', fontSize:11, color:C.subtle }}>{j.trackingToken}</td>
                      <td style={{ padding:'12px 18px', fontSize:13, color:C.ink, maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{j.pickupCity||j.pickupAddress?.split(',')[0]}</td>
                      <td style={{ padding:'12px 18px', fontSize:13, color:C.ink, maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{j.dropoffCity||j.dropoffAddress?.split(',')[0]}</td>
                      <td style={{ padding:'12px 18px' }}><span style={{ background:st.bg, color:st.fg, padding:'2px 8px', borderRadius:3, fontSize:11, fontWeight:500 }}>{j.status}</span></td>
                      <td style={{ padding:'12px 18px', fontSize:12, color:C.muted }}>{j.driverId ? 'Assigned' : '—'}</td>
                      <td style={{ padding:'12px 18px', fontFamily:'Fraunces, serif', fontSize:13, fontWeight:500, color:C.forest }}>{j.priceOffered} {j.currency}</td>
                      <td style={{ padding:'12px 18px', fontSize:12, color:C.subtle }}>{new Date(j.createdAt).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {selected && (
          <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, padding:22 }}>
            <h3 style={{ fontFamily:'Fraunces, serif', fontSize:15, fontWeight:500, margin:'0 0 16px' }}>Job detail</h3>
            {[['Ref', selected.trackingToken],['Status', selected.status],['Price', `${selected.priceOffered} ${selected.currency}`],['Package', selected.packageType],['Urgency', selected.urgency],['Pickup', selected.pickupAddress],['Dropoff', selected.dropoffAddress],['Created', new Date(selected.createdAt).toLocaleString()]].map(([k,v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:`1px solid ${C.borderSoft}`, fontSize:13 }}>
                <span style={{ color:C.muted, flexShrink:0 }}>{k}</span>
                <span style={{ color:C.ink, fontWeight:500, textAlign:'right', marginLeft:12, fontSize:k==='Ref'?11:13, fontFamily:k==='Ref'?'monospace':'inherit' }}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
