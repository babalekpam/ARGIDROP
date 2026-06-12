const { pgTable, text, integer, decimal, boolean, timestamp, jsonb, uuid, pgEnum, uniqueIndex } = require('drizzle-orm/pg-core');

// ─── ENUMS ───
const userRoleEnum = pgEnum('user_role', ['BUSINESS', 'DRIVER', 'ADMIN', 'ZONE_MANAGER']);
const userStatusEnum = pgEnum('user_status', ['PENDING', 'ACTIVE', 'SUSPENDED', 'BANNED']);
const verificationStatusEnum = pgEnum('verification_status', ['PENDING', 'APPROVED', 'REJECTED']);
const vehicleTypeEnum = pgEnum('vehicle_type', ['BICYCLE', 'MOTORCYCLE', 'CAR', 'VAN', 'TRUCK', 'TRICYCLE']);
const jobStatusEnum = pgEnum('job_status', [
  'DRAFT', 'AWAITING_PAYMENT', 'POSTED', 'MATCHED',
  'IN_TRANSIT', 'DELIVERED', 'COMPLETED',
  'CANCELLED', 'DISPUTED', 'EXPIRED'
]);
const jobUrgencyEnum = pgEnum('job_urgency', ['STANDARD', 'EXPRESS', 'INSTANT']);
const bidStatusEnum = pgEnum('bid_status', ['PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN']);
const paymentStatusEnum = pgEnum('payment_status', ['PENDING', 'HELD', 'RELEASED', 'REFUNDED', 'FAILED']);
// Provider codes match adapter.code in backend/src/services/payment-providers/.
// Add new providers here (and run db:push) before referencing them anywhere.
const paymentProviderEnum = pgEnum('payment_provider', [
  'FLUTTERWAVE', 'PAYSTACK', 'STRIPE', 'BANK_TRANSFER',
  'MTN_MOMO', 'ORANGE_MONEY', 'WAVE', 'MOOV', 'AIRTEL_MONEY', 'MPESA',
  'TMONEY', 'FLOOZ', 'VODAFONE_CASH', 'AIRTELTIGO_MONEY', 'TIGO_CASH', 'FREE_MONEY',
]);
const docTypeEnum = pgEnum('doc_type', [
  // Identity
  'SELFIE',               // Live selfie photo
  'SELFIE_WITH_ID',       // Selfie holding government ID (liveness + ID match)
  'GOVT_ID_FRONT',        // National ID / CNI recto
  'GOVT_ID_BACK',         // National ID / CNI verso
  'GOVT_ID',              // Legacy — kept for compat
  // Driving
  'DRIVERS_LICENSE',      // Permis de conduire
  // Vehicle
  'VEHICLE_REGISTRATION', // Carte grise
  'VEHICLE_INSURANCE',    // Assurance véhicule
  'VEHICLE_PHOTO_FRONT',  // Photo véhicule — plaque visible
  'VEHICLE_PHOTO',        // Legacy
  // Background
  'POLICE_CLEARANCE',     // Casier judiciaire (bulletin n°3)
  'PROOF_OF_ADDRESS',     // Justificatif de domicile (facture d'eau/électricité < 3 mois)
  // Business
  'BUSINESS_LICENSE',
  'INSURANCE',
  'BACKGROUND_CHECK',
]);
const disputeStatusEnum = pgEnum('dispute_status', ['OPEN', 'UNDER_REVIEW', 'RESOLVED_BUSINESS', 'RESOLVED_DRIVER', 'CLOSED']);
const scanTypeEnum = pgEnum('scan_type', ['PAYMENT', 'PICKUP', 'DELIVERY']);
const walletTxTypeEnum = pgEnum('wallet_tx_type', ['DEPOSIT', 'HOLD', 'RELEASE', 'REFUND', 'WITHDRAWAL', 'FEE']);
const driverPayoutStatusEnum = pgEnum('driver_payout_status', ['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED']);
const driverPayoutTriggerEnum = pgEnum('driver_payout_trigger', ['END_SHIFT', 'NIGHTLY_AUTO', 'ADMIN_MANUAL']);

