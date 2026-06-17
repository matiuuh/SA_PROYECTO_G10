import type {
  EstadoPago,
  TipoOperacion,
  Transaccion,
  Recibo,
  ProcesarPagoInput,
  ProcesarPagoResult,
} from '../src/domain/payment';

describe('domain/payment — tipos y estructuras', () => {
  describe('EstadoPago', () => {
    it('acepta valores validos de EstadoPago', () => {
      const estados: EstadoPago[] = ['pendiente', 'aprobado', 'rechazado', 'cancelado'];
      expect(estados).toHaveLength(4);
      expect(estados).toContain('aprobado');
    });
  });

  describe('TipoOperacion', () => {
    it('acepta valores validos de TipoOperacion', () => {
      const tipos: TipoOperacion[] = ['contratacion', 'modificacion_plan'];
      expect(tipos).toHaveLength(2);
    });
  });

  describe('Transaccion', () => {
    it('construye un objeto Transaccion correctamente', () => {
      const now = new Date();
      const tx: Transaccion = {
        id: 'tx-1',
        cuenta_id: 'cuenta-1',
        suscripcion_id: null,
        plan_id: 'plan-1',
        tipo_operacion: 'contratacion',
        monto_base: 10.0,
        monto_local: 87.5,
        moneda_local: 'MXN',
        estado: 'aprobado',
        referencia_pasarela: 'SIM-abc',
        pagado_en: now,
        creado_en: now,
        actualizado_en: now,
      };
      expect(tx.id).toBe('tx-1');
      expect(tx.estado).toBe('aprobado');
      expect(tx.suscripcion_id).toBeNull();
      expect(tx.monto_local).toBe(87.5);
    });

    it('acepta suscripcion_id nulo', () => {
      const now = new Date();
      const tx: Transaccion = {
        id: 'tx-2',
        cuenta_id: 'c1',
        suscripcion_id: null,
        plan_id: 'p1',
        tipo_operacion: 'contratacion',
        monto_base: 5,
        monto_local: 5,
        moneda_local: 'USD',
        estado: 'pendiente',
        referencia_pasarela: null,
        pagado_en: null,
        creado_en: now,
        actualizado_en: now,
      };
      expect(tx.suscripcion_id).toBeNull();
      expect(tx.referencia_pasarela).toBeNull();
      expect(tx.pagado_en).toBeNull();
    });
  });

  describe('Recibo', () => {
    it('construye un objeto Recibo correctamente', () => {
      const now = new Date();
      const recibo: Recibo = {
        id: 'rec-1',
        transaccion_id: 'tx-1',
        numero_recibo: 'REC-0001',
        correo_destino: 'user@example.com',
        enviado: true,
        enviado_en: now,
        creado_en: now,
      };
      expect(recibo.numero_recibo).toBe('REC-0001');
      expect(recibo.enviado).toBe(true);
    });

    it('acepta enviado_en nulo', () => {
      const now = new Date();
      const recibo: Recibo = {
        id: 'rec-2',
        transaccion_id: 'tx-2',
        numero_recibo: 'REC-0002',
        correo_destino: 'user2@example.com',
        enviado: false,
        enviado_en: null,
        creado_en: now,
      };
      expect(recibo.enviado).toBe(false);
      expect(recibo.enviado_en).toBeNull();
    });
  });

  describe('ProcesarPagoInput', () => {
    it('construye input de pago valido', () => {
      const input: ProcesarPagoInput = {
        cuenta_id: 'c1',
        suscripcion_id: null,
        plan_id: 'p1',
        tipo_operacion: 'contratacion',
        monto_base: 10,
        moneda_local: 'GTQ',
        correo_destino: 'test@example.com',
        nombre_usuario: 'Test User',
        descripcion_plan: 'Plan Básico',
      };
      expect(input.tipo_operacion).toBe('contratacion');
      expect(input.moneda_local).toBe('GTQ');
    });

    it('admite campos opcionales ausentes', () => {
      const input: ProcesarPagoInput = {
        cuenta_id: 'c1',
        suscripcion_id: null,
        plan_id: 'p1',
        tipo_operacion: 'modificacion_plan',
        monto_base: 20,
        moneda_local: 'USD',
        correo_destino: 'test@example.com',
      };
      expect(input.nombre_usuario).toBeUndefined();
      expect(input.descripcion_plan).toBeUndefined();
    });
  });

  describe('ProcesarPagoResult', () => {
    it('acepta recibo nulo', () => {
      const now = new Date();
      const result: ProcesarPagoResult = {
        transaccion: {
          id: 'tx-3',
          cuenta_id: 'c1',
          suscripcion_id: null,
          plan_id: 'p1',
          tipo_operacion: 'contratacion',
          monto_base: 10,
          monto_local: 10,
          moneda_local: 'USD',
          estado: 'rechazado',
          referencia_pasarela: null,
          pagado_en: null,
          creado_en: now,
          actualizado_en: now,
        },
        recibo: null,
      };
      expect(result.recibo).toBeNull();
      expect(result.transaccion.estado).toBe('rechazado');
    });
  });
});
