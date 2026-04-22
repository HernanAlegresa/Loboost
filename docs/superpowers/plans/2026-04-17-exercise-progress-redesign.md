# Exercise Progress Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace free-text muscle group / category fields on exercises with a fixed dropdown list, and redesign the Exercise Progress screen with muscle-group cards → exercise rows → dedicated detail subpage.

**Architecture:** A single source of truth for muscle group values lives in `src/features/exercises/muscle-groups.ts` and is consumed by both the Zod schema (validation), the exercise forms (dropdowns), and the progress display (labels). The progress screen uses one level of accordion (muscle group cards expand to show exercises); tapping an exercise navigates to a full-screen detail subpage.

**Tech Stack:** Next.js 15 App Router, TypeScript, Zod, Supabase, inline styles (no Tailwind), `CustomSelect` component for dropdowns, `framer-motion` available.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/features/exercises/muscle-groups.ts` | **Create** | Canonical enum values + Spanish labels |
| `src/features/exercises/schemas.ts` | **Modify** | `muscleGroup` → `z.enum`, remove `category` |
| `src/features/exercises/actions/create-exercise.ts` | **Modify** | Remove `category` from insert |
| `src/features/exercises/actions/update-exercise.ts` | **Modify** | Remove `category` from update |
| `src/features/exercises/__tests__/schemas.test.ts` | **Modify** | Update tests for new schema |
| `src/app/(coach)/coach/library/exercises/queries.ts` | **Modify** | `category` → `string \| null`, add `muscleGroupLabel` |
| `src/app/(coach)/coach/library/exercises/exercise-list.tsx` | **Modify** | Show muscle group label, not category |
| `src/app/(coach)/coach/library/exercises/new/create-exercise-form.tsx` | **Modify** | `CustomSelect` for muscleGroup, remove category field |
| `src/app/(coach)/coach/library/exercises/[id]/edit/edit-exercise-form.tsx` | **Modify** | `CustomSelect` for muscleGroup, remove category field |
| `supabase/migrations/20260417120000_exercise_category_nullable.sql` | **Create** | Make `category` nullable (non-breaking) |
| `src/app/(coach)/coach/clients/[id]/progress-queries.ts` | **Modify** | Add `getExerciseSessionHistory` query |
| `src/app/(coach)/coach/clients/[id]/exercises-progress/page.tsx` | **Modify** | Pass `clientId` to list component |
| `src/app/(coach)/coach/clients/[id]/exercises-progress/exercises-progress-list.tsx` | **Rewrite** | Muscle group cards → exercise rows (navigable) |
| `src/app/(coach)/coach/clients/[id]/exercises-progress/[exerciseId]/page.tsx` | **Create** | Detail subpage: sparkline + session history |

---

## Task 1: Muscle groups constant

**Files:**
- Create: `src/features/exercises/muscle-groups.ts`

- [ ] **Create the constants file**

```ts
// Canonical muscle group values. Used by Zod schema, forms, and display.

export const MUSCLE_GROUPS = [
  'pecho',
  'espalda',
  'hombros',
  'biceps',
  'triceps',
  'cuadriceps',
  'isquiotibiales',
  'gluteos',
  'abdomen',
  'pantorrillas',
] as const

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number]

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  pecho:          'Pecho',
  espalda:        'Espalda',
  hombros:        'Hombros',
  biceps:         'Bíceps',
  triceps:        'Tríceps',
  cuadriceps:     'Cuádriceps',
  isquiotibiales: 'Isquiotibiales',
  gluteos:        'Glúteos',
  abdomen:        'Abdomen',
  pantorrillas:   'Pantorrillas',
}

/** Returns the display label for any stored muscle_group value.
 *  Falls back to the raw value if it pre-dates the fixed list. */
export function muscleGroupLabel(value: string): string {
  return MUSCLE_GROUP_LABELS[value as MuscleGroup] ?? value
}

/** Options array ready for CustomSelect / <select>. */
export const MUSCLE_GROUP_OPTIONS = MUSCLE_GROUPS.map((v) => ({
  value: v,
  label: MUSCLE_GROUP_LABELS[v],
}))
```

- [ ] **Commit**
```bash
git add src/features/exercises/muscle-groups.ts
git commit -m "feat(exercises): add canonical muscle group constants"
```

---

## Task 2: DB migration — make category nullable

**Files:**
- Create: `supabase/migrations/20260417120000_exercise_category_nullable.sql`

- [ ] **Create the migration**

```sql
-- Make category nullable so existing rows are unaffected and new
-- exercises created without category (field removed from form) work correctly.
alter table public.exercises
  alter column category drop not null;
```

- [ ] **Apply the migration via Supabase MCP**

Use `mcp__plugin_supabase_supabase__apply_migration` with the SQL above.

- [ ] **Commit**
```bash
git add supabase/migrations/20260417120000_exercise_category_nullable.sql
git commit -m "db: make exercises.category nullable (field removed from forms)"
```

---

## Task 3: Update Zod schema — muscleGroup enum, remove category

**Files:**
- Modify: `src/features/exercises/schemas.ts`
- Modify: `src/features/exercises/__tests__/schemas.test.ts`

- [ ] **Update schema**

Full replacement of `src/features/exercises/schemas.ts`:
```ts
import { z } from 'zod'
import { MUSCLE_GROUPS } from './muscle-groups'

export const exerciseSchema = z.object({
  name:        z.string().min(1, 'El nombre es requerido'),
  muscleGroup: z.enum(MUSCLE_GROUPS, { message: 'Grupo muscular inválido' }),
  type:        z.enum(['strength', 'cardio']),
  videoUrl:    z.string().url('URL de video inválida').optional(),
})

export type ExerciseInput = z.infer<typeof exerciseSchema>
```

- [ ] **Read the existing test file to understand current tests**

Path: `src/features/exercises/__tests__/schemas.test.ts`

- [ ] **Update test file**

Replace the full content with tests that cover the new schema:
```ts
import { describe, it, expect } from 'vitest'
import { exerciseSchema } from '../schemas'

