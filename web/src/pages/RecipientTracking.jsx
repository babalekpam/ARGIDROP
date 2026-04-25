// Public recipient tracking page — accessed via SMS link
// QR is only revealed after PIN verification (last 4 digits of recipient phone)
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../utils/api';

const C = { cream: '#F7F3EB', paper: '#FDFBF6', forest: '#1B4332', forestSoft: '#2D5E3E', bronze: '#8B6F47', ink: '#1A1A1A', muted: '#6B6560', subtle: '#9A9489', border: '#E4DCC9', borderSoft: '#EFE8D7', error: '#B91C1C' };

export default function RecipientTracking() {
  const { deliveryCode } = useParams();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  const [pin, setPin] = useState('');
  const [qrImage, setQrImage] = useState(null);
  const [pinError, setPinError] = useState(null);
  const [pinLoading, setPinLoading] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/scans/r/${deliveryCode}`);
        setData(res.data.tracking);
        setStatus(res.data.tracking.status);
      } catch (err) {
        setError(err.response?.data?.message || 'Tracking link not found');
      }
    };
    load();

    const socket = io(import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5000');
    socket.emit('join:tracking', deliveryCode);
    socket.on('job:status_change', ({ status }) => {
      setStatus(status);
      load();
    });
    return () => socket.disconnect();
  }, [deliveryCode]);

  const handleVerifyPin = async (e) => {
    e.preventDefault();
    setPinError(null);
    setPinLoading(true);
    try {
      const res = await api.post(`/scans/r/${deliveryCode}/verify`, { pin });
      setQrImage(res.data.qrImage);
      setPinVerified(true);
    } catch (err) {
      setPinError(err.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setPinLoading(false);
    }
  };

  if (error) return (
    <div style={s.errorWrap}>
      <div style={s.errorCard}>
        <div style={{ fontSize: 48, color: C.bronze }}>—</div>
        <h1 style={s.errorTitle}>{error}</h1>
        <p style={{ color: C.muted, fontSize: 14 }}>Check the link you received by SMS, or contact the sender.</p>
      </div>
    </div>
  );

  if (!data) return <div style={s.loading}>Chargement…</div>;

  const isDelivered = status === 'DELIVERED' || status === 'COMPLETED';

  return (
    <div style={s.container}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600&family=Inter:wght@400;500;600&display=swap');
        body, html, #root { margin: 0; padding: 0; background: ${C.cream}; font-family: 'Inter', sans-serif; }
        @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
      `}</style>

      <div style={s.header}>
        <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: 22, color: C.forest, letterSpacing: '-0.01em' }}>ArgiDrop</div>
        <div style={{ fontSize: 10, color: C.bronze, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 600, marginTop: 2 }}>Livraison en cours</div>
      </div>

      <div style={s.content}>
        {/* Status banner */}
        <div style={{ ...s.statusBanner, background: isDelivered ? C.forest : C.paper, color: isDelivered ? C.paper : C.ink }}>
          {isDelivered ? (
            <>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 500 }}>Colis livré</div>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>{new Date(data.deliveredAt).toLocaleString('fr-FR')}</div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.forest, animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.forest, fontWeight: 600 }}>Livraison active</span>
              </div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 500, color: C.ink, marginBottom: 4 }}>
                Votre colis est en route
              </div>
              <div style={{ fontSize: 13, color: C.muted }}>
                {data.driver?.firstName ? `${data.driver.firstName} vous l'apporte` : 'Un livreur vérifié vous l\'apporte'}
              </div>
            </>
          )}
        </div>

        {/* QR section — gated behind PIN */}
        {!isDelivered && (
          <div style={s.qrCard}>
            <div style={{ fontSize: 11, color: C.bronze, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>À la livraison</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 500, marginBottom: 14, color: C.ink }}>
              Montrez ce QR au livreur
            </div>

            {pinVerified && qrImage ? (
              <>
                <img src={qrImage} alt="Delivery QR" style={{ width: '85%', maxWidth: 320, margin: '0 auto', display: 'block' }} />
                <div style={{ fontSize: 12, color: C.muted, marginTop: 16, lineHeight: 1.5 }}>
                  Le livreur scannera ce code pour confirmer votre livraison. Une fois scanné, le paiement est automatiquement débloqué.
                </div>
              </>
            ) : data.requiresPin ? (
              <form onSubmit={handleVerifyPin} style={{ marginTop: 8 }}>
                <p style={{ fontSize: 13, color: C.muted, marginBottom: 16, lineHeight: 1.5 }}>
                  Entrez les 4 derniers chiffres de votre numéro de téléphone pour afficher votre QR de livraison.
                </p>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  placeholder="_ _ _ _"
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  style={s.pinInput}
                  autoComplete="off"
                />
                {pinError && (
                  <div style={{ fontSize: 12, color: C.error, marginTop: 8 }}>{pinError}</div>
                )}
                <button
                  type="submit"
                  disabled={pin.length !== 4 || pinLoading}
                  style={{ ...s.pinBtn, opacity: pin.length !== 4 || pinLoading ? 0.5 : 1 }}
                >
                  {pinLoading ? 'Vérification…' : 'Afficher mon QR'}
                </button>
              </form>
            ) : (
              <div style={{ fontSize: 13, color: C.muted, padding: '12px 0', lineHeight: 1.6 }}>
                Le QR de livraison n'est pas disponible pour cette commande. Contactez l'expéditeur pour plus d'informations.
              </div>
            )}
          </div>
        )}

        {/* Driver card */}
        {data.driver && !isDelivered && (
          <div style={s.driverCard}>
            <div style={{ fontSize: 10, color: C.bronze, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 12 }}>Votre livreur</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={s.driverAvatar}>
                {data.driver.firstName?.[0]?.toUpperCase() || '?'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 500, color: C.ink }}>
                  {data.driver.firstName}
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
                  {data.driver.rating ? `${parseFloat(data.driver.rating).toFixed(1)} ★ · ` : ''}
                  {vehicleLabel(data.driver.vehicleType)}
                  {data.driver.vehicleColor ? ` · ${data.driver.vehicleColor}` : ''}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dropoff city */}
        {data.dropoffCity && (
          <div style={s.addressCard}>
            <div style={{ display: 'flex', gap: 14 }}>
              <div style={{ width: 3, background: C.forest, borderRadius: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 10, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500 }}>Ville de livraison</div>
                <div style={{ fontSize: 13, color: C.ink, marginTop: 4, lineHeight: 1.4 }}>{data.dropoffCity}</div>
              </div>
            </div>
          </div>
        )}

        <div style={s.footer}>
          Powered by <span style={{ fontFamily: 'Fraunces, serif', color: C.forest, fontWeight: 500 }}>ArgiDrop</span>
        </div>
      </div>
    </div>
  );
}

