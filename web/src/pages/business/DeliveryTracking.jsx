// Business real-time tracking view for their own active delivery
import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../../utils/api';
import MapView from '../../components/MapView';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9', borderSoft:'#EFE8D7' };

export default function DeliveryTracking() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [driver, setDriver] = useState(null);
  const [driverPos, setDriverPos] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    api.get(`/jobs/${id}`).then(r => {
      setJob(r.data.job || r.data);
      if (r.data.driver) setDriver(r.data.driver);
    });

    const token = localStorage.getItem('argidrop_token');
    const socket = io(import.meta.env.VITE_API_URL?.replace('/api/v1','') || 'http://localhost:5000', { auth:{ token } });
    socketRef.current = socket;
    socket.emit('join:job', id);
    const handleLoc = pos => {
      const lat = parseFloat(pos?.lat); const lng = parseFloat(pos?.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) setDriverPos({ lat, lng });
    };
    socket.on('driver:location_update', handleLoc);
    socket.on('driver:location', handleLoc);
    socket.on('job:status_change', ({ status }) => setJob(j => j ? { ...j, status } : j));
    return () => socket.disconnect();
  }, [id]);

  if (!job) return <div style={{ padding:48, color:C.muted, fontFamily:'Inter, sans-serif' }}>Loading…</div>;

  const STATUS_LABELS = { MATCHED:'Driver en route to pickup', IN_TRANSIT:'Package in transit', DELIVERED:'Delivered', COMPLETED:'Completed' };
  const statusLabel = STATUS_LABELS[job.status] || job.status;

  return (
    <div style={{ padding:'28px 32px', fontFamily:'Inter, sans-serif' }}>
      <div style={{ marginBottom:20 }}>
        <Link to={`/dashboard/jobs/${id}`} style={{ color:C.muted, fontSize:13, textDecoration:'none' }}>← Job detail</Link>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'360px 1fr', gap:20 }}>
        <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, padding:24 }}>
          <div style={{ fontSize:11, color:C.bronze, letterSpacing:'0.16em', textTransform:'uppercase', fontWeight:500, marginBottom:6 }}>Live tracking</div>
          <h2 style={{ fontFamily:'Fraunces, serif', fontSize:20, fontWeight:500, margin:'0 0 16px', letterSpacing:'-0.015em' }}>{statusLabel}</h2>

          <div style={{ background:C.cream, borderRadius:6, padding:14, marginBottom:14, border:`1px solid ${C.borderSoft}` }}>
            <div style={{ fontSize:11, fontFamily:'monospace', color:C.subtle, letterSpacing:'0.1em', marginBottom:4 }}>{job.trackingToken}</div>
            <div style={{ display:'flex', gap:8, marginTop:8 }}>
              {['MATCHED','IN_TRANSIT','DELIVERED'].map((s,i) => (
                <React.Fragment key={s}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:['MATCHED','IN_TRANSIT','DELIVERED','COMPLETED'].indexOf(job.status) >= i ? C.forest : C.border }} />
                  {i<2 && <div style={{ flex:1, height:1, background:['IN_TRANSIT','DELIVERED','COMPLETED'].includes(job.status) && i===0 ? C.forest : C.border, alignSelf:'center' }} />}
                </React.Fragment>
              ))}
            </div>
          </div>

          {driver && (
            <div style={{ border:`1px solid ${C.border}`, borderRadius:6, padding:14, marginBottom:14 }}>
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <div style={{ width:38, height:38, borderRadius:4, background:C.forest, color:C.paper, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Fraunces, serif', fontSize:16 }}>
                  {driver.firstName?.[0] || 'D'}
                </div>
                <div>
                  <div style={{ fontSize:14, fontWeight:500, color:C.ink }}>{driver.firstName}</div>
                  <div style={{ fontSize:12, color:C.muted }}>{driver.rating} ★ · {driver.vehicleType}</div>
                </div>
                {driver.vehiclePlate && (
                  <div style={{ marginLeft:'auto', fontFamily:'monospace', fontSize:11, background:C.cream, border:`1px solid ${C.border}`, borderRadius:3, padding:'3px 8px' }}>{driver.vehiclePlate}</div>
                )}
              </div>
            </div>
          )}

          {[['Pickup', job.pickupAddress, C.bronze], ['Dropoff', job.dropoffAddress, C.forest]].map(([l,a,c]) => (
            <div key={l} style={{ display:'flex', gap:10, marginBottom:10 }}>
              <div style={{ width:4, background:c, borderRadius:2, flexShrink:0 }} />
              <div>
                <div style={{ fontSize:10, color:C.muted, textTransform:'uppercase', letterSpacing:'0.1em', fontWeight:600 }}>{l}</div>
                <div style={{ fontSize:13, color:C.ink, marginTop:2 }}>{a}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Real map */}
        <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, overflow:'hidden', position:'relative', minHeight:520 }}>
          {(() => {
            const pLat = parseFloat(job.pickupLat), pLng = parseFloat(job.pickupLng);
            const dLat = parseFloat(job.dropoffLat), dLng = parseFloat(job.dropoffLng);
            const dr = driverPos && Number.isFinite(driverPos.lat) && Number.isFinite(driverPos.lng) ? driverPos : null;
            const markers = [];
            if (Number.isFinite(pLat) && Number.isFinite(pLng)) markers.push({ lng: pLng, lat: pLat, color: C.bronze, size: 18, label: 'Pickup' });
            if (Number.isFinite(dLat) && Number.isFinite(dLng)) markers.push({ lng: dLng, lat: dLat, color: C.forest, size: 18, label: 'Dropoff' });
            if (dr) markers.push({ lng: dr.lng, lat: dr.lat, color: '#2563EB', size: 16, pulse: true, label: 'Driver' });
            const routes = [];
            if (markers.length >= 2) routes.push({ coords: markers.map(m => [m.lng, m.lat]), color: C.forest, width: 3, opacity: 0.6, dashed: true });
            return <MapView markers={markers} routes={routes} fitToMarkers height={520} />;
          })()}
          <div style={{ position:'absolute', top:16, left:16, background:C.paper, border:`1px solid ${C.border}`, borderRadius:4, padding:'6px 12px', fontSize:12, display:'flex', alignItems:'center', gap:8, zIndex:5 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:C.forest, display:'inline-block' }} />
            <span style={{ color:C.ink, fontWeight:500 }}>{statusLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
