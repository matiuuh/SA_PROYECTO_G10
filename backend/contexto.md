# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Proyecto

**Quetzal TV** — Plataforma de streaming bajo demanda, construida con arquitectura de microservicios poliglota.
- **Curso:** Software Avanzado — Vacaciones de Junio 2026, USAC ECYS
- **Equipo:** Grupo 10 (5 integrantes)
- **Entrega Fase 1:** 09 de junio de 2026

---

## Stack tecnológico

### Frontend (activo)
- **React 19** + **TypeScript** (strict) + **Vite 8**
- **TailwindCSS 4** via `@tailwindcss/vite` (no PostCSS)
- **React Router 7** para enrutamiento
- **Storybook 10** para documentación de componentes
- **Vitest** con integración Playwright para tests
- **Package manager: pnpm** — no usar npm ni yarn

### Backend — 7 microservicios definidos

| Servicio | Lenguaje | Responsabilidades principales |
|---|---|---|
| **Usuario** | Python | Datos personales, correo, contraseña, país de origen, JWT, perfiles (hasta 5), preferencias, historial de reproducción, calificaciones/opiniones, login |
| **Suscripción** | Python | Planes disponibles, contratación, modificación y cancelación de suscripción |
| **Catálogo** | Go | Películas, series, búsqueda, filtrado por categoría/género, fichas técnicas, reparto |
| **Streaming** | Go | Reproducción de contenido, control de progreso de visualización |
| **Divisas** | TypeScript | Consulta de tipos de cambio, caché Redis con TTL, conversión de precios a moneda local |
| **Cobros** | TypeScript | Procesamiento de pagos, emisión de recibos |
| **Notificaciones** | TypeScript | Envío de correos: confirmación de registro, recibos, alertas de nuevas publicaciones |

- Comunicación interna: **gRPC** + **Protocol Buffers** (contratos obligatorios entre todos los servicios)
- Caché: **Redis** (TTL obligatorio en Servicio de Divisas)
- API Gateway como único punto de entrada externo
- Seguridad: **JWT** service-to-service + **Session Cookies** + **OAuth**
- DB por microservicio (patrón Database per Microservice)

---

## Comandos del frontend

Ejecutar desde `frontend/`:

```bash
pnpm dev              # Servidor de desarrollo
pnpm build            # tsc -b && vite build (usa referencias de proyecto TS)
pnpm lint             # ESLint (flat config)
pnpm storybook        # Storybook en puerto 6006
pnpm build-storybook  # Build estático de Storybook
```

> `pnpm build` ejecuta primero `tsc -b` (project references), no es un build estándar de Vite.

---

## Convenciones de código (frontend)

- **Alias obligatorio:** Usar siempre `@/` para importaciones internas (`@/components/...`). Nunca rutas relativas.
- **Patrón Atomic Design** en `src/components/`:
  - `atoms/` — elementos básicos reutilizables (Button, Badge, Logo)
  - `molecules/` — combinaciones simples (FeatureCard, MovieCard, NavLink)
  - `organisms/` — secciones complejas (Navbar, Footer, HeroSection)
  - `templates/` — layouts (PublicLayout, PrivateLayout)
- Cada componente nuevo debe tener su archivo `.stories.tsx` en Storybook.
- Exports de componentes a través del barrel `src/components/index.ts`.
- Páginas separadas en `src/pages/public/` y `src/pages/private/`.

---

## Control de versiones

- **Prohibidos** los commits directos a `main` o `develop`. Todo cambio debe pasar por **Pull Request** con revisión del equipo.
- **Nomenclatura de ramas:** `<tipo>/<carnet>/<descripción>`
  - Ejemplos: `feat/front/202300512/landingpage`, `docs/shared/202203009/rf-rnf`
  - Tipos comunes: `feat`, `fix`, `docs`, `chore`
- **Tag de entrega:** `V1.0.0` requerido al finalizar.

---

## Documentación

Toda la documentación del proyecto vive en `docs/`:
- `docs/RF/` — Requerimientos Funcionales
- `docs/RNF/` — Requerimientos No Funcionales
- `docs/CasosDeUso/` — Casos de uso UML
- `docs/vistas_4_+_1/` — Vista de arquitectura (Modelo 4+1)
- `docs/excalidraw/` — Archivos fuente de diagramas
- `Documentación.md` — Índice principal de la documentación

Los diagramas deben subirse como **archivos crudos** (`.svg`, `.excalidraw`, etc.) al repositorio.

---

## Infraestructura (pendiente)

- Cada servicio requiere su propio `Dockerfile`.
- Dos entornos Docker Compose:
  - `docker-compose.local.yml` — desarrollo local
  - `docker-compose.cloud.yml` — producción en nube
- Variables sensibles (URLs, contraseñas, IPs) solo en archivos `.env`, nunca en el repositorio.

---

## Programación en base de datos (requerida)

Cada microservicio con DB debe implementar:
- **Procedimientos almacenados** — flujos transaccionales (ej. registro de compra)
- **Vistas** — consultas complejas (ej. cartelera, ficha de actores)
- **Funciones** — lógica modular (ej. cálculo de porcentaje de recomendación)
- **Triggers** — auditorías automáticas (ej. cambios de credenciales)
