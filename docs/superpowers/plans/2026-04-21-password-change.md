# Plan 4 — Cambio de contraseña (coach y cliente)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tanto el coach como el cliente pueden cambiar su contraseña desde su respectiva página de settings.

**Architecture:**
- Una sola server action `changePasswordAction` en `src/features/auth/actions/change-password.ts` que usa `supabase.auth.updateUser({ password })`.
- Un componente client reutilizable `ChangePasswordForm` en `src/components/ui/change-password-form.tsx`.
- Se importa en `src/app/(coach)/coach/settings/page.tsx` y en `src/app/(client)/client/settings/page.tsx`.

**Tech Stack:** Next.js 15, TypeScript, Supabase Auth (`updateUser`), `useActionState`, inline styles

---

## Archivos involucrados

- Create: `src/features/auth/actions/change-password.ts`
- Create: `src/components/ui/change-password-form.tsx`
- Modify: `src/app/(coach)/coach/settings/page.tsx`
- Modify: `src/app/(client)/client/settings/page.tsx`

---

## Task 1: Server action para cambio de contraseña

**Files:**
- Create: `src/features/auth/actions/change-password.ts`

- [ ] **Step 1: Crear la action**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: 'Las contraseñas no coinciden',
  path: ['confirm'],
})

export type ChangePasswordState =
  | { success: true }
  | { success: false; error: string }
  | null

export async function changePasswordAction(
  _prev: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const raw = {
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  }

  const result = schema.safeParse(raw)
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: result.data.password })

  if (error) return { success: false, error: 'No se pudo actualizar la contraseña. Intentá de nuevo.' }

  return { success: true }
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

---

## Task 2: Componente reutilizable ChangePasswordForm

**Files:**
- Create: `src/components/ui/change-password-form.tsx`

- [ ] **Step 1: Crear el componente**

```typescript
'use client'

import { useActionState } from 'react'
import { changePasswordAction } from '@/features/auth/actions/change-password'

const T = {
  card: '#111317', border: '#1F2227', lime: '#B5F23D',
  text: '#F0F0F0', muted: '#6B7280', bg: '#0F1014',
} as const

const inputStyle = {
  width: '100%', padding: '10px 12px', backgroundColor: T.bg,
  border: `1px solid ${T.border}`, borderRadius: 10,
  color: T.text, fontSize: 14, boxSizing: 'border-box' as const,
}

const labelStyle = {
  fontSize: 11, color: T.muted, display: 'block' as const, marginBottom: 4,
}

export default function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, null)

  if (state?.success) {
    return (
      <div
        style={{
          backgroundColor: 'rgba(181,242,61,0.08)',
          border: '1px solid rgba(181,242,61,0.2)',
          borderRadius: 14, padding: '14px 16px',
        }}
      >
        <p style={{ margin: 0, fontSize: 14, color: T.lime, fontWeight: 600 }}>
          ✓ Contraseña actualizada correctamente
        </p>
      </div>
    )
  }

  return (
    <div
      style={{
        backgroundColor: T.card, border: `1px solid ${T.border}`,
        borderRadius: 14, padding: '16px',
      }}
    >
      <p style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: T.text }}>
        Cambiar contraseña
      </p>
      <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={labelStyle}>Nueva contraseña</label>
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Confirmar contraseña</label>
          <input
            name="confirm"
            type="password"
            autoComplete="new-password"
            placeholder="Repetí la contraseña"
            style={inputStyle}
          />
        </div>

        {state && !state.success && (
          <p style={{ fontSize: 12, color: '#F25252', margin: 0 }}>{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          style={{
            padding: '11px 0', backgroundColor: T.lime, border: 'none',
            borderRadius: 10, color: '#0A0A0A', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', opacity: pending ? 0.6 : 1, marginTop: 4,
          }}
        >
          {pending ? 'Guardando...' : 'Cambiar contraseña'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

---

## Task 3: Integrar en settings del coach

**Files:**
- Modify: `src/app/(coach)/coach/settings/page.tsx`

- [ ] **Step 1: Agregar sección de cambio de contraseña**

Leer `src/app/(coach)/coach/settings/page.tsx`. Localizar la sección "Cuenta" o "Seguridad" (o crearla).

Agregar antes del botón de cerrar sesión:

```typescript
import ChangePasswordForm from '@/components/ui/change-password-form'

// Nueva sección en el JSX, antes de "Cerrar sesión":
<div>
  <p style={SECTION_LABEL}>Seguridad</p>
  <ChangePasswordForm />
</div>
```

Donde `SECTION_LABEL` es el estilo CSS existente en la página para los labels de sección. Si no existe con ese nombre, usar:

```typescript
const SECTION_LABEL: CSSProperties = {
  fontSize: 11, fontWeight: 600, color: '#6B7280',
  letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12,
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/features/auth/actions/change-password.ts src/components/ui/change-password-form.tsx src/app/\(coach\)/coach/settings/page.tsx
git commit -m "feat(auth): add change password form for coach settings"
```

---

## Task 4: Integrar en settings del cliente

**Files:**
- Modify: `src/app/(client)/client/settings/page.tsx`

- [ ] **Step 1: Agregar sección de cambio de contraseña**

En `src/app/(client)/client/settings/page.tsx`, agregar import y sección antes del botón de cerrar sesión:

```typescript
import ChangePasswordForm from '@/components/ui/change-password-form'

// Nueva sección:
<div>
  <p style={SECTION_LABEL}>Seguridad</p>
  <ChangePasswordForm />
</div>
```

La variable `SECTION_LABEL` ya existe en ese archivo con el nombre exacto `SECTION_LABEL`.

- [ ] **Step 2: TypeScript check + commit**

```bash
npx tsc --noEmit 2>&1 | head -20
git add src/app/\(client\)/client/settings/page.tsx
git commit -m "feat(auth): add change password form for client settings"
```

---

## Verificación final del Plan 4

- [ ] Coach abre `/coach/settings` → ve sección "Seguridad" → ingresa nueva contraseña → éxito
- [ ] Cliente abre `/client/settings` → ve sección "Seguridad" → ingresa nueva contraseña → éxito
- [ ] Probar con contraseñas que no coinciden → muestra error "Las contraseñas no coinciden"
- [ ] Probar con menos de 8 caracteres → muestra error "Mínimo 8 caracteres"

```bash
npx tsc --noEmit
```

Expected: 0 errores
