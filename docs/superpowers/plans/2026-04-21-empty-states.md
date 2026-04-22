# Empty States Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar los empty states de texto plano gris por estados vacíos con icono, título y subtexto motivacional. Afecta 4 pantallas clave: dashboard cliente (sin plan), historial cliente (sin semanas), lista de clientes coach (sin clientes), y lista de planes coach (sin planes).

**Architecture:** Cambios puramente de UI en los archivos de página y componentes existentes. No hay nuevas queries ni server actions. Cada empty state tendrá: icono grande (emoji o Lucide), título en `#F0F0F0`, subtexto en `#6B7280`, y opcionalmente un botón CTA.

**Tech Stack:** Next.js 15, React, TypeScript, Lucide React (ya instalado), inline styles.

---

## Files

- **Modify:** `src/app/(client)/client/dashboard/page.tsx` — empty state sin plan activo
- **Modify:** `src/app/(client)/client/history/page.tsx` — empty state sin semanas
- **Modify:** `src/app/(coach)/coach/clients/clients-tabs-container.tsx` — empty state lista clientes
- **Modify:** `src/app/(coach)/coach/library/plans/page.tsx` — empty state lista planes

---

### Task 1: Empty state dashboard cliente — sin plan asignado

**Files:**
- Modify: `src/app/(client)/client/dashboard/page.tsx`

- [ ] **Step 1: Reemplazar el empty state del plan activo**

En `page.tsx`, buscar el bloque del else sin plan activo (aprox. línea 168-182):

```typescript
// ANTES:
<div
  style={{
    backgroundColor: '#111317',
    border: '1px solid #1F2227',
    borderRadius: 14,
    padding: 24,
    textAlign: 'center',
  }}
>
  <p style={{ fontSize: 14, color: '#4B5563' }}>
    Tu coach todavía no te asignó un plan.
  </p>
</div>
```

Reemplazar con:

```typescript
<div
  style={{
    backgroundColor: '#111317',
    border: '1px solid #1F2227',
    borderRadius: 16,
    padding: '32px 24px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
  }}
>
  <div
    style={{
      width: 56,
      height: 56,
      borderRadius: '50%',
      backgroundColor: 'rgba(181, 242, 61, 0.08)',
      border: '1px solid rgba(181, 242, 61, 0.15)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 26,
      marginBottom: 4,
    }}
  >
    🏋️
  </div>
  <p style={{ fontSize: 16, fontWeight: 700, color: '#F0F0F0', margin: 0 }}>
    Todavía no tenés un plan
  </p>
  <p style={{ fontSize: 13, color: '#6B7280', margin: 0, lineHeight: 1.5 }}>
    Tu coach te va a asignar un plan pronto.{'\n'}Mientras tanto, ¡preparate para entrenar!
  </p>
</div>
```

- [ ] **Step 2: Test visual**

Probar con una cuenta de cliente sin plan asignado y verificar que se ve el empty state con icono y textos.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(client\)/client/dashboard/page.tsx
git commit -m "feat(ui): upgrade empty state in client dashboard"
```

---

### Task 2: Empty state historial cliente — sin semanas completadas

**Files:**
- Modify: `src/app/(client)/client/history/page.tsx`

- [ ] **Step 1: Reemplazar el empty state de semanas vacías**

Buscar el bloque (aprox. línea 31-45):

```typescript
// ANTES:
<div
  style={{
    backgroundColor: '#111317',
    border: '1px solid #1F2227',
    borderRadius: 14,
    padding: 32,
    textAlign: 'center',
  }}
>
  <p style={{ fontSize: 14, color: '#4B5563' }}>
    Todavía no completaste ninguna semana.
  </p>
  <p style={{ fontSize: 12, color: '#374151', marginTop: 6 }}>¡Empezá hoy!</p>
</div>
```

Reemplazar con:

```typescript
<div
  style={{
    backgroundColor: '#111317',
    border: '1px solid #1F2227',
    borderRadius: 16,
    padding: '36px 24px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
  }}
