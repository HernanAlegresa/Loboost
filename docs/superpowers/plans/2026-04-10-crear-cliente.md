# Crear Cliente — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/coach/clients/new` screen — a form the coach fills out to create a new client's fitness profile and Supabase auth account in one step, ending with an animated success overlay that auto-redirects to the client profile.

**Architecture:** The Server Action (`create-client.ts`) already handles the full backend flow (admin API creates auth user → updates profile → inserts client_profiles). This plan updates the action signature for React 19 `useActionState`, tightens the schema, and builds the UI: a scrollable two-section form (client data + account credentials) and an animated success overlay. No new backend logic needed.

**Tech Stack:** Next.js 15 App Router, React 19 `useActionState`, framer-motion, lucide-react, Zod, Supabase admin client (`SUPABASE_SERVICE_ROLE_KEY` already in `.env.local`)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/features/clients/schemas.ts` | Modify | Make `injuries` required, `goal` enum, `daysPerWeek` max 6 |
| `src/features/clients/actions/create-client.ts` | Modify | Add `prevState` param for `useActionState`, return `clientName` |
| `src/features/clients/__tests__/create-client-schema.test.ts` | Create | Schema validation tests (TDD) |
| `src/app/(coach)/coach/clients/new/success-overlay.tsx` | Create | Animated success card + "Redirigiendo..." |
| `src/app/(coach)/coach/clients/new/create-client-form.tsx` | Create | `'use client'` form — all fields, submit, error display |
| `src/app/(coach)/coach/clients/new/page.tsx` | Create | Server Component shell — renders `CreateClientForm` |

---

### Task 1: Tighten schema + TDD tests

**Files:**
- Modify: `src/features/clients/schemas.ts`
- Create: `src/features/clients/__tests__/create-client-schema.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/features/clients/__tests__/create-client-schema.test.ts`:

```typescript
import { createClientSchema } from '../schemas'

const valid = {
  fullName: 'Sofía Torres',
  email: 'sofia@example.com',
  password: 'password123',
  age: '25',
  sex: 'female',
  goal: 'Pérdida de peso',
  weightKg: '65',
  heightCm: '165',
  experienceLevel: 'intermediate',
  daysPerWeek: '4',
  injuries: 'Ninguna',
}

