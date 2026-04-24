// Admin Dispute Resolution — review open disputes with scan audit evidence
import React, { useEffect, useState } from 'react';
import api from '../../utils/api';

const C = { cream: '#F7F3EB', paper: '#FDFBF6', forest: '#1B4332', bronze: '#8B6F47', ink: '#1A1A1A', muted: '#6B6560', subtle: '#9A9489', border: '#E4DCC9', success: '#2D5E3E', warn: '#B87333', alert: '#9B2C2C' };

export default function Disputes() {
  const [disputes, setDisputes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [scanEvents, setScanEvents] = useState([]);
  const [resolution, setResolution] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const res = await api.get('/admin/disputes');
    setDisputes(res.data.disputes || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openDispute = async (d) => {
    setSelected(d);
    try {
      const res = await api.get(`/admin/scan-events/${d.jobId}`);
      setScanEvents(res.data.events || []);
    } catch { setScanEvents([]); }
  };

  const resolve = async (outcome) => {
    if (!resolution.trim()) return alert('Please explain your resolution decision');
    await api.post(`/admin/disputes/${selected.id}/resolve`, { outcome, resolution });
    setSelected(null); setResolution('');
    load();
  };

  return (
    <div style={{ padding: '24px 32px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ paddingBottom: 20, borderBottom: `1px solid ${C.border}`, marginBottom: 28 }}>
        <div style={{ fontSize: 11, color: C.bronze, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>
          Support Queue
        </div>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 30, fontWeight: 500, margin: 0, letterSpacing: '-0.02em' }}>
          Disputes
        </h1>
        <p style={{ color: C.muted, fontSize: 14, margin: '4px 0 0' }}>
          {disputes.filter(d => d.status === 'OPEN').length} open · {disputes.filter(d => d.status === 'UNDER_REVIEW').length} under review
        </p>
      </div>

      {loading ? <div style={{ color: C.muted }}>Loading…</div> :
        disputes.length === 0 ? (
          <div style={{ background: C.paper, border: `1px solid ${C.border}`, borderRadius: 8, padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>✓</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 500 }}>All clear</div>
            <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>No disputes to resolve</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: selected ? '360px 1fr' : '1fr', gap: 20 }}>
            <div style={{ background: C.paper, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
              {disputes.map((d, i) => (
                <div key={d.id} onClick={() => openDispute(d)}
                  style={{
                    padding: '14px 18px', borderBottom: i < disputes.length - 1 ? `1px solid ${C.border}` : 'none', cursor: 'pointer',
                    background: selected?.id === d.id ? C.cream : 'transparent',
                    borderLeft: selected?.id === d.id ? `3px solid ${C.forest}` : '3px solid transparent'
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: C.ink }}>{d.reason}</span>
                    <StatusChip status={d.status} />
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, fontFamily: 'monospace', marginBottom: 4 }}>Job {d.jobId?.substring(0, 8)}</div>
                  <div style={{ fontSize: 11, color: C.subtle }}>{new Date(d.createdAt).toLocaleDateString()}</div>
                </div>
              ))}
            </div>

            {selected && (
              <div style={{ background: C.paper, border: `1px solid ${C.border}`, borderRadius: 8, padding: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div>
                    <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 500, margin: 0, marginBottom: 4, letterSpacing: '-0.01em' }}>
                      {selected.reason}
                    </h2>
                    <div style={{ fontSize: 12, color: C.muted }}>Opened {new Date(selected.createdAt).toLocaleString()}</div>
                  </div>
                  <StatusChip status={selected.status} />
                </div>

                <div style={{ background: C.cream, border: `1px solid ${C.border}`, borderRadius: 6, padding: 16, marginBottom: 20 }}>
                  <div style={{ fontSize: 11, color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>Description from user</div>
                  <div style={{ fontSize: 13, color: C.ink, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {selected.description || '(No description provided)'}
                  </div>
                </div>

                <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 600, margin: '0 0 12px', color: C.muted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Scan audit trail
                </h3>
                {scanEvents.length === 0 ? (
                  <div style={{ fontSize: 12, color: C.muted, padding: 12, background: C.cream, borderRadius: 4 }}>No scan events for this job</div>
                ) : (
                  <div style={{ marginBottom: 24 }}>
                    {scanEvents.map(e => (
                      <div key={e.event.id} style={{
                        display: 'flex', gap: 12, padding: '10px 12px',
                        borderLeft: `3px solid ${e.event.success ? C.success : C.alert}`,
                        background: e.event.success ? '#F0F5F1' : '#FCEDE9',
                        borderRadius: 4, marginBottom: 6
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: e.event.success ? C.success : C.alert, letterSpacing: '0.04em', minWidth: 60 }}>
                          {e.event.success ? '✓' : '✗'} {e.event.scanType}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, color: C.ink }}>
                            {e.user?.firstName || 'Unknown'} ({e.user?.email || '—'})
                          </div>
                          {!e.event.success && <div style={{ fontSize: 11, color: C.alert, marginTop: 2 }}>{e.event.failureReason}</div>}
                          {e.event.distanceFromExpectedMeters && (
                            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                              {Math.round(parseFloat(e.event.distanceFromExpectedMeters))}m from expected location
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: C.subtle }}>
                          {new Date(e.event.createdAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selected.status === 'OPEN' || selected.status === 'UNDER_REVIEW' ? (
                  <>
                    <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 600, margin: '0 0 10px', color: C.muted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Your decision
                    </h3>
                    <textarea value={resolution} onChange={e => setResolution(e.target.value)}
                      placeholder="Explain your decision. Both parties will see this message."
                      style={{ width: '100%', minHeight: 100, background: C.cream, border: `1px solid ${C.border}`, borderRadius: 4, padding: 12, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', marginBottom: 14, color: C.ink }} />

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={() => resolve('RESOLVED_BUSINESS')}
                        style={{ flex: 1, background: 'transparent', color: C.ink, border: `1px solid ${C.border}`, borderRadius: 4, padding: '11px 16px', fontWeight: 500, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Refund business
                      </button>
                      <button onClick={() => resolve('RESOLVED_DRIVER')}
                        style={{ flex: 1, background: 'transparent', color: C.ink, border: `1px solid ${C.border}`, borderRadius: 4, padding: '11px 16px', fontWeight: 500, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Pay driver (no refund)
                      </button>
                      <button onClick={() => resolve('CLOSED')}
                        style={{ flex: 1, background: C.forest, color: C.paper, border: 'none', borderRadius: 4, padding: '11px 16px', fontWeight: 500, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Close
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ background: C.cream, border: `1px solid ${C.border}`, borderRadius: 6, padding: 16 }}>
                    <div style={{ fontSize: 11, color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>Resolution</div>
                    <div style={{ fontSize: 13, color: C.ink, lineHeight: 1.5 }}>{selected.resolution}</div>
                    <div style={{ fontSize: 11, color: C.subtle, marginTop: 8 }}>Resolved {new Date(selected.resolvedAt).toLocaleString()}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
    </div>
  );
}

function StatusChip({ status }) {
  const map = {
    OPEN: { bg: '#FCEDE9', fg: '#9B2C2C', label: 'Open' },
    UNDER_REVIEW: { bg: '#FAF3E5', fg: '#B87333', label: 'Under review' },
    RESOLVED_BUSINESS: { bg: '#E8F0EA', fg: '#2D5E3E', label: 'Refund' },
    RESOLVED_DRIVER: { bg: '#E8F0EA', fg: '#2D5E3E', label: 'Driver paid' },
    CLOSED: { bg: '#F7F3EB', fg: '#6B6560', label: 'Closed' },
  };
  const v = map[status] || map.CLOSED;
  return <span style={{ background: v.bg, color: v.fg, padding: '3px 10px', borderRadius: 3, fontSize: 10, fontWeight: 600, letterSpacing: '0.04em' }}>{v.label}</span>;
}