// ─── DRIVER LEVEL (gamification — YANGO/GOZEM style) ───
const driverLevelEnum = pgEnum('driver_level', ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']);

// ─── FOOD DELIVERY ENUMS ───
const foodOrderStatusEnum = pgEnum('food_order_status', [
  'PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP',
  'PICKED_UP', 'DELIVERED', 'CANCELLED', 'REFUNDED',
]);
const restaurantStatusEnum = pgEnum('restaurant_status', ['PENDING', 'ACTIVE', 'SUSPENDED', 'CLOSED']);

// ─── CORPORATE ACCOUNT ENUMS ───
const corporateAccountStatusEnum = pgEnum('corporate_account_status', ['ACTIVE', 'SUSPENDED', 'CLOSED']);
const corporateBillingCycleEnum = pgEnum('corporate_billing_cycle', ['WEEKLY', 'BIWEEKLY', 'MONTHLY']);

// ─── M6 GROWTH ENGINE ENUMS ───
const referralStatusEnum = pgEnum('referral_status', ['PENDING', 'QUALIFIED', 'PAID', 'VOID']);
const promoStatusEnum = pgEnum('promo_status', ['ACTIVE', 'PAUSED', 'EXPIRED']);
const promoDiscountTypeEnum = pgEnum('promo_discount_type', ['PERCENT', 'FIXED', 'FREE_DELIVERY']);
const promoRoleScopeEnum = pgEnum('promo_role_scope', ['BUSINESS', 'DRIVER', 'BOTH']);

// ─── USERS ───
const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  phone: text('phone').unique(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull(),
  status: userStatusEnum('status').default('PENDING'),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  avatarUrl: text('avatar_url'),
  fcmToken: text('fcm_token'),
  emailVerified: boolean('email_verified').default(false),
  phoneVerified: boolean('phone_verified').default(false),
  country: text('country').default('TG'),
  language: text('language').default('fr'),
  // Market routing — derived from city/country at signup, but explicit so we can
  // query by market cheaply (e.g. "all Lagos drivers"). Nullable so legacy rows
  // are valid; the app fills it in lazily on next login.
  marketCode: text('market_code'),
  // Referral attribution — the code this user signed up with (e.g. "KOSSI-A7B2").
  // Used to credit the original referrer once the new user qualifies.
  referredByCode: text('referred_by_code'),
  lastLoginAt: timestamp('last_login_at'),
  // Bumped whenever the password changes. Embedded into every JWT as the
  // `pwdAt` claim (Unix seconds); the auth middleware rejects any token whose
  // `pwdAt` is older than this column, which immediately logs out every other
  // device after a password change. Nullable so legacy rows are valid; treated
  // as 0 when null.
  passwordChangedAt: timestamp('password_changed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

const otpCodes = pgTable('otp_codes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  code: text('code').notNull(),
  type: text('type').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

const businesses = pgTable('businesses', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  companyName: text('company_name').notNull(),
  taxId: text('tax_id'),
  businessType: text('business_type'),
  website: text('website'),
  address: text('address'),
  city: text('city'),
  country: text('country').default('TG'),
  verificationStatus: verificationStatusEnum('verification_status').default('PENDING'),
  defaultPaymentProvider: paymentProviderEnum('default_payment_provider').default('FLUTTERWAVE'),
  preferredMomoNumber: text('preferred_momo_number'),
  totalDeliveries: integer('total_deliveries').default(0),
  rating: decimal('rating', { precision: 3, scale: 2 }).default('0.00'),
  ratingCount: integer('rating_count').default(0),
  isVerifiedBadge: boolean('is_verified_badge').default(false),
  billingEmail: text('billing_email'),
  kycSubmittedAt: timestamp('kyc_submitted_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

const businessWallets = pgTable('business_wallets', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').references(() => businesses.id, { onDelete: 'cascade' }).notNull().unique(),
  balance: decimal('balance', { precision: 14, scale: 2 }).default('0.00'),
  heldBalance: decimal('held_balance', { precision: 14, scale: 2 }).default('0.00'),
  currency: text('currency').default('XOF'),
  autoTopupEnabled: boolean('auto_topup_enabled').default(false),
  autoTopupThreshold: decimal('auto_topup_threshold', { precision: 10, scale: 2 }),
  autoTopupAmount: decimal('auto_topup_amount', { precision: 10, scale: 2 }),
  lastDepositAt: timestamp('last_deposit_at'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

const walletTransactions = pgTable('wallet_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  walletId: uuid('wallet_id').references(() => businessWallets.id, { onDelete: 'cascade' }).notNull(),
  type: walletTxTypeEnum('type').notNull(),
  status: text('status').default('PENDING').notNull(),
  amount: decimal('amount', { precision: 14, scale: 2 }).notNull(),
  balanceBefore: decimal('balance_before', { precision: 14, scale: 2 }).notNull(),
  balanceAfter: decimal('balance_after', { precision: 14, scale: 2 }).notNull(),
  currency: text('currency').notNull(),
  jobId: uuid('job_id'),
  paymentProvider: paymentProviderEnum('payment_provider'),
  externalRef: text('external_ref'),
  // providerRef = the ID returned by the provider at initiation
  // (MTN X-Reference-Id, M-Pesa CheckoutRequestID, Wave session id, Orange pay_token).
  // Used by adapter.verifyPayment() — providers don't all accept lookup-by-our-tx_ref.
  providerRef: text('provider_ref'),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  externalRefUnique: uniqueIndex('wallet_tx_external_ref_unique').on(t.externalRef),
}));

const drivers = pgTable('drivers', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  licenseNumber: text('license_number'),
  vehicleType: vehicleTypeEnum('vehicle_type').notNull(),
  vehicleMake: text('vehicle_make'),
  vehicleModel: text('vehicle_model'),
  vehicleYear: integer('vehicle_year'),
  vehiclePlate: text('vehicle_plate'),
  vehicleColor: text('vehicle_color'),
  capacityKg: decimal('capacity_kg', { precision: 6, scale: 2 }),
  serviceZones: jsonb('service_zones').default('[]'),
  coverageRadius: integer('coverage_radius').default(15),
  verificationStatus: verificationStatusEnum('verification_status').default('PENDING'),
  isActive: boolean('is_active').default(false),
  isOnline: boolean('is_online').default(false),
  currentLat: decimal('current_lat', { precision: 10, scale: 7 }),
  currentLng: decimal('current_lng', { precision: 10, scale: 7 }),
  lastLocationAt: timestamp('last_location_at'),
  trustScore: decimal('trust_score', { precision: 4, scale: 2 }).default('100.00'),
  rating: decimal('rating', { precision: 3, scale: 2 }).default('0.00'),
  ratingCount: integer('rating_count').default(0),
  completionRate: decimal('completion_rate', { precision: 5, scale: 2 }).default('100.00'),
  totalDeliveries: integer('total_deliveries').default(0),
  totalEarnings: decimal('total_earnings', { precision: 14, scale: 2 }).default('0.00'),
  payoutProvider: paymentProviderEnum('payout_provider').default('FLUTTERWAVE'),
  payoutAccount: text('payout_account'),
  // PIN-gated end-of-shift payout (set during onboarding, used to authorize cash-out)
  payoutPinHash: text('payout_pin_hash'),
  payoutPhone: text('payout_phone'),         // mobile money number receiving payouts
  payoutPinSetAt: timestamp('payout_pin_set_at'),
  // Shift + pending earnings tracking
  pendingEarnings: decimal('pending_earnings', { precision: 14, scale: 2 }).default('0.00'),
  isOnShift: boolean('is_on_shift').default(false),
  shiftStartedAt: timestamp('shift_started_at'),
  shiftEndedAt: timestamp('shift_ended_at'),
  isEliteBadge: boolean('is_elite_badge').default(false),
  level: driverLevelEnum('level').default('BRONZE'),
  levelUpdatedAt: timestamp('level_updated_at'),
  // Bonus percentage on top of standard payout (0 / 3 / 6 / 10 for Bronze/Silver/Gold/Platinum)
  levelBonusPct: decimal('level_bonus_pct', { precision: 4, scale: 2 }).default('0.00'),
  // Platform accident insurance — enabled at Gold+ level
  hasAccidentInsurance: boolean('has_accident_insurance').default(false),
  totalRidesAllTime: integer('total_rides_all_time').default(0), // includes both deliveries & rides
  // KYC fields
  selfieUrl: text('selfie_url'),
  selfieWithIdUrl: text('selfie_with_id_url'),
  kycScore: integer('kyc_score').default(0),        // 0-100 admin-assigned score
  kycNotes: text('kyc_notes'),                       // Internal admin notes
  kycReviewedBy: uuid('kyc_reviewed_by').references(() => users.id),
  kycReviewedAt: timestamp('kyc_reviewed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

const driverDocuments = pgTable('driver_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  driverId: uuid('driver_id').references(() => drivers.id, { onDelete: 'cascade' }).notNull(),
  docType: docTypeEnum('doc_type').notNull(),
  fileUrl: text('file_url').notNull(),
  fileName: text('file_name'),
  status: verificationStatusEnum('status').default('PENDING'),
  rejectionReason: text('rejection_reason'),
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Business verification documents
const businessDocuments = pgTable('business_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').references(() => businesses.id, { onDelete: 'cascade' }).notNull(),
  docType: docTypeEnum('doc_type').notNull(), // BUSINESS_LICENSE, GOVT_ID
  fileUrl: text('file_url').notNull(),
  fileName: text('file_name'),
  status: verificationStatusEnum('status').default('PENDING'),
  rejectionReason: text('rejection_reason'),
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

const zones = pgTable('zones', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  // Stable market identifier used by users.marketCode and promo scoping.
  // Convention: COUNTRY-CITY3, e.g. TG-LME, NG-LOS, KE-NBO.
  code: text('code').unique(),
  city: text('city').notNull(),
  country: text('country').notNull(),
  currency: text('currency').notNull(),
  // IANA timezone (e.g. Africa/Lome). Used for time-windowed campaigns.
  timezone: text('timezone').default('Africa/Lome'),
  // Outbound WhatsApp number for transactional + marketing in this market.
  whatsappNumber: text('whatsapp_number'),
  centerLat: decimal('center_lat', { precision: 10, scale: 7 }),
  centerLng: decimal('center_lng', { precision: 10, scale: 7 }),
  radiusKm: integer('radius_km').default(30),
  isActive: boolean('is_active').default(true),
  launchedAt: timestamp('launched_at'),
  adminUserId: uuid('admin_user_id').references(() => users.id),
  surgeMultiplier: decimal('surge_multiplier', { precision: 3, scale: 2 }).default('1.00'),
  commissionRate: decimal('commission_rate', { precision: 4, scale: 2 }).default('15.00'),
  minimumDeliveryPrice: decimal('minimum_delivery_price', { precision: 10, scale: 2 }),
  // Per-market referral economics — defaults are conservative XOF amounts.
  // Driver reward credits to pendingEarnings; merchant reward becomes a
  // single-use auto-promo applied to their next job.
  referralRewardMerchant: decimal('referral_reward_merchant', { precision: 10, scale: 2 }).default('1500.00'),
  referralRewardDriver: decimal('referral_reward_driver', { precision: 10, scale: 2 }).default('2500.00'),
  // How many qualifying deliveries the referred user must complete before the
  // referrer's reward is unlocked. Stops abuse via signup-only farms.
  referralQualifyDeliveries: integer('referral_qualify_deliveries').default(1),
  createdAt: timestamp('created_at').defaultNow(),
});

const jobs = pgTable('jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').references(() => businesses.id, { onDelete: 'cascade' }).notNull(),
  driverId: uuid('driver_id').references(() => drivers.id),
  trackingToken: text('tracking_token').unique().notNull(),

  // Pickup
  pickupAddress: text('pickup_address').notNull(),
  pickupCity: text('pickup_city'),
  pickupLat: decimal('pickup_lat', { precision: 10, scale: 7 }),
  pickupLng: decimal('pickup_lng', { precision: 10, scale: 7 }),
  pickupContactName: text('pickup_contact_name'),
  pickupContactPhone: text('pickup_contact_phone'),
  pickupNotes: text('pickup_notes'),

  // Dropoff
  dropoffAddress: text('dropoff_address').notNull(),
  dropoffCity: text('dropoff_city'),
  dropoffLat: decimal('dropoff_lat', { precision: 10, scale: 7 }),
  dropoffLng: decimal('dropoff_lng', { precision: 10, scale: 7 }),
  dropoffContactName: text('dropoff_contact_name'),
  dropoffContactPhone: text('dropoff_contact_phone'),
  dropoffNotes: text('dropoff_notes'),

  // Package
  packageType: text('package_type').notNull(),
  packageDescription: text('package_description'),
  weightKg: decimal('weight_kg', { precision: 6, scale: 2 }),
  dimensionsCm: text('dimensions_cm'),
  isFragile: boolean('is_fragile').default(false),
  requiresRefrigeration: boolean('requires_refrigeration').default(false),
  declaredValue: decimal('declared_value', { precision: 10, scale: 2 }),
  packagePhotoUrl: text('package_photo_url'),

  // Pricing
  urgency: jobUrgencyEnum('urgency').default('STANDARD'),
  vehicleTypeRequired: vehicleTypeEnum('vehicle_type_required'),
  bidMode: boolean('bid_mode').default(false),
  priceOffered: decimal('price_offered', { precision: 10, scale: 2 }).notNull(),
  finalPrice: decimal('final_price', { precision: 10, scale: 2 }),
  currency: text('currency').default('XOF'),
  // Promo code applied at job creation (if any). Discount is platform-funded:
  // the merchant pays priceOffered (already discounted), the driver still
  // receives a payout based on the original/full delivery economics.
  appliedPromoCode: text('applied_promo_code'),
  discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }).default('0.00'),
  // Per-job driver bonus paid by the platform (e.g. NIGHTSHIFT campaign).
  // Added to the driver payout on top of the standard delivery price.
  driverBonusAmount: decimal('driver_bonus_amount', { precision: 10, scale: 2 }).default('0.00'),
  insuranceAdded: boolean('insurance_added').default(false),
  insurancePremium: decimal('insurance_premium', { precision: 6, scale: 2 }),

  // PAYMENT QR (Scan #1 - business pays to activate)
  paymentCode: uuid('payment_code').defaultRandom().notNull(),
  paymentCodeExpiresAt: timestamp('payment_code_expires_at'),
  paymentConfirmedAt: timestamp('payment_confirmed_at'),
  paymentProvider: paymentProviderEnum('payment_provider'),
  paymentProviderRef: text('payment_provider_ref'),

  // PICKUP QR (Scan #2 - driver confirms package handoff)
  pickupCode: uuid('pickup_code'),
  pickupCodeGeneratedAt: timestamp('pickup_code_generated_at'),
  pickupScannedAt: timestamp('pickup_scanned_at'),
  pickupScanLat: decimal('pickup_scan_lat', { precision: 10, scale: 7 }),
  pickupScanLng: decimal('pickup_scan_lng', { precision: 10, scale: 7 }),

  // DELIVERY QR (Scan #3 - driver confirms dropoff)
  deliveryCode: uuid('delivery_code'),
  deliveryCodeGeneratedAt: timestamp('delivery_code_generated_at'),
  // recipientSecret is the actual QR authorization secret — separate from the public deliveryCode URL token
  recipientSecret: uuid('recipient_secret'),
  deliveryScannedAt: timestamp('delivery_scanned_at'),
  deliveryScanLat: decimal('delivery_scan_lat', { precision: 10, scale: 7 }),
  deliveryScanLng: decimal('delivery_scan_lng', { precision: 10, scale: 7 }),
  deliveryProofUrl: text('delivery_proof_url'),

  // Status
  status: jobStatusEnum('status').default('DRAFT'),
  cancelReason: text('cancel_reason'),
  cancelledBy: uuid('cancelled_by').references(() => users.id),

  // Timing
  scheduledPickupAt: timestamp('scheduled_pickup_at'),
  estimatedDurationMins: integer('estimated_duration_mins'),
  estimatedDistanceKm: decimal('estimated_distance_km', { precision: 6, scale: 2 }),
  matchedAt: timestamp('matched_at'),
  pickedUpAt: timestamp('picked_up_at'),
  deliveredAt: timestamp('delivered_at'),
  completedAt: timestamp('completed_at'),

  zoneId: uuid('zone_id').references(() => zones.id),

  // Consumer (B2C) delivery fields
  createdByUserId: uuid('created_by_user_id').references(() => users.id),
  isConsumerOrder: boolean('is_consumer_order').default(false),
  consumerSurcharge: decimal('consumer_surcharge', { precision: 10, scale: 2 }).default('0.00'),
  cashOnDelivery: boolean('cash_on_delivery').default(false),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

const qrScanEvents = pgTable('qr_scan_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'cascade' }).notNull(),
  scanType: scanTypeEnum('scan_type').notNull(),
  scannedByUserId: uuid('scanned_by_user_id').references(() => users.id),
  scannedCode: text('scanned_code'),
  gpsLat: decimal('gps_lat', { precision: 10, scale: 7 }),
  gpsLng: decimal('gps_lng', { precision: 10, scale: 7 }),
  gpsAccuracyMeters: decimal('gps_accuracy_meters', { precision: 8, scale: 2 }),
  distanceFromExpectedMeters: decimal('distance_from_expected_meters', { precision: 10, scale: 2 }),
  deviceInfo: text('device_info'),
  ipAddress: text('ip_address'),
  success: boolean('success').notNull(),
  failureReason: text('failure_reason'),
  createdAt: timestamp('created_at').defaultNow(),
});

const jobBids = pgTable('job_bids', {
  id: uuid('id').defaultRandom().primaryKey(),
  jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'cascade' }).notNull(),
  driverId: uuid('driver_id').references(() => drivers.id, { onDelete: 'cascade' }).notNull(),
  bidPrice: decimal('bid_price', { precision: 10, scale: 2 }).notNull(),
  message: text('message'),
  status: bidStatusEnum('status').default('PENDING'),
  createdAt: timestamp('created_at').defaultNow(),
});

const jobStops = pgTable('job_stops', {
  id: uuid('id').defaultRandom().primaryKey(),
  jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'cascade' }).notNull(),
  address: text('address').notNull(),
  lat: decimal('lat', { precision: 10, scale: 7 }),
  lng: decimal('lng', { precision: 10, scale: 7 }),
  contactName: text('contact_name'),
  contactPhone: text('contact_phone'),
  notes: text('notes'),
  sequenceOrder: integer('sequence_order').notNull(),
  status: text('status').default('PENDING'),
  deliveryCode: uuid('delivery_code'),
  scannedAt: timestamp('scanned_at'),
});

const driverLocations = pgTable('driver_locations', {
  id: uuid('id').defaultRandom().primaryKey(),
  driverId: uuid('driver_id').references(() => drivers.id, { onDelete: 'cascade' }).notNull(),
  jobId: uuid('job_id').references(() => jobs.id),
  lat: decimal('lat', { precision: 10, scale: 7 }).notNull(),
  lng: decimal('lng', { precision: 10, scale: 7 }).notNull(),
  heading: decimal('heading', { precision: 5, scale: 2 }),
  speedKph: decimal('speed_kph', { precision: 5, scale: 2 }),
  timestamp: timestamp('timestamp').defaultNow(),
});

const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  jobId: uuid('job_id').references(() => jobs.id).notNull(),
  businessId: uuid('business_id').references(() => businesses.id).notNull(),
  driverId: uuid('driver_id').references(() => drivers.id),
  grossAmount: decimal('gross_amount', { precision: 14, scale: 2 }).notNull(),
  commissionRate: decimal('commission_rate', { precision: 4, scale: 2 }).notNull(),
  commissionAmount: decimal('commission_amount', { precision: 14, scale: 2 }).notNull(),
  driverPayout: decimal('driver_payout', { precision: 14, scale: 2 }).notNull(),
  surgeMultiplier: decimal('surge_multiplier', { precision: 3, scale: 2 }).default('1.00'),
  insurancePremium: decimal('insurance_premium', { precision: 6, scale: 2 }).default('0.00'),
  currency: text('currency').default('XOF'),
  paymentProvider: paymentProviderEnum('payment_provider'),
  providerTxRef: text('provider_tx_ref'),
  providerPayoutRef: text('provider_payout_ref'),
  status: paymentStatusEnum('status').default('PENDING'),
  heldAt: timestamp('held_at'),
  releasedAt: timestamp('released_at'),
  refundedAt: timestamp('refunded_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

const ratings = pgTable('ratings', {
  id: uuid('id').defaultRandom().primaryKey(),
  jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'cascade' }).notNull(),
  ratedByUserId: uuid('rated_by_user_id').references(() => users.id).notNull(),
  ratedUserId: uuid('rated_user_id').references(() => users.id).notNull(),
  score: integer('score').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  oneRatingPerRaterPerJob: uniqueIndex('ratings_job_rater_unique').on(t.jobId, t.ratedByUserId),
}));

