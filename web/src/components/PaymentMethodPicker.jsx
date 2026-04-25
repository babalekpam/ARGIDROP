// PaymentMethodPicker — fetches the ordered list of payment providers for a
// given country from /api/v1/payments/providers and renders a radio-card
// selector with each provider's brand color and a "Demo" badge when the
// provider has no live API credentials configured server-side.

import React, { useEffect, useState } from 'react';
import api from '../utils/api';

const C = { paper: '#FDFBF6', forest: '#1B4332', ink: '#1A1A1A', muted: '#6B6560', border: '#E4DCC9', subtle: '#9A9489' };

export default function PaymentMethodPicker({ country = 'TG', value, onChange }) {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get(`/payments/providers?country=${country}`)
      .then(res => {
        if (cancelled) return;
        const list = res.data.providers || [];
        setProviders(list);
        // Auto-select the default if nothing is chosen yet (or current choice unavailable).
        const valid = list.find(p => p.code === value);
        if (!valid && list.length && onChange) onChange(res.data.defaultProvider || list[0].code);
      })
      .catch(err => !cancelled && setError(err.response?.data?.message || 'Could not load payment options'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [country]);

  if (loading) return <div style={{ fontSize: 13, color: C.muted, padding: '8px 0' }}>Loading payment options…</div>;
  if (error) return <div style={{ fontSize: 13, color: '#9B2C2C', padding: '8px 0' }}>{error}</div>;
  if (!providers.length) return <div style={{ fontSize: 13, color: C.muted, padding: '8px 0' }}>No payment providers for this country.</div>;

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {providers.map(p => {
        const selected = value === p.code;
        return (
          <label key={p.code}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: 12,
              border: `1px solid ${selected ? C.forest : C.border}`,
              background: selected ? '#F0EDE0' : 'transparent',
              borderRadius: 6, cursor: 'pointer',
            }}>
            <input type="radio" checked={selected} onChange={() => onChange && onChange(p.code)} />
            {/* color-coded brand badge */}
            <div style={{
              width: 36, height: 36, flexShrink: 0, borderRadius: 6,
              background: p.colors?.bg || '#888', color: p.colors?.fg || '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 12, letterSpacing: '-0.02em',
            }}>{initials(p.displayName)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: C.ink, display: 'flex', alignItems: 'center', gap: 8 }}>
                {p.displayName}
                {!p.live && (
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', background: '#FFF3CD', color: '#7A5C00', borderRadius: 999, letterSpacing: '0.04em' }}>
                    DEMO
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: C.subtle }}>
                {p.live ? 'Live — real payment' : 'Sandbox — simulated confirmation'}
              </div>
            </div>
          </label>
        );
      })}
    </div>
  );
}

function initials(name) {
  if (!name) return '?';
  const parts = name.replace(/[()]/g, '').split(/[\s—-]+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
