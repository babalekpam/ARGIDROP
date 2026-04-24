// ArgiDrop Pricing Engine
// Calculates delivery price from zone config + job parameters
// Formula: (baseFare + perKmRate × distance + weightSurcharge + fragileSurcharge) × urgencyMultiplier × surgeMultiplier

const { eq } = require('drizzle-orm');
const { getDB } = require('../config/database');
const { deliveryPricing, zones } = require('../schema');

// Default pricing for Lomé (XOF) — used if no zone config found
const DEFAULT_PRICING = {
  baseFare: 500,
  perKmRate: 150,
  minimumFare: 800,
  maximumFare: 25000,
  weightThreshold1Kg: 10,
  weightSurcharge1: 200,
  weightThreshold2Kg: 25,
  weightSurcharge2: 500,
  expressMultiplier: 1.30,
  instantMultiplier: 1.80,
  fragileSurcharge: 300,
  peakHourMultiplier: 1.30,
  peakHoursStart1: 7, peakHoursEnd1: 9,
  peakHoursStart2: 12, peakHoursEnd2: 14,
  peakHoursStart3: 17, peakHoursEnd3: 20,
  commissionRate: 18,
  currency: 'XOF',
};

// Tier photo limits
const TIER_PHOTO_LIMITS = {
  FREE: 5,
  STANDARD: 20,
  PREMIUM: 50,
  PRO: null, // unlimited
};

// Tier monthly fees (XOF)
const TIER_FEES = {
  FREE: 0,
  STANDARD: 10000,
  PREMIUM: 25000,
  PRO: 50000,
};

// Monthly delivery volume → recommended tier fee
function recommendedFee(monthlyDeliveries) {
  if (monthlyDeliveries >= 500) return 5000;
  if (monthlyDeliveries >= 300) return 6000;
  if (monthlyDeliveries >= 100) return 8000;
  return 10000;
}

function isPeakHour(pricing, hour) {
  return (
    (hour >= pricing.peakHoursStart1 && hour < pricing.peakHoursEnd1) ||
    (hour >= pricing.peakHoursStart2 && hour < pricing.peakHoursEnd2) ||
    (hour >= pricing.peakHoursStart3 && hour < pricing.peakHoursEnd3)
  );
}

/**
 * Haversine distance between two GPS points in km
 */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Fetch pricing config for a zone
 */
async function getPricingConfig(zoneId) {
  if (!zoneId) return DEFAULT_PRICING;
  try {
    const db = getDB();
    const [config] = await db.select().from(deliveryPricing).where(eq(deliveryPricing.zoneId, zoneId)).limit(1);
    if (!config) return DEFAULT_PRICING;
    return {
      baseFare: parseFloat(config.baseFare),
      perKmRate: parseFloat(config.perKmRate),
      minimumFare: parseFloat(config.minimumFare),
      maximumFare: parseFloat(config.maximumFare),
      weightThreshold1Kg: parseFloat(config.weightThreshold1Kg),
      weightSurcharge1: parseFloat(config.weightSurcharge1),
      weightThreshold2Kg: parseFloat(config.weightThreshold2Kg),
      weightSurcharge2: parseFloat(config.weightSurcharge2),
      expressMultiplier: parseFloat(config.expressMultiplier),
      instantMultiplier: parseFloat(config.instantMultiplier),
      fragileSurcharge: parseFloat(config.fragileSurcharge),
      peakHourMultiplier: parseFloat(config.peakHourMultiplier),
      peakHoursStart1: config.peakHoursStart1,
      peakHoursEnd1: config.peakHoursEnd1,
      peakHoursStart2: config.peakHoursStart2,
      peakHoursEnd2: config.peakHoursEnd2,
      peakHoursStart3: config.peakHoursStart3,
      peakHoursEnd3: config.peakHoursEnd3,
      commissionRate: parseFloat(config.commissionRate),
      currency: config.currency,
    };
  } catch { return DEFAULT_PRICING; }
}

/**
 * Calculate delivery price
 * @param {object} params
 * @param {number} params.pickupLat
 * @param {number} params.pickupLng
 * @param {number} params.dropoffLat
 * @param {number} params.dropoffLng
 * @param {number} params.weightKg - package weight in kg
 * @param {boolean} params.isFragile
 * @param {string} params.urgency - STANDARD | EXPRESS | INSTANT
 * @param {string} params.zoneId - optional zone override
 * @param {number} params.surgeMultiplier - zone surge (default 1.0)
 * @returns {object} price breakdown
 */