const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'cascade' }).notNull(),
  senderId: uuid('sender_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  recipientId: uuid('recipient_id').references(() => users.id).notNull(),
  content: text('content').notNull(),
  messageType: text('message_type').default('TEXT'),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  data: jsonb('data'),
  readAt: timestamp('read_at'),
  sentAt: timestamp('sent_at').defaultNow(),
});

const disputes = pgTable('disputes', {
  id: uuid('id').defaultRandom().primaryKey(),
  jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'cascade' }).notNull(),
  raisedByUserId: uuid('raised_by_user_id').references(() => users.id).notNull(),
  reason: text('reason').notNull(),
  description: text('description'),
  evidenceUrls: jsonb('evidence_urls').default('[]'),
  status: disputeStatusEnum('status').default('OPEN'),
  resolution: text('resolution'),
  resolvedBy: uuid('resolved_by').references(() => users.id),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── DRIVER PAYOUTS ───
// Each row = one disbursement attempt (end-of-shift, nightly cron, or admin-manual).
// We never store an indefinite balance — pendingEarnings on `drivers` is short-lived
// and zeroed when a SUCCESS payout is recorded.
const driverPayouts = pgTable('driver_payouts', {
  id: uuid('id').defaultRandom().primaryKey(),
  driverId: uuid('driver_id').references(() => drivers.id, { onDelete: 'cascade' }).notNull(),
  amount: decimal('amount', { precision: 14, scale: 2 }).notNull(),
  currency: text('currency').default('XOF'),
  provider: paymentProviderEnum('provider').notNull(),
  providerRef: text('provider_ref'),
  status: driverPayoutStatusEnum('status').default('PENDING'),
  trigger: driverPayoutTriggerEnum('trigger').notNull(),
  destinationPhone: text('destination_phone').notNull(),
  failureReason: text('failure_reason'),
  jobsCount: integer('jobs_count').default(0),    // how many deliveries this payout covered
  shiftStartedAt: timestamp('shift_started_at'),
  shiftEndedAt: timestamp('shift_ended_at'),
  createdAt: timestamp('created_at').defaultNow(),
  completedAt: timestamp('completed_at'),
});

