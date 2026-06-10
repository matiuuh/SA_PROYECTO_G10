# Correccion de perfiles segun suscripcion

## Objetivo

Este ajuste agrega control para que una cuenta no siga usando perfiles que exceden el limite permitido por su suscripcion actual.

## Cambios aplicados

- se agrego la columna `activo` en `usuarios.perfiles`
- los perfiles ahora pueden quedar:
  - `activos`: disponibles para seleccion
  - `inactivos`: conservados en base de datos, pero no disponibles mientras el plan no los permita
- la vista `usuarios.v_perfiles_disponibles` ahora solo expone perfiles activos

## Regla de negocio que resuelve

Cuando una cuenta:

- cancela su suscripcion
- cambia a un plan con menos perfiles

el sistema debe conservar el estado real de la cuenta y no dejar accesibles perfiles que exceden el limite permitido.

## Comportamiento esperado

- si la suscripcion se cancela, solo debe quedar habilitado el perfil principal
- si la cuenta baja a un plan inferior, deben quedar habilitados solo los perfiles permitidos por ese plan
- los perfiles excedentes no se eliminan, solo se inhabilitan
- si la cuenta vuelve a subir de plan, esos perfiles pueden reactivarse
