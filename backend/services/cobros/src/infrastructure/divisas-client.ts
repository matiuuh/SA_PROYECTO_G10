import Redis from 'ioredis';

const BASE_CURRENCY = (process.env['BASE_CURRENCY'] ?? 'USD').toUpperCase();
const FX_API_URL = (process.env['FX_API_URL'] ?? 'https://open.er-api.com/v6/latest').replace(/\/$/, '');
const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
// TTL de 1 hora por defecto — los tipos de cambio no cambian por minuto
const FX_CACHE_TTL = parseInt(process.env['FX_CACHE_TTL_SECONDS'] ?? '3600', 10);

const redis = new Redis(REDIS_URL, {
  // Si Redis no está disponible, no bloquear el arranque del servicio
  lazyConnect: true,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
});

redis.on('error', (err: Error) => {
  console.warn('[cobros] redis no disponible:', err.message);
});

interface FxApiResponse {
  result: string;
  rates: Record<string, number>;
}

async function obtenerTasaDeCambio(base: string, destino: string): Promise<number> {
  const cacheKey = `fx:${base}:${destino}`;

  // 1. Intentar desde caché Redis
  try {
    const cached = await redis.get(cacheKey);
    if (cached !== null) {
      console.log(`[cobros] tasa ${base}->${destino} desde caché (TTL restante activo)`);
      return parseFloat(cached);
    }
  } catch {
    // Redis caído — continuar sin caché
  }

  // 2. Consultar API externa: GET /v6/latest/{BASE} devuelve todas las tasas desde esa moneda
  const url = `${FX_API_URL}/${base}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`FX API respondió ${res.status}: ${res.statusText}`);
  }

  const data = (await res.json()) as FxApiResponse;

  if (data.result !== 'success') {
    throw new Error(`FX API devolvió result=${data.result}`);
  }

  const tasa = data.rates[destino];

  if (tasa == null) {
    throw new Error(`la API no devolvió tasa para ${destino}`);
  }

  // 3. Guardar en Redis con TTL
  try {
    await redis.set(cacheKey, tasa.toString(), 'EX', FX_CACHE_TTL);
    console.log(`[cobros] tasa ${base}->${destino}=${tasa} guardada en caché por ${FX_CACHE_TTL}s`);
  } catch {
    // Redis caído — el valor se usó igual, solo no quedó en caché
  }

  return tasa;
}

export async function convertirMontoDesdeBase(
  montoBase: number,
  monedaDestino: string,
): Promise<number> {
  const destino = monedaDestino.toUpperCase();

  if (destino === BASE_CURRENCY) {
    return montoBase;
  }

  const tasa = await obtenerTasaDeCambio(BASE_CURRENCY, destino);
  return montoBase * tasa;
}
