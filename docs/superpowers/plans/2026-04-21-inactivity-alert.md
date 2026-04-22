# Inactivity Alert Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar un badge "X días sin entrenar" en la client card del coach cuando un cliente lleva 7 o más días sin registrar una sesión.

**Architecture:** `DashboardClientSummary` ya tiene `daysSinceLastSession`. `ClientListItem` en `clients-tabs-container.tsx` ya mapea este campo (línea 177). Solo falta: (1) pasar el dato como prop a `ClientCard`, y (2) renderizar el badge condicionalmente. Cambio puramente de UI, sin backend ni queries nuevas.

**Tech Stack:** Next.js 14, React, TypeScript.

---

## Files

- **Modify:** `src/app/(coach)/coach/clients/client-card.tsx` — añadir prop `daysSinceLastSession` + badge
- **Modify:** `src/app/(coach)/coach/clients/clients-tabs-container.tsx` — pasar el prop al renderizar `ClientCard` (línea ~533)

---

### Task 1: `ClientCard` recibe y muestra el badge de inactividad

**Files:**
- Modify: `src/app/(coach)/coach/clients/client-card.tsx`

- [ ] **Step 1: Añadir `daysSinceLastSession` a los Props**

Localizar el tipo `Props` (~línea 19). Reemplazar con:

```typescript
type Props = {
  clientId: string
  fullName: string
  state: ClientHealthState
  completedThisWeek: number
  plannedDaysPerWeek: number
  planExpired?: boolean
  daysSinceLastSession?: number | null   // ← nuevo
}
```

- [ ] **Step 2: Desestructurar el nuevo prop**

Localizar la firma del componente (~línea 28). Reemplazar con:

```typescript
export default function ClientCard({
  clientId,
  fullName,
  state,
  completedThisWeek,
  plannedDaysPerWeek,
  planExpired,
  daysSinceLastSession,
}: Props) {
```

- [ ] **Step 3: Renderizar el badge de inactividad junto al badge de plan vencido**

Localizar el bloque `{planExpired && (` (~línea 79). Añadir el badge de inactividad justo después del cierre de ese bloque `)}`:

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
      display: 'inline-block',
      marginTop: 4,
    }}
  >
    PLAN VENCIDO
  </span>
)}

{!planExpired &&
  daysSinceLastSession != null &&
  daysSinceLastSession >= 7 && (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: '#F2994A',
        backgroundColor: 'rgba(242,153,74,0.1)',
        border: '1px solid rgba(242,153,74,0.25)',
        padding: '2px 7px',
        borderRadius: 20,
        letterSpacing: '0.05em',
        display: 'inline-block',
        marginTop: 4,
      }}
    >
      {daysSinceLastSession}D SIN ENTRENAR
    </span>
  )}
```

> **Nota:** El badge de inactividad NO se muestra si `planExpired` es true — en ese caso el badge de plan vencido ya cubre el contexto de mayor urgencia. El color naranja (`#F2994A`) coincide con el estado `atrasado`.

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 5: Commit parcial**

```bash
git add src/app/\(coach\)/coach/clients/client-card.tsx
git commit -m "feat(coach): add daysSinceLastSession badge to ClientCard"
```

---

### Task 2: `clients-tabs-container.tsx` pasa el nuevo prop

**Files:**
- Modify: `src/app/(coach)/coach/clients/clients-tabs-container.tsx`

- [ ] **Step 1: Pasar `daysSinceLastSession` al renderizar `ClientCard`**

Localizar el bloque `<ClientCard` (~línea 533). Añadir el prop:

```typescript
<ClientCard
  key={client.id}
  clientId={client.id}
  fullName={client.fullName}
  state={client.state}
  completedThisWeek={client.completedThisWeek}
  plannedDaysPerWeek={client.plannedDaysPerWeek}
  planExpired={client.planExpired}
  daysSinceLastSession={client.daysSinceLastSession}   // ← nuevo
/>
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(coach\)/coach/clients/clients-tabs-container.tsx
git commit -m "feat(coach): pass daysSinceLastSession to ClientCard for inactivity badge"
```

---

## Self-Review

- ✅ Sin cambios de backend — `daysSinceLastSession` ya existe en `DashboardClientSummary` y en `ClientListItem`
- ✅ Badge solo aparece cuando `>= 7 días` (umbral razonable: 1 semana)
- ✅ Badge de plan vencido tiene prioridad sobre badge de inactividad (no se superponen)
- ✅ Prop opcional con `?` — no rompe renders existentes ni el retroactive logging page
- ✅ Color naranja diferenciado del rojo de plan vencido
