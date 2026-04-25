// track.js — Public tracking endpoint (no auth)
//
// Security model: anyone with the trackingToken can read non-sensitive
// progress info for a delivery. To minimize impact of a leaked token:
//   - Driver real-time GPS is exposed ONLY while the job is in flight
//     (MATCHED or IN_TRANSIT). After delivery/cancellation/dispute we
//     omit lat/lng entirely so a stale token cannot be used to track
//     the driver's life.
//   - Vehicle plate is redacted (PII).
//   - Raw S3 URLs are never returned; we expose a `hasDeliveryProof`
//     boolean instead. The business retrieves a 15-min signed URL via
//     the authenticated /jobs/:id/proof endpoint.
//   - This router is rate-limited at the server level (see server.js).

const express = require('express');
const { eq } = require('drizzle-orm');
const { getDB } = require('../config/database');
const { jobs, drivers, users } = require('../schema');

const router = express.Router();

const ACTIVE_STATUSES = new Set(['MATCHED', 'IN_TRANSIT']);

router.get('/:token', async (req, res, next) => {
  try {
    const db = getDB();
    const [result] = await db
      .select({ job: jobs, driver: drivers, driverUser: users })
      .from(jobs)
      .leftJoin(drivers, eq(jobs.driverId, drivers.id))
      .leftJoin(users, eq(drivers.userId, users.id))
      .where(eq(jobs.trackingToken, req.params.token))
      .limit(1);

    if (!result) {
      return res.status(404).json({ success: false, message: 'Tracking information not found' });
    }

    const { job, driver, driverUser } = result;
    const isActive = ACTIVE_STATUSES.has(job.status);

    res.json({
      success: true,
      tracking: {
        jobId: job.id,
        status: job.status,
        urgency: job.urgency,
        pickupAddress: job.pickupAddress,
        dropoffAddress: job.dropoffAddress,
        estimatedDurationMins: job.estimatedDurationMins,
        matchedAt: job.matchedAt,
        pickedUpAt: job.pickedUpAt,
        deliveredAt: job.deliveredAt,
        hasDeliveryProof: Boolean(job.deliveryProofUrl),
        driver: driver ? {
          firstName: driverUser?.firstName,
          rating: driver.rating,
          vehicleType: driver.vehicleType,
          vehicleMake: driver.vehicleMake,
          vehicleModel: driver.vehicleModel,
          vehicleColor: driver.vehicleColor,
          // GPS only while delivery is in progress
          ...(isActive ? {
            currentLat: driver.currentLat,
            currentLng: driver.currentLng,
            lastLocationAt: driver.lastLocationAt,
          } : {}),
        } : null
      }
    });
  } catch (err) { next(err); }
});

module.exports = router;
