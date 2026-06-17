// Mockear módulos de infraestructura ANTES de importar el servicio
jest.mock('../src/infrastructure/postgres', () => ({
  pool: {
    connect: jest.fn(),
    query: jest.fn(),
  },
}));

jest.mock('../src/infrastructure/divisas-client', () => ({
  convertirMontoDesdeBase: jest.fn(),
}));

jest.mock('../src/infrastructure/notificaciones-client', () => ({
  enviarReciboNotificacion: jest.fn(),
}));

import { pool } from '../src/infrastructure/postgres';
import { convertirMontoDesdeBase } from '../src/infrastructure/divisas-client';
import { enviarReciboNotificacion } from '../src/infrastructure/notificaciones-client';
import {
  obtenerTransaccion,
  listarTransacciones,
  obtenerRecibo,
  procesarPago,
} from '../src/application/cobros-service';

const mockPool = pool as jest.Mocked<typeof pool>;
const mockConvertir = convertirMontoDesdeBase as jest.MockedFunction<typeof convertirMontoDesdeBase>;
const mockEnviarNotif = enviarReciboNotificacion as jest.MockedFunction<typeof enviarReciboNotificacion>;

function makeTransaccionRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const now = new Date().toISOString();
  return {
    id: 'tx-1',
    cuenta_id: 'c-1',
    suscripcion_id: 's-1',
    plan_id: 'p-1',
    tipo_operacion: 'contratacion',
    monto_base: '10.00',
    monto_local: '87.50',
    moneda_local: 'MXN',
    estado: 'aprobado',
    referencia_pasarela: 'SIM-abc',
    pagado_en: now,
    creado_en: now,
    actualizado_en: now,
    ...overrides,
  };
}

function makeReciboRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const now = new Date().toISOString();
  return {
    id: 'rec-1',
    transaccion_id: 'tx-1',
    numero_recibo: 'REC-0001',
    correo_destino: 'user@example.com',
    enviado: false,
    enviado_en: null,
    creado_en: now,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── obtenerTransaccion ────────────────────────────────────────────────────────

describe('obtenerTransaccion', () => {
  it('retorna la transaccion cuando existe', async () => {
    const row = makeTransaccionRow();
    (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [row] });

    const tx = await obtenerTransaccion('tx-1');

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('transacciones'),
      ['tx-1'],
    );
    expect(tx.id).toBe('tx-1');
    expect(tx.monto_base).toBe(10.0);
    expect(tx.monto_local).toBe(87.5);
    expect(tx.pagado_en).toBeInstanceOf(Date);
  });

  it('lanza error cuando la transaccion no existe', async () => {
    (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0, rows: [] });

    await expect(obtenerTransaccion('missing')).rejects.toThrow('no encontrada');
  });

  it('mapea suscripcion_id nulo correctamente', async () => {
    const row = makeTransaccionRow({ suscripcion_id: null, pagado_en: null, referencia_pasarela: null });
    (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [row] });

    const tx = await obtenerTransaccion('tx-1');
    expect(tx.suscripcion_id).toBeNull();
    expect(tx.referencia_pasarela).toBeNull();
    expect(tx.pagado_en).toBeNull();
  });
});

// ── listarTransacciones ───────────────────────────────────────────────────────

describe('listarTransacciones', () => {
  it('retorna lista de transacciones de la cuenta', async () => {
    const rows = [makeTransaccionRow({ id: 'tx-1' }), makeTransaccionRow({ id: 'tx-2' })];
    (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 2, rows });

    const result = await listarTransacciones('c-1');

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('tx-1');
    expect(result[1].id).toBe('tx-2');
  });

  it('retorna lista vacia cuando no hay transacciones', async () => {
    (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const result = await listarTransacciones('c-unknown');
    expect(result).toEqual([]);
  });
});

// ── obtenerRecibo ─────────────────────────────────────────────────────────────

describe('obtenerRecibo', () => {
  it('retorna el recibo cuando existe', async () => {
    const row = makeReciboRow({ enviado: true, enviado_en: new Date().toISOString() });
    (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [row] });

    const recibo = await obtenerRecibo('tx-1');
    expect(recibo.id).toBe('rec-1');
    expect(recibo.enviado).toBe(true);
    expect(recibo.enviado_en).toBeInstanceOf(Date);
  });

  it('lanza error cuando el recibo no existe', async () => {
    (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0, rows: [] });

    await expect(obtenerRecibo('tx-missing')).rejects.toThrow('no encontrado');
  });

  it('mapea enviado_en nulo', async () => {
    const row = makeReciboRow();
    (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [row] });

    const recibo = await obtenerRecibo('tx-1');
    expect(recibo.enviado).toBe(false);
    expect(recibo.enviado_en).toBeNull();
  });
});

// ── procesarPago ─────────────────────────────────────────────────────────────

