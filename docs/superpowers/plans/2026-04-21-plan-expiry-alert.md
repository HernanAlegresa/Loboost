# Plan 5 — Alerta de plan vencido

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cuando el `end_date` de un `client_plan` activo ya pasó, el coach ve una señal visual clara: (A) badge rojo en la tarjeta del cliente en la lista, (B) banner de alerta en el perfil del cliente.

**Architecture:**
- No se requiere job de background. La lógica es reactiva: al cargar el perfil del cliente o la lista de clientes, se compara `end_date` con la fecha actual en el servidor.
- Si `end_date < today`, el plan se marca visualmente como vencido pero NO se cambia el status en DB automáticamente — el coach debe asignar un nuevo plan manualmente.
- El badge en la lista de clientes se agrega al tipo `ClientCard` ya existente.
- El banner en el perfil se agrega en la tab "Perfil" del cliente.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase, inline styles

---

## Archivos involucrados

- Read + Modify: `src/app/(coach)/coach/clients/client-card.tsx`
- Read + Modify: `src/app/(coach)/coach/clients/page.tsx` (o la query que construye la lista)
- Read + Modify: `src/app/(coach)/coach/clients/[id]/client-profile-hero-card.tsx`
- Modify: `src/app/(coach)/coach/clients/[id]/queries.ts` (si `activePlan` no expone `endDate`)
- Read + Modify: `src/features/clients/types.ts`

---

## Task 1: Verificar que `endDate` esté disponible en los tipos existentes

- [ ] **Step 1: Leer los tipos de cliente**

```bash
cat src/features/clients/types.ts
```

Confirmar que `ActivePlanSummary` incluye `endDate: string`. Si no, agregar el campo — ya está en la query `getClientProfileData` en `queries.ts` (se selecciona `end_date` del `client_plans`).

- [ ] **Step 2: Leer la query de lista de clientes**

```bash
cat src/app/\(coach\)/coach/clients/page.tsx
```

y buscar cómo se construye la lista de clientes. Si la query de lista no incluye `end_date` del plan activo, modificarla para incluirlo.

---

## Task 2: Agregar lógica de "plan vencido" como utilidad

**Files:**
- Modify: `src/features/clients/utils/training-utils.ts`

- [ ] **Step 1: Agregar la función helper al final del archivo**

```typescript
/** Retorna true si end_date (YYYY-MM-DD) ya pasó respecto a today (YYYY-MM-DD). */
export function isPlanExpired(endDate: string | null): boolean {
  if (!endDate) return false
  const today = new Date().toISOString().split('T')[0]
  return endDate < today
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

---

## Task 3: Badge de vencimiento en la tarjeta del cliente (lista)

**Files:**
- Modify: `src/app/(coach)/coach/clients/client-card.tsx`

- [ ] **Step 1: Leer el componente actual**

```bash
cat src/app/\(coach\)/coach/clients/client-card.tsx
```

- [ ] **Step 2: Agregar prop `planExpired` y el badge**

Localizar las props del componente `ClientCard`. Agregar `planExpired?: boolean`.

En el JSX, agregar badge rojo si `planExpired === true`. Ubicarlo cerca del nombre del cliente o del indicador de estado:

```typescript
{planExpired && (
  <span
    style={{
      fontSize: 10,
      fontWeight: 700,
      color: '#F25252',
      backgroundColor: 'rgba(242,82,82,0.1)',
      border: '1px solid rgba(242,82,82,0.25)',
      padding: '2px 7px',
      borderRadius: 20,
      letterSpacing: '0.05em',
    }}
  >
    PLAN VENCIDO
  </span>
)}
```

- [ ] **Step 3: Pasar `planExpired` desde la página de lista**

En `src/app/(coach)/coach/clients/page.tsx` (o donde se renderiza `ClientCard`), calcular si el plan del cliente está vencido:

```typescript
import { isPlanExpired } from '@/features/clients/utils/training-utils'

// Al renderizar ClientCard:
<ClientCard
  // ...props existentes...
  planExpired={isPlanExpired(client.activePlanEndDate ?? null)}
/>
```

Si la query de la lista no devuelve `activePlanEndDate`, modificarla para incluir el `end_date` del plan activo del cliente. La query típicamente hace un join con `client_plans` — agregar `end_date` al select.

- [ ] **Step 4: TypeScript check + commit**

```bash
npx tsc --noEmit 2>&1 | head -20
git add src/app/\(coach\)/coach/clients/client-card.tsx src/app/\(coach\)/coach/clients/page.tsx src/features/clients/utils/training-utils.ts
git commit -m "feat(coach): show 'PLAN VENCIDO' badge on client cards when plan end_date passed"
```

---

## Task 4: Banner de alerta en el perfil del cliente

**Files:**
- Modify: `src/app/(coach)/coach/clients/[id]/client-profile-hero-card.tsx`

- [ ] **Step 1: Agregar prop `planExpired` y el banner**

`ClientProfileHeroCard` ya recibe `activePlan` o equivalente. Si no recibe `endDate`, verificar que `profile.activePlan.endDate` esté disponible desde el page.tsx y pasarlo.

Agregar prop `planExpired: boolean` al componente. En el JSX, agregar el banner arriba de todo el contenido:

```typescript
{planExpired && (
  <div
    style={{
      backgroundColor: 'rgba(242,82,82,0.08)',
      border: '1px solid rgba(242,82,82,0.25)',
      borderRadius: 12,
      padding: '12px 16px',
      marginBottom: 16,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    }}
  >
    <span style={{ fontSize: 18 }}>⚠️</span>
    <div>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#F25252' }}>
        Plan vencido
      </p>
      <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9CA3AF' }}>
        El plan de este cliente ha finalizado. Asigná un nuevo plan para continuar el seguimiento.
      </p>
    </div>
  </div>
)}
```

- [ ] **Step 2: Pasar `planExpired` desde `page.tsx`**

En `src/app/(coach)/coach/clients/[id]/page.tsx`:

```typescript
import { isPlanExpired } from '@/features/clients/utils/training-utils'

// Al renderizar ClientProfileHeroCard:
<ClientProfileHeroCard
  // ...props existentes...
  planExpired={isPlanExpired(profile.activePlan?.endDate ?? null)}
/>
```

- [ ] **Step 3: TypeScript check + commit**

```bash
npx tsc --noEmit 2>&1 | head -20
git add src/app/\(coach\)/coach/clients/\[id\]/client-profile-hero-card.tsx src/app/\(coach\)/coach/clients/\[id\]/page.tsx
git commit -m "feat(coach): show expired plan alert banner in client profile"
```

---

## Verificación final del Plan 5

- [ ] Crear un cliente con plan cuyo `end_date` sea una fecha pasada (o modificar un plan existente en Supabase para test)
- [ ] En la lista `/coach/clients` → ese cliente muestra badge "PLAN VENCIDO" en rojo
- [ ] Al entrar al perfil `/coach/clients/[id]` → aparece banner de alerta con mensaje claro

```bash
npx tsc --noEmit
```

Expected: 0 errores
