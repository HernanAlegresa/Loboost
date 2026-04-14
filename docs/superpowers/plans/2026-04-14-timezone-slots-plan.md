# Timezone, Slot Lifecycle & Compliance — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar timezone por cliente, slot lifecycle correcto (scheduled→completed via RPC atómica), compliance basada en slot_status, y selector country+city en creación de clientes.

**Architecture:** DB como fuente de verdad — `client_plan_days.slot_status` y `scheduled_date` son los datos canónicos. La función PostgreSQL `complete_session()` garantiza atomicidad al completar sesiones. Todas las queries usan el timezone IANA del cliente para resolver "hoy" server-side via `Intl.DateTimeFormat.formatToParts()`.

**Tech Stack:** Next.js 15 App Router, Supabase JS v2, PostgreSQL (RPC via supabase.rpc), TypeScript, Zod, Jest

---

## File Map

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `supabase/migrations/20260413120000_client_timezone_and_plan_slots.sql` | Editar | Agregar `country_code` al schema |
| `supabase/migrations/20260414130000_complete_session_fn.sql` | Crear | Función PostgreSQL atómica |
| `src/types/database.ts` | Regenerar | Tipos post-migración |
| `src/lib/timezone/data.ts` | Crear | Lista estática países → timezones IANA |
| `src/lib/timezone/utils.ts` | Crear | `getTodayForTimezone`, `safeGetToday` |
| `src/features/clients/utils/training-utils.ts` | Editar | Nueva firma `getCurrentWeek` + `computeDayStatus` |
| `src/features/clients/__tests__/training-utils.test.ts` | Editar | Tests actualizados para nuevas firmas |
| `src/features/training/actions/complete-session.ts` | Editar | Usar `supabase.rpc('complete_session', ...)` |
| `src/features/clients/schemas.ts` | Editar | Agregar `countryCode`, `timezone` |
| `src/features/clients/__tests__/create-client-schema.test.ts` | Editar | Tests para nuevos campos |
| `src/features/clients/actions/create-client.ts` | Editar | Insertar `country_code`, `timezone` |
| `src/app/(coach)/coach/clients/new/create-client-form.tsx` | Editar | Country + city selector |
| `src/features/plans/actions/assign-plan.ts` | Editar | Insertar `scheduled_date` en cada slot |
| `src/app/(client)/client/dashboard/queries.ts` | Editar | TZ + slot_status + currentWeek correcto |
| `src/app/(client)/client/plan/queries.ts` | Editar | TZ + slot_status + totalTrainingDays correcto |
| `src/app/(client)/client/history/queries.ts` | Editar | slot_status para compliance por semana |
| `src/app/(client)/client/history/week/[weekNumber]/queries.ts` | Editar | scheduled_date desde DB |
| `src/app/(client)/client/plan/[weekNumber]/[clientPlanDayId]/queries.ts` | Editar | slot_status + TZ |
| `src/app/(coach)/coach/clients/[id]/queries.ts` | Editar | TZ + slot_status + compliance correcta |
| `src/features/plans/actions/supersede-plan-day.ts` | Crear | Marcar slot futuro como superseded |

---

## Task 1: Fix assign-plan.ts — insertar scheduled_date

**⚠️ CRÍTICO: Este task va en el primer commit, ANTES de aplicar las migraciones. Sin este fix, todos los nuevos planes fallarán cuando la migración agregue `scheduled_date NOT NULL`.**

**Files:**
- Modify: `src/features/plans/actions/assign-plan.ts`

- [ ] **Step 1: Abrir el archivo y ubicar el loop de inserción**

El loop está en `src/features/plans/actions/assign-plan.ts` líneas ~110-145. Hay un `for (let week = 1; week <= plan.weeks; week++)` que inserta `client_plan_days`.

- [ ] **Step 2: Agregar el import de computeDayDate**

Al top de `src/features/plans/actions/assign-plan.ts`, agregar:

```typescript
import { computeDayDate } from '@/features/clients/utils/training-utils'
```

- [ ] **Step 3: Modificar el insert dentro del loop**

Reemplazar el bloque de inserción de `client_plan_days` (actualmente en el loop `for week` y `for day`):

```typescript
// ANTES (líneas ~112-119):
const { data: clientDay, error: dayError } = await supabase
  .from('client_plan_days')
  .insert({
    client_plan_id: clientPlan.id,
    week_number: week,
    day_of_week: day.day_of_week,
    order: day.order,
  })
  .select('id')
  .single()

// DESPUÉS:
const scheduledDate = computeDayDate(result.data.startDate, week, day.day_of_week)

const { data: clientDay, error: dayError } = await supabase
  .from('client_plan_days')
  .insert({
    client_plan_id: clientPlan.id,
    week_number: week,
    day_of_week: day.day_of_week,
    order: day.order,
    scheduled_date: scheduledDate,
  })
  .select('id')
  .single()
```

- [ ] **Step 4: Verificar TypeScript**

```bash
cd "C:/Users/herna/Loboost App" && npx tsc --noEmit 2>&1 | head -30
```

Esperado: cero errores (o los mismos de antes — no debe agregar nuevos).

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/herna/Loboost App"
git add src/features/plans/actions/assign-plan.ts
git commit -m "fix(plans): insert scheduled_date in client_plan_days on assign

Required before applying migration that makes scheduled_date NOT NULL.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Preparar migraciones — editar existing + crear nueva

**Files:**
- Modify: `supabase/migrations/20260413120000_client_timezone_and_plan_slots.sql`
- Create: `supabase/migrations/20260414130000_complete_session_fn.sql`

- [ ] **Step 1: Agregar country_code a la migración de timezone**

En `supabase/migrations/20260413120000_client_timezone_and_plan_slots.sql`, agregar la línea de `country_code` DESPUÉS de la línea que agrega `timezone` (línea ~6):

```sql
-- El bloque alter table existente debe quedar así:
alter table public.client_profiles
  add column if not exists timezone text not null default 'UTC';

alter table public.client_profiles
  add column if not exists country_code text;

comment on column public.client_profiles.timezone is
  'IANA timezone for calendar-week / "today" logic for this client.';

comment on column public.client_profiles.country_code is
  'ISO 3166-1 alpha-2 country code (AR, MX, ES…). Nullable for existing clients.';
```

`country_code` es nullable porque los clientes ya existentes no tienen país.

- [ ] **Step 2: Crear la migración de la función PostgreSQL atómica**

Crear `supabase/migrations/20260414130000_complete_session_fn.sql` con este contenido exacto:

```sql
-- Función atómica: completa sesión + sincroniza slot_status en una transacción.
-- Llamada desde complete-session.ts via supabase.rpc('complete_session', {...})
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
  -- 1. Completar sesión: solo si pertenece al cliente y está in_progress
  update sessions
  set    status       = 'completed',
         completed_at = now()
  where  id        = p_session_id
    and  client_id = p_client_id
    and  status    = 'in_progress'
  returning client_plan_day_id into v_day_id;

  -- Si no se actualizó nada: sesión no existe, no pertenece al cliente,
  -- o ya estaba completada. Lanzar error para que el caller lo maneje.
  if v_day_id is null then
    raise exception 'session_not_found_or_unauthorized';
  end if;

  -- 2. Sincronizar slot (misma transacción — si falla, sesión se revierte también)
  update client_plan_days
  set    slot_status = 'completed',
         updated_at  = now()
  where  id = v_day_id;
end;
$$;

-- Solo usuarios autenticados pueden llamar esta función.
-- RLS de sessions garantiza que solo el dueño puede completar su sesión.
grant execute on function public.complete_session(uuid, uuid) to authenticated;
```

- [ ] **Step 3: Commit de las migraciones listas**

