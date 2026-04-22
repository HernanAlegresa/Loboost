# Skeleton Loaders + Loading States — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar pantallas de loading con skeletons animados en todas las rutas principales, para que la app se vea profesional y no muestre pantallas en blanco mientras carga.

**Architecture:** Next.js App Router usa `loading.tsx` colocado junto a `page.tsx` para mostrar automáticamente el fallback durante el fetch del Server Component. Se crea un componente `SkeletonBlock` reutilizable con animación shimmer pura en CSS (sin dependencias). Cada `loading.tsx` reconstruye la silueta aproximada de su página.

**Tech Stack:** Next.js 15 App Router, TypeScript, inline styles, CSS animation via `@keyframes` inyectado en `<style>` tag.

---

## Files

- **Create:** `src/components/ui/skeleton.tsx` — componente base SkeletonBlock con shimmer
- **Create:** `src/app/(client)/client/dashboard/loading.tsx`
- **Create:** `src/app/(client)/client/progress/loading.tsx`
- **Create:** `src/app/(client)/client/history/loading.tsx`
- **Create:** `src/app/(client)/client/plan/loading.tsx`
- **Create:** `src/app/(coach)/coach/dashboard/loading.tsx`
- **Create:** `src/app/(coach)/coach/clients/loading.tsx`
- **Create:** `src/app/(coach)/coach/clients/[id]/loading.tsx`
- **Create:** `src/app/(coach)/coach/library/plans/loading.tsx`

---

### Task 1: Componente base SkeletonBlock

**Files:**
- Create: `src/components/ui/skeleton.tsx`

- [ ] **Step 1: Crear el componente con shimmer CSS**

