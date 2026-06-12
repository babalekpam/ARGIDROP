/**
 * WhatsApp Business API Service
 * Primary: Twilio WhatsApp Sandbox
 * Fallback: WhatsApp Business Cloud API
 *
 * Env vars required:
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER
 *   WHATSAPP_TOKEN, WHATSAPP_PHONE_ID
 */

const axios = require('axios');

// ── Internal senders ───────────────────────────────────────────────────────

const sendViaTwilio = async (phone, message) => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_NUMBER;
  if (!sid || !token || !from) throw new Error('Twilio credentials not configured');

  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const params = new URLSearchParams();
  params.append('From', `whatsapp:${from}`);
  params.append('To', `whatsapp:${phone}`);
  params.append('Body', message);

  await axios.post(url, params, {
    auth: { username: sid, password: token },
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 10000,
  });
};

const sendViaCloudAPI = async (phone, message) => {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) throw new Error('WhatsApp Cloud API credentials not configured');

  await axios.post(
    `https://graph.facebook.com/v18.0/${phoneId}/messages`,
    { messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: message } },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, timeout: 10000 }
  );
};

// ── Public API ─────────────────────────────────────────────────────────────

const sendWhatsApp = async (phone, message) => {
  try {
    await sendViaTwilio(phone, message);
    return true;
  } catch (twilioErr) {
    console.error('[WhatsApp/Twilio] Failed:', twilioErr.message);
  }
  try {
    await sendViaCloudAPI(phone, message);
    return true;
  } catch (cloudErr) {
    console.error('[WhatsApp/CloudAPI] Failed:', cloudErr.message);
  }
  return false;
};

const sendDeliveryUpdate = async (phone, { trackingToken, status, driverName, eta }) => {
  const message =
    `🚚 *Mise à jour de livraison ARGIDROP*\n\n` +
    `📦 Référence: *${trackingToken}*\n` +
    `📍 Statut: *${status}*\n` +
    `👤 Livreur: *${driverName}*\n` +
    `⏱️ Heure estimée d'arrivée: *${eta}*\n\n` +
    `Merci de faire confiance à ARGIDROP! 🌍`;
  try { return await sendWhatsApp(phone, message); } catch { return false; }
};

const sendJobMatched = async (phone, { trackingToken, driverName, vehicle, eta }) => {
  const message =
    `✅ *Livreur assigné — ARGIDROP*\n\n` +
    `Votre commande *${trackingToken}* a été prise en charge!\n\n` +
    `👤 Livreur: *${driverName}*\n` +
    `🛵 Véhicule: *${vehicle}*\n` +
    `⏱️ Arrivée prévue: *${eta}*\n\n` +
    `Restez disponible pour réceptionner votre colis. 📬`;
  try { return await sendWhatsApp(phone, message); } catch { return false; }
};

const sendPaymentReceived = async (phone, { amount, currency, jobRef }) => {
  const message =
    `💰 *Paiement confirmé — ARGIDROP*\n\n` +
    `Nous avons bien reçu votre paiement.\n\n` +
    `🧾 Référence commande: *${jobRef}*\n` +
    `💵 Montant: *${amount.toLocaleString('fr-FR')} ${currency}*\n\n` +
    `Merci pour votre confiance! 🙏\n` +
    `_ARGIDROP — Livraison rapide en Afrique de l'Ouest_`;
  try { return await sendWhatsApp(phone, message); } catch { return false; }
};

const sendDriverWelfare = async (phone, { driverName, guaranteeAmount, currency, periodEnd }) => {
  const message =
    `🤝 *Garantie de revenus — ARGIDROP*\n\n` +
    `Bonjour *${driverName}*,\n\n` +
    `Nous avons détecté que vos gains de cette période n'ont pas atteint le seuil garanti.\n\n` +
    `💳 Complément versé: *${guaranteeAmount.toLocaleString('fr-FR')} ${currency}*\n` +
    `📅 Fin de période: *${periodEnd}*\n\n` +
    `Ce montant a été ajouté à votre solde ARGIDROP. Continuez le bon travail! 💪\n` +
    `_L'équipe ARGIDROP vous remercie_`;
  try { return await sendWhatsApp(phone, message); } catch { return false; }
};

module.exports = { sendWhatsApp, sendDeliveryUpdate, sendJobMatched, sendPaymentReceived, sendDriverWelfare };
