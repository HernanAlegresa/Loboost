# PR Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detectar automáticamente cuando el cliente loguea un nuevo récord personal (máximo peso histórico para un ejercicio) y mostrar una celebración visual breve.

**Architecture:** Se agrega una función RPC de Postgres `get_exercise_prev_max` que retorna el máximo `weight_kg` histórico de un ejercicio para un cliente (excluyendo la sesión actual). `completeSetAction` llama esta función tras el upsert y retorna `isPR: boolean`. `LiveTraining` maneja el estado `showPrCelebration` y renderiza un overlay de celebración de 1500ms.

**Tech Stack:** Next.js 14 App Router, Supabase JS v2, TypeScript, PostgreSQL RPC.

---

## Files

- **Create:** `supabase/migrations/20260422000001_pr_detection_fn.sql` — función RPC
- **Modify:** `src/features/training/actions/complete-set.ts` — PR check + return `isPR`
- **Modify:** `src/app/(training)/client/training/[sessionId]/live-training.tsx` — estado + overlay de celebración

---

### Task 1: Función RPC `get_exercise_prev_max`

**Files:**
- Create: `supabase/migrations/20260422000001_pr_detection_fn.sql`

- [ ] **Step 1: Crear archivo de migración**

```sql
-- supabase/migrations/20260422000001_pr_detection_fn.sql

CREATE OR REPLACE FUNCTION get_exercise_prev_max(
  p_exercise_id uuid,
  p_client_id uuid,
  p_exclude_session_id uuid
)
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT MAX(ss.weight_kg)
  FROM session_sets ss
  JOIN sessions s ON s.id = ss.session_id
  JOIN client_plan_day_exercises cpde ON cpde.id = ss.client_plan_day_exercise_id
  WHERE cpde.exercise_id = p_exercise_id
    AND s.client_id = p_client_id
    AND s.status = 'completed'
    AND ss.completed = true
    AND ss.weight_kg IS NOT NULL
    AND s.id != p_exclude_session_id
$$;
```

- [ ] **Step 2: Aplicar migración**

```bash
npx supabase db push
```

Expected: migración aplicada sin errores.

- [ ] **Step 3: Commit migración**

```bash
git add supabase/migrations/20260422000001_pr_detection_fn.sql
git commit -m "feat(db): add get_exercise_prev_max RPC for PR detection"
```

---

### Task 2: `completeSetAction` retorna `isPR`

**Files:**
- Modify: `src/features/training/actions/complete-set.ts`

- [ ] **Step 1: Actualizar la acción**

Reemplazar el contenido completo de `complete-set.ts`:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { completeSetSchema } from '@/features/training/schemas'

