// Pickup QR screen — business shows this to driver at pickup location
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../../utils/api';

const C = { cream: '#F7F3EB', paper: '#FDFBF6', forest: '#1B4332', bronze: '#8B6F47', ink: '#1A1A1A', muted: '#6B6560', border: '#E4DCC9' };

export default function PickupQR() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/scans/jobs/${id}/pickup-qr`);
        setData(res.data);
      } catch (err) {
        setData({ error: err.response?.data?.message || 'Failed to load' });
      }
    };
    load();

    const token = localStorage.getItem('argidrop_token');
    const socket = io(import.meta.env.VITE_API_URL?.replace('/api/v1','') || 'http://localhost:5000', { auth: { token } });
    socket.emit('join:job', id);
    socket.on('job:status_change', ({ status }) => {
      if (status === 'IN_TRANSIT') setScanned(true);
    });
    return () => socket.disconnect();
  }, [id]);

  if (!data) return <div style={{ padding: 48, textAlign: 'center', color: C.muted }}>Loading...</div>;
  if (data.error) return <div style={{ padding: 48, textAlign: 'center', color: '#B87333' }}>{data.error}</div>;

  if (scanned) return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>✓</div>
      <h1 style={{ fontFamily: 'Fraunces', fontSize: 28, fontWeight: 500, color: C.forest, marginBottom: 8 }}>Pickup confirmed</h1>
      <p style={{ color: C.muted }}>The driver is on their way to the recipient.</p>
    </div>
  );

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: 32 }}>
      <div style={{ fontSize: 11, color: C.bronze, letterSpacing: '0.16em', fontWeight: 500, textTransform: 'uppercase', marginBottom: 8, textAlign: 'center' }}>
        Chain of Custody · Scan 2 of 3
      </div>
      <h1 style={{ fontFamily: 'Fraunces', fontSize: 28, fontWeight: 500, textAlign: 'center', margin: 0, marginBottom: 4, letterSpacing: '-0.02em' }}>
        Show this to the driver
      </h1>
      <p style={{ color: C.muted, textAlign: 'center', fontSize: 14, margin: 0, marginBottom: 28 }}>
        When the driver arrives, let them scan this code to confirm pickup
      </p>

      <div style={{ background: C.paper, border: `1px solid ${C.border}`, borderRadius: 8, padding: 32, textAlign: 'center' }}>
        <img src={data.qrImage} alt="Pickup QR" style={{ width: 320, height: 320, margin: '0 auto' }} />
        <div style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Delivery Reference</div>
          <div style={{ fontFamily: 'monospace', fontSize: 14, color: C.ink, letterSpacing: '0.08em' }}>{data.trackingToken}</div>
        </div>
      </div>

      <div style={{ marginTop: 20, padding: 16, background: C.cream, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
        The driver's app verifies this QR and their GPS location against the pickup address. Once scanned, you'll be notified automatically.
      </div>
    </div>
  );
}
