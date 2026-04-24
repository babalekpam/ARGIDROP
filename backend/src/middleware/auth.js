const jwt = require('jsonwebtoken');
const { getDB } = require('../config/database');
const { users } = require('../schema');
const { eq } = require('drizzle-orm');

const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const db = getDB();
    const [user] = await db.select().from(users).where(eq(users.id, decoded.userId)).limit(1);

    if (!user) return res.status(401).json({ success: false, message: 'User not found' });
    if (user.status === 'BANNED') return res.status(403).json({ success: false, message: 'Account banned' });
    if (user.status === 'SUSPENDED') return res.status(403).json({ success: false, message: 'Account suspended' });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
  if (!roles.includes(req.user.role)) return res.status(403).json({ success: false, message: 'Insufficient permissions' });
  next();
};

const generateTokens = (userId, role) => {
  const access = jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
  const refresh = jwt.sign({ userId, role, type: 'refresh' }, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' });
  return { access, refresh };
};

module.exports = { authenticate, requireRole, generateTokens };
