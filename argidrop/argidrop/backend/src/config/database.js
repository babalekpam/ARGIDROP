const { neon } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-http');
const schema = require('../schema');

let db;

async function initDB() {
  const sql = neon(process.env.DATABASE_URL);
  db = drizzle(sql, { schema });
  // Verify connection
  await sql`SELECT 1`;
  return db;
}

function getDB() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

module.exports = { initDB, getDB };
