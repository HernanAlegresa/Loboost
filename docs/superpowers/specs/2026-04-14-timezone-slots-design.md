# LoBoost — Timezone, Slot Lifecycle & Compliance
**Fecha:** 2026-04-14  
**Estado:** Aprobado por el usuario  
**Enfoque elegido:** DB como fuente de verdad (Enfoque A)

---

## Contexto y motivación

El sistema actual tiene cuatro problemas críticos interrelacionados:

1. **Timezone ignorado:** `getTodayISO()` usa UTC del servidor (Vercel). Un cliente en Buenos Aires a las 23h ve su entreno de hoy marcado como `past_missed`.
2. **Slot desincronizado:** `complete-session.ts` actualiza `sessions.status` pero nunca toca `client_plan_days.slot_status`. El slot queda en `scheduled` para siempre aunque la sesión esté completada.
3. **assign-plan romperá la DB:** La migración pendiente agrega `scheduled_date NOT NULL` a `client_plan_days`, pero `assign-plan.ts` no lo inserta. Todos los nuevos planes fallarán.
4. **Compliance inexacta:** La métrica cuenta "sesiones de los últimos 7 días" ignorando los estados reales del plan (`cancelled`, `superseded`).

---

## Reglas de negocio confirmadas

- `cancelled` y `superseded` no cuentan como esperados, no generan deuda de incumplimiento.
- La sesión es la fuente de verdad del cumplimiento: si hay sesión `completed` vinculada al slot, el slot queda `completed`.
- Sin sesión `completed`, el slot no puede quedar `completed`.
- El coach edita el plan activo del cliente (no asigna uno nuevo). Los días pasados no se tocan.
- Si el coach elimina un día futuro del plan → ese slot se marca `superseded` (no borrado).

---

## Schema — cambios tras las migraciones

### Migraciones pendientes de aplicar (en orden)

1. `20260410120000_notification_preferences.sql` — tabla `notification_preferences`
2. `20260413120000_client_timezone_and_plan_slots.sql` — timezone + slots materializados

### Columnas nuevas

```
client_profiles
  timezone         text NOT NULL DEFAULT 'UTC'
                   -- IANA timezone del cliente (ej. America/Argentina/Buenos_Aires)

client_plan_days
  scheduled_date   date NOT NULL
                   -- fecha calendario del slot: start_date + (week-1)*7 + (dow-1)
  slot_status      text NOT NULL DEFAULT 'scheduled'
                   CHECK IN ('scheduled','completed','cancelled','superseded')
  updated_at       timestamptz NOT NULL DEFAULT now()
```

### Estado de slots tras el backfill

- Slot con sesión `status = 'completed'` → `slot_status = 'completed'`
- Todo lo demás → `slot_status = 'scheduled'` (incluye slots pasados sin sesión — son past_missed en display)
- `sessions.date` → sincronizado con `scheduled_date` del slot correspondiente

### Decisión de diseño: sin estado `past_missed` en DB

`past_missed` es un estado de *display*, no de DB. Se deriva comparando `scheduled_date` con "hoy en el TZ del cliente" cuando `slot_status = 'scheduled'`. Mantiene el schema limpio con solo 4 estados que el sistema controla.

---

## Máquina de estados de slot_status

```
scheduled ──complete-session──► completed   (terminal, inmutable)
scheduled ──coach cancela──────► cancelled  (terminal, inmutable)
scheduled ──coach elimina día──► superseded (terminal, inmutable)

completed  → nunca cambia
cancelled  → nunca cambia
superseded → nunca cambia
```

---

## Sección 1 — Timezone data layer

### `src/lib/timezone/data.ts`

Lista estática curada de ~55 países. Para países con múltiples zonas (México, EE.UU., Brasil, Canadá, Australia) se listan ciudades representativas.

