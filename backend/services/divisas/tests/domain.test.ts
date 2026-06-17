import {
  cacheKey,
  cacheKeyMonedas,
  type TipoCambio,
  type ResultadoConversion,
  type ExchangeApiResponse,
  type FuenteTasa,
  type TasaConFuente,
} from '../src/domain/exchange';

describe('domain/exchange', () => {
  describe('cacheKey', () => {
    it('genera clave en formato esperado', () => {
      expect(cacheKey('USD', 'MXN')).toBe('divisas:tasa:USD:MXN');
    });

    it('normaliza a mayusculas', () => {
      expect(cacheKey('usd', 'gtq')).toBe('divisas:tasa:USD:GTQ');
    });

    it('clave de mismo par produce misma cadena', () => {
      expect(cacheKey('EUR', 'USD')).toBe(cacheKey('EUR', 'USD'));
    });

    it('pares inversos producen claves distintas', () => {
      expect(cacheKey('USD', 'EUR')).not.toBe(cacheKey('EUR', 'USD'));
    });

    it('maneja monedas de 3 letras con formato correcto', () => {
      const key = cacheKey('BRL', 'COP');
      expect(key).toBe('divisas:tasa:BRL:COP');
      expect(key.split(':').length).toBe(4);
    });
  });

  describe('cacheKeyMonedas', () => {
    it('genera clave de listado de monedas', () => {
      expect(cacheKeyMonedas('USD')).toBe('divisas:monedas:USD');
    });

    it('normaliza a mayusculas', () => {
      expect(cacheKeyMonedas('eur')).toBe('divisas:monedas:EUR');
    });
  });

  describe('TipoCambio — estructura', () => {
    it('construye un TipoCambio valido', () => {
      const now = new Date();
      const tc: TipoCambio = {
        monedaOrigen: 'USD',
        monedaDestino: 'MXN',
        tasa: 17.5,
        actualizadoEn: now,
      };
      expect(tc.monedaOrigen).toBe('USD');
      expect(tc.tasa).toBe(17.5);
      expect(tc.actualizadoEn).toBeInstanceOf(Date);
    });
  });

  describe('ResultadoConversion — estructura', () => {
    it('construye un ResultadoConversion valido', () => {
      const rc: ResultadoConversion = {
        montoOriginal: 10,
        montoConvertido: 175,
        monedaOrigen: 'USD',
        monedaDestino: 'MXN',
        tasa: 17.5,
      };
      expect(rc.montoConvertido).toBe(175);
      expect(rc.tasa).toBe(17.5);
    });

    it('el monto convertido se puede calcular con la tasa', () => {
      const tasa = 7.85;
      const monto = 10;
      const rc: ResultadoConversion = {
        montoOriginal: monto,
        montoConvertido: parseFloat((monto * tasa).toFixed(6)),
        monedaOrigen: 'USD',
        monedaDestino: 'GTQ',
        tasa,
      };
      expect(rc.montoConvertido).toBeCloseTo(78.5, 2);
    });
  });

  describe('ExchangeApiResponse — estructura', () => {
    it('construye una respuesta de API valida', () => {
      const resp: ExchangeApiResponse = {
        result: 'success',
        base_code: 'USD',
        rates: { MXN: 17.5, GTQ: 7.85, EUR: 0.91 },
        time_last_update_unix: 1700000000,
        time_next_update_unix: 1700086400,
      };
      expect(resp.result).toBe('success');
      expect(resp.rates['MXN']).toBe(17.5);
      expect(Object.keys(resp.rates)).toHaveLength(3);
    });

    it('acepta result de error', () => {
      const resp: ExchangeApiResponse = {
        result: 'error',
        base_code: 'USD',
        rates: {},
        time_last_update_unix: 0,
        time_next_update_unix: 0,
      };
      expect(resp.result).toBe('error');
    });
  });

  describe('FuenteTasa — valores validos', () => {
    it('acepta cache_redis', () => {
      const f: FuenteTasa = 'cache_redis';
      expect(f).toBe('cache_redis');
    });

    it('acepta cache_db', () => {
      const f: FuenteTasa = 'cache_db';
      expect(f).toBe('cache_db');
    });

    it('acepta api', () => {
      const f: FuenteTasa = 'api';
      expect(f).toBe('api');
    });
  });

  describe('TasaConFuente — extiende TipoCambio', () => {
    it('incluye campo fuente ademas de TipoCambio', () => {
      const now = new Date();
      const tf: TasaConFuente = {
        monedaOrigen: 'USD',
        monedaDestino: 'EUR',
        tasa: 0.91,
        actualizadoEn: now,
        fuente: 'api',
      };
      expect(tf.fuente).toBe('api');
      expect(tf.tasa).toBe(0.91);
    });
  });

  describe('convertirMonto — logica pura', () => {
    it('calcula el monto convertido con precision de 6 decimales', () => {
      const tasa = 17.542;
      const monto = 100;
      const resultado = parseFloat((monto * tasa).toFixed(6));
      expect(resultado).toBeCloseTo(1754.2, 1);
    });

    it('conversion de misma moneda resulta en tasa 1', () => {
      const tasa = 1;
      const monto = 50;
      const resultado = parseFloat((monto * tasa).toFixed(6));
      expect(resultado).toBe(50);
    });

    it('conversion con monto 0 resulta en 0', () => {
      const tasa = 17.5;
      const monto = 0;
      const resultado = parseFloat((monto * tasa).toFixed(6));
      expect(resultado).toBe(0);
    });
  });
});
