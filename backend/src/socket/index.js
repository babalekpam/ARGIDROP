const { getDB } = require('../config/database');
const { drivers, users, businesses, jobs } = require('../schema');
const { eq } = require('drizzle-orm');
const jwt = require('jsonwebtoken');

let io;

/**
 * Returns true if the socket's user is a participant in the given job.
 * Participants are: the job's business owner, the assigned driver, or any ADMIN.
 * Used to gate room subscriptions and message broadcasts.
 */
async function isJobParticipant(socket, jobId) {
  if (!jobId) return false;
  if (socket.role === 'ADMIN') return true;
  try {
    const db = getDB();
    const [job] = await db.select({
      businessId: jobs.businessId,
      driverId: jobs.driverId,
    }).from(jobs).where(eq(jobs.id, jobId)).limit(1);
    if (!job) return false;

    if (socket.role === 'DRIVER') {
      return socket.driverId && job.driverId === socket.driverId;
    }
    if (socket.role === 'BUSINESS') {
      return socket.businessId && job.businessId === socket.businessId;
    }
    return false;
  } catch (err) {
    console.error('isJobParticipant error:', err);
    return false;
  }
}

function initSocket(socketIO) {
  io = socketIO;

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('No token'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const db = getDB();
      const [user] = await db.select().from(users).where(eq(users.id, decoded.userId)).limit(1);

      if (!user) return next(new Error('User not found'));
      if (user.status === 'BANNED') return next(new Error('Account banned'));
      if (user.status === 'SUSPENDED') return next(new Error('Account suspended'));

      socket.userId = user.id;
      socket.role = user.role;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.userId} (${socket.role})`);

    // Personal room — always safe (derived from authenticated identity)
    socket.join(`user:${socket.userId}`);

    // IMPORTANT: register every socket.on(...) handler synchronously BEFORE
    // any await. Clients commonly emit events the moment 'connect' fires,
    // and async work (DB lookups for auto-join) would otherwise leave a
    // window where events arrive but no handler is attached and the event
    // is silently dropped.

    // Subscribe to a specific job's tracking room. Caller must be a participant
    // (business owner, assigned driver, or admin) — otherwise we refuse.
    socket.on('join:job', async (jobId) => {
      if (typeof jobId !== 'string' || !jobId) {
        return socket.emit('error:room', { event: 'join:job', message: 'jobId required' });
      }
      const allowed = await isJobParticipant(socket, jobId);
      if (!allowed) {
        console.warn(`🚫 join:job denied: user=${socket.userId} role=${socket.role} jobId=${jobId}`);
        return socket.emit('error:unauthorized', { event: 'join:job', jobId });
      }
      socket.join(`job:${jobId}`);
    });

    socket.on('leave:job', (jobId) => {
      if (typeof jobId === 'string' && jobId) socket.leave(`job:${jobId}`);
    });

    // Driver location update (alternative to REST). Always stored against
    // the socket's own driverId (cannot be spoofed). When a jobId is
    // provided, only broadcast to that job's room if the driver is the
    // one assigned — otherwise the driver could spam fake coordinates
    // into rival drivers' job rooms.
    socket.on('driver:location', async ({ lat, lng, heading, speedKph, jobId }) => {
      if (socket.role !== 'DRIVER' || !socket.driverId) return;
      try {
        const db = getDB();
        await db.update(drivers).set({
          currentLat: lat, currentLng: lng, lastLocationAt: new Date()
        }).where(eq(drivers.id, socket.driverId));

        if (jobId) {
          const allowed = await isJobParticipant(socket, jobId);
          if (!allowed) {
            console.warn(`🚫 driver:location broadcast denied: driver=${socket.driverId} not assigned to job=${jobId}`);
            return;
          }
          io.to(`job:${jobId}`).emit('driver:location_update', {
            driverId: socket.driverId, lat, lng, heading, speedKph, timestamp: new Date()
          });
        }
      } catch (err) {
        console.error('Location update error:', err);
      }
    });

    // Chat: only participants may post into a job's chat room.
    socket.on('chat:message', async ({ jobId, content }) => {
      if (typeof jobId !== 'string' || !jobId || typeof content !== 'string' || !content.trim()) return;
      const allowed = await isJobParticipant(socket, jobId);
      if (!allowed) {
        console.warn(`🚫 chat:message denied: user=${socket.userId} jobId=${jobId}`);
        return socket.emit('error:unauthorized', { event: 'chat:message', jobId });
      }
      io.to(`job:${jobId}`).emit('chat:message', {
        jobId,
        senderId: socket.userId,
        senderRole: socket.role,
        content,
        timestamp: new Date(),
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

    // Auto-join role-derived rooms AFTER all handlers are registered.
    // (Doing this before handler registration would create a race where
    //  client events arriving on 'connect' get dropped.)
    (async () => {
      try {
        const db = getDB();
        if (socket.role === 'DRIVER') {
          const [driver] = await db.select().from(drivers).where(eq(drivers.userId, socket.userId)).limit(1);
          if (driver) {
            socket.driverId = driver.id;
            socket.join(`driver:${driver.id}`);
            await db.update(drivers).set({ isOnline: true, updatedAt: new Date() }).where(eq(drivers.id, driver.id));
          }
        } else if (socket.role === 'BUSINESS') {
          // Auto-join own business room. (The legacy `join:business` handler
          // accepted any businessId from the client and let any authenticated
          // user spy on any business's job:matched / job:picked_up /
          // job:delivered events. It has been removed in favor of this
          // server-derived auto-join.)
          const [biz] = await db.select().from(businesses).where(eq(businesses.userId, socket.userId)).limit(1);
          if (biz) {
            socket.businessId = biz.id;
            socket.join(`business:${biz.id}`);
          }
        }
      } catch (err) {
        console.error('Auto-join error:', err);
      }
    })();
  });
}

function getIO() {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

module.exports = { initSocket, getIO };
