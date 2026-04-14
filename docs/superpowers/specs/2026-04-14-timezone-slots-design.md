# LoBoost — Timezone, Slot Lifecycle & Compliance
**Fecha:** 2026-04-14  
**Estado:** Aprobado — v2 con 5 ajustes post-revisión  
**Enfoque elegido:** DB como fuente de verdad (Enfoque A)

---

## Contexto y motivación

El sistema actual tiene cuatro problemas críticos interrelacionados:

1. **Timezone ignorado:** `getTodayISO()` usa UTC del servidor (Vercel). Un cliente en Buenos Aires a las 23h ve su entreno de hoy marcado como `past_missed`.
2. **Slot desincronizado:** `complete-session.ts` actualiza `sessions.status` pero nunca toca `client_plan_days.slot_status`. El slot queda en `scheduled` para siempre aunque la sesión esté completada.
3. **assign-plan romperá la DB:** La migración pendiente agrega `scheduled_date NOT NULL` a `client_plan_days`, pero `assign-plan.ts` no lo inserta. Todos los nuevos planes fallarán tras la migración.
4. **Compliance inexacta:** La métrica cuenta "sesiones de los últimos 7 días" ignorando los estados reales del plan (`cancelled`, `superseded`).

---

## Reglas de negocio confirmadas

- `cancelled` y `superseded` no cuentan como esperados, no generan deuda de incumplimiento.
- La sesión es la fuente de verdad del cumplimiento: si hay sesión `completed` vinculada al slot, el slot queda `completed`.
- Sin sesión `completed`, el slot no puede quedar `completed`.
- El coach edita el plan activo del cliente (no asigna uno nuevo). Los días pasados no se tocan nunca.
- Si el coach elimina un día futuro del plan → ese slot se marca `superseded` (no borrado, preserva historial).

---

## Schema — cambios tras las migraciones

### Migraciones pendientes de aplicar (en orden)

1. `20260410120000_notification_preferences.sql` — tabla `notification_preferences`
2. `20260413120000_client_timezone_and_plan_slots.sql` — timezone + slots materializados *(ajustada para incluir `country_code`)*

### Columnas nuevas

```
client_profiles
  country_code     text                           -- ISO 3166-1 alpha-2 (AR, MX, ES…)
  timezone         text NOT NULL DEFAULT 'UTC'    -- IANA timezone (America/Argentina/Buenos_Aires)

client_plan_days
  scheduled_date   date NOT NULL                  -- start_date + (week-1)*7 + (dow-1)
  slot_status      text NOT NULL DEFAULT 'scheduled'
                   CHECK IN ('scheduled','completed','cancelled','superseded')
  updated_at       timestamptz NOT NULL DEFAULT now()
```

**Decisión sobre country_code:** se guarda porque el spec original pide "ubicación/país" explícitamente y tiene valor analítico (el coach sabe de dónde es cada cliente). `timezone_city` NO se guarda — es derivable de `country_code + timezone` IANA y almacenarlo sería redundancia que puede desincronizarse.

### Estado de slots tras el backfill

- Slot con sesión `status = 'completed'` → `slot_status = 'completed'`
- Todo lo demás → `slot_status = 'scheduled'` (incluye slots pasados sin sesión — son `past_missed` en display)
- `sessions.date` → sincronizado con `scheduled_date` del slot correspondiente

### Decisión de diseño: sin estado `past_missed` en DB

`past_missed` es un estado de *display*, no de DB. Se deriva comparando `scheduled_date` con "hoy en el TZ del cliente" cuando `slot_status = 'scheduled'`. Mantiene el schema limpio con solo 4 estados que el sistema controla.

---

## Máquina de estados de slot_status

```
scheduled ──complete-session (RPC)──► completed   (terminal, inmutable)
scheduled ──coach cancela──────────► cancelled    (terminal, inmutable)
scheduled ──coach elimina día──────► superseded   (terminal, inmutable)

completed  → nunca cambia
cancelled  → nunca cambia
superseded → nunca cambia
```

---

## Sección 1 — Timezone data layer

### `src/lib/timezone/data.ts`

Lista estática curada de ~55 países relevantes para el producto. Para países con múltiples zonas (México, EE.UU., Brasil, Canadá, Australia) se listan ciudades representativas.