const platformSettings = pgTable('platform_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  description: text('description'),
  updatedBy: uuid('updated_by').references(() => users.id),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ─── MERCHANT SUBSCRIPTION TIERS ───
const merchantTierEnum = pgEnum('merchant_tier', ['FREE', 'STANDARD', 'PREMIUM', 'PRO']);

const merchantSubscriptions = pgTable('merchant_subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').references(() => businesses.id, { onDelete: 'cascade' }).notNull().unique(),
  tier: merchantTierEnum('tier').default('FREE'),
  monthlyFee: decimal('monthly_fee', { precision: 10, scale: 2 }).default('0.00'),
  currency: text('currency').default('XOF'),
  photoLimit: integer('photo_limit').default(5),
  deliveriesThisMonth: integer('deliveries_this_month').default(0),
  monthlyDeliveryThreshold: integer('monthly_delivery_threshold').default(100),
  currentPeriodStart: timestamp('current_period_start').defaultNow(),
  currentPeriodEnd: timestamp('current_period_end'),
  autoRenew: boolean('auto_renew').default(true),
  status: text('status').default('ACTIVE'), // ACTIVE | PAST_DUE | CANCELLED
  stripeSubscriptionId: text('stripe_subscription_id'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ─── MERCHANT LISTINGS ───
const listingStatusEnum = pgEnum('listing_status', ['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED']);
const listingTypeEnum = pgEnum('listing_type', ['PRODUCT', 'SERVICE', 'MENU_ITEM', 'PROMOTION']);

const merchantListings = pgTable('merchant_listings', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').references(() => businesses.id, { onDelete: 'cascade' }).notNull(),
  listingType: listingTypeEnum('listing_type').default('PRODUCT'),
  name: text('name').notNull(),
  nameEn: text('name_en'),
  nameFr: text('name_fr'),
  description: text('description'),
  descriptionEn: text('description_en'),
  descriptionFr: text('description_fr'),
  price: decimal('price', { precision: 10, scale: 2 }),
  currency: text('currency').default('XOF'),
  unit: text('unit'), // 'kg', 'item', 'bottle', etc.
  category: text('category'),
  tags: jsonb('tags').default('[]'),
  inStock: boolean('in_stock').default(true),
  isFeatured: boolean('is_featured').default(false),
  status: listingStatusEnum('status').default('ACTIVE'),
  viewCount: integer('view_count').default(0),
  orderCount: integer('order_count').default(0),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ─── LISTING PHOTOS ───
const listingPhotos = pgTable('listing_photos', {
  id: uuid('id').defaultRandom().primaryKey(),
  listingId: uuid('listing_id').references(() => merchantListings.id, { onDelete: 'cascade' }),
  businessId: uuid('business_id').references(() => businesses.id, { onDelete: 'cascade' }).notNull(),
  fileUrl: text('file_url').notNull(),
  fileName: text('file_name'),
  altText: text('alt_text'),
  isPrimary: boolean('is_primary').default(false),
  sortOrder: integer('sort_order').default(0),
  sizeBytes: integer('size_bytes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── MERCHANT PROFILE (public-facing page) ───
const merchantProfiles = pgTable('merchant_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').references(() => businesses.id, { onDelete: 'cascade' }).notNull().unique(),
  slug: text('slug').unique(), // e.g. "pharmacie-centrale-lome"
  tagline: text('tagline'),
  taglineEn: text('tagline_en'),
  taglineFr: text('tagline_fr'),
  coverPhotoUrl: text('cover_photo_url'),
  logoUrl: text('logo_url'),
  categories: jsonb('categories').default('[]'), // ['pharmacy', 'health', 'wellness']
  openingHours: jsonb('opening_hours').default('{}'),
  deliveryRadius: integer('delivery_radius').default(10), // km
  minimumOrderAmount: decimal('minimum_order_amount', { precision: 10, scale: 2 }),
  averageDeliveryTime: integer('average_delivery_time'), // minutes
  isPublic: boolean('is_public').default(true),
  isFeatured: boolean('is_featured').default(false),
  featuredUntil: timestamp('featured_until'),
  rating: decimal('rating', { precision: 3, scale: 2 }).default('0.00'),
  ratingCount: integer('rating_count').default(0),
  totalOrders: integer('total_orders').default(0),
  viewCount: integer('view_count').default(0),
  whatsapp: text('whatsapp'),
  instagram: text('instagram'),
  facebook: text('facebook'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ─── PRICING ENGINE CONFIG (per zone) ───
const deliveryPricing = pgTable('delivery_pricing', {
  id: uuid('id').defaultRandom().primaryKey(),
  zoneId: uuid('zone_id').references(() => zones.id, { onDelete: 'cascade' }).notNull().unique(),
  currency: text('currency').default('XOF'),
  baseFare: decimal('base_fare', { precision: 8, scale: 2 }).default('500.00'),
  perKmRate: decimal('per_km_rate', { precision: 8, scale: 2 }).default('150.00'),
  minimumFare: decimal('minimum_fare', { precision: 8, scale: 2 }).default('800.00'),
  maximumFare: decimal('maximum_fare', { precision: 8, scale: 2 }).default('25000.00'),
  // Weight surcharges
  weightThreshold1Kg: decimal('weight_threshold_1_kg', { precision: 6, scale: 2 }).default('10.00'),
  weightSurcharge1: decimal('weight_surcharge_1', { precision: 8, scale: 2 }).default('200.00'),
  weightThreshold2Kg: decimal('weight_threshold_2_kg', { precision: 6, scale: 2 }).default('25.00'),
  weightSurcharge2: decimal('weight_surcharge_2', { precision: 8, scale: 2 }).default('500.00'),
  // Urgency multipliers
  expressMultiplier: decimal('express_multiplier', { precision: 4, scale: 2 }).default('1.30'),
  instantMultiplier: decimal('instant_multiplier', { precision: 4, scale: 2 }).default('1.80'),
  // Surcharges
  fragileSurcharge: decimal('fragile_surcharge', { precision: 8, scale: 2 }).default('300.00'),
  peakHourMultiplier: decimal('peak_hour_multiplier', { precision: 4, scale: 2 }).default('1.30'),
  peakHoursStart1: integer('peak_hours_start_1').default(7),   // 7am
  peakHoursEnd1: integer('peak_hours_end_1').default(9),       // 9am
  peakHoursStart2: integer('peak_hours_start_2').default(12),  // 12pm
  peakHoursEnd2: integer('peak_hours_end_2').default(14),      // 2pm
  peakHoursStart3: integer('peak_hours_start_3').default(17),  // 5pm
  peakHoursEnd3: integer('peak_hours_end_3').default(20),      // 8pm
  // Commission
  commissionRate: decimal('commission_rate', { precision: 4, scale: 2 }).default('15.00'),
  isActive: boolean('is_active').default(true),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ─── M6 GROWTH ENGINE TABLES ───
// Personal share code per (user, role). One BUSINESS user has one BUSINESS code,
// a DRIVER user has one DRIVER code. Drivers and merchants invite within their
// own role pool — that's where the high-trust referral signal lives.
const referralCodes = pgTable('referral_codes', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: text('code').notNull().unique(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: userRoleEnum('role').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  oneCodePerUserRole: uniqueIndex('referral_codes_user_role_unique').on(t.userId, t.role),
}));

// One row per redemption attempt. Lifecycle:
//   PENDING   — referred user signed up with the code
//   QUALIFIED — referred user completed required deliveries; reward unlocked
//   PAID      — reward dispatched (driver pendingEarnings credited, merchant
//               auto-promo seeded)
//   VOID      — fraud / duplicate / referred user banned
const referrals = pgTable('referrals', {
  id: uuid('id').defaultRandom().primaryKey(),
  codeUsed: text('code_used').notNull(),
  referrerUserId: uuid('referrer_user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  referredUserId: uuid('referred_user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  referredRole: userRoleEnum('referred_role').notNull(),
  marketCode: text('market_code'),
  status: referralStatusEnum('status').default('PENDING'),
  qualifyingJobsCount: integer('qualifying_jobs_count').default(0),
  qualifiedAt: timestamp('qualified_at'),
  paidAt: timestamp('paid_at'),
  rewardAmount: decimal('reward_amount', { precision: 10, scale: 2 }),
  currency: text('currency'),
  voidReason: text('void_reason'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Marketing-issued discount/bonus campaign. `marketCode = NULL` means global
// (rare; mostly used for partner deals). `appliesToRole = BOTH` means a
// merchant can apply it for a discount AND drivers get the bonus on the
// same job — the same row drives both sides.
const promoCodes = pgTable('promo_codes', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: text('code').notNull().unique(),
  marketCode: text('market_code'),
  appliesToRole: promoRoleScopeEnum('applies_to_role').default('BUSINESS'),
  discountType: promoDiscountTypeEnum('discount_type').notNull(),
  discountValue: decimal('discount_value', { precision: 10, scale: 2 }).notNull(),
  // Capped maximum discount (only relevant for PERCENT type).
  maxDiscount: decimal('max_discount', { precision: 10, scale: 2 }),
  // Optional driver-side bonus — paid on top of normal payout for jobs that
  // use this code. Independent of any merchant discount.
  driverBonus: decimal('driver_bonus', { precision: 10, scale: 2 }).default('0.00'),
  minJobAmount: decimal('min_job_amount', { precision: 10, scale: 2 }).default('0.00'),
  maxRedemptions: integer('max_redemptions'),                  // total cap; null = unlimited
  maxRedemptionsPerUser: integer('max_redemptions_per_user').default(1),
  redemptionCount: integer('redemption_count').default(0),     // denormalized counter
  validFrom: timestamp('valid_from').defaultNow(),
  validUntil: timestamp('valid_until'),
  firstJobOnly: boolean('first_job_only').default(false),
  status: promoStatusEnum('status').default('ACTIVE'),
  // Description shown to users when a code is invalid/active.
  description: text('description'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});

// One row per (promo, job). The unique index prevents the same promo being
// double-counted on a single job, regardless of retries.
const promoRedemptions = pgTable('promo_redemptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  promoCodeId: uuid('promo_code_id').references(() => promoCodes.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'cascade' }).notNull(),
  discountApplied: decimal('discount_applied', { precision: 10, scale: 2 }).notNull(),
  driverBonusApplied: decimal('driver_bonus_applied', { precision: 10, scale: 2 }).default('0.00'),
  currency: text('currency'),
  redeemedAt: timestamp('redeemed_at').defaultNow(),
}, (t) => ({
  oneRedemptionPerJob: uniqueIndex('promo_redemptions_promo_job_unique').on(t.promoCodeId, t.jobId),
}));

// ─── DRIVER ACHIEVEMENTS (gamification badges) ───
const driverAchievements = pgTable('driver_achievements', {
  id: uuid('id').defaultRandom().primaryKey(),
  driverId: uuid('driver_id').references(() => drivers.id, { onDelete: 'cascade' }).notNull(),
  // Badge types: FIRST_DELIVERY, STREAK_7, STREAK_30, TOP_RATED, FAST_RESPONSE,
  //              CENTURY (100 deliveries), GOLD_LEVEL, PLATINUM_LEVEL, NIGHT_OWL, etc.
  badgeType: text('badge_type').notNull(),
  badgeName: text('badge_name').notNull(),
  badgeNameFr: text('badge_name_fr'),
  description: text('description'),
  descriptionFr: text('description_fr'),
  awardedAt: timestamp('awarded_at').defaultNow(),
}, (t) => ({
  oneBadgePerDriver: uniqueIndex('driver_achievements_driver_badge_unique').on(t.driverId, t.badgeType),
}));

// ─── RESTAURANTS (food delivery vertical — ArgiDrop Food) ───
const restaurants = pgTable('restaurants', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').references(() => businesses.id, { onDelete: 'cascade' }).notNull().unique(),
  name: text('name').notNull(),
  nameFr: text('name_fr'),
  slug: text('slug').unique(),
  description: text('description'),
  descriptionFr: text('description_fr'),
  cuisineTypes: jsonb('cuisine_types').default('[]'), // ['African', 'French', 'Fast Food']
  logoUrl: text('logo_url'),
  coverUrl: text('cover_url'),
  address: text('address').notNull(),
  city: text('city').notNull(),
  country: text('country').default('TG'),
  lat: decimal('lat', { precision: 10, scale: 7 }),
  lng: decimal('lng', { precision: 10, scale: 7 }),
  phone: text('phone'),
  whatsapp: text('whatsapp'),
  openingHours: jsonb('opening_hours').default('{}'),
  averageDeliveryMins: integer('average_delivery_mins').default(35),
  minimumOrderAmount: decimal('minimum_order_amount', { precision: 10, scale: 2 }).default('0.00'),
  deliveryFeeOverride: decimal('delivery_fee_override', { precision: 8, scale: 2 }),
  commissionRate: decimal('commission_rate', { precision: 4, scale: 2 }).default('20.00'),
  rating: decimal('rating', { precision: 3, scale: 2 }).default('0.00'),
  ratingCount: integer('rating_count').default(0),
  totalOrders: integer('total_orders').default(0),
  isOnline: boolean('is_online').default(false),
  isFeatured: boolean('is_featured').default(false),
  status: restaurantStatusEnum('status').default('PENDING'),
  zoneId: uuid('zone_id').references(() => zones.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

const restaurantMenuItems = pgTable('restaurant_menu_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  restaurantId: uuid('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  nameFr: text('name_fr'),
  description: text('description'),
  descriptionFr: text('description_fr'),
  category: text('category'), // 'Entrées', 'Plats', 'Boissons', 'Desserts'
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('XOF'),
  imageUrl: text('image_url'),
  isAvailable: boolean('is_available').default(true),
  isPopular: boolean('is_popular').default(false),
  preparationMins: integer('preparation_mins').default(15),
  allergens: jsonb('allergens').default('[]'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── FOOD ORDERS (ArgiDrop Food vertical) ───
const foodOrders = pgTable('food_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  restaurantId: uuid('restaurant_id').references(() => restaurants.id).notNull(),
  // customerId = the user who placed the order (can be BUSINESS or a future CONSUMER role)
  customerId: uuid('customer_id').references(() => users.id).notNull(),
  driverId: uuid('driver_id').references(() => drivers.id),
  trackingToken: text('tracking_token').unique().notNull(),
  status: foodOrderStatusEnum('status').default('PENDING'),
  // Delivery address
  deliveryAddress: text('delivery_address').notNull(),
  deliveryLat: decimal('delivery_lat', { precision: 10, scale: 7 }),
  deliveryLng: decimal('delivery_lng', { precision: 10, scale: 7 }),
  deliveryNotes: text('delivery_notes'),
  // Financials
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  deliveryFee: decimal('delivery_fee', { precision: 8, scale: 2 }).notNull(),
  serviceFee: decimal('service_fee', { precision: 8, scale: 2 }).default('0.00'),
  discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }).default('0.00'),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('XOF'),
  // Payment
  paymentProvider: paymentProviderEnum('payment_provider'),
  paymentRef: text('payment_ref'),
  paymentConfirmedAt: timestamp('payment_confirmed_at'),
  cashOnDelivery: boolean('cash_on_delivery').default(false),
  // Timing
  estimatedPickupAt: timestamp('estimated_pickup_at'),
  estimatedDeliveryAt: timestamp('estimated_delivery_at'),
  confirmedAt: timestamp('confirmed_at'),
  preparedAt: timestamp('prepared_at'),
  pickedUpAt: timestamp('picked_up_at'),
  deliveredAt: timestamp('delivered_at'),
  cancelledAt: timestamp('cancelled_at'),
  cancelReason: text('cancel_reason'),
  zoneId: uuid('zone_id').references(() => zones.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

const foodOrderItems = pgTable('food_order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => foodOrders.id, { onDelete: 'cascade' }).notNull(),
  menuItemId: uuid('menu_item_id').references(() => restaurantMenuItems.id).notNull(),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  specialInstructions: text('special_instructions'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── CORPORATE ACCOUNTS (enterprise B2B — volume discounts, monthly invoicing) ───
const corporateAccounts = pgTable('corporate_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').references(() => businesses.id, { onDelete: 'cascade' }).notNull().unique(),
  accountManagerId: uuid('account_manager_id').references(() => users.id), // internal ArgiDrop AM
  contractRef: text('contract_ref').unique(),
  commissionRate: decimal('commission_rate', { precision: 4, scale: 2 }).notNull().default('10.00'),
  billingCycle: corporateBillingCycleEnum('billing_cycle').default('MONTHLY'),
  creditLimit: decimal('credit_limit', { precision: 14, scale: 2 }).default('0.00'),
  currentCreditUsed: decimal('current_credit_used', { precision: 14, scale: 2 }).default('0.00'),
  currency: text('currency').default('XOF'),
  // Cash-on-delivery enabled for this corporate account
  codEnabled: boolean('cod_enabled').default(false),
  // API access for third-party integrations (e-commerce, ERP)
  apiAccessEnabled: boolean('api_access_enabled').default(false),
  apiKey: text('api_key').unique(),
  // SLA guarantees (minutes)
  slaMatchGuaranteeMins: integer('sla_match_guarantee_mins').default(20),
  slaDeliveryGuaranteeMins: integer('sla_delivery_guarantee_mins'),
  status: corporateAccountStatusEnum('status').default('ACTIVE'),
  activatedAt: timestamp('activated_at').defaultNow(),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Corporate monthly invoices (consolidated billing)
const corporateInvoices = pgTable('corporate_invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  corporateAccountId: uuid('corporate_account_id').references(() => corporateAccounts.id, { onDelete: 'cascade' }).notNull(),
  invoiceNumber: text('invoice_number').unique().notNull(),
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  deliveriesCount: integer('deliveries_count').default(0),
  grossAmount: decimal('gross_amount', { precision: 14, scale: 2 }).notNull(),
  commissionAmount: decimal('commission_amount', { precision: 14, scale: 2 }).notNull(),
  netAmount: decimal('net_amount', { precision: 14, scale: 2 }).notNull(),
  currency: text('currency').default('XOF'),
  status: text('status').default('DRAFT'), // DRAFT | SENT | PAID | OVERDUE | VOID
  sentAt: timestamp('sent_at'),
  paidAt: timestamp('paid_at'),
  dueAt: timestamp('due_at'),
  pdfUrl: text('pdf_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

module.exports = {
  // Enums
  userRoleEnum, userStatusEnum, verificationStatusEnum, vehicleTypeEnum,
  jobStatusEnum, jobUrgencyEnum, bidStatusEnum, paymentStatusEnum,
  paymentProviderEnum, docTypeEnum, disputeStatusEnum, scanTypeEnum,
  walletTxTypeEnum, merchantTierEnum, listingStatusEnum, listingTypeEnum,
  driverPayoutStatusEnum, driverPayoutTriggerEnum,
  referralStatusEnum, promoStatusEnum, promoDiscountTypeEnum, promoRoleScopeEnum,
  driverLevelEnum, foodOrderStatusEnum, restaurantStatusEnum,
  corporateAccountStatusEnum, corporateBillingCycleEnum,
  // Core tables
  users, otpCodes, businesses, businessWallets, walletTransactions,
  drivers, driverDocuments, businessDocuments, zones,
  jobs, qrScanEvents, jobBids, jobStops, driverLocations,
  payments, ratings, messages, notifications, disputes, platformSettings,
  driverPayouts,
  // Marketplace & merchant
  merchantSubscriptions, merchantListings, listingPhotos, merchantProfiles, deliveryPricing,
  // Growth engine
  referralCodes, referrals, promoCodes, promoRedemptions,
  // Gamification
  driverAchievements,
  // Food delivery vertical
  restaurants, restaurantMenuItems, foodOrders, foodOrderItems,
  // Corporate / enterprise
  corporateAccounts, corporateInvoices,
};