describe('createClientSchema', () => {
  it('accepts fully valid data', () => {
    expect(createClientSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects empty injuries', () => {
    expect(createClientSchema.safeParse({ ...valid, injuries: '' }).success).toBe(false)
  })

  it('rejects invalid goal value', () => {
    expect(createClientSchema.safeParse({ ...valid, goal: 'Algo random' }).success).toBe(false)
  })

  it('accepts all valid goal values', () => {
    const goals = ['Pérdida de peso', 'Ganancia muscular', 'Tonificación', 'Rendimiento atlético', 'Otro']
    for (const goal of goals) {
      expect(createClientSchema.safeParse({ ...valid, goal }).success).toBe(true)
    }
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
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd "C:\Users\herna\Loboost App"
npx jest src/features/clients/__tests__/create-client-schema.test.ts --no-coverage
```

Expected: failures on injuries (optional), goal (string not enum), daysPerWeek max 7.

- [ ] **Step 3: Update the schema**

Replace the full content of `src/features/clients/schemas.ts`:

```typescript
import { z } from 'zod'

const GOALS = [
  'Pérdida de peso',
  'Ganancia muscular',
  'Tonificación',
  'Rendimiento atlético',
  'Otro',
] as const

export const GOAL_OPTIONS = GOALS

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
  injuries:        z.string().min(1, 'Escribí "Ninguna" si no tenés lesiones'),
})

export type CreateClientInput = z.infer<typeof createClientSchema>

export const updateClientProfileSchema = z.object({
  age:             z.coerce.number().int().min(10).max(100).optional(),
  sex:             z.enum(['male', 'female', 'other']).optional(),
  goal:            z.string().min(3).optional(),
  weightKg:        z.coerce.number().min(20).max(300).optional(),
  heightCm:        z.coerce.number().min(100).max(250).optional(),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  daysPerWeek:     z.coerce.number().int().min(1).max(7).optional(),
  injuries:        z.string().optional(),
})

export type UpdateClientProfileInput = z.infer<typeof updateClientProfileSchema>
```

- [ ] **Step 4: Run — expect PASS**

```bash
npx jest src/features/clients/__tests__/create-client-schema.test.ts --no-coverage
```

Expected: 8 tests pass.

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/clients/schemas.ts src/features/clients/__tests__/create-client-schema.test.ts
git commit -m "feat: tighten createClientSchema — goal enum, injuries required, max 6 days (TDD)"
```

---

### Task 2: Update Server Action for useActionState

**Files:**
- Modify: `src/features/clients/actions/create-client.ts`

`useActionState` requires the action to accept `(prevState, formData)`. Also add `clientName` to the success response so the overlay can display it.

- [ ] **Step 1: Replace the action file**

Replace the full content of `src/features/clients/actions/create-client.ts`:

```typescript
'use server'

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createClientSchema } from '@/features/clients/schemas'
import type { Database } from '@/types/database'

export type CreateClientState =
  | { success: true; clientId: string; clientName: string }
  | { success: false; error: string }
  | null

export async function createClientAction(
  _prevState: CreateClientState,
  formData: FormData
): Promise<CreateClientState> {
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
  }

  const result = createClientSchema.safeParse(raw)
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user: coachUser }, error: authGetError } = await supabase.auth.getUser()
  if (authGetError || !coachUser) return { success: false, error: 'No autenticado' }

  const supabaseAdmin = createSupabaseAdmin<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: result.data.email,
    password: result.data.password,
    email_confirm: true,
    user_metadata: { role: 'client', full_name: result.data.fullName },
  })

  if (authError || !newUser.user) {
    return { success: false, error: authError?.message ?? 'Error al crear el usuario' }
  }

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({ full_name: result.data.fullName, role: 'client', coach_id: coachUser.id })
    .eq('id', newUser.user.id)

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
    return { success: false, error: 'Error al configurar el perfil del cliente' }
  }

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
    })

  if (clientProfileError) {
    await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
    return { success: false, error: 'Error al guardar el perfil del cliente' }
  }

  return { success: true, clientId: newUser.user.id, clientName: result.data.fullName }
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/clients/actions/create-client.ts
git commit -m "feat: update createClientAction for useActionState, return clientName on success"
```

---

### Task 3: Success overlay

**Files:**
- Create: `src/app/(coach)/coach/clients/new/success-overlay.tsx`

- [ ] **Step 1: Create the component**

Create `src/app/(coach)/coach/clients/new/success-overlay.tsx`:

```typescript
'use client'

import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'

export default function SuccessOverlay({ clientName }: { clientName: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(10, 10, 10, 0.92)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3, type: 'spring', stiffness: 200, damping: 18 }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          padding: '40px 32px',
          backgroundColor: '#111317',
          border: '1px solid #1F2227',
          borderRadius: 24,
          minWidth: 260,
          textAlign: 'center',
        }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.25, type: 'spring', stiffness: 260, damping: 16 }}
        >
          <CheckCircle2 size={72} color="#B5F23D" strokeWidth={1.5} />
        </motion.div>

        <div>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#F0F0F0', marginBottom: 6 }}>
            ¡Cliente creado!
          </p>
          <p style={{ fontSize: 15, color: '#B5F23D', fontWeight: 500 }}>
            {clientName}
          </p>
        </div>

        <p style={{ fontSize: 12, color: '#6B7280' }}>
          Redirigiendo al perfil...
        </p>
      </motion.div>
    </motion.div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(coach)/coach/clients/new/success-overlay.tsx"
git commit -m "feat: add SuccessOverlay — animated checkmark + client name + redirect message"
```

---

### Task 4: Create client form component

**Files:**
- Create: `src/app/(coach)/coach/clients/new/create-client-form.tsx`

- [ ] **Step 1: Create the form**

Create `src/app/(coach)/coach/clients/new/create-client-form.tsx`:

```typescript
'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronDown } from 'lucide-react'
import { createClientAction } from '@/features/clients/actions/create-client'
import { GOAL_OPTIONS } from '@/features/clients/schemas'
import SuccessOverlay from './success-overlay'
import type { CreateClientState } from '@/features/clients/actions/create-client'

const inputStyle: React.CSSProperties = {
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

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: '#6B7280',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: 8,
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#6B7280',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: 16,
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

function SelectWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'relative' }}>
      {children}
      <ChevronDown
        size={16}
        color="#6B7280"
        style={{
          position: 'absolute',
          right: 14,
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}

export default function CreateClientForm() {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState<CreateClientState, FormData>(
    createClientAction,
    null
  )

  useEffect(() => {
    if (state?.success) {
      const timer = setTimeout(() => {
        router.push(`/coach/clients/${state.clientId}`)
      }, 2200)
      return () => clearTimeout(timer)
    }
  }, [state, router])

  return (
    <>
      {state?.success && <SuccessOverlay clientName={state.clientName} />}

      <div style={{ height: '100%', overflowY: 'auto' }}>
        {/* Sub-header con back button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '16px 20px 24px',
            position: 'sticky',
            top: 0,
            backgroundColor: '#0A0A0A',
            zIndex: 10,
          }}
        >
          <Link
            href="/coach/dashboard"
            style={{ display: 'flex', alignItems: 'center', color: '#6B7280', textDecoration: 'none' }}
          >
            <ChevronLeft size={22} />
          </Link>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#F0F0F0' }}>Nuevo cliente</span>
        </div>

        {/* Form */}
        <form
          action={formAction}
          style={{ padding: '0 20px 120px', display: 'flex', flexDirection: 'column', gap: 32 }}
        >
          {/* Sección 1: Datos del cliente */}
          <div>
            <p style={sectionTitleStyle}>Datos del cliente</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              <Field label="Nombre completo">
                <input
                  name="fullName"
                  type="text"
                  required
                  style={inputStyle}
                  placeholder="Sofía Torres"
                />
              </Field>

              <Field label="Sexo">
                <SelectWrapper>
                  <select
                    name="sex"
                    required
                    defaultValue=""
                    style={{ ...inputStyle, appearance: 'none', paddingRight: 40 }}
                  >
                    <option value="" disabled>Seleccioná...</option>
                    <option value="female">Femenino</option>
                    <option value="male">Masculino</option>
                    <option value="other">Otro</option>
                  </select>
                </SelectWrapper>
              </Field>

              {/* Edad / Peso / Altura en fila */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <Field label="Edad">
                  <input
                    name="age"
                    type="number"
                    required
                    min={10}
                    max={100}
                    style={inputStyle}
                    placeholder="25"
                  />
                </Field>
                <Field label="Peso (kg)">
                  <input
                    name="weightKg"
                    type="number"
                    required
                    min={20}
                    max={300}
                    style={inputStyle}
                    placeholder="65"
                  />
                </Field>
                <Field label="Alt (cm)">
                  <input
                    name="heightCm"
                    type="number"
                    required
                    min={100}
                    max={250}
                    style={inputStyle}
                    placeholder="165"
                  />
                </Field>
              </div>

              <Field label="Objetivo">
                <SelectWrapper>
                  <select
                    name="goal"
                    required
                    defaultValue=""
                    style={{ ...inputStyle, appearance: 'none', paddingRight: 40 }}
                  >
                    <option value="" disabled>Seleccioná...</option>
                    {GOAL_OPTIONS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </SelectWrapper>
              </Field>

              <Field label="Nivel de experiencia">
                <SelectWrapper>
                  <select
                    name="experienceLevel"
                    required
                    defaultValue=""
                    style={{ ...inputStyle, appearance: 'none', paddingRight: 40 }}
                  >
                    <option value="" disabled>Seleccioná...</option>
                    <option value="beginner">Principiante</option>
                    <option value="intermediate">Intermedio</option>
                    <option value="advanced">Avanzado</option>
                  </select>
                </SelectWrapper>
              </Field>

              <Field label="Días disponibles por semana">
                <SelectWrapper>
                  <select
                    name="daysPerWeek"
                    required
                    defaultValue=""
                    style={{ ...inputStyle, appearance: 'none', paddingRight: 40 }}
                  >
                    <option value="" disabled>Seleccioná...</option>
                    {[1, 2, 3, 4, 5, 6].map((d) => (
                      <option key={d} value={d}>
                        {d} {d === 1 ? 'día' : 'días'}
                      </option>
                    ))}
                  </select>
                </SelectWrapper>
              </Field>

              <Field label='Lesiones o limitaciones'>
                <input
                  name="injuries"
                  type="text"
                  required
                  style={inputStyle}
                  placeholder='Ej: "Rodilla derecha" o "Ninguna"'
                />
              </Field>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, backgroundColor: '#1F2227' }} />

          {/* Sección 2: Cuenta del cliente */}
          <div>
            <p style={sectionTitleStyle}>Cuenta del cliente</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              <Field label="Email">
                <input
                  name="email"
                  type="email"
                  required
                  style={inputStyle}
                  placeholder="sofia@email.com"
                />
              </Field>

              <Field label="Contraseña">
                <input
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  style={inputStyle}
                  placeholder="Mínimo 8 caracteres"
                />
              </Field>
            </div>
          </div>

          {/* Error banner */}
          {state && !state.success && (
            <div
              style={{
                backgroundColor: 'rgba(242,82,82,0.1)',
                border: '1px solid rgba(242,82,82,0.3)',
                borderRadius: 10,
                padding: '12px 16px',
                fontSize: 14,
                color: '#F25252',
              }}
            >
              {state.error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isPending}
            style={{
              width: '100%',
              height: 52,
              backgroundColor: isPending ? '#8BA82B' : '#B5F23D',
              color: '#0A0A0A',
              fontSize: 16,
              fontWeight: 700,
              border: 'none',
              borderRadius: 12,
              cursor: isPending ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s',
            }}
          >
            {isPending ? 'Creando cliente...' : 'Guardar cliente'}
          </button>
        </form>
      </div>
    </>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(coach)/coach/clients/new/create-client-form.tsx"
git commit -m "feat: add CreateClientForm — two-section form with useActionState and success overlay"
```

---

### Task 5: Page assembly

**Files:**
- Create: `src/app/(coach)/coach/clients/new/page.tsx`

- [ ] **Step 1: Create the page**

Create `src/app/(coach)/coach/clients/new/page.tsx`:

```typescript
import CreateClientForm from './create-client-form'

export default function NewClientPage() {
  return <CreateClientForm />
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run all tests**

```bash
cd "C:\Users\herna\Loboost App"
npx jest --no-coverage
```

Expected: all tests pass (including the 8 new schema tests).

- [ ] **Step 4: Manual test in browser**

1. Navigate to `http://localhost:3000/coach/clients/new`
2. Verify two sections render: "Datos del cliente" y "Cuenta del cliente"
3. Try submitting with empty fields — browser validation should block
4. Fill all fields correctly and submit
5. Verify success overlay appears with checkmark animation and client name
6. Verify auto-redirect fires after ~2 seconds (will 404 at `/coach/clients/[id]` — expected for now)
7. Check Supabase Dashboard → Authentication → Users — new user should appear
8. Check Supabase Dashboard → Table Editor → profiles + client_profiles — records should exist

- [ ] **Step 5: Commit**

```bash
git add "src/app/(coach)/coach/clients/new/page.tsx"
git commit -m "feat: add /coach/clients/new page — create client flow complete"
```
