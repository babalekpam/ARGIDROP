/**
 * ArgiDrop Rides — motorcycle taxis, zémidjan, cars
 * Ride-hailing vertical routes
 *
 * TODO: Migrate rideRequests Map to a proper DB table (e.g. ride_requests)
 * once the schema is defined and migrated.
 */

import express from 'express';
import crypto from 'crypto';
import { eq, and } from 'drizzle-orm';
import { getDB } from '../config/database.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { drivers, users } from '../schema.js';

const router = express.Router();

// ── In-memory store (TODO: migrate to DB) ──────────────────────────────────
// Map<string (rideRequestId), RideRequest>
const rideRequests = new Map();

// ── Constants ──────────────────────────────────────────────────────────────
const BASE_FARE_XOF = 300;
const RATE_PER_KM_XOF = 100;
const MOTO_DISCOUNT = 0.65; // motos are ~35% cheaper than cars
const AVG_SPEED_KMH = 25;   // urban average speed for duration estimate

const VEHICLE_TYPES = ['MOTO', 'ZEMIDJAN', 'CAR', 'TRICYCLE'];

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
 * Find nearest available driver for the given vehicleType.
 * Returns the driver row or null.
 */
async function findNearestDriver(db, fromLat, fromLng, vehicleType) {
  const availableDrivers = await db
    .select()
    .from(drivers)
    .where(
      and(
        eq(drivers.status, 'APPROVED'),
        eq(drivers.isOnline, true),
        eq(drivers.isAvailable, true),
        eq(drivers.vehicleType, vehicleType)
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
      .select()
      .from(drivers)
      .where(
        and(
          eq(drivers.status, 'APPROVED'),
          eq(drivers.isOnline, true),
          eq(drivers.isAvailable, true),
          eq(drivers.vehicleType, vehicleType)
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

    const rideRequest = {
      id: crypto.randomUUID(),
      passengerId: req.user.id,
      driverId: driver ? driver.userId : null,
      fromAddress,
      fromLat,
      fromLng,
      toAddress,
      toLat,
      toLng,
      vehicleType,
      estimatedPrice,
      finalPrice: null,
      currency: 'XOF',
      status: driver ? 'MATCHED' : 'SEARCHING',
      trackingToken: crypto.randomUUID(),
      paymentMethod,
      notes: notes || null,
      createdAt: new Date().toISOString(),
      acceptedAt: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      cancelReason: null,
    };

    rideRequests.set(rideRequest.id, rideRequest);

    // Emit socket event to driver if matched
    if (driver && req.app.get('io')) {
      const io = req.app.get('io');
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

    return res.status(201).json({ rideRequest });
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
    const rideRequest = rideRequests.get(req.params.id);
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
      const db = getDB();
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

    return res.json({ rideRequest, driver: driverDetails });
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
    const rideRequest = rideRequests.get(req.params.id);
    if (!rideRequest) {
      return res.status(404).json({ error: 'Ride request not found' });
    }

    if (rideRequest.driverId && rideRequest.driverId !== req.user.id) {
      return res.status(403).json({ error: 'This ride is assigned to another driver' });
    }

    if (!['MATCHED', 'SEARCHING'].includes(rideRequest.status)) {
      return res.status(409).json({ error: `Cannot accept a ride with status ${rideRequest.status}` });
    }

    rideRequest.driverId = req.user.id;
    rideRequest.status = 'ACCEPTED';
    rideRequest.acceptedAt = new Date().toISOString();
    rideRequests.set(rideRequest.id, rideRequest);

    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.to(`passenger:${rideRequest.passengerId}`).emit('ride:accepted', {
        rideRequestId: rideRequest.id,
        driverId: req.user.id,
        acceptedAt: rideRequest.acceptedAt,
      });
    }

    return res.json({ rideRequest });
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
    const rideRequest = rideRequests.get(req.params.id);
    if (!rideRequest) {
      return res.status(404).json({ error: 'Ride request not found' });
    }

    if (rideRequest.driverId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (rideRequest.status !== 'ACCEPTED') {
      return res.status(409).json({ error: `Cannot start a ride with status ${rideRequest.status}` });
    }

    rideRequest.status = 'IN_PROGRESS';
    rideRequest.startedAt = new Date().toISOString();
    rideRequests.set(rideRequest.id, rideRequest);

    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.to(`passenger:${rideRequest.passengerId}`).emit('ride:started', {
        rideRequestId: rideRequest.id,
        startedAt: rideRequest.startedAt,
      });
    }

    return res.json({ rideRequest });
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
    const rideRequest = rideRequests.get(req.params.id);
    if (!rideRequest) {
      return res.status(404).json({ error: 'Ride request not found' });
    }

    if (rideRequest.driverId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (rideRequest.status !== 'IN_PROGRESS') {
      return res.status(409).json({ error: `Cannot complete a ride with status ${rideRequest.status}` });
    }

    rideRequest.status = 'COMPLETED';
    rideRequest.finalPrice = rideRequest.estimatedPrice; // final = estimated for now
    rideRequest.completedAt = new Date().toISOString();
    rideRequests.set(rideRequest.id, rideRequest);

    // TODO: trigger payment release via payments service

    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.to(`passenger:${rideRequest.passengerId}`).emit('ride:completed', {
        rideRequestId: rideRequest.id,
        finalPrice: rideRequest.finalPrice,
        currency: rideRequest.currency,
        completedAt: rideRequest.completedAt,
      });
    }

    return res.json({ rideRequest });
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
    const rideRequest = rideRequests.get(req.params.id);
    if (!rideRequest) {
      return res.status(404).json({ error: 'Ride request not found' });
    }

    const isPassenger = rideRequest.passengerId === req.user.id;
    const isDriver = rideRequest.driverId === req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isPassenger && !isDriver && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (['COMPLETED', 'CANCELLED'].includes(rideRequest.status)) {
      return res.status(409).json({ error: `Ride is already ${rideRequest.status.toLowerCase()}` });
    }

    const { reason } = req.body;

    // Partial refund logic:
    // - Cancelled before ACCEPTED → full refund
    // - Cancelled after ACCEPTED but before IN_PROGRESS → 90% refund (10% penalty)
    // - Cancelled during IN_PROGRESS → 50% refund
    let refundPct = 100;
    if (rideRequest.status === 'ACCEPTED') refundPct = 90;
    if (rideRequest.status === 'IN_PROGRESS') refundPct = 50;

    rideRequest.status = 'CANCELLED';
    rideRequest.cancelledAt = new Date().toISOString();
    rideRequest.cancelReason = reason || null;
    rideRequests.set(rideRequest.id, rideRequest);

    // TODO: trigger partial refund via payments service based on refundPct

    if (req.app.get('io')) {
      const io = req.app.get('io');
      const payload = {
        rideRequestId: rideRequest.id,
        cancelledBy: req.user.id,
        cancelledAt: rideRequest.cancelledAt,
        reason: rideRequest.cancelReason,
        refundPct,
      };
      io.to(`passenger:${rideRequest.passengerId}`).emit('ride:cancelled', payload);
      if (rideRequest.driverId) {
        io.to(`driver:${rideRequest.driverId}`).emit('ride:cancelled', payload);
      }
    }

    return res.json({
      rideRequest,
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
    const userId = req.user.id;
    const myRides = Array.from(rideRequests.values())
      .filter((r) => r.passengerId === userId || r.driverId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 30);

    return res.json({ rides: myRides, total: myRides.length });
  } catch (err) {
    console.error('[rides] /requests/me error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
