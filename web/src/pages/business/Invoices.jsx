import React, { useEffect, useState } from 'react';
import api from '../../utils/api';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', borderSoft:'#EFE8D7' };
const PS = { HELD:'Held', RELEASED:'Paid out', REFUNDED:'Refunded', PENDING:'Pending', FAILED:'Failed' };
const PC = { HELD:{ bg:'#FAF3E5', fg:'#B87333' }, RELEASED:{ bg:'#E8F0EA', fg:'#1B4332' }, REFUNDED:{ bg:'#FCEDE9', fg:'#9B2C2C' }, PENDING:{ bg:C.cream, fg:C.muted }, FAILED:{ bg:'#FCEDE9', fg:'#9B2C2C' } };

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ total:0, month:0, count:0 });

  useEffect(() => {
    api.get('/businesses/invoices').then(r => {
      const inv = r.data.invoices || [];
      setInvoices(inv);
      const released = inv.filter(i => i.payment?.status === 'RELEASED');
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      setTotals({
        total: released.reduce((s,i) => s + parseFloat(i.payment?.grossAmount || 0), 0),
        month: released.filter(i => new Date(i.payment?.releasedAt) >= monthStart).reduce((s,i) => s + parseFloat(i.payment?.grossAmount || 0), 0),
        count: released.length,
      });
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding:'28px 32px', fontFamily:'Inter, sans-serif' }}>
      <div style={{ paddingBottom:20, borderBottom:`1px solid ${C.borderSoft}`, marginBottom:28 }}>
        <div style={{ fontSize:11, color:C.bronze, letterSpacing:'0.16em', textTransform:'uppercase', fontWeight:500, marginBottom:6 }}>Billing</div>
        <h1 style={{ fontFamily:'Fraunces, serif', fontSize:30, fontWeight:500, margin:0, letterSpacing:'-0.02em' }}>Invoices</h1>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:0, marginBottom:28, background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, overflow:'hidden' }}>
        {[['Total spent (all time)', totals.total.toFixed(0) + ' XOF', `${totals.count} deliveries`],
          ['This month', totals.month.toFixed(0) + ' XOF', 'Confirmed'],
          ['Avg per delivery', totals.count > 0 ? (totals.total/totals.count).toFixed(0) + ' XOF' : '—', 'Average'],
        ].map(([l,v,s], i) => (
          <div key={l} style={{ padding:'20px 22px', borderRight:i<2?`1px solid ${C.borderSoft}`:'none' }}>
            <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:600, marginBottom:10 }}>{l}</div>
            <div style={{ fontFamily:'Fraunces, serif', fontSize:26, fontWeight:500, letterSpacing:'-0.02em', lineHeight:1 }}>{v}</div>
            <div style={{ fontSize:12, color:C.subtle, marginTop:6 }}>{s}</div>
          </div>
        ))}
      </div>

      <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, overflow:'hidden' }}>
        {loading ? <div style={{ padding:48, textAlign:'center', color:C.muted }}>Loading…</div> : invoices.length === 0 ? (
          <div style={{ padding:48, textAlign:'center', color:C.muted }}>No payment records yet.</div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:C.cream, borderBottom:`1px solid ${C.borderSoft}` }}>
                {['Ref','Route','Amount','Commission','Driver payout','Status','Date'].map(h => (
                  <th key={h} style={{ padding:'10px 18px', textAlign:'left', fontSize:10, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, i) => {
                const p = inv.payment; const j = inv.job;
                const sc = PC[p?.status] || { bg:C.cream, fg:C.muted };
                return (
                  <tr key={p?.id || i} style={{ borderBottom:i<invoices.length-1?`1px solid ${C.borderSoft}`:'none' }}>
                    <td style={{ padding:'13px 18px', fontFamily:'monospace', fontSize:11, color:C.subtle }}>{j?.trackingToken}</td>
                    <td style={{ padding:'13px 18px', fontSize:13, color:C.ink, maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {j?.pickupCity || j?.pickupAddress?.split(',')[0]} → {j?.dropoffCity || j?.dropoffAddress?.split(',')[0]}
                    </td>
                    <td style={{ padding:'13px 18px', fontFamily:'Fraunces, serif', fontSize:14, fontWeight:500, color:C.forest }}>{p?.grossAmount} {p?.currency}</td>
                    <td style={{ padding:'13px 18px', fontSize:13, color:C.muted }}>{p?.commissionAmount} {p?.currency}</td>
                    <td style={{ padding:'13px 18px', fontSize:13, color:C.muted }}>{p?.driverPayout} {p?.currency}</td>
                    <td style={{ padding:'13px 18px' }}><span style={{ background:sc.bg, color:sc.fg, padding:'3px 10px', borderRadius:3, fontSize:11, fontWeight:500 }}>{PS[p?.status] || p?.status}</span></td>
                    <td style={{ padding:'13px 18px', fontSize:12, color:C.subtle }}>{p?.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
