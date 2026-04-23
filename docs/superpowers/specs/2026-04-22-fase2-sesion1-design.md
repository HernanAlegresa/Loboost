# Fase 2 — Sesión 1: Plan-view + Registro Manual

**Fecha:** 2026-04-22  
**Rama:** feat/fase-1-integridad-datos (continuar en la misma rama o nueva feat/fase2-sesion1)  
**Contexto:** Feedback de uso real en celular post-Fase 1. El bug más crítico es que los días pasados abren live training en lugar de un formulario de registro.

---

## Objetivo

Corregir el flujo de días pasados de punta a punta: desde la tarjeta en plan-view hasta el guardado de datos. La Sesión 1 cubre tres áreas que comparten el mismo flujo:

1. Distinción visual `past_missed` vs `upcoming` en plan-view
2. Routing correcto desde day-detail hacia el formulario manual
3. Refactor de `log-session-client.tsx` a flujo bulk con check-in al final

---

## Criterio de salida

- Un día pasado nunca abre live training
- El formulario de registro manual guarda todos los sets en un solo click
- El check-in aparece al finalizar el registro manual (igual que en live training)
- El check-in compartido NO incluye el campo de sueño
- Un día ya registrado (`completed`) no puede ser sobreescrito

---

## Pieza 1 — Estados visuales en plan-view

**Archivo:** `src/app/(client)/client/plan/plan-view.tsx`

### `DayStatusIcon`

| Status | Visual |
|--------|--------|
| `completed` | ✓ lima `#B5F23D` — sin cambio |
| `in_progress` | ● naranja `#F2994A` — sin cambio |
| `today` | ● lima `#B5F23D` — sin cambio |
| `past_missed` | ○ ámbar `#F59E0B` — día pasado sin registrar |
| `upcoming` | — gris `#374151` — no disponible aún |

### Bordes de tarjeta en `days.map()`

```
past_missed → border: 'rgba(245,158,11,0.25)'
upcoming    → border: '#1F2227'  (sin cambio)
```

### Color del nombre del día

```
past_missed → color: '#9CA3AF'  (gris neutro, sin énfasis especial)
upcoming    → color: '#6B7280'  (gris más apagado)
```

Sin badges de texto. Sin cambios de layout. Solo CSS + ícono.

---

## Pieza 2 — Routing correcto en day-detail

### `src/app/(client)/client/plan/[weekNumber]/[clientPlanDayId]/page.tsx`

Actualmente `weekNumber` está en los params pero nunca se desestructura. Cambio:

```tsx
// ANTES
const { clientPlanDayId } = await params

// DESPUÉS
const { weekNumber: wn, clientPlanDayId } = await params
const weekNumber = parseInt(wn, 10)
// pasar weekNumber a DayDetailClient
<DayDetailClient data={data} weekNumber={weekNumber} />
```

### `src/app/(client)/client/plan/[weekNumber]/[clientPlanDayId]/day-detail-client.tsx`

**Nueva prop:** `weekNumber: number`

**Cambio en el botón de acción:**

```
Estado actual del día  | Comportamiento del botón
-----------------------|-------------------------
in_progress            | handleResume() → live training (sin cambio)
today (no completado)  | handleStart() → startSessionAction → live training (sin cambio)
past_missed            | router.push(`/client/history/week/${weekNumber}/log/${clientPlanDayId}`)
```

El botón "Registrar entrenamiento" para `past_missed` ya no llama a `startSessionAction`. Solo navega.

Eliminar `handleStart` del bloque `past_missed`. La función sigue existiendo para el caso `today`.

---

## Pieza 3 — Nueva server action: `logManualSessionAction`

**Archivo:** `src/features/training/actions/log-manual-session.ts`

### Firma

```typescript
type SetInput = {
  clientPlanDayExerciseId: string
  setNumber: number
  weightKg?: number | null
  repsPerformed?: number | null
  durationSeconds?: number | null
}

type LogManualResult =
  | { success: true; sessionId: string }
  | { error: string }

export async function logManualSessionAction(
  clientPlanDayId: string,
  sets: SetInput[]
): Promise<LogManualResult>
```

### Lógica de idempotencia

```
1. Buscar sesión existente para este clientPlanDayId del usuario autenticado
   - Si status === 'completed'  → return { error: 'Este entrenamiento ya fue registrado' }
   - Si status === 'in_progress' → usar ese sessionId
                                   borrar todos los training_session_sets de esa sesión
   - Si no existe              → crear nueva sesión (status: 'in_progress')

2. Insertar todos los sets en batch en training_session_sets

3. Retornar { success: true, sessionId }
   (NO completar la sesión aquí — la completa completeSessionAction después del check-in)
```

### Validación de fecha

Reutilizar la validación de Fase 1.4: verificar que el día no sea futuro.  
Si la fecha del `clientPlanDayId` > hoy → `return { error: 'No podés registrar días futuros' }`.

---

## Pieza 4 — Componente compartido: `SessionCheckinModal`

**Archivo:** `src/components/ui/session-checkin-modal.tsx`

### Props

```typescript
type Props = {
  sessionId: string
  onComplete: () => void  // callback al completar el check-in
  onSkip: () => void      // callback al saltear (misma lógica que live training)
}
```

### Campos

- **RPE** (1–10): "¿Cómo fue la intensidad?"
- **Energía** (1–5): "¿Cómo te sentiste de energía?"
- **Dolor muscular** (1–5): "¿Dolor muscular post-sesión?"

