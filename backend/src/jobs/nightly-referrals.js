// Nightly referral sweep: runs at 23:50 (just before nightly payouts), in two
// passes — first promote any referred users that have hit the qualification
// threshold, then dispatch rewards for newly-qualified rows. The two phases
// are kept separate so the cron is easy to reason about and so manual
// reruns of `dispatchQualifiedRewards` can be done independently.
const cron = require('node-cron');
const { qualifyPendingReferrals, dispatchQualifiedRewards } = require('../services/referral');

let started = false;

function startNightlyReferrals() {
  if (started) return;
  started = true;
  cron.schedule('50 23 * * *', async () => {
    try {
      const q = await qualifyPendingReferrals();
      const d = await dispatchQualifiedRewards();
      console.log(`🎁 Referral sweep: ${q.qualified}/${q.checked} qualified · ${d.dispatched} rewards dispatched`);
    } catch (err) {
      console.error('🎁 Referral sweep failed:', err.message);
    }
  });
  console.log('✅ Nightly referral sweep cron scheduled (23:50 daily)');
}

module.exports = { startNightlyReferrals };
