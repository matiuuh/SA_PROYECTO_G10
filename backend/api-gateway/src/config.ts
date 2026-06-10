export interface ServiceTarget {
  hostname: string;
  port: number;
}

function parseTarget(rawUrl: string): ServiceTarget {
  const u = new URL(rawUrl);
  return {
    hostname: u.hostname,
    port: parseInt(u.port || (u.protocol === 'https:' ? '443' : '80')),
  };
}

export const config = {
  PORT: parseInt(process.env['PORT'] ?? '80'),
  JWT_SECRET: process.env['JWT_SECRET'] ?? '',

  // URL del contenedor frontend (solo necesario en cloud/VM4)
  FRONTEND_URL: process.env['FRONTEND_URL'] ?? '',

  services: {
    usuario:        parseTarget(process.env['USUARIO_SERVICE_URL']        ?? 'http://localhost:8001'),
    suscripcion:    parseTarget(process.env['SUSCRIPCION_SERVICE_URL']    ?? 'http://localhost:8002'),
    catalogo:       parseTarget(process.env['CATALOGO_SERVICE_URL']       ?? 'http://localhost:8003'),
    streaming:      parseTarget(process.env['STREAMING_SERVICE_URL']      ?? 'http://localhost:8004'),
    cobros:         parseTarget(process.env['COBROS_SERVICE_URL']         ?? 'http://localhost:8006'),
    divisas:        parseTarget(process.env['DIVISAS_SERVICE_URL']        ?? 'http://localhost:8005'),
    notificaciones: parseTarget(process.env['NOTIFICACIONES_SERVICE_URL'] ?? 'http://localhost:8007'),
  },
};