```bash
cd "C:/Users/herna/Loboost App"
git add supabase/migrations/20260413120000_client_timezone_and_plan_slots.sql
git add supabase/migrations/20260414130000_complete_session_fn.sql
git commit -m "feat(migrations): add country_code + complete_session atomic RPC

- client_profiles.country_code (nullable, ISO 3166-1 alpha-2)
- complete_session() PostgreSQL function: completes session + syncs
  slot_status in a single transaction

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Aplicar migraciones en Supabase y regenerar tipos

**Aplicar en este orden exacto. Si alguna falla, detener y resolver antes de continuar.**

- [ ] **Step 1: Aplicar notification_preferences**

Usar la herramienta Supabase MCP `apply_migration` con:
- `project_id`: `zsczvjsqkgmvouzcjcvv`
- `name`: `notification_preferences`
- `query`: contenido completo de `supabase/migrations/20260410120000_notification_preferences.sql`

Verificar que no haya errores.

- [ ] **Step 2: Aplicar client_timezone_and_plan_slots**

Usar `apply_migration` con:
- `project_id`: `zsczvjsqkgmvouzcjcvv`
- `name`: `client_timezone_and_plan_slots`
- `query`: contenido completo de `supabase/migrations/20260413120000_client_timezone_and_plan_slots.sql`

Verificar que no haya errores. El backfill (scheduled_date + slot_status desde sesiones) se ejecuta automáticamente.

- [ ] **Step 3: Aplicar complete_session_fn**

Usar `apply_migration` con:
- `project_id`: `zsczvjsqkgmvouzcjcvv`
- `name`: `complete_session_fn`
- `query`: contenido completo de `supabase/migrations/20260414130000_complete_session_fn.sql`

- [ ] **Step 4: Verificar schema en DB**

Ejecutar esta SQL via `execute_sql`:

```sql
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('client_profiles', 'client_plan_days')
  and column_name in ('timezone', 'country_code', 'scheduled_date', 'slot_status', 'updated_at')
order by table_name, column_name;
```

Esperado: 6 filas — `country_code`, `timezone` en `client_profiles`; `scheduled_date`, `slot_status`, `updated_at` en `client_plan_days`.

- [ ] **Step 5: Regenerar tipos**

```bash
cd "C:/Users/herna/Loboost App"
npx supabase gen types typescript --project-id zsczvjsqkgmvouzcjcvv > src/types/database.ts
```

Verificar que el archivo generado incluye `timezone`, `country_code`, `scheduled_date`, `slot_status` en los tipos correspondientes.

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/herna/Loboost App"
git add src/types/database.ts
git commit -m "chore: regenerate Supabase types post-migrations

Adds timezone, country_code to client_profiles types.
Adds scheduled_date, slot_status, updated_at to client_plan_days types.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Crear timezone data layer

**Files:**
- Create: `src/lib/timezone/data.ts`
- Create: `src/lib/timezone/utils.ts`

- [ ] **Step 1: Crear src/lib/timezone/data.ts**

```typescript
// src/lib/timezone/data.ts
export type CountryZone = { city: string | null; iana: string }
export type CountryEntry = { country: string; code: string; zones: CountryZone[] }

/**
 * Lista curada de países y sus zonas IANA.
 * Países con una sola zona: city = null (no requiere selector de ciudad).
 * Países con múltiples zonas: city = nombre representativo de la zona.
 * Orden: España y LATAM primero, luego resto alfabético.
 */
export const TIMEZONE_DATA: CountryEntry[] = [
  // ── LATAM + España (primero) ──────────────────────────────────────────────
  { country: 'Argentina',            code: 'AR', zones: [{ city: null, iana: 'America/Argentina/Buenos_Aires' }] },
  { country: 'Bolivia',              code: 'BO', zones: [{ city: null, iana: 'America/La_Paz' }] },
  { country: 'Chile',                code: 'CL', zones: [{ city: null, iana: 'America/Santiago' }] },
  { country: 'Colombia',             code: 'CO', zones: [{ city: null, iana: 'America/Bogota' }] },
  { country: 'Costa Rica',           code: 'CR', zones: [{ city: null, iana: 'America/Costa_Rica' }] },
  { country: 'Cuba',                 code: 'CU', zones: [{ city: null, iana: 'America/Havana' }] },
  { country: 'Ecuador',              code: 'EC', zones: [{ city: null, iana: 'America/Guayaquil' }] },
  { country: 'El Salvador',          code: 'SV', zones: [{ city: null, iana: 'America/El_Salvador' }] },
  { country: 'España',               code: 'ES', zones: [{ city: null, iana: 'Europe/Madrid' }] },
  { country: 'Guatemala',            code: 'GT', zones: [{ city: null, iana: 'America/Guatemala' }] },
  { country: 'Honduras',             code: 'HN', zones: [{ city: null, iana: 'America/Tegucigalpa' }] },
  { country: 'Nicaragua',            code: 'NI', zones: [{ city: null, iana: 'America/Managua' }] },
  { country: 'Panamá',               code: 'PA', zones: [{ city: null, iana: 'America/Panama' }] },
  { country: 'Paraguay',             code: 'PY', zones: [{ city: null, iana: 'America/Asuncion' }] },
  { country: 'Perú',                 code: 'PE', zones: [{ city: null, iana: 'America/Lima' }] },
  { country: 'Puerto Rico',          code: 'PR', zones: [{ city: null, iana: 'America/Puerto_Rico' }] },
  { country: 'República Dominicana', code: 'DO', zones: [{ city: null, iana: 'America/Santo_Domingo' }] },
  { country: 'Uruguay',              code: 'UY', zones: [{ city: null, iana: 'America/Montevideo' }] },
  { country: 'Venezuela',            code: 'VE', zones: [{ city: null, iana: 'America/Caracas' }] },
  // Multi-zona LATAM
  { country: 'Brasil', code: 'BR', zones: [
    { city: 'São Paulo',   iana: 'America/Sao_Paulo' },
    { city: 'Manaus',      iana: 'America/Manaus' },
    { city: 'Fortaleza',   iana: 'America/Fortaleza' },
    { city: 'Porto Velho', iana: 'America/Porto_Velho' },
    { city: 'Noronha',     iana: 'America/Noronha' },
  ]},
  { country: 'México', code: 'MX', zones: [
    { city: 'Ciudad de México', iana: 'America/Mexico_City' },
    { city: 'Monterrey',        iana: 'America/Monterrey' },
    { city: 'Hermosillo',       iana: 'America/Hermosillo' },
    { city: 'Chihuahua',        iana: 'America/Chihuahua' },
    { city: 'Tijuana',          iana: 'America/Tijuana' },
    { city: 'Cancún',           iana: 'America/Cancun' },
  ]},
  // ── Resto del mundo ───────────────────────────────────────────────────────
  { country: 'Alemania',   code: 'DE', zones: [{ city: null, iana: 'Europe/Berlin' }] },
  { country: 'Francia',    code: 'FR', zones: [{ city: null, iana: 'Europe/Paris' }] },
  { country: 'Italia',     code: 'IT', zones: [{ city: null, iana: 'Europe/Rome' }] },
  { country: 'Portugal',   code: 'PT', zones: [{ city: null, iana: 'Europe/Lisbon' }] },
  { country: 'Reino Unido', code: 'GB', zones: [{ city: null, iana: 'Europe/London' }] },
  { country: 'Australia', code: 'AU', zones: [
    { city: 'Sídney',    iana: 'Australia/Sydney' },
    { city: 'Melbourne', iana: 'Australia/Melbourne' },
    { city: 'Brisbane',  iana: 'Australia/Brisbane' },
    { city: 'Perth',     iana: 'Australia/Perth' },
    { city: 'Adelaide',  iana: 'Australia/Adelaide' },
  ]},
  { country: 'Canadá', code: 'CA', zones: [
    { city: 'Toronto',   iana: 'America/Toronto' },
    { city: 'Vancouver', iana: 'America/Vancouver' },
    { city: 'Winnipeg',  iana: 'America/Winnipeg' },
    { city: 'Halifax',   iana: 'America/Halifax' },
  ]},
  { country: 'Estados Unidos', code: 'US', zones: [
    { city: 'Nueva York (Este)',      iana: 'America/New_York' },
    { city: 'Chicago (Centro)',       iana: 'America/Chicago' },
    { city: 'Denver (Montaña)',       iana: 'America/Denver' },
    { city: 'Los Ángeles (Pacífico)', iana: 'America/Los_Angeles' },
    { city: 'Phoenix (Arizona)',      iana: 'America/Phoenix' },
    { city: 'Anchorage',             iana: 'America/Anchorage' },
    { city: 'Honolulu (Hawái)',       iana: 'Pacific/Honolulu' },
  ]},
]
```

- [ ] **Step 2: Crear src/lib/timezone/utils.ts**

```typescript
// src/lib/timezone/utils.ts

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
 * Usar en todos los server components que necesitan "hoy" del cliente.
 */
export function safeGetToday(tz: string | null | undefined): string {
  try {
    return getTodayForTimezone(tz ?? 'UTC')
  } catch {
    return getTodayForTimezone('UTC')
  }
}
```

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/herna/Loboost App"
git add src/lib/timezone/data.ts src/lib/timezone/utils.ts
git commit -m "feat(timezone): add country/timezone data layer and utils

- data.ts: curated list of ~40 countries with IANA timezones
- utils.ts: getTodayForTimezone (Intl.formatToParts), safeGetToday

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Actualizar training-utils.ts + tests

**Files:**
- Modify: `src/features/clients/utils/training-utils.ts`
- Modify: `src/features/clients/__tests__/training-utils.test.ts`

- [ ] **Step 1: Escribir los tests que fallarán**

Reemplazar el contenido completo de `src/features/clients/__tests__/training-utils.test.ts`:

```typescript
import { getCurrentWeek, computeDayDate, computeDayStatus } from '../utils/training-utils'