```typescript
export type CountryZone = { city: string | null; iana: string }
export type CountryEntry = { country: string; code: string; zones: CountryZone[] }

export const TIMEZONE_DATA: CountryEntry[] = [
  // Single-zone (zona única — sin selector de ciudad)
  { country: 'Argentina',            code: 'AR', zones: [{ city: null, iana: 'America/Argentina/Buenos_Aires' }] },
  { country: 'Chile',                code: 'CL', zones: [{ city: null, iana: 'America/Santiago' }] },
  { country: 'Colombia',             code: 'CO', zones: [{ city: null, iana: 'America/Bogota' }] },
  { country: 'Perú',                 code: 'PE', zones: [{ city: null, iana: 'America/Lima' }] },
  { country: 'Venezuela',            code: 'VE', zones: [{ city: null, iana: 'America/Caracas' }] },
  { country: 'Bolivia',              code: 'BO', zones: [{ city: null, iana: 'America/La_Paz' }] },
  { country: 'Ecuador',              code: 'EC', zones: [{ city: null, iana: 'America/Guayaquil' }] },
  { country: 'Paraguay',             code: 'PY', zones: [{ city: null, iana: 'America/Asuncion' }] },
  { country: 'Uruguay',              code: 'UY', zones: [{ city: null, iana: 'America/Montevideo' }] },
  { country: 'Guatemala',            code: 'GT', zones: [{ city: null, iana: 'America/Guatemala' }] },
  { country: 'Honduras',             code: 'HN', zones: [{ city: null, iana: 'America/Tegucigalpa' }] },
  { country: 'El Salvador',          code: 'SV', zones: [{ city: null, iana: 'America/El_Salvador' }] },
  { country: 'Nicaragua',            code: 'NI', zones: [{ city: null, iana: 'America/Managua' }] },
  { country: 'Costa Rica',           code: 'CR', zones: [{ city: null, iana: 'America/Costa_Rica' }] },
  { country: 'Panamá',               code: 'PA', zones: [{ city: null, iana: 'America/Panama' }] },
  { country: 'Cuba',                 code: 'CU', zones: [{ city: null, iana: 'America/Havana' }] },
  { country: 'República Dominicana', code: 'DO', zones: [{ city: null, iana: 'America/Santo_Domingo' }] },
  { country: 'Puerto Rico',          code: 'PR', zones: [{ city: null, iana: 'America/Puerto_Rico' }] },
  { country: 'España',               code: 'ES', zones: [{ city: null, iana: 'Europe/Madrid' }] },
  { country: 'Portugal',             code: 'PT', zones: [{ city: null, iana: 'Europe/Lisbon' }] },
  { country: 'Italia',               code: 'IT', zones: [{ city: null, iana: 'Europe/Rome' }] },
  { country: 'Francia',              code: 'FR', zones: [{ city: null, iana: 'Europe/Paris' }] },
  { country: 'Alemania',             code: 'DE', zones: [{ city: null, iana: 'Europe/Berlin' }] },
  { country: 'Reino Unido',          code: 'GB', zones: [{ city: null, iana: 'Europe/London' }] },

  // Multi-zone (requiere selector de ciudad)
  { country: 'México', code: 'MX', zones: [
    { city: 'Ciudad de México', iana: 'America/Mexico_City' },
    { city: 'Monterrey',        iana: 'America/Monterrey' },
    { city: 'Hermosillo',       iana: 'America/Hermosillo' },
    { city: 'Chihuahua',        iana: 'America/Chihuahua' },
    { city: 'Tijuana',          iana: 'America/Tijuana' },
    { city: 'Cancún',           iana: 'America/Cancun' },
  ]},
  { country: 'Brasil', code: 'BR', zones: [
    { city: 'São Paulo',   iana: 'America/Sao_Paulo' },
    { city: 'Manaus',      iana: 'America/Manaus' },
    { city: 'Fortaleza',   iana: 'America/Fortaleza' },
    { city: 'Porto Velho', iana: 'America/Porto_Velho' },
    { city: 'Noronha',     iana: 'America/Noronha' },
  ]},
  { country: 'Estados Unidos', code: 'US', zones: [
    { city: 'Nueva York (Este)',       iana: 'America/New_York' },
    { city: 'Chicago (Centro)',        iana: 'America/Chicago' },
    { city: 'Denver (Montaña)',        iana: 'America/Denver' },
    { city: 'Los Ángeles (Pacífico)',  iana: 'America/Los_Angeles' },
    { city: 'Phoenix (Arizona)',       iana: 'America/Phoenix' },
    { city: 'Anchorage',              iana: 'America/Anchorage' },
    { city: 'Honolulu (Hawái)',        iana: 'Pacific/Honolulu' },
  ]},
  { country: 'Canadá', code: 'CA', zones: [
    { city: 'Toronto',   iana: 'America/Toronto' },
    { city: 'Vancouver', iana: 'America/Vancouver' },
    { city: 'Winnipeg',  iana: 'America/Winnipeg' },
    { city: 'Halifax',   iana: 'America/Halifax' },
  ]},
  { country: 'Australia', code: 'AU', zones: [
    { city: 'Sídney',    iana: 'Australia/Sydney' },
    { city: 'Melbourne', iana: 'Australia/Melbourne' },
    { city: 'Brisbane',  iana: 'Australia/Brisbane' },
    { city: 'Perth',     iana: 'Australia/Perth' },
    { city: 'Adelaide',  iana: 'Australia/Adelaide' },
  ]},
]
```

