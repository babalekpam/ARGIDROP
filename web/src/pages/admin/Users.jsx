import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', borderSoft:'#EFE8D7' };
const ROLE_COLORS = { ADMIN:{ bg:'#E8F0EA', fg:'#1B4332' }, BUSINESS:{ bg:'#FAF3E5', fg:'#B87333' }, DRIVER:{ bg:C.cream, fg:C.muted } };
const STATUS_COLORS = { ACTIVE:{ bg:'#E8F0EA', fg:'#1B4332' }, PENDING:{ bg:'#FAF3E5', fg:'#B87333' }, SUSPENDED:{ bg:'#FCEDE9', fg:'#9B2C2C' }, BANNED:{ bg:'#FCEDE9', fg:'#9B2C2C' } };

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selected, setSelected] = useState(null);

  const load = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (roleFilter) params.set('role', roleFilter);
    api.get(`/admin/users?${params}`).then(r => setUsers(r.data.users || [])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search, roleFilter]);

  const suspend = async (userId, status) => {
    try {
      await api.patch(`/admin/users/${userId}/status`, { status });
      toast.success(`User ${status.toLowerCase()}`);
      load();
      setSelected(null);
    } catch { toast.error('Failed'); }
  };

  const filtered = users.filter(u =>
    (!search || `${u.firstName} ${u.lastName} ${u.email} ${u.phone}`.toLowerCase().includes(search.toLowerCase())) &&
    (!roleFilter || u.role === roleFilter)
  );

  return (
    <div style={{ padding:'28px 32px', fontFamily:'Inter, sans-serif' }}>
      <div style={{ paddingBottom:20, borderBottom:`1px solid ${C.borderSoft}`, marginBottom:24 }}>
        <div style={{ fontSize:11, color:C.bronze, letterSpacing:'0.16em', textTransform:'uppercase', fontWeight:500, marginBottom:6 }}>Platform users</div>
        <h1 style={{ fontFamily:'Fraunces, serif', fontSize:30, fontWeight:500, margin:0, letterSpacing:'-0.02em' }}>Users</h1>
        <p style={{ color:C.muted, fontSize:14, margin:'4px 0 0' }}>{users.length.toLocaleString()} total accounts</p>
      </div>

      <div style={{ display:'flex', gap:10, marginBottom:20 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email or phone…"
          style={{ flex:1, background:C.paper, border:`1px solid ${C.border}`, borderRadius:4, padding:'9px 14px', fontSize:14, color:C.ink, fontFamily:'inherit' }} />
        <div style={{ display:'flex', gap:6 }}>
          {['','BUSINESS','DRIVER','ADMIN'].map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              style={{ background:roleFilter===r?C.forest:'transparent', color:roleFilter===r?C.paper:C.muted, border:`1px solid ${roleFilter===r?C.forest:C.border}`, borderRadius:4, padding:'8px 14px', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>
              {r || 'All'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:selected?'1fr 320px':'1fr', gap:20 }}>
        <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, overflow:'hidden' }}>
          {loading ? <div style={{ padding:48, textAlign:'center', color:C.muted }}>Loading…</div> : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr style={{ background:C.cream, borderBottom:`1px solid ${C.borderSoft}` }}>
                {['Name','Contact','Role','Status','Joined'].map(h => (
                  <th key={h} style={{ padding:'10px 18px', textAlign:'left', fontSize:10, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.map((u, i) => {
                  const rc = ROLE_COLORS[u.role] || { bg:C.cream, fg:C.muted };
                  const sc = STATUS_COLORS[u.status] || { bg:C.cream, fg:C.muted };
                  return (
                    <tr key={u.id} onClick={() => setSelected(selected?.id===u.id?null:u)}
                      style={{ borderBottom:i<filtered.length-1?`1px solid ${C.borderSoft}`:'none', cursor:'pointer', background:selected?.id===u.id?C.cream:'transparent' }}>
                      <td style={{ padding:'13px 18px' }}>
                        <div style={{ fontSize:14, fontWeight:500, color:C.ink }}>{u.firstName} {u.lastName}</div>
                      </td>
                      <td style={{ padding:'13px 18px' }}>
                        <div style={{ fontSize:13, color:C.ink }}>{u.email}</div>
                        <div style={{ fontSize:11, color:C.muted }}>{u.phone}</div>
                      </td>
                      <td style={{ padding:'13px 18px' }}><span style={{ background:rc.bg, color:rc.fg, padding:'2px 8px', borderRadius:3, fontSize:11, fontWeight:500 }}>{u.role}</span></td>
                      <td style={{ padding:'13px 18px' }}><span style={{ background:sc.bg, color:sc.fg, padding:'2px 8px', borderRadius:3, fontSize:11, fontWeight:500 }}>{u.status}</span></td>
                      <td style={{ padding:'13px 18px', fontSize:12, color:C.subtle }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {selected && (
          <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, padding:24 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
              <div style={{ width:44, height:44, borderRadius:4, background:C.forest, color:C.paper, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Fraunces, serif', fontSize:18, fontWeight:500 }}>
                {selected.firstName?.[0]}
              </div>
              <div>
                <div style={{ fontSize:16, fontWeight:500, color:C.ink }}>{selected.firstName} {selected.lastName}</div>
                <div style={{ fontSize:12, color:C.muted }}>{selected.role}</div>
              </div>
            </div>
            {[['Email', selected.email],['Phone', selected.phone||'—'],['Country', selected.country||'—'],['Language', selected.language||'—'],['Joined', new Date(selected.createdAt).toLocaleString()]].map(([k,v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:`1px solid ${C.borderSoft}`, fontSize:13 }}>
                <span style={{ color:C.muted }}>{k}</span>
                <span style={{ color:C.ink, fontWeight:500 }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop:20, display:'flex', flexDirection:'column', gap:8 }}>
              {selected.status !== 'SUSPENDED' && <button onClick={() => suspend(selected.id,'SUSPENDED')}
                style={{ background:'transparent', color:'#9B2C2C', border:`1px solid #9B2C2C`, borderRadius:4, padding:'9px', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>Suspend account</button>}
              {selected.status === 'SUSPENDED' && <button onClick={() => suspend(selected.id,'ACTIVE')}
                style={{ background:C.forest, color:C.paper, border:'none', borderRadius:4, padding:'9px', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>Reinstate account</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
