import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import LanguageSwitcher from '../../components/LanguageSwitcher';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', borderSoft:'#EFE8D7' };

export default function BusinessLayout() {
  const { t } = useTranslation();
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(null);
  const [activeJobs, setActiveJobs] = useState(0);

  const NAV = profile?.isIndividual ? [
    { to:'/dashboard/home', label:t('business.nav.home'), icon:'▦' },
    { to:'/dashboard/food', label:t('business.nav.food'), icon:'🍽' },
    { to:'/dashboard/marketplace', label:t('business.nav.browseMerchants'), icon:'🛍' },
    { to:'/dashboard/home#ride', label:t('business.nav.rides'), icon:'🏍' },
    { divider: true, label: t('business.nav.account') },
    { to:'/dashboard/wallet', label:t('business.nav.wallet'), icon:'💳' },
    { to:'/dashboard/profile', label:t('business.nav.settings'), icon:'⚙' },
  ] : [
    { to:'/dashboard', label:t('business.nav.dashboard'), icon:'▦', end:true },
    { to:'/dashboard/post-job', label:t('business.nav.postDelivery'), icon:'＋' },
    { to:'/dashboard/jobs', label:t('business.nav.myDeliveries'), icon:'📦' },
    { to:'/dashboard/wallet', label:t('business.nav.wallet'), icon:'💳' },
    { to:'/dashboard/invoices', label:t('business.nav.invoices'), icon:'🧾' },
    { divider: true, label: t('business.nav.marketplace') },
    { to:'/dashboard/listings', label:t('business.nav.myListings'), icon:'🏪' },
    { to:'/dashboard/marketplace', label:t('business.nav.browseMerchants'), icon:'🌍' },
    { to:'/dashboard/food', label:t('business.nav.food'), icon:'🍽' },
    { divider: true, label: t('business.nav.account') },
    { to:'/dashboard/profile', label:t('business.nav.settings'), icon:'⚙' },
  ];

  useEffect(() => {
    api.get('/wallets/balance').then(r => setWallet(r.data.wallet)).catch(() => {});
    api.get('/jobs?status=ACTIVE&limit=1').then(r => setActiveJobs(r.data.total || 0)).catch(() => {});
    const interval = setInterval(() => {
      api.get('/wallets/balance').then(r => setWallet(r.data.wallet)).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:C.cream, fontFamily:'Inter, sans-serif' }}>
      {/* Sidebar */}
      <aside style={{ width:220, background:C.paper, borderRight:`1px solid ${C.border}`, display:'flex', flexDirection:'column', flexShrink:0, position:'sticky', top:0, height:'100vh' }}>
        {/* Logo */}
        <div style={{ padding:'20px 18px 14px', borderBottom:`1px solid ${C.borderSoft}`, display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
          <div>
            <div style={{ fontFamily:'Fraunces, serif', fontSize:18, fontWeight:600, color:C.forest, letterSpacing:'-0.02em' }}>
              Argi<em style={{ fontStyle:'italic', color:C.bronze }}>Drop</em>
            </div>
            <div style={{ fontSize:10, color:C.bronze, fontWeight:500, letterSpacing:'0.12em', textTransform:'uppercase', marginTop:2 }}>by ARGILETTE</div>
          </div>
          <LanguageSwitcher compact />
        </div>

        {/* Business info */}
        <div style={{ padding:'12px 18px', borderBottom:`1px solid ${C.borderSoft}` }}>
          <div style={{ fontSize:13, fontWeight:500, color:C.ink }}>{profile?.companyName || user?.firstName}</div>
          <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{t('business.sidebar.businessAccount')}</div>
          {wallet && (
            <div style={{ marginTop:8, background:C.cream, borderRadius:4, padding:'6px 10px', border:`1px solid ${C.borderSoft}` }}>
              <div style={{ fontSize:10, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em' }}>{t('business.sidebar.walletLabel')}</div>
              <div style={{ fontFamily:'Fraunces, serif', fontSize:15, fontWeight:500, color:C.forest }}>
                {(parseFloat(wallet.balance) - parseFloat(wallet.heldBalance || 0)).toLocaleString()} <span style={{ fontSize:11 }}>{wallet.currency || 'XOF'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex:1, overflowY:'auto', padding:'10px 0' }}>
          {NAV.map((item, i) => {
            if (item.divider) return (
              <div key={i} style={{ padding:'14px 18px 4px', fontSize:10, color:C.subtle, fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase' }}>
                {item.label}
              </div>
            );
            return (
              <NavLink key={item.to} to={item.to} end={item.end}
                style={({ isActive }) => ({
                  display:'flex', alignItems:'center', gap:10,
                  padding:'9px 18px', fontSize:13, fontWeight:isActive ? 500 : 400,
                  color: isActive ? C.forest : C.muted,
                  background: isActive ? C.cream : 'transparent',
                  borderLeft: isActive ? `3px solid ${C.forest}` : '3px solid transparent',
                  textDecoration:'none', transition:'all 0.15s',
                })}>
                <span style={{ fontSize:14, flexShrink:0 }}>{item.icon}</span>
                {item.label}
                {item.to === '/dashboard/jobs' && activeJobs > 0 && (
                  <span style={{ marginLeft:'auto', background:C.forest, color:C.paper, fontSize:10, fontWeight:600, padding:'1px 6px', borderRadius:100 }}>
                    {activeJobs}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Sign out */}
        <div style={{ padding:'12px 18px', borderTop:`1px solid ${C.borderSoft}` }}>
          <button onClick={() => { logout(); navigate('/'); }}
            style={{ width:'100%', background:'transparent', border:`1px solid ${C.border}`, color:C.muted, borderRadius:4, padding:'9px', fontSize:13, cursor:'pointer', fontFamily:'inherit', fontWeight:500 }}>
            {t('nav.signOut')}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex:1, overflowY:'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}
