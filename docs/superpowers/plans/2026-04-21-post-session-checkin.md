# Post-Session Check-in Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar la pantalla de éxito directa al finalizar un entrenamiento por un modal de check-in rápido (RPE + energía + sueño + dolor muscular), guardar los datos en la sesión y mostrarlos al coach en el detalle de sesión.

**Architecture:** Se agregan 3 columnas opcionales a `sessions` (energy_level, sleep_quality, soreness_level, smallint 1-5). El `handleFinish` actual llama `completeSessionAction` directamente; se modifica para activar un estado `showCheckIn` que muestra un modal overlay con 4 controles (RPE 1-10, 3 sliders 1-5). Al confirmar, el modal llama `completeSessionAction` con todos los valores y muestra la pantalla de éxito. El coach ve los nuevos campos en `/coach/clients/[id]/sessions/[sessionId]`.

**Tech Stack:** Next.js 14, Supabase JS v2, TypeScript, Framer Motion (ya instalado).

---

## Files

- **Create:** `supabase/migrations/20260422000002_session_checkin.sql`
- **Modify:** `src/features/training/schemas.ts` — añadir campos al `completeSessionSchema`
- **Modify:** `src/features/training/actions/complete-session.ts` — guardar nuevos campos
- **Modify:** `src/app/(training)/client/training/[sessionId]/live-training.tsx` — modal check-in
- **Modify:** `src/app/(coach)/coach/clients/[id]/sessions/[sessionId]/queries.ts` — seleccionar nuevos campos
- **Modify:** `src/app/(coach)/coach/clients/[id]/sessions/[sessionId]/page.tsx` — mostrar nuevos campos

---

### Task 1: Migración DB — nuevas columnas en `sessions`

**Files:**
- Create: `supabase/migrations/20260422000002_session_checkin.sql`

- [ ] **Step 1: Crear migración**

```sql
-- supabase/migrations/20260422000002_session_checkin.sql

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS energy_level  smallint CHECK (energy_level  BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS sleep_quality smallint CHECK (sleep_quality BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS soreness_level smallint CHECK (soreness_level BETWEEN 1 AND 5);
```

- [ ] **Step 2: Aplicar migración**

```bash
npx supabase db push
```

Expected: sin errores.

- [ ] **Step 3: Regenerar tipos de Supabase**

```bash
npx supabase gen types typescript --local > src/lib/supabase/database.types.ts
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260422000002_session_checkin.sql src/lib/supabase/database.types.ts
git commit -m "feat(db): add energy_level, sleep_quality, soreness_level to sessions"
```

---

### Task 2: Schema y action actualizados

**Files:**
- Modify: `src/features/training/schemas.ts`
- Modify: `src/features/training/actions/complete-session.ts`

- [ ] **Step 1: Actualizar `completeSessionSchema` en `schemas.ts`**

Reemplazar el schema existente:

```typescript
export const completeSessionSchema = z.object({
  sessionId: z.string().uuid(),
  rpe: z.coerce.number().int().min(1).max(10).optional(),
  notes: z.string().max(500).optional(),
  energyLevel: z.coerce.number().int().min(1).max(5).optional(),
  sleepQuality: z.coerce.number().int().min(1).max(5).optional(),
  sorenessLevel: z.coerce.number().int().min(1).max(5).optional(),
})

export type CompleteSessionInput = z.infer<typeof completeSessionSchema>
```

- [ ] **Step 2: Actualizar `completeSessionAction` en `complete-session.ts`**

Reemplazar el contenido completo:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'

export async function completeSessionAction(
  sessionId: string,
  rpe?: number,
  notes?: string,
  energyLevel?: number,
  sleepQuality?: number,
  sorenessLevel?: number
) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('sessions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      rpe: rpe ?? null,
      notes: notes ?? null,
      energy_level: energyLevel ?? null,
      sleep_quality: sleepQuality ?? null,
      soreness_level: sorenessLevel ?? null,
    })
    .eq('id', sessionId)
    .eq('client_id', user.id)

  if (error) return { error: 'Error al completar la sesión' }

  return { success: true }
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/features/training/schemas.ts src/features/training/actions/complete-session.ts
git commit -m "feat(training): completeSessionAction accepts energy, sleep, soreness check-in fields"
```

---

### Task 3: Modal de check-in en `LiveTraining`

**Files:**
- Modify: `src/app/(training)/client/training/[sessionId]/live-training.tsx`

- [ ] **Step 1: Añadir estados del check-in**

En el bloque de estados (~línea 113), añadir:

```typescript
const [showCheckIn, setShowCheckIn] = useState(false)
const [checkInRpe, setCheckInRpe] = useState<number>(7)
const [checkInEnergy, setCheckInEnergy] = useState<number>(3)
const [checkInSleep, setCheckInSleep] = useState<number>(3)
const [checkInSoreness, setCheckInSoreness] = useState<number>(3)
```

- [ ] **Step 2: Cambiar `handleFinish` para mostrar el check-in antes de completar**

Localizar `handleFinish` (~línea 278). Reemplazar:

```typescript
function handleFinish() {
  setShowCheckIn(true)
}

