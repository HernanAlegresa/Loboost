# Roadmap post-testing — LoBoost

**Fecha:** 2026-04-22  
**Contexto:** Primera ronda de testing real en celular (coach + cliente). El core loop funciona. Se detectaron bugs de integridad de datos, flujos rotos y oportunidades de pulido. No se agregan features nuevas hasta completar Fases 1–3.

---

## Principios de ejecución

- Implementar en sesiones separadas siguiendo el orden de fases
- No mezclar ítems de distintas fases en la misma sesión
- Cada fase tiene criterio de salida explícito — verificar antes de pasar a la siguiente
- No rehacer pantallas desde cero; iterar sobre lo existente

---

## Fase 1 — Integridad de datos

**Criterio de salida:** Los datos capturados por la app son correctos y confiables. Ningún cálculo de fecha, PR o registro produce datos falsos o perdidos.

### 1.1 Fix PR detection

**Archivo:** `src/features/training/actions/complete-set.ts:70`

**Bug:** `prevMax == null` es condición suficiente para marcar PR, lo que significa que cualquier primera serie con peso en toda la historia del cliente dispara la celebración.

**Fix:**
```ts
// ANTES
const isPR = prevMax == null || result.data.weightKg > (prevMax as number)

// DESPUÉS
const isPR = prevMax != null && result.data.weightKg > (prevMax as number)
```

---

### 1.2 Agregar input y guardado de repeticiones en live training

**Problema:** `reps_performed` existe en DB y el registro manual ya lo captura correctamente. Pero el live training nunca lo envía.

**Nota:** `log-session-client.tsx` (registro manual) ya tiene soporte de reps — no tocar.

**Archivos a tocar:**
- `src/app/(training)/client/training/[sessionId]/live-training.tsx`
- `src/features/training/actions/complete-set.ts` (verificar que upsert persista reps)
- `src/features/training/actions/update-set.ts` (incluir reps al editar serie pasada en live)

**Cambios:**

1. En el type `SetInputs`, agregar `reps: string`.
2. En el card de serie activa (`isActive`), agregar un input de reps para ejercicios de tipo `strength` junto al input de peso. Para tipo `cardio`, no aplica.
3. En `handleCompleteSet`, enviar `repsPerformed` en el FormData cuando el ejercicio sea fuerza.
4. En `completeSetAction` verificar que el upsert persiste `reps_performed` (el campo raw ya existe, puede que falte el mapeo).
5. En `handleUpdateSet`, enviar reps al editar una serie completada.

**UX del input de reps:** campo pequeño con placeholder "reps", a la derecha del peso. No reemplaza el peso, lo acompaña.

---

### 1.3 Fix bug de fechas

**Archivos:** `src/features/clients/utils/training-utils.ts`

**Hay dos problemas:**

**Problema A — Timezone mismatch**  
`computeDayDate` calcula fechas en UTC (Node.js parsea strings `YYYY-MM-DD` como UTC y `toISOString()` devuelve UTC). `getTodayISO()` usa hora local del servidor. Si el servidor corre en UTC y el cliente está en Argentina (UTC-3), puede haber desfase.

**Fix A:** Hacer `getTodayISO()` estrictamente UTC:
```ts
export function getTodayISO(): string {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
```

**Problema B — day_of_week como offset en lugar de día real**  
`computeDayDate` trata `day_of_week` como offset desde `start_date` (`offsetDays = (weekNumber-1)*7 + (dayOfWeek-1)`). Si `start_date` no es lunes, "Lunes" del WeekStrip apunta a otra fecha real.

**Fix B:** Reescribir `computeDayDate` para que `day_of_week` (1=lunes … 7=domingo) corresponda al día real de la semana dentro de la semana N del plan. La semana N empieza en el lunes de esa semana, donde la semana 1 contiene `start_date`.

```ts
export function computeDayDate(startDate: string, weekNumber: number, dayOfWeek: number): string {
  // Parsear start_date como UTC
  const [sy, sm, sd] = startDate.split('-').map(Number)
  const start = Date.UTC(sy!, sm! - 1, sd!)

  // Calcular el lunes de la semana 1: retroceder al lunes de la semana que contiene start_date
  const startDow = new Date(start).getUTCDay() // 0=Dom, 1=Lun, ...
  const daysToMonday = startDow === 0 ? -6 : 1 - startDow
  const week1Monday = start + daysToMonday * 86400000

  // Lunes de la semana N
  const weekNMonday = week1Monday + (weekNumber - 1) * 7 * 86400000

  // Día concreto: dayOfWeek 1=Lun, 7=Dom
  const targetMs = weekNMonday + (dayOfWeek - 1) * 86400000
  const d = new Date(targetMs)
  return d.toISOString().split('T')[0]!
}
```

