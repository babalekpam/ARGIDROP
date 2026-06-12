/**
 * ArgiDrop Food — restaurant food delivery vertical.
 * Routes: public restaurant browse + menu, customer ordering, driver pickup.
 */

const express = require('express');
const { eq, and, desc, ilike } = require('drizzle-orm');
const { db } = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');
const {
  restaurants, restaurantMenuItems, foodOrders, foodOrderItems,
  businesses, users, drivers,
} = require('../schema');

const router = express.Router();

// ─── PUBLIC: List active restaurants ───────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { city, cuisine, search, limit = 20, offset = 0 } = req.query;

    let query = db
      .select({
        id: restaurants.id,
        name: restaurants.name,
        nameFr: restaurants.nameFr,
        slug: restaurants.slug,
        cuisineTypes: restaurants.cuisineTypes,
        logoUrl: restaurants.logoUrl,
        coverUrl: restaurants.coverUrl,
        city: restaurants.city,
        rating: restaurants.rating,
        ratingCount: restaurants.ratingCount,
        averageDeliveryMins: restaurants.averageDeliveryMins,
        minimumOrderAmount: restaurants.minimumOrderAmount,
        isOnline: restaurants.isOnline,
        isFeatured: restaurants.isFeatured,
      })
      .from(restaurants)
      .where(eq(restaurants.status, 'ACTIVE'))
      .orderBy(desc(restaurants.isFeatured), desc(restaurants.rating))
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    const rows = await query;
    res.json({ restaurants: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch restaurants' });
  }
});

// ─── PUBLIC: Restaurant detail + menu ──────────────────────────────────────
router.get('/:idOrSlug', async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    const isUuid = /^[0-9a-f-]{36}$/i.test(idOrSlug);

    const [restaurant] = await db
      .select()
      .from(restaurants)
      .where(
        isUuid
          ? and(eq(restaurants.id, idOrSlug), eq(restaurants.status, 'ACTIVE'))
          : and(eq(restaurants.slug, idOrSlug), eq(restaurants.status, 'ACTIVE'))
      )
      .limit(1);

    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

    const menuItems = await db
      .select()
      .from(restaurantMenuItems)
      .where(and(eq(restaurantMenuItems.restaurantId, restaurant.id), eq(restaurantMenuItems.isAvailable, true)))
      .orderBy(restaurantMenuItems.sortOrder);

    // Group menu by category
    const menuByCategory = menuItems.reduce((acc, item) => {
      const cat = item.category || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {});

    res.json({ restaurant, menu: menuByCategory });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch restaurant' });
  }
});

