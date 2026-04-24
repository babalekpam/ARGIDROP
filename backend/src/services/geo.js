const { getDB } = require('../config/database');
const { drivers, users } = require('../schema');
const { eq, and } = require('drizzle-orm');
const { sendPushNotification } = require('./notification');
const { getIO } = require('../socket');

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function findNearbyDrivers(lat, lng, vehicleType = null, radiusKm = 20) {
  if (!lat || !lng) return [];
  const db = getDB();

  let query = db.select({ driver: drivers, user: users })
    .from(drivers)
    .leftJoin(users, eq(drivers.userId, users.id))
    .where(and(eq(drivers.isOnline, true), eq(drivers.isActive, true)));

  if (vehicleType) {
    const { eq: drizzleEq } = require('drizzle-orm');
    query = query.where(eq(drivers.vehicleType, vehicleType));
  }

  const allActive = await query.limit(200);

  return allActive
    .filter(({ driver }) => {
      if (!driver.currentLat || !driver.currentLng) return true; // include if no location
      const dist = haversineKm(parseFloat(lat), parseFloat(lng), parseFloat(driver.currentLat), parseFloat(driver.currentLng));
      return dist <= radiusKm;
    })
    .map(({ driver, user }) => ({ ...driver, firstName: user?.firstName, lastName: user?.lastName, fcmToken: user?.fcmToken }));
}

async function broadcastJobToDrivers(job, drivers) {
  const io = getIO();
  const jobData = {
    id: job.id,
    pickupAddress: job.pickupAddress,
    dropoffAddress: job.dropoffAddress,
    priceOffered: job.priceOffered,
    urgency: job.urgency,
    packageType: job.packageType,
    vehicleTypeRequired: job.vehicleTypeRequired,
    bidMode: job.bidMode,
    currency: job.currency,
    createdAt: job.createdAt
  };

  for (const driver of drivers.slice(0, 30)) { // limit broadcast to 30 drivers
    // Socket broadcast to driver
    io.to(`driver:${driver.id}`).emit('job:new_available', jobData);

    // Push notification
    if (driver.fcmToken) {
      await sendPushNotification(
        driver.fcmToken,
        '🚚 New Delivery Job Available!',
        `${job.urgency} delivery — $${job.priceOffered} | ${job.pickupAddress}`,
        { type: 'NEW_JOB', jobId: job.id }
      ).catch(err => console.error('FCM error:', err.message));
    }
  }
}

module.exports = { findNearbyDrivers, broadcastJobToDrivers, haversineKm };