### `src/lib/timezone/utils.ts`

```typescript
/**
 * Retorna YYYY-MM-DD en el timezone dado.
 * Usa Intl.DateTimeFormat.formatToParts() — no depende de locale ni formato externo.
 * Funciona en Node ≥ 18 (Vercel runtime). DST manejado automáticamente por Intl.
 */
export function getTodayForTimezone(tz: string): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const y = parts.find(p => p.type === 'year')!.value
  const m = parts.find(p => p.type === 'month')!.value
  const d = parts.find(p => p.type === 'day')!.value
  return `${y}-${m}-${d}`
}

/**
 * Versión safe con fallback a UTC si la timezone es inválida o nula.
 * Usar en todos los call sites de server components.
 */
export function safeGetToday(tz: string | null | undefined): string {
  try {
    return getTodayForTimezone(tz ?? 'UTC')
  } catch {
    return getTodayForTimezone('UTC')
  }
}
```

**Por qué `formatToParts` y no `toLocaleDateString('en-CA')`:** `en-CA` es un truco que funciona en V8 pero depende de que el locale mantenga el formato ISO. `formatToParts` extrae partes nombradas sin asumir ningún formato de locale — es la API correcta para este propósito.

---

## Sección 2 — getCurrentWeek con timezone del cliente

### Problema identificado

`getCurrentWeek(startDate, totalWeeks)` llama internamente a `getTodayISO()` (UTC del servidor). Al cierre de semana, un cliente en UTC-5 puede recibir la semana incorrecta y la compliance semanal se calcula sobre los slots equivocados.

### Fix — nueva firma (breaking change controlado)

```typescript
/**
 * Retorna el número de semana actual (1-indexed) para un plan dado.
 * todayISO debe venir de safeGetToday(client.timezone) — nunca de getTodayISO().
 */
export function getCurrentWeek(
  startDate: string,
  totalWeeks: number,
  todayISO: string       // ← parámetro explícito, eliminando dependencia interna de new Date()
): number {
  const [sy, sm, sd] = startDate.split('-').map(Number)
  const [ty, tm, td] = todayISO.split('-').map(Number)
  const start = new Date(sy, sm - 1, sd)
  const today = new Date(ty, tm - 1, td)
  if (today <= start) return 1
  const daysSinceStart = Math.floor((today.getTime() - start.getTime()) / 86400000)
  return Math.min(Math.floor(daysSinceStart / 7) + 1, totalWeeks)
}
```

Todos los call sites actualizan a: `getCurrentWeek(plan.start_date, plan.weeks, safeGetToday(clientTimezone))`.

---

## Sección 3 — Creación de cliente con timezone y country

### Schema (`createClientSchema`)

```typescript
countryCode: z.string().length(2, 'País requerido'),
timezone:    z.string().min(1, 'Seleccioná la ubicación del cliente'),
```

### Formulario — nuevo campo "Ubicación"

- `CountrySelect` (controlled): lista de países, España/LATAM primero, resto alfabético
- Si `zones.length > 1` → aparece `CitySelect` con las ciudades de ese país
- `<input type="hidden" name="countryCode" value={selectedCountry.code} />`
- `<input type="hidden" name="timezone" value={resolvedIana} />`
- Los campos de UI de selección son `_country` / `_city` (prefijo `_` = solo UI, no llegan al action)

### Action (`create-client.ts`)

```typescript
await supabaseAdmin.from('client_profiles').insert({
  id:           newUser.user.id,
  // ... campos existentes ...
  country_code: result.data.countryCode,   // ← nuevo
  timezone:     result.data.timezone,       // ← nuevo
})
```

---

## Sección 4 — assign-plan.ts (fix pre-migración crítico)

