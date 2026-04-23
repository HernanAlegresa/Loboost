# Sesion Coach UX/UI — 2026-04-23

## Que cambie

- Unifique feedback visual de guardado/creacion en coach con overlay centrado (mismo patron del alta de cliente) para:
  - crear ejercicio
  - crear plan
  - editar plan de biblioteca
  - editar plan asignado a cliente
- Reorganice crear/editar plan (`plan-builder`) en dos tabs:
  - `Datos del plan`
  - `Dias de entrenamiento`
- Perfil de cliente (coach):
  - elimine el bloque `Registrar peso` del flujo principal
  - integre `Sesiones` como tercer tab dentro del mismo shell con scroll/snap consistente
  - ajuste layout de tabs para jerarquia mas equilibrada:
    - `Perfil` izquierda
    - `Progreso` centro
    - `Sesiones` derecha
  - agregue acciones claras en `Plan activo`:
    - `Ver plan asignado` (modo solo lectura)
    - `Editar plan asignado`
- Biblioteca de planes -> detalle de plan:
  - convierto semanas en secciones colapsables (`details/summary`) cerradas por defecto.

## Por que

- El coach no tenia confirmacion visual fuerte al guardar en flujos criticos; el overlay reduce incertidumbre y mantiene consistencia de experiencia.
- Crear/editar plan en una sola pantalla hacia tediosa la tarea; separar por tabs reduce carga cognitiva sin tocar logica.
- El coach no debe registrar peso (responsabilidad del cliente), por eso se removio del perfil.
- Sesiones como pantalla aparte rompia consistencia del comportamiento de tabs y del gesto horizontal del perfil.
- En detalle de plan, semanas abiertas por defecto generaban ruido y scroll innecesario.

## Decisiones relevantes

- Reutilizacion de patron visual existente en lugar de inventar otro componente de exito.
- `Ver plan asignado` reutiliza la pantalla de edicion del plan asignado con `mode=view` para evitar duplicar logica de datos.
- Se preservo el invariante de dominio: las acciones de edicion del perfil impactan `client_plans` (copia asignada) y no plantillas de biblioteca.
- Se extrajo una lista reusable de sesiones (`client-sessions-list`) para mantener consistencia entre tab embebido y ruta dedicada de sesiones.

## Pendientes detectados

- `npx tsc --noEmit` sigue fallando por un tema preexistente de entorno: faltan tipos/modulo de `vitest` en tests (`src/features/**/__tests__/schemas.test.ts`).
- Si se quiere cerrar completamente la brecha de UX, se puede evaluar retirar la ruta separada de sesiones del perfil (hoy sigue existiendo, pero ya no es necesaria para el flujo principal).
