// Business onboarding — light KYC for pre-launch verification
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const C = { cream: '#F7F3EB', paper: '#FDFBF6', forest: '#1B4332', bronze: '#8B6F47', ink: '#1A1A1A', muted: '#6B6560', subtle: '#9A9489', border: '#E4DCC9', success: '#2D5E3E', warn: '#B87333', alert: '#9B2C2C' };

const COUNTRIES = [
  { code: 'TG', name: 'Togo', currency: 'XOF' },
  { code: 'CI', name: "Côte d'Ivoire", currency: 'XOF' },
  { code: 'SN', name: 'Senegal', currency: 'XOF' },
  { code: 'BJ', name: 'Benin', currency: 'XOF' },
  { code: 'BF', name: 'Burkina Faso', currency: 'XOF' },
  { code: 'GH', name: 'Ghana', currency: 'GHS' },
  { code: 'NG', name: 'Nigeria', currency: 'NGN' },
];

const BUSINESS_TYPES = ['Restaurant', 'Pharmacy', 'Retail shop', 'E-commerce', 'Logistics', 'Medical clinic', 'Florist', 'Grocery', 'Other'];

const REQUIRED_DOCS = [
  { type: 'BUSINESS_LICENSE', label: 'Business license or registration', hint: 'Certificate of incorporation, trade license, or equivalent' },
  { type: 'GOVT_ID', label: "Owner's government ID", hint: 'National ID, passport, or driver license of owner/authorized signatory' },
];

