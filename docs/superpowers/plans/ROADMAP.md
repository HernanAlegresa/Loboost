# LoBoost — Roadmap de Implementación

> Actualizado: 2026-04-22. Fase 4 en progreso. Quedan 2 planes pendientes.

## Cómo usar este roadmap

En la sesión de implementación, decile a Claude: **"Ejecutá el Plan [N] de LoBoost: [nombre]"**.
Claude leerá el plan y arrancará con `superpowers:executing-plans`.

---

## PLANES COMPLETADOS ✅

### Fase 3 — Base funcional
- Plan A — Fundación de datos (migraciones, schemas, actions) ✅
- Plan B — UI multi-semana, live training, vista progreso ✅
- Plan 1 — Plan detail fix + coach ve sesiones del cliente ✅
- Plan 2 — Edición perfil cliente + mediciones corporales ✅
- Plan 3 — Registro sesiones pasadas (retroactivo) ✅
- Plan 4 — Cambio de contraseña coach y cliente ✅
- Plan 5 — Alerta plan vencido (badge + banner) ✅
- Plan 6 — Vista de progreso épica (recharts) ✅

### Fase 4 — Features + UX/UI
- Plan 7 — Inline last-session data en live training ✅ → `feat/inline-last-session`
- Plan 9 — Inactivity alert badge en lista de clientes ✅ → `feat/inactivity-alert`
- Plan 11 — Rest Timer en live training ✅ → `feat/rest-timer`
- Plan 12 — Skeleton loaders + loading.tsx ✅ → `feat/skeleton-loaders`
- Plan 13 — Error boundaries en rutas críticas ✅ → `feat/error-boundaries`
- Plan 14 — Empty states upgrade ✅ → `feat/empty-states`
- Plan 15 — Assign plan shortcut desde banner vencido ✅ → `feat/assign-shortcut`

---

## PLANES PENDIENTES — Fase 4 ❌

### Plan 8 — PR Detection + celebración visual
**Archivo:** `docs/superpowers/plans/2026-04-21-pr-detection.md`
**Branch a crear:** `feat/pr-detection`
**Trigger:** `"Ejecutá el Plan 8 de LoBoost: PR detection con celebración visual"`
**Qué resuelve:**
- No hay detección de récord personal al completar un set
- Se agrega detección automática + overlay de celebración de 1500ms al lograr un PR

---

### Plan 10 — Post-session check-in
**Archivo:** `docs/superpowers/plans/2026-04-21-post-session-checkin.md`
**Branch a crear:** `feat/post-session-checkin`
**Trigger:** `"Ejecutá el Plan 10 de LoBoost: post-session check-in modal"`
**Qué resuelve:**
- Al terminar un entrenamiento se va directo al éxito sin preguntar cómo se sintió el cliente
- Modal de check-in con energía + sueño + dolor muscular (1-5) antes de completar la sesión
- El coach ve estos datos en el detalle de la sesión

---

## Estado de branches

| Branch | Plan | En master |
|--------|------|-----------|
| `feat/skeleton-loaders` | Plan 12 | ❌ pendiente merge |
| `feat/error-boundaries` | Plan 13 | ❌ pendiente merge |
| `feat/rest-timer` | Plan 11 | ❌ pendiente merge |
| `feat/inactivity-alert` | Plan 9 | ❌ pendiente merge |
| `feat/empty-states` | Plan 14 | ❌ pendiente merge |
| `feat/assign-shortcut` | Plan 15 | ❌ pendiente merge |
| `feat/inline-last-session` | Plan 7 | ❌ pendiente merge |

> Todos los branches están pushados a origin. El merge a master se hará al final, cuando todos los planes estén completos.

---

## Orden de ejecución — próxima sesión

1. Plan 8 (PR Detection) → `feat/pr-detection`
2. Plan 10 (Post-session check-in) → `feat/post-session-checkin`
3. Revisión final de calidad de todos los planes
4. Merge de todos los branches a master en orden

---

## Stack técnico

- Next.js 15 App Router, TypeScript
- Supabase (Auth + Postgres con RLS)
- Inline styles (sin Tailwind, sin CSS modules)
- Lucide React para iconos
- Framer Motion (ya instalado)
- recharts (ya instalado — Plan 6)
- Server Actions para mutaciones

## Decisiones de producto ya tomadas

| Decisión | Opción elegida |
|----------|---------------|
| Progresión de semanas | Fecha calendario fija (start_date + N días) |
| Sesiones no realizadas | Silencio (no se marca missed automáticamente) |
| Fin del plan | El plan queda `completed`, el coach asigna uno nuevo manualmente |
| Nutrición | Fuera de scope — placeholder se puede eliminar |
| Chat | Fuera de scope |
| Pagos | Gestión externa |
