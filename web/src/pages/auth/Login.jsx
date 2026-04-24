import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const C = { blue:'#2563EB', orange:'#F97316', bg:'#0B1120', surface:'#111827', raised:'#1C2333', border:'#253044', txt:'#F1F5F9', muted:'#94A3B8', dim:'#64748B' };

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email:'', password:'' });
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault(); setLoading(true);
    try { const u = await login(form.email, form.password); toast.success('Welcome back!'); nav(u.role === 'ADMIN' ? '/admin' : '/dashboard'); }
    catch(err) { toast.error(err.response?.data?.message || 'Login failed'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=Inter:wght@400;500;600&display=swap'); *{box-sizing:border-box;} .inp:focus{border-color:${C.blue}!important;outline:none;box-shadow:0 0 0 3px rgba(37,99,235,0.15);}`}</style>
      <div style={{ width:'100%', maxWidth:400 }}>
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:20, letterSpacing:'-0.01em', marginBottom:8 }}>
            <span style={{ color:C.blue }}>DEL</span>IVIO
          </div>
          <h1 style={{ fontFamily:'Plus Jakarta Sans', fontSize:22, fontWeight:800, marginBottom:4 }}>Welcome back</h1>
          <p style={{ fontSize:13, color:C.dim }}>Sign in to your ARGIDROP account</p>
        </div>

        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:32 }}>
          <form onSubmit={submit}>
            {[['email','Email address','email'],['password','Password','password']].map(([k,label,type]) => (
              <div key={k} style={{ marginBottom:18 }}>
                <label style={{ display:'block', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:7 }}>{label}</label>
                <input type={type} value={form[k]} onChange={e => setForm(p=>({...p,[k]:e.target.value}))} required className="inp"
                  style={{ width:'100%', background:C.raised, border:`1px solid ${C.border}`, borderRadius:9, padding:'10px 13px', color:C.txt, fontSize:14, transition:'border-color 0.15s, box-shadow 0.15s' }} />
              </div>
            ))}
            <button type="submit" disabled={loading} style={{ width:'100%', marginTop:8, background: loading ? C.dim : C.blue, color:'#fff', border:'none', borderRadius:10, padding:'11px', fontSize:14, fontWeight:700, fontFamily:'Plus Jakarta Sans', transition:'background 0.15s' }}>
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>
          <div style={{ marginTop:20, paddingTop:20, borderTop:`1px solid ${C.border}`, textAlign:'center', fontSize:13, color:C.dim }}>
            No account? <Link to="/register" style={{ color:C.orange, fontWeight:600 }}>Create one</Link>
          </div>
        </div>

        <div style={{ marginTop:16, textAlign:'center' }}>
          <Link to="/" style={{ fontSize:12, color:C.dim }}>← Back to home</Link>
        </div>
      </div>
    </div>
  );
}