```typescript
export type CountryZone = { city: string | null; iana: string }
export type CountryEntry = { country: string; code: string; zones: CountryZone[] }

export const TIMEZONE_DATA: CountryEntry[] = [
  // Single-zone countries (zona única, sin selector de ciudad)
  { country: 'Argentina',          code: 'AR', zones: [{ city: null, iana: 'America/Argentina/Buenos_Aires' }] },
  { country: 'Chile',              code: 'CL', zones: [{ city: null, iana: 'America/Santiago' }] },
  { country: 'Colombia',           code: 'CO', zones: [{ city: null, iana: 'America/Bogota' }] },
  { country: 'Perú',               code: 'PE', zones: [{ city: null, iana: 'America/Lima' }] },
  { country: 'Venezuela',          code: 'VE', zones: [{ city: null, iana: 'America/Caracas' }] },
  { country: 'Bolivia',            code: 'BO', zones: [{ city: null, iana: 'America/La_Paz' }] },
  { country: 'Ecuador',            code: 'EC', zones: [{ city: null, iana: 'America/Guayaquil' }] },
  { country: 'Paraguay',           code: 'PY', zones: [{ city: null, iana: 'America/Asuncion' }] },
  { country: 'Uruguay',            code: 'UY', zones: [{ city: null, iana: 'America/Montevideo' }] },
  { country: 'Guatemala',          code: 'GT', zones: [{ city: null, iana: 'America/Guatemala' }] },
  { country: 'Honduras',           code: 'HN', zones: [{ city: null, iana: 'America/Tegucigalpa' }] },
  { country: 'El Salvador',        code: 'SV', zones: [{ city: null, iana: 'America/El_Salvador' }] },
  { country: 'Nicaragua',          code: 'NI', zones: [{ city: null, iana: 'America/Managua' }] },
  { country: 'Costa Rica',         code: 'CR', zones: [{ city: null, iana: 'America/Costa_Rica' }] },
  { country: 'Panamá',             code: 'PA', zones: [{ city: null, iana: 'America/Panama' }] },
  { country: 'Cuba',               code: 'CU', zones: [{ city: null, iana: 'America/Havana' }] },
  { country: 'República Dominicana', code: 'DO', zones: [{ city: null, iana: 'America/Santo_Domingo' }] },
  { country: 'Puerto Rico',        code: 'PR', zones: [{ city: null, iana: 'America/Puerto_Rico' }] },
  { country: 'España',             code: 'ES', zones: [{ city: null, iana: 'Europe/Madrid' }] },
  { country: 'Portugal',           code: 'PT', zones: [{ city: null, iana: 'Europe/Lisbon' }] },
  { country: 'Italia',             code: 'IT', zones: [{ city: null, iana: 'Europe/Rome' }] },
  { country: 'Francia',            code: 'FR', zones: [{ city: null, iana: 'Europe/Paris' }] },
  { country: 'Alemania',           code: 'DE', zones: [{ city: null, iana: 'Europe/Berlin' }] },
  { country: 'Reino Unido',        code: 'GB', zones: [{ city: null, iana: 'Europe/London' }] },

  // Multi-zone countries
  { country: 'México', code: 'MX', zones: [
    { city: 'Ciudad de México', iana: 'America/Mexico_City' },
    { city: 'Monterrey',        iana: 'America/Monterrey' },
    { city: 'Hermosillo',       iana: 'America/Hermosillo' },
    { city: 'Chihuahua',        iana: 'America/Chihuahua' },
    { city: 'Tijuana',          iana: 'America/Tijuana' },
    { city: 'Cancún',           iana: 'America/Cancun' },
  ]},
  { country: 'Brasil', code: 'BR', zones: [
    { city: 'São Paulo',        iana: 'America/Sao_Paulo' },
    { city: 'Manaus',           iana: 'America/Manaus' },
    { city: 'Fortaleza',        iana: 'America/Fortaleza' },
    { city: 'Porto Velho',      iana: 'America/Porto_Velho' },
    { city: 'Noronha',          iana: 'America/Noronha' },
  ]},
  { country: 'Estados Unidos', code: 'US', zones: [
    { city: 'Nueva York (Este)', iana: 'America/New_York' },
    { city: 'Chicago (Centro)',  iana: 'America/Chicago' },
    { city: 'Denver (Montaña)', iana: 'America/Denver' },
    { city: 'Los Ángeles (Pacífico)', iana: 'America/Los_Angeles' },
    { city: 'Phoenix (Arizona)', iana: 'America/Phoenix' },
    { city: 'Anchorage',        iana: 'America/Anchorage' },
    { city: 'Honolulu (Hawái)', iana: 'Pacific/Honolulu' },
  ]},
  { country: 'Canadá', code: 'CA', zones: [
    { city: 'Toronto',          iana: 'America/Toronto' },
    { city: 'Vancouver',        iana: 'America/Vancouver' },
    { city: 'Winnipeg',         iana: 'America/Winnipeg' },
    { city: 'Halifax',          iana: 'America/Halifax' },
  ]},
  { country: 'Australia', code: 'AU', zones: [
    { city: 'Sídney',           iana: 'Australia/Sydney' },
    { city: 'Melbourne',        iana: 'Australia/Melbourne' },
    { city: 'Brisbane',         iana: 'Australia/Brisbane' },
    { city: 'Perth',            iana: 'Australia/Perth' },
    { city: 'Adelaide',         iana: 'Australia/Adelaide' },
  ]},
]
```

