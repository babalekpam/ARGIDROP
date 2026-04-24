const { getDB } = require('../config/database');
const { drivers, users } = require('../schema');
const { eq } = require('drizzle-orm');
const jwt = require('jsonwebtoken');

let io;

function initSocket(socketIO) {
  io = socketIO;

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('No token'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.role = decoded.role;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`🔌 Socket connected: ${socket.userId} (${socket.role})`);

    // Join role-based room
    socket.join(`user:${socket.userId}`);

    // Driver-specific rooms
    if (socket.role === 'DRIVER') {
      const db = getDB();
      const [driver] = await db.select().from(drivers).where(eq(drivers.userId, socket.userId)).limit(1);
      if (driver) {
        socket.driverId = driver.id;
        socket.join(`driver:${driver.id}`);

        // Update driver online status
        await db.update(drivers).set({ isOnline: true, updatedAt: new Date() }).where(eq(drivers.id, driver.id));
      }
    }

    // Join job room (for tracking)
    socket.on('join:job', (jobId) => {
      socket.join(`job:${jobId}`);
      console.log(`Socket ${socket.userId} joined job room: ${jobId}`);
    });

    socket.on('leave:job', (jobId) => {
      socket.leave(`job:${jobId}`);
    });

    // Business joins their room
    socket.on('join:business', (businessId) => {
      socket.join(`business:${businessId}`);
    });

    // Driver location update (alternative to REST)
    socket.on('driver:location', async ({ lat, lng, heading, speedKph, jobId }) => {
      if (socket.role !== 'DRIVER' || !socket.driverId) return;
      try {
        const db = getDB();
        await db.update(drivers).set({ currentLat: lat, currentLng: lng, lastLocationAt: new Date() }).where(eq(drivers.id, socket.driverId));
        if (jobId) {
          io.to(`job:${jobId}`).emit('driver:location_update', { driverId: socket.driverId, lat, lng, heading, speedKph, timestamp: new Date() });
        }
      } catch (err) {
        console.error('Location update error:', err);
      }
    });

    // Chat message
    socket.on('chat:message', ({ jobId, recipientId, content }) => {
      io.to(`job:${jobId}`).emit('chat:message', {
        jobId, senderId: socket.userId, content, timestamp: new Date()
      });
    });

    socket.on('disconnect', async () => {
      console.log(`🔌 Socket disconnected: ${socket.userId}`);
      if (socket.role === 'DRIVER' && socket.driverId) {
        try {
          const db = getDB();
          await db.update(drivers).set({ isOnline: false, updatedAt: new Date() }).where(eq(drivers.id, socket.driverId));
        } catch (err) { console.error('Driver offline update error:', err); }
      }
    });
  });
}

function getIO() {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

module.exports = { initSocket, getIO };
