import { createClient, RedisClientType } from 'redis';

/** TTL requerido por el proyecto: 1 hora = 3600 segundos. */
export const REDIS_TTL_SECONDS = 3600;

let client: RedisClientType | null = null;

/**
 * Devuelve el cliente Redis singleton.
 * Llama a connectRedis() antes de usar.
 */
export function getRedisClient(): RedisClientType {
  if (!client) {
    throw new Error('Redis no está conectado. Llama connectRedis() primero.');
  }
  return client;
}

/** Conecta el cliente Redis usando REDIS_URL del entorno. */
export async function connectRedis(): Promise<void> {
  const url = process.env.REDIS_URL ?? 'redis://localhost:6379';

  client = createClient({ url }) as RedisClientType;

  client.on('error', (err: Error) => {
    console.error('[Redis] Error:', err.message);
  });

  await client.connect();
  console.log(`[Redis] Conectado a ${url}`);
}

/** Desconecta el cliente Redis. */
export async function disconnectRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
    console.log('[Redis] Desconectado');
  }
}

/**
 * Obtiene un valor string de Redis.
 * @returns El valor o null si no existe / está expirado.
 */
export async function redisGet(key: string): Promise<string | null> {
  return getRedisClient().get(key);
}

/**
 * Guarda un valor string en Redis con TTL de 3600 s.
 */
export async function redisSet(key: string, value: string): Promise<void> {
  await getRedisClient().set(key, value, { EX: REDIS_TTL_SECONDS });
}
