const { pgTable, text, integer, decimal, boolean, timestamp, jsonb, uuid, pgEnum } = require('drizzle-orm/pg-core');

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
const paymentProviderEnum = pgEnum('payment_provider', ['FLUTTERWAVE', 'MTN_MOMO', 'ORANGE_MONEY', 'WAVE', 'MOOV', 'TMONEY', 'STRIPE', 'BANK_TRANSFER']);
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
  lastLoginAt: timestamp('last_login_at'),
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
  amount: decimal('amount', { precision: 14, scale: 2 }).notNull(),
  balanceBefore: decimal('balance_before', { precision: 14, scale: 2 }).notNull(),
  balanceAfter: decimal('balance_after', { precision: 14, scale: 2 }).notNull(),
  currency: text('currency').notNull(),
  jobId: uuid('job_id'),
  paymentProvider: paymentProviderEnum('payment_provider'),
  externalRef: text('external_ref'),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

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
  isEliteBadge: boolean('is_elite_badge').default(false),
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
  city: text('city').notNull(),
  country: text('country').notNull(),
  currency: text('currency').notNull(),
  centerLat: decimal('center_lat', { precision: 10, scale: 7 }),
  centerLng: decimal('center_lng', { precision: 10, scale: 7 }),
  radiusKm: integer('radius_km').default(30),
  isActive: boolean('is_active').default(true),
  adminUserId: uuid('admin_user_id').references(() => users.id),
  surgeMultiplier: decimal('surge_multiplier', { precision: 3, scale: 2 }).default('1.00'),
  commissionRate: decimal('commission_rate', { precision: 4, scale: 2 }).default('18.00'),
  minimumDeliveryPrice: decimal('minimum_delivery_price', { precision: 10, scale: 2 }),
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
  deliveryScannedAt: timestamp('delivery_scanned_at'),
  deliveryScanLat: decimal('delivery_scan_lat', { precision: 10, scale: 7 }),
  deliveryScanLng: decimal('delivery_scan_lng', { precision: 10, scale: 7 }),

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
});

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
  commissionRate: decimal('commission_rate', { precision: 4, scale: 2 }).default('18.00'),
  isActive: boolean('is_active').default(true),
  updatedAt: timestamp('updated_at').defaultNow(),
});

module.exports = {
  userRoleEnum, userStatusEnum, verificationStatusEnum, vehicleTypeEnum,
  jobStatusEnum, jobUrgencyEnum, bidStatusEnum, paymentStatusEnum,
  paymentProviderEnum, docTypeEnum, disputeStatusEnum, scanTypeEnum,
  walletTxTypeEnum, merchantTierEnum, listingStatusEnum, listingTypeEnum,
  users, otpCodes, businesses, businessWallets, walletTransactions,
  drivers, driverDocuments, businessDocuments, zones,
  jobs, qrScanEvents, jobBids, jobStops, driverLocations,
  payments, ratings, messages, notifications, disputes, platformSettings,
  merchantSubscriptions, merchantListings, listingPhotos, merchantProfiles, deliveryPricing
};