describe('getCurrentWeek', () => {
  // Nota: todayISO es ahora parámetro explícito — tests son puros (sin dependencia en new Date())

  it('returns 1 when today is before start date', () => {
    expect(getCurrentWeek('2026-04-20', 8, '2026-04-14')).toBe(1)
  })

  it('returns 1 on the start date itself', () => {
    expect(getCurrentWeek('2026-04-14', 8, '2026-04-14')).toBe(1)
  })

  it('returns 2 after exactly 7 days', () => {
    expect(getCurrentWeek('2026-04-07', 8, '2026-04-14')).toBe(2)
  })

  it('caps at totalWeeks when plan has ended', () => {
    expect(getCurrentWeek('2020-01-01', 4, '2026-04-14')).toBe(4)
  })

  it('returns 1 on day 6 of the plan (still week 1)', () => {
    expect(getCurrentWeek('2026-04-08', 8, '2026-04-14')).toBe(1)
  })

  it('returns 3 after 14 days', () => {
    expect(getCurrentWeek('2026-03-31', 8, '2026-04-14')).toBe(3)
  })
})

describe('computeDayDate', () => {
  it('returns start date for week 1 day 1', () => {
    expect(computeDayDate('2026-04-13', 1, 1)).toBe('2026-04-13')
  })

  it('returns correct date for week 1 day 3 (Wednesday)', () => {
    expect(computeDayDate('2026-04-13', 1, 3)).toBe('2026-04-15')
  })

  it('returns correct date for week 2 day 1 (Monday)', () => {
    expect(computeDayDate('2026-04-13', 2, 1)).toBe('2026-04-20')
  })

  it('returns correct date for week 3 day 7 (Sunday)', () => {
    expect(computeDayDate('2026-04-13', 3, 7)).toBe('2026-05-03')
  })
})

describe('computeDayStatus', () => {
  // Nueva firma: (scheduledDate, todayISO, slotStatus, sessionStatus)

  it('returns completed when slot_status is completed', () => {
    expect(computeDayStatus('2026-04-10', '2026-04-10', 'completed', null)).toBe('completed')
  })

  it('returns completed when session is completed (even if slot says scheduled)', () => {
    expect(computeDayStatus('2026-04-10', '2026-04-10', 'scheduled', 'completed')).toBe('completed')
  })

  it('returns in_progress when session is in_progress', () => {
    expect(computeDayStatus('2026-04-10', '2026-04-10', 'scheduled', 'in_progress')).toBe('in_progress')
  })

  it('returns rest for cancelled slot', () => {
    expect(computeDayStatus('2026-04-10', '2026-04-10', 'cancelled', null)).toBe('rest')
  })

  it('returns rest for superseded slot', () => {
    expect(computeDayStatus('2026-04-10', '2026-04-20', 'superseded', null)).toBe('rest')
  })

  it('returns today when date matches today and slot is scheduled', () => {
    expect(computeDayStatus('2026-04-10', '2026-04-10', 'scheduled', null)).toBe('today')
  })

  it('returns upcoming for future date with scheduled slot', () => {
    expect(computeDayStatus('2026-04-20', '2026-04-10', 'scheduled', null)).toBe('upcoming')
  })

  it('returns past_missed for past date with scheduled slot and no session', () => {
    expect(computeDayStatus('2026-04-05', '2026-04-10', 'scheduled', null)).toBe('past_missed')
  })

  it('completed slot takes priority over past date', () => {
    expect(computeDayStatus('2026-04-05', '2026-04-10', 'completed', null)).toBe('completed')
  })

  it('in_progress session takes priority over scheduled today', () => {
    expect(computeDayStatus('2026-04-10', '2026-04-10', 'scheduled', 'in_progress')).toBe('in_progress')
  })

  it('cancelled slot on today returns rest (not today)', () => {
    expect(computeDayStatus('2026-04-10', '2026-04-10', 'cancelled', null)).toBe('rest')
  })
})
```

- [ ] **Step 2: Correr los tests y verificar que FALLAN**

```bash
cd "C:/Users/herna/Loboost App" && npx jest src/features/clients/__tests__/training-utils.test.ts --no-coverage 2>&1 | tail -20
```

Esperado: varios tests fallan porque las firmas no coinciden aún.

- [ ] **Step 3: Actualizar training-utils.ts con las nuevas implementaciones**

Reemplazar el contenido completo de `src/features/clients/utils/training-utils.ts`:

```typescript
import type { DayStatus } from '../types'

