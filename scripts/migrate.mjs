#!/usr/bin/env node
// Aplica db/schema.sql sobre la base de datos indicada por DATABASE_URL (o POSTGRES_URL).
// Uso: DATABASE_URL=postgres://... npm run db:migrate
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

const here = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(here, '..', 'db', 'schema.sql');

const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!connectionString) {
  console.error('Falta DATABASE_URL (o POSTGRES_URL). Consulta .env.example.');
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

try {
  const sql = await readFile(schemaPath, 'utf8');
  await client.connect();
  await client.query('begin');
  await client.query(sql);
  await client.query('commit');
  console.log('Esquema aplicado correctamente.');
} catch (err) {
  await client.query('rollback').catch(() => {});
  console.error('Error al aplicar el esquema:', err.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
