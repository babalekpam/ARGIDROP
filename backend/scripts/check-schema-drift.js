#!/usr/bin/env node
// Detect Drizzle schema vs live Postgres column drift.
// Exits 1 when columns declared in backend/src/schema/index.js are missing from
// the database (the kind of drift that produces silent 500s on SELECTs that
// pull every schema column).
//
// Usage:
//   node scripts/check-schema-drift.js
// Wire it into post-merge so missing migrations are caught immediately.

require('dotenv').config();
const { Client } = require('pg');
const schema = require('../src/schema');

function snakeize(name) {
  return name.replace(/[A-Z]/g, c => '_' + c.toLowerCase()).replace(/^_/, '');
}

function extractTablesFromSchema(schemaModule) {
  const out = {};
  for (const [, value] of Object.entries(schemaModule)) {
    if (!value || typeof value !== 'object') continue;
    const symbols = Object.getOwnPropertySymbols(value);
    const isTableSym = symbols.find(s => String(s) === 'Symbol(drizzle:IsDrizzleTable)');
    if (!isTableSym || !value[isTableSym]) continue;
    const nameSym = symbols.find(s => String(s) === 'Symbol(drizzle:Name)');
    const colsSym = symbols.find(s => String(s) === 'Symbol(drizzle:Columns)');
    const tableName = nameSym ? value[nameSym] : null;
    if (!tableName) continue;
    const columns = colsSym && value[colsSym]
      ? Object.values(value[colsSym]).map(col => col.name).filter(Boolean)
      : [];
    if (columns.length) out[tableName] = columns;
  }
  return out;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL not set');
    process.exit(2);
  }

  const declared = extractTablesFromSchema(schema);
  if (Object.keys(declared).length === 0) {
    console.error('Could not introspect any tables from schema module — adjust extractor.');
    process.exit(2);
  }

  const client = new Client({ connectionString: url });
  await client.connect();
  const { rows } = await client.query(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
  `);
  await client.end();

  const live = {};
  for (const r of rows) {
    (live[r.table_name] ||= []).push(r.column_name);
  }

  const drift = [];
  const missingTables = [];
  for (const [table, declaredCols] of Object.entries(declared)) {
    if (!live[table]) {
      missingTables.push(table);
      continue;
    }
    const liveSet = new Set(live[table]);
    const missing = declaredCols.filter(c => !liveSet.has(c));
    if (missing.length) drift.push({ table, missing });
  }

  if (missingTables.length === 0 && drift.length === 0) {
    console.log(`✅ No schema drift. Checked ${Object.keys(declared).length} tables.`);
    process.exit(0);
  }

  if (missingTables.length) {
    console.error(`\n❌ ${missingTables.length} table(s) declared in schema but missing in DB:`);
    for (const t of missingTables) console.error(`   - ${t}`);
  }
  if (drift.length) {
    console.error(`\n❌ ${drift.length} table(s) with missing columns:`);
    for (const d of drift) {
      console.error(`   - ${d.table}: ${d.missing.join(', ')}`);
    }
  }
  console.error('\nFix: run `npm run db:push -- --force` to sync the schema.');
  process.exit(1);
}

main().catch(err => {
  console.error('Drift check failed:', err.message);
  process.exit(2);
});
