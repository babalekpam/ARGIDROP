import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', borderSoft:'#EFE8D7', success:'#2D5E3E', warn:'#B87333', alert:'#9B2C2C' };

const DOC_META = {
  SELFIE:{ fr:'Photo de profil', en:'Profile selfie', required:true },
  SELFIE_WITH_ID:{ fr:'Selfie + pièce d\'identité', en:'Selfie holding ID', required:true },
  GOVT_ID_FRONT:{ fr:'CNI / Passeport — Recto', en:'National ID — Front', required:true },
  GOVT_ID_BACK:{ fr:'CNI — Verso', en:'National ID — Back', required:true },
  DRIVERS_LICENSE:{ fr:'Permis de conduire', en:'Driver\'s license', required:true },
  VEHICLE_REGISTRATION:{ fr:'Carte grise', en:'Vehicle registration', required:true },
  VEHICLE_INSURANCE:{ fr:'Attestation d\'assurance', en:'Insurance certificate', required:true },
  VEHICLE_PHOTO_FRONT:{ fr:'Photo véhicule (plaque)', en:'Vehicle photo (plate)', required:true },
  POLICE_CLEARANCE:{ fr:'Casier judiciaire (B3)', en:'Police clearance', required:true },
  PROOF_OF_ADDRESS:{ fr:'Justificatif de domicile', en:'Proof of address', required:true },
  GOVT_ID:{ fr:'Pièce d\'identité', en:'Government ID', required:false },
  VEHICLE_PHOTO:{ fr:'Photo véhicule', en:'Vehicle photo', required:false },
  INSURANCE:{ fr:'Assurance', en:'Insurance', required:false },
};

const REQUIRED_DOCS = Object.keys(DOC_META).filter(k => DOC_META[k].required);

const CHECKLIST = [
  { id:'face_match', fr:'Visage selfie = visage sur pièce d\'identité', en:'Selfie face matches ID photo' },
  { id:'id_valid', fr:'Pièce d\'identité valide et non expirée', en:'ID document valid and not expired' },
  { id:'license_valid', fr:'Permis valide pour le type de véhicule', en:'License valid for vehicle category' },
  { id:'vehicle_plate_match', fr:'Plaque photo = plaque carte grise', en:'Photo plate matches registration plate' },
  { id:'insurance_valid', fr:'Assurance en cours de validité', en:'Insurance currently valid' },
  { id:'police_recent', fr:'Casier judiciaire < 3 mois', en:'Police clearance < 3 months old' },
  { id:'address_recent', fr:'Justificatif de domicile < 3 mois', en:'Proof of address < 3 months old' },
  { id:'no_forgery', fr:'Aucune falsification détectée', en:'No forgery signs detected' },
];

const REJECT_REASONS = {
  fr:['Photo floue ou illisible','Document expiré','Document tronqué ou incomplet','Visage non visible sur le selfie','Visage ne correspond pas à la pièce','Mauvais type de document','Plaque illisible','Casier judiciaire > 3 mois','Justificatif de domicile > 3 mois','Autre (préciser en notes)'],
  en:['Photo blurry or unreadable','Document expired','Document cropped or incomplete','Face not visible in selfie','Face does not match ID photo','Wrong document type','License plate unreadable','Police clearance older than 3 months','Proof of address older than 3 months','Other (specify in notes)'],
};