### `src/lib/timezone/utils.ts`

```typescript
import { TIMEZONE_DATA } from './data'

/** Retorna YYYY-MM-DD en el timezone dado. Usa Intl nativo (Node ≥ 18). */
export function getTodayForTimezone(tz: string): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: tz })
}

/** Versión safe con fallback a UTC si la timezone es inválida. */
export function safeGetToday(tz: string | null | undefined): string {
  try {
    return getTodayForTimezone(tz ?? 'UTC')
  } catch {
    return getTodayForTimezone('UTC')
  }
}

/** Retorna todas las entradas de TIMEZONE_DATA ordenadas: primero ES/LATAM, luego resto. */
export function getSortedCountries() {
  return TIMEZONE_DATA
}

/** Dada una country entry, retorna la IANA si es single-zone, o null si requiere selección de ciudad. */
export function isSingleZone(zones: { city: string | null; iana: string }[]): boolean {
  return zones.length === 1
}
```

---

## Sección 2 — Creación de cliente con timezone

### Schema (`createClientSchema`)

```typescript
timezone: z.string().min(1, 'Seleccioná la ubicación del cliente'),
```

### Formulario — nuevo campo "Ubicación"

- `CountrySelect` (controlled): lista de países, ordenados España/LATAM primero
- Si `zones.length > 1` → aparece `CitySelect` con las ciudades de ese país
- `<input type="hidden" name="timezone" value={resolvedIana} />` — único campo enviado al server
- Los campos `_country` y `_city` son solo de UI, no llegan al action

### Action (`create-client.ts`)

```typescript
const { error: clientProfileError } = await supabaseAdmin
  .from('client_profiles')
  .insert({
    id:               newUser.user.id,
    // ... campos existentes ...
    timezone:         result.data.timezone,  // ← nuevo
  })
```

---

## Sección 3 — assign-plan.ts (fix pre-migración crítico)

Cada insert de `client_plan_days` debe incluir `scheduled_date`:

```typescript
import { computeDayDate } from '@/features/clients/utils/training-utils'

const scheduledDate = computeDayDate(result.data.startDate, week, day.day_of_week)

await supabase.from('client_plan_days').insert({
  client_plan_id: clientPlan.id,
  week_number:    week,
  day_of_week:    day.day_of_week,
  order:          day.order,
  scheduled_date: scheduledDate,  // ← nuevo
})
```

`slot_status` usa el default `'scheduled'` del DB — no hace falta explicitarlo.

---

## Sección 4 — complete-session.ts (slot sync)

```typescript
// 1. Completar sesión y obtener client_plan_day_id
const { data: updated, error } = await supabase
  .from('sessions')
  .update({ status: 'completed', completed_at: new Date().toISOString() })
  .eq('id', sessionId)
  .eq('client_id', user.id)
  .select('client_plan_day_id')
  .single()

if (error || !updated) return { error: 'Error al completar la sesión' }

// 2. Sincronizar slot (la sesión manda)
await supabase
  .from('client_plan_days')
  .update({ slot_status: 'completed', updated_at: new Date().toISOString() })
  .eq('id', updated.client_plan_day_id)

return { success: true }
```

Si el paso 2 falla: la sesión ya está completada (estado correcto). El slot queda desincronizado transitoriamente pero es recuperable porque la sesión es la fuente de verdad. Aceptable en V1.

