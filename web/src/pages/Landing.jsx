import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';

const C = {
  cream: '#F7F3EB', paper: '#FDFBF6', forest: '#1B4332', forestDeep: '#0F2A1F',
  forestMid: '#2D6A4F', bronze: '#8B6F47', ink: '#1A1A1A', muted: '#6B6560',
  subtle: '#9A9489', border: '#E4DCC9', borderSoft: '#EFE8D7',
  amber: '#F59E0B', emerald: '#10B981', sky: '#0EA5E9', violet: '#8B5CF6',
  rose: '#F43F5E',
};

const VERTICALS = [
  { icon: '📦', key: 'deliver', color: C.forest, bg: '#E8F5EE' },
  { icon: '🍽️', key: 'food', color: '#B45309', bg: '#FEF3C7' },
  { icon: '🛵', key: 'rides', color: '#1D4ED8', bg: '#EFF6FF' },
  { icon: '💳', key: 'pay', color: '#7C3AED', bg: '#EDE9FE' },
];

const DRIVER_LEVELS = [
  { level: 'Bronze', icon: '🥉', trips: '0–49', bonus: '+0%', color: '#92400E', bg: '#FEF3C7' },
  { level: 'Silver', icon: '🥈', trips: '50–199', bonus: '+3%', color: '#6B7280', bg: '#F3F4F6' },
  { level: 'Gold', icon: '🥇', trips: '200–499', bonus: '+6%', color: '#B45309', bg: '#FEF9C3' },
  { level: 'Platinum', icon: '💎', trips: '500+', bonus: '+10%', color: '#6D28D9', bg: '#EDE9FE' },
];

