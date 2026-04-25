// Seed Script — run once after `npm run db:push` to populate the database
// Usage: node scripts/seed.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { initDB, getDB } = require('../src/config/database');
const { users, businesses, businessWallets, drivers, zones, platformSettings } = require('../src/schema');

async function seed() {
  await initDB();
  const db = getDB();
  console.log('🌱 Seeding ArgiDrop database…\n');

  // ─── ADMIN USER ───
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'ArgiDropAdmin2026!!';
  const adminHash = await bcrypt.hash(adminPassword, 10);
  try {
    const [admin] = await db.insert(users).values({
      email: 'admin@argidrop.com',
      phone: '+22890000001',
      passwordHash: adminHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      firstName: 'Abel',
      lastName: 'Admin',
      emailVerified: true,
      phoneVerified: true,
      country: 'TG',
      language: 'fr',
    }).onConflictDoNothing().returning();
    if (admin) console.log(`✓ Admin user created: admin@argidrop.com / ${adminPassword}`);
    else console.log('• Admin user already exists');
  } catch (e) { console.log('• Admin:', e.message); }

  // ─── ZONES (West African cities) ───
  const ZONES = [
    { name: 'Lomé Central', city: 'Lomé', country: 'TG', currency: 'XOF', centerLat: 6.1319, centerLng: 1.2228, radiusKm: 15, commissionRate: 18, minimumDeliveryPrice: 500 },
    { name: 'Lomé Suburbs', city: 'Lomé', country: 'TG', currency: 'XOF', centerLat: 6.1652, centerLng: 1.2544, radiusKm: 30, commissionRate: 18, minimumDeliveryPrice: 1000 },
    { name: 'Abidjan Plateau', city: 'Abidjan', country: 'CI', currency: 'XOF', centerLat: 5.3298, centerLng: -4.0195, radiusKm: 15, commissionRate: 18, minimumDeliveryPrice: 800 },
    { name: 'Cotonou Center', city: 'Cotonou', country: 'BJ', currency: 'XOF', centerLat: 6.3703, centerLng: 2.3912, radiusKm: 15, commissionRate: 18, minimumDeliveryPrice: 500 },
    { name: 'Accra Central', city: 'Accra', country: 'GH', currency: 'GHS', centerLat: 5.6037, centerLng: -0.1870, radiusKm: 20, commissionRate: 18, minimumDeliveryPrice: 10 },
    { name: 'Dakar Plateau', city: 'Dakar', country: 'SN', currency: 'XOF', centerLat: 14.6928, centerLng: -17.4467, radiusKm: 15, commissionRate: 18, minimumDeliveryPrice: 500 },
    { name: 'Ouagadougou Central', city: 'Ouagadougou', country: 'BF', currency: 'XOF', centerLat: 12.3714, centerLng: -1.5197, radiusKm: 15, commissionRate: 18, minimumDeliveryPrice: 500 },
    { name: 'Lagos Island', city: 'Lagos', country: 'NG', currency: 'NGN', centerLat: 6.4541, centerLng: 3.3947, radiusKm: 20, commissionRate: 20, minimumDeliveryPrice: 500 },
  ];
  for (const z of ZONES) {
    try {
      await db.insert(zones).values({ ...z, isActive: true }).onConflictDoNothing();
      console.log(`✓ Zone: ${z.name} (${z.country}, ${z.currency})`);
    } catch (e) { console.log(`• Zone ${z.name}:`, e.message); }
  }

  // ─── PLATFORM SETTINGS ───
  const SETTINGS = [
    { key: 'platform_commission_rate', value: '18', description: 'Default commission percentage' },
    { key: 'driver_elite_subscription', value: '19', description: 'Monthly price for Elite drivers (USD)' },
    { key: 'business_pro_subscription', value: '49', description: 'Monthly price for Pro businesses (USD)' },
    { key: 'pickup_gps_tolerance_m', value: '200', description: 'Max GPS distance from pickup (meters)' },
    { key: 'delivery_gps_tolerance_m', value: '150', description: 'Max GPS distance from dropoff (meters)' },
    { key: 'payment_code_ttl_mins', value: '15', description: 'Payment QR validity window' },
    { key: 'pickup_code_ttl_mins', value: '120', description: 'Pickup QR validity after acceptance' },
    { key: 'min_driver_trust_score', value: '50', description: 'Suspend below this trust score' },
  ];
  for (const s of SETTINGS) {
    try {
      await db.insert(platformSettings).values(s).onConflictDoNothing();
    } catch {}
  }
  console.log(`✓ ${SETTINGS.length} platform settings loaded`);

  // ─── SAMPLE BUSINESS (for quick testing) ───
  if (process.env.SEED_TEST_DATA === 'true') {
    try {
      const bizHash = await bcrypt.hash('TestBusiness2026!', 10);
      const [bizUser] = await db.insert(users).values({
        email: 'demo@lafermebio.tg',
        phone: '+22890123456',
        passwordHash: bizHash,
        role: 'BUSINESS',
        status: 'ACTIVE',
        firstName: 'Kodjo',
        lastName: 'Amenuvor',
        emailVerified: true,
        phoneVerified: true,
        country: 'TG',
        language: 'fr',
      }).onConflictDoNothing().returning();
      if (bizUser) {
        const [biz] = await db.insert(businesses).values({
          userId: bizUser.id,
          companyName: 'La Ferme Bio Togo',
          businessType: 'Agriculture / Agroalimentaire',
          address: 'Avenue de la Libération, Lomé',
          city: 'Lomé',
          country: 'TG',
          verificationStatus: 'APPROVED',
          defaultPaymentProvider: 'FLUTTERWAVE',
          isVerifiedBadge: true,
        }).returning();
        // Create wallet with demo balance
        await db.insert(businessWallets).values({
          businessId: biz.id,
          balance: '50000',
          currency: 'XOF',
        });
        console.log('✓ Demo business: demo@lafermebio.tg / TestBusiness2026!');
        console.log('  Wallet funded with 50,000 XOF');
      }

      // Demo driver
      const driverHash = await bcrypt.hash('TestDriver2026!', 10);
      const [driverUser] = await db.insert(users).values({
        email: 'demo.driver@argidrop.africa',
        phone: '+22891234567',
        passwordHash: driverHash,
        role: 'DRIVER',
        status: 'ACTIVE',
        firstName: 'Yao',
        lastName: 'Adjovi',
        emailVerified: true,
        phoneVerified: true,
        country: 'TG',
        language: 'fr',
      }).onConflictDoNothing().returning();
      if (driverUser) {
        await db.insert(drivers).values({
          userId: driverUser.id,
          vehicleType: 'MOTORCYCLE',
          vehicleMake: 'Yamaha',
          vehicleModel: 'YBR 125',
          vehicleYear: 2022,
          vehiclePlate: 'TG-1234-LM',
          vehicleColor: 'Red',
          verificationStatus: 'APPROVED',
          isActive: true,
          payoutProvider: 'MTN_MOMO',
          payoutAccount: '+22891234567',
          currentLat: '6.1319',
          currentLng: '1.2228',
        });
        console.log('✓ Demo driver: demo.driver@argidrop.africa / TestDriver2026!');
      }
    } catch (e) { console.log('• Test data:', e.message); }
  }

  console.log('\n✨ Seed complete. Run `npm run dev` to start the backend.');
  console.log('\nNext steps:');
  console.log('  1. Login to admin: https://your-url.replit.app/admin');
  console.log('  2. Register drivers and businesses to start the pilot');
  console.log('  3. Set SEED_TEST_DATA=true in .env to seed demo accounts\n');
  process.exit(0);
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