async function calculatePrice({
  pickupLat, pickupLng, dropoffLat, dropoffLng,
  weightKg = 0, isFragile = false, urgency = 'STANDARD',
  zoneId = null, surgeMultiplier = 1.0
}) {
  const pricing = await getPricingConfig(zoneId);
  const now = new Date();
  const hour = now.getHours();

  // Distance
  let distanceKm = 1; // minimum 1km
  if (pickupLat && pickupLng && dropoffLat && dropoffLng) {
    distanceKm = Math.max(haversineKm(pickupLat, pickupLng, dropoffLat, dropoffLng), 0.5);
  }

  // Base components
  const base = pricing.baseFare;
  const distanceFee = Math.round(pricing.perKmRate * distanceKm);

  // Weight surcharge
  let weightFee = 0;
  const weight = parseFloat(weightKg) || 0;
  if (weight > pricing.weightThreshold2Kg) {
    weightFee = pricing.weightSurcharge2;
  } else if (weight > pricing.weightThreshold1Kg) {
    weightFee = pricing.weightSurcharge1;
  }

  // Fragile surcharge
  const fragileFee = isFragile ? pricing.fragileSurcharge : 0;

  // Subtotal before multipliers
  const subtotal = base + distanceFee + weightFee + fragileFee;

  // Urgency multiplier
  const urgencyMultiplier = urgency === 'INSTANT'
    ? pricing.instantMultiplier
    : urgency === 'EXPRESS'
      ? pricing.expressMultiplier
      : 1.0;

  // Peak hour multiplier
  const peakMultiplier = isPeakHour(pricing, hour) ? pricing.peakHourMultiplier : 1.0;

  // Final surge (take the highest of peak and zone surge)
  const finalSurge = Math.max(peakMultiplier, parseFloat(surgeMultiplier) || 1.0);

  // Total
  let total = Math.round(subtotal * urgencyMultiplier * finalSurge);

  // Apply min/max
  total = Math.max(total, pricing.minimumFare);
  total = Math.min(total, pricing.maximumFare);

  // Round to nearest 50 XOF for clean numbers
  total = Math.round(total / 50) * 50;

  // Commission split
  const commissionAmount = Math.round(total * pricing.commissionRate / 100);
  const driverPayout = total - commissionAmount;

  return {
    total,
    currency: pricing.currency,
    breakdown: {
      baseFare: base,
      distanceFee,
      distanceKm: Math.round(distanceKm * 10) / 10,
      weightFee,
      fragileFee,
      subtotal,
      urgencyMultiplier,
      peakMultiplier: isPeakHour(pricing, hour) ? pricing.peakHourMultiplier : 1.0,
      surgeMultiplier: parseFloat(surgeMultiplier) || 1.0,
      finalMultiplier: Math.round(urgencyMultiplier * finalSurge * 100) / 100,
    },
    commission: {
      rate: pricing.commissionRate,
      amount: commissionAmount,
    },
    driverPayout,
    isPeakHour: isPeakHour(pricing, hour),
    urgency,
  };
}

/**
 * Quick estimate without GPS (for frontend preview)
 */
async function estimatePrice({ distanceKm = 5, weightKg = 0, isFragile = false, urgency = 'STANDARD', zoneId = null }) {
  const pricing = await getPricingConfig(zoneId);
  const base = pricing.baseFare;
  const distanceFee = Math.round(pricing.perKmRate * distanceKm);
  const weightFee = parseFloat(weightKg) > pricing.weightThreshold2Kg
    ? pricing.weightSurcharge2
    : parseFloat(weightKg) > pricing.weightThreshold1Kg
      ? pricing.weightSurcharge1 : 0;
  const fragileFee = isFragile ? pricing.fragileSurcharge : 0;
  const subtotal = base + distanceFee + weightFee + fragileFee;
  const urgencyMultiplier = urgency === 'INSTANT' ? pricing.instantMultiplier : urgency === 'EXPRESS' ? pricing.expressMultiplier : 1.0;
  let total = Math.round(Math.round(subtotal * urgencyMultiplier) / 50) * 50;
  total = Math.max(total, pricing.minimumFare);
  return { min: total, max: Math.round(total * 1.5 / 50) * 50, currency: pricing.currency };
}

module.exports = {
  calculatePrice,
  estimatePrice,
  getPricingConfig,
  haversineKm,
  TIER_PHOTO_LIMITS,
  TIER_FEES,
  recommendedFee,
  DEFAULT_PRICING,
};