**Este fix va en el primer commit, ANTES de aplicar las migraciones.**  
Después de la migración, `scheduled_date` es `NOT NULL`. Sin este fix, todos los nuevos planes fallan.

```typescript
import { computeDayDate } from '@/features/clients/utils/training-utils'

// En el loop de inserción de client_plan_days:
const scheduledDate = computeDayDate(result.data.startDate, week, day.day_of_week)

await supabase.from('client_plan_days').insert({
  client_plan_id: clientPlan.id,
  week_number:    week,
  day_of_week:    day.day_of_week,
  order:          day.order,
  scheduled_date: scheduledDate,   // ← nuevo, obligatorio post-migración
  // slot_status: default 'scheduled' del DB
})
```

---

## Sección 5 — complete-session.ts — atomicidad via RPC

### Por qué RPC

Dos `supabase.update()` separados no son atómicos. Si el segundo falla, `sessions.status = 'completed'` pero `slot_status = 'scheduled'` — inconsistencia visible para el cliente. La solución correcta es una función PostgreSQL que ejecuta ambos updates en una sola transacción.

### Migración — función SQL

```sql
-- Nueva migración: YYYYMMDD_complete_session_fn.sql
create or replace function public.complete_session(
  p_session_id uuid,
  p_client_id  uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day_id uuid;
begin
  -- 1. Completar sesión (verifica ownership implícitamente)
  update sessions
  set    status       = 'completed',
         completed_at = now()
  where  id        = p_session_id
    and  client_id = p_client_id
    and  status    = 'in_progress'  -- solo transicionar desde in_progress
  returning client_plan_day_id into v_day_id;

  if v_day_id is null then
    raise exception 'session_not_found_or_unauthorized';
  end if;

  -- 2. Sincronizar slot (misma transacción)
  update client_plan_days
  set    slot_status = 'completed',
         updated_at  = now()
  where  id = v_day_id;
end;
$$;

-- Permisos: solo usuarios autenticados pueden llamar esta función
-- (RLS de sessions ya garantiza que solo el dueño puede completar la suya)
grant execute on function public.complete_session(uuid, uuid) to authenticated;
```

### `complete-session.ts` actualizado

```typescript
export async function completeSessionAction(sessionId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'No autenticado' }

  const { error } = await supabase.rpc('complete_session', {
    p_session_id: sessionId,
    p_client_id:  user.id,
  })

  if (error) {
    if (error.message.includes('session_not_found_or_unauthorized')) {
      return { error: 'Sesión no encontrada o no autorizada' }
    }
    return { error: 'Error al completar la sesión' }
  }

  return { success: true }
}
```

---

## Sección 6 — training-utils.ts actualizado

### `computeDayStatus` — nueva firma

```typescript
export function computeDayStatus(
  scheduledDate:  string,
  todayISO:       string,
  slotStatus:     'scheduled' | 'completed' | 'cancelled' | 'superseded',
  sessionStatus:  'in_progress' | 'completed' | null
): DayStatus {
  // La sesión es fuente de verdad para completed
  if (slotStatus === 'completed' || sessionStatus === 'completed') return 'completed'
  // Sesión activa tiene prioridad sobre todo lo demás
  if (sessionStatus === 'in_progress') return 'in_progress'
  // Estados terminales que no generan deuda
  if (slotStatus === 'cancelled' || slotStatus === 'superseded') return 'rest'
  // Slot scheduled — derivar estado de display por fecha
  if (scheduledDate === todayISO) return 'today'
  if (scheduledDate > todayISO)   return 'upcoming'
  return 'past_missed'
}
```

`cancelled` y `superseded` se muestran como `rest` — estados internos no expuestos al cliente.

---

## Sección 7 — supersede-plan-day action

**Archivo:** `src/features/plans/actions/supersede-plan-day.ts`

### Regla exacta de supersede (sin ambigüedad)

Un slot puede marcarse `superseded` si y solo si se cumplen **los 3 guards**:

```
1. slot_status = 'scheduled'
   → No tocar estados terminales (completed / cancelled / superseded)

2. scheduled_date >= today_client (en TZ del cliente)
   → No tocar el pasado nunca. Today incluido.

3. No existe session con status = 'in_progress' vinculada a este slot
   → Bloquear si el cliente está entrenando en este momento
```

Si `scheduled_date = today_client` y no hay sesión iniciada → **permitir supersede**. El coach puede quitar el día de hoy si el cliente aún no empezó.

### Implementación

