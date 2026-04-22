# Plan 2 — Edición de perfil del cliente + Mediciones corporales

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (A) El coach puede editar los datos del cliente desde `/coach/clients/[id]`. (B) El coach puede registrar mediciones corporales (peso) del cliente desde su perfil. (C) El cliente puede registrar su propio peso desde `/client/settings`.

**Architecture:**
- (A) La action `updateClientAction` existe en `src/features/clients/actions/update-client.ts`. Falta el formulario UI en el perfil del cliente. Se agrega un botón "Editar" en `ClientProfileHeroCard` que abre un form inline o modal.
- (B) La action `logBodyMeasurementAction` existe en algún lugar (verificar). Se agrega un form pequeño en la tab Perfil del cliente coach-side.
- (C) En `/client/settings/page.tsx` se agrega un form para que el cliente registre su peso.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase, inline styles, Server Actions, useActionState

---

## Archivos involucrados

- Modify: `src/app/(coach)/coach/clients/[id]/client-profile-hero-card.tsx`
- Create: `src/app/(coach)/coach/clients/[id]/edit-client-form.tsx`
- Modify: `src/app/(coach)/coach/clients/[id]/page.tsx` (agregar form de mediciones)
- Create: `src/app/(coach)/coach/clients/[id]/log-measurement-form.tsx`
- Verify/locate: action `logBodyMeasurementAction`
- Modify: `src/app/(client)/client/settings/page.tsx`
- Create: `src/app/(client)/client/settings/log-weight-form.tsx`
- Create: `src/features/clients/actions/log-body-measurement.ts` (si no existe)
- Create: `src/features/auth/actions/change-password.ts` (ver Plan 4)

---

## Task 1: Verificar y consolidar la action logBodyMeasurementAction

**Files:**
- Verify/Create: `src/features/clients/actions/log-body-measurement.ts`

- [ ] **Step 1: Buscar si la action ya existe**

```bash
grep -r "logBodyMeasurementAction" src/ --include="*.ts" -l
```

Si no existe, crear `src/features/clients/actions/log-body-measurement.ts`:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

