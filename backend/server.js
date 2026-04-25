require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');

const { initDB } = require('./src/config/database');
const { initSocket } = require('./src/socket');
const { initQueues } = require('./src/queues');

const authRoutes = require('./src/routes/auth');
const businessRoutes = require('./src/routes/businesses');
const driverRoutes = require('./src/routes/drivers');
const jobRoutes = require('./src/routes/jobs');
const adminRoutes = require('./src/routes/admin');
const trackRoutes = require('./src/routes/track');
const uploadRoutes = require('./src/routes/uploads');
const scanRoutes = require('./src/routes/scans');
const walletRoutes = require('./src/routes/wallets');
const listingsRoutes = require('./src/routes/listings');
const pricingRoutes = require('./src/routes/pricing');
const webhookRoutes = require('./src/routes/webhooks');
const notificationRoutes = require('./src/routes/notifications');

const { errorHandler } = require('./src/middleware/error');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.ALLOWED_ORIGINS?.split(',') || '*', methods: ['GET', 'POST'] }
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || '*', credentials: true }));

// Webhooks must parse raw body for signature verification, mount before json()
app.use('/api/v1/webhooks', webhookRoutes);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined'));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
app.use('/api', limiter);

// Tighter rate limit for unauthenticated public lookup endpoints to slow down
// trackingToken / deliveryCode enumeration. 60 requests per 5 minutes per IP
// is plenty for a recipient/business polling progress every few seconds.
const publicLookupLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many tracking requests. Please slow down.' },
});
app.use('/api/v1/track', publicLookupLimiter);
app.use('/api/v1/scans/r', publicLookupLimiter);

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'ArgiDrop API', timestamp: new Date().toISOString() }));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/businesses', businessRoutes);
app.use('/api/v1/drivers', driverRoutes);
app.use('/api/v1/jobs', jobRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/track', trackRoutes);
app.use('/api/v1/uploads', uploadRoutes);
app.use('/api/v1/scans', scanRoutes);
app.use('/api/v1/wallets', walletRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/listings', listingsRoutes);
app.use('/api/v1/pricing', pricingRoutes);

// Serve the built web app (production). When web/dist exists, all non-API
// requests fall through to the SPA's index.html so client-side routing works.
const webDist = path.resolve(__dirname, '../web/dist');
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get(/^\/(?!api\/|health$|socket\.io\/).*/, (req, res) => {
    res.sendFile(path.join(webDist, 'index.html'));
  });
}

app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
(async () => {
  try {
    await initDB();
    console.log('✅ Database connected');
    initSocket(io);
    console.log('✅ Socket.IO ready');
    await initQueues();
    console.log('✅ Queues ready');
    server.listen(PORT, '0.0.0.0', () => console.log(`🚀 ArgiDrop API on port ${PORT}`));
  } catch (err) {
    console.error('❌ Startup failed:', err);
    process.exit(1);
  }
})();

module.exports = { app, io };
