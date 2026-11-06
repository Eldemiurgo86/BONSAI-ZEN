import { Pool, type PoolClient, type QueryResultRow } from 'pg';

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super('DATABASE_URL no está configurada');
    this.name = 'DatabaseNotConfiguredError';
  }
}

// Un único pool por proceso (reutilizado entre recargas en desarrollo y entre peticiones serverless).
const globalForDb = globalThis as unknown as { __bonsaiPool?: Pool };

export function getPool(): Pool {
  if (!globalForDb.__bonsaiPool) {
    const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
    if (!connectionString) throw new DatabaseNotConfiguredError();
    globalForDb.__bonsaiPool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 10_000,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    });
  }
  return globalForDb.__bonsaiPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) {
  return getPool().query<T>(text, params);
}

/** Ejecuta `fn` dentro de una transacción. Revierte si lanza un error. */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('begin');
    const result = await fn(client);
    await client.query('commit');
    return result;
  } catch (err) {
    await client.query('rollback').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
