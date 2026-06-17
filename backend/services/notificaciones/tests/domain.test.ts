import type {
  TipoNotificacion,
  EstadoNotificacion,
  Notificacion,
  ResultadoEnvioNotificacion,
} from '../src/domain/notification';

describe('domain/notification — tipos y estructuras', () => {
  describe('TipoNotificacion', () => {
    it('acepta confirmacion_registro', () => {
      const tipo: TipoNotificacion = 'confirmacion_registro';
      expect(tipo).toBe('confirmacion_registro');
    });

    it('acepta recibo', () => {
      const tipo: TipoNotificacion = 'recibo';
      expect(tipo).toBe('recibo');
    });

    it('acepta alerta_publicacion', () => {
      const tipo: TipoNotificacion = 'alerta_publicacion';
      expect(tipo).toBe('alerta_publicacion');
    });
  });

  describe('EstadoNotificacion', () => {
    it('acepta pendiente', () => {
      const estado: EstadoNotificacion = 'pendiente';
      expect(estado).toBe('pendiente');
    });

    it('acepta enviado', () => {
      const estado: EstadoNotificacion = 'enviado';
      expect(estado).toBe('enviado');
    });

    it('acepta fallido', () => {
      const estado: EstadoNotificacion = 'fallido';
      expect(estado).toBe('fallido');
    });
  });

  describe('Notificacion', () => {
    it('construye una Notificacion completa correctamente', () => {
      const now = new Date();
      const notif: Notificacion = {
        id: 'n-1',
        tipo: 'recibo',
        correo_destino: 'user@example.com',
        asunto: 'Recibo de compra',
        estado: 'enviado',
        intentos: 1,
        error_mensaje: null,
        creado_en: now,
        enviado_en: now,
      };
      expect(notif.id).toBe('n-1');
      expect(notif.tipo).toBe('recibo');
      expect(notif.estado).toBe('enviado');
      expect(notif.intentos).toBe(1);
      expect(notif.error_mensaje).toBeNull();
      expect(notif.enviado_en).toBeInstanceOf(Date);
    });

    it('acepta estado fallido con mensaje de error', () => {
      const now = new Date();
      const notif: Notificacion = {
        id: 'n-2',
        tipo: 'confirmacion_registro',
        correo_destino: 'fail@example.com',
        asunto: 'Confirmacion de registro',
        estado: 'fallido',
        intentos: 3,
        error_mensaje: 'SMTP connection refused',
        creado_en: now,
        enviado_en: null,
      };
      expect(notif.estado).toBe('fallido');
      expect(notif.intentos).toBe(3);
      expect(notif.error_mensaje).toBe('SMTP connection refused');
      expect(notif.enviado_en).toBeNull();
    });

    it('acepta estado pendiente con cero intentos', () => {
      const now = new Date();
      const notif: Notificacion = {
        id: 'n-3',
        tipo: 'alerta_publicacion',
        correo_destino: 'admin@example.com',
        asunto: 'Nueva pelicula disponible',
        estado: 'pendiente',
        intentos: 0,
        error_mensaje: null,
        creado_en: now,
        enviado_en: null,
      };
      expect(notif.estado).toBe('pendiente');
      expect(notif.intentos).toBe(0);
    });
  });

  describe('ResultadoEnvioNotificacion', () => {
    it('resultado de envio exitoso', () => {
      const resultado: ResultadoEnvioNotificacion = {
        id: 'n-1',
        enviado: true,
        error_mensaje: null,
      };
      expect(resultado.enviado).toBe(true);
      expect(resultado.error_mensaje).toBeNull();
    });

    it('resultado de envio fallido con mensaje', () => {
      const resultado: ResultadoEnvioNotificacion = {
        id: 'n-2',
        enviado: false,
        error_mensaje: 'Timeout connecting to SMTP server',
      };
      expect(resultado.enviado).toBe(false);
      expect(resultado.error_mensaje).toBe('Timeout connecting to SMTP server');
    });
  });
});
