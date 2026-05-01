import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', border:'#E4DCC9' };

export default function Support() {
  const { t } = useTranslation();
  const faq = t('support.faq', { returnObjects: true });

  return (
    <div style={{ minHeight:'100vh', background:C.cream, fontFamily:'Inter, system-ui, sans-serif', color:C.ink }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=Inter:wght@300;400;500;600&display=swap'); * { box-sizing:border-box; } body { margin:0; }`}</style>

      <nav style={{ position:'sticky', top:0, zIndex:100, background:C.paper, borderBottom:`1px solid ${C.border}`, padding:'16px 40px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <Link to="/" style={{ textDecoration:'none', display:'flex', alignItems:'baseline', gap:8 }}>
          <span style={{ fontFamily:'Fraunces, serif', fontSize:22, fontWeight:600, color:C.forest, letterSpacing:'-0.02em' }}>ArgiDrop</span>
          <span style={{ fontSize:10, color:C.bronze, fontWeight:500, letterSpacing:'0.14em', textTransform:'uppercase' }}>by ARGILETTE</span>
        </Link>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          <LanguageSwitcher compact />
          <Link to="/" style={{ color:C.muted, textDecoration:'none', fontSize:13, fontWeight:500 }}>{t('nav.backHome')}</Link>
        </div>
      </nav>

      <article style={{ maxWidth:760, margin:'0 auto', padding:'64px 40px 96px' }}>
        <div style={{ fontSize:11, color:C.bronze, letterSpacing:'0.18em', fontWeight:500, textTransform:'uppercase', marginBottom:16 }}>{t('support.eyebrow')}</div>
        <h1 style={{ fontFamily:'Fraunces, serif', fontSize:48, fontWeight:400, lineHeight:1.1, letterSpacing:'-0.02em', margin:'0 0 16px' }}>{t('support.title')}</h1>
        <p style={{ fontSize:16, lineHeight:1.65, color:C.muted, margin:'0 0 48px' }}>{t('support.intro')}</p>

        <section style={{ marginBottom:48, padding:28, background:C.paper, border:`1px solid ${C.border}`, borderRadius:8 }}>
          <h2 style={{ fontFamily:'Fraunces, serif', fontSize:22, fontWeight:500, color:C.forest, margin:'0 0 20px' }}>{t('support.contactTitle')}</h2>

          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:11, color:C.bronze, letterSpacing:'0.14em', fontWeight:500, textTransform:'uppercase', marginBottom:6 }}>{t('support.emailLabel')}</div>
            <a href={`mailto:${t('support.email')}`} style={{ fontSize:18, color:C.forest, fontWeight:600, textDecoration:'none', fontFamily:'Fraunces, serif' }}>{t('support.email')}</a>
            <div style={{ fontSize:13, color:C.muted, marginTop:6, lineHeight:1.6 }}>{t('support.emailHint')}</div>
          </div>

          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:11, color:C.bronze, letterSpacing:'0.14em', fontWeight:500, textTransform:'uppercase', marginBottom:6 }}>{t('support.hoursLabel')}</div>
            <div style={{ fontSize:14, color:C.ink, lineHeight:1.6 }}>{t('support.hours')}</div>
          </div>

          <div>
            <div style={{ fontSize:11, color:C.bronze, letterSpacing:'0.14em', fontWeight:500, textTransform:'uppercase', marginBottom:6 }}>{t('support.responseLabel')}</div>
            <div style={{ fontSize:14, color:C.ink, lineHeight:1.6 }}>{t('support.response')}</div>
          </div>
        </section>

        <h2 style={{ fontFamily:'Fraunces, serif', fontSize:28, fontWeight:500, color:C.forest, margin:'48px 0 24px' }}>{t('support.faqTitle')}</h2>
        {Array.isArray(faq) && faq.map((item, i) => (
          <details key={i} style={{ borderBottom:`1px solid ${C.border}`, padding:'20px 0' }}>
            <summary style={{ cursor:'pointer', fontFamily:'Fraunces, serif', fontSize:17, fontWeight:500, color:C.ink, listStyle:'none', display:'flex', alignItems:'center', justifyContent:'space-between', gap:16 }}>
              <span>{item.q}</span>
              <span style={{ color:C.bronze, fontSize:18, fontWeight:300, flexShrink:0 }}>+</span>
            </summary>
            <p style={{ fontSize:15, lineHeight:1.7, color:C.ink, margin:'12px 0 0', paddingRight:32 }}>{item.a}</p>
          </details>
        ))}

        <div style={{ marginTop:64, padding:20, background:C.paper, border:`1px solid ${C.border}`, borderRadius:6, fontSize:13, color:C.muted, lineHeight:1.6 }}>
          {t('support.legalLine')}
        </div>
      </article>
    </div>
  );
}
