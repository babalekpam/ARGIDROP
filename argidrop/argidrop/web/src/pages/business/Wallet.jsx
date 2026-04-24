// Business Wallet — top up, view balance, transaction history
import React, { useEffect, useState } from 'react';
import api from '../../utils/api';

const C = { cream: '#F7F3EB', paper: '#FDFBF6', forest: '#1B4332', bronze: '#8B6F47', ink: '#1A1A1A', muted: '#6B6560', subtle: '#9A9489', border: '#E4DCC9', success: '#2D5E3E', warn: '#B87333', alert: '#9B2C2C' };

const PROVIDERS = [
  { id: 'FLUTTERWAVE', label: 'Flutterwave', note: 'MoMo, cards, bank' },
  { id: 'PAYSTACK', label: 'Paystack', note: 'Nigeria only' },
];

export default function Wallet() {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [depositing, setDepositing] = useState(false);
  const [depositForm, setDepositForm] = useState({ amount: '', provider: 'FLUTTERWAVE', phone: '' });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [bal, txs] = await Promise.all([
      api.get('/wallets/balance'),
      api.get('/wallets/transactions'),
    ]);
    setWallet(bal.data.wallet);
    setTransactions(txs.data.transactions || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submitDeposit = async (e) => {
    e.preventDefault();
    if (!depositForm.amount || parseFloat(depositForm.amount) < 100) return alert('Minimum deposit: 100 ' + wallet?.currency);
    try {
      const res = await api.post('/wallets/deposit', {
        amount: parseFloat(depositForm.amount),
        provider: depositForm.provider,
        phone: depositForm.phone,
      });
      if (res.data.paymentUrl) {
        window.open(res.data.paymentUrl, '_blank');
        alert('Complete the payment in the new window. This wallet will update automatically once confirmed.');
      }
      setDepositing(false);
      setDepositForm({ amount: '', provider: 'FLUTTERWAVE', phone: '' });
      setTimeout(load, 2000);
    } catch (err) {
      alert(err.response?.data?.message || 'Deposit failed');
    }
  };

  if (loading) return <div style={{ padding: 48, color: C.muted }}>Loading wallet…</div>;

  const available = parseFloat(wallet?.balance || 0) - parseFloat(wallet?.heldBalance || 0);

  return (
    <div style={{ padding: '24px 32px', maxWidth: 960, margin: '0 auto' }}>
      <div style={{ paddingBottom: 20, borderBottom: `1px solid ${C.border}`, marginBottom: 28 }}>
        <div style={{ fontSize: 11, color: C.bronze, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>
          Pre-funded account
        </div>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 30, fontWeight: 500, margin: 0, letterSpacing: '-0.02em' }}>
          Wallet
        </h1>
        <p style={{ color: C.muted, fontSize: 14, margin: '4px 0 0' }}>
          Top up once, post deliveries without a payment prompt each time.
        </p>
      </div>

      {/* Balance card */}
      <div style={{ background: C.paper, border: `1px solid ${C.border}`, borderRadius: 8, padding: 32, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0 }}>
          <div style={{ paddingRight: 24, borderRight: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>Available</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 38, fontWeight: 500, color: C.forest, letterSpacing: '-0.02em', lineHeight: 1 }}>
              {available.toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: C.subtle, marginTop: 6 }}>{wallet?.currency}</div>
          </div>
          <div style={{ padding: '0 24px', borderRight: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>Held</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 500, color: C.bronze, letterSpacing: '-0.02em', lineHeight: 1 }}>
              {parseFloat(wallet?.heldBalance || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: C.subtle, marginTop: 6 }}>Locked for active deliveries</div>
          </div>
          <div style={{ paddingLeft: 24 }}>
            <div style={{ fontSize: 11, color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>Total balance</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 500, color: C.ink, letterSpacing: '-0.02em', lineHeight: 1 }}>
              {parseFloat(wallet?.balance || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: C.subtle, marginTop: 6 }}>
              {wallet?.lastDepositAt ? `Last deposit ${new Date(wallet.lastDepositAt).toLocaleDateString()}` : 'No deposits yet'}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 28, paddingTop: 24, borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10 }}>
          <button onClick={() => setDepositing(true)}
            style={{ background: C.forest, color: C.paper, padding: '11px 22px', borderRadius: 4, fontWeight: 500, fontSize: 14, border: 'none', cursor: 'pointer' }}>
            Top up wallet
          </button>
          <button style={{ background: 'transparent', color: C.ink, padding: '11px 22px', borderRadius: 4, fontWeight: 500, fontSize: 14, border: `1px solid ${C.border}`, cursor: 'pointer' }}>
            Set up auto top-up
          </button>
        </div>
      </div>

      {/* Deposit form modal */}
      {depositing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,26,26,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
          onClick={(e) => e.target === e.currentTarget && setDepositing(false)}>
          <div style={{ background: C.paper, borderRadius: 8, padding: 32, maxWidth: 440, width: '90%' }}>
            <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 500, margin: 0, marginBottom: 4, letterSpacing: '-0.02em' }}>
              Top up wallet
            </h2>
            <p style={{ color: C.muted, fontSize: 13, margin: '0 0 24px' }}>
              Funds arrive instantly once payment is confirmed.
            </p>
            <form onSubmit={submitDeposit}>
              <label style={{ display: 'block', fontSize: 11, color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>
                Amount ({wallet?.currency})
              </label>
              <input type="number" value={depositForm.amount} onChange={e => setDepositForm({ ...depositForm, amount: e.target.value })}
                placeholder="e.g. 20000" required min="100"
                style={{ width: '100%', background: C.cream, border: `1px solid ${C.border}`, borderRadius: 4, padding: '11px 14px', fontSize: 14, marginBottom: 16, fontFamily: 'inherit' }} />

              <label style={{ display: 'block', fontSize: 11, color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>
                Payment provider
              </label>
              {PROVIDERS.map(p => (
                <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, border: `1px solid ${depositForm.provider === p.id ? C.forest : C.border}`, borderRadius: 4, marginBottom: 8, cursor: 'pointer', background: depositForm.provider === p.id ? '#F0EDE0' : 'transparent' }}>
                  <input type="radio" checked={depositForm.provider === p.id} onChange={() => setDepositForm({ ...depositForm, provider: p.id })} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: C.ink }}>{p.label}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{p.note}</div>
                  </div>
                </label>
              ))}

              <label style={{ display: 'block', fontSize: 11, color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6, marginTop: 12 }}>
                Phone number
              </label>
              <input type="tel" value={depositForm.phone} onChange={e => setDepositForm({ ...depositForm, phone: e.target.value })}
                placeholder="+228 90 00 00 00" required
                style={{ width: '100%', background: C.cream, border: `1px solid ${C.border}`, borderRadius: 4, padding: '11px 14px', fontSize: 14, marginBottom: 24, fontFamily: 'inherit' }} />

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setDepositing(false)}
                  style={{ flex: 1, background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 4, padding: '11px 20px', fontWeight: 500, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Cancel
                </button>
                <button type="submit"
                  style={{ flex: 2, background: C.forest, color: C.paper, border: 'none', borderRadius: 4, padding: '11px 20px', fontWeight: 500, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Continue to payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transactions */}
      <div style={{ background: C.paper, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '16px 22px', borderBottom: `1px solid ${C.border}` }}>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500, margin: 0 }}>Recent activity</h3>
        </div>
        {transactions.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: C.muted, fontSize: 13 }}>
            No transactions yet. Top up to get started.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: C.cream, borderBottom: `1px solid ${C.border}` }}>
                {['Type', 'Amount', 'Balance After', 'Description', 'Date'].map(h => (
                  <th key={h} style={{ padding: '10px 22px', textAlign: 'left', fontSize: 10, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 50).map(tx => (
                <tr key={tx.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: '14px 22px' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 3, letterSpacing: '0.04em',
                      background: tx.type === 'DEPOSIT' ? '#E8F0EA' : tx.type === 'HOLD' ? '#FAF3E5' : tx.type === 'RELEASE' ? '#EFE8D7' : tx.type === 'REFUND' ? '#E8F0EA' : C.cream,
                      color: tx.type === 'DEPOSIT' ? C.success : tx.type === 'HOLD' ? C.warn : tx.type === 'RELEASE' ? C.bronze : tx.type === 'REFUND' ? C.success : C.muted,
                    }}>{tx.type}</span>
                  </td>
                  <td style={{ padding: '14px 22px', fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 500, color: tx.type === 'DEPOSIT' || tx.type === 'REFUND' ? C.success : C.ink }}>
                    {tx.type === 'DEPOSIT' || tx.type === 'REFUND' ? '+' : ''}{parseFloat(tx.amount).toLocaleString()} {tx.currency}
                  </td>
                  <td style={{ padding: '14px 22px', fontSize: 13, color: C.muted }}>{parseFloat(tx.balanceAfter).toLocaleString()}</td>
                  <td style={{ padding: '14px 22px', fontSize: 12, color: C.muted }}>{tx.description}</td>
                  <td style={{ padding: '14px 22px', fontSize: 12, color: C.subtle }}>{new Date(tx.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