Actualizar también `getCurrentWeek` para que sea consistente con esta lógica (usar UTC en todo el cálculo).

---

### 1.4 Bloquear registro de sesiones futuras

**Problema:** Se puede crear o registrar una sesión para un día cuya fecha aún no llegó.

**Dónde validar:** En la server action que crea la sesión (o inicia el entrenamiento), antes de hacer el insert. Verificar que `computeDayDate(startDate, weekNumber, dayOfWeek) <= getTodayISO()`. Si no, devolver error.

**UX:** Si el usuario intenta iniciar una sesión futura desde el WeekStrip, el botón/link no debe existir (estado `upcoming` → no clickeable). Verificar que el componente WeekStrip y TodayCard no habiliten navegación para días futuros.

---

## Fase 2 — Flujos rotos

**Criterio de salida:** Coach y cliente pueden completar todos los flujos principales de punta a punta sin quedar trabados. Al terminar esta fase la app es usable en producción para uso real.

### 2.1 Fix rutas del FAB

**Archivo:** `src/app/(coach)/coach/dashboard/fab.tsx`

**Bug:** Dos de tres rutas incorrectas.

```ts
// ANTES
{ label: 'Nuevo ejercicio', icon: Dumbbell, href: '/coach/exercises/new' },
{ label: 'Nuevo plan', icon: ClipboardList, href: '/coach/plans/new' },

// DESPUÉS
{ label: 'Nuevo ejercicio', icon: Dumbbell, href: '/coach/library/exercises/new' },
{ label: 'Nuevo plan', icon: ClipboardList, href: '/coach/library/plans/new' },
```

La ruta de `Nuevo cliente` (`/coach/clients/new`) ya es correcta.

---

### 2.2 Dashboard cliente — "hoy no entrenás"

**Problema:** Cuando el día actual no tiene `client_plan_day` asignado en el plan activo, la card "Hoy" no muestra nada o muestra un estado indefinido.

**Archivos:** `src/app/(client)/client/dashboard/today-card.tsx` (o donde se renderice cuando `today === null`)

**Fix:** Cuando `data.today === null` y hay plan activo, mostrar explícitamente: "Hoy es día de descanso". Estado visual diferenciado del "sin plan".

---

### 2.3 Dashboard cliente — acceso a días pasados no registrados

**Problema:** Los días con estado `past_missed` en el WeekStrip son visibles pero no permiten iniciar registro desde ahí. Solo son accesibles desde historial.

**Fix:** En el WeekStrip, los días con status `past_missed` deben tener un link que navegue a:
```
/client/history/week/[weekNumber]/log/[clientPlanDayId]
```
El `clientPlanDayId` ya está disponible en el WeekStripDay. El `weekNumber` viene del plan activo (ya disponible en el contexto del dashboard).

---

### 2.4 Registro manual de sesiones pasadas — UX rediseñada

**Problema actual:** El flujo de carga manual replica el live training (marcar cada serie → guardar). Para sesiones pasadas no tiene sentido el modelo set-by-set en tiempo real.

**Nuevo flujo:**
1. El usuario accede a una sesión pasada no registrada (desde historial o desde WeekStrip via 2.3)
2. Ve un formulario con todos los ejercicios del día, agrupados
3. Para cada serie: campos de peso y reps (o duración si es cardio) en un formulario estático
4. Al completar todos los campos → botón único "Guardar sesión"
5. Al guardar → aparece el modal de check-in (RPE, Energía, Dolor muscular) igual al del live training
6. Al completar el check-in → sesión queda registrada como `completed`

**Restricciones:**
- No permitir fechas futuras (validación backend — cubierta en 1.4)
- El modal de check-in no es opcional (puede "saltar" como en live training, pero aparece)

**Archivos:**
- `src/app/(client)/client/history/week/[weekNumber]/log/[clientPlanDayId]/log-session-client.tsx` — componente a refactorizar
- `src/app/(client)/client/history/week/[weekNumber]/log/[clientPlanDayId]/page.tsx` — page server
- `src/app/(client)/client/history/week/[weekNumber]/log/[clientPlanDayId]/queries.ts` — queries existentes

---

### 2.5 Crear cliente — mejoras de inputs

**Problema:** Placeholders rotos ("?"), inputs de texto para datos numéricos, días de entrenamiento poco flexible.

**Fix (sin sobrediseñar):**
- Corregir todos los placeholders
- Campos edad, altura, peso: tipo `number` con unidad visible (años / cm / kg)
- Días de entrenamiento: toggle multi-selección de días (Lun–Dom), sin lógica compleja de restricción

