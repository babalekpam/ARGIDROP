import React from 'react';
import { Link } from 'react-router-dom';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', border:'#E4DCC9' };

const SECTIONS = [
  {
    h: '1. Who we are',
    p: [
      'ArgiDrop ("ArgiDrop", "we", "us") is a B2B delivery marketplace operated by Argilette. We connect verified merchants with verified independent drivers across the ECOWAS region. This Privacy Policy explains what personal data we collect, why we collect it, how we use and share it, how long we keep it, and your rights.',
      'Data controller: Argilette. Contact: privacy@argidrop.com.',
    ],
  },
  {
    h: '2. What we collect',
    list: [
      'Account: name, email, phone number, password (stored hashed), role (BUSINESS or DRIVER).',
      'Business onboarding: company name, registration details, business address.',
      'Driver KYC: government-issued ID (front), business license where applicable, selfie with ID, optional proof of address. Required by ECOWAS regulators and for fraud prevention.',
      'Location: while a driver is on shift, the app reads device location (foreground and background) to match deliveries and share live progress with merchants and recipients. Location is not collected when a driver is off shift.',
      'Delivery activity: pickup and dropoff addresses, delivery code, item descriptions, status timestamps, proof-of-delivery photos, recipient signatures or PINs.',
      'Communications: in-app chat messages between merchants and drivers, support tickets.',
      'Payments and payouts: mobile-money phone number, payout PIN (stored hashed), per-delivery earnings, payout history. We do not store full bank or card credentials.',
      'Device and technical: device model, operating system, app version, push notification token, IP address, error logs.',
    ],
  },
  {
    h: '3. Why we use it',
    list: [
      'To verify identity and prevent fraud (KYC).',
      'To match deliveries with nearby qualified drivers.',
      'To show live delivery progress to merchants and recipients.',
      'To process payouts to drivers via mobile money.',
      'To enable in-app chat and customer support.',
      'To send transactional push notifications (job matched, picked up, delivered, chat messages).',
      'To comply with legal obligations including tax, AML and consumer-protection rules in jurisdictions we operate in.',
      'To detect and prevent abuse, account takeover, and platform misuse.',
    ],
  },
  {
    h: '4. Who we share it with',
    list: [
      'The other side of a delivery: a merchant sees the driver\'s name, photo, vehicle and live location during an active delivery. A driver sees the merchant\'s name, pickup and dropoff details. Recipients receiving a tracking link see the driver\'s first name and live location until delivery is complete.',
      'Service providers under contract: cloud hosting, push notification delivery (Apple APNs, Google FCM), map tile providers (MapTiler), SMS providers, mobile-money payout providers. They process data only on our instructions.',
      'Government authorities: when legally compelled, for example a valid court order, tax audit, or regulatory request.',
      'Successor entity: if Argilette merges, sells assets, or restructures, your data may transfer subject to this Policy.',
      'We do not sell personal data and we do not share it for third-party advertising.',
    ],
  },
  {
    h: '5. How long we keep it',
    list: [
      'KYC documents: retained for the life of the account and for up to 7 years after closure, as required by ECOWAS AML rules.',
      'Delivery records and proof of delivery: retained for 7 years for tax, dispute and audit purposes.',
      'Chat messages: retained for 2 years after the related delivery is closed.',
      'Location traces: aggregated into delivery records (pickup time, dropoff time). Raw location pings older than 90 days are deleted.',
      'Closed accounts: name and contact details are retained as needed to enforce contracts, resolve disputes, and meet legal obligations; otherwise deleted within 30 days of a verified deletion request.',
    ],
  },
  {
    h: '6. Your rights',
    p: [
      'Subject to local law you have the right to access, correct, export and delete your personal data, to object to certain processing, and to withdraw consent. To exercise any of these rights, email privacy@argidrop.com from the address on your account. We will respond within 30 days.',
      'You can also delete your account directly from the mobile app under Settings > Delete account, or by emailing support. Some data (KYC, delivery history, payout history) must be retained for the periods listed in section 5 even after deletion.',
    ],
  },
  {
    h: '7. Security',
    p: [
      'We protect your data with industry-standard controls: TLS in transit, encryption at rest for sensitive fields, hashed passwords and PINs (bcrypt), least-privilege access for staff, and regular dependency and infrastructure audits. No system is perfectly secure; if you believe your account has been compromised, contact security@argidrop.com immediately.',
    ],
  },
  {
    h: '8. International transfers',
    p: [
      'ArgiDrop operates primarily within the ECOWAS region. Some service providers may process data outside your country. Where we transfer data internationally, we use contractual safeguards and rely on local-law adequacy where available.',
    ],
  },
  {
    h: '9. Children',
    p: [
      'ArgiDrop is not intended for use by anyone under 18. We do not knowingly collect data from children. If you believe a minor has created an account, contact us and we will delete it.',
    ],
  },
  {
    h: '10. Push notifications and location permissions',
    p: [
      'You may revoke push notification or location permissions at any time from your device settings. Revoking location while on shift will prevent the app from matching new deliveries. Revoking push notifications will mean you no longer receive real-time updates about jobs, payments, or chat messages.',
    ],
  },
  {
    h: '11. Changes to this Policy',
    p: [
      'We may update this Policy from time to time. Material changes will be notified inside the app and by email at least 14 days before they take effect. The "Last updated" date below always reflects the current version.',
    ],
  },
  {
    h: '12. Contact us',
    p: [
      'For privacy questions or to exercise your rights, contact privacy@argidrop.com. For general support, contact support@argidrop.com.',
    ],
  },
];

export default function Privacy() {
  return (
    <div style={{ minHeight:'100vh', background:C.cream, fontFamily:'Inter, system-ui, sans-serif', color:C.ink }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=Inter:wght@300;400;500;600&display=swap'); * { box-sizing:border-box; } body { margin:0; }`}</style>

      <nav style={{ position:'sticky', top:0, zIndex:100, background:C.paper, borderBottom:`1px solid ${C.border}`, padding:'16px 40px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <Link to="/" style={{ textDecoration:'none', display:'flex', alignItems:'baseline', gap:8 }}>
          <span style={{ fontFamily:'Fraunces, serif', fontSize:22, fontWeight:600, color:C.forest, letterSpacing:'-0.02em' }}>ArgiDrop</span>
          <span style={{ fontSize:10, color:C.bronze, fontWeight:500, letterSpacing:'0.14em', textTransform:'uppercase' }}>by ARGILETTE</span>
        </Link>
        <Link to="/" style={{ color:C.muted, textDecoration:'none', fontSize:13, fontWeight:500 }}>← Back to home</Link>
      </nav>

      <article style={{ maxWidth:760, margin:'0 auto', padding:'64px 40px 96px' }}>
        <div style={{ fontSize:11, color:C.bronze, letterSpacing:'0.18em', fontWeight:500, textTransform:'uppercase', marginBottom:16 }}>Legal</div>
        <h1 style={{ fontFamily:'Fraunces, serif', fontSize:48, fontWeight:400, lineHeight:1.1, letterSpacing:'-0.02em', margin:'0 0 16px' }}>Privacy Policy</h1>
        <div style={{ fontSize:13, color:C.muted, marginBottom:48 }}>Last updated: 27 April 2026</div>

        {SECTIONS.map((s, i) => (
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
          This Policy was prepared in plain language for clarity. It is not a substitute for tailored legal advice. ArgiDrop reserves the right to update wording for legal accuracy without notice; the substantive scope of data collection and sharing will not change without the notice described in section 11.
        </div>
      </article>
    </div>
  );
}
