import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', borderSoft:'#EFE8D7' };
const STATUSES = ['','AWAITING_PAYMENT','POSTED','MATCHED','IN_TRANSIT','DELIVERED','COMPLETED','CANCELLED','DISPUTED'];
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

export default function BusinessJobs() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const url = filter ? `/jobs?status=${filter}&limit=50` : '/jobs?limit=50';
    api.get(url).then(r => setJobs((r.data.jobs || []).map(x => x.job || x))).finally(() => setLoading(false));
  }, [filter]);

  return (
    <div style={{ padding:'28px 32px', fontFamily:'Inter, sans-serif' }}>
      <div style={{ paddingBottom:20, borderBottom:`1px solid ${C.borderSoft}`, marginBottom:24, display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
        <div>
          <div style={{ fontSize:11, color:C.bronze, letterSpacing:'0.16em', textTransform:'uppercase', fontWeight:500, marginBottom:6 }}>Deliveries</div>
          <h1 style={{ fontFamily:'Fraunces, serif', fontSize:30, fontWeight:500, margin:0, letterSpacing:'-0.02em' }}>My deliveries</h1>
        </div>
        <Link to="/dashboard/post-job">
          <button style={{ background:C.forest, color:C.paper, border:'none', borderRadius:4, padding:'10px 20px', fontWeight:500, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>Post delivery</button>
        </Link>
      </div>

      <div style={{ display:'flex', gap:6, marginBottom:20, flexWrap:'wrap' }}>
        {STATUSES.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{ background:filter===s?C.forest:'transparent', color:filter===s?C.paper:C.muted, border:`1px solid ${filter===s?C.forest:C.border}`, borderRadius:4, padding:'6px 14px', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>
            {s ? (STATUS[s]?.label || s) : 'All'}
          </button>
        ))}
      </div>

      <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:48, textAlign:'center', color:C.muted, fontSize:14 }}>Loading…</div>
        ) : jobs.length === 0 ? (
          <div style={{ padding:48, textAlign:'center', color:C.muted, fontSize:14 }}>
            {filter ? `No ${STATUS[filter]?.label.toLowerCase() || filter.toLowerCase()} deliveries` : 'No deliveries yet.'}{' '}
            {!filter && <Link to="/dashboard/post-job" style={{ color:C.forest, fontWeight:500 }}>Post your first one →</Link>}
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:C.cream, borderBottom:`1px solid ${C.borderSoft}` }}>
                {['Ref','From','To','Package','Status','Price','Date','Actions'].map(h => (
                  <th key={h} style={{ padding:'10px 18px', textAlign:'left', fontSize:10, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jobs.map((j,i) => {
                const st = STATUS[j.status] || { label:j.status, bg:C.cream, fg:C.muted };
                return (
                  <tr key={j.id} style={{ borderBottom:i<jobs.length-1?`1px solid ${C.borderSoft}`:'none', cursor:'pointer' }}
                    onClick={() => navigate(`/dashboard/jobs/${j.id}`)}>
                    <td style={{ padding:'13px 18px', fontFamily:'monospace', fontSize:11, color:C.subtle }}>{j.trackingToken}</td>
                    <td style={{ padding:'13px 18px', fontSize:13, color:C.ink, maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{j.pickupCity || j.pickupAddress?.split(',')[0]}</td>
                    <td style={{ padding:'13px 18px', fontSize:13, color:C.ink, maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{j.dropoffCity || j.dropoffAddress?.split(',')[0]}</td>
                    <td style={{ padding:'13px 18px', fontSize:12, color:C.muted }}>{j.packageType}</td>
                    <td style={{ padding:'13px 18px' }}><span style={{ background:st.bg, color:st.fg, padding:'3px 10px', borderRadius:3, fontSize:11, fontWeight:500 }}>{st.label}</span></td>
                    <td style={{ padding:'13px 18px', fontFamily:'Fraunces, serif', fontSize:14, fontWeight:500, color:C.forest }}>{j.priceOffered} {j.currency}</td>
                    <td style={{ padding:'13px 18px', fontSize:12, color:C.subtle }}>{new Date(j.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding:'13px 18px' }} onClick={e => e.stopPropagation()}>
                      {j.status === 'MATCHED' && (
                        <Link to={`/pickup-qr/${j.id}`} style={{ color:C.forest, fontSize:12, fontWeight:500, textDecoration:'none' }}>Show QR</Link>
                      )}
                      {j.status === 'IN_TRANSIT' && (
                        <Link to={`/track/${j.trackingToken}`} style={{ color:C.forest, fontSize:12, fontWeight:500, textDecoration:'none' }}>Track</Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
