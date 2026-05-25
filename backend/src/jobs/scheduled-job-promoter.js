// Scheduled-job promoter: every 15 minutes, promote SCHEDULED jobs to POSTED
// when their pickup time is within PROMOTION_LEAD_MINUTES of now. Once
// promoted, the existing broadcast/matching flow takes over.
//
// Also: handles SCHEDULED jobs that were pre-claimed by a driver — those
// promote straight to MATCHED with the pre-claiming driver assigned.
const cron = require('node-cron');
const { and, eq, lte, isNotNull, isNull, sql } = require('drizzle-orm');
const { getDB } = require('../config/database');
const { jobs, businesses, drivers, users } = require('../schema');
const { findNearbyDrivers, broadcastJobToDrivers } = require('../services/geo');
const { generatePickupCode } = require('../services/qr');
const { sendPushNotification } = require('../services/notification');
const { getIO } = require('../socket');

const PROMOTION_LEAD_MINUTES = parseInt(process.env.SCHEDULED_PROMOTION_LEAD_MINUTES || '180', 10); // 3h
const DRIVER_REMINDER_LEAD_MINUTES = parseInt(process.env.SCHEDULED_DRIVER_REMINDER_LEAD_MINUTES || '120', 10); // 2h

let started = false;

async function promoteOne(job) {
  const db = getDB();
  const now = new Date();

  // Pre-claimed → straight to MATCHED with that driver.
  if (job.driverId && job.preclaimedAt) {
    const [updated] = await db.update(jobs).set({
      status: 'MATCHED',
      matchedAt: now,
      promotedAt: now,
      finalPrice: job.priceOffered,
      updatedAt: now,
    }).where(and(eq(jobs.id, job.id), eq(jobs.status, 'SCHEDULED'))).returning();

    if (!updated) return { skipped: true, reason: 'race' };

    // Generate the Pickup QR the merchant will show on handoff.
    try { await generatePickupCode(job.id); } catch (e) { console.warn('[scheduled-promote] pickupCode gen failed', e.message); }

    // Realtime + push to both sides.
    const io = getIO();
    io.to(`job:${job.id}`).emit('job:status_change', { jobId: job.id, status: 'MATCHED' });
    io.to(`business:${job.businessId}`).emit('job:matched', { jobId: job.id, pickupCodeAvailable: true, scheduled: true });

    const [bizUser] = await db.select({ user: users }).from(businesses)
      .leftJoin(users, eq(businesses.userId, users.id))
      .where(eq(businesses.id, job.businessId)).limit(1);
    if (bizUser?.user?.fcmToken) {
      sendPushNotification(bizUser.user.fcmToken,
        'Scheduled pickup soon',
        `Your scheduled delivery is now active. Your driver will arrive at the scheduled time.`,
        { jobId: job.id, type: 'SCHEDULED_PROMOTED' }).catch(() => {});
    }
    return { promoted: true, mode: 'preclaimed' };
  }

  // Not pre-claimed → POSTED + broadcast to nearby drivers (same as wallet path).
  // CRITICAL: include driverId IS NULL so a preclaim that landed between our
  // SELECT and this UPDATE causes the update to no-op; the next tick will
  // see it as preclaimed and route it correctly.
  const [updated] = await db.update(jobs).set({
    status: 'POSTED',
    promotedAt: now,
    updatedAt: now,
  }).where(and(
    eq(jobs.id, job.id),
    eq(jobs.status, 'SCHEDULED'),
    isNull(jobs.driverId),
    isNull(jobs.preclaimedAt),
  )).returning();

  if (!updated) return { skipped: true, reason: 'race_preclaim_or_status' };

  try {
    const nearby = await findNearbyDrivers(job.pickupLat, job.pickupLng, job.vehicleTypeRequired);
    if (nearby.length) await broadcastJobToDrivers({ ...updated }, nearby);
  } catch (e) {
    console.warn('[scheduled-promote] broadcast failed', e.message);
  }

  const io = getIO();
  io.to(`business:${job.businessId}`).emit('job:status_change', { jobId: job.id, status: 'POSTED', scheduled: true });

  return { promoted: true, mode: 'broadcast' };
}

async function tick() {
  try {
    const db = getDB();
    const cutoff = new Date(Date.now() + PROMOTION_LEAD_MINUTES * 60 * 1000);
    const due = await db.select().from(jobs).where(and(
      eq(jobs.status, 'SCHEDULED'),
      isNotNull(jobs.scheduledPickupAt),
      lte(jobs.scheduledPickupAt, cutoff),
    )).limit(100);

    if (!due.length) return;
    console.log(`📅 Scheduled-job promoter: ${due.length} job(s) due for promotion`);
    for (const job of due) {
      try {
        const r = await promoteOne(job);
        if (r.promoted) console.log(`  → job ${job.id} promoted (${r.mode})`);
      } catch (err) {
        console.error(`  → job ${job.id} failed:`, err.message);
      }
    }
  } catch (err) {
    console.error('📅 Scheduled-job promoter sweep failed:', err.message);
  }
}

function startScheduledJobPromoter() {
  if (started) return;
  started = true;
  // Every 15 minutes.
  cron.schedule('*/15 * * * *', tick);
  // Run once on boot so a restart doesn't delay a promotion by up to 15 min.
  setTimeout(() => { tick().catch(() => {}); }, 5000);
  console.log(`✅ Scheduled-job promoter cron scheduled (every 15 min, lead ${PROMOTION_LEAD_MINUTES} min)`);
}

module.exports = { startScheduledJobPromoter, _tickForTests: tick };
