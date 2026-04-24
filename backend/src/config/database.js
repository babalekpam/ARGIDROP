const { Pool } = require('pg');
const { drizzle } = require('drizzle-orm/node-postgres');
const schema = require('../schema');

let db;
let pool;

async function initDB() {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
  });
  db = drizzle(pool, { schema });
  await pool.query('SELECT 1');
  return db;
}

function getDB() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

module.exports = { initDB, getDB };