describe('exerciseSchema', () => {
  const valid = {
    name: 'Press de banca',
    muscleGroup: 'pecho',
    type: 'strength',
  }

  it('accepts a valid exercise without videoUrl', () => {
    expect(exerciseSchema.safeParse(valid).success).toBe(true)
  })

  it('accepts a valid exercise with videoUrl', () => {
    const result = exerciseSchema.safeParse({ ...valid, videoUrl: 'https://youtube.com/watch?v=abc' })
    expect(result.success).toBe(true)
  })

  it('rejects an empty name', () => {
    const result = exerciseSchema.safeParse({ ...valid, name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects a free-text muscle group', () => {
    const result = exerciseSchema.safeParse({ ...valid, muscleGroup: 'Chest' })
    expect(result.success).toBe(false)
  })

  it('rejects all canonical muscle groups as valid', () => {
    const groups = ['pecho','espalda','hombros','biceps','triceps','cuadriceps','isquiotibiales','gluteos','abdomen','pantorrillas']
    for (const g of groups) {
      expect(exerciseSchema.safeParse({ ...valid, muscleGroup: g }).success).toBe(true)
    }
  })

  it('rejects an invalid video URL', () => {
    const result = exerciseSchema.safeParse({ ...valid, videoUrl: 'not-a-url' })
    expect(result.success).toBe(false)
  })

  it('accepts undefined videoUrl', () => {
    const result = exerciseSchema.safeParse({ ...valid, videoUrl: undefined })
    expect(result.success).toBe(true)
  })
})
```

- [ ] **Run tests**
```bash
cd "C:/Users/herna/Loboost App" && npx vitest run src/features/exercises/__tests__/schemas.test.ts
```
Expected: all pass.

- [ ] **Commit**
```bash
git add src/features/exercises/schemas.ts src/features/exercises/__tests__/schemas.test.ts
git commit -m "feat(exercises): muscleGroup enum validation, remove category from schema"
```

---

## Task 4: Update server actions — remove category

**Files:**
- Modify: `src/features/exercises/actions/create-exercise.ts`
- Modify: `src/features/exercises/actions/update-exercise.ts`

- [ ] **Update create action**

Full replacement of `src/features/exercises/actions/create-exercise.ts`:
```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { exerciseSchema } from '@/features/exercises/schemas'

export type CreateExerciseState =
  | { success: true; exerciseId: string }
  | { success: false; error: string }
  | null

export async function createExerciseAction(
  _prevState: CreateExerciseState,
  formData: FormData
): Promise<CreateExerciseState> {
  const videoRaw = formData.get('videoUrl')
  const raw = {
    name:        formData.get('name'),
    muscleGroup: formData.get('muscleGroup'),
    type:        formData.get('type'),
    videoUrl:
      typeof videoRaw === 'string' && videoRaw.trim() === '' ? undefined : videoRaw || undefined,
  }

  const result = exerciseSchema.safeParse(raw)
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'No autenticado' }

  const { data, error } = await supabase
    .from('exercises')
    .insert({
      coach_id:     user.id,
      name:         result.data.name,
      muscle_group: result.data.muscleGroup,
      type:         result.data.type,
      video_url:    result.data.videoUrl ?? null,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: 'Error al crear el ejercicio' }
  return { success: true, exerciseId: data.id }
}
```

- [ ] **Update update action**

Full replacement of `src/features/exercises/actions/update-exercise.ts`:
```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { exerciseSchema } from '@/features/exercises/schemas'

export type UpdateExerciseState =
  | { success: true }
  | { success: false; error: string }
  | null

export async function updateExerciseAction(
  _prev: UpdateExerciseState,
  formData: FormData
): Promise<UpdateExerciseState> {
  const exerciseId = formData.get('exerciseId')
  if (typeof exerciseId !== 'string' || exerciseId.length < 10) {
    return { success: false, error: 'Ejercicio inválido' }
  }

  const videoRaw = formData.get('videoUrl')
  const raw = {
    name:        formData.get('name'),
    muscleGroup: formData.get('muscleGroup'),
    type:        formData.get('type'),
    videoUrl:
      typeof videoRaw === 'string' && videoRaw.trim() === '' ? undefined : videoRaw || undefined,
  }

  const result = exerciseSchema.safeParse(raw)
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'No autenticado' }

  const { error } = await supabase
    .from('exercises')
    .update({
      name:         result.data.name,
      muscle_group: result.data.muscleGroup,
      type:         result.data.type,
      video_url:    result.data.videoUrl ?? null,
    })
    .eq('id', exerciseId)
    .eq('coach_id', user.id)

  if (error) return { success: false, error: 'Error al actualizar el ejercicio' }

  revalidatePath('/coach/library')
  return { success: true }
}
```

- [ ] **TypeScript check**
```bash
cd "C:/Users/herna/Loboost App" && npx tsc --noEmit 2>&1 | head -20
```
Expected: no output (no errors).

- [ ] **Commit**
```bash
git add src/features/exercises/actions/create-exercise.ts src/features/exercises/actions/update-exercise.ts
git commit -m "feat(exercises): remove category from create/update actions"
```

---

## Task 5: Update exercise library queries and list display

**Files:**
- Modify: `src/app/(coach)/coach/library/exercises/queries.ts`
- Modify: `src/app/(coach)/coach/library/exercises/exercise-list.tsx`

- [ ] **Update queries.ts**

Full replacement:
```ts
import { createClient } from '@/lib/supabase/server'
import { muscleGroupLabel } from '@/features/exercises/muscle-groups'

export type ExerciseRow = {
  id:           string
  name:         string
  muscle_group: string
  type:         string
}

export async function getCoachExercises(coachId: string): Promise<ExerciseRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('exercises')
    .select('id, name, muscle_group, type')
    .eq('coach_id', coachId)
    .order('name')

  if (error || !data) return []
  return data
}