export default function BusinessOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState({ companyName: '', taxId: '', businessType: '', website: '', address: '', city: '', country: 'TG', billingEmail: '', preferredMomoNumber: '' });
  const [docs, setDocs] = useState({});
  const [uploading, setUploading] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/businesses/me').then(r => {
      if (r.data.companyName) setProfile(p => ({ ...p, ...r.data }));
      if (r.data.verificationStatus === 'APPROVED') navigate('/dashboard');
      if (r.data.verificationStatus === 'PENDING') setStep(3);
    }).catch(() => {});
    api.get('/businesses/me/documents').then(r => {
      const map = {};
      (r.data.documents || []).forEach(d => { map[d.docType] = d; });
      setDocs(map);
    }).catch(() => {});
  }, []);

  const saveStep1 = async () => {
    if (!profile.companyName) return toast.error('Company name is required');
    setSubmitting(true);
    try {
      await api.post('/businesses/onboarding', profile);
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSubmitting(false); }
  };

  const uploadDoc = async (docType, file) => {
    setUploading(docType);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('docType', docType);
      await api.post('/businesses/documents', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      const r = await api.get('/businesses/me/documents');
      const map = {};
      (r.data.documents || []).forEach(d => { map[d.docType] = d; });
      setDocs(map);
      toast.success('Uploaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally { setUploading(null); }
  };

  const submitForReview = async () => {
    setSubmitting(true);
    try {
      await api.post('/businesses/submit-for-review');
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSubmitting(false); }
  };

  const allDocsUploaded = REQUIRED_DOCS.every(d => docs[d.type]);

  return (
    <div style={{ minHeight: '100vh', background: C.cream, padding: '40px 20px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {/* Progress */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
          {[1, 2, 3].map(n => (
            <div key={n} style={{ flex: 1, height: 3, borderRadius: 2, background: step >= n ? C.forest : C.border }} />
          ))}
        </div>

        <div style={{ fontSize: 11, color: C.bronze, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>
          Step {step} of 3 · Business Verification
        </div>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 32, fontWeight: 500, margin: 0, marginBottom: 8, letterSpacing: '-0.02em', color: C.ink }}>
          {step === 1 ? 'Tell us about your business' : step === 2 ? 'Upload verification documents' : 'Under review'}
        </h1>
        <p style={{ color: C.muted, fontSize: 14, margin: '0 0 28px' }}>
          {step === 1 ? 'We verify every business to protect drivers and ensure trust in the marketplace.' :
            step === 2 ? 'Our team reviews documents within 24 hours. You can start posting as soon as approved.' :
              'Your submission is being reviewed. This usually takes less than 24 hours.'}
        </p>

        {step === 1 && (
          <div style={{ background: C.paper, border: `1px solid ${C.border}`, borderRadius: 8, padding: 28 }}>
            <Field label="Company name" value={profile.companyName} onChange={v => setProfile({ ...profile, companyName: v })} required />
            <Field label="Business type" type="select" options={BUSINESS_TYPES} value={profile.businessType} onChange={v => setProfile({ ...profile, businessType: v })} />
            <Field label="Tax ID / RCCM number" hint="Optional but speeds up verification" value={profile.taxId} onChange={v => setProfile({ ...profile, taxId: v })} />
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 2 }}><Field label="City" value={profile.city} onChange={v => setProfile({ ...profile, city: v })} /></div>
              <div style={{ flex: 1 }}><Field label="Country" type="select" options={COUNTRIES.map(c => c.name)}
                value={COUNTRIES.find(c => c.code === profile.country)?.name || 'Togo'}
                onChange={v => { const c = COUNTRIES.find(c => c.name === v); setProfile({ ...profile, country: c?.code || 'TG' }); }} /></div>
            </div>
            <Field label="Business address" value={profile.address} onChange={v => setProfile({ ...profile, address: v })} />
            <Field label="Website" hint="Optional" value={profile.website} onChange={v => setProfile({ ...profile, website: v })} placeholder="https://" />
            <Field label="Billing email" type="email" value={profile.billingEmail} onChange={v => setProfile({ ...profile, billingEmail: v })} />
            <Field label="Mobile money number for payments" hint="Used for Flutterwave payment confirmation" value={profile.preferredMomoNumber} onChange={v => setProfile({ ...profile, preferredMomoNumber: v })} placeholder="+228 90 00 00 00" />

            <button onClick={saveStep1} disabled={submitting}
              style={{ width: '100%', background: C.forest, color: C.paper, border: 'none', borderRadius: 4, padding: '13px', fontWeight: 500, fontSize: 14, cursor: 'pointer', marginTop: 16 }}>
              {submitting ? 'Saving…' : 'Continue to documents'}
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            {REQUIRED_DOCS.map(doc => {
              const existing = docs[doc.type];
              const status = existing?.status;
              return (
                <div key={doc.type} style={{
                  background: C.paper, border: `1px solid ${status === 'APPROVED' ? C.success : status === 'REJECTED' ? C.alert : C.border}`,
                  borderRadius: 8, padding: 20, marginBottom: 12
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 500, color: C.ink }}>{doc.label}</div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{doc.hint}</div>
                      {existing?.rejectionReason && <div style={{ fontSize: 12, color: C.alert, marginTop: 6, fontWeight: 500 }}>⚠ {existing.rejectionReason}</div>}
                    </div>
                    <div style={{ minWidth: 90, textAlign: 'right' }}>
                      {status === 'APPROVED' ? <span style={{ color: C.success, fontSize: 12, fontWeight: 600 }}>✓ Approved</span> :
                        status === 'REJECTED' ? <span style={{ color: C.alert, fontSize: 12, fontWeight: 600 }}>Re-upload</span> :
                          existing ? <span style={{ color: C.bronze, fontSize: 12, fontWeight: 500 }}>✓ Uploaded</span> : null}
                    </div>
                  </div>
                  <label style={{ display: 'block', background: C.cream, border: `1px dashed ${C.border}`, borderRadius: 4, padding: '12px 16px', textAlign: 'center', cursor: 'pointer', fontSize: 13, color: C.forest, fontWeight: 500 }}>
                    {uploading === doc.type ? 'Uploading…' : existing ? 'Replace file' : 'Choose file to upload'}
                    <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
                      disabled={uploading === doc.type}
                      onChange={e => e.target.files?.[0] && uploadDoc(doc.type, e.target.files[0])} />
                  </label>
                </div>
              );
            })}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setStep(1)}
                style={{ background: C.paper, border: `1px solid ${C.border}`, color: C.ink, borderRadius: 4, padding: '11px 24px', fontWeight: 500, fontSize: 14, cursor: 'pointer' }}>
                Back
              </button>
              <button onClick={submitForReview} disabled={!allDocsUploaded || submitting}
                style={{ flex: 1, background: allDocsUploaded ? C.forest : C.border, color: C.paper, border: 'none', borderRadius: 4, padding: '11px 24px', fontWeight: 500, fontSize: 14, cursor: allDocsUploaded ? 'pointer' : 'not-allowed' }}>
                {submitting ? 'Submitting…' : 'Submit for review'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ background: C.paper, border: `1px solid ${C.border}`, borderRadius: 8, padding: 40, textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, borderRadius: 30, background: C.cream, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
              ⏳
            </div>
            <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 500, margin: 0, marginBottom: 8 }}>Documents under review</h2>
            <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
              Our team typically approves within 24 hours. We'll email you when your account is verified and ready to post deliveries.
            </p>
            <button onClick={() => navigate('/dashboard')}
              style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.ink, borderRadius: 4, padding: '10px 22px', fontWeight: 500, fontSize: 13, cursor: 'pointer' }}>
              Go to dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, hint, value, onChange, type = 'text', options, required, placeholder }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 6, letterSpacing: 0.3 }}>
        {label}{required && <span style={{ color: C.alert, marginLeft: 4 }}>*</span>}
      </label>
      {type === 'select' ? (
        <select value={value} onChange={e => onChange(e.target.value)}
          style={{ width: '100%', background: C.cream, border: `1px solid ${C.border}`, borderRadius: 4, padding: '10px 12px', fontSize: 14, color: C.ink, fontFamily: 'inherit' }}>
          <option value="">Select…</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          style={{ width: '100%', background: C.cream, border: `1px solid ${C.border}`, borderRadius: 4, padding: '10px 12px', fontSize: 14, color: C.ink, fontFamily: 'inherit' }} />
      )}
      {hint && <div style={{ fontSize: 11, color: C.subtle, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}
