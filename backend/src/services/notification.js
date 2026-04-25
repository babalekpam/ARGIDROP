const axios = require('axios');

async function sendPushNotification(fcmToken, title, body, data = {}) {
  if (!fcmToken || !process.env.FCM_SERVER_KEY) return;
  try {
    await axios.post('https://fcm.googleapis.com/fcm/send', {
      to: fcmToken,
      notification: { title, body, sound: 'default', badge: '1' },
      data: { ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' }
    }, {
      headers: { Authorization: `key=${process.env.FCM_SERVER_KEY}`, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('FCM error:', err.response?.data || err.message);
  }
}

async function sendSMS(phone, message) {
  if (!process.env.TWILIO_ACCOUNT_SID) return;
  try {
    const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await twilio.messages.create({ body: message, from: process.env.TWILIO_PHONE_NUMBER, to: phone });
  } catch (err) {
    console.error('SMS error:', err.message);
    // Fallback to Africa's Talking via direct REST call (no SDK to avoid
    // pulling vulnerable transitive deps).
    if (process.env.AT_API_KEY) {
      try {
        const params = new URLSearchParams({
          username: process.env.AT_USERNAME || 'sandbox',
          to: phone,
          message,
        });
        if (process.env.AT_SENDER_ID) params.set('from', process.env.AT_SENDER_ID);
        const isSandbox = (process.env.AT_USERNAME || 'sandbox') === 'sandbox';
        const url = isSandbox
          ? 'https://api.sandbox.africastalking.com/version1/messaging'
          : 'https://api.africastalking.com/version1/messaging';
        await axios.post(url, params.toString(), {
          headers: {
            apiKey: process.env.AT_API_KEY,
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
        });
      } catch (atErr) {
        console.error('AT SMS error:', atErr.message);
      }
    }
  }
}

async function sendEmail(to, subject, htmlBody) {
  if (!process.env.SENDGRID_API_KEY) return;
  try {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    await sgMail.send({ to, from: { email: process.env.FROM_EMAIL || 'noreply@argidrop.app', name: 'ARGIDROP' }, subject, html: htmlBody });
  } catch (err) {
    console.error('Email error:', err.message);
  }
}

module.exports = { sendPushNotification, sendSMS, sendEmail };
