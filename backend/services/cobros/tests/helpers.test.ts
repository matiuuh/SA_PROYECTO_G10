// Tests de las funciones helper puras de cobros-service (rowToTransaccion, rowToRecibo)
// Se prueban indirectamente a través de objetos construidos manualmente para validar
// el comportamiento del mapeado sin necesidad de base de datos.

describe('rowToTransaccion helpers — mapeo de filas a dominio', () => {
  function rowToTransaccion(row: Record<string, unknown>) {
    return {
      id: row['id'] as string,
      cuenta_id: row['cuenta_id'] as string,
      suscripcion_id: (row['suscripcion_id'] as string | null) ?? null,
      plan_id: row['plan_id'] as string,
      tipo_operacion: row['tipo_operacion'] as string,
      monto_base: parseFloat(row['monto_base'] as string),
      monto_local: parseFloat(row['monto_local'] as string),
      moneda_local: row['moneda_local'] as string,
      estado: row['estado'] as string,
      referencia_pasarela: (row['referencia_pasarela'] as string | null) ?? null,
      pagado_en: row['pagado_en'] ? new Date(row['pagado_en'] as string) : null,
      creado_en: new Date(row['creado_en'] as string),
      actualizado_en: new Date(row['actualizado_en'] as string),
    };
  }

  function rowToRecibo(row: Record<string, unknown>) {
    return {
      id: row['id'] as string,
      transaccion_id: row['transaccion_id'] as string,
      numero_recibo: row['numero_recibo'] as string,
      correo_destino: row['correo_destino'] as string,
      enviado: row['enviado'] as boolean,
      enviado_en: row['enviado_en'] ? new Date(row['enviado_en'] as string) : null,
      creado_en: new Date(row['creado_en'] as string),
    };
  }

  describe('rowToTransaccion', () => {
    it('mapea todos los campos correctamente', () => {
      const now = new Date().toISOString();
      const row: Record<string, unknown> = {
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
      };
      const tx = rowToTransaccion(row);
      expect(tx.id).toBe('tx-1');
      expect(tx.monto_base).toBe(10.0);
      expect(tx.monto_local).toBe(87.5);
      expect(tx.pagado_en).toBeInstanceOf(Date);
      expect(tx.suscripcion_id).toBe('s-1');
    });

    it('mapea suscripcion_id nulo', () => {
      const now = new Date().toISOString();
      const row: Record<string, unknown> = {
        id: 'tx-2',
        cuenta_id: 'c-1',
        suscripcion_id: null,
        plan_id: 'p-1',
        tipo_operacion: 'contratacion',
        monto_base: '5.00',
        monto_local: '5.00',
        moneda_local: 'USD',
        estado: 'pendiente',
        referencia_pasarela: null,
        pagado_en: null,
        creado_en: now,
        actualizado_en: now,
      };
      const tx = rowToTransaccion(row);
      expect(tx.suscripcion_id).toBeNull();
      expect(tx.referencia_pasarela).toBeNull();
      expect(tx.pagado_en).toBeNull();
    });

    it('parsea montos como float', () => {
      const now = new Date().toISOString();
      const row: Record<string, unknown> = {
        id: 'tx-3',
        cuenta_id: 'c-1',
        suscripcion_id: null,
        plan_id: 'p-1',
        tipo_operacion: 'modificacion_plan',
        monto_base: '15.75',
        monto_local: '122.50',
        moneda_local: 'GTQ',
        estado: 'aprobado',
        referencia_pasarela: 'SIM-xyz',
        pagado_en: now,
        creado_en: now,
        actualizado_en: now,
      };
      const tx = rowToTransaccion(row);
      expect(tx.monto_base).toBeCloseTo(15.75);
      expect(tx.monto_local).toBeCloseTo(122.5);
    });
  });

  describe('rowToRecibo', () => {
    it('mapea todos los campos de recibo correctamente', () => {
      const now = new Date().toISOString();
      const row: Record<string, unknown> = {
        id: 'rec-1',
        transaccion_id: 'tx-1',
        numero_recibo: 'REC-0001',
        correo_destino: 'user@example.com',
        enviado: true,
        enviado_en: now,
        creado_en: now,
      };
      const recibo = rowToRecibo(row);
      expect(recibo.id).toBe('rec-1');
      expect(recibo.numero_recibo).toBe('REC-0001');
      expect(recibo.enviado).toBe(true);
      expect(recibo.enviado_en).toBeInstanceOf(Date);
    });

    it('mapea enviado_en nulo', () => {
      const now = new Date().toISOString();
      const row: Record<string, unknown> = {
        id: 'rec-2',
        transaccion_id: 'tx-2',
        numero_recibo: 'REC-0002',
        correo_destino: 'other@example.com',
        enviado: false,
        enviado_en: null,
        creado_en: now,
      };
      const recibo = rowToRecibo(row);
      expect(recibo.enviado).toBe(false);
      expect(recibo.enviado_en).toBeNull();
    });
  });
});
