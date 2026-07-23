/**
 * ArgiDrop Food — restaurant food delivery vertical.
 * Routes: public restaurant browse + menu, customer ordering, driver pickup.
 */

const express = require('express');
const { eq, and, desc, ilike } = require('drizzle-orm');
const { getDB } = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');
const { resolveBusinessForUser } = require('../services/business');
const {
  restaurants, restaurantMenuItems, foodOrders, foodOrderItems,
  businesses, users, drivers, zones,
} = require('../schema');


const router = express.Router();

// ─── PUBLIC: List active restaurants ───────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { city, cuisine, search, limit = 20, offset = 0 } = req.query;

    let query = getDB()
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

    const [restaurant] = await getDB()
      .select()
      .from(restaurants)
      .where(
        isUuid
          ? and(eq(restaurants.id, idOrSlug), eq(restaurants.status, 'ACTIVE'))
          : and(eq(restaurants.slug, idOrSlug), eq(restaurants.status, 'ACTIVE'))
      )
      .limit(1);

    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

    const menuItems = await getDB()
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

    const [restaurant] = await getDB()
      .select()
      .from(restaurants)
      .where(and(eq(restaurants.id, restaurantId), eq(restaurants.status, 'ACTIVE'), eq(restaurants.isOnline, true)))
      .limit(1);

    if (!restaurant) return res.status(404).json({ error: 'Restaurant is not available' });

    // Validate all menu items and compute totals
    const menuRows = await getDB()
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

    const [order] = await getDB().insert(foodOrders).values({
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
    await getDB().insert(foodOrderItems).values(
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
    const orders = await getDB()
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
    const [restaurant] = await getDB()
      .select({ businessId: restaurants.businessId })
      .from(restaurants)
      .where(eq(restaurants.id, restaurantId))
      .limit(1);

    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

    const userBiz = await resolveBusinessForUser(getDB(), req.user.id);

    if ((userBiz?.id !== restaurant.businessId) && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const {
      name, nameFr, description, descriptionFr, category,
      price, imageUrl, isAvailable, isPopular, preparationMins, allergens, sortOrder,
    } = req.body;

    if (!name || !price) return res.status(400).json({ error: 'name and price are required' });

    const [item] = await getDB().insert(restaurantMenuItems).values({
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

// ─── RESTAURANT SELF-SERVICE ONBOARDING ────────────────────────────────────

/**
 * POST /food/restaurants/apply
 * Any verified BUSINESS user can apply to become a restaurant partner.
 * Creates a restaurant record in PENDING status for admin approval.
 */
router.post('/restaurants/apply', authenticate, requireRole('BUSINESS'), async (req, res) => {
  try {
    const d = getDB();
    const biz = await resolveBusinessForUser(d, req.user.id);

    if (!biz) return res.status(404).json({ error: 'Business profile not found' });
    if (biz.verificationStatus !== 'APPROVED') {
      return res.status(403).json({ error: 'Business must be verified before applying as restaurant partner' });
    }

    // Check not already a restaurant
    const [existing] = await d
      .select({ id: restaurants.id, status: restaurants.status })
      .from(restaurants)
      .where(eq(restaurants.businessId, biz.id))
      .limit(1);

    if (existing) {
      return res.status(409).json({ error: 'Your business already has a restaurant profile', status: existing.status });
    }

    const {
      name, nameFr, description, descriptionFr, cuisineTypes,
      address, city, country, phone, whatsapp,
      openingHours, minimumOrderAmount, averageDeliveryMins,
    } = req.body;

    if (!name || !address || !city) {
      return res.status(400).json({ error: 'name, address and city are required' });
    }

    const slug = (name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')) + '-' + Date.now().toString(36);

    const [restaurant] = await d.insert(restaurants).values({
      businessId: biz.id,
      name,
      nameFr,
      slug,
      description,
      descriptionFr,
      cuisineTypes: cuisineTypes || [],
      address,
      city,
      country: country || biz.country || 'TG',
      phone: phone || biz.preferredMomoNumber,
      whatsapp,
      openingHours: openingHours || {},
      minimumOrderAmount: parseFloat(minimumOrderAmount || 0).toFixed(2),
      averageDeliveryMins: parseInt(averageDeliveryMins || 35),
      status: 'PENDING',
      isOnline: false,
    }).returning();

    res.status(201).json({
      restaurant,
      message: 'Application submitted. Our team will review and approve within 24 hours.',
    });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return res.status(409).json({ error: 'Slug already taken, try a slightly different name' });
    res.status(500).json({ error: 'Failed to submit restaurant application' });
  }
});

/**
 * GET /food/restaurants/mine — get the restaurant profile for the logged-in business
 */
router.get('/restaurants/mine', authenticate, requireRole('BUSINESS'), async (req, res) => {
  try {
    const d = getDB();
    const biz = await resolveBusinessForUser(d, req.user.id);
    if (!biz) return res.status(404).json({ error: 'Business not found' });

    const [restaurant] = await d.select().from(restaurants).where(eq(restaurants.businessId, biz.id)).limit(1);
    if (!restaurant) return res.status(404).json({ error: 'No restaurant profile found' });

    const menu = await d.select().from(restaurantMenuItems).where(eq(restaurantMenuItems.restaurantId, restaurant.id)).orderBy(restaurantMenuItems.sortOrder);

    res.json({ restaurant, menu });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch restaurant profile' });
  }
});

/**
 * PATCH /food/restaurants/mine — update own restaurant (name, hours, isOnline)
 */
router.patch('/restaurants/mine', authenticate, requireRole('BUSINESS'), async (req, res) => {
  try {
    const d = getDB();
    const biz = await resolveBusinessForUser(d, req.user.id);
    if (!biz) return res.status(404).json({ error: 'Business not found' });

    const [existing] = await d.select({ id: restaurants.id, status: restaurants.status }).from(restaurants).where(eq(restaurants.businessId, biz.id)).limit(1);
    if (!existing) return res.status(404).json({ error: 'No restaurant profile found' });
    if (existing.status !== 'ACTIVE') return res.status(403).json({ error: 'Restaurant must be approved before updating' });

    const allowed = ['name', 'nameFr', 'description', 'descriptionFr', 'phone', 'whatsapp', 'openingHours', 'minimumOrderAmount', 'averageDeliveryMins', 'isOnline'];
    const updates = { updatedAt: new Date() };
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const [updated] = await d.update(restaurants).set(updates).where(eq(restaurants.id, existing.id)).returning();
    res.json({ restaurant: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update restaurant' });
  }
});

module.exports = router;