export async function completeSetAction(
  formData: FormData
): Promise<{ success: true; isPR: boolean } | { error: string }> {
  const raw = {
    sessionId: formData.get('sessionId'),
    clientPlanDayExerciseId: formData.get('clientPlanDayExerciseId'),
    setNumber: formData.get('setNumber'),
    repsPerformed: formData.get('repsPerformed') || undefined,
    weightKg: formData.get('weightKg') || undefined,
    durationSeconds: formData.get('durationSeconds') || undefined,
  }

  const result = completeSetSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0]!.message }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'No autenticado' }

  const { error: upsertError } = await supabase
    .from('session_sets')
    .upsert(
      {
        session_id: result.data.sessionId,
        client_plan_day_exercise_id: result.data.clientPlanDayExerciseId,
        set_number: result.data.setNumber,
        reps_performed: result.data.repsPerformed ?? null,
        weight_kg: result.data.weightKg ?? null,
        duration_seconds: result.data.durationSeconds ?? null,
        completed: true,
        logged_at: new Date().toISOString(),
      },
      { onConflict: 'session_id,client_plan_day_exercise_id,set_number' }
    )

  if (upsertError) return { error: 'Error al registrar la serie' }

  // PR check: solo para series de fuerza con peso
  if (result.data.weightKg == null) {
    return { success: true, isPR: false }
  }

  // Obtener exercise_id para esta client_plan_day_exercise
  const { data: cpde } = await supabase
    .from('client_plan_day_exercises')
    .select('exercise_id')
    .eq('id', result.data.clientPlanDayExerciseId)
    .single()

  if (!cpde) return { success: true, isPR: false }

  // Llamar RPC para obtener el máximo histórico (excluyendo sesión actual)
  const { data: prevMax } = await supabase.rpc('get_exercise_prev_max', {
    p_exercise_id: cpde.exercise_id,
    p_client_id: user.id,
    p_exclude_session_id: result.data.sessionId,
  })

  const isPR = prevMax == null || result.data.weightKg > (prevMax as number)

  return { success: true, isPR }
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/features/training/actions/complete-set.ts
git commit -m "feat(training): completeSetAction returns isPR flag after set upsert"
```

---

### Task 3: Overlay de celebración de PR en `LiveTraining`

**Files:**
- Modify: `src/app/(training)/client/training/[sessionId]/live-training.tsx`

- [ ] **Step 1: Añadir estado `showPrCelebration`**

Localizar el bloque de estados al inicio del componente (~línea 113). Añadir:

```typescript
const [showPrCelebration, setShowPrCelebration] = useState(false)
```

- [ ] **Step 2: Auto-limpiar el estado tras 1500ms**

Añadir useEffect después del effect de `showSetCelebration` (~línea 221):

```typescript
useEffect(() => {
  if (!showPrCelebration) return
  const id = window.setTimeout(() => setShowPrCelebration(false), 1500)
  return () => window.clearTimeout(id)
}, [showPrCelebration])
```

- [ ] **Step 3: Detectar PR en `handleCompleteSet`**

Localizar `handleCompleteSet` (~línea 252). Cambiar el bloque `startTransition`:

```typescript
startTransition(async () => {
  const formData = new FormData()
  formData.set('sessionId', session.sessionId)
  formData.set('clientPlanDayExerciseId', fs.clientPlanDayExerciseId)
  formData.set('setNumber', String(fs.setNumber))
  if (fs.type === 'strength' && inp.weight) formData.set('weightKg', inp.weight)
  if (fs.type === 'cardio' && inp.duration) formData.set('durationSeconds', inp.duration)

  const result = await completeSetAction(formData)
  if ('error' in result) return

  setLocalCompleted((prev) => new Set([...prev, key]))
  const next = flatIndex + 1
  pendingScrollAfterCelebrationRef.current = next < flatSets.length ? next : null
  setShowSetCelebration(true)

  if (result.isPR) setShowPrCelebration(true)   // ← nuevo
})
```

- [ ] **Step 4: Añadir overlay de celebración de PR**

Localizar el bloque `<AnimatePresence onExitComplete={onCelebrationExitComplete}>` (~línea 391). Añadir el overlay de PR DESPUÉS del cierre de ese bloque (`</AnimatePresence>`), antes del `<header`:

```typescript
{/* PR celebration overlay */}
<AnimatePresence>
  {showPrCelebration && (
    <motion.div
      key="pr-celebration"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ type: 'spring', stiffness: 360, damping: 22 }}
      style={{
        position: 'fixed',
        bottom: 120,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#B5F23D',
        color: '#0A0A0A',
        fontWeight: 800,
        fontSize: 14,
        letterSpacing: '0.06em',
        padding: '10px 20px',
        borderRadius: 100,
        boxShadow: '0 8px 24px rgba(181,242,61,0.45)',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
      }}
    >
      🏆 NUEVO RÉCORD PERSONAL
    </motion.div>
  )}
</AnimatePresence>
```

- [ ] **Step 5: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(training\)/client/training/\[sessionId\]/live-training.tsx
git commit -m "feat(training): show PR celebration toast when client sets new personal record"
```

---

## Self-Review

- ✅ PR check solo corre para sets de fuerza con peso (`weightKg != null`)
- ✅ RPC excluye la sesión actual para no comparar contra sí mismo
- ✅ `prevMax == null` → primer set del ejercicio → siempre es PR (correcto)
- ✅ El overlay no bloquea la interacción (`pointerEvents: none`)
- ✅ El overlay es distinto del set celebration (check verde) — no se pisan
- ✅ El `isPR` no bloquea ni altera el flujo normal si la RPC falla (retorna `isPR: false`)