```typescript
'use server'

export async function supersedePlanDayAction(clientPlanDayId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'No autenticado' }

  // Obtener slot + plan + timezone del cliente (para "hoy" correcto)
  const { data: slot } = await supabase
    .from('client_plan_days')
    .select(`
      id, scheduled_date, slot_status,
      client_plans!inner (
        coach_id,
        client_profiles!inner ( timezone )
      )
    `)
    .eq('id', clientPlanDayId)
    .single()

  if (!slot) return { error: 'Slot no encontrado' }
  if (slot.client_plans.coach_id !== user.id) return { error: 'No autorizado' }

  // Guard 1: solo scheduled
  if (slot.slot_status !== 'scheduled') return { error: 'Solo se pueden cancelar slots pendientes' }

  // Guard 2: no pasado
  const clientTz = slot.client_plans.client_profiles?.timezone ?? 'UTC'
  const todayISO = safeGetToday(clientTz)
  if (slot.scheduled_date < todayISO) return { error: 'No se pueden cancelar días pasados' }

  // Guard 3: no hay sesión in_progress
  const { data: activeSession } = await supabase
    .from('sessions')
    .select('id')
    .eq('client_plan_day_id', clientPlanDayId)
    .eq('status', 'in_progress')
    .maybeSingle()

  if (activeSession) return { error: 'El cliente ya inició este entrenamiento' }

  // Marcar superseded
  const { error } = await supabase
    .from('client_plan_days')
    .update({ slot_status: 'superseded', updated_at: new Date().toISOString() })
    .eq('id', clientPlanDayId)

  if (error) return { error: 'Error al actualizar el slot' }
  return { success: true }
}
```

---

## Sección 8 — Queries actualizadas

### Cambios comunes a todas las queries

1. `client_plan_days` SELECT agrega `scheduled_date, slot_status`
2. `client_profiles` SELECT agrega `timezone, country_code`
3. `todayISO = safeGetToday(clientTimezone)` reemplaza a `getTodayISO()`
4. `getCurrentWeek(startDate, weeks, todayISO)` recibe `todayISO` explícito
5. `computeDayStatus(day.scheduled_date, todayISO, day.slot_status, session?.status)` nueva firma

### Progress del plan — totalTrainingDays correcto

`totalTrainingDays` excluye `superseded` y `cancelled` (no son trabajo real del cliente):

```typescript
const totalTrainingDays = planDays.filter(
  d => d.slot_status !== 'superseded' && d.slot_status !== 'cancelled'
).length
const completedCount = planDays.filter(d => d.slot_status === 'completed').length
const progressPct = totalTrainingDays > 0
  ? Math.max(4, Math.round((completedCount / totalTrainingDays) * 100))
  : 0
```

Afecta: `(client)/client/plan/queries.ts` y `(client)/client/dashboard/queries.ts`.

### Compliance semanal — nueva lógica basada en slot_status

```typescript
// currentWeek calculado con timezone del cliente
const currentWeek = getCurrentWeek(plan.start_date, plan.weeks, todayISO)

const { data: weekSlots } = await supabase
  .from('client_plan_days')
  .select('slot_status')
  .eq('client_plan_id', plan.id)
  .eq('week_number', currentWeek)

const expected = (weekSlots ?? []).filter(
  s => s.slot_status === 'scheduled' || s.slot_status === 'completed'
).length

const completed = (weekSlots ?? []).filter(
  s => s.slot_status === 'completed'
).length

// calculateWeeklyCompliance no cambia — solo los inputs son más correctos
const weeklyCompliance = calculateWeeklyCompliance({ expectedDays: expected, completedDays: completed })
```

### Queries afectadas

| Archivo | Cambios |
|---|---|
| `(client)/client/dashboard/queries.ts` | timezone, slot_status, scheduled_date, getCurrentWeek con todayISO |
| `(client)/client/plan/queries.ts` | timezone, slot_status, scheduled_date, totalTrainingDays correcto |
| `(client)/client/history/queries.ts` | scheduled_date para ordenar |
| `(client)/client/history/week/[weekNumber]/queries.ts` | slot_status para filtrar |
| `(client)/client/plan/[weekNumber]/[clientPlanDayId]/queries.ts` | slot_status, scheduled_date |
| `(coach)/coach/clients/[id]/queries.ts` | timezone, slot_status, compliance con slot_status, getCurrentWeek |

---

## Orden de implementación

