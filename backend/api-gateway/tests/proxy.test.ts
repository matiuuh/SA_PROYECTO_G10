import { rewriteUrl } from '../src/proxy';

describe('proxy — rewriteUrl', () => {
  it('elimina el prefijo y devuelve la ruta restante', () => {
    expect(rewriteUrl('/api/usuario/api/v1/auth/me', '/api/usuario')).toBe('/api/v1/auth/me');
  });

  it('elimina prefijo de catalogo', () => {
    expect(rewriteUrl('/api/catalogo/api/v1/catalog', '/api/catalogo')).toBe('/api/v1/catalog');
  });

  it('elimina prefijo de suscripcion', () => {
    expect(rewriteUrl('/api/suscripcion/api/v1/plans', '/api/suscripcion')).toBe('/api/v1/plans');
  });

  it('elimina prefijo de cobros', () => {
    expect(rewriteUrl('/api/cobros/api/v1/transactions', '/api/cobros')).toBe('/api/v1/transactions');
  });

  it('elimina prefijo de divisas', () => {
    expect(rewriteUrl('/api/divisas/api/v1/rates', '/api/divisas')).toBe('/api/v1/rates');
  });

  it('elimina prefijo de streaming', () => {
    expect(rewriteUrl('/api/streaming/api/v1/progress', '/api/streaming')).toBe('/api/v1/progress');
  });

  it('preserva query string tras eliminar prefijo', () => {
    expect(rewriteUrl('/api/catalogo/api/v1/catalog?genre=1&page=2', '/api/catalogo')).toBe('/api/v1/catalog?genre=1&page=2');
  });

  it('preserva path con IDs tras eliminar prefijo', () => {
    expect(rewriteUrl('/api/usuario/api/v1/profiles/abc-123', '/api/usuario')).toBe('/api/v1/profiles/abc-123');
  });

  it('agrega slash inicial si la ruta resultante no lo tiene', () => {
    const result = rewriteUrl('/api/test/rest', '/api/test');
    expect(result.startsWith('/')).toBe(true);
  });

  it('prefijo exacto devuelve slash', () => {
    const result = rewriteUrl('/api/usuario', '/api/usuario');
    expect(result).toBe('/');
  });

  it('ruta con subruta profunda', () => {
    expect(
      rewriteUrl('/api/streaming/api/v1/history/profile-1/content-2', '/api/streaming')
    ).toBe('/api/v1/history/profile-1/content-2');
  });
});
