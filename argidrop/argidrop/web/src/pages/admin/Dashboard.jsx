import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', borderSoft:'#EFE8D7' };
const STATUS = { POSTED:{bg:'#FAF3E5',fg:'#B87333'}, MATCHED:{bg:'#FAF3E5',fg:'#B87333'}, IN_TRANSIT:{bg:'#E8F0EA',fg:'#1B4332'}, DELIVERED:{bg:'#F0EDE0',fg:'#6B6560'}, COMPLETED:{bg:'#F0EDE0',fg:'#6B6560'}, CANCELLED:{bg:'#FCEDE9',fg:'#9B2C2C'}, DISPUTED:{bg:'#FCEDE9',fg:'#9B2C2C'} };

export default function AdminDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => { api.get('/admin/dashboard').then(r => setData(r.data)).catch(() => {}); }, []);

  if (!data) return <div style={{ padding:48, color:C.muted }}>Loading…</div>;
  const { stats, pendingDisputes, pendingDriverDocs, recentJobs } = data;

  return (
    <div style={{ padding:'28px 32px', fontFamily:'Inter, sans-serif' }}>
      <div style={{ paddingBottom:20, borderBottom:`1px solid ${C.borderSoft}`, marginBottom:28 }}>
        <div style={{ fontSize:11, color:C.bronze, letterSpacing:'0.16em', textTransform:'uppercase', fontWeight:500, marginBottom:6 }}>
          {new Date().toLocaleDateString('en', { weekday:'long', month:'long', day:'numeric' })}
        </div>
        <h1 style={{ fontFamily:'Fraunces, serif', fontSize:30, fontWeight:500, margin:0, letterSpacing:'-0.02em' }}>Platform overview</h1>
        <p style={{ color:C.muted, fontSize:14, margin:'4px 0 0' }}>Live metrics, updated just now.</p>
      </div>

      {/* Alert bars */}
      {pendingDisputes?.length > 0 && (
        <Link to="/admin/disputes" style={{ textDecoration:'none' }}>
          <div style={{ background:'#FAF3E5', border:`1px solid #E8D9B9`, borderRadius:6, padding:'11px 16px', marginBottom:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:13, fontWeight:500, color:C.ink }}>{pendingDisputes.length} open disputes need attention</span>
            <span style={{ fontSize:12, color:C.bronze }}>Review →</span>
          </div>
        </Link>
      )}
      {pendingDriverDocs?.length > 0 && (
        <Link to="/admin/driver-approval" style={{ textDecoration:'none' }}>
          <div style={{ background:C.cream, border:`1px solid ${C.border}`, borderRadius:6, padding:'11px 16px', marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:13, fontWeight:500, color:C.ink }}>{pendingDriverDocs.length} driver documents awaiting review</span>
            <span style={{ fontSize:12, color:C.forest }}>Review →</span>
          </div>
        </Link>
      )}

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:0, marginBottom:28, background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, overflow:'hidden' }}>
        {[['Users', stats?.totalUsers, 'registered'], ['Drivers', stats?.totalDrivers, 'verified'], ['Businesses', stats?.totalBusinesses, 'active'], ['Jobs', stats?.totalJobs, 'all time']].map(([l,v,s], i) => (
          <div key={l} style={{ padding:'20px 22px', borderRight:i<3?`1px solid ${C.borderSoft}`:'none' }}>
            <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:600, marginBottom:10 }}>{l}</div>
            <div style={{ fontFamily:'Fraunces, serif', fontSize:28, fontWeight:500, letterSpacing:'-0.02em', lineHeight:1 }}>{(v || 0).toLocaleString()}</div>
            <div style={{ fontSize:12, color:C.subtle, marginTop:6 }}>{s}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:0, marginBottom:28, background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, overflow:'hidden' }}>
        {[['Gross GMV', `${(stats?.totalGmv || 0).toFixed(0)} XOF`, 'all completed deliveries'], ['Commission earned', `${(stats?.totalCommission || 0).toFixed(0)} XOF`, `${stats?.commissionRate || 18}% margin`]].map(([l,v,s], i) => (
          <div key={l} style={{ padding:'20px 22px', borderRight:i<1?`1px solid ${C.borderSoft}`:'none' }}>
            <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:600, marginBottom:10 }}>{l}</div>
            <div style={{ fontFamily:'Fraunces, serif', fontSize:28, fontWeight:500, color:C.forest, letterSpacing:'-0.02em', lineHeight:1 }}>{v}</div>
            <div style={{ fontSize:12, color:C.subtle, marginTop:6 }}>{s}</div>
          </div>
        ))}
      </div>

      {/* Recent jobs */}
      <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, overflow:'hidden' }}>
        <div style={{ padding:'16px 22px', borderBottom:`1px solid ${C.borderSoft}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ fontFamily:'Fraunces, serif', fontSize:15, fontWeight:500, margin:0 }}>Recent jobs</h3>
          <Link to="/admin/jobs" style={{ color:C.forest, fontSize:13, fontWeight:500, textDecoration:'none' }}>View all →</Link>
        </div>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr style={{ background:C.cream, borderBottom:`1px solid ${C.borderSoft}` }}>
            {['Ref','Route','Status','Price','Date'].map(h => <th key={h} style={{ padding:'9px 20px', textAlign:'left', fontSize:10, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {(recentJobs || []).map((j, i) => {
              const st = STATUS[j.status] || { bg:C.cream, fg:C.muted };
              return (
                <tr key={j.id} style={{ borderBottom:i<(recentJobs?.length||0)-1?`1px solid ${C.borderSoft}`:'none' }}>
                  <td style={{ padding:'12px 20px', fontFamily:'monospace', fontSize:11, color:C.subtle }}>{j.trackingToken}</td>
                  <td style={{ padding:'12px 20px', fontSize:13, color:C.ink, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{j.pickupAddress?.split(',')[0]} → {j.dropoffAddress?.split(',')[0]}</td>
                  <td style={{ padding:'12px 20px' }}><span style={{ background:st.bg, color:st.fg, padding:'2px 8px', borderRadius:3, fontSize:11, fontWeight:500 }}>{j.status}</span></td>
                  <td style={{ padding:'12px 20px', fontFamily:'Fraunces, serif', fontSize:13, fontWeight:500, color:C.forest }}>{j.priceOffered} {j.currency}</td>
                  <td style={{ padding:'12px 20px', fontSize:12, color:C.subtle }}>{new Date(j.createdAt).toLocaleDateString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