function NavBar({ t }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: scrolled ? 'rgba(253,251,246,0.97)' : C.paper,
      backdropFilter: 'blur(12px)',
      borderBottom: `1px solid ${scrolled ? C.border : 'transparent'}`,
      transition: 'all 0.2s ease',
      padding: '14px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        <img src="/argidrop-icon.png" alt="" style={{ width: 34, height: 34, borderRadius: 8, boxShadow: '0 2px 8px rgba(15,42,31,0.2)' }} />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
          <span style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 600, color: C.forest, letterSpacing: '-0.02em' }}>ArgiDrop</span>
          <span style={{ fontSize: 9, color: C.bronze, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', background: '#F7EFE0', padding: '2px 6px', borderRadius: 3 }}>SUPER APP</span>
        </div>
      </Link>
      <div style={{ display: 'flex', gap: 24, alignItems: 'center', fontSize: 13, color: C.muted }}>
        <a href="#services" style={{ color: C.muted, textDecoration: 'none', fontWeight: 500 }}>{t('landing.nav.services', 'Services')}</a>
        <a href="#drivers" style={{ color: C.muted, textDecoration: 'none', fontWeight: 500 }}>{t('landing.nav.drivers', 'Drivers')}</a>
        <a href="#business" style={{ color: C.muted, textDecoration: 'none', fontWeight: 500 }}>{t('landing.nav.business', 'Business')}</a>
        <LanguageSwitcher compact />
        <Link to="/login"><button style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 18px', fontWeight: 500, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>{t('nav.signIn')}</button></Link>
        <Link to="/register"><button style={{ background: C.forest, color: C.paper, border: 'none', borderRadius: 6, padding: '8px 20px', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(27,67,50,0.25)' }}>{t('nav.getStarted')}</button></Link>
      </div>
    </nav>
  );
}

function HeroSection({ t }) {
  return (
    <div style={{ background: `linear-gradient(160deg, ${C.forestDeep} 0%, ${C.forest} 60%, #2D6A4F 100%)`, color: '#fff', padding: '80px 40px 0', minHeight: 560, position: 'relative', overflow: 'hidden' }}>
      {/* Decorative circles */}
      <div style={{ position: 'absolute', top: -80, right: -80, width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -60, left: -60, width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20, padding: '6px 14px', marginBottom: 28 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ADE80', display: 'inline-block', boxShadow: '0 0 6px #4ADE80' }} />
          <span style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
            {t('landing.hero.badge', 'Togo · Bénin · Côte d\'Ivoire · Ghana · Sénégal · Nigeria')}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 60, alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 64, fontWeight: 400, lineHeight: 1.02, letterSpacing: '-0.03em', margin: '0 0 24px', color: '#fff' }}>
              {t('landing.hero.line1', 'L\'Afrique de l\'Ouest')}<br />
              <em style={{ fontStyle: 'italic', color: '#86EFAC', fontWeight: 500 }}>{t('landing.hero.line2', 'se déplace')}</em>{' '}
              {t('landing.hero.line3', 'avec ArgiDrop.')}
            </h1>
            <p style={{ fontSize: 18, lineHeight: 1.6, color: 'rgba(255,255,255,0.72)', maxWidth: 520, margin: '0 0 36px' }}>
              {t('landing.hero.sub', 'Livraisons, repas, courses, paiements — tout dans une seule application. La super-app de livraison conçue pour l\'Afrique francophone.')}
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 48 }}>
              <Link to="/register">
                <button style={{ background: '#fff', color: C.forest, padding: '14px 32px', borderRadius: 8, fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
                  {t('landing.hero.cta1', 'Envoyer un colis →')}
                </button>
              </Link>
              <a href="#services">
                <button style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', padding: '14px 32px', borderRadius: 8, fontWeight: 500, fontSize: 15, border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {t('landing.hero.cta2', 'Découvrir les services')}
                </button>
              </a>
            </div>

            {/* Mini-stats */}
            <div style={{ display: 'flex', gap: 40, paddingBottom: 48 }}>
              {[
                { v: '15 min', l: t('landing.hero.stat1', 'délai d\'assignation') },
                { v: '15%', l: t('landing.hero.stat2', 'commission seulement') },
                { v: '6', l: t('landing.hero.stat3', 'marchés au lancement') },
              ].map(({ v, l }) => (
                <div key={v}>
                  <div style={{ fontFamily: 'Fraunces, serif', fontSize: 32, fontWeight: 500, color: '#86EFAC', lineHeight: 1 }}>{v}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Phone stack mockup */}
          <div style={{ position: 'relative', height: 420, display: 'flex', justifyContent: 'center', alignItems: 'flex-end' }}>
            {/* Back phone */}
            <div style={{ position: 'absolute', right: 0, bottom: 0, width: 200, height: 360, background: 'rgba(255,255,255,0.08)', borderRadius: 28, border: '1px solid rgba(255,255,255,0.12)', transform: 'rotate(6deg) translateX(20px)' }}>
              <div style={{ padding: 20, color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                <div style={{ marginBottom: 12, fontWeight: 600 }}>🍽️ GoMeal</div>
                <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: 10, marginBottom: 8, fontSize: 11 }}>Pizza Forestière • 4,500 FCFA</div>
                <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: 10, fontSize: 11 }}>Poulet DG • 3,200 FCFA</div>
              </div>
            </div>
            {/* Front phone */}
            <div style={{ position: 'relative', zIndex: 2, width: 220, height: 400, background: `linear-gradient(180deg, #0F2A1F 0%, #1B4332 100%)`, borderRadius: 32, border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 32px 64px rgba(0,0,0,0.5)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '20px 16px 16px', background: 'rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <img src="/argidrop-icon.png" alt="" style={{ width: 28, height: 28, borderRadius: 7 }} />
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>9:41</span>
                </div>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, color: '#fff', marginBottom: 4 }}>Bonjour, Kofi 👋</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Où livrons-nous aujourd'hui ?</div>
              </div>
              <div style={{ padding: '12px 16px', flex: 1 }}>
                {[
                  { icon: '📦', label: 'Livraison', badge: '15 min', badgeColor: '#4ADE80' },
                  { icon: '🍽️', label: 'Repas', badge: '30 min', badgeColor: '#FCD34D' },
                  { icon: '🛵', label: 'Courses', badge: 'Maintenant', badgeColor: '#60A5FA' },
                  { icon: '💳', label: 'ArgiPay', badge: 'Wallet', badgeColor: '#C084FC' },
                ].map(({ icon, label, badge, badgeColor }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 18 }}>{icon}</span>
                      <span style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>{label}</span>
                    </div>
                    <span style={{ fontSize: 10, color: badgeColor, fontWeight: 600 }}>{badge}</span>
                  </div>
                ))}
              </div>
              <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ background: '#4ADE80', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.forestDeep }}>Poster une livraison →</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ServicesSection({ t }) {
  return (
    <div id="services" style={{ maxWidth: 1180, margin: '0 auto', padding: '80px 40px' }}>
      <div style={{ textAlign: 'center', marginBottom: 56 }}>
        <div style={{ fontSize: 11, color: C.bronze, letterSpacing: '0.18em', fontWeight: 600, textTransform: 'uppercase', marginBottom: 12 }}>
          {t('landing.services.eyebrow', 'Quatre services · Une application')}
        </div>
        <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 40, fontWeight: 400, letterSpacing: '-0.02em', margin: '0 0 16px', color: C.ink }}>
          {t('landing.services.title1', 'Tout livrer, tout gérer')}<br />
          <em style={{ color: C.forest, fontStyle: 'italic' }}>{t('landing.services.title2', 'avec ArgiDrop.')}</em>
        </h2>
        <p style={{ fontSize: 16, color: C.muted, maxWidth: 560, margin: '0 auto' }}>
          {t('landing.services.sub', 'Inspiré des super-apps qui dominent l\'Afrique — mais conçu entièrement pour les besoins de l\'Afrique francophone.')}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
        {[
          {
            icon: '📦', key: 'deliver',
            title: t('landing.services.deliver.title', 'ArgiDrop Livraison'),
            sub: t('landing.services.deliver.sub', 'B2B & particuliers'),
            desc: t('landing.services.deliver.desc', 'Postez un colis, un livreur vérifié accepte en 15 min. Suivi GPS en direct, triple scan QR anti-fraude, paiement libéré à la livraison. Livreurs à moto, voiture, camionnette.'),
            features: [
              t('landing.services.deliver.f1', 'Scans QR de bout en bout'),
              t('landing.services.deliver.f2', 'Suivi temps réel'),
              t('landing.services.deliver.f3', 'Paiement sécurisé par séquestre'),
              t('landing.services.deliver.f4', 'Cash à la livraison disponible'),
            ],
            cta: t('landing.services.deliver.cta', 'Envoyer un colis →'),
            ctaHref: '/register',
            color: C.forest, bg: '#E8F5EE',
          },
          {
            icon: '🍽️', key: 'food',
            title: t('landing.services.food.title', 'ArgiDrop Food'),
            sub: t('landing.services.food.sub', 'Restaurants partenaires'),
            desc: t('landing.services.food.desc', 'Commandez depuis les meilleurs restaurants de votre quartier. Livreurs dédiés, temps de livraison affiché, suivi de préparation. Restaurants vérifiés, notes et avis réels.'),
            features: [
              t('landing.services.food.f1', 'Restaurants vérifiés'),
              t('landing.services.food.f2', 'Livraison en 30–45 min'),
              t('landing.services.food.f3', 'Paiement MoMo / carte / cash'),
              t('landing.services.food.f4', 'Suivi de préparation en direct'),
            ],
            cta: t('landing.services.food.cta', 'Bientôt disponible'),
            ctaHref: '#',
            badge: t('landing.services.food.badge', 'Q3 2026'),
            color: '#B45309', bg: '#FEF3C7',
          },
          {
            icon: '🛵', key: 'rides',
            title: t('landing.services.rides.title', 'ArgiDrop Rides'),
            sub: t('landing.services.rides.sub', 'Moto · Taxi · Express'),
            desc: t('landing.services.rides.desc', 'Zémidjan, kekeno, taxi — réservez votre course en quelques secondes. Prix fixe affiché avant la course, conducteurs vérifiés KYC, trajet partagé avec vos proches.'),
            features: [
              t('landing.services.rides.f1', 'Prix fixe avant la course'),
              t('landing.services.rides.f2', 'Conducteurs vérifiés'),
              t('landing.services.rides.f3', 'Bouton SOS intégré'),
              t('landing.services.rides.f4', 'Partage de trajet'),
            ],
            cta: t('landing.services.rides.cta', 'Bientôt disponible'),
            ctaHref: '#',
            badge: t('landing.services.rides.badge', 'Q4 2026'),
            color: '#1D4ED8', bg: '#EFF6FF',
          },
          {
            icon: '💳', key: 'pay',
            title: t('landing.services.pay.title', 'ArgiDrop Pay'),
            sub: t('landing.services.pay.sub', 'Portefeuille · Transferts · Factures'),
            desc: t('landing.services.pay.desc', 'Rechargez votre portefeuille, payez vos factures, envoyez de l\'argent en quelques secondes. Compatible MTN MoMo, Orange Money, Wave, T-Money, Flooz, carte Visa/Mastercard.'),
            features: [
              t('landing.services.pay.f1', 'Wallet rechargeable'),
              t('landing.services.pay.f2', 'Transferts instantanés'),
              t('landing.services.pay.f3', 'Paiement factures & abonnements'),
              t('landing.services.pay.f4', 'Historique et reçus'),
            ],
            cta: t('landing.services.pay.cta', 'Créer un wallet →'),
            ctaHref: '/register',
            color: '#7C3AED', bg: '#EDE9FE',
          },
        ].map((svc) => (
          <div key={svc.key} style={{ background: svc.bg, border: `1px solid ${svc.color}22`, borderRadius: 16, padding: '32px 32px 28px', position: 'relative', overflow: 'hidden' }}>
            {svc.badge && (
              <div style={{ position: 'absolute', top: 20, right: 20, background: svc.color, color: '#fff', fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 20, letterSpacing: '0.05em' }}>
                {svc.badge}
              </div>
            )}
            <div style={{ fontSize: 36, marginBottom: 12 }}>{svc.icon}</div>
            <div style={{ fontSize: 10, color: svc.color, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>{svc.sub}</div>
            <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 500, margin: '0 0 12px', color: C.ink }}>{svc.title}</h3>
            <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.65, margin: '0 0 20px' }}>{svc.desc}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24 }}>
              {svc.features.map((f) => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.ink }}>
                  <span style={{ color: svc.color, fontWeight: 700 }}>✓</span> {f}
                </div>
              ))}
            </div>
            {svc.ctaHref !== '#' ? (
              <Link to={svc.ctaHref}>
                <button style={{ background: svc.color, color: '#fff', border: 'none', borderRadius: 8, padding: '11px 22px', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {svc.cta}
                </button>
              </Link>
            ) : (
              <button style={{ background: 'transparent', color: svc.color, border: `1px solid ${svc.color}55`, borderRadius: 8, padding: '11px 22px', fontWeight: 600, fontSize: 13, cursor: 'default', fontFamily: 'inherit' }}>
                {svc.cta}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function HowItWorksSection({ t }) {
  const steps = [
    { roman: 'I', icon: '📝', title: t('landing.process.step1.title', 'Postez & payez'), desc: t('landing.process.step1.desc', 'Renseignez l\'adresse de ramassage, l\'adresse de livraison et les détails du colis. Payez via mobile money ou votre wallet ArgiDrop. Le job s\'active dès la confirmation.') },
    { roman: 'II', icon: '🔍', title: t('landing.process.step2.title', 'Livreur assigné & vérifié'), desc: t('landing.process.step2.desc', 'Un livreur KYC-vérifié nearby accepte la course. Il scanne votre QR de ramassage à l\'arrivée — GPS-vérifié. Pas de scan, pas de colis.') },
    { roman: 'III', icon: '✅', title: t('landing.process.step3.title', 'Livré & paiement libéré'), desc: t('landing.process.step3.desc', 'Le destinataire montre son QR. Le livreur scanne à la livraison. Preuve photo et GPS. Le paiement est libéré instantanément.') },
  ];
  return (
    <div style={{ background: C.paper, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1060, margin: '0 auto', padding: '72px 40px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 11, color: C.bronze, letterSpacing: '0.18em', fontWeight: 600, textTransform: 'uppercase', marginBottom: 12 }}>
            {t('landing.process.eyebrow', 'Comment ça marche')}
          </div>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 36, fontWeight: 400, letterSpacing: '-0.02em', margin: 0 }}>
            {t('landing.process.title1', 'Triple scan QR')}{' '}
            <em style={{ color: C.forest, fontStyle: 'italic' }}>{t('landing.process.title2', 'anti-fraude.')}</em>
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0 }}>
          {steps.map((s, i) => (
            <div key={s.roman} style={{ padding: '0 32px', borderRight: i < 2 ? `1px solid ${C.borderSoft}` : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, background: C.forest, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 600 }}>{s.roman}</div>
                <span style={{ fontSize: 24 }}>{s.icon}</span>
              </div>
              <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 19, fontWeight: 500, margin: '0 0 10px', color: C.ink }}>{s.title}</h3>
              <p style={{ color: C.muted, lineHeight: 1.65, fontSize: 14, margin: 0 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DriverSection({ t }) {
  return (
    <div id="drivers" style={{ maxWidth: 1180, margin: '0 auto', padding: '80px 40px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 11, color: C.bronze, letterSpacing: '0.18em', fontWeight: 600, textTransform: 'uppercase', marginBottom: 12 }}>
            {t('landing.driver.eyebrow', 'Livreurs & conducteurs')}
          </div>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 40, fontWeight: 400, letterSpacing: '-0.02em', margin: '0 0 16px', color: C.ink }}>
            {t('landing.driver.title1', 'Gagnez plus,')}{' '}
            <em style={{ color: C.forest, fontStyle: 'italic' }}>{t('landing.driver.title2', 'montez de niveau.')}</em>
          </h2>
          <p style={{ fontSize: 16, color: C.muted, lineHeight: 1.65, margin: '0 0 28px' }}>
            {t('landing.driver.sub', 'Paiement instantané sur votre compte mobile money à chaque livraison. Travaillez quand vous voulez. Plus vous livrez, plus votre bonus augmente.')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
            {[
              { icon: '⚡', t: t('landing.driver.perk1', 'Paiement instantané sur MoMo après chaque livraison') },
              { icon: '🛡️', t: t('landing.driver.perk2', 'Assurance accident incluse pour les Gold & Platinum') },
              { icon: '📊', t: t('landing.driver.perk3', 'Dashboard revenus, historique des courses, performances') },
              { icon: '🤝', t: t('landing.driver.perk4', 'Support dédié livreur 7j/7, résolution de litiges en 24h') },
            ].map(({ icon, t: label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: 14, color: C.ink }}>
                <span style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }}>{icon}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Link to="/register">
              <button style={{ background: C.forest, color: '#fff', border: 'none', borderRadius: 8, padding: '13px 28px', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(27,67,50,0.25)' }}>
                {t('landing.driver.cta1', 'Devenir livreur ArgiDrop →')}
              </button>
            </Link>
          </div>
        </div>

        {/* Driver Levels */}
        <div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 500, color: C.ink, marginBottom: 20 }}>
            {t('landing.driver.levelsTitle', 'Programme de niveaux')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {DRIVER_LEVELS.map((lvl) => (
              <div key={lvl.level} style={{ background: lvl.bg, border: `1px solid ${lvl.color}25`, borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontSize: 24 }}>{lvl.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: lvl.color }}>{lvl.level}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{lvl.trips} {t('landing.driver.trips', 'livraisons')}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: 18, color: lvl.color }}>{lvl.bonus}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{t('landing.driver.bonus', 'bonus/course')}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, fontSize: 12, color: C.muted, lineHeight: 1.5, padding: '12px 16px', background: C.cream, borderRadius: 8, border: `1px solid ${C.border}` }}>
            {t('landing.driver.levelNote', '💡 Les niveaux Gold et Platinum bénéficient également d\'une assurance accident, d\'une priorité de matching et d\'un support dédié.')}
          </div>
        </div>
      </div>
    </div>
  );
}

function BusinessSection({ t }) {
  return (
    <div id="business" style={{ background: `linear-gradient(135deg, ${C.forestDeep} 0%, ${C.forest} 100%)`, padding: '80px 40px', color: '#fff' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontSize: 11, color: '#86EFAC', letterSpacing: '0.18em', fontWeight: 600, textTransform: 'uppercase', marginBottom: 12 }}>
            {t('landing.business.eyebrow', 'Entreprises & Partenaires')}
          </div>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 40, fontWeight: 400, letterSpacing: '-0.02em', margin: '0 0 16px', color: '#fff' }}>
            {t('landing.business.title', 'La logistique qui fait')}{' '}
            <em style={{ color: '#86EFAC', fontStyle: 'italic' }}>{t('landing.business.titleEm', 'grandir votre business.')}</em>
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.65)', maxWidth: 520, margin: '0 auto' }}>
            {t('landing.business.sub', 'Des petits commerces aux grandes entreprises — ArgiDrop s\'adapte à votre volume avec des comptes corporate, des tarifs préférentiels et une facturation mensuelle.')}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 48 }}>
          {[
            {
              icon: '🏪', title: t('landing.business.plan1.title', 'Particuliers & PME'),
              desc: t('landing.business.plan1.desc', 'Postez à la course. Payez via wallet ou mobile money. Commission de 15% — la plus basse du marché.'),
              features: [t('landing.business.plan1.f1', 'Pas d\'abonnement requis'), t('landing.business.plan1.f2', 'Commission 15%'), t('landing.business.plan1.f3', 'Facturation par livraison')],
              badge: null, badgeColor: null,
            },
            {
              icon: '🏢', title: t('landing.business.plan2.title', 'Standard Business'),
              desc: t('landing.business.plan2.desc', 'Pour les e-commerçants et boutiques. Volume de livraisons, cash à la livraison, intégration API.'),
              features: [t('landing.business.plan2.f1', 'Commission 13%'), t('landing.business.plan2.f2', 'Cash-on-delivery inclus'), t('landing.business.plan2.f3', 'Accès API')],
              badge: t('landing.business.plan2.badge', 'Populaire'), badgeColor: '#FCD34D',
            },
            {
              icon: '🏦', title: t('landing.business.plan3.title', 'Compte Corporate'),
              desc: t('landing.business.plan3.desc', 'Pour les entreprises à haut volume. Facturation mensuelle consolidée, account manager dédié, SLA garanti.'),
              features: [t('landing.business.plan3.f1', 'Commission 10%'), t('landing.business.plan3.f2', 'Facturation mensuelle'), t('landing.business.plan3.f3', 'Account manager dédié')],
              badge: t('landing.business.plan3.badge', 'Sur devis'), badgeColor: '#86EFAC',
            },
          ].map((plan) => (
            <div key={plan.title} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: '28px 24px', position: 'relative' }}>
              {plan.badge && (
                <div style={{ position: 'absolute', top: 20, right: 20, background: plan.badgeColor, color: C.forestDeep, fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                  {plan.badge}
                </div>
              )}
              <div style={{ fontSize: 28, marginBottom: 12 }}>{plan.icon}</div>
              <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 500, color: '#fff', margin: '0 0 10px' }}>{plan.title}</h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: '0 0 16px' }}>{plan.desc}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {plan.features.map((f) => (
                  <div key={f} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.85)', alignItems: 'center' }}>
                    <span style={{ color: '#86EFAC' }}>✓</span> {f}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
          <Link to="/register">
            <button style={{ background: '#fff', color: C.forest, border: 'none', borderRadius: 8, padding: '14px 32px', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
              {t('landing.business.cta1', 'Ouvrir un compte entreprise →')}
            </button>
          </Link>
          <Link to="/support">
            <button style={{ background: 'transparent', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, padding: '14px 32px', fontWeight: 500, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
              {t('landing.business.cta2', 'Contacter l\'équipe commerciale')}
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function TrustSection({ t }) {
  return (
    <div style={{ maxWidth: 1060, margin: '0 auto', padding: '72px 40px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, background: C.paper, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
        {[
          { v: '15 min', l: t('landing.trust.stat1', 'délai moyen d\'assignation'), icon: '⚡' },
          { v: '3 scans', l: t('landing.trust.stat2', 'vérifications QR par livraison'), icon: '🔐' },
          { v: '15%', l: t('landing.trust.stat3', 'commission — la plus basse'), icon: '💰' },
          { v: '6 🌍', l: t('landing.trust.stat4', 'pays CEDEAO au lancement'), icon: '🗺️' },
        ].map(({ v, l, icon }, i) => (
          <div key={v} style={{ padding: '32px 24px', textAlign: 'center', borderRight: i < 3 ? `1px solid ${C.borderSoft}` : 'none' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 32, fontWeight: 500, color: C.forest, letterSpacing: '-0.02em', lineHeight: 1 }}>{v}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MarketsSection({ t }) {
  const markets = [
    { flag: '🇹🇬', name: 'Togo', city: 'Lomé', status: t('landing.markets.live', 'En direct'), statusColor: '#4ADE80' },
    { flag: '🇧🇯', name: 'Bénin', city: 'Cotonou', status: t('landing.markets.q3', 'Q3 2026'), statusColor: '#FCD34D' },
    { flag: '🇨🇮', name: "Côte d'Ivoire", city: 'Abidjan', status: t('landing.markets.q3', 'Q3 2026'), statusColor: '#FCD34D' },
    { flag: '🇬🇭', name: 'Ghana', city: 'Accra', status: t('landing.markets.q4', 'Q4 2026'), statusColor: '#60A5FA' },
    { flag: '🇸🇳', name: 'Sénégal', city: 'Dakar', status: t('landing.markets.q4', 'Q4 2026'), statusColor: '#60A5FA' },
    { flag: '🇳🇬', name: 'Nigeria', city: 'Lagos', status: t('landing.markets.2027', '2027'), statusColor: '#C084FC' },
  ];
  return (
    <div style={{ background: C.cream, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: '72px 40px' }}>
      <div style={{ maxWidth: 1060, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: C.bronze, letterSpacing: '0.18em', fontWeight: 600, textTransform: 'uppercase', marginBottom: 12 }}>
              {t('landing.markets.eyebrow', 'Expansion CEDEAO')}
            </div>
            <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 36, fontWeight: 400, letterSpacing: '-0.02em', margin: '0 0 16px' }}>
              {t('landing.markets.title', 'Togo d\'abord.')}{' '}
              <em style={{ color: C.forest, fontStyle: 'italic' }}>{t('landing.markets.titleEm', 'L\'Afrique ensuite.')}</em>
            </h2>
            <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.65, margin: '0 0 24px' }}>
              {t('landing.markets.desc', 'Lancé à Lomé avec les intégrations mobile money locales (T-Money, Flooz, Orange Money), ArgiDrop déploie sa stratégie d\'expansion marché par marché à travers la zone CEDEAO.')}
            </p>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 64, fontWeight: 500, color: C.forest, lineHeight: 1 }}>350M+</div>
            <div style={{ fontSize: 14, color: C.muted, marginTop: 6 }}>{t('landing.markets.bigLabel', 'habitants en zone CEDEAO')}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {markets.map((m) => (
              <div key={m.name} style={{ background: C.paper, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 28 }}>{m.flag}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: C.ink }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{m.city}</div>
                  <div style={{ fontSize: 11, color: m.statusColor, fontWeight: 700, marginTop: 3 }}>● {m.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DownloadSection({ t }) {
  return (
    <div style={{ maxWidth: 1060, margin: '0 auto', padding: '72px 40px' }}>
      <div style={{ background: C.paper, border: `1px solid ${C.border}`, borderRadius: 16, padding: '48px', display: 'flex', gap: 48, alignItems: 'center' }}>
        <img src="/argidrop-icon.png" alt="ArgiDrop" style={{ width: 100, height: 100, borderRadius: 22, boxShadow: '0 12px 32px rgba(15,42,31,0.3)', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: C.bronze, letterSpacing: '0.16em', fontWeight: 600, textTransform: 'uppercase', marginBottom: 10 }}>
            {t('landing.app.eyebrow', 'Application mobile')}
          </div>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 400, margin: '0 0 12px', letterSpacing: '-0.015em' }}>
            {t('landing.app.title', 'Toute la super-app dans votre poche.')}
          </h3>
          <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.65, margin: '0 0 24px', maxWidth: 480 }}>
            {t('landing.app.desc', 'Postez une livraison, commandez un repas, suivez votre livreur, gérez votre wallet — disponible sur iOS et Android. Même sans connexion stable.')}
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href="https://apps.apple.com/app/id6764177430" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#000', color: '#fff', padding: '11px 20px', borderRadius: 10, textDecoration: 'none', fontFamily: 'inherit' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M16.365 1.43c0 1.14-.413 2.197-1.235 3.171-.99 1.155-2.187 1.823-3.486 1.717a3.43 3.43 0 0 1-.025-.426c0-1.094.474-2.262 1.317-3.21C13.36.83 14.345.249 15.36 0c.005.477.005.953.005 1.43zM20.5 17.59c-.557 1.226-.823 1.774-1.54 2.86-1 1.514-2.41 3.4-4.157 3.413-1.554.014-1.953-.972-4.06-.96-2.106.012-2.546.978-4.1.964-1.747-.014-3.082-1.717-4.082-3.231C-.155 16.293-.49 11.234 1.79 8.55c1.57-1.85 4.05-2.93 6.378-2.97 1.652-.029 3.21.876 4.21.876 1 0 2.928-1.083 4.94-.924.844.034 3.21.341 4.74 2.566-.124.078-2.825 1.65-2.795 4.917.034 3.901 3.418 5.198 3.456 5.213-.029.094-.553 1.892-1.819 3.962z" /></svg>
              <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                <span style={{ fontSize: 9, opacity: 0.75 }}>{t('landing.app.iosTop', 'TÉLÉCHARGER SUR')}</span>
                <span style={{ fontSize: 15, fontWeight: 700 }}>App Store</span>
              </span>
            </a>
            <a href="https://play.google.com/store/apps/details?id=com.argilette.argidrop.driver" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#000', color: '#fff', padding: '11px 20px', borderRadius: 10, textDecoration: 'none', fontFamily: 'inherit' }}>
              <svg width="22" height="22" viewBox="0 0 24 24"><path fill="#34A853" d="M3 20.5V3.5c0-.59.34-1.11.84-1.35L13.69 12 3.84 21.85c-.5-.25-.84-.76-.84-1.35z" /><path fill="#FBBC04" d="M16.81 15.12L6.05 21.34l8.49-8.49 2.27 2.27z" /><path fill="#4285F4" d="M20.16 10.81c.5.39.5 1.16 0 1.55l-2.26 1.31-2.5-2.51 2.5-2.51 2.26 1.16z" /><path fill="#EA4335" d="M6.05 2.66l10.76 6.22-2.27 2.27L6.05 2.66z" /></svg>
              <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                <span style={{ fontSize: 9, opacity: 0.75 }}>{t('landing.app.androidTop', 'DISPONIBLE SUR')}</span>
                <span style={{ fontSize: 15, fontWeight: 700 }}>Google Play</span>
              </span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function Footer({ t }) {
  return (
    <footer style={{ borderTop: `1px solid ${C.border}`, background: C.paper }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '48px 40px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40, marginBottom: 40 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <img src="/argidrop-icon.png" alt="" style={{ width: 32, height: 32, borderRadius: 7 }} />
              <span style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, color: C.forest }}>ArgiDrop</span>
            </div>
            <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.65, maxWidth: 280, margin: '0 0 16px' }}>
              {t('landing.footer.tagline', 'La super-app de livraison d\'Afrique de l\'Ouest. Livraison, food, rides et paiements en une seule application.')}
            </p>
            <div style={{ fontSize: 12, color: C.subtle }}>{t('landing.footer.org', 'par ARGILETTE LLC · St. Louis, MO')}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: C.bronze, letterSpacing: '0.1em', fontWeight: 700, textTransform: 'uppercase', marginBottom: 16 }}>{t('landing.footer.col1', 'Services')}</div>
            {[
              [t('landing.footer.deliver', 'Livraison'), '#services'],
              [t('landing.footer.food', 'Food'), '#services'],
              [t('landing.footer.rides', 'Rides'), '#services'],
              [t('landing.footer.pay', 'ArgiPay'), '#services'],
            ].map(([label, href]) => (
              <div key={label} style={{ marginBottom: 10 }}>
                <a href={href} style={{ fontSize: 13, color: C.muted, textDecoration: 'none' }}>{label}</a>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 11, color: C.bronze, letterSpacing: '0.1em', fontWeight: 700, textTransform: 'uppercase', marginBottom: 16 }}>{t('landing.footer.col2', 'Entreprise')}</div>
            {[
              [t('landing.footer.partner', 'Devenir partenaire'), '#business'],
              [t('landing.footer.driver', 'Devenir livreur'), '#drivers'],
              [t('landing.footer.corporate', 'Compte corporate'), '#business'],
              [t('landing.footer.support', 'Support'), '/support'],
            ].map(([label, href]) => (
              <div key={label} style={{ marginBottom: 10 }}>
                <a href={href} style={{ fontSize: 13, color: C.muted, textDecoration: 'none' }}>{label}</a>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 11, color: C.bronze, letterSpacing: '0.1em', fontWeight: 700, textTransform: 'uppercase', marginBottom: 16 }}>{t('landing.footer.col3', 'Légal')}</div>
            {[
              [t('landing.footer.privacy', 'Confidentialité'), '/privacy'],
              [t('landing.footer.terms', 'Conditions'), '/terms'],
              [t('landing.footer.accountDeletion', 'Supprimer mon compte'), '/account-deletion'],
            ].map(([label, href]) => (
              <div key={label} style={{ marginBottom: 10 }}>
                <Link to={href} style={{ fontSize: 13, color: C.muted, textDecoration: 'none' }}>{label}</Link>
              </div>
            ))}
          </div>
        </div>
        <div style={{ borderTop: `1px solid ${C.borderSoft}`, paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: 12, color: C.subtle }}>{t('landing.footer.copyright', '© 2026 ARGILETTE LLC. Tous droits réservés.')}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['🇹🇬', '🇧🇯', '🇨🇮', '🇬🇭', '🇸🇳', '🇳🇬'].map((f) => (
              <span key={f} style={{ fontSize: 18 }}>{f}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function Landing() {
  const { t } = useTranslation();
  return (
    <div style={{ minHeight: '100vh', background: C.cream, fontFamily: 'Inter, system-ui, sans-serif', color: C.ink }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400;1,9..144,500&family=Inter:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        @media (max-width: 900px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .services-grid { grid-template-columns: 1fr !important; }
          .steps-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .steps-grid > div { border-right: none !important; padding: 0 !important; border-bottom: 1px solid #EFE8D7; padding-bottom: 24px !important; }
          .driver-grid { grid-template-columns: 1fr !important; }
          .business-grid { grid-template-columns: 1fr !important; }
          .trust-grid { grid-template-columns: repeat(2,1fr) !important; }
          .markets-grid { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
          nav { padding: 14px 20px !important; }
          nav .nav-links { display: none !important; }
        }
      `}</style>
      <NavBar t={t} />
      <HeroSection t={t} />
      <ServicesSection t={t} />
      <HowItWorksSection t={t} />
      <DriverSection t={t} />
      <BusinessSection t={t} />
      <TrustSection t={t} />
      <MarketsSection t={t} />
      <DownloadSection t={t} />
      <Footer t={t} />
    </div>
  );
}
