import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', border:'#E4DCC9' };

export default function Terms() {
  const { t } = useTranslation();
  const sections = t('legal.terms.sections', { returnObjects: true });

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
        <div style={{ fontSize:11, color:C.bronze, letterSpacing:'0.18em', fontWeight:500, textTransform:'uppercase', marginBottom:16 }}>{t('legal.eyebrow')}</div>
        <h1 style={{ fontFamily:'Fraunces, serif', fontSize:48, fontWeight:400, lineHeight:1.1, letterSpacing:'-0.02em', margin:'0 0 16px' }}>{t('legal.terms.title')}</h1>
        <div style={{ fontSize:13, color:C.muted, marginBottom:48 }}>{t('legal.lastUpdated')}</div>

        {sections.map((s, i) => (
          <section key={i} style={{ marginBottom:36 }}>
            <h2 style={{ fontFamily:'Fraunces, serif', fontSize:22, fontWeight:500, color:C.forest, margin:'0 0 12px' }}>{s.h}</h2>
            {s.p && s.p.map((para, j) => (
              <p key={j} style={{ fontSize:15, lineHeight:1.65, color:C.ink, margin:'0 0 12px' }}>{para}</p>
            ))}
            {s.list && (
              <ul style={{ paddingLeft:22, margin:'8px 0 0' }}>
                {s.list.map((item, j) => (
                  <li key={j} style={{ fontSize:15, lineHeight:1.65, color:C.ink, marginBottom:8 }}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <div style={{ marginTop:64, padding:20, background:C.paper, border:`1px solid ${C.border}`, borderRadius:6, fontSize:13, color:C.muted, lineHeight:1.6 }}>
          {t('legal.terms.footer')}
        </div>
      </article>
    </div>
  );
}
