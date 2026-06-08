/**
 * Tipos e interfaces del dominio de Divisas.
 */

/** Tasa de cambio entre dos monedas. */
export interface TipoCambio {
  monedaOrigen: string;
  monedaDestino: string;
  tasa: number;
  actualizadoEn: Date;
}

/** Resultado de una conversión de montos. */
export interface ResultadoConversion {
  montoOriginal: number;
  montoConvertido: number;
  monedaOrigen: string;
  monedaDestino: string;
  tasa: number;
}

/** Respuesta cruda de la API open.er-api.com */
export interface ExchangeApiResponse {
  result: string;          // "success" | "error"
  base_code: string;
  rates: Record<string, number>;
  time_last_update_unix: number;
  time_next_update_unix: number;
}

/** Fuente de la que se obtuvo la tasa. */
export type FuenteTasa = 'cache_redis' | 'cache_db' | 'api';

/** Opción de caché con información adicional de origen. */
export interface TasaConFuente extends TipoCambio {
  fuente: FuenteTasa;
}

/** Clave de caché Redis para un par de monedas. */
export function cacheKey(base: string, destino: string): string {
  return `divisas:tasa:${base.toUpperCase()}:${destino.toUpperCase()}`;
}

/** Clave de caché Redis para el listado de monedas de una base. */
export function cacheKeyMonedas(base: string): string {
  return `divisas:monedas:${base.toUpperCase()}`;
}
