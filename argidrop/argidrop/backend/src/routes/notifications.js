const express = require('express');
const { eq, desc } = require('drizzle-orm');
const { getDB } = require('../config/database');
const { notifications } = require('../schema');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    const results = await db.select().from(notifications)
      .where(eq(notifications.userId, req.user.id))
      .orderBy(desc(notifications.sentAt))
      .limit(50);
    res.json({ success: true, notifications: results });
  } catch (err) { next(err); }
});

router.patch('/:id/read', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    await db.update(notifications).set({ readAt: new Date() }).where(eq(notifications.id, req.params.id));
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.patch('/read-all', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    await db.update(notifications).set({ readAt: new Date() }).where(eq(notifications.userId, req.user.id));
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