**Archivo:** El form de crear cliente en `src/app/(coach)/coach/clients/new/`

---

### 2.6 Feedback visual al crear ejercicio

**Prioridad:** Menor dentro de Fase 2 — puede quedar al final o pasar a Fase 3 si hay restricción de tiempo.

**Fix:** Al crear ejercicio exitosamente, mostrar un toast o mensaje de confirmación breve antes de redirigir. La implementación depende del sistema de notificaciones existente en el proyecto.

---

## Fase 3 — Pulido funcional

**Criterio de salida:** La experiencia es consistente, sin inconsistencias entre flujos, y sin campos o comportamientos que confundan al usuario.**

### 3.1 RPE en historial — mostrar datos registrados

**Problema:** Las sesiones completadas en historial no muestran los valores de RPE/energía/soreness que se registraron.

**Fix:** En el detalle de sesión del historial, agregar una sección que muestre los valores del check-in si existen.

---

### 3.2 Remover "sueño" del check-in post-sesión

**Archivo:** `src/app/(training)/client/training/[sessionId]/live-training.tsx` — sección `showCheckIn`

**Fix:** Eliminar el slider de "Cómo dormiste" y el estado `checkInSleep`. Actualizar `handleCheckInSubmit` para no enviar ese valor. Actualizar `completeSessionAction` si recibe ese parámetro para ignorarlo o eliminarlo de la firma.

Quedan: RPE, Energía, Dolor muscular.

---

### 3.3 Email verification — mensaje de error claro

**Fix:** En el flujo de login, si Supabase devuelve error de email no verificado, mostrar mensaje específico: "Revisá tu casilla de email para verificar tu cuenta antes de ingresar." No requiere flujo de reenvío por ahora.

---

### 3.4 Layout mobile — live training con teclado virtual

**Problema:** El teclado virtual en mobile puede romper el layout del scroll-snap horizontal del live training.

**Fix:** Revisar el uso de `height: 100%` en los containers. Considerar `dvh` (dynamic viewport height) en lugar de `100vh`/`100%` para el shell principal. Verificar safe-area en iOS cuando el teclado aparece.

---

## Fase 4 — Features nuevas

**Entra solo cuando Fases 1–3 estén completas y verificadas.**

### 4.1 Crear plan — UX mejorada

**Problema actual:** Todo en una sola pantalla con mucho scroll, difícil manejar planes con muchos ejercicios.

**Propuesta:**
- Separar en dos tabs: "Datos del plan" (nombre, semanas, tipo) y "Entrenamiento" (semanas × días × ejercicios)
- En el tab de entrenamiento: selector de semana en la parte superior, luego navegación por día dentro de esa semana
- Lista de ejercicios por día más compacta
- Drag & drop: fuera de scope por ahora

---

### 4.2 Coach dashboard mejorado

A definir cuando se llegue. El dashboard actual es funcional.

---

### 4.3 Push notifications

Requiere: service worker, tabla de subscriptions en Supabase, trigger server-side. Es la tarea de mayor complejidad técnica. Se diseña en sesión separada cuando llegue.

---

## Mapa de archivos clave por fase

| Ítem | Archivo(s) principal(es) |
|------|--------------------------|
| 1.1 PR detection | `src/features/training/actions/complete-set.ts:70` |
| 1.2 Reps en live | `src/app/(training)/client/training/[sessionId]/live-training.tsx` · `complete-set.ts` · `update-set.ts` |
| 1.3 Fechas UTC | `src/features/clients/utils/training-utils.ts` |
| 1.4 Bloqueo futuras | `src/features/training/actions/start-session.ts` · WeekStrip · TodayCard |
| 2.1 FAB rutas | `src/app/(coach)/coach/dashboard/fab.tsx` |
| 2.2 Hoy descanso | `src/app/(client)/client/dashboard/today-card.tsx` |
| 2.3 Past missed link | `src/app/(client)/client/dashboard/` — WeekStrip component |
| 2.4 Registro manual | `src/app/(client)/client/history/week/[weekNumber]/log/[clientPlanDayId]/log-session-client.tsx` |
| 2.5 Crear cliente | `src/app/(coach)/coach/clients/new/` |
| 2.6 Feedback ejercicio | `src/app/(coach)/coach/library/exercises/new/` |
| 3.1 RPE historial | `src/app/(client)/client/history/week/[weekNumber]/` |
| 3.2 Sueño check-in | `src/app/(training)/client/training/[sessionId]/live-training.tsx` |
| 3.3 Email error | Página/componente de login |
| 3.4 Mobile layout | Live training shell — mismo archivo que 3.2 |
| 4.1 Crear plan UX | `src/app/(coach)/coach/library/plans/plan-builder-form.tsx` |
