import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', red:'#B85450' };

export default function DriverDashboard() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(null);

  useEffect(() => { loadJobs(); }, []);

  async function loadJobs() {
    setLoading(true);
    try {
      const res = await api.get('/jobs/available');
      setJobs(res.data.jobs || res.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load jobs');
    } finally { setLoading(false); }
  }

  async function accept(id) {
    setAccepting(id);
    try {
      await api.post(`/jobs/${id}/accept`);
      toast.success('Job accepted');
      loadJobs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not accept job');
    } finally { setAccepting(null); }
  }

  function doLogout() { logout(); nav('/login'); }

  return (
    <div style={{ minHeight:'100vh', background:C.cream, fontFamily:'Inter, sans-serif', color:C.ink }}>
      <header style={{ background:C.paper, borderBottom:`1px solid ${C.border}`, padding:'14px 28px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontFamily:'Fraunces, serif', fontSize:20, fontWeight:600, color:C.forest }}>ArgiDrop</div>
          <div style={{ fontSize:11, color:C.bronze, letterSpacing:'0.16em', textTransform:'uppercase', marginTop:2 }}>Driver portal</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:13, fontWeight:500 }}>{user?.firstName} {user?.lastName}</div>
            <div style={{ fontSize:11, color:C.muted }}>{user?.email}</div>
          </div>
          <button onClick={doLogout} style={{ background:'transparent', border:`1px solid ${C.border}`, borderRadius:4, padding:'7px 14px', color:C.muted, cursor:'pointer', fontSize:13, fontFamily:'inherit' }}>Sign out</button>
        </div>
      </header>

      <main style={{ maxWidth:980, margin:'0 auto', padding:'28px' }}>
        <section style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, padding:24, marginBottom:24 }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:16 }}>
            <div style={{ width:44, height:44, borderRadius:8, background:C.forest, color:C.paper, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:600, flexShrink:0 }}>
              {(user?.firstName?.[0] || 'D').toUpperCase()}
            </div>
            <div style={{ flex:1 }}>
              <h1 style={{ fontFamily:'Fraunces, serif', fontSize:22, fontWeight:600, margin:'0 0 4px' }}>Welcome back, {user?.firstName}</h1>
              <p style={{ margin:0, color:C.muted, fontSize:14, lineHeight:1.5 }}>
                For the full driver experience — live navigation, in-app messaging, document uploads and offline mode — install the ArgiDrop driver mobile app. This portal lets you browse and accept available jobs from the web.
              </p>
            </div>
          </div>
        </section>

        <section>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <h2 style={{ fontFamily:'Fraunces, serif', fontSize:18, fontWeight:600, margin:0 }}>Available jobs</h2>
            <button onClick={loadJobs} style={{ background:'transparent', border:`1px solid ${C.border}`, borderRadius:4, padding:'6px 12px', fontSize:12, color:C.muted, cursor:'pointer', fontFamily:'inherit' }}>Refresh</button>
          </div>

          {loading ? (
            <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, padding:40, textAlign:'center', color:C.muted }}>Loading…</div>
          ) : jobs.length === 0 ? (
            <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, padding:40, textAlign:'center' }}>
              <div style={{ fontSize:14, color:C.muted, marginBottom:6 }}>No jobs available right now</div>
              <div style={{ fontSize:12, color:C.subtle }}>Check back in a few minutes — new jobs are posted throughout the day.</div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {jobs.map(j => (
                <div key={j.id} style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, padding:18 }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:600, fontSize:15, marginBottom:4 }}>{j.title || j.description?.slice(0,60) || 'Delivery job'}</div>
                      <div style={{ fontSize:13, color:C.muted, marginBottom:8 }}>
                        {j.pickupAddress || j.pickup?.address || 'Pickup'} → {j.dropoffAddress || j.dropoff?.address || 'Drop-off'}
                      </div>
                      <div style={{ display:'flex', gap:14, fontSize:12, color:C.subtle, flexWrap:'wrap' }}>
                        {j.distance && <span>{Number(j.distance).toFixed(1)} km</span>}
                        {j.weight && <span>{j.weight} kg</span>}
                        {j.vehicleType && <span>{j.vehicleType}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontFamily:'Fraunces, serif', fontSize:18, fontWeight:600, color:C.forest, marginBottom:6 }}>
                        {j.price ? `${Number(j.price).toLocaleString()} CFA` : '—'}
                      </div>
                      <button onClick={() => accept(j.id)} disabled={accepting === j.id}
                        style={{ background:C.forest, color:C.paper, border:'none', borderRadius:4, padding:'8px 16px', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit', opacity: accepting === j.id ? 0.6 : 1 }}>
                        {accepting === j.id ? 'Accepting…' : 'Accept'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
