// track.js — Public tracking endpoint (no auth)
//
// Security model: anyone with the trackingToken can read non-sensitive
// progress info for a delivery. To minimize impact of a leaked token:
//   - Exact pickup/dropoff addresses are never returned; only city is exposed.
//   - Driver real-time GPS is never exposed on this public endpoint.
//   - Vehicle plate is redacted (PII).
//   - Driver details are hidden once the job is delivered/completed.
//   - A hasDeliveryProof boolean is returned post-delivery instead of the raw
//     photo URL; the business fetches a signed URL via the authenticated
//     /jobs/:id/proof endpoint.
//   - This router is rate-limited at the server level (see server.js).

const express = require('express');
const { eq } = require('drizzle-orm');
const { getDB } = require('../config/database');
const { jobs, drivers, users } = require('../schema');

const router = express.Router();

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
    const isDelivered = job.status === 'DELIVERED' || job.status === 'COMPLETED';

    res.json({
      success: true,
      tracking: {
        jobId: job.id,
        status: job.status,
        urgency: job.urgency,
        dropoffCity: job.dropoffCity,
        estimatedDurationMins: job.estimatedDurationMins,
        matchedAt: job.matchedAt,
        pickedUpAt: job.pickedUpAt,
        deliveredAt: job.deliveredAt,
        hasDeliveryProof: Boolean(job.deliveryProofUrl),
        driver: driver && !isDelivered ? {
          firstName: driverUser?.firstName,
          rating: driver.rating,
          vehicleType: driver.vehicleType,
          vehicleColor: driver.vehicleColor,
        } : null
      }
    });
  } catch (err) { next(err); }
});

module.exports = router;
