const Bull = require('bull');

let queues = {};

async function initQueues() {
  // Redis is optional — queues degrade gracefully if not configured
  if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
    console.log('⚠️  No Redis configured — background queues disabled. Jobs will process synchronously.');
    queues = { notifications: null, payouts: null, jobBroadcast: null };
    return queues;
  }

  const redisConfig = process.env.REDIS_URL
    ? { url: process.env.REDIS_URL }
    : { host: process.env.REDIS_HOST || 'localhost', port: parseInt(process.env.REDIS_PORT || '6379') };

  try {
    queues.notifications = new Bull('notifications', redisConfig);
    queues.payouts = new Bull('payouts', redisConfig);
    queues.jobBroadcast = new Bull('job-broadcast', redisConfig);

    // Notification processor
    queues.notifications.process(async (job) => {
      const { sendPushNotification, sendEmail, sendSMS } = require('../services/notification');
      const { type, data } = job.data;
      if (type === 'push') await sendPushNotification(data.token, data.title, data.body, data.extra);
      if (type === 'email') await sendEmail(data.to, data.subject, data.html);
      if (type === 'sms') await sendSMS(data.phone, data.message);
    });

    // Payout retry processor
    queues.payouts.process(async (job) => {
      const { releasePayment } = require('../services/payment');
      await releasePayment(job.data.jobId);
    });

    // Job broadcast processor
    queues.jobBroadcast.process(async (job) => {
      const { findNearbyDrivers, broadcastJobToDrivers } = require('../services/geo');
      const { jobData } = job.data;
      const nearby = await findNearbyDrivers(jobData.pickupLat, jobData.pickupLng, jobData.vehicleTypeRequired);
      if (nearby.length > 0) await broadcastJobToDrivers(jobData, nearby);
    });

    // Error handlers
    ['notifications', 'payouts', 'jobBroadcast'].forEach(name => {
      queues[name].on('error', (err) => console.error(`Queue ${name} error:`, err.message));
      queues[name].on('failed', (job, err) => console.error(`Queue ${name} job ${job.id} failed:`, err.message));
    });

    console.log('✅ Bull queues initialized');
  } catch (err) {
    console.warn('⚠️  Queue initialization failed (Redis unavailable):', err.message);
    queues = { notifications: null, payouts: null, jobBroadcast: null };
  }

  return queues;
}

function getQueue(name) {
  return queues[name] || null;
}

module.exports = { initQueues, getQueue };
