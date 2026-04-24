// track.js
const express = require('express');
const { eq } = require('drizzle-orm');
const { getDB } = require('../config/database');
const { jobs, drivers, users, deliveries, driverLocations } = require('../schema');

const router = express.Router();

// GET /track/:token — Public tracking (no auth)
router.get('/:token', async (req, res, next) => {
  try {
    const db = getDB();
    const [result] = await db.select({ job: jobs, driver: drivers, driverUser: users })
      .from(jobs)
      .leftJoin(drivers, eq(jobs.driverId, drivers.id))
      .leftJoin(users, eq(drivers.userId, users.id))
      .where(eq(jobs.trackingToken, req.params.token))
      .limit(1);

    if (!result) return res.status(404).json({ success: false, message: 'Tracking information not found' });

    const { job, driver, driverUser } = result;
    const [delivery] = await db.select().from(deliveries).where(eq(deliveries.jobId, job.id)).limit(1);

    // Only expose safe fields
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
        driver: driver ? {
          firstName: driverUser?.firstName,
          vehicleType: driver.vehicleType,
          vehicleMake: driver.vehicleMake,
          vehicleModel: driver.vehicleModel,
          vehicleColor: driver.vehicleColor,
          vehiclePlate: driver.vehiclePlate,
          rating: driver.rating,
          currentLat: driver.currentLat,
          currentLng: driver.currentLng,
          lastLocationAt: driver.lastLocationAt
        } : null,
        delivery: delivery ? { pickupPhotoUrl: delivery.pickupPhotoUrl, deliveryPhotoUrl: delivery.deliveryPhotoUrl, deliveryTimestamp: delivery.deliveryTimestamp } : null
      }
    });
  } catch (err) { next(err); }
});

module.exports = router;