```typescript
import type { CSSProperties } from 'react'

const SHIMMER_STYLE = `
@keyframes shimmer {
  0% { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
`

interface SkeletonProps {
  width?: number | string
  height?: number | string
  borderRadius?: number | string
  style?: CSSProperties
}

export default function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  return (
    <>
      <style>{SHIMMER_STYLE}</style>
      <div
        style={{
          width,
          height,
          borderRadius,
          background: 'linear-gradient(90deg, #1A1D24 25%, #22262F 50%, #1A1D24 75%)',
          backgroundSize: '800px 100%',
          animation: 'shimmer 1.4s infinite linear',
          flexShrink: 0,
          ...style,
        }}
      />
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/skeleton.tsx
git commit -m "feat(ui): add Skeleton component with shimmer animation"
```

---

### Task 2: Loading del dashboard cliente

**Files:**
- Create: `src/app/(client)/client/dashboard/loading.tsx`

- [ ] **Step 1: Crear el archivo**

```typescript
import Skeleton from '@/components/ui/skeleton'

export default function ClientDashboardLoading() {
  return (
    <div style={{ padding: '20px 20px 120px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header avatar + nombre */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#1A1D24', flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
          <Skeleton width={80} height={11} />
          <Skeleton width={140} height={20} />
        </div>
      </div>
      {/* Plan activo */}
      <div style={{ background: '#111317', border: '1px solid #1F2227', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Skeleton width={120} height={16} />
        <Skeleton width={180} height={11} />
        <Skeleton height={4} borderRadius={9999} />
      </div>
      {/* Semana strip */}
      <div style={{ display: 'flex', gap: 8 }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 56, background: '#111317', border: '1px solid #1F2227', borderRadius: 12 }} />
        ))}
      </div>
      {/* Hoy card */}
      <div style={{ background: '#111317', border: '1px solid #1F2227', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Skeleton width={60} height={11} />
        <Skeleton height={20} />
        <Skeleton width="70%" height={14} />
        <Skeleton height={44} borderRadius={12} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(client\)/client/dashboard/loading.tsx
git commit -m "feat(ui): add skeleton loading for client dashboard"
```

---

### Task 3: Loading del progreso cliente

**Files:**
- Create: `src/app/(client)/client/progress/loading.tsx`

- [ ] **Step 1: Crear el archivo**

```typescript
import Skeleton from '@/components/ui/skeleton'

export default function ClientProgressLoading() {
  return (
    <div style={{ padding: '20px 20px 120px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8 }}>
        <Skeleton width={80} height={32} borderRadius={20} />
        <Skeleton width={72} height={32} borderRadius={20} />
        <Skeleton width={100} height={32} borderRadius={20} />
      </div>
      {/* Exercise cards */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} style={{ background: '#111317', border: '1px solid #1F2227', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Skeleton width={160} height={16} />
          <Skeleton height={120} borderRadius={10} />
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(client\)/client/progress/loading.tsx
git commit -m "feat(ui): add skeleton loading for client progress"
```

---

### Task 4: Loading del historial cliente

**Files:**
- Create: `src/app/(client)/client/history/loading.tsx`

- [ ] **Step 1: Crear el archivo**

```typescript
import Skeleton from '@/components/ui/skeleton'

export default function ClientHistoryLoading() {
  return (
    <div style={{ padding: '20px 20px 120px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Skeleton width={100} height={11} />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ background: '#111317', border: '1px solid #1F2227', borderRadius: 14, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton width={100} height={14} />
            <Skeleton width={60} height={11} />
          </div>
          <Skeleton width={40} height={22} borderRadius={20} />
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Crear loading del plan cliente**

Crear `src/app/(client)/client/plan/loading.tsx`:

```typescript
import Skeleton from '@/components/ui/skeleton'

export default function ClientPlanLoading() {
  return (
    <div style={{ padding: '20px 20px 120px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Skeleton width={180} height={22} />
      <Skeleton width={120} height={13} />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ background: '#111317', border: '1px solid #1F2227', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Skeleton width={140} height={16} />
          <Skeleton width="90%" height={13} />
          <Skeleton width="70%" height={13} />
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(client\)/client/history/loading.tsx src/app/\(client\)/client/plan/loading.tsx
git commit -m "feat(ui): add skeleton loading for client history and plan"
```

---

### Task 5: Loading del dashboard coach + clientes

**Files:**
- Create: `src/app/(coach)/coach/dashboard/loading.tsx`
- Create: `src/app/(coach)/coach/clients/loading.tsx`
- Create: `src/app/(coach)/coach/clients/[id]/loading.tsx`
- Create: `src/app/(coach)/coach/library/plans/loading.tsx`

- [ ] **Step 1: Dashboard coach loading**

Crear `src/app/(coach)/coach/dashboard/loading.tsx`:

```typescript
import Skeleton from '@/components/ui/skeleton'

export default function CoachDashboardLoading() {
  return (
    <div style={{ padding: '28px 20px 120px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 120, height: 120, borderRadius: '50%', background: '#1A1D24' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          <Skeleton width={120} height={22} />
          <Skeleton width={160} height={36} />
          <Skeleton width={100} height={14} />
        </div>
      </div>
      {/* Heatmap */}
      <Skeleton height={180} borderRadius={16} />
    </div>
  )
}
```

- [ ] **Step 2: Clients list loading**

Crear `src/app/(coach)/coach/clients/loading.tsx`:

```typescript
import Skeleton from '@/components/ui/skeleton'

export default function CoachClientsLoading() {
  return (
    <div style={{ padding: '20px 20px 120px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Skeleton width={100} height={11} style={{ marginBottom: 8 }} />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ background: '#111317', border: '1px solid #1F2227', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#1A1D24', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
            <Skeleton width={130} height={14} />
            <Skeleton width={80} height={11} />
          </div>
          <Skeleton width={60} height={22} borderRadius={20} />
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Client profile loading**

Crear `src/app/(coach)/coach/clients/[id]/loading.tsx`:

```typescript
import Skeleton from '@/components/ui/skeleton'

export default function ClientProfileLoading() {
  return (
    <div style={{ padding: '0 0 120px', display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Hero card */}
      <div style={{ background: '#111317', padding: '20px 20px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#1A1D24', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton width={150} height={18} />
            <Skeleton width={100} height={12} />
          </div>
        </div>
        {/* KPIs */}
        <div style={{ display: 'flex', gap: 8 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} height={60} borderRadius={12} style={{ flex: 1 }} />
          ))}
        </div>
      </div>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #1F2227' }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} height={44} style={{ flex: 1 }} borderRadius={0} />
        ))}
      </div>
      {/* Content */}
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height={72} borderRadius={14} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Library plans loading**

Crear `src/app/(coach)/coach/library/plans/loading.tsx`:

```typescript
import Skeleton from '@/components/ui/skeleton'

export default function LibraryPlansLoading() {
  return (
    <div style={{ padding: '20px 20px 120px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ background: '#111317', border: '1px solid #1F2227', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Skeleton width={180} height={16} />
          <Skeleton width={100} height={12} />
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Commit final**

```bash
git add src/app/\(coach\)/coach/dashboard/loading.tsx \
        src/app/\(coach\)/coach/clients/loading.tsx \
        src/app/\(coach\)/coach/clients/\[id\]/loading.tsx \
        src/app/\(coach\)/coach/library/plans/loading.tsx
git commit -m "feat(ui): add skeleton loading for all coach routes"
```
