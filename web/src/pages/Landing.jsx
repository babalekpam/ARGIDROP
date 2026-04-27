import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', borderSoft:'#EFE8D7' };

export default function Landing() {
  const { t } = useTranslation();
  const stepKeys = ['step1', 'step2', 'step3'];
  const romans = ['I', 'II', 'III'];

  return (
    <div style={{ minHeight:'100vh', background:C.cream, fontFamily:'Inter, system-ui, sans-serif', color:C.ink }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=Inter:wght@300;400;500;600&display=swap'); * { box-sizing:border-box; } body { margin:0; }`}</style>

      {/* Nav */}
      <nav style={{ position:'sticky', top:0, zIndex:100, background:C.paper, borderBottom:`1px solid ${C.border}`, padding:'16px 40px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
          <span style={{ fontFamily:'Fraunces, serif', fontSize:22, fontWeight:600, color:C.forest, letterSpacing:'-0.02em' }}>ArgiDrop</span>
          <span style={{ fontSize:10, color:C.bronze, fontWeight:500, letterSpacing:'0.14em', textTransform:'uppercase' }}>by ARGILETTE</span>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <LanguageSwitcher compact />
          <Link to="/login"><button style={{ background:'transparent', color:C.muted, border:`1px solid ${C.border}`, borderRadius:4, padding:'9px 20px', fontWeight:500, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>{t('nav.signIn')}</button></Link>
          <Link to="/register"><button style={{ background:C.forest, color:C.paper, border:'none', borderRadius:4, padding:'9px 20px', fontWeight:500, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>{t('nav.getStarted')}</button></Link>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ maxWidth:960, margin:'0 auto', padding:'80px 40px 64px', textAlign:'center' }}>
        <div style={{ fontSize:11, color:C.bronze, letterSpacing:'0.18em', fontWeight:500, textTransform:'uppercase', marginBottom:20 }}>
          {t('landing.eyebrow')}
        </div>
        <h1 style={{ fontFamily:'Fraunces, serif', fontSize:58, fontWeight:400, lineHeight:1.05, letterSpacing:'-0.025em', margin:'0 0 20px' }}>
          {t('landing.headline1')}<br />
          <em style={{ fontStyle:'italic', color:C.forest, fontWeight:500 }}>{t('landing.headlineBrand')}</em> {t('landing.headline2')}
        </h1>
        <p style={{ fontSize:16, lineHeight:1.65, color:C.muted, maxWidth:540, margin:'0 auto 36px' }}>
          {t('landing.subhead')}
        </p>
        <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
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
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:0 }}>
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
        <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, padding:'40px 48px', display:'flex', gap:48, alignItems:'center' }}>
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
        <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
          <span style={{ fontFamily:'Fraunces, serif', fontSize:16, fontWeight:600, color:C.forest }}>ArgiDrop</span>
          <span style={{ fontSize:10, color:C.subtle }}>{t('landing.footer.org')}</span>
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
