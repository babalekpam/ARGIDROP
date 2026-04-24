import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', borderSoft:'#EFE8D7' };
const VS = { APPROVED:{bg:'#E8F0EA',fg:'#1B4332',label:'Approved'}, PENDING:{bg:'#FAF3E5',fg:'#B87333',label:'Pending'}, REJECTED:{bg:'#FCEDE9',fg:'#9B2C2C',label:'Rejected'} };

export default function AdminDrivers() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get(filter ? `/admin/drivers?verificationStatus=${filter}` : '/admin/drivers').then(r => setDrivers((r.data.drivers||[]).map(x=>x.driver||x))).finally(() => setLoading(false));
  }, [filter]);

  const pending = drivers.filter(d => d.verificationStatus === 'PENDING').length;

  return (
    <div style={{ padding:'28px 32px', fontFamily:'Inter, sans-serif' }}>
      <div style={{ paddingBottom:20, borderBottom:`1px solid ${C.borderSoft}`, marginBottom:24, display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
        <div>
          <div style={{ fontSize:11, color:C.bronze, letterSpacing:'0.16em', textTransform:'uppercase', fontWeight:500, marginBottom:6 }}>Fleet</div>
          <h1 style={{ fontFamily:'Fraunces, serif', fontSize:30, fontWeight:500, margin:0, letterSpacing:'-0.02em' }}>Drivers</h1>
          <p style={{ color:C.muted, fontSize:14, margin:'4px 0 0' }}>{drivers.length} registered</p>
        </div>
        {pending > 0 && (
          <Link to="/admin/driver-approval">
            <button style={{ background:C.forest, color:C.paper, border:'none', borderRadius:4, padding:'10px 18px', fontWeight:500, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
              {pending} awaiting verification →
            </button>
          </Link>
        )}
      </div>

      <div style={{ display:'flex', gap:6, marginBottom:20 }}>
        {['','APPROVED','PENDING','REJECTED'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{ background:filter===s?C.forest:'transparent', color:filter===s?C.paper:C.muted, border:`1px solid ${filter===s?C.forest:C.border}`, borderRadius:4, padding:'6px 14px', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:selected?'1fr 300px':'1fr', gap:20 }}>
        <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, overflow:'hidden' }}>
          {loading ? <div style={{ padding:48, textAlign:'center', color:C.muted }}>Loading…</div> : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr style={{ background:C.cream, borderBottom:`1px solid ${C.borderSoft}` }}>
                {['Driver','Vehicle','Status','Rating','Deliveries','Earnings','Joined'].map(h => (
                  <th key={h} style={{ padding:'10px 18px', textAlign:'left', fontSize:10, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {drivers.map((d, i) => {
                  const vs = VS[d.verificationStatus] || { bg:C.cream, fg:C.muted, label:d.verificationStatus };
                  return (
                    <tr key={d.id} onClick={() => setSelected(selected?.id===d.id?null:d)}
                      style={{ borderBottom:i<drivers.length-1?`1px solid ${C.borderSoft}`:'none', cursor:'pointer', background:selected?.id===d.id?C.cream:'transparent' }}>
                      <td style={{ padding:'13px 18px' }}>
                        <div style={{ fontSize:13, fontWeight:500, color:C.ink }}>{d.firstName||'—'} {d.lastName||''}</div>
                        <div style={{ fontSize:11, color:C.muted }}>{d.phone||d.email||'—'}</div>
                      </td>
                      <td style={{ padding:'13px 18px', fontSize:12, color:C.ink }}>{d.vehicleColor} {d.vehicleMake} {d.vehicleModel}<div style={{ fontSize:11, fontFamily:'monospace', color:C.muted }}>{d.vehiclePlate}</div></td>
                      <td style={{ padding:'13px 18px' }}><span style={{ background:vs.bg, color:vs.fg, padding:'2px 8px', borderRadius:3, fontSize:11, fontWeight:500 }}>{vs.label}</span></td>
                      <td style={{ padding:'13px 18px', fontSize:13, color:C.ink }}>{d.rating || '—'} ★</td>
                      <td style={{ padding:'13px 18px', fontSize:13, color:C.ink }}>{d.totalDeliveries || 0}</td>
                      <td style={{ padding:'13px 18px', fontFamily:'Fraunces, serif', fontSize:13, fontWeight:500, color:C.forest }}>{d.totalEarnings || 0}</td>
                      <td style={{ padding:'13px 18px', fontSize:12, color:C.subtle }}>{new Date(d.createdAt).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {selected && (
          <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, padding:20 }}>
            <h3 style={{ fontFamily:'Fraunces, serif', fontSize:15, fontWeight:500, margin:'0 0 16px' }}>{selected.firstName} {selected.lastName}</h3>
            {[['Vehicle', `${selected.vehicleType} · ${selected.vehicleMake||''} ${selected.vehicleModel||''}`],['Plate', selected.vehiclePlate||'—'],['Payout', `${selected.payoutProvider||'—'} · ${selected.payoutAccount||'—'}`],['Trust score', selected.trustScore||'—'],['Completion rate', `${selected.completionRate||100}%`],['Online', selected.isOnline?'Yes':'No']].map(([k,v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:`1px solid ${C.borderSoft}`, fontSize:13 }}>
                <span style={{ color:C.muted }}>{k}</span>
                <span style={{ color:C.ink, fontWeight:500, textAlign:'right', marginLeft:12 }}>{v}</span>
              </div>
            ))}
            {selected.verificationStatus === 'PENDING' && (
              <Link to="/admin/driver-approval">
                <button style={{ width:'100%', background:C.forest, color:C.paper, border:'none', borderRadius:4, padding:10, fontWeight:500, fontSize:13, cursor:'pointer', fontFamily:'inherit', marginTop:16 }}>
                  Review documents →
                </button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