export default function DriverApproval() {
  const [pending, setPending] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checks, setChecks] = useState({});
  const [notes, setNotes] = useState('');
  const [rejectModal, setRejectModal] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [lang, setLang] = useState('fr');

  const L = (fr, en) => lang === 'fr' ? fr : en;

  const load = async () => {
    setLoading(true);
    try { const r = await api.get('/admin/drivers/pending-review'); setPending(r.data.drivers || []); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const select = (row) => { setSelected(row); setChecks({}); setNotes(''); setRejectModal(null); };

  const kycScore = Math.round((Object.values(checks).filter(Boolean).length / CHECKLIST.length) * 100);

  const approve = async () => {
    const missed = CHECKLIST.filter(c => !checks[c.id]);
    if (missed.length && !confirm(L(`${missed.length} point(s) non cochés. Approuver quand même ?`, `${missed.length} check(s) not confirmed. Approve anyway?`))) return;
    setSubmitting(true);
    try {
      await api.post(`/admin/drivers/${selected.driver.id}/approve`, { kycScore, kycNotes: notes });
      toast.success(L('Livreur approuvé ✓', 'Driver approved ✓'));
      setSelected(null); load();
    } catch { toast.error('Failed'); }
    finally { setSubmitting(false); }
  };

  const reject = async () => {
    const reason = prompt(L('Motif de refus (visible par le livreur) :', 'Rejection reason (visible to driver):'));
    if (!reason) return;
    setSubmitting(true);
    try {
      await api.post(`/admin/drivers/${selected.driver.id}/reject`, { reason, kycNotes: notes });
      toast.success(L('Dossier refusé', 'Application rejected'));
      setSelected(null); load();
    } catch { toast.error('Failed'); }
    finally { setSubmitting(false); }
  };

  const rejectDoc = async (docType, reasons) => {
    try {
      await api.post(`/admin/drivers/${selected.driver.id}/reject`, { reason: reasons.join('; '), docType });
      toast.success(L('Document refusé', 'Document rejected'));
      setRejectModal(null); load();
    } catch { toast.error('Failed'); }
  };

  const selfieDoc = selected?.documents?.find(d => d.docType === 'SELFIE');
  const selfieIdDoc = selected?.documents?.find(d => d.docType === 'SELFIE_WITH_ID');
  const restDocs = selected?.documents?.filter(d => !['SELFIE','SELFIE_WITH_ID'].includes(d.docType)) || [];
  const missingDocs = REQUIRED_DOCS.filter(dt => !['SELFIE','SELFIE_WITH_ID'].includes(dt) && !selected?.documents?.find(d => d.docType === dt));

  return (
    <div style={{ padding:'24px 32px', fontFamily:'Inter, sans-serif' }}>
      <div style={{ paddingBottom:20, borderBottom:`1px solid ${C.borderSoft}`, marginBottom:24, display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
        <div>
          <div style={{ fontSize:11, color:C.bronze, letterSpacing:'0.16em', textTransform:'uppercase', fontWeight:600, marginBottom:6 }}>KYC</div>
          <h1 style={{ fontFamily:'Fraunces, serif', fontSize:30, fontWeight:500, margin:0, letterSpacing:'-0.02em' }}>{L('Approbation livreurs','Driver approval')}</h1>
          <p style={{ color:C.muted, fontSize:14, margin:'4px 0 0' }}>{pending.length} {L('en attente','pending')}</p>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {['fr','en'].map(l => (
            <button key={l} onClick={() => setLang(l)}
              style={{ background:lang===l?C.forest:'transparent', color:lang===l?C.paper:C.muted, border:`1px solid ${lang===l?C.forest:C.border}`, borderRadius:4, padding:'5px 14px', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
              {l === 'fr' ? 'Français' : 'English'}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div style={{ padding:48, textAlign:'center', color:C.muted }}>Chargement…</div> :
        pending.length === 0 ? (
          <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, padding:48, textAlign:'center' }}>
            <div style={{ fontFamily:'Fraunces, serif', fontSize:20, fontWeight:500, marginBottom:6 }}>✓ {L('Aucun dossier en attente','All clear')}</div>
            <div style={{ color:C.muted, fontSize:13 }}>{L('Tous les dossiers ont été traités','No applications pending')}</div>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:selected?'280px 1fr':'280px', gap:20 }}>

            {/* LIST */}
            <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, overflow:'hidden' }}>
              {pending.map((row, i) => {
                const selfie = row.documents?.find(d => d.docType === 'SELFIE');
                const isSelected = selected?.driver.id === row.driver.id;
                const docsUploaded = row.documents?.length || 0;
                const totalRequired = REQUIRED_DOCS.length;
                return (
                  <div key={row.driver.id} onClick={() => select(row)}
                    style={{ padding:'13px 16px', borderBottom:i<pending.length-1?`1px solid ${C.border}`:'none', cursor:'pointer', background:isSelected?C.cream:'transparent', borderLeft:isSelected?`3px solid ${C.forest}`:'3px solid transparent', display:'flex', gap:10, alignItems:'center' }}>
                    <div style={{ width:38, height:38, borderRadius:'50%', overflow:'hidden', flexShrink:0, border:`1.5px solid ${C.border}`, background:C.forest }}>
                      {selfie?.fileUrl
                        ? <img src={selfie.fileUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                        : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Fraunces, serif', color:C.paper, fontSize:15 }}>{row.user?.firstName?.[0]}</div>
                      }
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:500, color:C.ink }}>{row.user?.firstName} {row.user?.lastName}</div>
                      <div style={{ fontSize:11, color:C.muted }}>{row.driver.vehicleType}</div>
                      <div style={{ fontSize:10, color:docsUploaded>=totalRequired?C.success:C.warn, marginTop:2, fontWeight:500 }}>{docsUploaded}/{totalRequired} docs</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DETAIL */}
            {selected && (
              <div style={{ display:'flex', flexDirection:'column', gap:14, maxWidth:900 }}>

                {/* SELFIE COMPARISON */}
                <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, padding:20 }}>
                  <div style={{ fontSize:11, color:C.bronze, letterSpacing:'0.14em', textTransform:'uppercase', fontWeight:600, marginBottom:14 }}>
                    {L('Vérification biométrique','Biometric check')}
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
                    {[
                      { doc:selfieDoc, title:L('Selfie — visage','Selfie — face'), note:L('Photo de profil du livreur','Driver profile photo') },
                      { doc:selfieIdDoc, title:L('Selfie tenant la pièce','Selfie holding ID'), note:L('Vérifier que le visage correspond à la pièce','Verify face matches ID document') },
                      { doc:selected.documents?.find(d => d.docType==='GOVT_ID_FRONT'), title:L('CNI / Passeport recto','National ID front'), note:L('Comparer avec les selfies','Compare with selfie photos') },
                    ].map(({ doc, title, note }) => (
                      <div key={title}>
                        <div style={{ fontSize:12, fontWeight:600, color:C.ink, marginBottom:4 }}>{title}</div>
                        <div style={{ fontSize:11, color:C.muted, marginBottom:8, lineHeight:1.4 }}>{note}</div>
                        {doc?.fileUrl ? (
                          <img src={doc.fileUrl} alt={title} onClick={() => setLightbox(doc.fileUrl)}
                            style={{ width:'100%', aspectRatio:'1/1', objectFit:'cover', borderRadius:6, cursor:'zoom-in', border:`1px solid ${C.border}` }} />
                        ) : (
                          <div style={{ width:'100%', aspectRatio:'1/1', background:C.cream, borderRadius:6, border:`1px dashed ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', color:C.subtle, fontSize:12 }}>
                            {L('Non envoyé','Not uploaded')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop:14, padding:'10px 14px', background:'#E8F0EA', borderRadius:4, fontSize:12, color:C.forest, lineHeight:1.5 }}>
                    <strong>⚡ {L('Contrôle obligatoire :','Required check:')}</strong> {L('Les trois photos ci-dessus doivent montrer le même visage. En cas de doute, refuser le dossier.','All three photos above must show the same face. When in doubt, reject the application.')}
                  </div>
                </div>

                {/* DRIVER DETAILS */}
                <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, padding:20 }}>
                  <div style={{ fontSize:11, color:C.bronze, letterSpacing:'0.14em', textTransform:'uppercase', fontWeight:600, marginBottom:14 }}>
                    {L('Informations du dossier','Application information')}
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                    {[
                      [L('Nom complet','Full name'), `${selected.user?.firstName} ${selected.user?.lastName}`],
                      [L('Email','Email'), selected.user?.email],
                      [L('Téléphone','Phone'), selected.user?.phone||'—'],
                      [L('Pays','Country'), selected.user?.country||'—'],
                      [L('Type véhicule','Vehicle type'), selected.driver.vehicleType],
                      [L('Plaque','Plate'), selected.driver.vehiclePlate||'—'],
                      [L('Marque / Modèle','Make / Model'), `${selected.driver.vehicleMake||'—'} ${selected.driver.vehicleModel||''}`],
                      [L('Compte paiement','Payout account'), `${selected.driver.payoutProvider||'—'} · ${selected.driver.payoutAccount||'—'}`],
                    ].map(([k,v]) => (
                      <div key={k} style={{ background:C.cream, borderRadius:4, padding:'8px 12px', border:`1px solid ${C.borderSoft}` }}>
                        <div style={{ fontSize:10, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:2 }}>{k}</div>
                        <div style={{ fontSize:13, color:C.ink, fontWeight:500 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* DOCUMENT GRID */}
                <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, padding:20 }}>
                  <div style={{ fontSize:11, color:C.bronze, letterSpacing:'0.14em', textTransform:'uppercase', fontWeight:600, marginBottom:14 }}>
                    {L('Documents de vérification','Verification documents')}
                    {missingDocs.length > 0 && <span style={{ marginLeft:8, background:'#FCEDE9', color:C.alert, padding:'2px 8px', borderRadius:3, fontSize:10 }}>{missingDocs.length} {L('manquant(s)','missing')}</span>}
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
                    {REQUIRED_DOCS.filter(dt => !['SELFIE','SELFIE_WITH_ID'].includes(dt)).map(docType => {
                      const doc = selected.documents?.find(d => d.docType === docType);
                      const meta = DOC_META[docType];
                      return (
                        <div key={docType} style={{ borderRadius:6, overflow:'hidden', border:`1px solid ${doc?.status==='REJECTED'?C.alert:doc?.status==='APPROVED'?C.success:doc?C.bronze:C.border}` }}>
                          {doc?.fileUrl ? (
                            <img src={doc.fileUrl} alt="" onClick={() => setLightbox(doc.fileUrl)}
                              style={{ width:'100%', aspectRatio:'4/3', objectFit:'cover', cursor:'zoom-in', display:'block' }} />
                          ) : (
                            <div style={{ width:'100%', aspectRatio:'4/3', background:C.cream, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:C.subtle, textAlign:'center', padding:'0 8px' }}>
                              {L('Manquant','Missing')}
                            </div>
                          )}
                          <div style={{ padding:'7px 9px', background:C.paper }}>
                            <div style={{ fontSize:10, fontWeight:600, color:C.ink, marginBottom:3, lineHeight:1.3 }}>{meta[lang] || meta.en}</div>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                              <span style={{ fontSize:9, fontWeight:700, color:doc?.status==='APPROVED'?C.success:doc?.status==='REJECTED'?C.alert:doc?C.bronze:C.muted }}>
                                {doc ? doc.status : L('ABSENT','MISSING')}
                              </span>
                              {doc?.fileUrl && (
                                <button onClick={() => setRejectModal({ docType, reasons:[] })}
                                  style={{ background:'transparent', border:`1px solid ${C.border}`, color:C.muted, borderRadius:3, padding:'1px 5px', fontSize:9, cursor:'pointer', fontFamily:'inherit' }}>
                                  {L('Refuser','Reject')}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* CHECKLIST */}
                <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, padding:20 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                    <div style={{ fontSize:11, color:C.bronze, letterSpacing:'0.14em', textTransform:'uppercase', fontWeight:600 }}>
                      {L('Checklist de conformité','Compliance checklist')}
                    </div>
                    <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
                      <span style={{ fontFamily:'Fraunces, serif', fontSize:24, fontWeight:500, color:kycScore>=80?C.success:kycScore>=50?C.warn:C.alert }}>{kycScore}</span>
                      <span style={{ fontSize:12, color:C.muted }}>/ 100</span>
                    </div>
                  </div>
                  {CHECKLIST.map(c => (
                    <div key={c.id} onClick={() => setChecks(prev => ({ ...prev, [c.id]:!prev[c.id] }))}
                      style={{ display:'flex', gap:10, alignItems:'center', padding:'9px 0', borderBottom:`1px solid ${C.borderSoft}`, cursor:'pointer' }}>
                      <div style={{ width:18, height:18, borderRadius:3, border:`1.5px solid ${checks[c.id]?C.forest:C.border}`, background:checks[c.id]?C.forest:'transparent', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.1s' }}>
                        {checks[c.id] && <span style={{ color:C.paper, fontSize:11 }}>✓</span>}
                      </div>
                      <span style={{ fontSize:13, color:checks[c.id]?C.ink:C.muted }}>{c[lang]}</span>
                    </div>
                  ))}
                  <div style={{ marginTop:14 }}>
                    <div style={{ fontSize:12, color:C.muted, fontWeight:600, marginBottom:6 }}>
                      {L('Notes internes (non visibles par le livreur)','Internal notes (not visible to driver)')}
                    </div>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)}
                      placeholder={L('Observations sur le dossier…','Notes on this application…')}
                      style={{ width:'100%', background:C.cream, border:`1px solid ${C.border}`, borderRadius:4, padding:'10px 12px', fontSize:13, color:C.ink, fontFamily:'inherit', minHeight:68, resize:'vertical', boxSizing:'border-box' }} />
                  </div>
                </div>

                {/* ACTIONS */}
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={reject} disabled={submitting}
                    style={{ flex:1, background:'transparent', color:C.alert, border:`1px solid ${C.alert}`, borderRadius:4, padding:'13px', fontWeight:500, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
                    {L('Refuser le dossier','Reject application')}
                  </button>
                  <button onClick={approve} disabled={submitting}
                    style={{ flex:2, background:C.forest, color:C.paper, border:'none', borderRadius:4, padding:'13px', fontWeight:500, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
                    {submitting ? L('Traitement…','Processing…') : L(`Approuver le livreur (score ${kycScore}%)`,`Approve driver (score ${kycScore}%)`)}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      {/* Reject document modal */}
      {rejectModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:C.paper, borderRadius:8, padding:28, maxWidth:460, width:'90%', border:`1px solid ${C.border}` }}>
            <h3 style={{ fontFamily:'Fraunces, serif', fontSize:18, fontWeight:500, margin:'0 0 4px' }}>{L('Refuser ce document','Reject this document')}</h3>
            <p style={{ color:C.muted, fontSize:13, margin:'0 0 16px' }}>{DOC_META[rejectModal.docType]?.[lang] || rejectModal.docType}</p>
            <p style={{ fontSize:12, fontWeight:600, color:C.muted, marginBottom:8 }}>{L('Sélectionnez le(s) motif(s) :','Select reason(s):')}</p>
            {REJECT_REASONS[lang].map((r,i) => (
              <div key={i} onClick={() => setRejectModal(rm => ({ ...rm, reasons: rm.reasons.includes(r) ? rm.reasons.filter(x => x!==r) : [...rm.reasons, r] }))}
                style={{ display:'flex', gap:10, alignItems:'center', padding:'8px 0', borderBottom:`1px solid ${C.borderSoft}`, cursor:'pointer' }}>
                <div style={{ width:16, height:16, borderRadius:3, border:`1.5px solid ${rejectModal.reasons.includes(r)?C.forest:C.border}`, background:rejectModal.reasons.includes(r)?C.forest:'transparent', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {rejectModal.reasons.includes(r) && <span style={{ color:C.paper, fontSize:10 }}>✓</span>}
                </div>
                <span style={{ fontSize:13, color:C.ink }}>{r}</span>
              </div>
            ))}
            <div style={{ display:'flex', gap:10, marginTop:16 }}>
              <button onClick={() => setRejectModal(null)} style={{ flex:1, background:'transparent', border:`1px solid ${C.border}`, color:C.muted, borderRadius:4, padding:10, cursor:'pointer', fontFamily:'inherit' }}>{L('Annuler','Cancel')}</button>
              <button onClick={() => rejectDoc(rejectModal.docType, rejectModal.reasons)} disabled={!rejectModal.reasons.length}
                style={{ flex:1, background:rejectModal.reasons.length?C.alert:'#ccc', color:C.paper, border:'none', borderRadius:4, padding:10, fontWeight:500, cursor:rejectModal.reasons.length?'pointer':'not-allowed', fontFamily:'inherit' }}>
                {L('Confirmer le refus','Confirm rejection')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.88)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, cursor:'zoom-out' }}>
          <img src={lightbox} alt="Document" style={{ maxWidth:'90vw', maxHeight:'90vh', objectFit:'contain', borderRadius:4 }} />
          <div style={{ position:'absolute', top:20, right:24, color:'rgba(255,255,255,0.6)', fontSize:13 }}>{L('Cliquez pour fermer','Click to close')}</div>
        </div>
      )}
    </div>
  );
}
