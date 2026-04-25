// Admin Live Operations Map — real-time drivers + active jobs
import React, { useEffect, useRef, useState } from 'react';
import api from '../../utils/api';
import MapView from '../../components/MapView';

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
  const HEIGHT = 640;

  const markers = [];
  const routes = [];

  if (filter === 'ALL' || filter === 'ACTIVE') {
    activeJobs.forEach(j => {
      const a = { lng: parseFloat(j.pickupLng), lat: parseFloat(j.pickupLat) };
      const b = { lng: parseFloat(j.dropoffLng), lat: parseFloat(j.dropoffLat) };
      if (Number.isFinite(a.lng) && Number.isFinite(a.lat) && Number.isFinite(b.lng) && Number.isFinite(b.lat)) {
        routes.push({ coords: [[a.lng, a.lat], [b.lng, b.lat]], color: C.forest, width: j.status === 'IN_TRANSIT' ? 3 : 2, opacity: 0.6, dashed: j.status !== 'IN_TRANSIT' });
        markers.push({ lng: a.lng, lat: a.lat, color: C.bronze, size: 12, onClick: () => setSelected({ type: 'job', data: j }) });
        markers.push({ lng: b.lng, lat: b.lat, color: C.forest, size: 12, onClick: () => setSelected({ type: 'job', data: j }) });
      }
    });
  }

  if (filter === 'ALL' || filter === 'POSTED') {
    postedJobs.forEach(j => {
      const lng = parseFloat(j.pickupLng), lat = parseFloat(j.pickupLat);
      if (Number.isFinite(lng) && Number.isFinite(lat)) {
        markers.push({ lng, lat, color: C.bronze, size: 14, onClick: () => setSelected({ type: 'posted', data: j }) });
      }
    });
  }

  if (filter === 'ALL' || filter === 'DRIVERS') {
    drivers.forEach(d => {
      const lng = parseFloat(d.lng), lat = parseFloat(d.lat);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
      const onActive = activeJobs.some(j => j.driverId === d.id);
      markers.push({ lng, lat, color: onActive ? C.forest : C.forestSoft, size: onActive ? 16 : 12, pulse: onActive, onClick: () => setSelected({ type: 'driver', data: d }) });
    });
  }

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
          <MapView markers={markers} routes={routes} fitToMarkers height={HEIGHT} />

          <div style={{ position: 'absolute', bottom: 30, left: 16, background: C.paper, border: `1px solid ${C.border}`, borderRadius: 6, padding: 12, fontSize: 11, display: 'flex', flexDirection: 'column', gap: 6, zIndex: 5 }}>
            <LegendDot color={C.forest} pulse label={`On delivery (${activeJobs.length})`} />
            <LegendDot color={C.forestSoft} label={`Online, idle (${drivers.filter(d => !activeJobs.some(j => j.driverId === d.id)).length})`} />
            <LegendDot color={C.bronze} label={`Awaiting driver (${postedJobs.length})`} />
          </div>

          <div style={{ position: 'absolute', top: 16, left: 16, background: C.paper, border: `1px solid ${C.border}`, borderRadius: 4, padding: '6px 12px', fontSize: 11, color: C.muted, zIndex: 5 }}>
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
