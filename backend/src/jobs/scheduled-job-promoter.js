// Scheduled-job promoter: every 15 minutes, promote SCHEDULED jobs to POSTED
// when their pickup time is within PROMOTION_LEAD_MINUTES of now. Once
// promoted, the existing broadcast/matching flow takes over.
//
// Also: handles SCHEDULED jobs that were pre-claimed by a driver — those
// promote straight to MATCHED with the pre-claiming driver assigned.
const cron = require('node-cron');
const crypto = require('crypto');
const { and, eq, lte, isNotNull, isNull, or, sql } = require('drizzle-orm');
const { getDB } = require('../config/database');
const { jobs, jobStops, payments, businesses, drivers, users } = require('../schema');
const { findNearbyDrivers, broadcastJobToDrivers } = require('../services/geo');
const { generatePickupCode } = require('../services/qr');
const { sendPushNotification } = require('../services/notification');
const { holdFunds } = require('../services/wallet');
const { getIO } = require('../socket');

const PROMOTION_LEAD_MINUTES = parseInt(process.env.SCHEDULED_PROMOTION_LEAD_MINUTES || '180', 10); // 3h
const DRIVER_REMINDER_LEAD_MINUTES = parseInt(process.env.SCHEDULED_DRIVER_REMINDER_LEAD_MINUTES || '120', 10); // 2h

let started = false;

const RECURRENCE_INTERVAL_MS = {
  DAILY: 24 * 60 * 60 * 1000,
  WEEKLY: 7 * 24 * 60 * 60 * 1000,
};

/**
 * After a recurring occurrence is promoted, clone it into the next
 * occurrence: same route/package/price, pickup shifted by the recurrence
 * interval, funded by a fresh wallet hold. If the wallet can't cover it the
 * series pauses (isRecurring cleared) and the business is notified.
 */
async function spawnNextOccurrence(job) {
  const db = getDB();
  const intervalMs = RECURRENCE_INTERVAL_MS[job.recurrenceRule];
  if (!job.isRecurring || !intervalMs || !job.scheduledPickupAt) return null;

  const rootId = job.recurrenceParentId || job.id;
  const nextPickupAt = new Date(new Date(job.scheduledPickupAt).getTime() + intervalMs);
  const nextWindowEnd = job.scheduledWindowEnd
    ? new Date(new Date(job.scheduledWindowEnd).getTime() + intervalMs)
    : null;

  // Duplicate guard: if a promotion retried after a crash, the next
  // occurrence may already exist.
  const [existing] = await db.select({ id: jobs.id }).from(jobs).where(and(
    or(eq(jobs.id, rootId), eq(jobs.recurrenceParentId, rootId)),
    eq(jobs.scheduledPickupAt, nextPickupAt),
  )).limit(1);
  if (existing) return null;

  const trackingToken = crypto.randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase();
  const chargedAmount = parseFloat(job.priceOffered);

  const [child] = await db.insert(jobs).values({
    businessId: job.businessId,
    trackingToken,
    pickupAddress: job.pickupAddress, pickupLat: job.pickupLat, pickupLng: job.pickupLng,
    pickupContactName: job.pickupContactName, pickupContactPhone: job.pickupContactPhone, pickupNotes: job.pickupNotes,
    dropoffAddress: job.dropoffAddress, dropoffLat: job.dropoffLat, dropoffLng: job.dropoffLng,
    dropoffContactName: job.dropoffContactName, dropoffContactPhone: job.dropoffContactPhone, dropoffNotes: job.dropoffNotes,
    packageType: job.packageType, packageDescription: job.packageDescription,
    weightKg: job.weightKg, isFragile: job.isFragile, declaredValue: job.declaredValue,
    urgency: job.urgency, vehicleTypeRequired: job.vehicleTypeRequired,
    priceOffered: job.priceOffered, currency: job.currency,
    status: 'DRAFT',
    scheduledPickupAt: nextPickupAt,
    scheduledWindowEnd: nextWindowEnd,
    isRecurring: true,
    recurrenceRule: job.recurrenceRule,
    recurrenceParentId: rootId,
    zoneId: job.zoneId,
  }).returning();

  // Clone multi-stop legs if the parent had any.
  const stops = await db.select().from(jobStops).where(eq(jobStops.jobId, job.id));
  if (stops.length) {
    await db.insert(jobStops).values(stops.map(({ id, jobId, createdAt, ...rest }) => ({ jobId: child.id, ...rest })));
  }

  const [bizUser] = await db.select({ user: users }).from(businesses)
    .leftJoin(users, eq(businesses.userId, users.id))
    .where(eq(businesses.id, job.businessId)).limit(1);
  const fcmToken = bizUser?.user?.fcmToken;

  try {
    await holdFunds(job.businessId, child.id, chargedAmount);
  } catch (holdErr) {
    // Insufficient balance → pause the series instead of silently retrying
    // into the same failure every occurrence.
    await db.update(jobs).set({ status: 'EXPIRED', updatedAt: new Date() }).where(eq(jobs.id, child.id));
    await db.update(jobs).set({ isRecurring: false, updatedAt: new Date() })
      .where(and(eq(jobs.businessId, job.businessId), or(eq(jobs.id, rootId), eq(jobs.recurrenceParentId, rootId))));
    if (fcmToken) {
      sendPushNotification(fcmToken,
        'Recurring delivery paused',
        'Your wallet balance is too low to fund the next recurring delivery. Top up and schedule it again.',
        { jobId: job.id, type: 'RECURRENCE_PAUSED' }).catch(() => {});
    }
    console.warn(`[recurrence] series ${rootId} paused — wallet hold failed: ${holdErr.message}`);
    return null;
  }

  const commissionRate = 15;
  const driverPayout = +(chargedAmount * (1 - commissionRate / 100)).toFixed(2);
  const commissionAmount = +(chargedAmount - driverPayout).toFixed(2);
  const now = new Date();
  await db.insert(payments).values({
    jobId: child.id, businessId: job.businessId,
    grossAmount: chargedAmount, commissionRate,
    commissionAmount, driverPayout,
    currency: job.currency, status: 'HELD', heldAt: now,
    paymentProvider: 'WALLET',
  });
  await db.update(jobs).set({ status: 'SCHEDULED', paymentConfirmedAt: now, updatedAt: now }).where(eq(jobs.id, child.id));

  if (fcmToken) {
    sendPushNotification(fcmToken,
      'Recurring delivery scheduled',
      `Your next ${job.recurrenceRule === 'DAILY' ? 'daily' : 'weekly'} delivery is scheduled for ${nextPickupAt.toLocaleString('fr-FR', { timeZone: 'UTC' })} UTC.`,
      { jobId: child.id, type: 'RECURRENCE_SCHEDULED' }).catch(() => {});
  }

  console.log(`[recurrence] series ${rootId}: next occurrence ${child.id} scheduled for ${nextPickupAt.toISOString()}`);
  return child;
}

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

    try { await spawnNextOccurrence(job); } catch (e) { console.error('[recurrence] spawn failed:', e.message); }
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

  try { await spawnNextOccurrence(job); } catch (e) { console.error('[recurrence] spawn failed:', e.message); }
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

module.exports = { startScheduledJobPromoter, _tickForTests: tick, _spawnNextOccurrenceForTests: spawnNextOccurrence };