### Fase 1 — Foundation (desbloquea todo, sin romper nada)
1. Fix `assign-plan.ts` → insertar `scheduled_date` → **commit**
2. Ajustar migración `20260413120000` para agregar `country_code` → listo para aplicar
3. Aplicar `20260410120000_notification_preferences.sql` via Supabase MCP
4. Aplicar `20260413120000_client_timezone_and_plan_slots.sql` via Supabase MCP
5. Regenerar `src/types/database.ts`

### Fase 2 — Core logic
6. Crear `src/lib/timezone/data.ts` + `src/lib/timezone/utils.ts`
7. Migración nueva: función `complete_session()` en PostgreSQL
8. Actualizar `complete-session.ts` → usar `supabase.rpc('complete_session', ...)`
9. Actualizar `training-utils.ts` → nueva firma `getCurrentWeek` + nueva firma `computeDayStatus`

### Fase 3 — Client creation
10. Actualizar `createClientSchema` → agregar `countryCode`, `timezone`
11. Actualizar `create-client.ts` → insertar `country_code`, `timezone`
12. Actualizar `create-client-form.tsx` → country + city selector

### Fase 4 — Query updates
13. `(client)/client/dashboard/queries.ts`
14. `(client)/client/plan/queries.ts`
15. `(client)/client/history/queries.ts` + `week/[weekNumber]/queries.ts`
16. `(client)/client/plan/[weekNumber]/[clientPlanDayId]/queries.ts`
17. `(coach)/coach/clients/[id]/queries.ts` + compliance

### Fase 5 — Plan editing
18. Crear `src/features/plans/actions/supersede-plan-day.ts`

### Fase 6 — Verificación final
19. `npx tsc --noEmit` → cero errores
20. `npm test` → todos los tests pasan
21. Verificación en DB: completar sesión → `SELECT slot_status FROM client_plan_days WHERE id = ?`

---

## Archivos modificados (resumen completo)

| Archivo | Cambio |
|---|---|
| `supabase/migrations/20260413120000_client_timezone_and_plan_slots.sql` | Ajustar para incluir `country_code` |
| Supabase MCP apply × 2 | Aplicar `notification_preferences` + `client_timezone_and_plan_slots` |
| Nueva migración `complete_session_fn.sql` | Función PostgreSQL atómica |
| `src/types/database.ts` | Regenerar post-migraciones |
| `src/lib/timezone/data.ts` | Nuevo — lista de países y zonas |
| `src/lib/timezone/utils.ts` | Nuevo — `getTodayForTimezone`, `safeGetToday` |
| `src/features/clients/schemas.ts` | Agregar `countryCode`, `timezone` |
| `src/features/clients/actions/create-client.ts` | Insertar `country_code`, `timezone` |
| `src/app/(coach)/coach/clients/new/create-client-form.tsx` | Country+city selector |
| `src/features/plans/actions/assign-plan.ts` | Insertar `scheduled_date` |
| `src/features/training/actions/complete-session.ts` | Usar RPC `complete_session` |
| `src/features/clients/utils/training-utils.ts` | `getCurrentWeek` + `computeDayStatus` nuevas firmas |
| `src/app/(client)/client/dashboard/queries.ts` | TZ + slot_status + currentWeek correcto |
| `src/app/(client)/client/plan/queries.ts` | TZ + slot_status + totalTrainingDays correcto |
| `src/app/(client)/client/history/queries.ts` | scheduled_date |
| `src/app/(client)/client/history/week/[weekNumber]/queries.ts` | slot_status |
| `src/app/(client)/client/plan/[weekNumber]/[clientPlanDayId]/queries.ts` | slot_status, scheduled_date |
| `src/app/(coach)/coach/clients/[id]/queries.ts` | TZ + slot_status + compliance correcta |
| `src/features/plans/actions/supersede-plan-day.ts` | Nuevo |

---

## Riesgos residuales y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Clientes existentes tienen `timezone = 'UTC'` | El coach puede editarlo en el perfil del cliente. Fallback a UTC es seguro — solo afecta la detección de "hoy" |
| País no listado en TIMEZONE_DATA | Campo "Otro" en el form con input IANA manual |
| `complete_session` RPC falla silenciosamente | Error propagado al cliente, puede reintentar. Sesión queda `in_progress` — consistente |
| Migración `country_code` en producción con datos existentes | La columna es nullable — backfill no requerido para datos existentes |

---

## Fuera de scope (V1)

- UI para que el cliente cambie su propio timezone desde settings
- UI para que el coach agregue nuevos días de entrenamiento a un plan activo
- Notificaciones push basadas en timezone
- DST edge cases — manejados automáticamente por `Intl` ✓