async function handleCheckInSubmit(skip: boolean) {
  setShowCheckIn(false)
  startTransition(async () => {
    await completeSessionAction(
      session.sessionId,
      skip ? undefined : checkInRpe,
      undefined,
      skip ? undefined : checkInEnergy,
      skip ? undefined : checkInSleep,
      skip ? undefined : checkInSoreness
    )
    setIsFinished(true)
  })
}
```

- [ ] **Step 3: Añadir constantes de labels para los sliders**

Añadir antes del `return` principal del componente:

```typescript
const ENERGY_LABELS: Record<number, string> = {
  1: '💀 Agotado',
  2: '😴 Bajo',
  3: '😐 Normal',
  4: '💪 Bien',
  5: '🔥 Excelente',
}

const SLEEP_LABELS: Record<number, string> = {
  1: '😵 Pésimo',
  2: '🥱 Mal',
  3: '😐 Regular',
  4: '😌 Bien',
  5: '✨ Muy bien',
}

const SORENESS_LABELS: Record<number, string> = {
  1: '🔴 Mucho dolor',
  2: '🟠 Bastante',
  3: '🟡 Algo',
  4: '🟢 Poco',
  5: '✅ Sin dolor',
}
```

- [ ] **Step 4: Añadir el modal de check-in en el JSX**

Localizar el bloque `if (isFinished) {` (~línea 336). Añadir el bloque del modal ANTES de ese `if`:

```typescript
if (showCheckIn) {
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: LT.bg,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          flexShrink: 0,
          paddingTop: `calc(20px + ${SAFE_AREA_TOP})`,
          paddingLeft: 20,
          paddingRight: 20,
          paddingBottom: 20,
          borderBottom: `1px solid ${LT.border}`,
          textAlign: 'center',
        }}
      >
        <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: LT.text }}>
          ¿Cómo te sentís?
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: LT.muted }}>
          Rápido — después de este entrenamiento
        </p>
      </div>

      {/* Sliders */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '28px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 32,
        }}
      >
        {/* RPE */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: LT.secondary }}>
              ESFUERZO PERCIBIDO (RPE)
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: LT.lime }}>
              {checkInRpe}/10
            </p>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={checkInRpe}
            onChange={(e) => setCheckInRpe(Number(e.target.value))}
            style={{ width: '100%', accentColor: LT.lime }}
          />
        </div>

        {/* Energía */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: LT.secondary }}>
              ENERGÍA
            </p>
            <p style={{ margin: 0, fontSize: 14, color: LT.text }}>
              {ENERGY_LABELS[checkInEnergy]}
            </p>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            value={checkInEnergy}
            onChange={(e) => setCheckInEnergy(Number(e.target.value))}
            style={{ width: '100%', accentColor: LT.lime }}
          />
        </div>

        {/* Sueño */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: LT.secondary }}>
              CÓMO DORMISTE
            </p>
            <p style={{ margin: 0, fontSize: 14, color: LT.text }}>
              {SLEEP_LABELS[checkInSleep]}
            </p>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            value={checkInSleep}
            onChange={(e) => setCheckInSleep(Number(e.target.value))}
            style={{ width: '100%', accentColor: LT.lime }}
          />
        </div>

        {/* Dolor muscular */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: LT.secondary }}>
              DOLOR MUSCULAR
            </p>
            <p style={{ margin: 0, fontSize: 14, color: LT.text }}>
              {SORENESS_LABELS[checkInSoreness]}
            </p>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            value={checkInSoreness}
            onChange={(e) => setCheckInSoreness(Number(e.target.value))}
            style={{ width: '100%', accentColor: LT.lime }}
          />
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          flexShrink: 0,
          padding: `16px 20px calc(16px + ${SAFE_AREA_BOTTOM})`,
          borderTop: `1px solid ${LT.border}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          backgroundColor: LT.bg,
        }}
      >
        <button
          type="button"
          onClick={() => handleCheckInSubmit(false)}
          disabled={isPending}
          style={{
            width: '100%',
            height: 52,
            background: isPending
              ? 'rgba(181,242,61,0.35)'
              : `linear-gradient(180deg, ${LT.lime} 0%, #9FD82E 100%)`,
            border: 'none',
            borderRadius: 14,
            color: '#0A0A0A',
            fontWeight: 900,
            fontSize: 16,
            cursor: isPending ? 'not-allowed' : 'pointer',
          }}
        >
          {isPending ? 'Guardando...' : 'Guardar y salir'}
        </button>
        <button
          type="button"
          onClick={() => handleCheckInSubmit(true)}
          disabled={isPending}
          style={{
            width: '100%',
            height: 40,
            background: 'transparent',
            border: 'none',
            color: LT.muted,
            fontSize: 13,
            cursor: isPending ? 'not-allowed' : 'pointer',
          }}
        >
          Saltar
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(training\)/client/training/\[sessionId\]/live-training.tsx
git commit -m "feat(training): add post-session check-in modal (RPE + energy + sleep + soreness)"
```

---

### Task 4: Coach ve los nuevos campos en detalle de sesión

**Files:**
- Modify: `src/app/(coach)/coach/clients/[id]/sessions/[sessionId]/queries.ts`
- Modify: `src/app/(coach)/coach/clients/[id]/sessions/[sessionId]/page.tsx`

- [ ] **Step 1: Añadir nuevos campos al tipo `SessionDetail` en `queries.ts`**

Localizar `SessionDetail` (~línea 22). Reemplazar:

```typescript
export type SessionDetail = {
  id: string
  date: string
  status: 'completed' | 'in_progress'
  rpe: number | null
  notes: string | null
  energyLevel: number | null    // ← nuevo
  sleepQuality: number | null   // ← nuevo
  sorenessLevel: number | null  // ← nuevo
  weekNumber: number
  dayOfWeek: number
  exercises: SessionExerciseDetail[]
}
```

- [ ] **Step 2: Seleccionar nuevos campos en el query de `getSessionDetailForCoach`**

Localizar el `.select(` de la query de sesión (~línea 49). Reemplazar:

```typescript
const { data: session, error: sessErr } = await supabase
  .from('sessions')
  .select(`
    id, date, status, rpe, notes, energy_level, sleep_quality, soreness_level,
    client_plan_days ( day_of_week, week_number,
      client_plan_day_exercises (
        id, sets, reps_min, reps_max, duration_seconds,
        exercises ( name, type )
      )
    )
  `)
  .eq('id', sessionId)
  .eq('client_id', clientId)
  .single()
```

- [ ] **Step 3: Mapear campos al return de `getSessionDetailForCoach`**

Localizar el `return {` final (~línea 110). Reemplazar:

```typescript
return {
  id: session.id,
  date: session.date,
  status: session.status as 'completed' | 'in_progress',
  rpe: session.rpe,
  notes: session.notes,
  energyLevel: (session as { energy_level: number | null }).energy_level ?? null,
  sleepQuality: (session as { sleep_quality: number | null }).sleep_quality ?? null,
  sorenessLevel: (session as { soreness_level: number | null }).soreness_level ?? null,
  weekNumber: day?.week_number ?? 0,
  dayOfWeek: day?.day_of_week ?? 0,
  exercises,
}
```

- [ ] **Step 4: Mostrar check-in en `page.tsx`**

Localizar el bloque que muestra RPE/notes (~línea 94). Reemplazar todo el bloque del card de métricas:

```typescript
{(session.rpe != null ||
  session.notes ||
  session.energyLevel != null ||
  session.sleepQuality != null ||
  session.sorenessLevel != null) && (
  <div
    style={{
      backgroundColor: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: 14,
      padding: '14px 16px',
      marginBottom: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}
  >
    {session.rpe != null && (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ margin: 0, fontSize: 13, color: T.muted }}>RPE percibido</p>
        <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.lime }}>
          {session.rpe}/10
        </p>
      </div>
    )}
    {session.energyLevel != null && (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ margin: 0, fontSize: 13, color: T.muted }}>Energía</p>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: T.text }}>
          {['', '💀 Agotado', '😴 Bajo', '😐 Normal', '💪 Bien', '🔥 Excelente'][session.energyLevel]}
        </p>
      </div>
    )}
    {session.sleepQuality != null && (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ margin: 0, fontSize: 13, color: T.muted }}>Sueño</p>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: T.text }}>
          {['', '😵 Pésimo', '🥱 Mal', '😐 Regular', '😌 Bien', '✨ Muy bien'][session.sleepQuality]}
        </p>
      </div>
    )}
    {session.sorenessLevel != null && (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ margin: 0, fontSize: 13, color: T.muted }}>Dolor muscular</p>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: T.text }}>
          {['', '🔴 Mucho', '🟠 Bastante', '🟡 Algo', '🟢 Poco', '✅ Sin dolor'][session.sorenessLevel]}
        </p>
      </div>
    )}
    {session.notes && (
      <p
        style={{
          margin: 0,
          fontSize: 13,
          color: T.secondary,
          fontStyle: 'italic',
          lineHeight: 1.5,
          borderTop: `1px solid ${T.border}`,
          paddingTop: 10,
        }}
      >
        &ldquo;{session.notes}&rdquo;
      </p>
    )}
  </div>
)}
```

- [ ] **Step 5: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(coach\)/coach/clients/\[id\]/sessions/\[sessionId\]/queries.ts src/app/\(coach\)/coach/clients/\[id\]/sessions/\[sessionId\]/page.tsx
git commit -m "feat(coach): display energy, sleep, soreness check-in data in session detail"
```

---

## Self-Review

- ✅ Todos los campos nuevos son opcionales — sesiones anteriores sin check-in siguen funcionando
- ✅ El modal tiene opción "Saltar" que guarda la sesión sin datos de check-in
- ✅ Labels de emoji consistentes entre cliente (modal) y coach (vista de detalle)
- ✅ RPE defaults a 7 (valor central-alto), sliders de bienestar a 3 (neutral)
- ✅ Migración usa `IF NOT EXISTS` — idempotente si se corre dos veces
- ✅ El cast de tipo en el return de la query es necesario porque el generador de tipos de Supabase puede no tener los campos nuevos inmediatamente; la regeneración en Task 1 Step 3 lo resuelve
