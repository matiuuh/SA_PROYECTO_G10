# Estándares para el repositorio

## Manejo de nomenclatura de ramas

A. Tipo de rama (tipo/)

Define qué tipo de trabajo se está haciendo. Utiliza siempre inglés y en su versión corta, ya que es el estándar global:

- feat/ (Feature): Una nueva característica o funcionalidad.

- fix/ (Bugfix): Solución de un error o bug.

- hotfix/ (Hotfix): Solución urgente directamente en producción.

- docs/ (Documentation): Cambios exclusivos en la documentación (ej. el README).

- chore/ (Chore): Tareas de mantenimiento, actualización de dependencias, etc.

- refactor/ (Refactor): Mejoras en el código que no añaden funcionalidades ni arreglan bugs.

B. Alcance o Entorno (Opcional, pero útil en tu caso)

Si tu proyecto es un monorepo (tiene front y back juntos), es útil indicar dónde estás trabajando:

- front/

- back/

- shared/ (si afecta a ambos)

Ejemplo:

- feat/front/202300512/crear-formulario
- docs/front/202300512/actualizar-readme

## Manejo de commits

El commit debe ser descriptivo y claro, indicando qué se ha hecho en el commit.

Ejemplo:

- feat:#carnet: agregar formulario de registro
- fix:#carnet: corregir error de autenticación
- docs:#carnet: actualizar README
- chore:#carnet: actualizar dependencias
- refactor:#carnet: mejorar código de autenticación