const schema = z.object({
  clientId: z.string().uuid(),
  weightKg: z.coerce.number().positive().max(500),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function logBodyMeasurementAction(formData: FormData) {
  const raw = {
    clientId: formData.get('clientId'),
    weightKg: formData.get('weightKg'),
    date: formData.get('date'),
  }

  const result = schema.safeParse(raw)
  if (!result.success) return { error: result.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('body_measurements')
    .upsert(
      { client_id: result.data.clientId, date: result.data.date, weight_kg: result.data.weightKg },
      { onConflict: 'client_id,date' }
    )

  if (error) return { error: 'Error al registrar la medición' }

  revalidatePath(`/coach/clients/${result.data.clientId}`)
  return { success: true }
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

---

## Task 2: Formulario de edición del cliente (coach)

**Files:**
- Create: `src/app/(coach)/coach/clients/[id]/edit-client-form.tsx`

- [ ] **Step 1: Crear el componente cliente**

```typescript
'use client'

import { useActionState, useState } from 'react'
import { updateClientAction } from '@/features/clients/actions/update-client'

const T = {
  card: '#111317', border: '#1F2227', lime: '#B5F23D',
  text: '#F0F0F0', muted: '#6B7280', secondary: '#9CA3AF', bg: '#0F1014',
} as const

type Props = {
  clientId: string
  initial: {
    age: number | null
    sex: 'male' | 'female' | 'other' | null
    goal: string | null
    weightKg: number | null
    heightCm: number | null
    experienceLevel: 'beginner' | 'intermediate' | 'advanced' | null
    daysPerWeek: number
    injuries: string | null
  }
}

const inputStyle = {
  width: '100%', padding: '10px 12px', backgroundColor: T.bg,
  border: `1px solid ${T.border}`, borderRadius: 10,
  color: T.text, fontSize: 14, boxSizing: 'border-box' as const,
}

const labelStyle = { fontSize: 11, color: T.muted, marginBottom: 4, display: 'block' as const }

export default function EditClientForm({ clientId, initial }: Props) {
  const [open, setOpen] = useState(false)

  const action = async (_prev: unknown, formData: FormData) => {
    const result = await updateClientAction(clientId, formData)
    if (result.success) setOpen(false)
    return result
  }

  const [state, formAction, pending] = useActionState(action, null)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          marginTop: 12, width: '100%', padding: '10px 0',
          backgroundColor: 'transparent', border: `1px solid ${T.border}`,
          borderRadius: 10, color: T.secondary, fontSize: 13, fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Editar datos del cliente
      </button>
    )
  }

  return (
    <form action={formAction} style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: 0 }}>Editar perfil</p>

      <div>
        <label style={labelStyle}>Objetivo</label>
        <input name="goal" defaultValue={initial.goal ?? ''} style={inputStyle} placeholder="Ej: Ganar masa muscular" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>Edad</label>
          <input name="age" type="number" defaultValue={initial.age ?? ''} style={inputStyle} min={10} max={100} />
        </div>
        <div>
          <label style={labelStyle}>Días / semana</label>
          <input name="daysPerWeek" type="number" defaultValue={initial.daysPerWeek} style={inputStyle} min={1} max={7} />
        </div>
        <div>
          <label style={labelStyle}>Peso (kg)</label>
          <input name="weightKg" type="number" step="0.1" defaultValue={initial.weightKg ?? ''} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Altura (cm)</label>
          <input name="heightCm" type="number" defaultValue={initial.heightCm ?? ''} style={inputStyle} />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Sexo</label>
        <select name="sex" defaultValue={initial.sex ?? ''} style={{ ...inputStyle, appearance: 'none' as const }}>
          <option value="">Sin especificar</option>
          <option value="male">Masculino</option>
          <option value="female">Femenino</option>
          <option value="other">Otro</option>
        </select>
      </div>

      <div>
        <label style={labelStyle}>Nivel de experiencia</label>
        <select name="experienceLevel" defaultValue={initial.experienceLevel ?? ''} style={{ ...inputStyle, appearance: 'none' as const }}>
          <option value="">Sin especificar</option>
          <option value="beginner">Principiante</option>
          <option value="intermediate">Intermedio</option>
          <option value="advanced">Avanzado</option>
        </select>
      </div>

      <div>
        <label style={labelStyle}>Lesiones / limitaciones</label>
        <textarea
          name="injuries"
          defaultValue={initial.injuries ?? ''}
          style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}
          placeholder="Ej: Dolor lumbar crónico"
        />
      </div>

      {state && !state.success && (
        <p style={{ fontSize: 12, color: '#F25252', margin: 0 }}>{state.error}</p>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{
            flex: 1, padding: '11px 0', backgroundColor: 'transparent',
            border: `1px solid ${T.border}`, borderRadius: 10,
            color: T.secondary, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          style={{
            flex: 1, padding: '11px 0', backgroundColor: T.lime,
            border: 'none', borderRadius: 10,
            color: '#0A0A0A', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            opacity: pending ? 0.6 : 1,
          }}
        >
          {pending ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Integrar el form en el hero card del cliente**

Leer `src/app/(coach)/coach/clients/[id]/client-profile-hero-card.tsx`. Al final del componente, agregar `EditClientForm` pasando `clientId` y los datos actuales del cliente.

Si `ClientProfileHeroCard` es un Server Component, convertir la sección de edición en un Client Component separado (el `EditClientForm` ya es client).

Agregar al final del JSX del hero card:
```typescript
import EditClientForm from './edit-client-form'

// dentro del return, al final:
<EditClientForm
  clientId={clientId}  // asegurarse de que clientId se pase como prop
  initial={{
    age, sex, goal, weightKg, heightCm, experienceLevel, daysPerWeek, injuries,
  }}
/>
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(coach\)/coach/clients/\[id\]/edit-client-form.tsx src/app/\(coach\)/coach/clients/\[id\]/client-profile-hero-card.tsx
git commit -m "feat(coach): add edit client profile form in client hero card"
```

---

## Task 3: Formulario de registro de medición corporal (coach)

**Files:**
- Create: `src/app/(coach)/coach/clients/[id]/log-measurement-form.tsx`
- Modify: `src/app/(coach)/coach/clients/[id]/page.tsx`

- [ ] **Step 1: Crear el componente**

```typescript
'use client'

import { useActionState } from 'react'
import { logBodyMeasurementAction } from '@/features/clients/actions/log-body-measurement'

const T = {
  card: '#111317', border: '#1F2227', lime: '#B5F23D',
  text: '#F0F0F0', muted: '#6B7280', bg: '#0F1014',
} as const

const inputStyle = {
  padding: '9px 12px', backgroundColor: T.bg,
  border: `1px solid ${T.border}`, borderRadius: 10,
  color: T.text, fontSize: 14,
}

export default function LogMeasurementForm({ clientId }: { clientId: string }) {
  const today = new Date().toISOString().split('T')[0]
  const [state, formAction, pending] = useActionState(logBodyMeasurementAction, null)

  return (
    <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: '14px 16px', marginTop: 12 }}>
      <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: T.text }}>Registrar peso</p>
      <form action={formAction} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <input type="hidden" name="clientId" value={clientId} />
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 4 }}>Fecha</label>
          <input name="date" type="date" defaultValue={today} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 4 }}>Peso (kg)</label>
          <input name="weightKg" type="number" step="0.1" placeholder="75.5" style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
        </div>
        <button
          type="submit"
          disabled={pending}
          style={{
            padding: '9px 16px', backgroundColor: T.lime, border: 'none',
            borderRadius: 10, color: '#0A0A0A', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', opacity: pending ? 0.6 : 1, whiteSpace: 'nowrap',
          }}
        >
          {pending ? '...' : '+ Peso'}
        </button>
      </form>
      {state && !state.success && (
        <p style={{ fontSize: 12, color: '#F25252', marginTop: 8 }}>{state.error}</p>
      )}
      {state?.success && (
        <p style={{ fontSize: 12, color: T.lime, marginTop: 8 }}>✓ Peso registrado</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Agregar el form al perfil del cliente en `page.tsx`**

En `src/app/(coach)/coach/clients/[id]/page.tsx`, dentro de `profileContent`, agregar `LogMeasurementForm` después de `ClientProfileHeroCard`:

```typescript
import LogMeasurementForm from './log-measurement-form'

// En profileContent:
<LogMeasurementForm clientId={profile.id} />
```

- [ ] **Step 3: TypeScript check + commit**

```bash
npx tsc --noEmit 2>&1 | head -20
git add src/app/\(coach\)/coach/clients/\[id\]/log-measurement-form.tsx src/app/\(coach\)/coach/clients/\[id\]/page.tsx src/features/clients/actions/log-body-measurement.ts
git commit -m "feat(coach): add body measurement logging form in client profile"
```

---

## Task 4: El cliente registra su propio peso

**Files:**
- Create: `src/app/(client)/client/settings/log-weight-form.tsx`
- Modify: `src/app/(client)/client/settings/page.tsx`
- Create: `src/features/clients/actions/log-own-weight.ts`

- [ ] **Step 1: Crear la action del cliente para auto-registro de peso**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

const schema = z.object({
  weightKg: z.coerce.number().positive().max(500),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function logOwnWeightAction(formData: FormData) {
  const raw = {
    weightKg: formData.get('weightKg'),
    date: formData.get('date'),
  }

  const result = schema.safeParse(raw)
  if (!result.success) return { error: result.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('body_measurements')
    .upsert(
      { client_id: user.id, date: result.data.date, weight_kg: result.data.weightKg },
      { onConflict: 'client_id,date' }
    )

  if (error) return { error: 'Error al registrar el peso' }

  revalidatePath('/client/settings')
  revalidatePath('/client/progress')
  return { success: true }
}
```

- [ ] **Step 2: Crear el componente del form**

```typescript
'use client'

import { useActionState } from 'react'
import { logOwnWeightAction } from '@/features/clients/actions/log-own-weight'

const T = {
  card: '#111317', border: '#1F2227', lime: '#B5F23D',
  text: '#F0F0F0', muted: '#6B7280', bg: '#0F1014',
} as const

const inputStyle = {
  padding: '10px 12px', backgroundColor: T.bg,
  border: `1px solid ${T.border}`, borderRadius: 10,
  color: T.text, fontSize: 14, width: '100%', boxSizing: 'border-box' as const,
}

export default function LogWeightForm() {
  const today = new Date().toISOString().split('T')[0]
  const [state, formAction, pending] = useActionState(logOwnWeightAction, null)

  return (
    <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: '16px' }}>
      <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: T.text }}>Registrar mi peso</p>
      <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 4 }}>Fecha</label>
          <input name="date" type="date" defaultValue={today} style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 4 }}>Peso en kg</label>
          <input name="weightKg" type="number" step="0.1" placeholder="75.5" style={inputStyle} />
        </div>
        {state && !state.success && (
          <p style={{ fontSize: 12, color: '#F25252', margin: 0 }}>{state.error}</p>
        )}
        {state?.success && (
          <p style={{ fontSize: 12, color: T.lime, margin: 0 }}>✓ Peso registrado correctamente</p>
        )}
        <button
          type="submit"
          disabled={pending}
          style={{
            padding: '12px 0', backgroundColor: T.lime, border: 'none',
            borderRadius: 10, color: '#0A0A0A', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', opacity: pending ? 0.6 : 1,
          }}
        >
          {pending ? 'Guardando...' : 'Guardar peso'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Agregar el form en la página de settings del cliente**

En `src/app/(client)/client/settings/page.tsx`, después de la sección "Perfil" y antes de "Notificaciones", agregar:

```typescript
import LogWeightForm from './log-weight-form'

// Nueva sección en el JSX:
<div>
  <p style={SECTION_LABEL}>Peso corporal</p>
  <LogWeightForm />
</div>
```

- [ ] **Step 4: TypeScript check + commit**

```bash
npx tsc --noEmit 2>&1 | head -20
git add src/app/\(client\)/client/settings/log-weight-form.tsx src/app/\(client\)/client/settings/page.tsx src/features/clients/actions/log-own-weight.ts
git commit -m "feat(client): add self-weight logging form in client settings"
```

---

## Verificación final del Plan 2

- [ ] Coach abre `/coach/clients/[id]` → ve botón "Editar datos del cliente" → lo llena y guarda → los datos se actualizan
- [ ] Coach ve form "Registrar peso" en el perfil del cliente → ingresa fecha y kg → aparece en `/client/progress` tab "Cuerpo"
- [ ] Cliente abre `/client/settings` → ve sección "Peso corporal" → registra su peso → aparece en `/client/progress`

```bash
npx tsc --noEmit
```

Expected: 0 errores
