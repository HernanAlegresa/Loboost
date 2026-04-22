# Assign Plan Shortcut from Expired Banner — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar un botón "Asignar nuevo plan →" dentro del banner rojo "Plan vencido" en el perfil del cliente (coach), para que el coach pueda ir directo a asignar sin navegar manualmente.

**Architecture:** `ClientProfileHeroCard` ya recibe `planExpired: boolean` y renderiza el banner. Se agrega una prop `clientId: string` al componente. El banner incluye un `<Link>` que apunta a `/coach/library/plans/[id]/assign?clientId=<clientId>` — o más simple, a la lista de planes pre-filtrada: `/coach/library/plans?assignTo=<clientId>`. La página de la lista de planes lee el query param y puede pre-seleccionar el cliente. Como la página de assign ya existe (`/coach/library/plans/[id]/assign`), el botón lleva a `/coach/library/plans` con el param para que el coach elija qué plan asignar.

**Tech Stack:** Next.js 15, React, TypeScript, inline styles, Lucide React.

---

## Files

- **Modify:** `src/app/(coach)/coach/clients/[id]/client-profile-hero-card.tsx` — agregar prop `clientId` y Link en el banner
- **Modify:** `src/app/(coach)/coach/clients/[id]/page.tsx` — pasar `clientId` al hero card

---

### Task 1: Agregar botón en el banner de plan vencido

**Files:**
- Modify: `src/app/(coach)/coach/clients/[id]/client-profile-hero-card.tsx`

- [ ] **Step 1: Agregar `clientId` a las props del componente**

Buscar la definición del tipo `Props` (línea 1-13 aprox.):

```typescript
// ANTES:
type Props = {
  fullName: string
  statusColor: 'active' | 'warning' | 'critical'
  sex: 'male' | 'female' | 'other' | null
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | null
  age: number | null
  weightKg: number | null
  heightCm: number | null
  daysPerWeek: number
  injuries: string | null
  planExpired: boolean
}
```

Reemplazar con:

```typescript
type Props = {
  clientId: string
  fullName: string
  statusColor: 'active' | 'warning' | 'critical'
  sex: 'male' | 'female' | 'other' | null
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | null
  age: number | null
  weightKg: number | null
  heightCm: number | null
  daysPerWeek: number
  injuries: string | null
  planExpired: boolean
}
```

- [ ] **Step 2: Agregar el import de Link**

Al inicio del archivo, agregar:

```typescript
import Link from 'next/link'
```

- [ ] **Step 3: Recibir `clientId` en la función del componente**

Buscar la línea:
```typescript
export default function ClientProfileHeroCard({
  fullName,
  statusColor,
  ...
```

Agregar `clientId` a la destructuración:

```typescript
export default function ClientProfileHeroCard({
  clientId,
  fullName,
  statusColor,
  sex,
  experienceLevel,
  age,
  weightKg,
  heightCm,
  daysPerWeek,
  injuries,
  planExpired,
}: Props) {
```

- [ ] **Step 4: Agregar el botón dentro del banner de plan vencido**

Buscar el bloque del banner (aprox. línea 66-88):

```typescript
// ANTES — el div interno del banner:
<div>
  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#F25252' }}>
    Plan vencido
  </p>
  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9CA3AF' }}>
    El plan de este cliente ha finalizado. Asigná un nuevo plan para continuar el seguimiento.
  </p>
</div>
```

Reemplazar con:

```typescript
<div style={{ flex: 1 }}>
  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#F25252' }}>
    Plan vencido
  </p>
  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9CA3AF' }}>
    El plan de este cliente ha finalizado.
  </p>
  <Link
    href={`/coach/library/plans?assignTo=${clientId}`}
    style={{
      display: 'inline-block',
      marginTop: 8,
      fontSize: 12,
      fontWeight: 700,
      color: '#0A0A0A',
      backgroundColor: '#B5F23D',
      borderRadius: 8,
      padding: '6px 12px',
      textDecoration: 'none',
    }}
  >
    Asignar nuevo plan →
  </Link>
</div>
```

- [ ] **Step 5: Commit**

```bash
git add src/app/\(coach\)/coach/clients/\[id\]/client-profile-hero-card.tsx
git commit -m "feat(coach): add assign plan shortcut button in expired plan banner"
```

---

### Task 2: Pasar clientId desde la page al hero card

**Files:**
- Modify: `src/app/(coach)/coach/clients/[id]/page.tsx`

- [ ] **Step 1: Pasar `clientId` al componente**

En `page.tsx`, buscar donde se renderiza `<ClientProfileHeroCard`:

```typescript
// ANTES (ejemplo):
<ClientProfileHeroCard
  fullName={profile.fullName}
  statusColor={...}
  ...
  planExpired={planExpired}
/>
```

Agregar la prop `clientId`:

```typescript
<ClientProfileHeroCard
  clientId={id}
  fullName={profile.fullName}
  statusColor={...}
  ...
  planExpired={planExpired}
/>
```

La variable `id` ya existe en el scope (viene de `const { id } = await params`).

- [ ] **Step 2: Test manual**

1. Ir a `/coach/clients/[id]` de un cliente con plan vencido
2. Verificar que aparece el banner rojo con el botón verde "Asignar nuevo plan →"
3. Hacer click en el botón
4. Verificar que navega a `/coach/library/plans?assignTo=[clientId]`

- [ ] **Step 3: Commit**

```bash
git add src/app/\(coach\)/coach/clients/\[id\]/page.tsx
git commit -m "feat(coach): wire clientId prop to ClientProfileHeroCard"
```
