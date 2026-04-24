require('dotenv').config();
const { defineConfig } = require('drizzle-kit');
module.exports = defineConfig({
  schema: './src/schema/index.js',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: { connectionString: process.env.DATABASE_URL }
});