export type ExerciseEditRow = ExerciseRow & { video_url: string | null }

export async function getExerciseForEdit(
  coachId: string,
  exerciseId: string
): Promise<ExerciseEditRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('exercises')
    .select('id, name, muscle_group, type, video_url')
    .eq('id', exerciseId)
    .eq('coach_id', coachId)
    .single()

  if (error || !data) return null
  return data as ExerciseEditRow
}
```

- [ ] **Update exercise-list.tsx** — change subtitle from `ex.category` to `muscleGroupLabel(ex.muscle_group)`

In `exercise-list.tsx`, find the `<p>` that renders `{ex.category}` (line ~128) and replace with:
```tsx
import { muscleGroupLabel } from '@/features/exercises/muscle-groups'
// ...
<p style={{ fontSize: 12, color: '#9CA3AF', margin: '5px 0 0', lineHeight: 1.45 }}>
  {muscleGroupLabel(ex.muscle_group)}
</p>
```

- [ ] **TypeScript check**
```bash
cd "C:/Users/herna/Loboost App" && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Commit**
```bash
git add src/app/\(coach\)/coach/library/exercises/queries.ts src/app/\(coach\)/coach/library/exercises/exercise-list.tsx
git commit -m "feat(exercises): show muscle group label in library list, drop category column from select"
```

---

## Task 6: Update Create exercise form

**Files:**
- Modify: `src/app/(coach)/coach/library/exercises/new/create-exercise-form.tsx`

- [ ] **Rewrite the form** — replace muscleGroup text input with `CustomSelect`, remove category field entirely.

Full replacement of `create-exercise-form.tsx`:
```tsx
'use client'

import { useActionState, useEffect, type CSSProperties, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createExerciseAction, type CreateExerciseState } from '@/features/exercises/actions/create-exercise'
import { MUSCLE_GROUP_OPTIONS } from '@/features/exercises/muscle-groups'
import CustomSelect from '@/components/ui/custom-select'
import CoachSubpageHeader from '@/components/ui/coach-subpage-header'

const inputStyle: CSSProperties = {
  width: '100%',
  height: 44,
  backgroundColor: '#111317',
  border: '1px solid #2A2D34',
  borderRadius: 10,
  padding: '0 14px',
  color: '#F0F0F0',
  fontSize: 15,
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: '#F0F0F0',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: 8,
}

const sectionTitleStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#B5F23D',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: 16,
  textAlign: 'center',
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

export default function CreateExerciseForm() {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState<CreateExerciseState, FormData>(
    createExerciseAction,
    null
  )

  useEffect(() => {
    if (state?.success) router.push('/coach/library?tab=exercises')
  }, [state, router])

  return (
    <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <CoachSubpageHeader
        backHref="/coach/library?tab=exercises"
        title="Nuevo ejercicio"
        backColor="#B5F23D"
        titleSize={20}
      />

      <form
        action={formAction}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          overscrollBehaviorY: 'contain',
          padding: '16px 20px 120px',
          display: 'flex',
          flexDirection: 'column',
          gap: 28,
        }}
      >
        <div>
          <p style={sectionTitleStyle}>Datos</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Nombre">
              <input
                name="name"
                type="text"
                required
                style={inputStyle}
                placeholder="Press de banca"
                autoComplete="off"
              />
            </Field>

            <Field label="Grupo muscular">
              <CustomSelect
                name="muscleGroup"
                required
                placeholder="Seleccioná el grupo muscular"
                options={MUSCLE_GROUP_OPTIONS}
              />
            </Field>

            <Field label="Tipo">
              <CustomSelect
                name="type"
                required
                placeholder="Elegí el tipo"
                options={[
                  { value: 'strength', label: 'Fuerza' },
                  { value: 'cardio', label: 'Cardio' },
                ]}
              />
            </Field>

            <Field label="Video (opcional)">
              <input
                name="videoUrl"
                type="url"
                style={inputStyle}
                placeholder="https://youtube.com/…"
                inputMode="url"
                autoComplete="off"
              />
            </Field>
          </div>
        </div>

        {state && !state.success && 'error' in state && (
          <div
            role="alert"
            style={{
              backgroundColor: 'rgba(242, 82, 82, 0.08)',
              border: '1px solid rgba(242, 82, 82, 0.25)',
              borderRadius: 12,
              padding: '12px 14px',
            }}
          >
            <p style={{ fontSize: 13, color: '#F25252', lineHeight: 1.45 }}>{state.error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          style={{
            alignSelf: 'center',
            width: 'fit-content',
            minWidth: 0,
            padding: '0 24px',
            height: 48,
            borderRadius: 12,
            border: 'none',
            fontSize: 15,
            fontWeight: 700,
            color: '#0A0A0A',
            backgroundColor: isPending ? '#8BA82B' : '#B5F23D',
            cursor: isPending ? 'not-allowed' : 'pointer',
          }}
        >
          {isPending ? 'Guardando...' : 'Crear ejercicio'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **TypeScript check**
```bash
cd "C:/Users/herna/Loboost App" && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Commit**
```bash
git add "src/app/(coach)/coach/library/exercises/new/create-exercise-form.tsx"
git commit -m "feat(exercises): replace muscleGroup text input with dropdown in create form"
```

---

## Task 7: Update Edit exercise form

**Files:**
- Modify: `src/app/(coach)/coach/library/exercises/[id]/edit/edit-exercise-form.tsx`

- [ ] **Rewrite the edit form** — use `CustomSelect` for muscleGroup (controlled, with `value`/`onChange`), remove category field.

