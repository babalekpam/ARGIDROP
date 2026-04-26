// Nightly auto-payout: at 23:59 local server time, any driver with
// pendingEarnings > 0 gets their balance disbursed to their saved payout phone.
// Safety net for drivers who don't manually press "End shift & cash out".
const cron = require('node-cron');
const { gt, eq } = require('drizzle-orm');
const { getDB } = require('../config/database');
const { drivers, users } = require('../schema');
const { processEndShiftPayout } = require('../services/payout');

let started = false;

function startNightlyPayouts() {
  if (started) return;
  started = true;
  // 23:59 every day, server time
  cron.schedule('59 23 * * *', async () => {
    try {
      const db = getDB();
      const candidates = await db.select().from(drivers).where(gt(drivers.pendingEarnings, '0'));
      console.log(`🌙 Nightly auto-payout: ${candidates.length} driver(s) with pending earnings`);
      for (const d of candidates) {
        if (!d.payoutPhone) continue;
        try {
          const [u] = await db.select().from(users).where(eq(users.id, d.userId)).limit(1);
          const result = await processEndShiftPayout(d, { trigger: 'NIGHTLY_AUTO', countryCode: u?.country || 'TG' });
          console.log(`  → driver ${d.id}: ${result.code || (result.ok ? 'OK' : 'FAIL')}`);
        } catch (err) {
          console.error(`  → driver ${d.id}: ${err.message}`);
        }
      }
    } catch (err) {
      console.error('🌙 Nightly auto-payout sweep failed:', err.message);
    }
  });
  console.log('✅ Nightly auto-payout cron scheduled (23:59 daily)');
}

module.exports = { startNightlyPayouts };
