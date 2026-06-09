import { Pool, PoolClient } from 'pg';

let pool: Pool | null = null;

/** Inicializa el pool de conexiones con DATABASE_URL del entorno. */
export function createPool(): Pool {
  if (pool) return pool;

  const connectionString =
    process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/quetzal_divisas';

  pool = new Pool({ connectionString });

  pool.on('error', (err: Error) => {
    console.error('[Postgres] Error inesperado en cliente idle:', err.message);
  });

  console.log('[Postgres] Pool creado');
  return pool;
}

/** Devuelve el pool existente o lanza si no se ha inicializado. */
export function getPool(): Pool {
  if (!pool) {
    throw new Error('Pool de Postgres no inicializado. Llama createPool() primero.');
  }
  return pool;
}

/** Cierra el pool al apagar el servicio. */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('[Postgres] Pool cerrado');
  }
}

/**
 * Inserta o actualiza la tasa de cambio en cache_divisas
 * usando el procedimiento almacenado sp_upsert_cache_divisa.
 */
export async function upsertCacheDivisa(
  monedaBase: string,
  monedaDestino: string,
  tasa: number,
  ttlSegundos = 3600
): Promise<void> {
  const client: PoolClient = await getPool().connect();
  try {
    await client.query('CALL sp_upsert_cache_divisa($1, $2, $3, $4)', [
      monedaBase.toUpperCase(),
      monedaDestino.toUpperCase(),
      tasa,
      ttlSegundos,
    ]);
  } finally {
    client.release();
  }
}

/**
 * Registra la consulta en el historial usando sp_registrar_consulta.
 */
export async function registrarConsulta(
  monedaBase: string,
  monedaDestino: string,
  tasa: number,
  montoOriginal: number | null,
  montoConvertido: number | null,
  fuente: string
): Promise<void> {
  const client: PoolClient = await getPool().connect();
  try {
    await client.query(
      'CALL sp_registrar_consulta($1, $2, $3, $4, $5, $6)',
      [
        monedaBase.toUpperCase(),
        monedaDestino.toUpperCase(),
        tasa,
        montoOriginal,
        montoConvertido,
        fuente,
      ]
    );
  } catch (err) {
    // El historial no es crítico; loguea pero no interrumpe el flujo.
    console.warn('[Postgres] No se pudo registrar historial:', (err as Error).message);
  } finally {
    client.release();
  }
}

/**
 * Obtiene la tasa desde cache_divisas si aún está vigente (fn_cache_vigente).
 * @returns La tasa o null si expiró / no existe.
 */
export async function obtenerTasaDesdeDB(
  monedaBase: string,
  monedaDestino: string
): Promise<{ tasa: number; actualizadoEn: Date } | null> {
  const client: PoolClient = await getPool().connect();
  try {
    const result = await client.query<{ tasa: string; actualizado_en: Date }>(
      `SELECT tasa, actualizado_en
         FROM cache_divisas
        WHERE moneda_base    = $1
          AND moneda_destino = $2
          AND fn_cache_vigente($1, $2)`,
      [monedaBase.toUpperCase(), monedaDestino.toUpperCase()]
    );

    if (result.rows.length === 0) return null;

    return {
      tasa: parseFloat(result.rows[0].tasa),
      actualizadoEn: result.rows[0].actualizado_en,
    };
  } finally {
    client.release();
  }
}
