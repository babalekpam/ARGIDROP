// Admin Business KYC Approval
import React, { useEffect, useState } from 'react';
import api from '../../utils/api';

const C = { cream: '#F7F3EB', paper: '#FDFBF6', forest: '#1B4332', bronze: '#8B6F47', ink: '#1A1A1A', muted: '#6B6560', subtle: '#9A9489', border: '#E4DCC9', success: '#2D5E3E', warn: '#B87333', alert: '#9B2C2C' };

const DOC_LABELS = { BUSINESS_LICENSE: 'Business License', GOVT_ID: 'Owner ID' };

export default function BusinessApproval() {
  const [pending, setPending] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/businesses/pending-review');
      setPending(res.data.businesses || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const approve = async (id) => {
    if (!confirm('Approve this business and allow them to post deliveries?')) return;
    await api.post(`/admin/businesses/${id}/approve`);
    setSelected(null);
    load();
  };

  const reject = async (id) => {
    const reason = prompt('Rejection reason (shown to business):');
    if (!reason) return;
    await api.post(`/admin/businesses/${id}/reject`, { reason });
    setSelected(null);
    load();
  };

  return (
    <div style={{ padding: '24px 32px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ paddingBottom: 20, borderBottom: `1px solid ${C.border}`, marginBottom: 28 }}>
        <div style={{ fontSize: 11, color: C.bronze, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>
          Business KYC
        </div>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 30, fontWeight: 500, margin: 0, letterSpacing: '-0.02em' }}>
          Business approval
        </h1>
        <p style={{ color: C.muted, fontSize: 14, margin: '4px 0 0' }}>
          {pending.length} business{pending.length !== 1 ? 'es' : ''} awaiting review
        </p>
      </div>

      {loading ? <div style={{ color: C.muted, padding: 40, textAlign: 'center' }}>Loading…</div> :
        pending.length === 0 ? (
          <div style={{ background: C.paper, border: `1px solid ${C.border}`, borderRadius: 8, padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>✓</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 500 }}>All caught up</div>
            <div style={{ color: C.muted, fontSize: 13 }}>No businesses currently awaiting review</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: selected ? '400px 1fr' : '1fr', gap: 20 }}>
            <div style={{ background: C.paper, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
              {pending.map((row, i) => {
                const isSelected = selected?.business.id === row.business.id;
                return (
                  <div key={row.business.id} onClick={() => setSelected(row)}
                    style={{
                      padding: '16px 20px',
                      borderBottom: i < pending.length - 1 ? `1px solid ${C.border}` : 'none',
                      cursor: 'pointer',
                      background: isSelected ? C.cream : 'transparent',
                      borderLeft: isSelected ? `3px solid ${C.forest}` : '3px solid transparent'
                    }}>
                    <div style={{ fontWeight: 500, fontSize: 15, color: C.ink, marginBottom: 3 }}>{row.business.companyName}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>{row.business.businessType || '—'} · {row.business.city}, {row.business.country}</div>
                    <div style={{ fontSize: 11, color: C.subtle }}>{row.user?.firstName} {row.user?.lastName} — {row.user?.email}</div>
                  </div>
                );
              })}
            </div>

            {selected && (
              <div style={{ background: C.paper, border: `1px solid ${C.border}`, borderRadius: 8, padding: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                  <div>
                    <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 500, margin: 0, marginBottom: 6 }}>{selected.business.companyName}</h2>
                    <div style={{ fontSize: 13, color: C.muted }}>{selected.business.businessType || '—'}</div>
                  </div>
                  <span style={{ background: '#FAF3E5', color: C.warn, padding: '4px 12px', borderRadius: 3, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em' }}>PENDING KYC</span>
                </div>

                <Section title="Company">
                  <Row k="Legal name" v={selected.business.companyName} />
                  <Row k="Tax ID" v={selected.business.taxId || '—'} />
                  <Row k="Type" v={selected.business.businessType || '—'} />
                  <Row k="Website" v={selected.business.website || '—'} />
                  <Row k="Address" v={`${selected.business.address || ''}${selected.business.address ? ', ' : ''}${selected.business.city}, ${selected.business.country}`} />
                </Section>

                <Section title="Owner / Authorized signatory">
                  <Row k="Name" v={`${selected.user?.firstName} ${selected.user?.lastName}`} />
                  <Row k="Email" v={selected.user?.email} />
                  <Row k="Phone" v={selected.user?.phone || '—'} />
                  <Row k="Billing email" v={selected.business.billingEmail || '—'} />
                  <Row k="Mobile money" v={selected.business.preferredMomoNumber || '—'} />
                </Section>

                <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 600, margin: '20px 0 12px', color: C.muted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Documents</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 28 }}>
                  {selected.documents.map(doc => (
                    <a key={doc.id} href={doc.fileUrl} target="_blank" rel="noreferrer"
                      style={{ display: 'block', border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden', textDecoration: 'none' }}>
                      <div style={{ aspectRatio: '4/3', backgroundImage: `url(${doc.fileUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', background: C.cream }} />
                      <div style={{ padding: '10px 12px', background: C.paper }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: C.ink }}>{DOC_LABELS[doc.docType] || doc.docType}</div>
                        <div style={{ fontSize: 10, color: C.muted, letterSpacing: '0.04em', marginTop: 2 }}>TAP TO VIEW FULL SIZE</div>
                      </div>
                    </a>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 10, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
                  <button onClick={() => reject(selected.business.id)}
                    style={{ flex: 1, background: 'transparent', color: C.alert, border: `1px solid ${C.alert}`, borderRadius: 4, padding: '11px 20px', fontWeight: 500, fontSize: 14, cursor: 'pointer' }}>
                    Reject & request re-upload
                  </button>
                  <button onClick={() => approve(selected.business.id)}
                    style={{ flex: 1, background: C.forest, color: C.paper, border: 'none', borderRadius: 4, padding: '11px 20px', fontWeight: 500, fontSize: 14, cursor: 'pointer' }}>
                    Approve business
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 600, margin: '0 0 10px', color: C.muted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{title}</h3>
      <div style={{ background: C.cream, padding: '14px 16px', borderRadius: 6, border: `1px solid ${C.border}` }}>{children}</div>
    </div>
  );
}
function Row({ k, v }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
      <span style={{ color: C.muted }}>{k}</span>
      <span style={{ color: C.ink, fontWeight: 500, textAlign: 'right', marginLeft: 16 }}>{v}</span>
    </div>
  );
}
