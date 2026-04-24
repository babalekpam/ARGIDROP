import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', borderSoft:'#EFE8D7' };

export default function BusinessProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [biz, setBiz] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('company');

  useEffect(() => {
    api.get('/businesses/me').then(r => { setBiz(r.data); setForm(r.data); }).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch('/businesses/profile', form);
      toast.success('Profile updated');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const TABS = ['company','account'];

  return (
    <div style={{ padding:'28px 32px', fontFamily:'Inter, sans-serif', maxWidth:680 }}>
      <div style={{ paddingBottom:20, borderBottom:`1px solid ${C.borderSoft}`, marginBottom:28 }}>
        <div style={{ fontSize:11, color:C.bronze, letterSpacing:'0.16em', textTransform:'uppercase', fontWeight:500, marginBottom:6 }}>Settings</div>
        <h1 style={{ fontFamily:'Fraunces, serif', fontSize:30, fontWeight:500, margin:0, letterSpacing:'-0.02em' }}>Profile</h1>
      </div>

      {biz?.verificationStatus && (
        <div style={{ background: biz.verificationStatus==='APPROVED'?'#E8F0EA':biz.verificationStatus==='REJECTED'?'#FCEDE9':'#FAF3E5',
          border:`1px solid ${biz.verificationStatus==='APPROVED'?'#B8D4BC':biz.verificationStatus==='REJECTED'?'#F1B9A7':'#E8D9B9'}`,
          borderRadius:6, padding:'11px 16px', marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:13 }}>
          <span style={{ fontWeight:500, color: biz.verificationStatus==='APPROVED'?C.forest:biz.verificationStatus==='REJECTED'?'#9B2C2C':'#B87333' }}>
            {biz.verificationStatus==='APPROVED' ? '✓ Business verified' : biz.verificationStatus==='PENDING' ? '⏳ Verification under review' : '⚠ Verification needed'}
          </span>
          {biz.verificationStatus !== 'APPROVED' && (
            <button onClick={() => navigate('/onboarding')} style={{ background:'transparent', border:'none', color:C.forest, fontWeight:500, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
              {biz.verificationStatus === 'REJECTED' ? 'Re-submit documents →' : 'View submission →'}
            </button>
          )}
        </div>
      )}

      <div style={{ display:'flex', gap:0, marginBottom:24, borderBottom:`1px solid ${C.border}` }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ background:'transparent', border:'none', borderBottom:tab===t?`2px solid ${C.forest}`:'2px solid transparent', padding:'10px 20px', fontSize:13, fontWeight:tab===t?500:400, color:tab===t?C.ink:C.muted, cursor:'pointer', fontFamily:'inherit', marginBottom:-1 }}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'company' && (
        <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, padding:24 }}>
          <Field label="Company name" value={form.companyName||''} onChange={set('companyName')} />
          <Field label="Business type" value={form.businessType||''} onChange={set('businessType')} />
          <Field label="Tax ID / RCCM" value={form.taxId||''} onChange={set('taxId')} />
          <Field label="Website" value={form.website||''} onChange={set('website')} placeholder="https://" />
          <div style={{ display:'flex', gap:10 }}>
            <Field label="City" value={form.city||''} onChange={set('city')} />
            <Field label="Country" value={form.country||''} onChange={set('country')} />
          </div>
          <Field label="Address" value={form.address||''} onChange={set('address')} />
          <Field label="Billing email" type="email" value={form.billingEmail||''} onChange={set('billingEmail')} />
          <Field label="Mobile money number" value={form.preferredMomoNumber||''} onChange={set('preferredMomoNumber')} placeholder="+228 90 00 00 00" />
          <button onClick={save} disabled={saving}
            style={{ background:C.forest, color:C.paper, border:'none', borderRadius:4, padding:'11px 24px', fontWeight:500, fontSize:13, cursor:'pointer', fontFamily:'inherit', marginTop:8 }}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      )}

      {tab === 'account' && (
        <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, padding:24 }}>
          <Field label="First name" value={user?.firstName||''} onChange={() => {}} disabled />
          <Field label="Last name" value={user?.lastName||''} onChange={() => {}} disabled />
          <Field label="Email" type="email" value={user?.email||''} onChange={() => {}} disabled />
          <Field label="Phone" value={user?.phone||''} onChange={() => {}} disabled />
          <div style={{ marginTop:20, paddingTop:20, borderTop:`1px solid ${C.borderSoft}` }}>
            <div style={{ fontSize:13, color:C.muted, marginBottom:12 }}>To change your email or phone, contact support.</div>
            <button onClick={() => { logout(); navigate('/'); }}
              style={{ background:'transparent', color:'#9B2C2C', border:`1px solid #9B2C2C`, borderRadius:4, padding:'10px 20px', fontWeight:500, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type='text', placeholder, disabled }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:'block', fontSize:12, color:C.muted, fontWeight:600, marginBottom:5, letterSpacing:0.3 }}>{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled}
        style={{ width:'100%', background:disabled?'#F0EDE0':C.cream, border:`1px solid ${C.border}`, borderRadius:4, padding:'10px 12px', fontSize:14, color:disabled?C.muted:C.ink, fontFamily:'inherit', opacity:disabled?0.7:1 }} />
    </div>
  );
}
