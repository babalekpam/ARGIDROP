// Business resolution: a BUSINESS-role user acts for the business they OWN
// (businesses.userId) or the one they STAFF (business_staff). Operational
// routes resolve through here so team members can work on the owner's
// business; wallet/payout/corporate routes intentionally keep the direct
// owner-only lookup.
const { eq } = require('drizzle-orm');
const { businesses, businessStaff } = require('../schema');

/**
 * Returns the business row the user operates, with a `staffRole` field:
 * 'OWNER' for the owning user, the business_staff.role for staff.
 * Returns null if the user has no business.
 */
async function resolveBusinessForUser(db, userId) {
  const [owned] = await db.select().from(businesses).where(eq(businesses.userId, userId)).limit(1);
  if (owned) return { ...owned, staffRole: 'OWNER' };

  const [staffed] = await db
    .select({ business: businesses, role: businessStaff.role })
    .from(businessStaff)
    .innerJoin(businesses, eq(businessStaff.businessId, businesses.id))
    .where(eq(businessStaff.userId, userId))
    .limit(1);
  if (staffed) return { ...staffed.business, staffRole: staffed.role };

  return null;
}

module.exports = { resolveBusinessForUser };