describe('procesarPago', () => {
  function makeMockClient() {
    return {
      query: jest.fn(),
      release: jest.fn(),
    };
  }

  it('procesa pago exitosamente con recibo y notificacion', async () => {
    const client = makeMockClient();
    const txRow = makeTransaccionRow();
    const reciboRow = makeReciboRow();

    (mockPool.connect as jest.Mock).mockResolvedValueOnce(client);
    mockConvertir.mockResolvedValueOnce(87.5);
    mockEnviarNotif.mockResolvedValueOnce(undefined);

    // BEGIN, CALL sp, COMMIT, SELECT transaccion, SELECT recibo, UPDATE recibo
    client.query
      .mockResolvedValueOnce({})                                    // BEGIN
      .mockResolvedValueOnce({})                                    // CALL sp_registrar_compra
      .mockResolvedValueOnce({})                                    // COMMIT
      .mockResolvedValueOnce({ rowCount: 1, rows: [txRow] })       // SELECT transaccion
      .mockResolvedValueOnce({ rowCount: 1, rows: [reciboRow] })   // SELECT recibo
      .mockResolvedValueOnce({});                                   // UPDATE recibo enviado=TRUE

    const result = await procesarPago({
      cuenta_id: 'c-1',
      suscripcion_id: 's-1',
      plan_id: 'p-1',
      tipo_operacion: 'contratacion',
      monto_base: 10,
      moneda_local: 'MXN',
      correo_destino: 'user@example.com',
      nombre_usuario: 'Juan',
      descripcion_plan: 'Plan Premium',
    });

    expect(result.transaccion.id).toBe('tx-1');
    expect(result.recibo).not.toBeNull();
    expect(result.recibo!.enviado).toBe(true);
    expect(client.release).toHaveBeenCalled();
  });

  it('procesa pago cuando notificacion falla — recibo queda no enviado', async () => {
    const client = makeMockClient();
    const txRow = makeTransaccionRow();
    const reciboRow = makeReciboRow();

    (mockPool.connect as jest.Mock).mockResolvedValueOnce(client);
    mockConvertir.mockResolvedValueOnce(87.5);
    mockEnviarNotif.mockRejectedValueOnce(new Error('SMTP timeout'));

    client.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rowCount: 1, rows: [txRow] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [reciboRow] })
      .mockResolvedValueOnce({});   // UPDATE recibo enviado=FALSE

    const result = await procesarPago({
      cuenta_id: 'c-1',
      suscripcion_id: null,
      plan_id: 'p-1',
      tipo_operacion: 'contratacion',
      monto_base: 10,
      moneda_local: 'MXN',
      correo_destino: 'user@example.com',
    });

    expect(result.recibo!.enviado).toBe(false);
    expect(result.recibo!.enviado_en).toBeNull();
    expect(client.release).toHaveBeenCalled();
  });

  it('hace rollback y relanza cuando sp falla', async () => {
    const client = makeMockClient();

    (mockPool.connect as jest.Mock).mockResolvedValueOnce(client);
    mockConvertir.mockResolvedValueOnce(87.5);

    client.query
      .mockResolvedValueOnce({})                                // BEGIN
      .mockRejectedValueOnce(new Error('DB error'))             // CALL sp — falla
      .mockResolvedValueOnce({});                               // ROLLBACK

    await expect(
      procesarPago({
        cuenta_id: 'c-1',
        suscripcion_id: null,
        plan_id: 'p-1',
        tipo_operacion: 'contratacion',
        monto_base: 10,
        moneda_local: 'MXN',
        correo_destino: 'user@example.com',
      }),
    ).rejects.toThrow('DB error');

    expect(client.release).toHaveBeenCalled();
  });

  it('procesa pago sin recibo cuando sp no genera recibo', async () => {
    const client = makeMockClient();
    const txRow = makeTransaccionRow({ estado: 'rechazado' });

    (mockPool.connect as jest.Mock).mockResolvedValueOnce(client);
    mockConvertir.mockResolvedValueOnce(10);

    client.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rowCount: 1, rows: [txRow] });   // transaccion rechazada — no hay recibo

    const result = await procesarPago({
      cuenta_id: 'c-1',
      suscripcion_id: null,
      plan_id: 'p-1',
      tipo_operacion: 'contratacion',
      monto_base: 10,
      moneda_local: 'USD',
      correo_destino: 'user@example.com',
    });

    expect(result.recibo).toBeNull();
    expect(client.release).toHaveBeenCalled();
  });

  it('lanza error cuando transaccion no se encuentra tras sp', async () => {
    const client = makeMockClient();

    (mockPool.connect as jest.Mock).mockResolvedValueOnce(client);
    mockConvertir.mockResolvedValueOnce(10);

    client.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });   // transaccion no encontrada

    await expect(
      procesarPago({
        cuenta_id: 'c-1',
        suscripcion_id: null,
        plan_id: 'p-1',
        tipo_operacion: 'contratacion',
        monto_base: 10,
        moneda_local: 'USD',
        correo_destino: 'user@example.com',
      }),
    ).rejects.toThrow('transaccion no encontrada');

    expect(client.release).toHaveBeenCalled();
  });
});
