import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const APP_STORE_URL = 'https://apps.apple.com/app/id6764177430';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.argilette.argidrop.driver';

const C = { cream:'#F7F3EB', forest:'#1B4332', ink:'#1A1A1A', muted:'#6B6560', border:'#E4DCC9', paper:'#FDFBF6' };

function detectPlatform() {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent || navigator.vendor || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'desktop';
}

export default function Download() {
  const { t } = useTranslation();
  const [platform, setPlatform] = useState('desktop');
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const p = detectPlatform();
    setPlatform(p);
    if (p === 'ios') {
      setRedirecting(true);
      window.location.replace(APP_STORE_URL);
    } else if (p === 'android') {
      setRedirecting(true);
      window.location.replace(PLAY_STORE_URL);
    }
  }, []);

  return (
    <div style={{ minHeight:'100vh', background:C.cream, display:'flex', alignItems:'center', justifyContent:'center', padding:24, fontFamily:'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth:520, width:'100%', background:C.paper, border:`1px solid ${C.border}`, borderRadius:12, padding:'40px 32px', textAlign:'center' }}>
        <img src="/argidrop-icon.png" alt="ArgiDrop" style={{ width:88, height:88, borderRadius:20, marginBottom:20, boxShadow:'0 12px 28px -8px rgba(15,42,31,0.35)' }} />
        <h1 style={{ fontFamily:'Fraunces, serif', fontSize:28, fontWeight:400, margin:'0 0 12px', color:C.ink }}>
          {t('download.title', 'Téléchargez ArgiDrop')}
        </h1>
        <p style={{ fontSize:14, color:C.muted, lineHeight:1.6, margin:'0 0 28px' }}>
          {redirecting
            ? t('download.redirecting', 'Redirection vers la boutique en cours…')
            : t('download.choose', 'Choisissez votre boutique :')}
        </p>
        <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
          <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer"
             style={{ display:'inline-flex', alignItems:'center', gap:10, background:'#000', color:'#fff', padding:'12px 22px', borderRadius:10, textDecoration:'none', fontFamily:'inherit' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.365 1.43c0 1.14-.413 2.197-1.235 3.171-.99 1.155-2.187 1.823-3.486 1.717a3.43 3.43 0 0 1-.025-.426c0-1.094.474-2.262 1.317-3.21C13.36.83 14.345.249 15.36 0c.005.477.005.953.005 1.43zM20.5 17.59c-.557 1.226-.823 1.774-1.54 2.86-1 1.514-2.41 3.4-4.157 3.413-1.554.014-1.953-.972-4.06-.96-2.106.012-2.546.978-4.1.964-1.747-.014-3.082-1.717-4.082-3.231C-.155 16.293-.49 11.234 1.79 8.55c1.57-1.85 4.05-2.93 6.378-2.97 1.652-.029 3.21.876 4.21.876 1 0 2.928-1.083 4.94-.924.844.034 3.21.341 4.74 2.566-.124.078-2.825 1.65-2.795 4.917.034 3.901 3.418 5.198 3.456 5.213-.029.094-.553 1.892-1.819 3.962z"/></svg>
            <span style={{ display:'flex', flexDirection:'column', lineHeight:1.05, alignItems:'flex-start' }}>
              <span style={{ fontSize:9, opacity:0.75, letterSpacing:'0.05em' }}>{t('download.iosTop', 'TÉLÉCHARGER SUR')}</span>
              <span style={{ fontSize:16, fontWeight:600 }}>App Store</span>
            </span>
          </a>
          <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer"
             style={{ display:'inline-flex', alignItems:'center', gap:10, background:'#000', color:'#fff', padding:'12px 22px', borderRadius:10, textDecoration:'none', fontFamily:'inherit' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="#34A853" d="M3 20.5V3.5c0-.59.34-1.11.84-1.35L13.69 12 3.84 21.85c-.5-.25-.84-.76-.84-1.35z"/><path fill="#FBBC04" d="M16.81 15.12L6.05 21.34l8.49-8.49 2.27 2.27z"/><path fill="#4285F4" d="M20.16 10.81c.5.39.5 1.16 0 1.55l-2.26 1.31-2.5-2.51 2.5-2.51 2.26 1.16z"/><path fill="#EA4335" d="M6.05 2.66l10.76 6.22-2.27 2.27L6.05 2.66z"/></svg>
            <span style={{ display:'flex', flexDirection:'column', lineHeight:1.05, alignItems:'flex-start' }}>
              <span style={{ fontSize:9, opacity:0.75, letterSpacing:'0.05em' }}>{t('download.androidTop', 'DISPONIBLE SUR')}</span>
              <span style={{ fontSize:16, fontWeight:600 }}>Google Play</span>
            </span>
          </a>
        </div>
        {platform === 'desktop' && (
          <p style={{ fontSize:12, color:C.muted, marginTop:24, lineHeight:1.5 }}>
            {t('download.desktopHint', 'Ouvrez ce lien sur votre téléphone pour être redirigé automatiquement vers la bonne boutique.')}
          </p>
        )}
      </div>
    </div>
  );
}
