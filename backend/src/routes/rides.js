/**
 * ArgiDrop Rides — motorcycle taxis, zémidjan, cars
 * Ride-hailing vertical routes
 *
 * Ride requests are persisted in the ride_requests table so they survive
 * server restarts. Status transitions use conditional UPDATEs guarded on the
 * expected current status, so concurrent transitions can't double-apply.
 */

const express = require('express');
const crypto = require('crypto');
const { eq, and, or, desc, inArray } = require('drizzle-orm');
const { getDB } = require('../config/database');
const { getIO } = require('../socket');
const { authenticate, requireRole } = require('../middleware/auth');
const { drivers, users, rideRequests } = require('../schema');

const router = express.Router();

// ── Constants ──────────────────────────────────────────────────────────────
const BASE_FARE_XOF = 300;
const RATE_PER_KM_XOF = 100;
const MOTO_DISCOUNT = 0.65; // motos are ~35% cheaper than cars
const AVG_SPEED_KMH = 25;   // urban average speed for duration estimate

const VEHICLE_TYPES = ['MOTO', 'ZEMIDJAN', 'CAR', 'TRICYCLE'];

// Ride vehicle types map onto the drivers.vehicle_type DB enum
// (BICYCLE, MOTORCYCLE, CAR, VAN, TRUCK, TRICYCLE)
const DB_VEHICLE_TYPE = { MOTO: 'MOTORCYCLE', ZEMIDJAN: 'MOTORCYCLE', CAR: 'CAR', TRICYCLE: 'TRICYCLE' };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Haversine-approximation distance in km.
 * Simple Euclidean * 111 is good enough for short urban distances.
 */
function calcDistanceKm(lat1, lng1, lat2, lng2) {
  const dLat = lat1 - lat2;
  const dLng = lng1 - lng2;
  return Math.sqrt(dLat * dLat + dLng * dLng) * 111;
}

function estimatePriceXOF(distanceKm, vehicleType) {
  const raw = BASE_FARE_XOF + distanceKm * RATE_PER_KM_XOF;
  const isMoto = vehicleType === 'MOTO' || vehicleType === 'ZEMIDJAN';
  return Math.round(isMoto ? raw * MOTO_DISCOUNT : raw);
}

function estimateDurationMin(distanceKm) {
  return Math.round((distanceKm / AVG_SPEED_KMH) * 60) + 2; // +2 min pickup buffer
}

/**
 * Serialize a ride_requests row to the wire shape the mobile app expects:
 * numeric lat/lng/prices and ISO-8601 timestamp strings.
 */
function serializeRide(row) {
  if (!row) return null;
  const iso = (v) => (v ? new Date(v).toISOString() : null);
  const num = (v) => (v == null ? null : Number(v));
  return {
    ...row,
    fromLat: num(row.fromLat),
    fromLng: num(row.fromLng),
    toLat: num(row.toLat),
    toLng: num(row.toLng),
    createdAt: iso(row.createdAt),
    acceptedAt: iso(row.acceptedAt),
    startedAt: iso(row.startedAt),
    completedAt: iso(row.completedAt),
    cancelledAt: iso(row.cancelledAt),
  };
}

async function getRideById(db, id) {
  if (!UUID_RE.test(id)) return null;
  const [row] = await db.select().from(rideRequests).where(eq(rideRequests.id, id)).limit(1);
  return row || null;
}

/**
 * Find nearest available driver for the given vehicleType.
 * Returns the driver row or null.
 */
async function findNearestDriver(db, fromLat, fromLng, vehicleType) {
  const availableDrivers = await db
    .select({ id: drivers.id, userId: drivers.userId, currentLat: drivers.currentLat, currentLng: drivers.currentLng })
    .from(drivers)
    .where(
      and(
        eq(drivers.verificationStatus, 'APPROVED'),
        eq(drivers.isOnline, true),
        eq(drivers.isActive, true),
        eq(drivers.vehicleType, DB_VEHICLE_TYPE[vehicleType])
      )
    );

  if (!availableDrivers.length) return null;

  // Sort by Euclidean distance * 111 (km proxy)
  availableDrivers.sort((a, b) => {
    const distA = calcDistanceKm(fromLat, fromLng, a.currentLat, a.currentLng);
    const distB = calcDistanceKm(fromLat, fromLng, b.currentLat, b.currentLng);
    return distA - distB;
  });

  return availableDrivers[0];
}

