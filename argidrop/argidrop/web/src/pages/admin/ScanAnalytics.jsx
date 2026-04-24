// Admin Scan Analytics — fraud detection, success rates, GPS anomalies
import React, { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../../utils/api';

const C = { cream: '#F7F3EB', paper: '#FDFBF6', forest: '#1B4332', bronze: '#8B6F47', ink: '#1A1A1A', muted: '#6B6560', subtle: '#9A9489', border: '#E4DCC9', success: '#2D5E3E', warn: '#B87333', alert: '#9B2C2C' };

export default function ScanAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/scan-analytics').then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 48, color: C.muted }}>Loading scan analytics…</div>;
  if (!data) return <div style={{ padding: 48, color: C.alert }}>Failed to load</div>;

  return (
    <div style={{ padding: '24px 32px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ paddingBottom: 20, borderBottom: `1px solid ${C.border}`, marginBottom: 28 }}>
        <div style={{ fontSize: 11, color: C.bronze, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>
          Fraud Detection & Verification
        </div>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 30, fontWeight: 500, margin: 0, color: C.ink, letterSpacing: '-0.02em' }}>
          QR scan analytics
        </h1>
        <p style={{ color: C.muted, fontSize: 14, margin: '4px 0 0' }}>Last 30 days — {data.totalEvents.toLocaleString()} scan attempts</p>
      </div>

      {/* Success rate cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, marginBottom: 32, background: C.paper, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
        {['PAYMENT', 'PICKUP', 'DELIVERY'].map((type, i) => {
          const d = data.summary[type];
          const rate = parseFloat(d.successRate);
          const color = rate >= 95 ? C.success : rate >= 85 ? C.warn : C.alert;
          return (
            <div key={type} style={{ padding: '22px 24px', borderRight: i < 2 ? `1px solid ${C.border}` : 'none' }}>
              <div style={{ fontSize: 11, color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>{type} SCANS</div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 32, fontWeight: 500, color, letterSpacing: '-0.02em', lineHeight: 1 }}>
                {d.successRate}<span style={{ fontSize: 16, marginLeft: 2 }}>%</span>
              </div>
              <div style={{ fontSize: 12, color: C.subtle, marginTop: 8 }}>
                {d.success.toLocaleString()} of {d.total.toLocaleString()} succeeded
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                {d.failed} failed ({d.total ? ((d.failed / d.total) * 100).toFixed(1) : 0}%)
              </div>
            </div>
          );
        })}
      </div>

      {/* Daily series chart */}
      <div style={{ background: C.paper, border: `1px solid ${C.border}`, borderRadius: 8, padding: 24, marginBottom: 24 }}>
        <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 500, margin: 0, marginBottom: 20, letterSpacing: '-0.01em' }}>Daily scan volume</h3>
        {data.dailySeries.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.dailySeries}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="date" stroke={C.muted} fontSize={11} tickFormatter={d => d.slice(5)} />
              <YAxis stroke={C.muted} fontSize={11} />
              <Tooltip contentStyle={{ background: C.paper, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 12 }} />
              <Legend />
              <Bar dataKey="success" stackId="a" fill={C.forest} name="Successful" />
              <Bar dataKey="failed" stackId="a" fill={C.alert} name="Failed" />
            </BarChart>
          </ResponsiveContainer>
        ) : <div style={{ color: C.muted, fontSize: 14, padding: 40, textAlign: 'center' }}>No scan data yet</div>}
      </div>

      {/* Two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Top failure reasons */}
        <div style={{ background: C.paper, border: `1px solid ${C.border}`, borderRadius: 8, padding: 24 }}>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500, margin: 0, marginBottom: 4 }}>Top failure reasons</h3>
          <p style={{ fontSize: 12, color: C.muted, margin: '0 0 20px' }}>Why scans failed</p>
          {data.topFailureReasons.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 13, padding: 20, textAlign: 'center' }}>No failures — all scans succeeded</div>
          ) : data.topFailureReasons.map((f, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < data.topFailureReasons.length - 1 ? `1px solid ${C.border}` : 'none' }}>
              <span style={{ fontSize: 13, color: C.ink }}>{f.reason}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.alert }}>{f.count}</span>
            </div>
          ))}
        </div>

        {/* GPS outliers (fraud signal) */}
        <div style={{ background: C.paper, border: `1px solid ${C.border}`, borderRadius: 8, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500, margin: 0 }}>GPS anomalies</h3>
            {data.gpsFarOutliers.length > 0 && (
              <span style={{ background: '#FAF3E5', color: C.warn, padding: '2px 8px', borderRadius: 3, fontSize: 10, fontWeight: 600, letterSpacing: '0.04em' }}>{data.gpsFarOutliers.length} FLAGGED</span>
            )}
          </div>
          <p style={{ fontSize: 12, color: C.muted, margin: '0 0 20px' }}>Successful scans with unusual distance from expected location</p>
          {data.gpsFarOutliers.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 13, padding: 20, textAlign: 'center' }}>No anomalies detected — good</div>
          ) : (
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {data.gpsFarOutliers.map((o, i) => (
                <div key={i} style={{ padding: '10px 0', borderBottom: i < data.gpsFarOutliers.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: C.ink }}>{o.jobId.substring(0, 8)}…</span>
                    <span style={{ fontSize: 12, color: C.warn, fontWeight: 600 }}>{Math.round(o.distanceM)}m off</span>
                  </div>
                  <div style={{ fontSize: 11, color: C.muted }}>{o.scanType} · {new Date(o.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