---

## Sección 5 — training-utils.ts actualizado

### `computeDayStatus` — nueva firma

```typescript
export function computeDayStatus(
  scheduledDate: string,
  todayISO: string,
  slotStatus: 'scheduled' | 'completed' | 'cancelled' | 'superseded',
  sessionStatus: 'in_progress' | 'completed' | null
): DayStatus {
  if (slotStatus === 'completed' || sessionStatus === 'completed') return 'completed'
  if (sessionStatus === 'in_progress') return 'in_progress'
  if (slotStatus === 'cancelled' || slotStatus === 'superseded') return 'rest'
  // slotStatus === 'scheduled'
  if (scheduledDate === todayISO) return 'today'
  if (scheduledDate > todayISO) return 'upcoming'
  return 'past_missed'
}
```

`cancelled` y `superseded` se renderizan como `rest` — no exponer estados internos al cliente.

---

## Sección 6 — Queries actualizadas

### Cambios comunes a todas las queries

1. SELECT agrega `scheduled_date, slot_status` a `client_plan_days`
2. Fetch de `timezone` del cliente (join con `client_profiles` o query separada, lo que sea más limpio por query)
3. `todayISO = safeGetToday(clientTimezone)` reemplaza a `getTodayISO()`
4. `computeDayStatus(day.scheduled_date, todayISO, day.slot_status, session?.status)` reemplaza a `computeDayStatus(computedDate, todayISO, session?.status)`

### Queries afectadas

| Archivo | Cambio principal |
|---|---|
| `(client)/client/dashboard/queries.ts` | + timezone, slot_status, scheduled_date |
| `(client)/client/plan/queries.ts` | + timezone, slot_status, scheduled_date |
| `(client)/client/history/queries.ts` | + scheduled_date para ordenar historial |
| `(client)/client/history/week/[weekNumber]/queries.ts` | + slot_status para filtrar |
| `(client)/client/plan/[weekNumber]/[clientPlanDayId]/queries.ts` | + slot_status, scheduled_date |
| `(coach)/coach/clients/[id]/queries.ts` | + timezone, slot_status, scheduled_date |

### Progress del plan — totalTrainingDays correcto

`totalTrainingDays` en el progress bar del plan debe excluir `superseded` y `cancelled`:

```typescript
const totalTrainingDays = planDays.filter(
  d => d.slot_status !== 'superseded' && d.slot_status !== 'cancelled'
).length
const completedSessions = planDays.filter(d => d.slot_status === 'completed').length
const progressPct = totalTrainingDays > 0
  ? Math.max(4, Math.round((completedSessions / totalTrainingDays) * 100))
  : 0
```

Afecta: `(client)/client/plan/queries.ts` y `(client)/client/dashboard/queries.ts`.

### Compliance — nueva lógica

```typescript
// En getClientProfileData() — reemplaza el conteo de sesiones por semana
const { data: currentWeekSlots } = await supabase
  .from('client_plan_days')
  .select('slot_status')
  .eq('client_plan_id', plan.id)
  .eq('week_number', activePlan.currentWeek)

const expected = (currentWeekSlots ?? []).filter(
  s => s.slot_status === 'scheduled' || s.slot_status === 'completed'
).length

const completed = (currentWeekSlots ?? []).filter(
  s => s.slot_status === 'completed'
).length

const weeklyCompliance = calculateWeeklyCompliance({ expectedDays: expected, completedDays: completed })
```

---

## Sección 7 — supersede-plan-day action

**Nuevo archivo:** `src/features/plans/actions/supersede-plan-day.ts`

```typescript
'use server'
// Marca un slot futuro como superseded cuando el coach elimina ese día del plan.
// Guards:
// - El slot debe pertenecer al coach autenticado (RLS garantiza)
// - scheduled_date >= today en el TZ del cliente
// - slot_status === 'scheduled' (no tocar completed/cancelled/superseded)
export async function supersedePlanDayAction(clientPlanDayId: string)
```

---

## Orden de implementación

