import React from 'react';
import { Link } from 'react-router-dom';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', border:'#E4DCC9' };

const SECTIONS = [
  {
    h: '1. The agreement',
    p: [
      'These Terms of Service ("Terms") govern your use of the ArgiDrop platform, mobile apps, and website (collectively, the "Service"), provided by Argilette ("ArgiDrop", "we"). By creating an account or using the Service you accept these Terms. If you do not accept them, do not use the Service.',
    ],
  },
  {
    h: '2. What ArgiDrop is, and what it isn\'t',
    p: [
      'ArgiDrop is a marketplace that connects verified independent merchants with verified independent drivers in the ECOWAS region. We are not a delivery company. We do not employ drivers. We do not own the goods being delivered. We are not a party to the contract of carriage between a merchant and a driver. We facilitate matching, payment escrow, communication, and dispute resolution.',
      'Drivers are independent contractors and not employees, agents, partners, or franchisees of ArgiDrop.',
    ],
  },
  {
    h: '3. Eligibility and accounts',
    list: [
      'You must be at least 18 years old, have full legal capacity, and reside in a country we operate in.',
      'You must complete identity verification (KYC) before posting deliveries (merchants) or accepting jobs (drivers).',
      'You must give true, current, and complete information and keep it updated.',
      'You are responsible for all activity under your account. Keep your password and payout PIN secret. Notify us immediately of any unauthorized use.',
      'We may suspend or close any account that breaches these Terms, fails KYC, or shows signs of fraud, abuse, or risk to others.',
    ],
  },
  {
    h: '4. Merchant obligations',
    list: [
      'You may only post deliveries for goods you have the legal right to ship.',
      'Prohibited items include: weapons and ammunition, illegal drugs, live animals other than as expressly permitted, hazardous materials beyond what local courier rules allow, perishable goods without adequate packaging, currency in excess of legal limits, human remains, counterfeit goods, and any items prohibited by destination-country law.',
      'You must give accurate pickup and dropoff addresses, contact details, and item descriptions including weight and any handling instructions.',
      'You agree to fund the delivery up front. Funds are held until delivery is confirmed by the recipient or by ArgiDrop dispute resolution, then released to the driver less the platform fee.',
      'You agree to a platform fee of up to 18% of each delivery fee, deducted at payout. The exact split is shown at the time of posting.',
    ],
  },
  {
    h: '5. Driver obligations',
    list: [
      'You may only accept jobs you can lawfully and safely complete with your registered vehicle.',
      'You must comply with all traffic, vehicle, insurance, tax, and licensing rules in your jurisdiction. ArgiDrop does not provide vehicle insurance.',
      'You must follow instructions from the merchant in the job posting and the recipient at dropoff, within reason. You may refuse or abort a delivery for safety reasons; report any abort in the app.',
      'You must scan the merchant\'s pickup QR before picking up and the recipient\'s confirmation QR or PIN at dropoff. Falsifying confirmations is a serious breach and grounds for permanent removal and legal action.',
      'You agree that ArgiDrop will hold a per-delivery balance in your in-app wallet and pay it out at end-of-shift via mobile money, or via the nightly automatic sweep at 23:59 local time, subject to PIN authorization and KYC status.',
    ],
  },
  {
    h: '6. Payments, fees and refunds',
    p: [
      'All payments flow through the platform. Cash transactions outside the app are prohibited and are grounds for suspension.',
      'Refunds: if a delivery is cancelled before pickup, the merchant is fully refunded less any third-party processing fee. If a delivery is aborted in transit due to driver fault, the merchant is refunded the full fee. If a delivery is aborted due to merchant fault (wrong address, recipient unavailable for more than 30 minutes after the driver\'s arrival, refusal of legal goods), the driver is paid an aborted-delivery fee at our discretion.',
      'Disputes: either party may open a dispute within 7 days of delivery. ArgiDrop will review evidence (chat, GPS trace, photos, QR scan record) and decide within 14 days. Decisions are final but do not preclude either party from pursuing legal remedies.',
    ],
  },
  {
    h: '7. Acceptable use',
    list: [
      'No harassment, hate speech, or threats in chat or support.',
      'No collecting other users\' personal data outside the Service.',
      'No reverse-engineering, scraping, or interfering with the Service.',
      'No use of bots, fake GPS, fake KYC documents, or any spoofing.',
      'No circumventing the platform to transact off-app.',
    ],
  },
  {
    h: '8. Intellectual property',
    p: [
      'The Service, including all software, designs, and trademarks, is owned by Argilette and protected by intellectual property law. You receive a limited, non-exclusive, non-transferable license to use the Service for its intended purpose. All content you submit (chat, photos, descriptions) remains yours; you grant ArgiDrop a worldwide, royalty-free license to use it solely to operate the Service.',
    ],
  },
  {
    h: '9. Disclaimers',
    p: [
      'The Service is provided "as is" and "as available". To the maximum extent permitted by law, ArgiDrop disclaims all warranties, express or implied, including merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or that any specific delivery will be matched or completed within a specific time.',
      'ArgiDrop is not responsible for the quality, safety, legality, or condition of items being delivered, nor for the conduct of any merchant, driver, or recipient. Disputes between parties to a delivery are between those parties; ArgiDrop\'s role is limited to providing the platform and the dispute-resolution process described in section 6.',
    ],
  },
  {
    h: '10. Limitation of liability',
    p: [
      'To the maximum extent permitted by law, ArgiDrop\'s total liability to you for any claim arising out of or relating to the Service is limited to the greater of (a) the platform fees you paid in the 12 months preceding the claim, or (b) the equivalent of USD 500.',
      'ArgiDrop is not liable for any indirect, incidental, special, consequential, or punitive damages, including lost profits, lost data, or business interruption.',
      'Some jurisdictions do not allow the exclusion of certain warranties or limitation of certain liabilities. In those jurisdictions our liability is limited to the minimum permitted by law.',
    ],
  },
  {
    h: '11. Indemnity',
    p: [
      'You agree to indemnify and hold harmless Argilette, its officers, employees, and contractors from any claim, loss, or expense (including reasonable legal fees) arising out of (a) your use of the Service, (b) your breach of these Terms, (c) your violation of any law or third-party right, or (d) the items you ship or carry through the Service.',
    ],
  },
  {
    h: '12. Termination',
    p: [
      'You may close your account at any time from the app. We may suspend or terminate your account for breach of these Terms, KYC failure, fraud, regulatory requirement, or risk to others, with or without notice depending on severity. Sections 6, 8, 9, 10, 11, and 13 survive termination.',
    ],
  },
  {
    h: '13. Governing law and disputes',
    p: [
      'These Terms are governed by the laws of the country in which Argilette is registered, without regard to conflict-of-laws rules. Any dispute arising out of or relating to these Terms or the Service will first be attempted in good faith to be resolved through ArgiDrop\'s internal dispute process. Unresolved disputes will be submitted to the competent courts of that jurisdiction, unless mandatory local consumer-protection law of your country requires otherwise.',
    ],
  },
  {
    h: '14. Changes',
    p: [
      'We may update these Terms from time to time. Material changes will be notified inside the app and by email at least 14 days before they take effect. Continued use of the Service after the effective date constitutes acceptance.',
    ],
  },
  {
    h: '15. Contact',
    p: [
      'Questions: support@argidrop.com. Legal notices: legal@argidrop.com.',
    ],
  },
];

export default function Terms() {
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
        <h1 style={{ fontFamily:'Fraunces, serif', fontSize:48, fontWeight:400, lineHeight:1.1, letterSpacing:'-0.02em', margin:'0 0 16px' }}>Terms of Service</h1>
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
          These Terms were prepared in plain language for clarity. They are not a substitute for tailored legal advice; ArgiDrop recommends merchants and drivers consult their own counsel for material commercial decisions. We reserve the right to refine wording for legal accuracy without altering substantive obligations except as described in section 14.
        </div>
      </article>
    </div>
  );
}
