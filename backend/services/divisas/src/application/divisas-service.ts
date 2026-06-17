import { TipoCambio, ResultadoConversion, cacheKey, cacheKeyMonedas } from '../domain/exchange';
import { redisGet, redisSet, REDIS_TTL_SECONDS } from '../infrastructure/redis';
import {
  upsertCacheDivisa,
  registrarConsulta,
  obtenerTasaDesdeDB,
} from '../infrastructure/postgres';
import { fetchTasa, fetchMonedas } from '../infrastructure/exchange-api';

/**
 * Obtiene la tasa de cambio entre dos monedas.
 *
 * Orden de búsqueda:
 *   1. Redis (cache hit — más rápido)
 *   2. PostgreSQL cache_divisas (respaldo durable)
 *   3. API externa open.er-api.com (origen de verdad)
 *
 * Tras obtener la tasa de la BD o la API, actualiza Redis y PostgreSQL.
 */
export async function obtenerTipoCambio(
  monedaOrigen: string,
  monedaDestino: string
): Promise<TipoCambio> {
  const base = monedaOrigen.toUpperCase();
  const dest = monedaDestino.toUpperCase();
  const key = cacheKey(base, dest);

  // ── 1. Redis ─────────────────────────────────────────────────────────────
  const cached = await redisGet(key);
  if (cached !== null) {
    const parsed = JSON.parse(cached) as { tasa: number; actualizadoEn: string };
    console.log(`[DivisasService] Cache Redis HIT ${base}→${dest}`);

    void registrarConsulta(base, dest, parsed.tasa, null, null, 'cache_redis');

    return {
      monedaOrigen: base,
      monedaDestino: dest,
      tasa: parsed.tasa,
      actualizadoEn: new Date(parsed.actualizadoEn),
    };
  }

  // ── 2. PostgreSQL ─────────────────────────────────────────────────────────
  const dbRow = await obtenerTasaDesdeDB(base, dest);
  if (dbRow !== null) {
    console.log(`[DivisasService] Cache DB HIT ${base}→${dest}`);

    // Repoblar Redis con TTL completo
    await redisSet(key, JSON.stringify({ tasa: dbRow.tasa, actualizadoEn: dbRow.actualizadoEn }));

    void registrarConsulta(base, dest, dbRow.tasa, null, null, 'cache_db');

    return {
      monedaOrigen: base,
      monedaDestino: dest,
      tasa: dbRow.tasa,
      actualizadoEn: dbRow.actualizadoEn,
    };
  }

  // ── 3. API externa ────────────────────────────────────────────────────────
  console.log(`[DivisasService] Cache MISS ${base}→${dest} — consultando API`);
  const { tasa, actualizadoEn } = await fetchTasa(base, dest);

  // Persistir en Redis (TTL 3600 s) y en PostgreSQL
  await redisSet(key, JSON.stringify({ tasa, actualizadoEn }));
  await upsertCacheDivisa(base, dest, tasa, REDIS_TTL_SECONDS);

  void registrarConsulta(base, dest, tasa, null, null, 'api');

  return { monedaOrigen: base, monedaDestino: dest, tasa, actualizadoEn };
}

/**
 * Convierte un monto de una moneda a otra.
 */
export async function convertirMonto(
  monto: number,
  monedaOrigen: string,
  monedaDestino: string
): Promise<ResultadoConversion> {
  const tipoCambio = await obtenerTipoCambio(monedaOrigen, monedaDestino);
  const montoConvertido = parseFloat((monto * tipoCambio.tasa).toFixed(6));

  // Registrar también la conversión en el historial
  void registrarConsulta(
    tipoCambio.monedaOrigen,
    tipoCambio.monedaDestino,
    tipoCambio.tasa,
    monto,
    montoConvertido,
    'api' // la fuente ya quedó registrada en obtenerTipoCambio; aquí se puede omitir o repetir
  );

  return {
    montoOriginal: monto,
    montoConvertido,
    monedaOrigen: tipoCambio.monedaOrigen,
    monedaDestino: tipoCambio.monedaDestino,
    tasa: tipoCambio.tasa,
  };
}

/**
 * Devuelve la lista de monedas disponibles.
 * Usa Redis para cachear la lista (TTL 1 h).
 */
export async function listarMonedas(): Promise<string[]> {
  const key = cacheKeyMonedas('USD');

  const cached = await redisGet(key);
  if (cached !== null) {
    return JSON.parse(cached) as string[];
  }

  const monedas = await fetchMonedas('USD');
  await redisSet(key, JSON.stringify(monedas));

  return monedas;
}
