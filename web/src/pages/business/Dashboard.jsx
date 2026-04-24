import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

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

export default function BusinessDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [activeJobs, setActiveJobs] = useState([]);

  useEffect(() => {
    api.get('/businesses/dashboard').then(r => setStats(r.data.stats)).catch(() => {});
    api.get('/jobs?limit=5').then(r => {
      const all = (r.data.jobs || []).map(x => x.job || x);
      setJobs(all);
      setActiveJobs(all.filter(j => ['MATCHED','IN_TRANSIT','POSTED'].includes(j.status)));
    }).catch(() => {});
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={{ padding:'28px 32px', fontFamily:'Inter, sans-serif', color:C.ink }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', paddingBottom:20, borderBottom:`1px solid ${C.borderSoft}`, marginBottom:28 }}>
        <div>
          <div style={{ fontSize:11, color:C.bronze, letterSpacing:'0.14em', textTransform:'uppercase', fontWeight:500, marginBottom:6 }}>
            {new Date().toLocaleDateString('en', { weekday:'long', month:'long', day:'numeric' })}
          </div>
          <h1 style={{ fontFamily:'Fraunces, serif', fontSize:30, fontWeight:500, margin:0, letterSpacing:'-0.02em' }}>
            {greeting}, {user?.firstName}
          </h1>
          <p style={{ color:C.muted, fontSize:14, margin:'4px 0 0' }}>
            {activeJobs.length > 0 ? `${activeJobs.length} delivery${activeJobs.length !== 1 ? 'ies' : ''} in motion.` : 'No active deliveries right now.'}
          </p>
        </div>
        <Link to="/dashboard/post-job">
          <button style={{ background:C.forest, color:C.paper, border:'none', borderRadius:4, padding:'11px 22px', fontWeight:500, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
            Post delivery
          </button>
        </Link>
      </div>

      {/* Active deliveries alert bar */}
      {activeJobs.filter(j => j.status === 'MATCHED').map(j => (
        <div key={j.id} style={{ background:'#E8F0EA', border:`1px solid #B8D4BC`, borderRadius:6, padding:'12px 16px', marginBottom:12, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:C.forest, display:'inline-block' }} />
            <span style={{ fontSize:13, fontWeight:500, color:C.forest }}>Driver matched for {j.trackingToken} — show them your Pickup QR when they arrive</span>
          </div>
          <Link to={`/pickup-qr/${j.id}`}>
            <button style={{ background:C.forest, color:C.paper, border:'none', borderRadius:4, padding:'7px 14px', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>
              Show QR
            </button>
          </Link>
        </div>
      ))}

      {/* Stats */}
      {stats && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:0, marginBottom:28, background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, overflow:'hidden' }}>
          {[
            ['Active now', stats.activeJobs, ''],
            ['This month', stats.thisMonthJobs, 'deliveries'],
            ['Spent this month', `${stats.thisMonthSpent}`, stats.currency || 'XOF'],
            ['Total deliveries', stats.totalJobs, 'all time'],
          ].map(([l,v,s], i) => (
            <div key={l} style={{ padding:'20px 22px', borderRight: i<3 ? `1px solid ${C.borderSoft}` : 'none' }}>
              <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:600, marginBottom:10 }}>{l}</div>
              <div style={{ fontFamily:'Fraunces, serif', fontSize:28, fontWeight:500, color:C.ink, letterSpacing:'-0.02em', lineHeight:1 }}>{v}</div>
              <div style={{ fontSize:12, color:C.subtle, marginTop:6 }}>{s}</div>
            </div>
          ))}
        </div>
      )}

      {/* Recent deliveries */}
      <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, overflow:'hidden' }}>
        <div style={{ padding:'16px 22px', borderBottom:`1px solid ${C.borderSoft}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ fontFamily:'Fraunces, serif', fontSize:15, fontWeight:500, margin:0 }}>Recent deliveries</h3>
          <Link to="/dashboard/jobs" style={{ color:C.forest, fontSize:13, fontWeight:500, textDecoration:'none' }}>View all →</Link>
        </div>
        {jobs.length === 0 ? (
          <div style={{ padding:48, textAlign:'center', color:C.muted, fontSize:14 }}>
            No deliveries yet. <Link to="/dashboard/post-job" style={{ color:C.forest, fontWeight:500 }}>Post your first one →</Link>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:C.cream, borderBottom:`1px solid ${C.borderSoft}` }}>
                {['Ref','Route','Status','Price','Date'].map(h => (
                  <th key={h} style={{ padding:'10px 22px', textAlign:'left', fontSize:10, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jobs.map((j,i) => {
                const st = STATUS[j.status] || { label:j.status, bg:C.cream, fg:C.muted };
                return (
                  <tr key={j.id} style={{ borderBottom: i < jobs.length-1 ? `1px solid ${C.borderSoft}` : 'none', cursor:'pointer' }}
                    onClick={() => navigate(`/dashboard/jobs/${j.id}`)}>
                    <td style={{ padding:'13px 22px', fontFamily:'monospace', fontSize:11, color:C.subtle }}>{j.trackingToken}</td>
                    <td style={{ padding:'13px 22px', fontSize:13, color:C.ink, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{j.pickupCity || j.pickupAddress?.split(',')[0]} → {j.dropoffCity || j.dropoffAddress?.split(',')[0]}</td>
                    <td style={{ padding:'13px 22px' }}><span style={{ background:st.bg, color:st.fg, padding:'3px 10px', borderRadius:3, fontSize:11, fontWeight:500 }}>{st.label}</span></td>
                    <td style={{ padding:'13px 22px', fontFamily:'Fraunces, serif', fontSize:14, fontWeight:500, color:C.forest }}>{j.priceOffered} {j.currency}</td>
                    <td style={{ padding:'13px 22px', fontSize:12, color:C.subtle }}>{new Date(j.createdAt).toLocaleDateString()}</td>
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