>
  <div
    style={{
      width: 60,
      height: 60,
      borderRadius: '50%',
      backgroundColor: 'rgba(181, 242, 61, 0.08)',
      border: '1px solid rgba(181, 242, 61, 0.15)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 28,
      marginBottom: 4,
    }}
  >
    📅
  </div>
  <p style={{ fontSize: 16, fontWeight: 700, color: '#F0F0F0', margin: 0 }}>
    Sin semanas registradas
  </p>
  <p style={{ fontSize: 13, color: '#6B7280', margin: 0, lineHeight: 1.5 }}>
    Completá tu primera semana de entrenamiento{'\n'}y aparecerá aquí.
  </p>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(client\)/client/history/page.tsx
git commit -m "feat(ui): upgrade empty state in client history"
```

---

### Task 3: Empty state lista de clientes — coach sin clientes

**Files:**
- Modify: `src/app/(coach)/coach/clients/clients-tabs-container.tsx`

- [ ] **Step 1: Buscar el empty state de la lista de clientes**

En `clients-tabs-container.tsx` buscar el bloque que renderiza cuando `sortedClients.length === 0` o similar. Será un texto como "No tenés clientes" o similar. Si no existe, agregarlo en el lugar donde se mapean los clientes.

Buscar el área donde se renderizan las `ClientCard` (un `.map((client) => ...)`) y agregar la condición de empty state:

```typescript
{filteredClients.length === 0 ? (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      padding: '48px 24px',
      gap: 12,
    }}
  >
    <div
      style={{
        width: 60,
        height: 60,
        borderRadius: '50%',
        backgroundColor: 'rgba(181, 242, 61, 0.08)',
        border: '1px solid rgba(181, 242, 61, 0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 28,
      }}
    >
      👥
    </div>
    <p style={{ fontSize: 16, fontWeight: 700, color: '#F0F0F0', margin: 0 }}>
      {activeFilter === 'all' ? 'Todavía no tenés clientes' : 'Sin clientes en esta categoría'}
    </p>
    <p style={{ fontSize: 13, color: '#6B7280', margin: 0, lineHeight: 1.5 }}>
      {activeFilter === 'all'
        ? 'Creá tu primer cliente para empezar.'
        : 'Probá cambiando el filtro.'}
    </p>
  </div>
) : (
  filteredClients.map((client) => /* render existing client cards */)
)}
```

**Nota:** Leer el archivo completo antes de editar para identificar la variable exacta de la lista filtrada (`filteredClients`, `sortedClients`, etc.) y el nombre del filtro activo.

- [ ] **Step 2: Commit**

```bash
git add src/app/\(coach\)/coach/clients/clients-tabs-container.tsx
git commit -m "feat(ui): upgrade empty state in coach clients list"
```

---

### Task 4: Empty state lista de planes coach

**Files:**
- Modify: `src/app/(coach)/coach/library/plans/page.tsx`

- [ ] **Step 1: Leer el archivo para entender el empty state actual**

Leer `src/app/(coach)/coach/library/plans/page.tsx` completo. Identificar la condición que renderiza cuando no hay planes.

- [ ] **Step 2: Agregar el empty state mejorado**

Reemplazar el empty state existente (texto simple) con:

```typescript
<div
  style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '48px 24px',
    gap: 12,
  }}
>
  <div
    style={{
      width: 60,
      height: 60,
      borderRadius: '50%',
      backgroundColor: 'rgba(181, 242, 61, 0.08)',
      border: '1px solid rgba(181, 242, 61, 0.15)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 28,
    }}
  >
    📋
  </div>
  <p style={{ fontSize: 16, fontWeight: 700, color: '#F0F0F0', margin: 0 }}>
    Sin planes creados
  </p>
  <p style={{ fontSize: 13, color: '#6B7280', margin: 0, lineHeight: 1.5 }}>
    Creá tu primer plan de entrenamiento{'\n'}para asignárselo a tus clientes.
  </p>
</div>
```

Si no existe empty state, agregarlo dentro de la condición `plans.length === 0`.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(coach\)/coach/library/plans/page.tsx
git commit -m "feat(ui): upgrade empty state in coach plans library"
```
