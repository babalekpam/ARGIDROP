import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9' };

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email:'', password:'' });
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault(); setLoading(true);
    try {
      const u = await login(form.email, form.password);
      toast.success('Welcome back!');
      const dest = u.role === 'ADMIN' ? '/admin' : u.role === 'DRIVER' ? '/driver' : '/dashboard';
      nav(dest);
    }
    catch(err) { toast.error(err.response?.data?.message || 'Login failed'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', background:C.cream, display:'flex', alignItems:'center', justifyContent:'center', padding:24, fontFamily:'Inter, sans-serif' }}>
      <div style={{ width:'100%', maxWidth:420 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontFamily:'Fraunces, serif', fontSize:26, fontWeight:600, color:C.forest, marginBottom:4 }}>ArgiDrop</div>
          <div style={{ fontSize:11, color:C.bronze, letterSpacing:'0.16em', textTransform:'uppercase', fontWeight:500 }}>Welcome back</div>
        </div>

        <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, padding:32 }}>
          <form onSubmit={submit}>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:12, color:C.muted, fontWeight:600, marginBottom:5, letterSpacing:0.3 }}>Email address</label>
              <input type="email" value={form.email} onChange={e => setForm(p=>({...p,email:e.target.value}))} required autoComplete="email"
                style={{ width:'100%', background:C.cream, border:`1px solid ${C.border}`, borderRadius:4, padding:'10px 12px', fontSize:14, color:C.ink, fontFamily:'inherit' }} />
            </div>
            <div style={{ marginBottom:24 }}>
              <label style={{ display:'block', fontSize:12, color:C.muted, fontWeight:600, marginBottom:5, letterSpacing:0.3 }}>Password</label>
              <input type="password" value={form.password} onChange={e => setForm(p=>({...p,password:e.target.value}))} required autoComplete="current-password"
                style={{ width:'100%', background:C.cream, border:`1px solid ${C.border}`, borderRadius:4, padding:'10px 12px', fontSize:14, color:C.ink, fontFamily:'inherit' }} />
            </div>
            <button type="submit" disabled={loading}
              style={{ width:'100%', background:C.forest, color:C.paper, border:'none', borderRadius:4, padding:'13px', fontWeight:500, fontSize:14, cursor:'pointer', fontFamily:'inherit', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p style={{ textAlign:'center', marginTop:20, fontSize:13, color:C.muted }}>
          No account? <Link to="/register" style={{ color:C.forest, fontWeight:500 }}>Create one</Link>
        </p>
        <p style={{ textAlign:'center', marginTop:10, fontSize:12, color:C.subtle }}>
          <Link to="/" style={{ color:C.subtle }}>← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
