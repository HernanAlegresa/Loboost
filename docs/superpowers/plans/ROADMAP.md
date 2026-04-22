# LoBoost — Roadmap de Implementación

> Actualizado: 2026-04-21. Fase 3 completa. A continuación los 9 planes pendientes (features + UX/UI).

## Cómo usar este roadmap

En la sesión de implementación, decile a Claude: **"Ejecutá el Plan [N] de LoBoost: [nombre]"**.
Claude leerá el plan y arrancará con `superpowers:subagent-driven-development` o `superpowers:executing-plans`.

---

## PLANES COMPLETADOS ✅ (Fase 3)

- Plan A — Fundación de datos (migraciones, schemas, actions) ✅
- Plan B — UI multi-semana, live training, vista progreso ✅
- Plan 1 — Plan detail fix + coach ve sesiones del cliente ✅
- Plan 2 — Edición perfil cliente + mediciones corporales ✅
- Plan 3 — Registro sesiones pasadas (retroactivo) ✅
- Plan 4 — Cambio de contraseña coach y cliente ✅
- Plan 5 — Alerta plan vencido (badge + banner) ✅
- Plan 6 — Vista de progreso épica (recharts) ✅
- Plan 11 — Rest Timer en live training ✅
- Plan 12 — Skeleton loaders + loading.tsx ✅
- Plan 13 — Error boundaries en rutas críticas ✅

---

## PLANES PENDIENTES — Fase 4

### Plan 7 — Inline last-session data (live training)
**Archivo:** `docs/superpowers/plans/2026-04-21-inline-last-session.md`
**Trigger:** `"Ejecutá el Plan 7 de LoBoost: inline last-session data en live training"`
**Qué resuelve:**
- Mientras el cliente entrena, no ve qué peso/reps hizo la última vez en ese set
- Se muestra "Última vez: 80 kg × 5 reps" en el set activo (estilo Strong/Hevy)

---

### Plan 8 — PR Detection + celebración visual
**Archivo:** `docs/superpowers/plans/2026-04-21-pr-detection.md`
**Trigger:** `"Ejecutá el Plan 8 de LoBoost: PR detection con celebración visual"`
**Qué resuelve:**
- No hay detección de récord personal al completar un set
- Se agrega detección automática + overlay de celebración de 1500ms al lograr un PR

---

### Plan 9 — Inactivity alert badge
**Archivo:** `docs/superpowers/plans/2026-04-21-inactivity-alert.md`
**Trigger:** `"Ejecutá el Plan 9 de LoBoost: inactivity alert badge en lista de clientes"`
**Qué resuelve:**
- El coach no ve señal visual cuando un cliente lleva 7+ días sin entrenar
- Badge "X días sin entrenar" en la client card (puramente UI, `daysSinceLastSession` ya existe)

---

### Plan 10 — Post-session check-in
**Archivo:** `docs/superpowers/plans/2026-04-21-post-session-checkin.md`
**Trigger:** `"Ejecutá el Plan 10 de LoBoost: post-session check-in modal"`
**Qué resuelve:**
- Al terminar un entrenamiento se va directo al éxito sin preguntar cómo se sintió el cliente
- Modal de check-in con energía + sueño + dolor muscular (1-5) antes de completar la sesión
- El coach ve estos datos en el detalle de la sesión

---

### Plan 11 — Rest Timer en live training ⭐ UX
**Archivo:** `docs/superpowers/plans/2026-04-21-rest-timer.md`
**Trigger:** `"Ejecutá el Plan 11 de LoBoost: rest timer en live training"`
**Qué resuelve:**
- Después de completar un set no hay feedback de cuánto descansar
- Countdown automático usando el `restSeconds` del ejercicio, con barra de progreso y botón "Saltar"
- Feature icónica de Strong, mejora drástica de la experiencia de entrenamiento

---

### Plan 12 — Skeleton loaders + loading.tsx ⭐ UX/Producción
**Archivo:** `docs/superpowers/plans/2026-04-21-skeleton-loaders.md`
**Trigger:** `"Ejecutá el Plan 12 de LoBoost: skeleton loaders en todas las rutas"`
**Qué resuelve:**
- Las páginas muestran pantalla en blanco mientras cargan
- Agrega `loading.tsx` con skeletons animados en 8 rutas principales

---

### Plan 13 — Error boundaries ⭐ Producción
**Archivo:** `docs/superpowers/plans/2026-04-21-error-boundaries.md`
**Trigger:** `"Ejecutá el Plan 13 de LoBoost: error boundaries en rutas críticas"`
**Qué resuelve:**
- Si una query falla, la app rompe sin mensaje claro
- Agrega `error.tsx` en 4 rutas críticas con ErrorView reutilizable + botón retry

---

### Plan 14 — Empty states upgrade ⭐ UX
**Archivo:** `docs/superpowers/plans/2026-04-21-empty-states.md`
**Trigger:** `"Ejecutá el Plan 14 de LoBoost: empty states mejorados"`
**Qué resuelve:**
- Empty states son texto gris plano sin contexto visual
- Agrega icono + título + subtexto motivacional en 4 pantallas clave

---

### Plan 15 — Assign plan shortcut desde banner vencido ⭐ UX
**Archivo:** `docs/superpowers/plans/2026-04-21-assign-plan-shortcut.md`
**Trigger:** `"Ejecutá el Plan 15 de LoBoost: assign plan shortcut desde banner vencido"`
**Qué resuelve:**
- El coach ve el banner "Plan vencido" pero tiene que navegar manualmente para asignar
- Botón "Asignar nuevo plan →" directo en el banner, lleva a `/coach/library/plans?assignTo=[clientId]`

---

## Orden de ejecución recomendado

| Prioridad | Plan | Impacto |
|-----------|------|---------|
| 1 | Plan 12 (Skeletons) | Producción — apariencia profesional inmediata |
| 2 | Plan 13 (Error boundaries) | Producción — robustez básica |
| 3 | Plan 11 (Rest Timer) | UX — feature más impactante de entrenamiento |
| 4 | Plan 7 (Inline last-session) | UX — mejora core del live training |
| 5 | Plan 8 (PR Detection) | UX — delight feature |
| 6 | Plan 10 (Post-session check-in) | Feature — datos para el coach |
| 7 | Plan 14 (Empty states) | UX — pulido visual |
| 8 | Plan 15 (Assign plan shortcut) | UX — flujo coach |
| 9 | Plan 9 (Inactivity alert) | UX — coach awareness |

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
