# Error Boundaries — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar manejo visual de errores en rutas críticas para que si una query falla, el usuario vea un mensaje claro con opción de reintentar en lugar de una pantalla rota.

**Architecture:** Next.js App Router usa `error.tsx` (client component con `'use client'`) colocado junto al `page.tsx`. Recibe `error` y `reset` como props. Se crea un componente `ErrorView` reutilizable. Las rutas críticas son: live training, perfil cliente (coach), dashboard cliente y dashboard coach.

**Tech Stack:** Next.js 15 App Router, React, TypeScript, inline styles.

---

## Files

- **Create:** `src/components/ui/error-view.tsx` — componente base reutilizable
- **Create:** `src/app/(training)/client/training/[sessionId]/error.tsx`
- **Create:** `src/app/(coach)/coach/clients/[id]/error.tsx`
- **Create:** `src/app/(client)/client/dashboard/error.tsx`
- **Create:** `src/app/(coach)/coach/dashboard/error.tsx`

---

### Task 1: Componente base ErrorView

**Files:**
- Create: `src/components/ui/error-view.tsx`

- [ ] **Step 1: Crear el componente**

```typescript
'use client'

interface ErrorViewProps {
  title?: string
  message?: string
  onReset?: () => void
}

export default function ErrorView({
  title = 'Algo salió mal',
  message = 'Ocurrió un error inesperado. Podés intentar de nuevo.',
  onReset,
}: ErrorViewProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 32px',
        gap: 16,
        minHeight: 300,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          backgroundColor: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
        }}
      >
        ⚠
      </div>
      <p style={{ fontSize: 17, fontWeight: 700, color: '#F0F0F0', textAlign: 'center', margin: 0 }}>
        {title}
      </p>
      <p style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
        {message}
      </p>
      {onReset && (
        <button
          onClick={onReset}
          style={{
            marginTop: 8,
            backgroundColor: '#B5F23D',
            color: '#0A0A0A',
            border: 'none',
            borderRadius: 12,
            padding: '12px 28px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Intentar de nuevo
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/error-view.tsx
git commit -m "feat(ui): add ErrorView base component"
```

---

### Task 2: Error boundary en live training

**Files:**
- Create: `src/app/(training)/client/training/[sessionId]/error.tsx`

- [ ] **Step 1: Crear el archivo**

```typescript
'use client'

import ErrorView from '@/components/ui/error-view'

export default function LiveTrainingError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div style={{ backgroundColor: '#0A0A0A', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <ErrorView
        title="Error al cargar el entrenamiento"
        message="No se pudo cargar la sesión. Intentá de nuevo o volvé al inicio."
        onReset={reset}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(training\)/client/training/\[sessionId\]/error.tsx
git commit -m "feat(ui): add error boundary for live training route"
```

---

### Task 3: Error boundaries en rutas coach y cliente

**Files:**
- Create: `src/app/(coach)/coach/clients/[id]/error.tsx`
- Create: `src/app/(client)/client/dashboard/error.tsx`
- Create: `src/app/(coach)/coach/dashboard/error.tsx`

- [ ] **Step 1: Error boundary en perfil cliente (coach)**

Crear `src/app/(coach)/coach/clients/[id]/error.tsx`:

```typescript
'use client'

import ErrorView from '@/components/ui/error-view'

export default function ClientProfileError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorView
      title="Error al cargar el perfil"
      message="No se pudo cargar la información del cliente."
      onReset={reset}
    />
  )
}
```

- [ ] **Step 2: Error boundary en dashboard cliente**

Crear `src/app/(client)/client/dashboard/error.tsx`:

```typescript
'use client'

import ErrorView from '@/components/ui/error-view'

export default function ClientDashboardError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorView
      title="Error al cargar el dashboard"
      message="No se pudo cargar tu información. Intentá de nuevo."
      onReset={reset}
    />
  )
}
```

- [ ] **Step 3: Error boundary en dashboard coach**

Crear `src/app/(coach)/coach/dashboard/error.tsx`:

```typescript
'use client'

import ErrorView from '@/components/ui/error-view'

export default function CoachDashboardError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorView
      title="Error al cargar el dashboard"
      message="No se pudo cargar la información. Intentá de nuevo."
      onReset={reset}
    />
  )
}
```

- [ ] **Step 4: Commit final**

```bash
git add src/app/\(coach\)/coach/clients/\[id\]/error.tsx \
        src/app/\(client\)/client/dashboard/error.tsx \
        src/app/\(coach\)/coach/dashboard/error.tsx
git commit -m "feat(ui): add error boundaries for coach and client critical routes"
```
