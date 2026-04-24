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
    // Fallback to Africa's Talking
    if (process.env.AT_API_KEY) {
      try {
        const AfricasTalking = require('africastalking');
        const at = AfricasTalking({ apiKey: process.env.AT_API_KEY, username: process.env.AT_USERNAME });
        await at.SMS.send({ to: [phone], message, from: process.env.AT_SENDER_ID });
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
