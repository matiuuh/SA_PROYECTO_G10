jest.mock('../src/infrastructure/postgres', () => ({
  pool: { query: jest.fn() },
}));

jest.mock('../src/infrastructure/mailer', () => ({
  sendMail: jest.fn(),
}));

import { pool } from '../src/infrastructure/postgres';
import { sendMail } from '../src/infrastructure/mailer';
import {
  enviarConfirmacionRegistro,
  enviarRecibo,
  enviarAlertaPublicacion,
} from '../src/application/service';

const mockQuery = pool.query as jest.Mock;
const mockSendMail = sendMail as jest.MockedFunction<typeof sendMail>;

const FAKE_ID = 'notif-uuid-1';

beforeEach(() => {
  jest.clearAllMocks();
  // registrarNotificacion siempre devuelve una fila con id
  mockQuery.mockResolvedValue({ rows: [{ id: FAKE_ID }], rowCount: 1 });
});

// ── enviarConfirmacionRegistro ────────────────────────────────────────────────

describe('enviarConfirmacionRegistro', () => {
  it('envia el correo y retorna enviado=true', async () => {
    mockSendMail.mockResolvedValueOnce(undefined as never);

    const result = await enviarConfirmacionRegistro('user@example.com', 'Juan');

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const [mailOpts] = mockSendMail.mock.calls[0];
    expect(mailOpts.to).toBe('user@example.com');
    expect(mailOpts.subject).toContain('Bienvenido');
    expect(mailOpts.html).toContain('Juan');
    expect(result.enviado).toBe(true);
    expect(result.error_mensaje).toBeNull();
    expect(result.id).toBe(FAKE_ID);
  });

  it('retorna enviado=false cuando sendMail falla', async () => {
    mockSendMail.mockRejectedValueOnce(new Error('SMTP down'));

    const result = await enviarConfirmacionRegistro('fail@example.com', 'Ana');

    expect(result.enviado).toBe(false);
    expect(result.error_mensaje).toBe('SMTP down');
    expect(mockQuery).toHaveBeenCalled();
  });

  it('incluye el nombre del usuario en el HTML del correo', async () => {
    mockSendMail.mockResolvedValueOnce(undefined as never);

    await enviarConfirmacionRegistro('user@example.com', 'María José');

    const html = (mockSendMail.mock.calls[0][0] as { html: string }).html;
    expect(html).toContain('María José');
  });

  it('registra la notificacion con tipo confirmacion_registro', async () => {
    mockSendMail.mockResolvedValueOnce(undefined as never);

    await enviarConfirmacionRegistro('user@example.com', 'Carlos');

    expect(mockQuery).toHaveBeenCalled();
    const callArgs = mockQuery.mock.calls[0];
    expect(callArgs[1]).toContain('confirmacion_registro');
  });
});

// ── enviarRecibo ──────────────────────────────────────────────────────────────

describe('enviarRecibo', () => {
  const baseOpts = {
    correo_destino: 'user@example.com',
    nombre_usuario: 'Pedro',
    id_transaccion: 'tx-abc',
    descripcion_plan: 'Plan Premium',
    monto: 10.5,
    moneda: 'USD',
    fecha: '2026-01-15T10:00:00.000Z',
  };

  it('envia el recibo correctamente', async () => {
    mockSendMail.mockResolvedValueOnce(undefined as never);

    const result = await enviarRecibo(baseOpts);

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const [mailOpts] = mockSendMail.mock.calls[0];
    expect(mailOpts.to).toBe('user@example.com');
    expect(mailOpts.subject).toContain('Plan Premium');
    expect(mailOpts.html).toContain('tx-abc');
    expect(result.enviado).toBe(true);
    expect(result.error_mensaje).toBeNull();
  });

  it('retorna enviado=false cuando correo_destino esta vacio', async () => {
    const result = await enviarRecibo({ ...baseOpts, correo_destino: '   ' });

    expect(mockSendMail).not.toHaveBeenCalled();
    expect(result.enviado).toBe(false);
    expect(result.error_mensaje).toContain('correo');
  });

  it('retorna enviado=false cuando sendMail falla', async () => {
    mockSendMail.mockRejectedValueOnce(new Error('Connection refused'));

    const result = await enviarRecibo(baseOpts);

    expect(result.enviado).toBe(false);
    expect(result.error_mensaje).toBe('Connection refused');
  });

  it('el html del recibo contiene el monto formateado', async () => {
    mockSendMail.mockResolvedValueOnce(undefined as never);

    await enviarRecibo({ ...baseOpts, monto: 87.5, moneda: 'MXN' });

    const html = (mockSendMail.mock.calls[0][0] as { html: string }).html;
    expect(html).toContain('87.50');
    expect(html).toContain('MXN');
  });
});

// ── enviarAlertaPublicacion ───────────────────────────────────────────────────

describe('enviarAlertaPublicacion', () => {
  const baseOpts = {
    correos_destino: ['a@example.com', 'b@example.com'],
    titulo_contenido: 'El Señor de los Anillos',
    tipo_contenido: 'pelicula',
    descripcion: 'Una épica aventura de fantasía.',
  };

  it('envia la alerta correctamente para pelicula', async () => {
    mockSendMail.mockResolvedValueOnce(undefined as never);

    const result = await enviarAlertaPublicacion(baseOpts);

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const [mailOpts] = mockSendMail.mock.calls[0];
    expect(mailOpts.subject).toContain('El Señor de los Anillos');
    expect(mailOpts.html).toContain('Película');
    expect(result.enviado).toBe(true);
  });

  it('envia la alerta correctamente para serie', async () => {
    mockSendMail.mockResolvedValueOnce(undefined as never);

    await enviarAlertaPublicacion({ ...baseOpts, tipo_contenido: 'serie', titulo_contenido: 'Breaking Bad' });

    const html = (mockSendMail.mock.calls[0][0] as { html: string }).html;
    expect(html).toContain('Serie');
    expect(html).toContain('Breaking Bad');
  });

  it('retorna enviado=false cuando sendMail falla', async () => {
    mockSendMail.mockRejectedValueOnce(new Error('SMTP error'));

    const result = await enviarAlertaPublicacion(baseOpts);

    expect(result.enviado).toBe(false);
    expect(result.error_mensaje).toBe('SMTP error');
  });

  it('usa el primer correo como correo_destino para registro', async () => {
    mockSendMail.mockResolvedValueOnce(undefined as never);

    await enviarAlertaPublicacion(baseOpts);

    const callArgs = mockQuery.mock.calls[0];
    expect(callArgs[1]).toContain('a@example.com');
  });

  it('maneja lista de correos vacia sin lanzar excepcion', async () => {
    mockSendMail.mockResolvedValueOnce(undefined as never);

    const result = await enviarAlertaPublicacion({ ...baseOpts, correos_destino: [] });
    expect(result).toBeDefined();
  });
});