/** Retorna YYYY-MM-DD usando hora del servidor (UTC). Solo para contextos sin cliente. */
export function getTodayISO(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Retorna el número de semana actual (1-indexed) para un plan.
 * @param startDate  Fecha de inicio del plan en formato 'YYYY-MM-DD'
 * @param totalWeeks Duración total del plan en semanas
 * @param todayISO   Fecha de hoy en 'YYYY-MM-DD' — debe venir de safeGetToday(clientTimezone)
 */
export function getCurrentWeek(startDate: string, totalWeeks: number, todayISO: string): number {
  const [sy, sm, sd] = startDate.split('-').map(Number)
  const [ty, tm, td] = todayISO.split('-').map(Number)
  const start = new Date(sy, sm - 1, sd)
  const today = new Date(ty, tm - 1, td)
  if (today <= start) return 1
  const daysSinceStart = Math.floor((today.getTime() - start.getTime()) / 86400000)
  return Math.min(Math.floor(daysSinceStart / 7) + 1, totalWeeks)
}

/**
 * Computa la fecha ISO (YYYY-MM-DD) de un slot del plan.
 * week 1 day 1 = startDate, week 1 day 2 = startDate + 1, etc.
 * dayOfWeek: 1=Lunes … 7=Domingo
 */
export function computeDayDate(startDate: string, weekNumber: number, dayOfWeek: number): string {
  const start = new Date(startDate)
  start.setUTCHours(0, 0, 0, 0)
  const offsetDays = (weekNumber - 1) * 7 + (dayOfWeek - 1)
  const d = new Date(start.getTime() + offsetDays * 86400000)
  return d.toISOString().split('T')[0]
}

/**
 * Determina el estado de display de un slot de entrenamiento.
 * @param scheduledDate  Fecha del slot en 'YYYY-MM-DD' (de client_plan_days.scheduled_date)
 * @param todayISO       Hoy en el timezone del cliente (de safeGetToday(client.timezone))
 * @param slotStatus     Estado del slot en DB ('scheduled'|'completed'|'cancelled'|'superseded')
 * @param sessionStatus  Estado de la sesión vinculada, o null si no existe
 */
export function computeDayStatus(
  scheduledDate: string,
  todayISO: string,
  slotStatus: 'scheduled' | 'completed' | 'cancelled' | 'superseded',
  sessionStatus: 'in_progress' | 'completed' | null
): DayStatus {
  // La sesión es fuente de verdad para completed
  if (slotStatus === 'completed' || sessionStatus === 'completed') return 'completed'
  // Sesión activa tiene prioridad
  if (sessionStatus === 'in_progress') return 'in_progress'
  // Estados terminales sin deuda (no exponer al cliente)
  if (slotStatus === 'cancelled' || slotStatus === 'superseded') return 'rest'
  // slot scheduled — derivar por fecha
  if (scheduledDate === todayISO) return 'today'
  if (scheduledDate > todayISO)   return 'upcoming'
  return 'past_missed'
}
```

- [ ] **Step 4: Correr los tests y verificar que PASAN**

```bash
cd "C:/Users/herna/Loboost App" && npx jest src/features/clients/__tests__/training-utils.test.ts --no-coverage 2>&1 | tail -20
```

Esperado: `Tests: 17 passed, 17 total` (o similar).

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/herna/Loboost App"
git add src/features/clients/utils/training-utils.ts src/features/clients/__tests__/training-utils.test.ts
git commit -m "feat(training-utils): timezone-aware getCurrentWeek + slot-aware computeDayStatus

- getCurrentWeek now takes explicit todayISO param (breaking: all call sites updated in later tasks)
- computeDayStatus now takes slotStatus param for correct state machine
- Both functions are now pure (no internal new Date() dependency)
- Tests updated and passing (17 tests)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Actualizar complete-session.ts — usar RPC atómica

**Files:**
- Modify: `src/features/training/actions/complete-session.ts`

- [ ] **Step 1: Reemplazar el contenido completo del archivo**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'

export async function completeSessionAction(sessionId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'No autenticado' }

  // Atomically: mark session completed + sync slot_status in one transaction
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

- [ ] **Step 2: Verificar TypeScript**

```bash
cd "C:/Users/herna/Loboost App" && npx tsc --noEmit 2>&1 | head -20
```

Esperado: cero errores nuevos.

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/herna/Loboost App"
git add src/features/training/actions/complete-session.ts
git commit -m "feat(training): complete-session uses atomic RPC

Replaces two separate updates with complete_session() PostgreSQL function
that atomically updates sessions.status + client_plan_days.slot_status.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Actualizar schema + action + tests — creación de cliente con timezone

**Files:**
- Modify: `src/features/clients/schemas.ts`
- Modify: `src/features/clients/__tests__/create-client-schema.test.ts`
- Modify: `src/features/clients/actions/create-client.ts`

- [ ] **Step 1: Escribir los tests que fallarán**

Reemplazar el contenido completo de `src/features/clients/__tests__/create-client-schema.test.ts`:

```typescript
import { createClientSchema } from '../schemas'

const valid = {
  fullName:        'Sofía Torres',
  email:           'sofia@example.com',
  password:        'password123',
  age:             '25',
  sex:             'female',
  goal:            'Pérdida de peso',
  weightKg:        '65',
  heightCm:        '165',
  experienceLevel: 'intermediate',
  daysPerWeek:     '4',
  injuries:        'Ninguna',
  countryCode:     'AR',
  timezone:        'America/Argentina/Buenos_Aires',
}

describe('createClientSchema', () => {
  it('accepts fully valid data', () => {
    expect(createClientSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects invalid goal value', () => {
    expect(createClientSchema.safeParse({ ...valid, goal: 'Algo random' }).success).toBe(false)
  })

  it('accepts all valid goal values', () => {
    const goals = [
      'Pérdida de peso', 'Ganancia muscular', 'Definición muscular',
      'Mejorar condición física', 'Rendimiento deportivo', 'Rehabilitación',
      'Salud general', 'Otro',
    ]
    for (const goal of goals) {
      expect(createClientSchema.safeParse({ ...valid, goal }).success).toBe(true)
    }
  })

  it('accepts missing injuries (optional field)', () => {
    const { injuries, ...withoutInjuries } = valid
    expect(createClientSchema.safeParse(withoutInjuries).success).toBe(true)
  })

  it('rejects daysPerWeek > 6', () => {
    expect(createClientSchema.safeParse({ ...valid, daysPerWeek: '7' }).success).toBe(false)
  })

  it('rejects short password', () => {
    expect(createClientSchema.safeParse({ ...valid, password: 'short' }).success).toBe(false)
  })

  it('rejects invalid email', () => {
    expect(createClientSchema.safeParse({ ...valid, email: 'notanemail' }).success).toBe(false)
  })

  it('coerces age from string to number', () => {
    const result = createClientSchema.safeParse(valid)
    expect(result.success && result.data.age).toBe(25)
  })

  it('rejects missing countryCode', () => {
    const { countryCode, ...without } = valid
    expect(createClientSchema.safeParse(without).success).toBe(false)
  })

  it('rejects countryCode with wrong length', () => {
    expect(createClientSchema.safeParse({ ...valid, countryCode: 'ARG' }).success).toBe(false)
  })

  it('rejects missing timezone', () => {
    const { timezone, ...without } = valid
    expect(createClientSchema.safeParse(without).success).toBe(false)
  })

  it('rejects empty timezone', () => {
    expect(createClientSchema.safeParse({ ...valid, timezone: '' }).success).toBe(false)
  })
})
```

- [ ] **Step 2: Correr los tests — deben fallar**

```bash
cd "C:/Users/herna/Loboost App" && npx jest src/features/clients/__tests__/create-client-schema.test.ts --no-coverage 2>&1 | tail -10
```

Esperado: fallan los 4 tests nuevos (countryCode y timezone).

- [ ] **Step 3: Actualizar createClientSchema en schemas.ts**

En `src/features/clients/schemas.ts`, agregar los dos campos al `createClientSchema` (después de `injuries`):

```typescript
export const createClientSchema = z.object({
  fullName:        z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email:           z.string().email('Email inválido'),
  password:        z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  age:             z.coerce.number().int().min(10).max(100),
  sex:             z.enum(['male', 'female', 'other']),
  goal:            z.enum(GOALS, { message: 'Seleccioná un objetivo válido' }),
  weightKg:        z.coerce.number().min(20).max(300),
  heightCm:        z.coerce.number().min(100).max(250),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  daysPerWeek:     z.coerce.number().int().min(1).max(6),
  injuries:        z.string().max(500).optional(),
  countryCode:     z.string().length(2, 'País requerido'),
  timezone:        z.string().min(1, 'Seleccioná la ubicación del cliente'),
})
```

- [ ] **Step 4: Correr los tests — deben pasar**

```bash
cd "C:/Users/herna/Loboost App" && npx jest src/features/clients/__tests__/create-client-schema.test.ts --no-coverage 2>&1 | tail -10
```

Esperado: `Tests: 12 passed, 12 total`.

- [ ] **Step 5: Actualizar create-client.ts para insertar los nuevos campos**

En `src/features/clients/actions/create-client.ts`, agregar los campos al `raw` object y al insert de `client_profiles`.

Reemplazar el bloque `const raw = {`:

```typescript
const raw = {
  fullName:        formData.get('fullName'),
  email:           formData.get('email'),
  password:        formData.get('password'),
  age:             formData.get('age'),
  sex:             formData.get('sex'),
  goal:            formData.get('goal'),
  weightKg:        formData.get('weightKg'),
  heightCm:        formData.get('heightCm'),
  experienceLevel: formData.get('experienceLevel'),
  daysPerWeek:     formData.get('daysPerWeek'),
  injuries:        formData.get('injuries'),
  countryCode:     formData.get('countryCode'),
  timezone:        formData.get('timezone'),
}
```

Reemplazar el bloque `await supabaseAdmin.from('client_profiles').insert({`:

```typescript
const { error: clientProfileError } = await supabaseAdmin
  .from('client_profiles')
  .insert({
    id:               newUser.user.id,
    age:              result.data.age,
    sex:              result.data.sex,
    goal:             result.data.goal,
    weight_kg:        result.data.weightKg,
    height_cm:        result.data.heightCm,
    experience_level: result.data.experienceLevel,
    days_per_week:    result.data.daysPerWeek,
    injuries:         result.data.injuries,
    country_code:     result.data.countryCode,
    timezone:         result.data.timezone,
  })
```

- [ ] **Step 6: Verificar TypeScript**

```bash
cd "C:/Users/herna/Loboost App" && npx tsc --noEmit 2>&1 | head -20
```

Esperado: cero errores nuevos.

- [ ] **Step 7: Commit schema + action**

```bash
cd "C:/Users/herna/Loboost App"
git add src/features/clients/schemas.ts src/features/clients/actions/create-client.ts src/features/clients/__tests__/create-client-schema.test.ts
git commit -m "feat(clients): add countryCode + timezone to create-client schema and action

- createClientSchema validates countryCode (2-char ISO) and timezone (IANA string)
- create-client.ts inserts country_code + timezone into client_profiles
- 12 schema tests passing

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 8: Actualizar create-client-form.tsx — Country + City selector

**Files:**
- Modify: `src/app/(coach)/coach/clients/new/create-client-form.tsx`

- [ ] **Step 1: Agregar los imports necesarios al top del archivo**

Después de los imports existentes, agregar:

```typescript
import { useState, useEffect } from 'react'
import { TIMEZONE_DATA } from '@/lib/timezone/data'
import type { CountryEntry } from '@/lib/timezone/data'
```

Nota: `useState` y `useEffect` ya están importados de React. Solo agregar `TIMEZONE_DATA`.

- [ ] **Step 2: Agregar estado y lógica del selector dentro del componente**

Dentro de `CreateClientForm`, después de `const [showPassword, setShowPassword] = useState(false)`, agregar:

```typescript
const [selectedCountry, setSelectedCountry] = useState<CountryEntry | null>(null)
const [selectedIana, setSelectedIana] = useState<string>('')

// Cuando cambia el país: si tiene una sola zona, auto-seleccionar; si no, limpiar
function handleCountryChange(code: string) {
  const entry = TIMEZONE_DATA.find(c => c.code === code) ?? null
  setSelectedCountry(entry)
  if (entry && entry.zones.length === 1) {
    setSelectedIana(entry.zones[0].iana)
  } else {
    setSelectedIana('')
  }
}

const isValid = selectedIana !== ''
```

- [ ] **Step 3: Agregar la sección "Ubicación" en el formulario**

Después de la sección de "Lesiones" (antes del `<div style={{ height: 1, ...` divider)), agregar:

```typescript
<Field label="País">
  <select
    onChange={(e) => handleCountryChange(e.target.value)}
    defaultValue=""
    required
    style={{
      ...inputStyle,
      appearance: 'none',
      cursor: 'pointer',
    }}
  >
    <option value="" disabled>Seleccioná el país</option>
    {TIMEZONE_DATA.map((c) => (
      <option key={c.code} value={c.code}>{c.country}</option>
    ))}
  </select>
</Field>

{selectedCountry && selectedCountry.zones.length > 1 && (
  <Field label="Zona horaria">
    <select
      onChange={(e) => setSelectedIana(e.target.value)}
      defaultValue=""
      required
      style={{
        ...inputStyle,
        appearance: 'none',
        cursor: 'pointer',
      }}
    >
      <option value="" disabled>Seleccioná la ciudad</option>
      {selectedCountry.zones.map((z) => (
        <option key={z.iana} value={z.iana}>{z.city}</option>
      ))}
    </select>
  </Field>
)}

{/* Campos hidden enviados al server action */}
{selectedCountry && (
  <input type="hidden" name="countryCode" value={selectedCountry.code} />
)}
{selectedIana && (
  <input type="hidden" name="timezone" value={selectedIana} />
)}
```

- [ ] **Step 4: Deshabilitar el botón submit si no hay timezone seleccionada**

Modificar el botón de submit para incluir la validación:

```typescript
<button
  type="submit"
  disabled={isPending || !isValid}
  style={{
    width: '100%',
    height: 52,
    backgroundColor: (isPending || !isValid) ? '#8BA82B' : '#B5F23D',
    color: '#0A0A0A',
    fontSize: 16,
    fontWeight: 700,
    border: 'none',
    borderRadius: 12,
    cursor: (isPending || !isValid) ? 'not-allowed' : 'pointer',
    transition: 'background-color 0.15s',
    opacity: !isValid && !isPending ? 0.6 : 1,
  }}
>
  {isPending ? 'Creando cliente...' : 'Guardar cliente'}
</button>
```

- [ ] **Step 5: Verificar TypeScript**

```bash
cd "C:/Users/herna/Loboost App" && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/herna/Loboost App"
git add "src/app/(coach)/coach/clients/new/create-client-form.tsx"
git commit -m "feat(clients): add country + city timezone selector to create-client form

- Country selector with all ~40 countries from TIMEZONE_DATA
- Auto-selects timezone for single-zone countries
- City selector appears for multi-zone countries (MX, US, BR, CA, AU)
- Hidden inputs: countryCode + timezone sent to server action
- Submit disabled until timezone resolved

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 9: Actualizar client dashboard queries

**Files:**
- Modify: `src/app/(client)/client/dashboard/queries.ts`

- [ ] **Step 1: Reemplazar el contenido completo del archivo**

```typescript
import { createClient } from '@/lib/supabase/server'
import { getCurrentWeek, computeDayStatus } from '@/features/clients/utils/training-utils'
import { safeGetToday } from '@/lib/timezone/utils'
import type {
  ClientDashboardData,
  ClientActivePlan,
  TodayDayData,
  TodayExercise,
  WeekStripDay,
} from '@/features/training/types'

export async function getClientDashboardData(
  clientId: string
): Promise<ClientDashboardData> {
  const supabase = await createClient()

  const [profileResult, timezoneResult, planResult, inProgResult] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', clientId).single(),
    supabase.from('client_profiles').select('timezone').eq('id', clientId).maybeSingle(),
    supabase
      .from('client_plans')
      .select('id, name, weeks, start_date, end_date, status')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .maybeSingle(),
    supabase
      .from('sessions')
      .select('id')
      .eq('client_id', clientId)
      .eq('status', 'in_progress')
      .limit(1)
      .maybeSingle(),
  ])

  const fullName = profileResult.data?.full_name ?? 'Cliente'
  const clientTimezone = timezoneResult.data?.timezone ?? 'UTC'
  const plan = planResult.data
  const inProgressSession = inProgResult.data?.id ? { sessionId: inProgResult.data.id } : null

  if (!plan) {
    return { fullName, activePlan: null, today: null, weekStrip: null, inProgressSession }
  }

  const todayISO = safeGetToday(clientTimezone)
  const currentWeek = getCurrentWeek(plan.start_date, plan.weeks, todayISO)

  // Fetch all plan days with slot_status for progress calculation
  const { data: allPlanDays } = await supabase
    .from('client_plan_days')
    .select('id, week_number, day_of_week, scheduled_date, slot_status')
    .eq('client_plan_id', plan.id)

  if (!allPlanDays || allPlanDays.length === 0) {
    return {
      fullName,
      activePlan: { id: plan.id, name: plan.name, weeks: plan.weeks, currentWeek, startDate: plan.start_date, endDate: plan.end_date, progressPct: 0 },
      today: null,
      weekStrip: null,
      inProgressSession,
    }
  }

  // Progress: exclude superseded + cancelled from denominator
  const activeDays = allPlanDays.filter(
    d => d.slot_status !== 'superseded' && d.slot_status !== 'cancelled'
  )
  const completedCount = activeDays.filter(d => d.slot_status === 'completed').length
  const progressPct = activeDays.length > 0
    ? Math.max(4, Math.round((completedCount / activeDays.length) * 100))
    : 0

  const activePlan: ClientActivePlan = {
    id: plan.id,
    name: plan.name,
    weeks: plan.weeks,
    currentWeek,
    startDate: plan.start_date,
    endDate: plan.end_date,
    progressPct,
  }

  const currentWeekDays = allPlanDays.filter(d => d.week_number === currentWeek)

  if (currentWeekDays.length === 0) {
    return { fullName, activePlan, today: null, weekStrip: null, inProgressSession }
  }

  const currentWeekDayIds = currentWeekDays.map(d => d.id)
  const { data: weekSessions } = await supabase
    .from('sessions')
    .select('id, client_plan_day_id, status')
    .eq('client_id', clientId)
    .in('client_plan_day_id', currentWeekDayIds)
    .in('status', ['in_progress', 'completed'])

  const sessionByDayId = new Map<string, { id: string; status: string }>()
  for (const s of weekSessions ?? []) {
    sessionByDayId.set(s.client_plan_day_id, { id: s.id, status: s.status })
  }

  const weekStrip: WeekStripDay[] = []
  for (let dow = 1; dow <= 7; dow++) {
    const pd = currentWeekDays.find(d => d.day_of_week === dow)
    if (!pd) {
      weekStrip.push({ dayOfWeek: dow, status: 'rest' })
      continue
    }
    const sess = sessionByDayId.get(pd.id)
    const status = computeDayStatus(
      pd.scheduled_date,
      todayISO,
      pd.slot_status as 'scheduled' | 'completed' | 'cancelled' | 'superseded',
      (sess?.status as 'in_progress' | 'completed' | null) ?? null
    )
    weekStrip.push({ dayOfWeek: dow, status, clientPlanDayId: pd.id, dateISO: pd.scheduled_date })
  }

  const todayPlanDay = currentWeekDays.find(d => d.scheduled_date === todayISO)

  if (!todayPlanDay) {
    return { fullName, activePlan, today: null, weekStrip, inProgressSession }
  }

  const [exercisesResult, sessionResult] = await Promise.all([
    supabase
      .from('client_plan_day_exercises')
      .select('id, order, sets, reps, duration_seconds, exercises(name)')
      .eq('client_plan_day_id', todayPlanDay.id)
      .order('order'),
    supabase
      .from('sessions')
      .select('id, status')
      .eq('client_id', clientId)
      .eq('client_plan_day_id', todayPlanDay.id)
      .in('status', ['in_progress', 'completed'])
      .maybeSingle(),
  ])

  const exercises: TodayExercise[] = (exercisesResult.data ?? []).map((ex) => {
    const exData = ex.exercises as { name: string } | { name: string }[] | null
    const name = Array.isArray(exData) ? (exData[0]?.name ?? 'Ejercicio') : (exData?.name ?? 'Ejercicio')
    return {
      clientPlanDayExerciseId: ex.id,
      name,
      order: ex.order,
      plannedSets: ex.sets,
      plannedReps: ex.reps ?? null,
      plannedDurationSeconds: ex.duration_seconds ?? null,
    }
  })

  const today: TodayDayData = {
    clientPlanDayId: todayPlanDay.id,
    dayOfWeek: todayPlanDay.day_of_week,
    exercises,
    existingSessionId: sessionResult.data?.id ?? null,
    sessionStatus: (sessionResult.data?.status as 'in_progress' | 'completed' | null) ?? null,
  }

  return { fullName, activePlan, today, weekStrip, inProgressSession }
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd "C:/Users/herna/Loboost App" && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/herna/Loboost App"
git add "src/app/(client)/client/dashboard/queries.ts"
git commit -m "feat(dashboard): timezone-aware client dashboard queries

- safeGetToday(clientTimezone) for correct 'today' in client's TZ
- getCurrentWeek with explicit todayISO
- slot_status + scheduled_date from DB (no more on-the-fly computeDayDate)
- progressPct excludes superseded + cancelled from denominator

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 10: Actualizar plan view queries

**Files:**
- Modify: `src/app/(client)/client/plan/queries.ts`

- [ ] **Step 1: Reemplazar el contenido completo**

```typescript
import { createClient } from '@/lib/supabase/server'
import { getCurrentWeek, computeDayStatus } from '@/features/clients/utils/training-utils'
import { safeGetToday } from '@/lib/timezone/utils'
import type { ClientPlanViewData, PlanWeekData, PlanDayWithStatus } from '@/features/training/types'

export async function getClientPlanViewData(
  clientId: string
): Promise<ClientPlanViewData | null> {
  const supabase = await createClient()

  const [planResult, timezoneResult] = await Promise.all([
    supabase
      .from('client_plans')
      .select('id, name, weeks, start_date, end_date, status')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .maybeSingle(),
    supabase.from('client_profiles').select('timezone').eq('id', clientId).maybeSingle(),
  ])

  if (!planResult.data) return null
  const plan = planResult.data
  const clientTimezone = timezoneResult.data?.timezone ?? 'UTC'
  const todayISO = safeGetToday(clientTimezone)
  const currentWeek = getCurrentWeek(plan.start_date, plan.weeks, todayISO)

  const [daysResult, sessionsResult] = await Promise.all([
    supabase
      .from('client_plan_days')
      .select('id, week_number, day_of_week, scheduled_date, slot_status')
      .eq('client_plan_id', plan.id)
      .order('week_number')
      .order('day_of_week'),
    supabase
      .from('sessions')
      .select('id, client_plan_day_id, status')
      .eq('client_id', clientId)
      .in('status', ['in_progress', 'completed']),
  ])

  const planDays = daysResult.data ?? []
  const sessions = sessionsResult.data ?? []

  const sessionByDayId = new Map<string, { id: string; status: string }>()
  for (const s of sessions) {
    const prev = sessionByDayId.get(s.client_plan_day_id)
    if (!prev || s.status === 'completed') {
      sessionByDayId.set(s.client_plan_day_id, { id: s.id, status: s.status })
    }
  }

  // Progress: exclude superseded + cancelled
  const activeDays = planDays.filter(
    d => d.slot_status !== 'superseded' && d.slot_status !== 'cancelled'
  )
  const totalTrainingDays = activeDays.length
  const completedSessions = activeDays.filter(d => d.slot_status === 'completed').length
  const progressPct = totalTrainingDays > 0
    ? Math.max(4, Math.round((completedSessions / totalTrainingDays) * 100))
    : 0

  const weekMap = new Map<number, PlanDayWithStatus[]>()
  for (const day of planDays) {
    const session = sessionByDayId.get(day.id)
    const status = computeDayStatus(
      day.scheduled_date,
      todayISO,
      day.slot_status as 'scheduled' | 'completed' | 'cancelled' | 'superseded',
      (session?.status as 'in_progress' | 'completed' | null) ?? null
    ) as PlanDayWithStatus['status']

    if (!weekMap.has(day.week_number)) weekMap.set(day.week_number, [])
    weekMap.get(day.week_number)!.push({
      clientPlanDayId: day.id,
      weekNumber: day.week_number,
      dayOfWeek: day.day_of_week,
      dateISO: day.scheduled_date,
      status,
      existingSessionId: session?.id ?? null,
    })
  }

  const weeksByNumber: PlanWeekData[] = []
  for (let w = 1; w <= plan.weeks; w++) {
    weeksByNumber.push({ weekNumber: w, days: weekMap.get(w) ?? [] })
  }

  return {
    planId: plan.id,
    planName: plan.name,
    startDate: plan.start_date,
    endDate: plan.end_date,
    weeks: plan.weeks,
    currentWeek,
    progressPct,
    completedSessions,
    totalTrainingDays,
    weeksByNumber,
  }
}
```

- [ ] **Step 2: TypeScript check + commit**

```bash
cd "C:/Users/herna/Loboost App" && npx tsc --noEmit 2>&1 | head -20
git add "src/app/(client)/client/plan/queries.ts"
git commit -m "feat(plan-view): timezone-aware plan view with slot_status

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 11: Actualizar history queries

**Files:**
- Modify: `src/app/(client)/client/history/queries.ts`
- Modify: `src/app/(client)/client/history/week/[weekNumber]/queries.ts`

- [ ] **Step 1: Actualizar getWeeklyHistorySummaries**

Reemplazar el contenido completo de `src/app/(client)/client/history/queries.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { computeDayDate } from '@/features/clients/utils/training-utils'
import type { WeekHistorySummary } from '@/features/training/types'

export async function getWeeklyHistorySummaries(
  clientId: string
): Promise<WeekHistorySummary[]> {
  const supabase = await createClient()

  const { data: plan } = await supabase
    .from('client_plans')
    .select('id, weeks, start_date')
    .eq('client_id', clientId)
    .eq('status', 'active')
    .maybeSingle()

  if (!plan) return []

  // Read slot_status directly — source of truth for compliance
  const { data: planDays } = await supabase
    .from('client_plan_days')
    .select('id, week_number, day_of_week, slot_status')
    .eq('client_plan_id', plan.id)
    .order('week_number')
    .order('day_of_week')

  if (!planDays || planDays.length === 0) return []

  const result: WeekHistorySummary[] = []
  for (let w = 1; w <= plan.weeks; w++) {
    const weekDays = planDays.filter(d => d.week_number === w)
    // Exclude cancelled + superseded from denominator
    const activeDays = weekDays.filter(
      d => d.slot_status !== 'cancelled' && d.slot_status !== 'superseded'
    )
    const completedDays = activeDays.filter(d => d.slot_status === 'completed').length

    if (completedDays === 0) continue

    result.push({
      weekNumber: w,
      dateRangeStart: computeDayDate(plan.start_date, w, 1),
      dateRangeEnd:   computeDayDate(plan.start_date, w, 7),
      completedDays,
      totalTrainingDays: activeDays.length,
      compliancePct: activeDays.length > 0
        ? Math.round((completedDays / activeDays.length) * 100)
        : 0,
    })
  }

  return result.sort((a, b) => b.weekNumber - a.weekNumber)
}
```

- [ ] **Step 2: Actualizar getWeekDetailData**

En `src/app/(client)/client/history/week/[weekNumber]/queries.ts`, modificar el bloque donde se construye `dateISO` para cada sesión — usar `scheduled_date` del slot en lugar de `computeDayDate`:

El SELECT de `client_plan_days` ya tiene `id, day_of_week`. Agregar `scheduled_date`:

```typescript
// ANTES:
const { data: days } = await supabase
  .from('client_plan_days')
  .select('id, day_of_week')
  .eq('client_plan_id', plan.id)
  .eq('week_number', weekNumber)
  .order('day_of_week')

// DESPUÉS:
const { data: days } = await supabase
  .from('client_plan_days')
  .select('id, day_of_week, scheduled_date')
  .eq('client_plan_id', plan.id)
  .eq('week_number', weekNumber)
  .order('day_of_week')
```

Y en el `Map` de días, cambiar `{ day.id, day.day_of_week }` a `{ day.id, day.day_of_week, day.scheduled_date }`:

```typescript
// ANTES:
const dayById = new Map(days.map((d) => [d.id, d]))

// y en detailSessions.map:
const dateISO = dayInfo
  ? computeDayDate(plan.start_date, weekNumber, dayInfo.day_of_week)
  : sess.date

// DESPUÉS — dateISO viene de scheduled_date (canonical):
const dayById = new Map(days.map((d) => [d.id, d]))

// en detailSessions.map (mismo bloque):
const dateISO = dayInfo?.scheduled_date ?? sess.date
```

También eliminar el import de `computeDayDate` si ya no se usa en este archivo (los `dateRangeStart/End` sí usan `computeDayDate` — mantenerlo).

- [ ] **Step 3: TypeScript check + commit**

```bash
cd "C:/Users/herna/Loboost App" && npx tsc --noEmit 2>&1 | head -20
git add "src/app/(client)/client/history/queries.ts" "src/app/(client)/client/history/week/[weekNumber]/queries.ts"
git commit -m "feat(history): slot_status based compliance + scheduled_date for dateISO

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 12: Actualizar day-detail queries

**Files:**
- Modify: `src/app/(client)/client/plan/[weekNumber]/[clientPlanDayId]/queries.ts`

- [ ] **Step 1: Reemplazar el contenido completo**

```typescript
import { createClient } from '@/lib/supabase/server'
import { computeDayStatus } from '@/features/clients/utils/training-utils'
import { safeGetToday } from '@/lib/timezone/utils'
import type { DayDetailData, DayExerciseDetail } from '@/features/training/types'

export async function getDayDetailData(
  clientPlanDayId: string,
  clientId: string
): Promise<DayDetailData | null> {
  const supabase = await createClient()

  type DayRow = {
    id: string
    week_number: number
    day_of_week: number
    scheduled_date: string
    slot_status: string
    client_plans: {
      client_id: string
      client_profiles: { timezone: string | null } | null
    } | null
  }

  const { data: day } = await supabase
    .from('client_plan_days')
    .select(`
      id, week_number, day_of_week, scheduled_date, slot_status,
      client_plans!inner (
        client_id,
        client_profiles ( timezone )
      )
    `)
    .eq('id', clientPlanDayId)
    .single()

  const dayRow = day as DayRow | null
  if (!dayRow || dayRow.client_plans?.client_id !== clientId) return null

  const clientTimezone = dayRow.client_plans?.client_profiles?.timezone ?? 'UTC'
  const todayISO = safeGetToday(clientTimezone)

  const [exercisesResult, sessionResult] = await Promise.all([
    supabase
      .from('client_plan_day_exercises')
      .select(
        'id, exercise_id, order, sets, reps, duration_seconds, rest_seconds, exercises(id, name, muscle_group, type, video_url)'
      )
      .eq('client_plan_day_id', clientPlanDayId)
      .order('order'),
    supabase
      .from('sessions')
      .select('id, status')
      .eq('client_plan_day_id', clientPlanDayId)
      .eq('client_id', clientId)
      .in('status', ['in_progress', 'completed'])
      .maybeSingle(),
  ])

  type ExRow = {
    id: string
    exercise_id: string
    order: number
    sets: number
    reps: number | null
    duration_seconds: number | null
    rest_seconds: number | null
    exercises: { id: string; name: string; muscle_group: string; type: string; video_url: string | null } | null
  }

  const exercises: DayExerciseDetail[] = ((exercisesResult.data as ExRow[]) ?? []).map((ex) => ({
    clientPlanDayExerciseId: ex.id,
    exerciseId: ex.exercise_id,
    name: ex.exercises?.name ?? 'Ejercicio',
    muscleGroup: ex.exercises?.muscle_group ?? '',
    type: (ex.exercises?.type as 'strength' | 'cardio') ?? 'strength',
    order: ex.order,
    plannedSets: ex.sets,
    plannedReps: ex.reps ?? null,
    plannedDurationSeconds: ex.duration_seconds ?? null,
    restSeconds: ex.rest_seconds ?? null,
    videoUrl: ex.exercises?.video_url ?? null,
  }))

  return {
    clientPlanDayId,
    weekNumber: dayRow.week_number,
    dayOfWeek: dayRow.day_of_week,
    dateISO: dayRow.scheduled_date,
    dayStatus: computeDayStatus(
      dayRow.scheduled_date,
      todayISO,
      dayRow.slot_status as 'scheduled' | 'completed' | 'cancelled' | 'superseded',
      (sessionResult.data?.status as 'in_progress' | 'completed' | null) ?? null
    ),
    exercises,
    sessionId: sessionResult.data?.id ?? null,
    sessionStatus: (sessionResult.data?.status as 'in_progress' | 'completed' | null) ?? null,
  }
}
```

- [ ] **Step 2: TypeScript check + commit**

```bash
cd "C:/Users/herna/Loboost App" && npx tsc --noEmit 2>&1 | head -20
git add "src/app/(client)/client/plan/[weekNumber]/[clientPlanDayId]/queries.ts"
git commit -m "feat(day-detail): slot_status + timezone-aware day detail query

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 13: Actualizar coach client profile queries + compliance

**Files:**
- Modify: `src/app/(coach)/coach/clients/[id]/queries.ts`

- [ ] **Step 1: Actualizar los imports al top del archivo**

```typescript
import { createClient } from '@/lib/supabase/server'
import { calculateWeeklyCompliance } from '@/lib/analytics/compliance'
import {
  getCurrentWeek,
  computeDayDate,
  computeDayStatus,
} from '@/features/clients/utils/training-utils'
import { safeGetToday } from '@/lib/timezone/utils'
import type {
  ClientProfileData,
  ActivePlanSummary,
  TrainingWeekData,
  DayTrainingData,
  ExerciseWithSets,
  SessionSetData,
  DayStatus,
} from '@/features/clients/types'
```

- [ ] **Step 2: Agregar timezone al fetch en getClientProfileData**

En `getClientProfileData`, el query de `client_profiles` ya selecciona varios campos. Agregar `timezone` al SELECT:

```typescript
// ANTES:
supabase
  .from('client_profiles')
  .select('age, sex, goal, weight_kg, height_cm, experience_level, days_per_week, injuries')
  .eq('id', clientId)
  .maybeSingle(),

// DESPUÉS:
supabase
  .from('client_profiles')
  .select('age, sex, goal, weight_kg, height_cm, experience_level, days_per_week, injuries, timezone, country_code')
  .eq('id', clientId)
  .maybeSingle(),
```

- [ ] **Step 3: Reemplazar la lógica de weeklyCompliance**

En `getClientProfileData`, reemplazar el bloque que calcula `weeklyCompliance` (actualmente usa `recentSessions`):

```typescript
// Eliminar estas líneas:
const sevenDaysAgo = now - 7 * 86400000
const completedInLastWeek = recentSessions.filter(
  (s) => s.completed_at && new Date(s.completed_at).getTime() >= sevenDaysAgo
).length
const weeklyCompliance = calculateWeeklyCompliance({
  expectedDays: daysPerWeek,
  completedDays: completedInLastWeek,
})

// Reemplazar con:
const clientTimezone = cp?.timezone ?? 'UTC'
const todayISO = safeGetToday(clientTimezone)
```

Y más adelante, donde se construye `activePlan`, agregar `currentWeek` con timezone:

```typescript
// En el bloque if (plan):
const currentWeek = getCurrentWeek(plan.start_date, plan.weeks, todayISO)
activePlan = {
  id: plan.id,
  name: plan.name,
  weeks: plan.weeks,
  startDate: plan.start_date,
  endDate: plan.end_date,
  status: plan.status as 'active' | 'completed' | 'paused',
  currentWeek,
}
```

Y después de construir `currentWeekData`, calcular la compliance correctamente:

```typescript
// Reemplazar el cálculo de weeklyCompliance:
let weeklyCompliance = 0
if (activePlan && plan) {
  const { data: weekSlots } = await supabase
    .from('client_plan_days')
    .select('slot_status')
    .eq('client_plan_id', plan.id)
    .eq('week_number', activePlan.currentWeek)

  const expected = (weekSlots ?? []).filter(
    s => s.slot_status === 'scheduled' || s.slot_status === 'completed'
  ).length
  const completed = (weekSlots ?? []).filter(
    s => s.slot_status === 'completed'
  ).length
  weeklyCompliance = calculateWeeklyCompliance({ expectedDays: expected, completedDays: completed })
}
```

- [ ] **Step 4: Actualizar getWeekTrainingData — usar slot_status + timezone**

En `getWeekTrainingData`, reemplazar el cálculo de `todayISO`:

```typescript
// ANTES:
const today = new Date()
today.setUTCHours(0, 0, 0, 0)
const todayISO = today.toISOString().split('T')[0]

// DESPUÉS — recibe clientTimezone como parámetro:
// Cambiar firma de la función:
export async function getWeekTrainingData(
  clientPlanId: string,
  weekNumber: number,
  startDate: string,
  totalWeeks: number,
  clientId: string,
  clientTimezone: string   // ← nuevo parámetro
): Promise<TrainingWeekData>
```

Y dentro de la función:

```typescript
const todayISO = safeGetToday(clientTimezone)
```

Actualizar el SELECT de `client_plan_days` para incluir `scheduled_date, slot_status`:

```typescript
const { data: planDays } = await supabase
  .from('client_plan_days')
  .select('id, day_of_week, order, scheduled_date, slot_status')
  .eq('client_plan_id', clientPlanId)
  .eq('week_number', weekNumber)
  .order('order')
```

En el `days` map final, usar `scheduled_date` y `slot_status`:

```typescript
const days: DayTrainingData[] = [1, 2, 3, 4, 5, 6, 7].map((dow) => {
  const planDay = planDayByDow.get(dow)
  if (!planDay) {
    return {
      dayOfWeek: dow,
      date: computeDayDate(startDate, weekNumber, dow),  // rest days don't have slots
      status: 'rest' as DayStatus,
      clientPlanDayId: null,
      sessionId: null,
      exercises: [],
    }
  }
  const session = sessionByDayId.get(planDay.id) ?? null
  const exercises = exercisesByDayId.get(planDay.id) ?? []
  const status = computeDayStatus(
    planDay.scheduled_date,
    todayISO,
    planDay.slot_status as 'scheduled' | 'completed' | 'cancelled' | 'superseded',
    (session?.status as 'completed' | 'in_progress' | null) ?? null
  )
  return {
    dayOfWeek: dow,
    date: planDay.scheduled_date,
    status,
    clientPlanDayId: planDay.id,
    sessionId: session?.id ?? null,
    exercises,
  }
})
```

Y el call site de `getWeekTrainingData` en `getClientProfileData`:

```typescript
currentWeekData = await getWeekTrainingData(
  activePlan.id,
  activePlan.currentWeek,
  activePlan.startDate,
  activePlan.weeks,
  clientId,
  clientTimezone    // ← pasar timezone
)
```

- [ ] **Step 5: TypeScript check + commit**

```bash
cd "C:/Users/herna/Loboost App" && npx tsc --noEmit 2>&1 | head -20
git add "src/app/(coach)/coach/clients/[id]/queries.ts"
git commit -m "feat(coach-client): timezone-aware queries + slot_status compliance

- getClientProfileData uses client timezone for todayISO
- getCurrentWeek with explicit todayISO
- weeklyCompliance based on slot_status (not session count)
- getWeekTrainingData takes clientTimezone param

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 14: Crear supersede-plan-day action

**Files:**
- Create: `src/features/plans/actions/supersede-plan-day.ts`

- [ ] **Step 1: Crear el archivo**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { safeGetToday } from '@/lib/timezone/utils'

type SupersedeResult =
  | { success: true }
  | { error: string }

/**
 * Marca un slot futuro como superseded cuando el coach elimina ese día del plan.
 *
 * Guards (los 3 deben cumplirse):
 * 1. slot_status = 'scheduled' — solo slots pendientes
 * 2. scheduled_date >= hoy en el TZ del cliente — no tocar el pasado
 * 3. No hay sesión in_progress vinculada — no interrumpir un entreno activo
 */
export async function supersedePlanDayAction(
  clientPlanDayId: string
): Promise<SupersedeResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'No autenticado' }

  // Fetch slot con plan + timezone del cliente para calcular "hoy" correctamente
  type SlotRow = {
    id: string
    scheduled_date: string
    slot_status: string
    client_plans: {
      coach_id: string
      client_profiles: { timezone: string | null } | null
    } | null
  }

  const { data: slot, error: slotError } = await supabase
    .from('client_plan_days')
    .select(`
      id, scheduled_date, slot_status,
      client_plans!inner (
        coach_id,
        client_profiles ( timezone )
      )
    `)
    .eq('id', clientPlanDayId)
    .single()

  if (slotError || !slot) return { error: 'Slot no encontrado' }

  const slotRow = slot as SlotRow

  // Verificar que el coach autenticado es dueño del plan (RLS también garantiza esto)
  if (slotRow.client_plans?.coach_id !== user.id) return { error: 'No autorizado' }

  // Guard 1: solo scheduled
  if (slotRow.slot_status !== 'scheduled') {
    return { error: 'Solo se pueden cancelar slots pendientes' }
  }

  // Guard 2: no pasado (>= hoy en TZ del cliente)
  const clientTz = slotRow.client_plans?.client_profiles?.timezone ?? 'UTC'
  const todayISO = safeGetToday(clientTz)
  if (slotRow.scheduled_date < todayISO) {
    return { error: 'No se pueden cancelar días pasados' }
  }

  // Guard 3: no hay sesión in_progress activa
  const { data: activeSession } = await supabase
    .from('sessions')
    .select('id')
    .eq('client_plan_day_id', clientPlanDayId)
    .eq('status', 'in_progress')
    .maybeSingle()

  if (activeSession) {
    return { error: 'El cliente ya inició este entrenamiento' }
  }

  // Marcar superseded
  const { error: updateError } = await supabase
    .from('client_plan_days')
    .update({ slot_status: 'superseded', updated_at: new Date().toISOString() })
    .eq('id', clientPlanDayId)

  if (updateError) return { error: 'Error al actualizar el slot' }

  return { success: true }
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "C:/Users/herna/Loboost App" && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/herna/Loboost App"
git add src/features/plans/actions/supersede-plan-day.ts
git commit -m "feat(plans): add supersede-plan-day server action

Marks a scheduled future slot as superseded when coach removes a day.
Three guards: slot must be scheduled + not past + no in_progress session.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 15: Verificación final

- [ ] **Step 1: TypeScript — cero errores**

```bash
cd "C:/Users/herna/Loboost App" && npx tsc --noEmit 2>&1
```

Esperado: output vacío (sin errores).

- [ ] **Step 2: Todos los tests pasan**

```bash
cd "C:/Users/herna/Loboost App" && npx jest --no-coverage 2>&1 | tail -20
```

Esperado: todos los tests pasan. Prestar atención a:
- `training-utils.test.ts` — 17 tests
- `create-client-schema.test.ts` — 12 tests
- `compliance.test.ts` — 4 tests (sin cambios, deben seguir pasando)

- [ ] **Step 3: Verificación en DB — complete_session RPC**

Ejecutar via Supabase MCP `execute_sql`:

```sql
-- Verificar que la función existe
select routine_name, routine_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name = 'complete_session';
```

Esperado: 1 fila con `routine_name = 'complete_session'`, `routine_type = 'FUNCTION'`.

- [ ] **Step 4: Verificar backfill de slot_status**

```sql
select slot_status, count(*)
from public.client_plan_days
group by slot_status
order by count(*) desc;
```

Esperado: mayoría `scheduled`, algunos `completed` (los que tenían sesión completada).

- [ ] **Step 5: Verificar que los tipos DB tienen los nuevos campos**

Abrir `src/types/database.ts` y confirmar que:
- `client_profiles` tiene `timezone: string`, `country_code: string | null`
- `client_plan_days` tiene `scheduled_date: string`, `slot_status: string`, `updated_at: string`

- [ ] **Step 6: Commit final**

```bash
cd "C:/Users/herna/Loboost App"
git add -A
git commit -m "chore: final verification pass — all tests green, zero TS errors

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Resumen de cambios por tarea

| Task | Archivos | Resultado |
|---|---|---|
| 1 | `assign-plan.ts` | scheduled_date en cada slot |
| 2 | 2 migration files | country_code + complete_session fn |
| 3 | Supabase (MCP) + `database.ts` | Schema aplicado, tipos actualizados |
| 4 | `data.ts`, `utils.ts` | Timezone data layer |
| 5 | `training-utils.ts` + test | getCurrentWeek/computeDayStatus pure |
| 6 | `complete-session.ts` | RPC atómica |
| 7 | `schemas.ts`, `create-client.ts`, test | countryCode + timezone en schema |
| 8 | `create-client-form.tsx` | Country+city selector en UI |
| 9 | `dashboard/queries.ts` | TZ + slot_status |
| 10 | `plan/queries.ts` | TZ + slot_status + progress correcto |
| 11 | `history/queries.ts` + `week/queries.ts` | slot_status compliance |
| 12 | `day-detail/queries.ts` | slot_status + timezone |
| 13 | `coach/clients/[id]/queries.ts` | Compliance + timezone coach view |
| 14 | `supersede-plan-day.ts` | Nueva action con 3 guards |
| 15 | — | Verificación final |
