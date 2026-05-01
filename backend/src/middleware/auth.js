const jwt = require('jsonwebtoken');
const { getDB } = require('../config/database');
const { users } = require('../schema');
const { eq } = require('drizzle-orm');

// Convert a passwordChangedAt Date (or null/undefined) to the integer Unix
// second representation we embed in JWTs as the `pwdAt` claim. JWT numeric
// claims are seconds; matching that precision avoids spurious mismatches from
// millisecond rounding between the DB write and the token issuance.
const pwdAtSeconds = (date) => (date ? Math.floor(new Date(date).getTime() / 1000) : 0);

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

    // Reject tokens issued before the user's most recent password change so
    // changing the password immediately revokes every other device. Tokens
    // issued before this feature shipped have no `pwdAt` claim → treated as
    // 0, which still passes for users who have never changed their password.
    const tokenPwdAt = typeof decoded.pwdAt === 'number' ? decoded.pwdAt : 0;
    const userPwdAt = pwdAtSeconds(user.passwordChangedAt);
    if (tokenPwdAt < userPwdAt) {
      return res.status(401).json({ success: false, message: 'Session expired, please log in again' });
    }

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

const generateTokens = (userId, role, passwordChangedAt = null) => {
  const pwdAt = pwdAtSeconds(passwordChangedAt);
  const access = jwt.sign({ userId, role, pwdAt }, process.env.JWT_SECRET, { expiresIn: '7d' });
  const refresh = jwt.sign({ userId, role, pwdAt, type: 'refresh' }, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' });
  return { access, refresh };
};

module.exports = { authenticate, requireRole, generateTokens, pwdAtSeconds };
