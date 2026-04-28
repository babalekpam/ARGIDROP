import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', forestDeep:'#0F2A1F', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', borderSoft:'#EFE8D7' };

// Reusable phone-frame mockup that showcases the app icon. Pure CSS — no images
// other than the icon itself, so it stays crisp at any size and never breaks.
function PhoneIconShowcase({ size = 280 }) {
  const w = size;
  const h = Math.round(size * 2.05);
  return (
    <div style={{ position:'relative', width:w, height:h, margin:'0 auto' }}>
      {/* Soft glow behind the phone */}
      <div style={{ position:'absolute', inset:'10% -10%', background:'radial-gradient(closest-side, rgba(27,67,50,0.18), rgba(27,67,50,0))', filter:'blur(20px)', zIndex:0 }} />
      {/* Phone frame */}
      <div style={{ position:'relative', zIndex:1, width:'100%', height:'100%', background:'#1a1a1a', borderRadius:w*0.16, padding:w*0.025, boxShadow:'0 30px 60px -20px rgba(15,42,31,0.45), 0 12px 24px -10px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(255,255,255,0.06)' }}>
        {/* Inner screen */}
        <div style={{ position:'relative', width:'100%', height:'100%', background:`linear-gradient(160deg, ${C.forest} 0%, ${C.forestDeep} 100%)`, borderRadius:w*0.14, overflow:'hidden', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:w*0.06 }}>
          {/* Notch */}
          <div style={{ position:'absolute', top:w*0.045, left:'50%', transform:'translateX(-50%)', width:w*0.32, height:w*0.05, background:'#0a0a0a', borderRadius:w*0.025 }} />
          {/* Status bar time */}
          <div style={{ position:'absolute', top:w*0.05, left:w*0.08, color:'rgba(255,255,255,0.85)', fontSize:w*0.045, fontWeight:600, fontFamily:'system-ui' }}>9:41</div>
          {/* Status bar icons (battery, signal) */}
          <div style={{ position:'absolute', top:w*0.05, right:w*0.08, display:'flex', gap:w*0.015, alignItems:'center' }}>
            <div style={{ width:w*0.04, height:w*0.025, background:'rgba(255,255,255,0.85)', borderRadius:1 }} />
            <div style={{ width:w*0.06, height:w*0.025, background:'rgba(255,255,255,0.85)', borderRadius:2 }} />
          </div>

          {/* The hero — app icon */}
          <img
            src="/argidrop-icon.png"
            alt="ArgiDrop app icon"
            style={{ width:w*0.42, height:w*0.42, borderRadius:w*0.095, boxShadow:'0 18px 40px -10px rgba(0,0,0,0.45), 0 4px 10px -2px rgba(0,0,0,0.25)' }}
          />
          <div style={{ textAlign:'center', color:'rgba(255,255,255,0.95)' }}>
            <div style={{ fontFamily:'Fraunces, serif', fontSize:w*0.075, fontWeight:500, letterSpacing:'-0.01em' }}>ArgiDrop</div>
            <div style={{ fontSize:w*0.035, color:'rgba(255,255,255,0.6)', marginTop:w*0.012, letterSpacing:'0.06em', textTransform:'uppercase' }}>Driver · Merchant</div>
          </div>

          {/* Home indicator bar */}
          <div style={{ position:'absolute', bottom:w*0.025, left:'50%', transform:'translateX(-50%)', width:w*0.34, height:w*0.012, background:'rgba(255,255,255,0.4)', borderRadius:w*0.006 }} />
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const { t } = useTranslation();
  const stepKeys = ['step1', 'step2', 'step3'];
  const romans = ['I', 'II', 'III'];

  return (
    <div style={{ minHeight:'100vh', background:C.cream, fontFamily:'Inter, system-ui, sans-serif', color:C.ink }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=Inter:wght@300;400;500;600&display=swap'); * { box-sizing:border-box; } body { margin:0; }
        @media (max-width: 880px) {
          .hero-grid { grid-template-columns: 1fr !important; text-align: center !important; }
          .hero-text { text-align: center !important; }
          .hero-ctas { justify-content: center !important; }
          .markets-row { flex-direction: column !important; gap: 24px !important; }
          .download-row { flex-direction: column !important; gap: 28px !important; text-align: center !important; }
          .download-text { text-align: center !important; }
          .download-badges { justify-content: center !important; }
          .steps-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .steps-grid > div { border-right: none !important; padding: 24px 0 !important; border-bottom: 1px solid ${C.borderSoft}; }
          .steps-grid > div:last-child { border-bottom: none !important; }
        }
      `}</style>

      {/* Nav */}
      <nav style={{ position:'sticky', top:0, zIndex:100, background:C.paper, borderBottom:`1px solid ${C.border}`, padding:'14px 40px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <Link to="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none' }}>
          <img src="/argidrop-icon.png" alt="" style={{ width:32, height:32, borderRadius:7, boxShadow:'0 2px 6px rgba(15,42,31,0.18)' }} />
          <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
            <span style={{ fontFamily:'Fraunces, serif', fontSize:22, fontWeight:600, color:C.forest, letterSpacing:'-0.02em' }}>ArgiDrop</span>
            <span style={{ fontSize:10, color:C.bronze, fontWeight:500, letterSpacing:'0.14em', textTransform:'uppercase' }}>by ARGILETTE</span>
          </div>
        </Link>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <LanguageSwitcher compact />
          <Link to="/login"><button style={{ background:'transparent', color:C.muted, border:`1px solid ${C.border}`, borderRadius:4, padding:'9px 20px', fontWeight:500, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>{t('nav.signIn')}</button></Link>
          <Link to="/register"><button style={{ background:C.forest, color:C.paper, border:'none', borderRadius:4, padding:'9px 20px', fontWeight:500, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>{t('nav.getStarted')}</button></Link>
        </div>
      </nav>

      {/* Hero — two-column with phone mockup */}
      <div style={{ maxWidth:1180, margin:'0 auto', padding:'72px 40px 56px' }}>
        <div className="hero-grid" style={{ display:'grid', gridTemplateColumns:'1.1fr 0.9fr', gap:56, alignItems:'center' }}>
          <div className="hero-text" style={{ textAlign:'left' }}>
            <div style={{ fontSize:11, color:C.bronze, letterSpacing:'0.18em', fontWeight:500, textTransform:'uppercase', marginBottom:20 }}>
              {t('landing.eyebrow')}
            </div>
            <h1 style={{ fontFamily:'Fraunces, serif', fontSize:60, fontWeight:400, lineHeight:1.04, letterSpacing:'-0.025em', margin:'0 0 22px' }}>
              {t('landing.headline1')}<br />
              <em style={{ fontStyle:'italic', color:C.forest, fontWeight:500 }}>{t('landing.headlineBrand')}</em> {t('landing.headline2')}
            </h1>
            <p style={{ fontSize:16, lineHeight:1.65, color:C.muted, maxWidth:520, margin:'0 0 32px' }}>
              {t('landing.subhead')}
            </p>
            <div className="hero-ctas" style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              <Link to="/register">
                <button style={{ background:C.forest, color:C.paper, padding:'13px 28px', borderRadius:4, fontWeight:500, fontSize:14, border:'none', cursor:'pointer', fontFamily:'inherit' }}>
                  {t('landing.ctaPost')}
                </button>
              </Link>
              <a href="#driver">
                <button style={{ background:'transparent', color:C.ink, padding:'13px 28px', borderRadius:4, fontWeight:500, fontSize:14, border:`1px solid ${C.border}`, cursor:'pointer', fontFamily:'inherit' }}>
                  {t('landing.ctaDriver')}
                </button>
              </a>
            </div>
          </div>
          <div>
            <PhoneIconShowcase size={260} />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ maxWidth:900, margin:'0 auto 64px', padding:'0 40px' }}>
        <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, display:'grid', gridTemplateColumns:'repeat(2,1fr)', overflow:'hidden' }}>
          {[
            ['15 min', t('landing.stats.avgMatch')],
            ['3 scans', t('landing.stats.qrChain')],
          ].map(([v, l], i) => (
            <div key={v} style={{ padding:'28px 32px', textAlign:'center', borderRight:i<1?`1px solid ${C.borderSoft}`:'none' }}>
              <div style={{ fontFamily:'Fraunces, serif', fontSize:36, fontWeight:500, color:C.forest, letterSpacing:'-0.02em', lineHeight:1 }}>{v}</div>
              <div style={{ fontSize:13, color:C.muted, marginTop:10, lineHeight:1.5 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div style={{ maxWidth:1000, margin:'0 auto 80px', padding:'0 40px' }}>
        <div style={{ textAlign:'center', marginBottom:48 }}>
          <div style={{ fontSize:11, color:C.bronze, letterSpacing:'0.18em', fontWeight:500, textTransform:'uppercase', marginBottom:14 }}>{t('landing.process.eyebrow')}</div>
          <h2 style={{ fontFamily:'Fraunces, serif', fontSize:34, fontWeight:400, letterSpacing:'-0.02em', margin:0 }}>
            {t('landing.process.title1')} <em style={{ color:C.forest }}>{t('landing.process.title2')}</em>
          </h2>
        </div>
        <div className="steps-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:0 }}>
          {stepKeys.map((sk, i) => (
            <div key={sk} style={{ padding:'0 32px', borderRight:i<2?`1px solid ${C.borderSoft}`:'none' }}>
              <div style={{ fontFamily:'Fraunces, serif', fontSize:13, color:C.bronze, fontStyle:'italic', marginBottom:14, fontWeight:500 }}>{t('landing.process.chapter')} {romans[i]}</div>
              <h3 style={{ fontFamily:'Fraunces, serif', fontSize:19, fontWeight:500, marginBottom:10, letterSpacing:'-0.01em' }}>{t(`landing.process.${sk}.title`)}</h3>
              <p style={{ color:C.muted, lineHeight:1.65, fontSize:14, margin:0 }}>{t(`landing.process.${sk}.desc`)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Markets */}
      <div style={{ maxWidth:900, margin:'0 auto 80px', padding:'0 40px' }}>
        <div className="markets-row" style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, padding:'40px 48px', display:'flex', gap:48, alignItems:'center' }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, color:C.bronze, letterSpacing:'0.16em', fontWeight:500, textTransform:'uppercase', marginBottom:12 }}>{t('landing.markets.eyebrow')}</div>
            <h3 style={{ fontFamily:'Fraunces, serif', fontSize:26, fontWeight:400, margin:'0 0 12px', letterSpacing:'-0.015em' }}>{t('landing.markets.title')}</h3>
            <p style={{ fontSize:14, color:C.muted, lineHeight:1.65, margin:'0 0 20px' }}>
              {t('landing.markets.desc')}
            </p>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {['Togo 🇹🇬', "Côte d'Ivoire 🇨🇮", 'Ghana 🇬🇭', 'Sénégal 🇸🇳', 'Bénin 🇧🇯', 'Nigeria 🇳🇬'].map(c => (
                <span key={c} style={{ fontSize:12, background:C.cream, border:`1px solid ${C.border}`, borderRadius:3, padding:'4px 10px', color:C.ink }}>{c}</span>
              ))}
            </div>
          </div>
          <div style={{ width:200, textAlign:'center' }}>
            <div style={{ fontFamily:'Fraunces, serif', fontSize:56, fontWeight:500, color:C.forest, lineHeight:1 }}>{t('landing.markets.bigNumber')}</div>
            <div style={{ fontSize:13, color:C.muted, marginTop:6 }}>{t('landing.markets.bigLabel')}</div>
          </div>
        </div>
      </div>

      {/* Download / Mobile App section — featuring the icon */}
      <div style={{ maxWidth:1000, margin:'0 auto 80px', padding:'0 40px' }}>
        <div className="download-row" style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, padding:'40px 48px', display:'flex', gap:40, alignItems:'center' }}>
          <img src="/argidrop-icon.png" alt="ArgiDrop app icon" style={{ width:96, height:96, borderRadius:21, boxShadow:'0 12px 28px -8px rgba(15,42,31,0.35), 0 4px 8px -2px rgba(0,0,0,0.12)', flexShrink:0 }} />
          <div className="download-text" style={{ flex:1, textAlign:'left' }}>
            <div style={{ fontSize:11, color:C.bronze, letterSpacing:'0.16em', fontWeight:500, textTransform:'uppercase', marginBottom:10 }}>{t('landing.app.eyebrow', 'Application mobile')}</div>
            <h3 style={{ fontFamily:'Fraunces, serif', fontSize:26, fontWeight:400, margin:'0 0 10px', letterSpacing:'-0.015em' }}>{t('landing.app.title', "Toute l'opération dans votre poche")}</h3>
            <p style={{ fontSize:14, color:C.muted, lineHeight:1.65, margin:'0 0 20px', maxWidth:520 }}>
              {t('landing.app.desc', "Postez une livraison, scannez les QR de bout en bout, suivez vos livreurs et gérez votre portefeuille — disponible sur iOS et Android.")}
            </p>
            <div className="download-badges" style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
              <a href="#" onClick={(e)=>e.preventDefault()} aria-label="Download on the App Store" style={{ display:'inline-flex', alignItems:'center', gap:10, background:'#000', color:'#fff', padding:'10px 18px', borderRadius:8, textDecoration:'none', fontFamily:'inherit' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.365 1.43c0 1.14-.413 2.197-1.235 3.171-.99 1.155-2.187 1.823-3.486 1.717a3.43 3.43 0 0 1-.025-.426c0-1.094.474-2.262 1.317-3.21C13.36.83 14.345.249 15.36 0c.005.477.005.953.005 1.43zM20.5 17.59c-.557 1.226-.823 1.774-1.54 2.86-1 1.514-2.41 3.4-4.157 3.413-1.554.014-1.953-.972-4.06-.96-2.106.012-2.546.978-4.1.964-1.747-.014-3.082-1.717-4.082-3.231C-.155 16.293-.49 11.234 1.79 8.55c1.57-1.85 4.05-2.93 6.378-2.97 1.652-.029 3.21.876 4.21.876 1 0 2.928-1.083 4.94-.924.844.034 3.21.341 4.74 2.566-.124.078-2.825 1.65-2.795 4.917.034 3.901 3.418 5.198 3.456 5.213-.029.094-.553 1.892-1.819 3.962z"/></svg>
                <span style={{ display:'flex', flexDirection:'column', lineHeight:1.05 }}>
                  <span style={{ fontSize:9, opacity:0.75, letterSpacing:'0.05em' }}>{t('landing.app.iosTop', "BIENTÔT SUR")}</span>
                  <span style={{ fontSize:15, fontWeight:600 }}>App Store</span>
                </span>
              </a>
              <a href="#" onClick={(e)=>e.preventDefault()} aria-label="Get it on Google Play" style={{ display:'inline-flex', alignItems:'center', gap:10, background:'#000', color:'#fff', padding:'10px 18px', borderRadius:8, textDecoration:'none', fontFamily:'inherit' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="#34A853" d="M3 20.5V3.5c0-.59.34-1.11.84-1.35L13.69 12 3.84 21.85c-.5-.25-.84-.76-.84-1.35z"/><path fill="#FBBC04" d="M16.81 15.12L6.05 21.34l8.49-8.49 2.27 2.27z"/><path fill="#4285F4" d="M20.16 10.81c.5.39.5 1.16 0 1.55l-2.26 1.31-2.5-2.51 2.5-2.51 2.26 1.16z"/><path fill="#EA4335" d="M6.05 2.66l10.76 6.22-2.27 2.27L6.05 2.66z"/></svg>
                <span style={{ display:'flex', flexDirection:'column', lineHeight:1.05 }}>
                  <span style={{ fontSize:9, opacity:0.75, letterSpacing:'0.05em' }}>{t('landing.app.androidTop', "BIENTÔT SUR")}</span>
                  <span style={{ fontSize:15, fontWeight:600 }}>Google Play</span>
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* CTA — Driver */}
      <div id="driver" style={{ maxWidth:900, margin:'0 auto 80px', padding:'0 40px' }}>
        <div style={{ background:C.forest, borderRadius:8, padding:'48px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:32 }}>
          <div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', letterSpacing:'0.16em', fontWeight:500, textTransform:'uppercase', marginBottom:12 }}>{t('landing.driverCta.eyebrow')}</div>
            <h3 style={{ fontFamily:'Fraunces, serif', fontSize:26, fontWeight:400, color:C.paper, margin:'0 0 10px' }}>{t('landing.driverCta.title')}</h3>
            <p style={{ fontSize:14, color:'rgba(255,255,255,0.7)', lineHeight:1.6, margin:0 }}>{t('landing.driverCta.desc')}</p>
          </div>
          <Link to="/register" style={{ flexShrink:0 }}>
            <button style={{ background:C.paper, color:C.forest, border:'none', borderRadius:4, padding:'13px 28px', fontWeight:600, fontSize:14, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
              {t('landing.driverCta.button')}
            </button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop:`1px solid ${C.border}`, padding:'32px 40px', display:'flex', justifyContent:'space-between', alignItems:'center', maxWidth:1200, margin:'0 auto', flexWrap:'wrap', gap:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <img src="/argidrop-icon.png" alt="" style={{ width:24, height:24, borderRadius:5 }} />
          <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
            <span style={{ fontFamily:'Fraunces, serif', fontSize:16, fontWeight:600, color:C.forest }}>ArgiDrop</span>
            <span style={{ fontSize:10, color:C.subtle }}>{t('landing.footer.org')}</span>
          </div>
        </div>
        <div style={{ display:'flex', gap:18, alignItems:'center', fontSize:12, color:C.subtle }}>
          <Link to="/privacy" style={{ color:C.subtle, textDecoration:'none' }}>{t('landing.footer.privacy')}</Link>
          <Link to="/terms" style={{ color:C.subtle, textDecoration:'none' }}>{t('landing.footer.terms')}</Link>
          <span>{t('landing.footer.copyright')}</span>
        </div>
      </div>
    </div>
  );
}
