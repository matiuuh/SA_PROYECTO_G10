import { Pool } from 'pg';

const databaseUrl = process.env['DATABASE_URL'];

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

export const pool = new Pool({
  connectionString: databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  console.error('[postgres] unexpected client error:', err.message);
});

export async function connectWithRetry(retries = 10, delayMs = 2000): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = await pool.connect();
      client.release();
      console.log('[postgres] connection established');
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[postgres] attempt ${attempt}/${retries} failed: ${message}`);
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw new Error('[postgres] could not establish connection after maximum retries');
}
