import { isPublic } from '../src/auth';

describe('auth — isPublic', () => {
  describe('rutas publicas de autenticacion', () => {
    it('POST /api/usuario/api/v1/auth/login es publico', () => {
      expect(isPublic('POST', '/api/usuario/api/v1/auth/login')).toBe(true);
    });

    it('POST /api/usuario/api/v1/auth/register es publico', () => {
      expect(isPublic('POST', '/api/usuario/api/v1/auth/register')).toBe(true);
    });

    it('GET /api/usuario/api/v1/auth/login NO es publico', () => {
      expect(isPublic('GET', '/api/usuario/api/v1/auth/login')).toBe(false);
    });

    it('GET /api/usuario/api/v1/auth/me NO es publico', () => {
      expect(isPublic('GET', '/api/usuario/api/v1/auth/me')).toBe(false);
    });
  });

  describe('rutas internas de usuario', () => {
    it('GET /api/usuario/api/v1/internal/ es publico', () => {
      expect(isPublic('GET', '/api/usuario/api/v1/internal/something')).toBe(true);
    });

    it('POST /api/usuario/api/v1/internal/ NO es publico', () => {
      expect(isPublic('POST', '/api/usuario/api/v1/internal/something')).toBe(false);
    });
  });

  describe('rutas del catalogo', () => {
    it('GET /api/catalogo/api/v1/catalog exacto es publico', () => {
      expect(isPublic('GET', '/api/catalogo/api/v1/catalog')).toBe(true);
    });

    it('GET /api/catalogo/api/v1/catalog con query string es publico', () => {
      expect(isPublic('GET', '/api/catalogo/api/v1/catalog?genre=1')).toBe(true);
    });

    it('GET /api/catalogo/api/v1/catalog/abc es publico', () => {
      expect(isPublic('GET', '/api/catalogo/api/v1/catalog/abc')).toBe(true);
    });

    it('GET /api/catalogo/api/v1/catalog/search es publico', () => {
      expect(isPublic('GET', '/api/catalogo/api/v1/catalog/search?q=test')).toBe(true);
    });

    it('POST /api/catalogo/api/v1/catalog NO es publico', () => {
      expect(isPublic('POST', '/api/catalogo/api/v1/catalog')).toBe(false);
    });

    it('DELETE /api/catalogo/api/v1/catalog/abc NO es publico', () => {
      expect(isPublic('DELETE', '/api/catalogo/api/v1/catalog/abc')).toBe(false);
    });
  });

  describe('rutas de planes (suscripcion)', () => {
    it('GET /api/suscripcion/api/v1/plans exacto es publico', () => {
      expect(isPublic('GET', '/api/suscripcion/api/v1/plans')).toBe(true);
    });

    it('GET /api/suscripcion/api/v1/plans/plan-id es publico', () => {
      expect(isPublic('GET', '/api/suscripcion/api/v1/plans/plan-123')).toBe(true);
    });

    it('POST /api/suscripcion/api/v1/plans NO es publico', () => {
      expect(isPublic('POST', '/api/suscripcion/api/v1/plans')).toBe(false);
    });
  });

  describe('rutas de divisas', () => {
    it('GET /api/divisas/ es publico', () => {
      expect(isPublic('GET', '/api/divisas/api/v1/rates')).toBe(true);
    });

    it('POST /api/divisas/ es publico', () => {
      expect(isPublic('POST', '/api/divisas/api/v1/convert')).toBe(true);
    });

    it('DELETE /api/divisas/ NO es publico', () => {
      expect(isPublic('DELETE', '/api/divisas/api/v1/rates')).toBe(false);
    });
  });

  describe('rutas de notificaciones', () => {
    it('POST /api/notificaciones/ es publico', () => {
      expect(isPublic('POST', '/api/notificaciones/api/v1/send')).toBe(true);
    });

    it('GET /api/notificaciones/ NO es publico', () => {
      expect(isPublic('GET', '/api/notificaciones/api/v1/send')).toBe(false);
    });
  });

  describe('rutas OPTIONS (CORS preflight)', () => {
    it('OPTIONS /api/cualquier-ruta es publico', () => {
      expect(isPublic('OPTIONS', '/api/usuario/api/v1/auth/me')).toBe(true);
    });

    it('OPTIONS /api/catalogo/api/v1/catalog es publico', () => {
      expect(isPublic('OPTIONS', '/api/catalogo/api/v1/catalog')).toBe(true);
    });
  });

  describe('ruta health', () => {
    it('GET /health es publico', () => {
      expect(isPublic('GET', '/health')).toBe(true);
    });

    it('POST /health NO es publico', () => {
      expect(isPublic('POST', '/health')).toBe(false);
    });
  });

  describe('rutas privadas generales', () => {
    it('GET /api/cobros/api/v1/transactions NO es publico', () => {
      expect(isPublic('GET', '/api/cobros/api/v1/transactions')).toBe(false);
    });

    it('POST /api/suscripcion/api/v1/subscriptions NO es publico', () => {
      expect(isPublic('POST', '/api/suscripcion/api/v1/subscriptions')).toBe(false);
    });

    it('PATCH /api/usuario/api/v1/profiles/123 NO es publico', () => {
      expect(isPublic('PATCH', '/api/usuario/api/v1/profiles/123')).toBe(false);
    });
  });
});