Full replacement of `edit-exercise-form.tsx`:
```tsx
'use client'

import { useActionState, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateExerciseAction, type UpdateExerciseState } from '@/features/exercises/actions/update-exercise'
import { MUSCLE_GROUP_OPTIONS, muscleGroupLabel } from '@/features/exercises/muscle-groups'
import type { ExerciseEditRow } from '../../queries'
import CoachSubpageHeader from '@/components/ui/coach-subpage-header'
import CustomSelect from '@/components/ui/custom-select'

const inputStyle: CSSProperties = {
  width: '100%',
  height: 44,
  backgroundColor: '#111317',
  border: '1px solid #2A2D34',
  borderRadius: 10,
  padding: '0 14px',
  color: '#F0F0F0',
  fontSize: 15,
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: '#F0F0F0',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: 8,
}

const sectionTitleStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#B5F23D',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: 16,
  textAlign: 'center',
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

export default function EditExerciseForm({ exercise }: { exercise: ExerciseEditRow }) {
  const router = useRouter()
  const initial = useMemo(
    () => ({
      name:        exercise.name,
      muscleGroup: exercise.muscle_group,
      type:        exercise.type,
      videoUrl:    exercise.video_url?.trim() ?? '',
    }),
    [exercise]
  )

  const [name,        setName]        = useState(initial.name)
  const [muscleGroup, setMuscleGroup] = useState(initial.muscleGroup)
  const [type,        setType]        = useState(initial.type)
  const [videoUrl,    setVideoUrl]    = useState(initial.videoUrl)

  const dirty =
    name.trim()        !== initial.name        ||
    muscleGroup        !== initial.muscleGroup  ||
    type               !== initial.type         ||
    videoUrl.trim()    !== initial.videoUrl

  const [state, formAction, isPending] = useActionState<UpdateExerciseState, FormData>(
    updateExerciseAction,
    null
  )

  useEffect(() => {
    if (state?.success) router.push('/coach/library?tab=exercises')
  }, [state, router])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <CoachSubpageHeader
        backHref="/coach/library?tab=exercises"
        title="Editar ejercicio"
        backColor="#B5F23D"
        titleSize={20}
      />

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', overscrollBehaviorY: 'contain' }}>
        <form
          action={formAction}
          style={{ padding: '16px 20px 120px', display: 'flex', flexDirection: 'column', gap: 28 }}
        >
          <input type="hidden" name="exerciseId" value={exercise.id} readOnly />

          <div>
            <p style={sectionTitleStyle}>Datos</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="Nombre">
                <input
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={inputStyle}
                  autoComplete="off"
                />
              </Field>

              <Field label="Grupo muscular">
                <CustomSelect
                  name="muscleGroup"
                  required
                  value={muscleGroup}
                  onChange={setMuscleGroup}
                  placeholder="Seleccioná el grupo muscular"
                  options={MUSCLE_GROUP_OPTIONS}
                />
              </Field>

              <Field label="Tipo">
                <CustomSelect
                  name="type"
                  required
                  value={type}
                  onChange={setType}
                  placeholder="Elegí el tipo"
                  options={[
                    { value: 'strength', label: 'Fuerza' },
                    { value: 'cardio', label: 'Cardio' },
                  ]}
                />
              </Field>

              <Field label="Video (opcional)">
                <input
                  name="videoUrl"
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  style={inputStyle}
                  inputMode="url"
                  autoComplete="off"
                />
              </Field>
            </div>
          </div>

          {state && !state.success && 'error' in state && (
            <div
              role="alert"
              style={{
                backgroundColor: 'rgba(242, 82, 82, 0.08)',
                border: '1px solid rgba(242, 82, 82, 0.25)',
                borderRadius: 12,
                padding: '12px 14px',
              }}
            >
              <p style={{ fontSize: 13, color: '#F25252', lineHeight: 1.45 }}>{state.error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || !dirty}
            style={{
              alignSelf: 'center',
              width: 'fit-content',
              minWidth: 0,
              padding: '0 24px',
              height: 48,
              borderRadius: 12,
              border: 'none',
              fontSize: 15,
              fontWeight: 700,
              color: '#0A0A0A',
              backgroundColor: isPending || !dirty ? '#8BA82B' : '#B5F23D',
              cursor: isPending || !dirty ? 'not-allowed' : 'pointer',
            }}
          >
            {isPending ? 'Guardando...' : 'Guardar'}
          </button>

          <Link
            href="/coach/library?tab=exercises"
            style={{ textAlign: 'center', fontSize: 14, fontWeight: 600, color: '#6B7280', textDecoration: 'none' }}
          >
            Cancelar
          </Link>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Note on existing exercises with free-text muscle_group:** Existing exercises may have values like `"Pecho"` (capitalized) or `"chest"`. The `CustomSelect` will show the raw value if it doesn't match any option. The `muscleGroupLabel()` helper in display already handles this gracefully via fallback. Coaches can update existing exercises via the edit form to select the canonical value.

- [ ] **TypeScript check**
```bash
cd "C:/Users/herna/Loboost App" && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Commit**
```bash
git add "src/app/(coach)/coach/library/exercises/[id]/edit/edit-exercise-form.tsx"
git commit -m "feat(exercises): dropdown for muscle group in edit form, remove category"
```

---

## Task 8: Add exercise session history query

**Files:**
- Modify: `src/app/(coach)/coach/clients/[id]/progress-queries.ts`

- [ ] **Add types and query at the end of the file**

Append to `progress-queries.ts` (after the existing `getWeeklyLoadData` function):