### Fase 1 — Foundation (desbloquea todo lo demás)
1. Fix `assign-plan.ts` → incluir `scheduled_date` en inserts — **commit antes de migrar**
2. Aplicar `20260410120000_notification_preferences.sql` via Supabase MCP
3. Aplicar `20260413120000_client_timezone_and_plan_slots.sql` via Supabase MCP
4. Regenerar `src/types/database.ts` (`npx supabase gen types typescript --project-id zsczvjsqkgmvouzcjcvv`)

### Fase 2 — Core logic
5. Crear `src/lib/timezone/data.ts` + `src/lib/timezone/utils.ts`
6. Fix `complete-session.ts` → actualizar `slot_status` al completar
7. Actualizar `computeDayStatus()` en `training-utils.ts` → nueva firma con `slot_status`

### Fase 3 — Client creation
8. Actualizar `createClientSchema` → agregar `timezone`
9. Actualizar `create-client.ts` → insertar timezone
10. Actualizar `create-client-form.tsx` → country + city selector

### Fase 4 — Query updates
11. Actualizar `(client)/client/dashboard/queries.ts`
12. Actualizar `(client)/client/plan/queries.ts`
13. Actualizar `(client)/client/history/queries.ts` + `week/[weekNumber]/queries.ts`
14. Actualizar `(client)/client/plan/[weekNumber]/[clientPlanDayId]/queries.ts`
15. Actualizar `(coach)/coach/clients/[id]/queries.ts`
16. Fix compliance inputs en `getClientProfileData()`

### Fase 5 — Plan editing
17. Crear `src/features/plans/actions/supersede-plan-day.ts`

### Fase 6 — Verificación
18. `npx tsc --noEmit` — cero errores
19. `npm test` — todos los tests pasan
20. Smoke test manual: crear cliente → asignar plan → completar sesión → verificar slot_status en DB

---

## Archivos modificados (resumen)

| Archivo | Tipo de cambio |
|---|---|
| `supabase/migrations/20260410120000_notification_preferences.sql` | Aplicar (sin editar) |
| `supabase/migrations/20260413120000_client_timezone_and_plan_slots.sql` | Aplicar (sin editar) |
| `src/types/database.ts` | Regenerar |
| `src/lib/timezone/data.ts` | Nuevo |
| `src/lib/timezone/utils.ts` | Nuevo |
| `src/features/clients/schemas.ts` | Agregar `timezone` |
| `src/features/clients/actions/create-client.ts` | Insertar `timezone` |
| `src/app/(coach)/coach/clients/new/create-client-form.tsx` | Country+city selector |
| `src/features/plans/actions/assign-plan.ts` | Insertar `scheduled_date` |
| `src/features/training/actions/complete-session.ts` | Actualizar `slot_status` |
| `src/features/clients/utils/training-utils.ts` | `computeDayStatus` nueva firma |
| `src/app/(client)/client/dashboard/queries.ts` | TZ + slot_status |
| `src/app/(client)/client/plan/queries.ts` | TZ + slot_status |
| `src/app/(client)/client/history/queries.ts` | scheduled_date |
| `src/app/(client)/client/history/week/[weekNumber]/queries.ts` | slot_status |
| `src/app/(client)/client/plan/[weekNumber]/[clientPlanDayId]/queries.ts` | slot_status |
| `src/app/(coach)/coach/clients/[id]/queries.ts` | TZ + slot_status + compliance |
| `src/features/plans/actions/supersede-plan-day.ts` | Nuevo |

---

## Riesgos residuales

| Riesgo | Mitigación |
|---|---|
| complete-session paso 2 falla → desincronización transitoria | Sesión es fuente de verdad; backfill correctivo siempre posible |
| Clientes existentes tienen `timezone = 'UTC'` | Coach puede actualizar en el perfil del cliente (fuera de scope V1 pero fácil de agregar) |
| País no listado en TIMEZONE_DATA | Fallback: campo "Otro" con entrada manual de IANA |
| Supabase type gen tarda o falla en CI | Tipos regenerados manualmente tras migración exitosa |

---

## Fuera de scope (V1)

- UI para que el cliente cambie su propio timezone desde settings
- UI para que el coach agregue un nuevo día de entrenamiento a un plan activo (solo supersede, no add)
- Notificaciones push basadas en timezone
- Soporte para horario de verano edge cases (Intl lo maneja automáticamente ✓)
