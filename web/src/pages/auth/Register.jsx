import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9' };

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ firstName:'', lastName:'', email:'', phone:'', password:'', role:'BUSINESS' });
  const [loading, setLoading] = useState(false);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    if (form.password.length < 8) return toast.error('Password must be at least 8 characters');
    setLoading(true);
    try {
      const user = await register(form);
      toast.success('Account created');
      navigate(user.role === 'BUSINESS' ? '/onboarding' : '/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Registration failed');
    }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', background:C.cream, display:'flex', alignItems:'center', justifyContent:'center', padding:24, fontFamily:'Inter, sans-serif' }}>
      <div style={{ width:'100%', maxWidth:480 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontFamily:'Fraunces, serif', fontSize:26, fontWeight:600, color:C.forest, marginBottom:4 }}>ArgiDrop</div>
          <div style={{ fontSize:11, color:C.bronze, letterSpacing:'0.16em', textTransform:'uppercase', fontWeight:500 }}>Create account</div>
        </div>

        <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, padding:32 }}>
          <div style={{ display:'flex', background:C.cream, borderRadius:6, padding:3, marginBottom:24, border:`1px solid ${C.border}` }}>
            {[['BUSINESS','I send deliveries'],['DRIVER','I deliver']].map(([r,l]) => (
              <button key={r} type="button" onClick={() => setForm(p=>({...p,role:r}))}
                style={{ flex:1, padding:'9px', borderRadius:4, border:'none', cursor:'pointer', fontSize:13, fontWeight:500, background:form.role===r?C.forest:'transparent', color:form.role===r?C.paper:C.muted, fontFamily:'inherit', transition:'all 0.15s' }}>
                {l}
              </button>
            ))}
          </div>

          <form onSubmit={submit}>
            <div style={{ display:'flex', gap:10, marginBottom:14 }}>
              <Field label="First name" value={form.firstName} onChange={set('firstName')} required />
              <Field label="Last name" value={form.lastName} onChange={set('lastName')} required />
            </div>
            <Field label="Email address" type="email" value={form.email} onChange={set('email')} required mb={14} />
            <Field label="Phone number" type="tel" value={form.phone} onChange={set('phone')} placeholder="+228 90 00 00 00" mb={14} />
            <Field label="Password" type="password" value={form.password} onChange={set('password')} hint="At least 8 characters" required mb={24} />

            <button type="submit" disabled={loading}
              style={{ width:'100%', background:C.forest, color:C.paper, border:'none', borderRadius:4, padding:'13px', fontWeight:500, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
              {loading ? 'Creating account…' : `Create ${form.role === 'BUSINESS' ? 'business' : 'driver'} account`}
            </button>
          </form>
        </div>

        <p style={{ textAlign:'center', marginTop:20, fontSize:13, color:C.muted }}>
          Already have an account? <Link to="/login" style={{ color:C.forest, fontWeight:500 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, hint, value, onChange, type='text', required, placeholder, mb=0 }) {
  return (
    <div style={{ flex:1, marginBottom:mb }}>
      <label style={{ display:'block', fontSize:12, color:C.muted, fontWeight:600, marginBottom:5, letterSpacing:0.3 }}>
        {label}{required && <span style={{ color:'#9B2C2C', marginLeft:3 }}>*</span>}
      </label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required}
        style={{ width:'100%', background:C.cream, border:`1px solid ${C.border}`, borderRadius:4, padding:'10px 12px', fontSize:14, color:C.ink, fontFamily:'inherit' }} />
      {hint && <div style={{ fontSize:11, color:C.subtle, marginTop:4 }}>{hint}</div>}
    </div>
  );
}