```ts
// ── Exercise session history ───────────────────────────────────────────────────

export type ExerciseSessionPoint = {
  sessionId: string
  date:       string
  weekNumber: number
  topSetKg:   number | null
  completedSets: number
  isPR:       boolean
}

export type ExerciseSessionHistory = {
  exerciseId:   string
  exerciseName: string
  muscleGroup:  string
  sessions:     ExerciseSessionPoint[]
  peakTopSetKg: number | null
  isBodyweight: boolean
}

export async function getExerciseSessionHistory(
  clientId: string,
  exerciseId: string,
  activePlan: ActivePlanSummary
): Promise<ExerciseSessionHistory | null> {
  const supabase = await createClient()

  // Resolve exercise info
  const { data: exerciseInfo } = await supabase
    .from('exercises')
    .select('id, name, muscle_group')
    .eq('id', exerciseId)
    .single()

  if (!exerciseInfo) return null

  // Get all plan days for this plan
  const { data: planDays } = await supabase
    .from('client_plan_days')
    .select('id, week_number')
    .eq('client_plan_id', activePlan.id)

  if (!planDays || planDays.length === 0) {
    return {
      exerciseId,
      exerciseName: exerciseInfo.name,
      muscleGroup:  exerciseInfo.muscle_group,
      sessions:     [],
      peakTopSetKg: null,
      isBodyweight: true,
    }
  }

  const planDayIds   = planDays.map((d) => d.id)
  const weekByDayId  = new Map(planDays.map((d) => [d.id, d.week_number]))

  // Get plan day exercises that reference this exercise
  const { data: pdes } = await supabase
    .from('client_plan_day_exercises')
    .select('id, client_plan_day_id')
    .in('client_plan_day_id', planDayIds)
    .eq('exercise_id', exerciseId)

  if (!pdes || pdes.length === 0) {
    return {
      exerciseId,
      exerciseName: exerciseInfo.name,
      muscleGroup:  exerciseInfo.muscle_group,
      sessions:     [],
      peakTopSetKg: null,
      isBodyweight: true,
    }
  }

  const pdeIds      = pdes.map((p) => p.id)
  const planDayByPde = new Map(pdes.map((p) => [p.id, p.client_plan_day_id]))

  // Get completed sessions that include these plan day exercises
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, client_plan_day_id, date')
    .eq('client_id', clientId)
    .in('client_plan_day_id', planDayIds)
    .eq('status', 'completed')

  if (!sessions || sessions.length === 0) {
    return {
      exerciseId,
      exerciseName: exerciseInfo.name,
      muscleGroup:  exerciseInfo.muscle_group,
      sessions:     [],
      peakTopSetKg: null,
      isBodyweight: true,
    }
  }

  const sessionIds        = sessions.map((s) => s.id)
  const dateBySessionId   = new Map(sessions.map((s) => [s.id, s.date]))
  const planDayBySessionId = new Map(sessions.map((s) => [s.id, s.client_plan_day_id]))

  // Get session sets for these pdes
  const { data: sets } = await supabase
    .from('session_sets')
    .select('session_id, client_plan_day_exercise_id, weight_kg, set_number')
    .in('session_id', sessionIds)
    .in('client_plan_day_exercise_id', pdeIds)
    .eq('completed', true)

  if (!sets || sets.length === 0) {
    return {
      exerciseId,
      exerciseName: exerciseInfo.name,
      muscleGroup:  exerciseInfo.muscle_group,
      sessions:     [],
      peakTopSetKg: null,
      isBodyweight: true,
    }
  }

  // Aggregate per session
  type Agg = { topSetKg: number | null; completedSets: number; date: string; weekNumber: number }
  const aggBySession = new Map<string, Agg>()

  for (const set of sets) {
    const date      = dateBySessionId.get(set.session_id)
    const planDayId = planDayBySessionId.get(set.session_id)
    if (!date || !planDayId) continue
    const weekNumber = weekByDayId.get(planDayId) ?? 0

    if (!aggBySession.has(set.session_id)) {
      aggBySession.set(set.session_id, { topSetKg: null, completedSets: 0, date, weekNumber })
    }
    const agg = aggBySession.get(set.session_id)!
    agg.completedSets++
    if (set.weight_kg != null) {
      const kg = Number(set.weight_kg)
      if (agg.topSetKg === null || kg > agg.topSetKg) agg.topSetKg = kg
    }
  }

  const sorted = Array.from(aggBySession.entries())
    .sort(([, a], [, b]) => a.date.localeCompare(b.date))

  const peakTopSetKg = sorted.reduce<number | null>((max, [, agg]) => {
    if (agg.topSetKg === null) return max
    return max === null || agg.topSetKg > max ? agg.topSetKg : max
  }, null)

  const sessionPoints: ExerciseSessionPoint[] = sorted.map(([sessionId, agg]) => ({
    sessionId,
    date:         agg.date,
    weekNumber:   agg.weekNumber,
    topSetKg:     agg.topSetKg,
    completedSets: agg.completedSets,
    isPR:         agg.topSetKg !== null && agg.topSetKg === peakTopSetKg,
  }))

  return {
    exerciseId,
    exerciseName:  exerciseInfo.name,
    muscleGroup:   exerciseInfo.muscle_group,
    sessions:      sessionPoints,
    peakTopSetKg,
    isBodyweight:  peakTopSetKg === null,
  }
}
```

- [ ] **TypeScript check**
```bash
cd "C:/Users/herna/Loboost App" && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Commit**
```bash
git add "src/app/(coach)/coach/clients/[id]/progress-queries.ts"
git commit -m "feat(progress): add getExerciseSessionHistory query for exercise detail subpage"
```

---

## Task 9: Redesign exercises-progress list — muscle group cards

**Files:**
- Rewrite: `src/app/(coach)/coach/clients/[id]/exercises-progress/exercises-progress-list.tsx`
- Modify: `src/app/(coach)/coach/clients/[id]/exercises-progress/page.tsx`

- [ ] **Update page.tsx** — pass `clientId` to the list component

In `page.tsx`, change the list render call from:
```tsx
<ExercisesProgressList exercises={exercisesWithData} />
```
to:
```tsx
<ExercisesProgressList exercises={exercisesWithData} clientId={id} />
```

- [ ] **Rewrite exercises-progress-list.tsx** — muscle group cards, exercises as navigable rows

Full replacement:
```tsx
'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { ExerciseProgressData } from '../progress-queries'
import { muscleGroupLabel } from '@/features/exercises/muscle-groups'
import { MUSCLE_GROUP_ORDER } from '@/features/exercises/muscle-groups'

