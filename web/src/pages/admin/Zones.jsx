import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', borderSoft:'#EFE8D7' };

const CURRENCIES = ['XOF','GHS','NGN','KES','UGX','TZS'];
const COUNTRIES = [['TG','Togo'],['CI',"Côte d'Ivoire"],['SN','Senegal'],['BJ','Benin'],['BF','Burkina Faso'],['GH','Ghana'],['NG','Nigeria'],['ML','Mali'],['NE','Niger'],['GN','Guinea'],['SL','Sierra Leone'],['LR','Liberia'],['GM','The Gambia'],['GW','Guinea-Bissau'],['CV','Cape Verde'],['KE','Kenya']];

const defaultZone = { name:'', city:'', country:'TG', currency:'XOF', commissionRate:'18.00', surgeMultiplier:'1.00', radiusKm:'30', minimumDeliveryPrice:'', centerLat:'', centerLng:'', isActive:true };

export default function AdminZones() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultZone);
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/admin/zones').then(r => setZones(r.data.zones||[])).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(defaultZone); setEditing('new'); };
  const openEdit = z => { setForm({ ...z }); setEditing(z.id); };
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.type==='checkbox' ? e.target.checked : e.target.value }));

  const save = async () => {
    if (!form.name || !form.city || !form.country) return toast.error('Name, city, and country required');
    setSaving(true);
    try {
      if (editing === 'new') {
        await api.post('/admin/zones', form);
        toast.success('Zone created');
      } else {
        await api.patch(`/admin/zones/${editing}`, form);
        toast.success('Zone updated');
      }
      setEditing(null);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ padding:'28px 32px', fontFamily:'Inter, sans-serif' }}>
      <div style={{ paddingBottom:20, borderBottom:`1px solid ${C.borderSoft}`, marginBottom:24, display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
        <div>
          <div style={{ fontSize:11, color:C.bronze, letterSpacing:'0.16em', textTransform:'uppercase', fontWeight:500, marginBottom:6 }}>Coverage</div>
          <h1 style={{ fontFamily:'Fraunces, serif', fontSize:30, fontWeight:500, margin:0, letterSpacing:'-0.02em' }}>Delivery zones</h1>
          <p style={{ color:C.muted, fontSize:14, margin:'4px 0 0' }}>Manage operating zones, commission rates, and surge pricing</p>
        </div>
        <button onClick={openNew}
          style={{ background:C.forest, color:C.paper, border:'none', borderRadius:4, padding:'10px 20px', fontWeight:500, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
          Add zone
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:editing?'1fr 380px':'1fr', gap:20 }}>
        <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, overflow:'hidden' }}>
          {loading ? <div style={{ padding:48, textAlign:'center', color:C.muted }}>Loading…</div> :
            zones.length === 0 ? (
              <div style={{ padding:48, textAlign:'center', color:C.muted }}>
                <div style={{ fontSize:15, fontWeight:500, marginBottom:8 }}>No zones yet</div>
                <div style={{ fontSize:13 }}>Add your first delivery zone to get started.</div>
              </div>
            ) : (
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr style={{ background:C.cream, borderBottom:`1px solid ${C.borderSoft}` }}>
                  {['Zone','Country','Currency','Commission','Surge','Radius','Status',''].map(h => (
                    <th key={h} style={{ padding:'10px 18px', textAlign:'left', fontSize:10, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {zones.map((z, i) => (
                    <tr key={z.id} style={{ borderBottom:i<zones.length-1?`1px solid ${C.borderSoft}`:'none' }}>
                      <td style={{ padding:'13px 18px' }}>
                        <div style={{ fontSize:14, fontWeight:500, color:C.ink }}>{z.name}</div>
                        <div style={{ fontSize:12, color:C.muted }}>{z.city}</div>
                      </td>
                      <td style={{ padding:'13px 18px', fontSize:13, color:C.ink }}>{COUNTRIES.find(c=>c[0]===z.country)?.[1] || z.country}</td>
                      <td style={{ padding:'13px 18px', fontSize:13, fontWeight:500, color:C.ink }}>{z.currency}</td>
                      <td style={{ padding:'13px 18px', fontFamily:'Fraunces, serif', fontSize:15, fontWeight:500, color:C.forest }}>{z.commissionRate}%</td>
                      <td style={{ padding:'13px 18px', fontSize:13, color:C.ink }}>{z.surgeMultiplier}×</td>
                      <td style={{ padding:'13px 18px', fontSize:12, color:C.muted }}>{z.radiusKm} km</td>
                      <td style={{ padding:'13px 18px' }}>
                        <span style={{ background:z.isActive?'#E8F0EA':'#FCEDE9', color:z.isActive?C.forest:'#9B2C2C', padding:'2px 8px', borderRadius:3, fontSize:11, fontWeight:500 }}>
                          {z.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding:'13px 18px' }}>
                        <button onClick={() => openEdit(z)} style={{ background:'transparent', border:`1px solid ${C.border}`, color:C.muted, borderRadius:4, padding:'4px 12px', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>

        {editing && (
          <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, padding:24 }}>
            <h3 style={{ fontFamily:'Fraunces, serif', fontSize:16, fontWeight:500, margin:'0 0 20px' }}>{editing==='new' ? 'New zone' : 'Edit zone'}</h3>
            <F label="Zone name" value={form.name} onChange={set('name')} placeholder="e.g. Lomé Central" />
            <F label="City" value={form.city} onChange={set('city')} placeholder="e.g. Lomé" />
            <div style={{ display:'flex', gap:10 }}>
              <div style={{ flex:1 }}>
                <label style={lbl}>Country</label>
                <select value={form.country} onChange={set('country')} style={sel}>
                  {COUNTRIES.map(([code,name]) => <option key={code} value={code}>{name}</option>)}
                </select>
              </div>
              <div style={{ flex:1 }}>
                <label style={lbl}>Currency</label>
                <select value={form.currency} onChange={set('currency')} style={sel}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <F label="Commission %" value={form.commissionRate} onChange={set('commissionRate')} type="number" />
              <F label="Surge multiplier" value={form.surgeMultiplier} onChange={set('surgeMultiplier')} type="number" />
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <F label="Radius (km)" value={form.radiusKm} onChange={set('radiusKm')} type="number" />
              <F label="Min price" value={form.minimumDeliveryPrice} onChange={set('minimumDeliveryPrice')} placeholder="Optional" />
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <F label="Center lat" value={form.centerLat} onChange={set('centerLat')} placeholder="6.1319" />
              <F label="Center lng" value={form.centerLng} onChange={set('centerLng')} placeholder="1.2228" />
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
              <input type="checkbox" checked={form.isActive} onChange={set('isActive')} id="isActive" />
              <label htmlFor="isActive" style={{ fontSize:13, color:C.ink, cursor:'pointer' }}>Zone active</label>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setEditing(null)}
                style={{ background:'transparent', border:`1px solid ${C.border}`, color:C.muted, borderRadius:4, padding:'10px 18px', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
              <button onClick={save} disabled={saving}
                style={{ flex:1, background:C.forest, color:C.paper, border:'none', borderRadius:4, padding:'10px', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>
                {saving ? 'Saving…' : editing==='new' ? 'Create zone' : 'Save changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const lbl = { display:'block', fontSize:12, color:C.muted, fontWeight:600, marginBottom:5, letterSpacing:0.3 };
const sel = { width:'100%', background:C.cream, border:`1px solid ${C.border}`, borderRadius:4, padding:'10px 12px', fontSize:14, color:C.ink, fontFamily:'Inter, sans-serif' };
function F({ label, value, onChange, type='text', placeholder }) {
  return (
    <div style={{ flex:1, marginBottom:12 }}>
      <label style={lbl}>{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        style={{ width:'100%', background:C.cream, border:`1px solid ${C.border}`, borderRadius:4, padding:'10px 12px', fontSize:14, color:C.ink, fontFamily:'inherit' }} />
    </div>
  );
}
