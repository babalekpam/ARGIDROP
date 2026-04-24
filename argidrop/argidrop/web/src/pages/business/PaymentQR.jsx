// Payment QR screen — business scans with MoMo app to pay for delivery
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';

const C = { cream: '#F7F3EB', paper: '#FDFBF6', forest: '#1B4332', bronze: '#8B6F47', ink: '#1A1A1A', muted: '#6B6560', border: '#E4DCC9' };

export default function PaymentQR() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [timeLeft, setTimeLeft] = useState(900); // 15 min
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const load = async () => {
      const res = await api.get(`/jobs/${id}`);
      setJob(res.data.job || res.data);
      if (res.data.job?.status === 'POSTED') { setConfirmed(true); setTimeout(() => navigate(`/dashboard/jobs/${id}`), 2000); }
    };
    load();
    const poll = setInterval(load, 3000); // poll every 3s for payment confirmation
    return () => clearInterval(poll);
  }, [id, navigate]);

  useEffect(() => {
    const t = setInterval(() => setTimeLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  if (!job) return <div style={{ padding: 48, textAlign: 'center', color: C.muted }}>Loading...</div>;

  if (confirmed) return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>✓</div>
      <h1 style={{ fontFamily: 'Fraunces', fontSize: 28, fontWeight: 500, color: C.forest, marginBottom: 8 }}>Payment confirmed</h1>
      <p style={{ color: C.muted }}>Finding a driver for your delivery…</p>
    </div>
  );

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const qrImage = job.paymentQrImage || ''; // will come from create response in production

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: 32 }}>
      <div style={{ fontSize: 11, color: C.bronze, letterSpacing: '0.16em', fontWeight: 500, textTransform: 'uppercase', marginBottom: 8, textAlign: 'center' }}>
        Awaiting Payment
      </div>
      <h1 style={{ fontFamily: 'Fraunces', fontSize: 28, fontWeight: 500, textAlign: 'center', margin: 0, marginBottom: 4, letterSpacing: '-0.02em' }}>
        Scan to pay
      </h1>
      <p style={{ color: C.muted, textAlign: 'center', fontSize: 14, margin: 0, marginBottom: 28 }}>
        Open your mobile money app and scan the QR below
      </p>

      {/* Timer */}
      <div style={{ background: timeLeft < 60 ? '#FEF3E8' : C.cream, border: `1px solid ${timeLeft < 60 ? '#E8A94A' : C.border}`, borderRadius: 6, padding: '12px 16px', textAlign: 'center', marginBottom: 20 }}>
        <span style={{ fontSize: 12, color: C.muted }}>Code expires in </span>
        <span style={{ fontFamily: 'Fraunces', fontSize: 16, fontWeight: 500, color: timeLeft < 60 ? '#B87333' : C.forest }}>
          {mins}:{secs.toString().padStart(2, '0')}
        </span>
      </div>

      {/* QR */}
      <div style={{ background: C.paper, border: `1px solid ${C.border}`, borderRadius: 8, padding: 32, textAlign: 'center', marginBottom: 20 }}>
        {qrImage ? (
          <img src={qrImage} alt="Payment QR" style={{ width: 280, height: 280, margin: '0 auto' }} />
        ) : (
          <div style={{ width: 280, height: 280, margin: '0 auto', background: C.cream, border: `1px dashed ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 13 }}>
            QR code will appear here
          </div>
        )}
        <div style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Amount</div>
          <div style={{ fontFamily: 'Fraunces', fontSize: 32, fontWeight: 500, color: C.forest }}>
            {job.priceOffered} {job.currency}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 1.6 }}>
        After payment, your delivery will be broadcast to nearby drivers automatically.
      </div>
    </div>
  );
}