NO incluye el campo de sueño (`sleep`).

### Comportamiento

Firma real de `completeSessionAction`:
```
completeSessionAction(sessionId, rpe?, notes?, energyLevel?, sleepQuality?, sorenessLevel?)
```

Al confirmar → `completeSessionAction(sessionId, rpe, undefined, energyLevel, undefined, sorenessLevel)` → `onComplete()`  
Al saltear → `completeSessionAction(sessionId)` → `onSkip()`  

`sleepQuality` siempre `undefined` — el campo no existe en este componente.

### Integración en `live-training.tsx`

Reemplazar el bloque `showCheckIn` inline por `<SessionCheckinModal>`.  
No cambiar la lógica, solo extraer el JSX al componente.  
Si el campo `sleep` existía en el bloque anterior, eliminarlo aquí.

---

## Pieza 5 — Refactor `log-session-client.tsx`

**Archivo:** `src/app/(client)/client/history/week/[weekNumber]/log/[clientPlanDayId]/log-session-client.tsx`

### Estado nuevo

```typescript
type SetState = {
  reps: string
  weight: string
  duration: string
  // eliminar: completed (ya no existe estado per-serie)
}
```

### Props que cambian

- Eliminar prop `initialSessionId: string | null` — ya no es necesaria porque `logManualSessionAction` maneja la búsqueda/creación de sesión internamente.

### Qué se elimina

- `ensureSession()` — ya no es necesaria (la acción maneja la sesión)
- `markSetComplete()` — ya no existe confirmación por serie
- `sessionId` state — reemplazado por `savedSessionId` (solo se puebla al guardar)
- Botón "✓ Listo" por serie
- Estilo `disabled` en inputs
- Highlight verde de serie completada

### Qué se agrega

- Estado `showCheckIn: boolean` (false por defecto)
- Estado `savedSessionId: string | null` (null por defecto)

### Nuevo `handleSave`

```typescript
async function handleSave() {
  // Convertir el estado `sets` (Record<exId, SetState[]>) al array de SetInput
  const setsData: SetInput[] = exercises.flatMap((ex) =>
    (sets[ex.clientPlanDayExerciseId] ?? []).map((s, idx) => ({
      clientPlanDayExerciseId: ex.clientPlanDayExerciseId,
      setNumber: idx + 1,
      weightKg: ex.type === 'strength' && s.weight ? parseFloat(s.weight) : null,
      repsPerformed: ex.type === 'strength' && s.reps ? parseInt(s.reps) : null,
      durationSeconds: ex.type === 'cardio' && s.duration ? parseInt(s.duration) : null,
    }))
  )
  const result = await logManualSessionAction(clientPlanDayId, setsData)
  if ('error' in result) { setError(result.error); return }
  setSavedSessionId(result.sessionId)
  setShowCheckIn(true)
}
```

### Layout del formulario

```
[Card ejercicio]
  Header: nombre + "N series · X–Y reps"
  Por cada serie:
    "Serie N"
    [Peso (kg)]  [Reps]     ← para strength
    [Duración (seg)]         ← para cardio

[Guardar sesión]  ← botón lime, bottom
```

Sin botón por serie. Sin highlights de completado.

### Renderizado condicional

```tsx
if (showCheckIn && savedSessionId) {
  return (
    <SessionCheckinModal
      sessionId={savedSessionId}
      onComplete={() => router.push(`/client/history/week/${weekNumber}`)}
      onSkip={() => router.push(`/client/history/week/${weekNumber}`)}
    />
  )
}
```

---

## Mapa de archivos

| Archivo | Cambio |
|---------|--------|
| `src/app/(client)/client/plan/plan-view.tsx` | CSS: borde ámbar `past_missed`, íconos distintos |
| `src/app/(client)/client/plan/[weekNumber]/[clientPlanDayId]/page.tsx` | Desestructurar `weekNumber`, pasarlo como prop |
| `src/app/(client)/client/plan/[weekNumber]/[clientPlanDayId]/day-detail-client.tsx` | Nueva prop `weekNumber`, botón `past_missed` navega a historia |
| `src/features/training/actions/log-manual-session.ts` | NUEVO: action batch con idempotencia |
| `src/components/ui/session-checkin-modal.tsx` | NUEVO: modal compartido (RPE, Energía, Dolor) |
| `src/app/(training)/client/training/[sessionId]/live-training.tsx` | Reemplazar check-in inline por `<SessionCheckinModal>` |
| `src/app/(client)/client/history/week/[weekNumber]/log/[clientPlanDayId]/log-session-client.tsx` | Refactor: bulk form + check-in al final |

---

## Orden de implementación sugerido

1. `SessionCheckinModal` — componente sin dependencias externas, base para todo
2. `live-training.tsx` — swap del check-in inline (verificar que nada se rompe)
3. `logManualSessionAction` — action nueva, independiente de UI
4. `log-session-client.tsx` — refactor que usa los dos anteriores
5. `day-detail-client.tsx` + `page.tsx` — routing fix (más simple, al final)
6. `plan-view.tsx` — CSS puro, último (independiente de todo)

---

## Fuera de scope de esta sesión

- Dashboard cliente (heatmap, header "Hoy") → Sesión 2
- WeekStrip routing (ya funciona, apunta a day-detail que quedará correcto después de esta sesión)
- Edición de plan desde perfil coach → Sesión 4
- Crear cliente / feedback ejercicio → Sesión 5
