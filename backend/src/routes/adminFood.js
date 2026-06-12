/**
 * Admin Food Management — approve restaurants, monitor food orders, handle disputes.
 * All routes require ADMIN role.
 */

const express = require('express');
const { eq, desc, and, sql } = require('drizzle-orm');
const { getDB } = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');
const {
  restaurants, restaurantMenuItems, foodOrders, foodOrderItems,
  businesses, users,
} = require('../schema');

const router = express.Router();

// GET /admin/food/restaurants — list all restaurants with status filter
router.get('/restaurants', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const db = getDB();
    const { status, limit = 50, offset = 0 } = req.query;

    let query = db
      .select({
        id: restaurants.id,
        name: restaurants.name,
        city: restaurants.city,
        country: restaurants.country,
        status: restaurants.status,
        rating: restaurants.rating,
        totalOrders: restaurants.totalOrders,
        isOnline: restaurants.isOnline,
        isFeatured: restaurants.isFeatured,
        commissionRate: restaurants.commissionRate,
        createdAt: restaurants.createdAt,
        businessName: businesses.companyName,
      })
      .from(restaurants)
      .leftJoin(businesses, eq(restaurants.businessId, businesses.id))
      .orderBy(desc(restaurants.createdAt))
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    if (status) query = query.where(eq(restaurants.status, status));

    const rows = await query;
    res.json({ restaurants: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch restaurants' });
  }
});

// PATCH /admin/food/restaurants/:id — approve, suspend, feature a restaurant
router.patch('/restaurants/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const db = getDB();
    const { status, isFeatured, commissionRate, isOnline } = req.body;
    const updates = { updatedAt: new Date() };
    if (status) updates.status = status;
    if (isFeatured !== undefined) updates.isFeatured = isFeatured;
    if (commissionRate !== undefined) updates.commissionRate = parseFloat(commissionRate).toFixed(2);
    if (isOnline !== undefined) updates.isOnline = isOnline;

    const [updated] = await db
      .update(restaurants)
      .set(updates)
      .where(eq(restaurants.id, req.params.id))
      .returning();

    if (!updated) return res.status(404).json({ error: 'Restaurant not found' });
    res.json({ restaurant: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update restaurant' });
  }
});

// GET /admin/food/orders — list food orders with filters
router.get('/orders', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const db = getDB();
    const { status, restaurantId, limit = 50, offset = 0 } = req.query;

    let conditions = [];
    if (status) conditions.push(eq(foodOrders.status, status));
    if (restaurantId) conditions.push(eq(foodOrders.restaurantId, restaurantId));

    const orders = await db
      .select({
        id: foodOrders.id,
        trackingToken: foodOrders.trackingToken,
        status: foodOrders.status,
        total: foodOrders.total,
        currency: foodOrders.currency,
        cashOnDelivery: foodOrders.cashOnDelivery,
        createdAt: foodOrders.createdAt,
        restaurantName: restaurants.name,
        restaurantCity: restaurants.city,
      })
      .from(foodOrders)
      .leftJoin(restaurants, eq(foodOrders.restaurantId, restaurants.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(foodOrders.createdAt))
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    res.json({ orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch food orders' });
  }
});

// GET /admin/food/stats — food vertical KPIs
router.get('/stats', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const db = getDB();

    const [totalRestaurants] = await db
      .select({ count: sql`count(*)::int` })
      .from(restaurants);

    const [activeRestaurants] = await db
      .select({ count: sql`count(*)::int` })
      .from(restaurants)
      .where(and(eq(restaurants.status, 'ACTIVE'), eq(restaurants.isOnline, true)));

    const [totalOrders] = await db
      .select({ count: sql`count(*)::int`, gmv: sql`coalesce(sum(total), 0)` })
      .from(foodOrders);

    const [deliveredOrders] = await db
      .select({ count: sql`count(*)::int`, gmv: sql`coalesce(sum(total), 0)` })
      .from(foodOrders)
      .where(eq(foodOrders.status, 'DELIVERED'));

    res.json({
      stats: {
        totalRestaurants: totalRestaurants.count,
        activeRestaurants: activeRestaurants.count,
        totalOrders: totalOrders.count,
        totalGmv: parseFloat(totalOrders.gmv || 0).toFixed(2),
        deliveredOrders: deliveredOrders.count,
        deliveredGmv: parseFloat(deliveredOrders.gmv || 0).toFixed(2),
        conversionRate: totalOrders.count > 0
          ? ((deliveredOrders.count / totalOrders.count) * 100).toFixed(1) + '%'
          : '0%',
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch food stats' });
  }
});

// PATCH /admin/food/orders/:id — update food order status (admin intervention)
router.patch('/orders/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const db = getDB();
    const { status, cancelReason } = req.body;
    const updates = { updatedAt: new Date() };
    if (status) updates.status = status;
    if (cancelReason) updates.cancelReason = cancelReason;
    if (status === 'CANCELLED') updates.cancelledAt = new Date();
    if (status === 'DELIVERED') updates.deliveredAt = new Date();

    const [updated] = await db
      .update(foodOrders)
      .set(updates)
      .where(eq(foodOrders.id, req.params.id))
      .returning();

    if (!updated) return res.status(404).json({ error: 'Order not found' });
    res.json({ order: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

module.exports = router;
