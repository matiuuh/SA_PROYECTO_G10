jest.mock('../src/infrastructure/redis', () => ({
  REDIS_TTL_SECONDS: 3600,
  redisGet: jest.fn(),
  redisSet: jest.fn(),
}));

jest.mock('../src/infrastructure/postgres', () => ({
  upsertCacheDivisa: jest.fn(),
  registrarConsulta: jest.fn(),
  obtenerTasaDesdeDB: jest.fn(),
}));

jest.mock('../src/infrastructure/exchange-api', () => ({
  fetchTasa: jest.fn(),
  fetchMonedas: jest.fn(),
}));

import { redisGet, redisSet } from '../src/infrastructure/redis';
import {
  obtenerTasaDesdeDB,
  registrarConsulta,
  upsertCacheDivisa,
} from '../src/infrastructure/postgres';
import { fetchMonedas, fetchTasa } from '../src/infrastructure/exchange-api';
import { convertirMonto, listarMonedas, obtenerTipoCambio } from '../src/application/divisas-service';

const mockRedisGet = redisGet as jest.MockedFunction<typeof redisGet>;
const mockRedisSet = redisSet as jest.MockedFunction<typeof redisSet>;
const mockObtenerTasaDesdeDB = obtenerTasaDesdeDB as jest.MockedFunction<typeof obtenerTasaDesdeDB>;
const mockRegistrarConsulta = registrarConsulta as jest.MockedFunction<typeof registrarConsulta>;
const mockUpsertCacheDivisa = upsertCacheDivisa as jest.MockedFunction<typeof upsertCacheDivisa>;
const mockFetchTasa = fetchTasa as jest.MockedFunction<typeof fetchTasa>;
const mockFetchMonedas = fetchMonedas as jest.MockedFunction<typeof fetchMonedas>;

beforeEach(() => {
  jest.clearAllMocks();
  mockRedisSet.mockResolvedValue(undefined);
  mockRegistrarConsulta.mockResolvedValue(undefined);
  mockUpsertCacheDivisa.mockResolvedValue(undefined);
});

describe('divisas-service — obtenerTipoCambio', () => {
  it('retorna tasa desde Redis y registra la consulta sin tocar DB/API', async () => {
    const actualizadoEn = '2026-06-17T12:00:00.000Z';
    mockRedisGet.mockResolvedValueOnce(JSON.stringify({ tasa: 7.8, actualizadoEn }));

    const result = await obtenerTipoCambio('usd', 'gtq');

    expect(result).toEqual({
      monedaOrigen: 'USD',
      monedaDestino: 'GTQ',
      tasa: 7.8,
      actualizadoEn: new Date(actualizadoEn),
    });
    expect(mockObtenerTasaDesdeDB).not.toHaveBeenCalled();
    expect(mockFetchTasa).not.toHaveBeenCalled();
    expect(mockRegistrarConsulta).toHaveBeenCalledWith('USD', 'GTQ', 7.8, null, null, 'cache_redis');
  });

  it('retorna tasa desde DB y repuebla Redis', async () => {
    const actualizadoEn = new Date('2026-06-17T13:00:00.000Z');
    mockRedisGet.mockResolvedValueOnce(null);
    mockObtenerTasaDesdeDB.mockResolvedValueOnce({ tasa: 17.5, actualizadoEn });

    const result = await obtenerTipoCambio('usd', 'mxn');

    expect(result.monedaOrigen).toBe('USD');
    expect(result.monedaDestino).toBe('MXN');
    expect(result.tasa).toBe(17.5);
    expect(mockRedisSet).toHaveBeenCalledWith(
      'divisas:tasa:USD:MXN',
      JSON.stringify({ tasa: 17.5, actualizadoEn }),
    );
    expect(mockFetchTasa).not.toHaveBeenCalled();
    expect(mockRegistrarConsulta).toHaveBeenCalledWith('USD', 'MXN', 17.5, null, null, 'cache_db');
  });

  it('consulta API externa cuando no hay cache y persiste la tasa', async () => {
    const actualizadoEn = new Date('2026-06-17T14:00:00.000Z');
    mockRedisGet.mockResolvedValueOnce(null);
    mockObtenerTasaDesdeDB.mockResolvedValueOnce(null);
    mockFetchTasa.mockResolvedValueOnce({ tasa: 0.91, actualizadoEn });

    const result = await obtenerTipoCambio('usd', 'eur');

    expect(result.tasa).toBe(0.91);
    expect(mockFetchTasa).toHaveBeenCalledWith('USD', 'EUR');
    expect(mockRedisSet).toHaveBeenCalledWith(
      'divisas:tasa:USD:EUR',
      JSON.stringify({ tasa: 0.91, actualizadoEn }),
    );
    expect(mockUpsertCacheDivisa).toHaveBeenCalledWith('USD', 'EUR', 0.91, 3600);
    expect(mockRegistrarConsulta).toHaveBeenCalledWith('USD', 'EUR', 0.91, null, null, 'api');
  });
});

describe('divisas-service — convertirMonto', () => {
  it('calcula el monto convertido con 6 decimales y registra conversion', async () => {
    mockRedisGet.mockResolvedValueOnce(JSON.stringify({
      tasa: 7.8123456,
      actualizadoEn: '2026-06-17T12:00:00.000Z',
    }));

    const result = await convertirMonto(10, 'usd', 'gtq');

    expect(result).toEqual({
      montoOriginal: 10,
      montoConvertido: 78.123456,
      monedaOrigen: 'USD',
      monedaDestino: 'GTQ',
      tasa: 7.8123456,
    });
    expect(mockRegistrarConsulta).toHaveBeenLastCalledWith(
      'USD',
      'GTQ',
      7.8123456,
      10,
      78.123456,
      'api',
    );
  });
});

describe('divisas-service — listarMonedas', () => {
  it('retorna monedas desde Redis si existen', async () => {
    mockRedisGet.mockResolvedValueOnce(JSON.stringify(['EUR', 'GTQ', 'USD']));

    await expect(listarMonedas()).resolves.toEqual(['EUR', 'GTQ', 'USD']);
    expect(mockFetchMonedas).not.toHaveBeenCalled();
  });

  it('consulta API y guarda en Redis si no hay cache', async () => {
    mockRedisGet.mockResolvedValueOnce(null);
    mockFetchMonedas.mockResolvedValueOnce(['EUR', 'GTQ', 'USD']);

    await expect(listarMonedas()).resolves.toEqual(['EUR', 'GTQ', 'USD']);
    expect(mockFetchMonedas).toHaveBeenCalledWith('USD');
    expect(mockRedisSet).toHaveBeenCalledWith(
      'divisas:monedas:USD',
      JSON.stringify(['EUR', 'GTQ', 'USD']),
    );
  });
});