// ── Routes ─────────────────────────────────────────────────────────────────

/**
 * POST /estimate
 * No auth required.
 * Returns price estimate, distance, duration, available driver count.
 */
router.post('/estimate', async (req, res) => {
  try {
    const { fromLat, fromLng, toLat, toLng, vehicleType } = req.body;

    if (
      fromLat == null || fromLng == null ||
      toLat == null || toLng == null ||
      !vehicleType
    ) {
      return res.status(400).json({ error: 'fromLat, fromLng, toLat, toLng, vehicleType are required' });
    }

    if (!VEHICLE_TYPES.includes(vehicleType)) {
      return res.status(400).json({ error: `vehicleType must be one of: ${VEHICLE_TYPES.join(', ')}` });
    }

    const db = getDB();
    const distanceKm = calcDistanceKm(fromLat, fromLng, toLat, toLng);
    const estimatedPrice = estimatePriceXOF(distanceKm, vehicleType);
    const estimatedDurationMin = estimateDurationMin(distanceKm);

    // Count available drivers of requested type
    const availableDrivers = await db
      .select({ id: drivers.id })
      .from(drivers)
      .where(
        and(
          eq(drivers.verificationStatus, 'APPROVED'),
          eq(drivers.isOnline, true),
          eq(drivers.isActive, true),
          eq(drivers.vehicleType, DB_VEHICLE_TYPE[vehicleType])
        )
      );

    return res.json({
      estimatedPrice,
      currency: 'XOF',
      distanceKm: Math.round(distanceKm * 100) / 100,
      estimatedDurationMin,
      availableDriverCount: availableDrivers.length,
      vehicleType,
      breakdown: {
        baseFare: BASE_FARE_XOF,
        distanceFare: Math.round(distanceKm * RATE_PER_KM_XOF),
        discount: vehicleType === 'MOTO' || vehicleType === 'ZEMIDJAN' ? '35% moto rate' : null,
      },
    });
  } catch (err) {
    console.error('[rides] /estimate error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /request
 * Auth required (passenger).
 */
router.post('/request', authenticate, async (req, res) => {
  try {
    const {
      fromAddress, fromLat, fromLng,
      toAddress, toLat, toLng,
      vehicleType, paymentMethod, notes,
    } = req.body;

    if (
      !fromAddress || fromLat == null || fromLng == null ||
      !toAddress || toLat == null || toLng == null ||
      !vehicleType || !paymentMethod
    ) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!VEHICLE_TYPES.includes(vehicleType)) {
      return res.status(400).json({ error: `vehicleType must be one of: ${VEHICLE_TYPES.join(', ')}` });
    }

    const db = getDB();
    const distanceKm = calcDistanceKm(fromLat, fromLng, toLat, toLng);
    const estimatedPrice = estimatePriceXOF(distanceKm, vehicleType);

    // Match nearest available driver
    const driver = await findNearestDriver(db, fromLat, fromLng, vehicleType);

    const [rideRequest] = await db
      .insert(rideRequests)
      .values({
        passengerId: req.user.id,
        driverId: driver ? driver.userId : null,
        fromAddress,
        fromLat: String(fromLat),
        fromLng: String(fromLng),
        toAddress,
        toLat: String(toLat),
        toLng: String(toLng),
        vehicleType,
        estimatedPrice,
        currency: 'XOF',
        status: driver ? 'MATCHED' : 'SEARCHING',
        trackingToken: crypto.randomUUID(),
        paymentMethod,
        notes: notes || null,
      })
      .returning();

    // Emit socket event to driver if matched
    const io = getIO();
    if (driver && io) {
      io.to(`driver:${driver.userId}`).emit('ride:new_request', {
        rideRequestId: rideRequest.id,
        fromAddress,
        fromLat,
        fromLng,
        toAddress,
        toLat,
        toLng,
        vehicleType,
        estimatedPrice,
        currency: 'XOF',
        passengerId: req.user.id,
        trackingToken: rideRequest.trackingToken,
      });
    }

    return res.status(201).json({ rideRequest: serializeRide(rideRequest) });
  } catch (err) {
    console.error('[rides] /request error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /request/:id
 * Auth required.
 */
router.get('/request/:id', authenticate, async (req, res) => {
  try {
    const db = getDB();
    const rideRequest = await getRideById(db, req.params.id);
    if (!rideRequest) {
      return res.status(404).json({ error: 'Ride request not found' });
    }

    // Only the passenger or the assigned driver can view
    const isPassenger = rideRequest.passengerId === req.user.id;
    const isDriver = rideRequest.driverId === req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isPassenger && !isDriver && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Fetch driver details if assigned
    let driverDetails = null;
    if (rideRequest.driverId) {
      const [driverRow] = await db
        .select()
        .from(drivers)
        .where(eq(drivers.userId, rideRequest.driverId))
        .limit(1);

      if (driverRow) {
        const [userRow] = await db
          .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, phone: users.phone })
          .from(users)
          .where(eq(users.id, rideRequest.driverId))
          .limit(1);

        driverDetails = {
          ...driverRow,
          user: userRow || null,
        };
      }
    }

    return res.json({ rideRequest: serializeRide(rideRequest), driver: driverDetails });
  } catch (err) {
    console.error('[rides] GET /request/:id error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /request/:id/accept
 * Driver auth required.
 */
router.post('/request/:id/accept', authenticate, requireRole('DRIVER'), async (req, res) => {
  try {
    const db = getDB();
    const existing = await getRideById(db, req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Ride request not found' });
    }

    if (existing.driverId && existing.driverId !== req.user.id) {
      return res.status(403).json({ error: 'This ride is assigned to another driver' });
    }

    if (!['MATCHED', 'SEARCHING'].includes(existing.status)) {
      return res.status(409).json({ error: `Cannot accept a ride with status ${existing.status}` });
    }

    // Conditional update: only wins if the ride is still acceptable and not
    // grabbed by another driver in the meantime.
    const [rideRequest] = await db
      .update(rideRequests)
      .set({ driverId: req.user.id, status: 'ACCEPTED', acceptedAt: new Date() })
      .where(
        and(
          eq(rideRequests.id, existing.id),
          inArray(rideRequests.status, ['MATCHED', 'SEARCHING']),
          existing.driverId ? eq(rideRequests.driverId, existing.driverId) : undefined
        )
      )
      .returning();

    if (!rideRequest) {
      return res.status(409).json({ error: 'Ride is no longer available' });
    }

    const io = getIO(); if (io) {

      io.to(`passenger:${rideRequest.passengerId}`).emit('ride:accepted', {
        rideRequestId: rideRequest.id,
        driverId: req.user.id,
        acceptedAt: new Date(rideRequest.acceptedAt).toISOString(),
      });
    }

    return res.json({ rideRequest: serializeRide(rideRequest) });
  } catch (err) {
    console.error('[rides] /accept error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /request/:id/start
 * Driver auth required.
 */
router.post('/request/:id/start', authenticate, requireRole('DRIVER'), async (req, res) => {
  try {
    const db = getDB();
    const existing = await getRideById(db, req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Ride request not found' });
    }

    if (existing.driverId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (existing.status !== 'ACCEPTED') {
      return res.status(409).json({ error: `Cannot start a ride with status ${existing.status}` });
    }

    const [rideRequest] = await db
      .update(rideRequests)
      .set({ status: 'IN_PROGRESS', startedAt: new Date() })
      .where(and(eq(rideRequests.id, existing.id), eq(rideRequests.status, 'ACCEPTED')))
      .returning();

    if (!rideRequest) {
      return res.status(409).json({ error: 'Cannot start this ride' });
    }

    const io = getIO(); if (io) {

      io.to(`passenger:${rideRequest.passengerId}`).emit('ride:started', {
        rideRequestId: rideRequest.id,
        startedAt: new Date(rideRequest.startedAt).toISOString(),
      });
    }

    return res.json({ rideRequest: serializeRide(rideRequest) });
  } catch (err) {
    console.error('[rides] /start error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /request/:id/complete
 * Driver auth required.
 */
router.post('/request/:id/complete', authenticate, requireRole('DRIVER'), async (req, res) => {
  try {
    const db = getDB();
    const existing = await getRideById(db, req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Ride request not found' });
    }

    if (existing.driverId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (existing.status !== 'IN_PROGRESS') {
      return res.status(409).json({ error: `Cannot complete a ride with status ${existing.status}` });
    }

    const [rideRequest] = await db
      .update(rideRequests)
      .set({
        status: 'COMPLETED',
        finalPrice: existing.estimatedPrice, // final = estimated for now
        completedAt: new Date(),
      })
      .where(and(eq(rideRequests.id, existing.id), eq(rideRequests.status, 'IN_PROGRESS')))
      .returning();

    if (!rideRequest) {
      return res.status(409).json({ error: 'Cannot complete this ride' });
    }

    // TODO: trigger payment release via payments service

    const io = getIO(); if (io) {

      io.to(`passenger:${rideRequest.passengerId}`).emit('ride:completed', {
        rideRequestId: rideRequest.id,
        finalPrice: rideRequest.finalPrice,
        currency: rideRequest.currency,
        completedAt: new Date(rideRequest.completedAt).toISOString(),
      });
    }

    return res.json({ rideRequest: serializeRide(rideRequest) });
  } catch (err) {
    console.error('[rides] /complete error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /request/:id/cancel
 * Auth required (passenger or driver).
 */
router.post('/request/:id/cancel', authenticate, async (req, res) => {
  try {
    const db = getDB();
    const existing = await getRideById(db, req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Ride request not found' });
    }

    const isPassenger = existing.passengerId === req.user.id;
    const isDriver = existing.driverId === req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isPassenger && !isDriver && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (['COMPLETED', 'CANCELLED'].includes(existing.status)) {
      return res.status(409).json({ error: `Ride is already ${existing.status.toLowerCase()}` });
    }

    const { reason } = req.body;

    // Partial refund logic:
    // - Cancelled before ACCEPTED → full refund
    // - Cancelled after ACCEPTED but before IN_PROGRESS → 90% refund (10% penalty)
    // - Cancelled during IN_PROGRESS → 50% refund
    let refundPct = 100;
    if (existing.status === 'ACCEPTED') refundPct = 90;
    if (existing.status === 'IN_PROGRESS') refundPct = 50;

    const [rideRequest] = await db
      .update(rideRequests)
      .set({ status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason || null })
      .where(
        and(
          eq(rideRequests.id, existing.id),
          inArray(rideRequests.status, ['SEARCHING', 'MATCHED', 'ACCEPTED', 'IN_PROGRESS'])
        )
      )
      .returning();

    if (!rideRequest) {
      return res.status(409).json({ error: 'Ride can no longer be cancelled' });
    }

    // TODO: trigger partial refund via payments service based on refundPct

    const io = getIO(); if (io) {

      const payload = {
        rideRequestId: rideRequest.id,
        cancelledBy: req.user.id,
        cancelledAt: new Date(rideRequest.cancelledAt).toISOString(),
        reason: rideRequest.cancelReason,
        refundPct,
      };
      io.to(`passenger:${rideRequest.passengerId}`).emit('ride:cancelled', payload);
      if (rideRequest.driverId) {
        io.to(`driver:${rideRequest.driverId}`).emit('ride:cancelled', payload);
      }
    }

    return res.json({
      rideRequest: serializeRide(rideRequest),
      refund: {
        refundPct,
        refundAmount: Math.round((rideRequest.estimatedPrice * refundPct) / 100),
        currency: rideRequest.currency,
      },
    });
  } catch (err) {
    console.error('[rides] /cancel error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /requests/me
 * Auth required — my ride history (last 30).
 */
router.get('/requests/me', authenticate, async (req, res) => {
  try {
    const db = getDB();
    const userId = req.user.id;
    const myRides = await db
      .select()
      .from(rideRequests)
      .where(or(eq(rideRequests.passengerId, userId), eq(rideRequests.driverId, userId)))
      .orderBy(desc(rideRequests.createdAt))
      .limit(30);

    return res.json({ rides: myRides.map(serializeRide), total: myRides.length });
  } catch (err) {
    console.error('[rides] /requests/me error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
