import pg from 'pg'

const { Pool } = pg

let pool: pg.Pool | null = null

export function createPool(): void {
  pool = new Pool({
    connectionString: process.env['DATABASE_URL'] ?? 'postgres://quetzal:quetzal@localhost:5438/watchparty_db?sslmode=disable',
    max: 20,
    idleTimeoutMillis: 30000,
  })
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}

export function getPool(): pg.Pool {
  if (!pool) throw new Error('Database pool not initialized')
  return pool
}

export function query(text: string, params?: unknown[]): Promise<pg.QueryResult> {
  return getPool().query(text, params)
}
