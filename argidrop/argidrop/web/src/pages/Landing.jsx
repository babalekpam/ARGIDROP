import React from 'react';
import { Link } from 'react-router-dom';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', borderSoft:'#EFE8D7' };

export default function Landing() {
  return (
    <div style={{ minHeight:'100vh', background:C.cream, fontFamily:'Inter, system-ui, sans-serif', color:C.ink }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=Inter:wght@300;400;500;600&display=swap'); * { box-sizing:border-box; } body { margin:0; }`}</style>

      {/* Nav */}
      <nav style={{ position:'sticky', top:0, zIndex:100, background:C.paper, borderBottom:`1px solid ${C.border}`, padding:'16px 40px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
          <span style={{ fontFamily:'Fraunces, serif', fontSize:22, fontWeight:600, color:C.forest, letterSpacing:'-0.02em' }}>ArgiDrop</span>
          <span style={{ fontSize:10, color:C.bronze, fontWeight:500, letterSpacing:'0.14em', textTransform:'uppercase' }}>by ARGILETTE</span>
        </div>
        <div style={{ display:'flex', gap:12 }}>
          <Link to="/login"><button style={{ background:'transparent', color:C.muted, border:`1px solid ${C.border}`, borderRadius:4, padding:'9px 20px', fontWeight:500, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>Sign in</button></Link>
          <Link to="/register"><button style={{ background:C.forest, color:C.paper, border:'none', borderRadius:4, padding:'9px 20px', fontWeight:500, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>Get started</button></Link>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ maxWidth:960, margin:'0 auto', padding:'80px 40px 64px', textAlign:'center' }}>
        <div style={{ fontSize:11, color:C.bronze, letterSpacing:'0.18em', fontWeight:500, textTransform:'uppercase', marginBottom:20 }}>
          ARGILETTE Marketplace · ECOWAS Delivery Platform
        </div>
        <h1 style={{ fontFamily:'Fraunces, serif', fontSize:58, fontWeight:400, lineHeight:1.05, letterSpacing:'-0.025em', margin:'0 0 20px' }}>
          Business moves.<br />
          <em style={{ fontStyle:'italic', color:C.forest, fontWeight:500 }}>ArgiDrop</em> delivers.
        </h1>
        <p style={{ fontSize:16, lineHeight:1.65, color:C.muted, maxWidth:540, margin:'0 auto 36px' }}>
          Post a delivery. A verified driver nearby accepts. Track it live. Payment releases automatically when the package arrives. Built for businesses across West Africa.
        </p>
        <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
          <Link to="/register">
            <button style={{ background:C.forest, color:C.paper, padding:'13px 28px', borderRadius:4, fontWeight:500, fontSize:14, border:'none', cursor:'pointer', fontFamily:'inherit' }}>
              Post your first delivery
            </button>
          </Link>
          <a href="#driver">
            <button style={{ background:'transparent', color:C.ink, padding:'13px 28px', borderRadius:4, fontWeight:500, fontSize:14, border:`1px solid ${C.border}`, cursor:'pointer', fontFamily:'inherit' }}>
              Become a driver →
            </button>
          </a>
        </div>
      </div>

      {/* Stats */}
      <div style={{ maxWidth:900, margin:'0 auto 64px', padding:'0 40px' }}>
        <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, display:'grid', gridTemplateColumns:'repeat(3,1fr)', overflow:'hidden' }}>
          {[
            ['15 min', 'Average time to match a driver'],
            ['18%', 'Platform commission — the rest is yours'],
            ['3 scans', 'QR-verified chain of custody per delivery'],
          ].map(([v, l], i) => (
            <div key={v} style={{ padding:'28px 32px', textAlign:'center', borderRight:i<2?`1px solid ${C.borderSoft}`:'none' }}>
              <div style={{ fontFamily:'Fraunces, serif', fontSize:36, fontWeight:500, color:C.forest, letterSpacing:'-0.02em', lineHeight:1 }}>{v}</div>
              <div style={{ fontSize:13, color:C.muted, marginTop:10, lineHeight:1.5 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div style={{ maxWidth:1000, margin:'0 auto 80px', padding:'0 40px' }}>
        <div style={{ textAlign:'center', marginBottom:48 }}>
          <div style={{ fontSize:11, color:C.bronze, letterSpacing:'0.18em', fontWeight:500, textTransform:'uppercase', marginBottom:14 }}>The process</div>
          <h2 style={{ fontFamily:'Fraunces, serif', fontSize:34, fontWeight:400, letterSpacing:'-0.02em', margin:0 }}>
            Three steps, <em style={{ color:C.forest }}>from post to proof.</em>
          </h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:0 }}>
          {[
            ['I', 'Scan & pay', 'Post your delivery, scan the QR code with your mobile money app. Job activates the moment payment confirms.'],
            ['II', 'Driver verified at pickup', 'Your assigned driver scans your Pickup QR on arrival. GPS-verified. No scan, no pickup.'],
            ['III', 'Recipient confirms & payment releases', 'Recipient shows their QR. Driver scans at dropoff. Payment releases instantly — 82% to driver, 18% to ArgiDrop.'],
          ].map(([n, title, desc], i) => (
            <div key={n} style={{ padding:'0 32px', borderRight:i<2?`1px solid ${C.borderSoft}`:'none' }}>
              <div style={{ fontFamily:'Fraunces, serif', fontSize:13, color:C.bronze, fontStyle:'italic', marginBottom:14, fontWeight:500 }}>Chapter {n}</div>
              <h3 style={{ fontFamily:'Fraunces, serif', fontSize:19, fontWeight:500, marginBottom:10, letterSpacing:'-0.01em' }}>{title}</h3>
              <p style={{ color:C.muted, lineHeight:1.65, fontSize:14, margin:0 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Markets */}
      <div style={{ maxWidth:900, margin:'0 auto 80px', padding:'0 40px' }}>
        <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, padding:'40px 48px', display:'flex', gap:48, alignItems:'center' }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, color:C.bronze, letterSpacing:'0.16em', fontWeight:500, textTransform:'uppercase', marginBottom:12 }}>West Africa first</div>
            <h3 style={{ fontFamily:'Fraunces, serif', fontSize:26, fontWeight:400, margin:'0 0 12px', letterSpacing:'-0.015em' }}>Built for the ECOWAS market</h3>
            <p style={{ fontSize:14, color:C.muted, lineHeight:1.65, margin:'0 0 20px' }}>
              Mobile money native — MTN MoMo, Orange Money, Wave, T-Money, Moov. Multi-currency: XOF, GHS, NGN. French and English throughout. Pilot launching in Lomé, Togo.
            </p>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {['Togo 🇹🇬', "Côte d'Ivoire 🇨🇮", 'Ghana 🇬🇭', 'Sénégal 🇸🇳', 'Bénin 🇧🇯', 'Nigeria 🇳🇬'].map(c => (
                <span key={c} style={{ fontSize:12, background:C.cream, border:`1px solid ${C.border}`, borderRadius:3, padding:'4px 10px', color:C.ink }}>{c}</span>
              ))}
            </div>
          </div>
          <div style={{ width:200, textAlign:'center' }}>
            <div style={{ fontFamily:'Fraunces, serif', fontSize:56, fontWeight:500, color:C.forest, lineHeight:1 }}>6</div>
            <div style={{ fontSize:13, color:C.muted, marginTop:6 }}>ECOWAS markets at launch</div>
          </div>
        </div>
      </div>

      {/* CTA — Driver */}
      <div id="driver" style={{ maxWidth:900, margin:'0 auto 80px', padding:'0 40px' }}>
        <div style={{ background:C.forest, borderRadius:8, padding:'48px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:32 }}>
          <div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', letterSpacing:'0.16em', fontWeight:500, textTransform:'uppercase', marginBottom:12 }}>Drivers</div>
            <h3 style={{ fontFamily:'Fraunces, serif', fontSize:26, fontWeight:400, color:C.paper, margin:'0 0 10px' }}>Earn with every delivery</h3>
            <p style={{ fontSize:14, color:'rgba(255,255,255,0.7)', lineHeight:1.6, margin:0 }}>Keep 82% of every delivery. Get paid instantly to your mobile money account. Work when you want.</p>
          </div>
          <Link to="/register" style={{ flexShrink:0 }}>
            <button style={{ background:C.paper, color:C.forest, border:'none', borderRadius:4, padding:'13px 28px', fontWeight:600, fontSize:14, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
              Register as driver →
            </button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop:`1px solid ${C.border}`, padding:'32px 40px', display:'flex', justifyContent:'space-between', alignItems:'center', maxWidth:1200, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
          <span style={{ fontFamily:'Fraunces, serif', fontSize:16, fontWeight:600, color:C.forest }}>ArgiDrop</span>
          <span style={{ fontSize:10, color:C.subtle }}>by ARGILETTE LLC · St. Louis, MO</span>
        </div>
        <div style={{ fontSize:12, color:C.subtle }}>© 2026 ARGILETTE LLC. All rights reserved.</div>
      </div>
    </div>
  );
}