// ─── AUTHENTICATED: Place food order ───────────────────────────────────────
router.post('/orders', authenticate, async (req, res) => {
  try {
    const {
      restaurantId, items, deliveryAddress, deliveryLat, deliveryLng,
      deliveryNotes, paymentProvider, cashOnDelivery,
    } = req.body;

    if (!restaurantId || !items?.length || !deliveryAddress) {
      return res.status(400).json({ error: 'restaurantId, items and deliveryAddress are required' });
    }

    const [restaurant] = await db
      .select()
      .from(restaurants)
      .where(and(eq(restaurants.id, restaurantId), eq(restaurants.status, 'ACTIVE'), eq(restaurants.isOnline, true)))
      .limit(1);

    if (!restaurant) return res.status(404).json({ error: 'Restaurant is not available' });

    // Validate all menu items and compute totals
    const menuRows = await db
      .select()
      .from(restaurantMenuItems)
      .where(eq(restaurantMenuItems.restaurantId, restaurantId));

    const menuMap = Object.fromEntries(menuRows.map((m) => [m.id, m]));
    let subtotal = 0;
    const lineItems = [];

    for (const item of items) {
      const menu = menuMap[item.menuItemId];
      if (!menu || !menu.isAvailable) {
        return res.status(400).json({ error: `Item ${item.menuItemId} is not available` });
      }
      const qty = Math.max(1, parseInt(item.quantity) || 1);
      const unitPrice = parseFloat(menu.price);
      const lineSub = unitPrice * qty;
      subtotal += lineSub;
      lineItems.push({ menuItemId: menu.id, quantity: qty, unitPrice, subtotal: lineSub, specialInstructions: item.specialInstructions });
    }

    if (subtotal < parseFloat(restaurant.minimumOrderAmount || 0)) {
      return res.status(400).json({
        error: `Minimum order is ${restaurant.minimumOrderAmount} ${restaurant.currency || 'XOF'}`,
      });
    }

    const deliveryFee = parseFloat(restaurant.deliveryFeeOverride || 800);
    const serviceFee = Math.round(subtotal * 0.03);
    const total = subtotal + deliveryFee + serviceFee;
    const trackingToken = require('crypto').randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase();

    const [order] = await db.insert(foodOrders).values({
      restaurantId,
      customerId: req.user.id,
      trackingToken,
      status: 'PENDING',
      deliveryAddress,
      deliveryLat,
      deliveryLng,
      deliveryNotes,
      subtotal: subtotal.toFixed(2),
      deliveryFee: deliveryFee.toFixed(2),
      serviceFee: serviceFee.toFixed(2),
      total: total.toFixed(2),
      currency: 'XOF',
      paymentProvider: paymentProvider || null,
      cashOnDelivery: !!cashOnDelivery,
    }).returning();

    // Insert line items
    await db.insert(foodOrderItems).values(
      lineItems.map((li) => ({
        orderId: order.id,
        menuItemId: li.menuItemId,
        quantity: li.quantity,
        unitPrice: li.unitPrice.toFixed(2),
        subtotal: li.subtotal.toFixed(2),
        specialInstructions: li.specialInstructions || null,
      }))
    );

    res.status(201).json({ order, trackingToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

// ─── AUTHENTICATED: Get my food orders ─────────────────────────────────────
router.get('/orders/me', authenticate, async (req, res) => {
  try {
    const orders = await db
      .select({
        id: foodOrders.id,
        trackingToken: foodOrders.trackingToken,
        status: foodOrders.status,
        total: foodOrders.total,
        currency: foodOrders.currency,
        createdAt: foodOrders.createdAt,
        restaurantName: restaurants.name,
        restaurantLogo: restaurants.logoUrl,
      })
      .from(foodOrders)
      .leftJoin(restaurants, eq(foodOrders.restaurantId, restaurants.id))
      .where(eq(foodOrders.customerId, req.user.id))
      .orderBy(desc(foodOrders.createdAt))
      .limit(50);

    res.json({ orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// ─── RESTAURANT ADMIN: Update menu item ────────────────────────────────────
router.post('/:restaurantId/menu', authenticate, async (req, res) => {
  try {
    const { restaurantId } = req.params;

    // Verify the authenticated user owns this restaurant's business
    const [restaurant] = await db
      .select({ businessId: restaurants.businessId })
      .from(restaurants)
      .where(eq(restaurants.id, restaurantId))
      .limit(1);

    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

    const [biz] = await db
      .select({ userId: businesses.userId })
      .from(businesses)
      .where(eq(businesses.id, restaurant.businessId))
      .limit(1);

    if (!biz || (biz.userId !== req.user.id && req.user.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const {
      name, nameFr, description, descriptionFr, category,
      price, imageUrl, isAvailable, isPopular, preparationMins, allergens, sortOrder,
    } = req.body;

    if (!name || !price) return res.status(400).json({ error: 'name and price are required' });

    const [item] = await db.insert(restaurantMenuItems).values({
      restaurantId,
      name,
      nameFr,
      description,
      descriptionFr,
      category,
      price: parseFloat(price).toFixed(2),
      imageUrl,
      isAvailable: isAvailable !== false,
      isPopular: !!isPopular,
      preparationMins: preparationMins || 15,
      allergens: allergens || [],
      sortOrder: sortOrder || 0,
    }).returning();

    res.status(201).json({ item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add menu item' });
  }
});

module.exports = router;
