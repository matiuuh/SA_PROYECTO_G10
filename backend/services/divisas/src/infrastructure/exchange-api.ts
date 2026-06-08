import axios from 'axios';
import { ExchangeApiResponse } from '../domain/exchange';

const BASE_URL = 'https://open.er-api.com/v6/latest';

/**
 * Llama a open.er-api.com y devuelve el mapa de tasas para la moneda base.
 *
 * @param base Código ISO 4217 de la moneda base (ej. "USD").
 * @returns Mapa { moneda: tasa } donde tasa es el valor en unidades por 1 de base.
 * @throws Error si la API devuelve un estado distinto de "success".
 */
export async function fetchRates(base: string): Promise<{
  rates: Record<string, number>;
  actualizadoEn: Date;
}> {
  const url = `${BASE_URL}/${base.toUpperCase()}`;

  const { data } = await axios.get<ExchangeApiResponse>(url, {
    timeout: 10_000,
  });

  if (data.result !== 'success') {
    throw new Error(
      `open.er-api.com devolvió resultado no exitoso para base=${base}: ${JSON.stringify(data)}`
    );
  }

  const actualizadoEn = new Date(data.time_last_update_unix * 1000);

  return { rates: data.rates, actualizadoEn };
}

/**
 * Obtiene la tasa de cambio entre dos monedas llamando a la API externa.
 *
 * @param base     Moneda de origen.
 * @param destino  Moneda de destino.
 * @returns La tasa y la fecha de actualización.
 */
export async function fetchTasa(
  base: string,
  destino: string
): Promise<{ tasa: number; actualizadoEn: Date }> {
  const { rates, actualizadoEn } = await fetchRates(base);

  const tasa = rates[destino.toUpperCase()];
  if (tasa === undefined) {
    throw new Error(
      `Moneda destino '${destino}' no encontrada en las tasas de '${base}'`
    );
  }

  return { tasa, actualizadoEn };
}

/**
 * Devuelve la lista de monedas disponibles para la base indicada.
 */
export async function fetchMonedas(base = 'USD'): Promise<string[]> {
  const { rates } = await fetchRates(base);
  return Object.keys(rates).sort();
}