// ── Helpers ───────────────────────────────────────────────────────────────────

function computePctChange(values: (number | null)[]): number | null {
  const filled = values.filter((v): v is number => v !== null)
  if (filled.length < 2) return null
  const prev = filled[filled.length - 2]
  const last = filled[filled.length - 1]
  if (prev === 0) return null
  return Math.round(((last - prev) / prev) * 100)
}

function isBodyweight(ex: ExerciseProgressData): boolean {
  return ex.lastTopSetKg === null && ex.peakTopSetKg === null
}

// ── Trend badge ───────────────────────────────────────────────────────────────

function TrendBadge({ ex }: { ex: ExerciseProgressData }) {
  const bw = isBodyweight(ex)

  const pct = bw
    ? computePctChange(ex.sessions.map((s) => s.completedSets))
    : computePctChange(ex.sessions.map((s) => s.topSetKg))

  const trend = bw
    ? (() => {
        if (ex.sessions.length < 2) return 'none' as const
        const prev = ex.sessions[ex.sessions.length - 2].completedSets
        const last = ex.sessions[ex.sessions.length - 1].completedSets
        if (last > prev) return 'up' as const
        if (last < prev) return 'down' as const
        return 'stable' as const
      })()
    : ex.trend

  if (trend === 'none') return null

  const map = {
    up:     { symbol: '↑', color: '#B5F23D', bg: 'rgba(181,242,61,0.1)' },
    down:   { symbol: '↓', color: '#F25252', bg: 'rgba(242,82,82,0.1)' },
    stable: { symbol: '→', color: '#9CA3AF', bg: 'rgba(156,163,175,0.08)' },
  } as const

  const { symbol, color, bg } = map[trend]
  const pctLabel = pct !== null && pct !== 0 ? ` ${pct > 0 ? '+' : ''}${pct}%` : ''

  return (
    <span
      style={{
        fontSize: 11, fontWeight: 700, color, background: bg,
        borderRadius: 6, padding: '2px 7px', lineHeight: 1, whiteSpace: 'nowrap',
      }}
    >
      {symbol}{pctLabel}
    </span>
  )
}

// ── Exercise row (navigable) ──────────────────────────────────────────────────

function ExerciseRow({ ex, clientId }: { ex: ExerciseProgressData; clientId: string }) {
  const bw = isBodyweight(ex)

  return (
    <Link
      href={`/coach/clients/${clientId}/exercises-progress/${ex.exerciseId}`}
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '13px 0',
          borderBottom: '1px solid #1A1E24',
        }}
      >
        {/* Exercise info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 15, fontWeight: 600, color: '#F0F0F0',
              margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {ex.exerciseName}
          </p>
          <p style={{ fontSize: 12, color: '#6B7280', margin: '3px 0 0' }}>
            {ex.sessionCount} {ex.sessionCount === 1 ? 'sesión' : 'sesiones'}
            {bw && ' · Sin carga'}
          </p>
        </div>

        {/* Right: weight or sets + trend + chevron */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            {bw ? (
              <span style={{ fontSize: 14, fontWeight: 600, color: '#9CA3AF' }}>
                {ex.sessions.length > 0
                  ? `${ex.sessions[ex.sessions.length - 1].completedSets} series`
                  : '—'}
              </span>
            ) : ex.lastTopSetKg !== null ? (
              <>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#F0F0F0' }}>
                  {ex.lastTopSetKg} kg
                </span>
                {ex.peakTopSetKg !== null && ex.peakTopSetKg !== ex.lastTopSetKg && (
                  <p style={{ fontSize: 10, color: '#4B5563', margin: '2px 0 0' }}>
                    pico {ex.peakTopSetKg} kg
                  </p>
                )}
              </>
            ) : (
              <span style={{ fontSize: 13, color: '#4B5563' }}>—</span>
            )}
          </div>
          <TrendBadge ex={ex} />
          <ChevronRight size={16} color="#4B5563" strokeWidth={2} />
        </div>
      </div>
    </Link>
  )
}

// ── Muscle group card ─────────────────────────────────────────────────────────

