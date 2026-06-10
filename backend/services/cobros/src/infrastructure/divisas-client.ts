import https from 'https';
import http from 'http';
import { URL } from 'url';

const API_GATEWAY_URL = (process.env['API_GATEWAY_URL'] ?? 'http://localhost:4000').replace(/\/$/, '');
const BASE_CURRENCY   = (process.env['BASE_CURRENCY'] ?? 'USD').toUpperCase();

export async function convertirMontoDesdeBase(
  montoBase: number,
  monedaDestino: string,
): Promise<number> {
  const destino = monedaDestino.toUpperCase();

  if (destino === BASE_CURRENCY) {
    return montoBase;
  }

  const url    = `${API_GATEWAY_URL}/api/divisas/api/v1/convertir`;
  const body   = JSON.stringify({ monto: montoBase, moneda_origen: BASE_CURRENCY, moneda_destino: destino });
  const parsed = new URL(url);
  const lib    = parsed.protocol === 'https:' ? https : http;

  return new Promise<number>((resolve, reject) => {
    const req = lib.request(
      {
        hostname: parsed.hostname,
        port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path:     parsed.pathname,
        method:   'POST',
        headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => {
          try {
            const data = JSON.parse(Buffer.concat(chunks).toString()) as { monto_convertido?: number; error?: string };
            if (data.monto_convertido == null) {
              reject(new Error(data.error ?? 'divisas no devolvió monto_convertido'));
              return;
            }
            resolve(data.monto_convertido);
          } catch (e) {
            reject(e);
          }
        });
      },
    );

    req.on('error', (err) => reject(new Error(`no se pudo contactar divisas vía API Gateway: ${err.message}`)));
    req.write(body);
    req.end();
  });
}
