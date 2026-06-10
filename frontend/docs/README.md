# Frontend

Stack tecnológico:
- React
- Vite
- TypeScript
- TailwindCSS

Gestor de paquetes:
- pnpm

Por lo tanto, para instalar las dependencias, ejecutar:
```bash
pnpm install
```

Para ejecutar el proyecto en modo desarrollo:
```bash
pnpm dev
```

Para ejecutar el proyecto en modo producción:
```bash
pnpm build
```

## Patrón de diseño atómico

Este proyecto utiliza el patrón de diseño atómico para la estructura de los componentes. Recordando que aunque el nombre DICE PATRÓN, NO ES UN PATRÓN DE DISEÑO, sino una forma de organizar los componentes de React.

La estructura de los componentes se organiza de la siguiente manera:

- atoms/
- molecules/
- organisms/
- templates/
- pages/

![Atomic Design](./img/image.png)

Los componentes se organizan de la siguiente manera:
- atoms/: componentes atómicos, como botones, inputs, etc.
- molecules/: componentes moleculares, como formularios, etc.
- organisms/: componentes orgánicos, como secciones, etc.
- templates/: componentes de plantilla, como layouts, etc.
- pages/: componentes de página, como vistas, etc.

COMO BUENA PRÁCTICA REALIZAREMOS SKELETONS CUANDO HAYA DEMORAS EN LA CARGA DE DATOS.

- Otra herramient es Storybook para documentar los componentes y poder visualizarlos de manera aislada.

- Como librería de iconos utilizaremos Lucide React.

## Convención de imports (`@` alias)

Todos los imports internos usan el alias `@` que apunta a `src/`. **Nunca uses paths relativos con `../../`**.

| Qué importar | Desde |
|---|---|
| Átomo / Molécula / Organismo / Template | `@/components/<nivel>` |
| Todos los componentes compartidos | `@/components` |
| Páginas públicas | `@/pages/public` |
| Páginas privadas | `@/pages/private` |
| Hooks globales | `@/hooks` |
| Feature completa | `@/features/<nombre>` |

Ejemplos correctos:
```ts
import { Button } from '@/components/atoms'
import { Navbar, Footer } from '@/components/organisms'
import { PublicLayout } from '@/components/templates'
import { LandingPage } from '@/pages/public'
```

## Estructura de carpetas

```
src/
├── components/          # Componentes compartidos (Atomic Design)
│   ├── atoms/
│   ├── molecules/
│   ├── organisms/
│   ├── templates/
│   └── index.ts         # Re-exporta todos los niveles
├── features/            # Módulos de dominio (ver abajo)
├── hooks/               # Hooks globales reutilizables
├── pages/
│   ├── public/
│   ├── private/
│   └── index.ts
└── router/
```

## Cómo agregar un nuevo módulo (`features/`)

Cuando un módulo crece (ej: catálogo, perfil, pagos), créalo como feature autónoma:

```
src/features/catalog/
├── components/          # Componentes exclusivos del módulo
│   ├── CatalogGrid/
│   └── index.ts
├── hooks/               # Hooks del módulo
├── types.ts             # Tipos/interfaces del módulo
└── index.ts             # Barrel público de la feature
```

La feature sólo exporta lo que otras partes del app necesitan a través de su `index.ts`. Internamente puede importar de `@/components` para reutilizar componentes compartidos, pero **nunca** importa de otra feature directamente.

## Cómo agregar una nueva vista

1. Crear `src/pages/public/<NombrePagina>/` o `src/pages/private/<NombrePagina>/`
2. Agregar el componente en `<NombrePagina>.tsx`
3. Exportar desde el `index.ts` de la carpeta y del barrel del grupo (`public/index.ts` o `private/index.ts`)
4. Registrar la ruta en `src/router/index.tsx` importando desde `@/pages/public` o `@/pages/private`