function MuscleGroupCard({
  group,
  exercises,
  clientId,
}: {
  group: string
  exercises: ExerciseProgressData[]
  clientId: string
}) {
  // Default: expanded if ≤4 exercises, collapsed if more
  const [expanded, setExpanded] = useState(exercises.length <= 4)

  // Aggregate quick stats for the card header
  const totalSessions = exercises.reduce((s, ex) => s + ex.sessionCount, 0)
  const improving     = exercises.filter((ex) => ex.trend === 'up').length

  return (
    <div
      style={{
        background: 'linear-gradient(160deg, #12161C 0%, #0F1217 100%)',
        border: '1px solid #252A31',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 10,
      }}
    >
      {/* Card header — tap to expand/collapse */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          padding: '16px 16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          textAlign: 'left',
        }}
      >
        {/* Left: muscle group name + stats */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontSize: 13, fontWeight: 700, color: '#F0F0F0',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}
            >
              {muscleGroupLabel(group)}
            </span>
            <span
              style={{
                fontSize: 11, fontWeight: 600, color: '#6B7280',
                background: '#1A1E24', borderRadius: 9999,
                padding: '2px 8px',
              }}
            >
              {exercises.length} {exercises.length === 1 ? 'ejercicio' : 'ejercicios'}
            </span>
          </div>
          <p style={{ fontSize: 11, color: '#4B5563', margin: '4px 0 0' }}>
            {totalSessions} sesiones
            {improving > 0 && (
              <span style={{ color: '#B5F23D' }}> · {improving} mejorando ↑</span>
            )}
          </p>
        </div>

        {/* Right: expand/collapse indicator */}
        <div
          style={{
            width: 28, height: 28, borderRadius: 8,
            background: expanded ? 'rgba(181,242,61,0.1)' : 'rgba(255,255,255,0.04)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 14, color: expanded ? '#B5F23D' : '#6B7280',
              transition: 'transform 0.2s',
              display: 'inline-block',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            ▾
          </span>
        </div>
      </button>

      {/* Exercises list — shown when expanded */}
      {expanded && (
        <div style={{ padding: '0 16px', borderTop: '1px solid #1A1E24' }}>
          {exercises.map((ex) => (
            <ExerciseRow key={ex.exerciseId} ex={ex} clientId={clientId} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function ExercisesProgressList({
  exercises,
  clientId,
}: {
  exercises: ExerciseProgressData[]
  clientId: string
}) {
  const { grouped, sortedGroups } = useMemo(() => {
    const grouped = new Map<string, ExerciseProgressData[]>()
    for (const ex of exercises) {
      const key = ex.muscleGroup.toLowerCase()
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(ex)
    }
    const sortedGroups = Array.from(grouped.keys()).sort((a, b) => {
      const ai = MUSCLE_GROUP_ORDER.indexOf(a as never)
      const bi = MUSCLE_GROUP_ORDER.indexOf(b as never)
      if (ai !== -1 && bi !== -1) return ai - bi
      if (ai !== -1) return -1
      if (bi !== -1) return 1
      return a.localeCompare(b)
    })
    return { grouped, sortedGroups }
  }, [exercises])

  if (exercises.length === 0) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: '#4B5563' }}>
          Sin sesiones completadas aún. Los datos aparecerán cuando el cliente registre entrenamientos.
        </p>
      </div>
    )
  }

  return (
    <div>
      {sortedGroups.map((group) => (
        <MuscleGroupCard
          key={group}
          group={group}
          exercises={grouped.get(group)!}
          clientId={clientId}
        />
      ))}
    </div>
  )
}
```

**Note:** The import of `MUSCLE_GROUP_ORDER` requires exporting it from `muscle-groups.ts`. Add this export to the constants file (Task 1 file):
```ts
export const MUSCLE_GROUP_ORDER = MUSCLE_GROUPS as unknown as string[]
```

- [ ] **TypeScript check**
```bash
cd "C:/Users/herna/Loboost App" && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Commit**
```bash
git add "src/app/(coach)/coach/clients/[id]/exercises-progress/"
git commit -m "feat(progress): redesign exercise progress list with muscle group cards"
```

---

## Task 10: Exercise detail subpage

**Files:**
- Create: `src/app/(coach)/coach/clients/[id]/exercises-progress/[exerciseId]/page.tsx`

- [ ] **Create the directory**
```bash
mkdir -p "src/app/(coach)/coach/clients/[id]/exercises-progress/[exerciseId]"
```

- [ ] **Create page.tsx**

```tsx
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getClientBasicForCoach, getExerciseSessionHistory } from '../../progress-queries'
import { muscleGroupLabel } from '@/features/exercises/muscle-groups'
import { formatDateShort } from '../../date-utils'
import CoachSubpageHeader from '@/components/ui/coach-subpage-header'
import Avatar from '@/components/ui/avatar'
import { COACH_LIST_SCROLL_END_ABOVE_NAV } from '@/lib/ui/safe-area'

function ClientAvatarSlot({ fullName }: { fullName: string }) {
  return <Avatar fullName={fullName} size="md" />
}

// ── Sparkline ─────────────────────────────────────────────────────────────────

function Sparkline({ values, color = '#B5F23D' }: { values: number[]; color?: string }) {
  if (values.length < 2) return null

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range  = max - min || 1
  const padX   = 8
  const padY   = 8
  const height = 56
  const chartH = height - padY * 2
  const pointSpacing = Math.max(32, Math.min(56, 300 / (values.length - 1)))
  const width  = padX * 2 + pointSpacing * (values.length - 1)

  const pts = values.map((v, i) => {
    const x = padX + i * pointSpacing
    const y = padY + chartH - ((v - min) / range) * chartH
    return [x, y] as [number, number]
  })

  const last     = pts[pts.length - 1]
  const linePts  = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const areaPts  = [
    `${padX},${padY + chartH}`,
    ...pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`),
    `${last[0].toFixed(1)},${padY + chartH}`,
  ].join(' ')

  return (
    <div
      style={{
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      } as React.CSSProperties}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ display: 'block', overflow: 'visible', minWidth: '100%' }}
      >
        <polygon fill={`${color}18`} points={areaPts} />
        <polyline
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          points={linePts}
        />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={3.5} fill={color} />
        ))}
      </svg>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ id: string; exerciseId: string }>
}) {
  const { id, exerciseId } = await params

  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const basic = await getClientBasicForCoach(id, user.id)
  if (!basic) notFound()

  const { fullName, activePlan } = basic

  if (!activePlan) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <CoachSubpageHeader
          backHref={`/coach/clients/${id}/exercises-progress`}
          title="Progreso"
          backColor="#B5F23D"
          rightSlot={<ClientAvatarSlot fullName={fullName} />}
        />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <p style={{ fontSize: 14, color: '#4B5563', textAlign: 'center' }}>
            Sin plan activo.
          </p>
        </div>
      </div>
    )
  }

  const history = await getExerciseSessionHistory(id, exerciseId, activePlan)
  if (!history) notFound()

  const sparklineValues = history.isBodyweight
    ? history.sessions.map((s) => s.completedSets)
    : history.sessions.map((s) => s.topSetKg).filter((v): v is number => v !== null)

  const sparklineColor = history.isBodyweight ? '#9CA3AF' : '#B5F23D'

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <CoachSubpageHeader
        backHref={`/coach/clients/${id}/exercises-progress`}
        title={history.exerciseName}
        backColor="#B5F23D"
        rightSlot={<ClientAvatarSlot fullName={fullName} />}
      />

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
          paddingBottom: COACH_LIST_SCROLL_END_ABOVE_NAV,
        }}
      >
        {/* Subtitle: muscle group + plan name */}
        <div style={{ padding: '16px 20px 0' }}>
          <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>
            <span style={{ color: '#F0F0F0', fontWeight: 600 }}>
              {muscleGroupLabel(history.muscleGroup)}
            </span>
            {' '}·{' '}
            {activePlan.name}
          </p>
        </div>

        {/* Peak PR strip */}
        {!history.isBodyweight && history.peakTopSetKg !== null && (
          <div
            style={{
              margin: '14px 20px 0',
              padding: '12px 16px',
              background: 'rgba(181,242,61,0.06)',
              border: '1px solid rgba(181,242,61,0.15)',
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#B5F23D', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Mejor marca
              </p>
              <p style={{ fontSize: 11, color: '#4B5563', margin: '3px 0 0' }}>
                en {activePlan.weeks} semanas de plan
              </p>
            </div>
            <span style={{ fontSize: 28, fontWeight: 700, color: '#B5F23D', lineHeight: 1 }}>
              {history.peakTopSetKg} kg
            </span>
          </div>
        )}

        {/* Sparkline */}
        {sparklineValues.length >= 2 && (
          <div style={{ padding: '16px 20px 0' }}>
            <Sparkline values={sparklineValues} color={sparklineColor} />
            <p style={{ fontSize: 10, color: '#4B5563', margin: '4px 0 0', textAlign: 'right' }}>
              {history.isBodyweight ? 'series por sesión' : 'top set por sesión (kg)'}
            </p>
          </div>
        )}

        {/* Session history */}
        {history.sessions.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: '#4B5563' }}>
              Sin sesiones completadas aún.
            </p>
          </div>
        ) : (
          <div style={{ padding: '16px 20px 0' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
              Historial
            </p>

            {history.sessions.map((s, i) => (
              <div
                key={s.sessionId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 0',
                  borderBottom: i < history.sessions.length - 1 ? '1px solid #12161C' : 'none',
                }}
              >
                {/* Left: week badge + date */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      fontSize: 10, fontWeight: 700,
                      color: s.isPR ? '#0A0A0A' : '#4B5563',
                      background: s.isPR ? '#B5F23D' : '#111317',
                      borderRadius: 6,
                      padding: '3px 8px',
                      minWidth: 32,
                      textAlign: 'center',
                      letterSpacing: '0.04em',
                    }}
                  >
                    S{s.weekNumber}
                  </span>
                  <div>
                    <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>
                      {formatDateShort(s.date)}
                    </p>
                    <p style={{ fontSize: 11, color: '#4B5563', margin: '2px 0 0' }}>
                      {s.completedSets} {s.completedSets === 1 ? 'serie' : 'series'}
                    </p>
                  </div>
                </div>

                {/* Right: weight + PR badge */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {!history.isBodyweight ? (
                    <>
                      <p
                        style={{
                          fontSize: 18, fontWeight: 700,
                          color: s.isPR ? '#B5F23D' : '#F0F0F0',
                          margin: 0, lineHeight: 1,
                        }}
                      >
                        {s.topSetKg !== null ? `${s.topSetKg} kg` : '—'}
                      </p>
                      {s.isPR && (
                        <p style={{ fontSize: 10, fontWeight: 700, color: '#B5F23D', margin: '3px 0 0', letterSpacing: '0.06em' }}>
                          ★ PR
                        </p>
                      )}
                    </>
                  ) : (
                    <p style={{ fontSize: 16, fontWeight: 600, color: '#9CA3AF', margin: 0 }}>
                      {s.completedSets} series
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **TypeScript check**
```bash
cd "C:/Users/herna/Loboost App" && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Commit**
```bash
git add "src/app/(coach)/coach/clients/[id]/exercises-progress/[exerciseId]/"
git commit -m "feat(progress): add exercise detail subpage with session history and PR highlight"
```

---

## Task 11: Export MUSCLE_GROUP_ORDER from muscle-groups.ts

This was required by Task 9 — verify the export exists and that it satisfies the `indexOf` usage.

- [ ] **Verify `muscle-groups.ts` exports `MUSCLE_GROUP_ORDER`**

The file should have at the bottom:
```ts
// For sorting display groups in canonical order
export const MUSCLE_GROUP_ORDER = [...MUSCLE_GROUPS] as string[]
```

- [ ] **Final TypeScript check — all files**
```bash
cd "C:/Users/herna/Loboost App" && npx tsc --noEmit 2>&1
```
Expected: no output.

- [ ] **Final commit**
```bash
git add -A
git commit -m "feat(exercises): complete exercise progress redesign with muscle group cards and detail subpage"
```

---

## Self-Review

**Spec coverage:**
- ✅ Fixed muscle group dropdown in create form (Task 6)
- ✅ Fixed muscle group dropdown in edit form (Task 7)
- ✅ Remove category from schema/actions/forms (Tasks 3, 4, 6, 7)
- ✅ DB migration makes category nullable (Task 2)
- ✅ Muscle group cards on exercise progress screen (Task 9)
- ✅ Each exercise navigates to detail subpage (Tasks 9, 10)
- ✅ Detail subpage shows session history per session (Task 10)
- ✅ PR highlighted with lime color + ★ badge (Task 10)
- ✅ Bodyweight exercises handled differently (Tasks 9, 10)
- ✅ Sparkline on detail page (Task 10)
- ✅ Trend % in exercise rows on list (Task 9)

**No placeholders found.**

**Type consistency:**
- `ExerciseProgressData` used consistently from `progress-queries.ts`
- `ExerciseSessionHistory` / `ExerciseSessionPoint` defined in Task 8, consumed in Task 10
- `MUSCLE_GROUP_OPTIONS`, `MUSCLE_GROUP_ORDER`, `muscleGroupLabel` defined in Task 1, consumed in Tasks 6, 7, 9
- `ExerciseEditRow` no longer has `category` field (removed in Task 5)
