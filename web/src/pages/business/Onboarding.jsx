// Business onboarding — light KYC for pre-launch verification
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import LanguageSwitcher from '../../components/LanguageSwitcher';

const C = { cream: '#F7F3EB', paper: '#FDFBF6', forest: '#1B4332', bronze: '#8B6F47', ink: '#1A1A1A', muted: '#6B6560', subtle: '#9A9489', border: '#E4DCC9', success: '#2D5E3E', warn: '#B87333', alert: '#9B2C2C' };

const COUNTRY_CODES = ['TG', 'CI', 'SN', 'BJ', 'BF', 'GH', 'NG', 'ML', 'NE', 'GN', 'SL', 'LR', 'GM', 'GW', 'CV'];
const BUSINESS_TYPE_KEYS = ['Restaurant', 'Pharmacy', 'Retail shop', 'E-commerce', 'Logistics', 'Medical clinic', 'Florist', 'Grocery', 'Other'];
const REQUIRED_DOCS = [{ type: 'BUSINESS_LICENSE' }, { type: 'GOVT_ID' }];

export default function BusinessOnboarding() {
  const { t } = useTranslation();
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
    if (!profile.companyName) return toast.error(t('business.onboarding.companyRequired'));
    setSubmitting(true);
    try {
      await api.post('/businesses/onboarding', profile);
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || t('business.onboarding.saveFailed'));
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
      toast.success(t('business.onboarding.uploadDone'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('business.onboarding.uploadFailed'));
    } finally { setUploading(null); }
  };

  const submitForReview = async () => {
    setSubmitting(true);
    try {
      await api.post('/businesses/submit-for-review');
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.message || t('business.onboarding.saveFailed'));
    } finally { setSubmitting(false); }
  };

  const allDocsUploaded = REQUIRED_DOCS.every(d => docs[d.type]);

  return (
    <div style={{ minHeight: '100vh', background: C.cream, padding: '40px 20px', fontFamily: 'Inter, sans-serif', position:'relative' }}>
      <div style={{ position:'absolute', top:20, right:20 }}>
        <LanguageSwitcher compact />
      </div>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {/* Progress */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
          {[1, 2, 3].map(n => (
            <div key={n} style={{ flex: 1, height: 3, borderRadius: 2, background: step >= n ? C.forest : C.border }} />
          ))}
        </div>

        <div style={{ fontSize: 11, color: C.bronze, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>
          {t('business.onboarding.stepOf', { step })}
        </div>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 32, fontWeight: 500, margin: 0, marginBottom: 8, letterSpacing: '-0.02em', color: C.ink }}>
          {step === 1 ? t('business.onboarding.titleStep1') : step === 2 ? t('business.onboarding.titleStep2') : t('business.onboarding.titleStep3')}
        </h1>
        <p style={{ color: C.muted, fontSize: 14, margin: '0 0 28px' }}>
          {step === 1 ? t('business.onboarding.subStep1') : step === 2 ? t('business.onboarding.subStep2') : t('business.onboarding.subStep3')}
        </p>

        {step === 1 && (
          <div style={{ background: C.paper, border: `1px solid ${C.border}`, borderRadius: 8, padding: 28 }}>
            <Field label={t('business.onboarding.companyName')} value={profile.companyName} onChange={v => setProfile({ ...profile, companyName: v })} required />
            <Field label={t('business.onboarding.businessType')} type="select"
              options={BUSINESS_TYPE_KEYS.map(k => ({ value: k, label: t(`business.onboarding.types.${k}`) }))}
              value={profile.businessType} onChange={v => setProfile({ ...profile, businessType: v })} />
            <Field label={t('business.onboarding.taxId')} hint={t('business.onboarding.taxIdHint')} value={profile.taxId} onChange={v => setProfile({ ...profile, taxId: v })} />
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 2 }}><Field label={t('business.onboarding.city')} value={profile.city} onChange={v => setProfile({ ...profile, city: v })} /></div>
              <div style={{ flex: 1 }}><Field label={t('business.onboarding.country')} type="select"
                options={COUNTRY_CODES.map(code => ({ value: code, label: t(`business.onboarding.countries.${code}`) }))}
                value={profile.country}
                onChange={v => setProfile({ ...profile, country: v })} /></div>
            </div>
            <Field label={t('business.onboarding.address')} value={profile.address} onChange={v => setProfile({ ...profile, address: v })} />
            <Field label={t('business.onboarding.website')} hint={t('business.onboarding.websiteHint')} value={profile.website} onChange={v => setProfile({ ...profile, website: v })} placeholder="https://" />
            <Field label={t('business.onboarding.billingEmail')} type="email" value={profile.billingEmail} onChange={v => setProfile({ ...profile, billingEmail: v })} />
            <Field label={t('business.onboarding.momo')} hint={t('business.onboarding.momoHint')} value={profile.preferredMomoNumber} onChange={v => setProfile({ ...profile, preferredMomoNumber: v })} placeholder="+228 90 00 00 00" />

            <button onClick={saveStep1} disabled={submitting}
              style={{ width: '100%', background: C.forest, color: C.paper, border: 'none', borderRadius: 4, padding: '13px', fontWeight: 500, fontSize: 14, cursor: 'pointer', marginTop: 16 }}>
              {submitting ? t('business.onboarding.saving') : t('business.onboarding.continue')}
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
                      <div style={{ fontSize: 15, fontWeight: 500, color: C.ink }}>{t(`business.onboarding.docs.${doc.type}.label`)}</div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{t(`business.onboarding.docs.${doc.type}.hint`)}</div>
                      {existing?.rejectionReason && <div style={{ fontSize: 12, color: C.alert, marginTop: 6, fontWeight: 500 }}>⚠ {existing.rejectionReason}</div>}
                    </div>
                    <div style={{ minWidth: 90, textAlign: 'right' }}>
                      {status === 'APPROVED' ? <span style={{ color: C.success, fontSize: 12, fontWeight: 600 }}>{t('business.onboarding.approved')}</span> :
                        status === 'REJECTED' ? <span style={{ color: C.alert, fontSize: 12, fontWeight: 600 }}>{t('business.onboarding.reupload')}</span> :
                          existing ? <span style={{ color: C.bronze, fontSize: 12, fontWeight: 500 }}>{t('business.onboarding.uploaded')}</span> : null}
                    </div>
                  </div>
                  <label style={{ display: 'block', background: C.cream, border: `1px dashed ${C.border}`, borderRadius: 4, padding: '12px 16px', textAlign: 'center', cursor: 'pointer', fontSize: 13, color: C.forest, fontWeight: 500 }}>
                    {uploading === doc.type ? t('business.onboarding.uploading') : existing ? t('business.onboarding.replace') : t('business.onboarding.choose')}
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
                {t('business.onboarding.back')}
              </button>
              <button onClick={submitForReview} disabled={!allDocsUploaded || submitting}
                style={{ flex: 1, background: allDocsUploaded ? C.forest : C.border, color: C.paper, border: 'none', borderRadius: 4, padding: '11px 24px', fontWeight: 500, fontSize: 14, cursor: allDocsUploaded ? 'pointer' : 'not-allowed' }}>
                {submitting ? t('business.onboarding.submitting') : t('business.onboarding.submit')}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ background: C.paper, border: `1px solid ${C.border}`, borderRadius: 8, padding: 40, textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, borderRadius: 30, background: C.cream, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
              ⏳
            </div>
            <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 500, margin: 0, marginBottom: 8 }}>{t('business.onboarding.reviewTitle')}</h2>
            <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
              {t('business.onboarding.reviewBody')}
            </p>
            <button onClick={() => navigate('/dashboard')}
              style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.ink, borderRadius: 4, padding: '10px 22px', fontWeight: 500, fontSize: 13, cursor: 'pointer' }}>
              {t('business.onboarding.goDashboard')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, hint, value, onChange, type = 'text', options, required, placeholder }) {
  const { t } = useTranslation();
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 6, letterSpacing: 0.3 }}>
        {label}{required && <span style={{ color: C.alert, marginLeft: 4 }}>*</span>}
      </label>
      {type === 'select' ? (
        <select value={value} onChange={e => onChange(e.target.value)}
          style={{ width: '100%', background: C.cream, border: `1px solid ${C.border}`, borderRadius: 4, padding: '10px 12px', fontSize: 14, color: C.ink, fontFamily: 'inherit' }}>
          <option value="">{t('business.onboarding.select')}</option>
          {options.map(o => typeof o === 'string'
            ? <option key={o} value={o}>{o}</option>
            : <option key={o.value} value={o.value}>{o.label}</option>
          )}
        </select>
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          style={{ width: '100%', background: C.cream, border: `1px solid ${C.border}`, borderRadius: 4, padding: '10px 12px', fontSize: 14, color: C.ink, fontFamily: 'inherit' }} />
      )}
      {hint && <div style={{ fontSize: 11, color: C.subtle, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}
