# Rest Timer in Live Training — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar un countdown de descanso automático después de completar cada set (inspirado en Strong), con duración tomada del campo `restSeconds` del ejercicio, y opción de skip.

**Architecture:** `live-training.tsx` ya tiene `FlatSet.restSeconds`. Se agrega estado `restTimer: number | null` (segundos restantes). Al completar un set con `restSeconds > 0`, se inicia el countdown con `setInterval`. Un overlay posicionado en el bottom de la pantalla muestra el timer con barra de progreso. El botón "Saltar" limpia el intervalo. El timer se auto-completa cuando llega a 0.

**Tech Stack:** Next.js 15, React, Framer Motion (ya instalado), TypeScript, inline styles.

---

## Files

- **Modify:** `src/app/(training)/client/training/[sessionId]/live-training.tsx` — agregar estado timer, lógica countdown, overlay component

---

### Task 1: Estado y lógica del rest timer

**Files:**
- Modify: `src/app/(training)/client/training/[sessionId]/live-training.tsx`

- [ ] **Step 1: Agregar estado del timer después de los estados existentes (línea ~117)**

En `live-training.tsx`, después de `const [inputFocusIdx, setInputFocusIdx] = useState<number | null>(null)`:

```typescript
const [restTimer, setRestTimer] = useState<number | null>(null)
const [restTimerTotal, setRestTimerTotal] = useState<number>(0)
const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
```

- [ ] **Step 2: Agregar función para limpiar el timer**

Después del estado, agregar:

```typescript
function clearRestTimer() {
  if (restIntervalRef.current) {
    clearInterval(restIntervalRef.current)
    restIntervalRef.current = null
  }
  setRestTimer(null)
  setRestTimerTotal(0)
}
```

- [ ] **Step 3: Agregar función para iniciar el timer**

```typescript
function startRestTimer(seconds: number) {
  clearRestTimer()
  if (seconds <= 0) return
  setRestTimerTotal(seconds)
  setRestTimer(seconds)
  restIntervalRef.current = setInterval(() => {
    setRestTimer((prev) => {
      if (prev == null || prev <= 1) {
        clearInterval(restIntervalRef.current!)
        restIntervalRef.current = null
        return null
      }
      return prev - 1
    })
  }, 1000)
}
```

- [ ] **Step 4: Limpiar el intervalo en unmount**

Dentro del componente, agregar este useEffect:

```typescript
useEffect(() => {
  return () => {
    if (restIntervalRef.current) clearInterval(restIntervalRef.current)
  }
}, [])
```

- [ ] **Step 5: Disparar el timer en `handleCompleteSet` después del upsert exitoso**

Buscar en `handleCompleteSet` la línea:
```typescript
setShowSetCelebration(true)
```

Reemplazarla con:
```typescript
setShowSetCelebration(true)
if (fs.restSeconds && fs.restSeconds > 0) {
  // El timer arranca después de que la celebración termina (920ms)
  setTimeout(() => startRestTimer(fs.restSeconds!), CELEBRATION_DISPLAY_MS)
}
```

- [ ] **Step 6: Limpiar el timer al finalizar la sesión**

En `handleFinish`, antes del `completeSessionAction`, agregar:
```typescript
clearRestTimer()
```

- [ ] **Step 7: Commit del estado y lógica**

```bash
git add src/app/\(training\)/client/training/\[sessionId\]/live-training.tsx
git commit -m "feat(training): add rest timer state and countdown logic"
```

---

### Task 2: Overlay visual del rest timer

**Files:**
- Modify: `src/app/(training)/client/training/[sessionId]/live-training.tsx`

- [ ] **Step 1: Agregar el overlay dentro del JSX retornado**

Buscar en el return el cierre del div raíz (antes del último `</div>`). Agregar justo antes:

```typescript
{/* Rest Timer Overlay */}
<AnimatePresence>
  {restTimer != null && (
    <motion.div
      key="rest-timer"
      initial={{ y: 120, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 120, opacity: 0 }}
      transition={{ type: 'spring', damping: 22, stiffness: 280 }}
      style={{
        position: 'fixed',
        bottom: 80,
        left: 16,
        right: 16,
        backgroundColor: '#111317',
        border: `1px solid ${LT.borderStrong}`,
        borderRadius: 20,
        padding: '16px 20px',
        zIndex: 50,
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <p style={{ fontSize: 13, color: LT.muted, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Descanso
        </p>
        <button
          onClick={clearRestTimer}
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: LT.lime,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 8px',
          }}
        >
          Saltar →
        </button>
      </div>
      {/* Número grande */}
      <p style={{ fontSize: 48, fontWeight: 700, color: LT.text, textAlign: 'center', lineHeight: 1, marginBottom: 12 }}>
        {restTimer}s
      </p>
      {/* Barra de progreso */}
      <div style={{ backgroundColor: LT.track, borderRadius: 9999, height: 4, overflow: 'hidden' }}>
        <motion.div
          style={{ height: '100%', backgroundColor: LT.lime, borderRadius: 9999 }}
          animate={{ width: `${((restTimerTotal - restTimer) / restTimerTotal) * 100}%` }}
          transition={{ duration: 0.9, ease: 'linear' }}
        />
      </div>
    </motion.div>
  )}
</AnimatePresence>
```

- [ ] **Step 2: Verificar que `AnimatePresence` ya está importado**

En las primeras líneas del archivo buscar:
```typescript
import { AnimatePresence, motion } from 'framer-motion'
```
Si no está, agregar el import.

- [ ] **Step 3: Test manual — flujo completo**

1. Abrir la app en `/client/training/[sessionId]`
2. Completar un set de un ejercicio que tenga `restSeconds` configurado
3. Verificar: aparece el overlay con countdown al terminar la celebración
4. Verificar: la barra progresa de izquierda a derecha
5. Verificar: el botón "Saltar →" cierra el overlay
6. Verificar: al llegar a 0 el overlay desaparece solo

- [ ] **Step 4: Test — ejercicio sin rest_seconds**

1. Completar un set de un ejercicio con `restSeconds: null` o `0`
2. Verificar: NO aparece el overlay de descanso

- [ ] **Step 5: Commit final**

```bash
git add src/app/\(training\)/client/training/\[sessionId\]/live-training.tsx
git commit -m "feat(training): add rest timer overlay after set completion"
```