function vehicleLabel(type) {
  const map = { BICYCLE: 'Vélo', MOTORCYCLE: 'Moto', TRICYCLE: 'Tricycle', CAR: 'Voiture', VAN: 'Camionnette', TRUCK: 'Camion' };
  return map[type] || type;
}

const s = {
  container: { minHeight: '100vh', background: C.cream },
  header: { background: C.paper, borderBottom: `1px solid ${C.border}`, padding: '18px 20px', textAlign: 'center' },
  content: { maxWidth: 480, margin: '0 auto', padding: 20 },
  statusBanner: { border: `1px solid ${C.border}`, borderRadius: 8, padding: '26px 20px', marginBottom: 16, textAlign: 'center' },
  qrCard: { background: C.paper, border: `1px solid ${C.border}`, borderRadius: 8, padding: 24, marginBottom: 16, textAlign: 'center' },
  driverCard: { background: C.paper, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20, marginBottom: 16 },
  driverAvatar: { width: 52, height: 52, borderRadius: 6, background: C.forest, color: C.paper, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 500 },
  addressCard: { background: C.paper, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20, marginBottom: 24 },
  footer: { textAlign: 'center', fontSize: 12, color: C.subtle, padding: '16px 0 40px' },
  loading: { minHeight: '100vh', background: C.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontFamily: 'Inter, sans-serif' },
  errorWrap: { minHeight: '100vh', background: C.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'Inter, sans-serif' },
  errorCard: { background: C.paper, border: `1px solid ${C.border}`, borderRadius: 8, padding: 32, textAlign: 'center', maxWidth: 400 },
  errorTitle: { fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 500, color: C.ink, margin: '12px 0 8px' },
  pinInput: { width: '100%', maxWidth: 160, fontSize: 28, fontFamily: 'monospace', letterSpacing: '0.4em', textAlign: 'center', padding: '12px 8px', border: `1px solid ${C.border}`, borderRadius: 6, background: C.cream, color: C.ink, outline: 'none', boxSizing: 'border-box' },
  pinBtn: { marginTop: 16, width: '100%', maxWidth: 240, padding: '12px 0', background: C.forest, color: C.paper, border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
};
