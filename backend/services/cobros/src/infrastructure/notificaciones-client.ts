import https from 'https';
import http from 'http';
import { URL } from 'url';

const API_GATEWAY_URL  = (process.env['API_GATEWAY_URL'] ?? 'http://localhost:4000').replace(/\/$/, '');
const DEFAULT_USER_NAME = process.env['DEFAULT_NOTIFICATION_USER_NAME'] ?? 'Usuario';

async function postJson(url: string, body: unknown): Promise<{ enviado: boolean; mensaje?: string }> {
  const payload = JSON.stringify(body);
  const parsed  = new URL(url);
  const lib     = parsed.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const req = lib.request(
      {
        hostname: parsed.hostname,
        port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path:     parsed.pathname,
        method:   'POST',
        headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString()) as { enviado: boolean; mensaje?: string });
          } catch (e) {
            reject(e);
          }
        });
      },
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

export async function enviarReciboNotificacion(opts: {
  correo_destino: string;
  id_transaccion: string;
  descripcion_plan: string;
  monto: number;
  moneda: string;
  fecha: string;
  nombre_usuario?: string;
}): Promise<void> {
  const url    = `${API_GATEWAY_URL}/api/notificaciones/api/v1/recibo`;
  const result = await postJson(url, {
    correo_destino:   opts.correo_destino,
    nombre_usuario:   opts.nombre_usuario ?? DEFAULT_USER_NAME,
    id_transaccion:   opts.id_transaccion,
    descripcion_plan: opts.descripcion_plan,
    monto:            opts.monto,
    moneda:           opts.moneda,
    fecha:            opts.fecha,
  }).catch((err: Error) => {
    throw new Error(`no se pudo enviar recibo vía API Gateway: ${err.message}`);
  });

  if (!result.enviado) {
    throw new Error(`notificaciones reportó fallo al enviar recibo: ${result.mensaje ?? 'sin detalle'}`);
  }
}
