// Admin Live Operations Map — real-time drivers + active jobs
import React, { useEffect, useRef, useState } from 'react';
import api from '../../utils/api';

const C = { cream: '#F7F3EB', paper: '#FDFBF6', forest: '#1B4332', forestSoft: '#2D5E3E', bronze: '#8B6F47', ink: '#1A1A1A', muted: '#6B6560', subtle: '#9A9489', border: '#E4DCC9', success: '#2D5E3E', warn: '#B87333', alert: '#9B2C2C' };

export default function LiveMap() {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const refreshRef = useRef(null);

  const load = async () => {
    try { const res = await api.get('/admin/live-map'); setData(res.data); } catch {}
  };

  useEffect(() => {
    load();
    refreshRef.current = setInterval(load, 15000);
    return () => clearInterval(refreshRef.current);
  }, []);

  if (!data) return <div style={{ padding: 48, color: C.muted }}>Loading operations map…</div>;

  const drivers = data.drivers || [];
  const activeJobs = data.activeJobs || [];
  const postedJobs = data.postedJobs || [];

  const allPoints = [
    ...drivers.filter(d => d.lat && d.lng).map(d => ({ lat: parseFloat(d.lat), lng: parseFloat(d.lng) })),
    ...activeJobs.flatMap(j => [{ lat: parseFloat(j.pickupLat), lng: parseFloat(j.pickupLng) }, { lat: parseFloat(j.dropoffLat), lng: parseFloat(j.dropoffLng) }].filter(p => p.lat && p.lng))
  ];

  const defaultCenter = { lat: 6.1319, lng: 1.2228 };
  const center = allPoints.length > 0 ? {
    lat: allPoints.reduce((s, p) => s + p.lat, 0) / allPoints.length,
    lng: allPoints.reduce((s, p) => s + p.lng, 0) / allPoints.length,
  } : defaultCenter;

  const SIZE = 900, HEIGHT = 640;
  const spread = allPoints.length > 1 ? Math.max(
    Math.max(...allPoints.map(p => Math.abs(p.lat - center.lat))),
    Math.max(...allPoints.map(p => Math.abs(p.lng - center.lng)))
  ) * 1.3 : 0.05;

  const project = (lat, lng) => ({
    x: SIZE / 2 + ((lng - center.lng) / spread) * (SIZE / 2 - 40),
    y: HEIGHT / 2 - ((lat - center.lat) / spread) * (HEIGHT / 2 - 40),
  });

  return (
    <div style={{ padding: '24px 32px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ paddingBottom: 20, borderBottom: `1px solid ${C.border}`, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 11, color: C.bronze, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>
            Operations · Live
          </div>
          <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 30, fontWeight: 500, margin: 0, letterSpacing: '-0.02em' }}>Platform map</h1>
          <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 13, color: C.muted }}>
            <span><strong style={{ color: C.forest }}>{drivers.length}</strong> drivers online</span>
            <span><strong style={{ color: C.forest }}>{activeJobs.length}</strong> in transit</span>
            <span><strong style={{ color: C.bronze }}>{postedJobs.length}</strong> awaiting driver</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['ALL', 'DRIVERS', 'ACTIVE', 'POSTED'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ background: filter === f ? C.forest : 'transparent', color: filter === f ? C.paper : C.muted, border: `1px solid ${filter === f ? C.forest : C.border}`, borderRadius: 4, padding: '6px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
        <div style={{ background: C.paper, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden', position: 'relative', minHeight: HEIGHT }}>
          <svg viewBox={`0 0 ${SIZE} ${HEIGHT}`} style={{ width: '100%', height: HEIGHT, display: 'block' }}>
            <defs>
              <pattern id="liveGrid" width="48" height="48" patternUnits="userSpaceOnUse">
                <path d="M 48 0 L 0 0 0 48" fill="none" stroke={C.border} strokeWidth="0.6" />
              </pattern>
            </defs>
            <rect width={SIZE} height={HEIGHT} fill="#FBF7EE" />
            <rect width={SIZE} height={HEIGHT} fill="url(#liveGrid)" />

            {(filter === 'ALL' || filter === 'ACTIVE') && activeJobs.map(j => {
              if (!j.pickupLat || !j.dropoffLat) return null;
              const a = project(parseFloat(j.pickupLat), parseFloat(j.pickupLng));
              const b = project(parseFloat(j.dropoffLat), parseFloat(j.dropoffLng));
              return (
                <g key={`route-${j.id}`} onClick={() => setSelected({ type: 'job', data: j })} style={{ cursor: 'pointer' }}>
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={C.forest} strokeWidth={j.status === 'IN_TRANSIT' ? 2.5 : 1.5} strokeDasharray={j.status === 'MATCHED' ? '5 4' : '0'} opacity="0.7" />
                  <circle cx={a.x} cy={a.y} r={6} fill={C.bronze} />
                  <circle cx={b.x} cy={b.y} r={6} fill={C.forest} />
                </g>
              );
            })}

            {(filter === 'ALL' || filter === 'POSTED') && postedJobs.map(j => {
              if (!j.pickupLat) return null;
              const p = project(parseFloat(j.pickupLat), parseFloat(j.pickupLng));
              return (
                <g key={`posted-${j.id}`} onClick={() => setSelected({ type: 'posted', data: j })} style={{ cursor: 'pointer' }}>
                  <circle cx={p.x} cy={p.y} r={12} fill={C.bronze} opacity="0.2" />
                  <circle cx={p.x} cy={p.y} r={7} fill={C.bronze} stroke={C.paper} strokeWidth="1.5" />
                </g>
              );
            })}

            {(filter === 'ALL' || filter === 'DRIVERS') && drivers.map(d => {
              if (!d.lat || !d.lng) return null;
              const p = project(parseFloat(d.lat), parseFloat(d.lng));
              const onActive = activeJobs.some(j => j.driverId === d.id);
              return (
                <g key={`driver-${d.id}`} onClick={() => setSelected({ type: 'driver', data: d })} style={{ cursor: 'pointer' }}>
                  <circle cx={p.x} cy={p.y} r={onActive ? 11 : 9} fill={onActive ? C.forest : C.forestSoft} opacity="0.2" />
                  <circle cx={p.x} cy={p.y} r={onActive ? 7 : 5} fill={onActive ? C.forest : C.forestSoft} stroke={C.paper} strokeWidth="1.5" />
                  {onActive && <circle cx={p.x} cy={p.y} r={14} fill="none" stroke={C.forest} strokeWidth="1" opacity="0.3">
                    <animate attributeName="r" values="10;18;10" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
                  </circle>}
                </g>
              );
            })}
          </svg>

          <div style={{ position: 'absolute', bottom: 16, left: 16, background: C.paper, border: `1px solid ${C.border}`, borderRadius: 6, padding: 12, fontSize: 11, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <LegendDot color={C.forest} pulse label={`On delivery (${activeJobs.length})`} />
            <LegendDot color={C.forestSoft} label={`Online, idle (${drivers.filter(d => !activeJobs.some(j => j.driverId === d.id)).length})`} />
            <LegendDot color={C.bronze} label={`Awaiting driver (${postedJobs.length})`} />
          </div>

          <div style={{ position: 'absolute', top: 16, right: 16, background: C.paper, border: `1px solid ${C.border}`, borderRadius: 4, padding: '6px 12px', fontSize: 11, color: C.muted }}>
            Updated {new Date(data.snapshotAt).toLocaleTimeString()}
          </div>
        </div>

        <div style={{ background: C.paper, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
          {!selected ? (
            <div style={{ textAlign: 'center', color: C.muted, padding: '40px 0', fontSize: 13 }}>
              Click anything on the map to see details
            </div>
          ) : selected.type === 'driver' ? (
            <div>
              <div style={{ fontSize: 11, color: C.bronze, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>Driver</div>
              <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 500, margin: '0 0 4px' }}>{selected.data.firstName} {selected.data.lastName}</h3>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>{selected.data.vehicleType} · {selected.data.vehiclePlate || 'No plate'}</div>
              <Row k="Rating" v={`${selected.data.rating || '—'} ★`} />
              <Row k="Online since" v={selected.data.lastLocationAt ? new Date(selected.data.lastLocationAt).toLocaleTimeString() : '—'} />
              <Row k="GPS" v={`${parseFloat(selected.data.lat).toFixed(4)}, ${parseFloat(selected.data.lng).toFixed(4)}`} mono />
            </div>
          ) : selected.type === 'job' ? (
            <div>
              <div style={{ fontSize: 11, color: C.bronze, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>In-flight delivery</div>
              <h3 style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 500, margin: '0 0 12px', letterSpacing: '0.06em' }}>{selected.data.trackingToken}</h3>
              <span style={{ background: selected.data.status === 'IN_TRANSIT' ? '#E8F0EA' : '#FAF3E5', color: selected.data.status === 'IN_TRANSIT' ? C.forest : C.bronze, padding: '3px 10px', borderRadius: 3, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', display: 'inline-block', marginBottom: 12 }}>
                {selected.data.status === 'IN_TRANSIT' ? 'IN TRANSIT' : 'HEADING TO PICKUP'}
              </span>
              <Row k="From" v={selected.data.pickupAddress} />
              <Row k="To" v={selected.data.dropoffAddress} />
              <Row k="Price" v={`${selected.data.priceOffered} ${selected.data.currency}`} />
              <Row k="Matched" v={selected.data.matchedAt ? new Date(selected.data.matchedAt).toLocaleTimeString() : '—'} />
              {selected.data.pickedUpAt && <Row k="Picked up" v={new Date(selected.data.pickedUpAt).toLocaleTimeString()} />}
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 11, color: C.bronze, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>Awaiting driver</div>
              <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 500, margin: '0 0 12px' }}>Posted job</h3>
              <Row k="Pickup" v={selected.data.pickupAddress} />
              <Row k="Price" v={`${selected.data.priceOffered} ${selected.data.currency}`} />
              <Row k="Posted" v={new Date(selected.data.createdAt).toLocaleTimeString()} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, label, pulse }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', boxShadow: pulse ? `0 0 0 3px ${color}33` : 'none' }} />
      <span style={{ color: C.muted, fontSize: 11 }}>{label}</span>
    </div>
  );
}
function Row({ k, v, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #EFE8D7', fontSize: 13 }}>
      <span style={{ color: C.muted }}>{k}</span>
      <span style={{ color: C.ink, fontWeight: 500, textAlign: 'right', marginLeft: 12, fontFamily: mono ? 'monospace' : 'inherit', fontSize: mono ? 12 : 13 }}>{v}</span>
    </div>
  );
}
