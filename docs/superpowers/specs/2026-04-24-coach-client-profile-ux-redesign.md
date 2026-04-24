# Coach Client Profile — UX/UI Redesign (Producción)

**Fecha:** 2026-04-24  
**Branch:** feature/coach-client-profile-tab-polish  
**Stack:** Next.js App Router + TypeScript + Supabase  
**Skill aplicada:** ui-ux-pro-max (dark OLED fitness, Lucide icons, touch targets 44px, no emojis)

---

## Contexto

Rediseño UX/UI de nivel producción del perfil de cliente en el lado coach de LoBoost. El tab Perfil ya está pulido y sirve como referencia de calidad. El objetivo es llevar las pantallas restantes al mismo nivel, incorporando un sistema de estados operativos correcto y consistente en toda la app.

---

## 1. Sistema de estados operativos (base de todo)

### Tipo central

```typescript
// src/features/clients/types/client-status.ts
export type ClientStatus = 'al-dia' | 'atencion' | 'riesgo' | 'sin-datos'

export const CLIENT_STATUS_CONFIG: Record<ClientStatus, {
  label: string
  color: string
  bg: string
}> = {
  'al-dia':    { label: 'Al día',    color: '#B5F23D', bg: 'rgba(181,242,61,0.12)'  },
  'atencion':  { label: 'Atención',  color: '#F2C94A', bg: 'rgba(242,201,74,0.12)'  },
  'riesgo':    { label: 'Riesgo',    color: '#F25252', bg: 'rgba(242,82,82,0.12)'   },
  'sin-datos': { label: 'Sin datos', color: '#4B5563', bg: 'rgba(75,85,99,0.12)'    },
}
```

### Lógica de cómputo

**Archivo:** `src/features/clients/utils/compute-client-status.ts`  
**Enfoque:** TypeScript utility + query Supabase dedicada (Enfoque A)

Reglas (en orden de evaluación):

1. Sin plan activo → `'sin-datos'`
2. Cero series completadas en total → `'sin-datos'`
3. Algún día de entrenamiento de **semanas anteriores** a la actual con series incompletas o sin sesión → `'riesgo'`
4. Algún día de entrenamiento de **la semana actual** (antes de hoy) con series incompletas o sin sesión → `'atencion'`
5. Todos los días pasados tienen todas las series planificadas completadas → `'al-dia'`

**Definición de "completo":** todas las series planificadas del día tienen `completed = true`.  
**Hoy se excluye siempre** del cálculo — el día en curso no puede considerarse incompleto.  
**RPE es opcional** — no afecta el estado.

### Integración

| Lugar | Acción |
|-------|--------|
| `getClientProfileData` (server query del perfil) | Llama a `computeClientStatus`, devuelve `status: ClientStatus` |
| Query del listado de clientes | Llama a `computeClientStatus` por cada cliente |
| App del cliente (lado cliente) | Consume el mismo campo `status` |
| `statusColor` actual | Se depreca — reemplazado por `CLIENT_STATUS_CONFIG[status].color` |

---

## 2. Tab Progreso — ClientProgressContent

### 2.1 StatusBanner (nuevo, primer elemento del tab)

Card compacta con borde izquierdo sólido de 3px del color del estado. Fondo semitransparente. BorderRadius 12. Sin icono externo — icono Lucide inline (CheckCircle2, AlertTriangle, AlertOctagon, MinusCircle).

Mensajes por estado:
- **Al día:** "Todos los entrenamientos registrados al día."
- **Atención:** "Tiene días sin completar esta semana."
- **Riesgo:** "Semanas anteriores con registros faltando."
- **Sin datos:** "Sin registros en ningún entrenamiento."

### 2.2 KPI strip — ajuste de color delta peso

El color del delta de peso debe considerar el objetivo (`goal`) del cliente:
- Objetivo bajar peso + `weightDeltaKg > 0` → color rojo (regresión)
- Objetivo bajar peso + `weightDeltaKg < 0` → color lime (progreso)
- Objetivo subir peso → invertir la lógica
- Sin objetivo definido → mantener lógica actual

Requiere pasar `goal` como prop a `ClientProgressContent`.

### 2.3 NavTiles con preview de datos

Cada tile muestra un dato en tiempo real en el lado derecho, sin query adicional (viene de `progressKPIs` ya calculados):

| Tile | Preview |
|------|---------|
| Check-ins | `X/Y sem.` (checkInsSubmitted/checkInsExpected) |
| Progreso ejercicios | `N ejerc.` (nuevo campo en ProgressKPIs) |
| Carga semanal | `X.X t` tonelaje total (nuevo campo en ProgressKPIs) |

Añadir 2 campos al tipo `ProgressKPIs`:
- `exercisesWithProgress: number` — ejercicios con al menos 1 sesión
- `totalTonnageKg: number` — tonelaje acumulado del plan

### 2.4 ProgressOverview — indicador de tendencia

Debajo del gráfico de barras de las últimas 6 semanas, añadir una línea de tendencia:
- Comparar suma de las últimas 2 semanas vs las 2 anteriores
- Mostrar: `↑ Subiendo`, `→ Estable`, `↓ Bajando`
- Color: lime / muted / amber según dirección

---

## 3. Check-ins — CheckInsPage

### 3.1 Summary strip (nuevo)

Fijo entre el header y la timeline. Tres métricas en pills con color semántico:

```
[ 5 registradas ]  [ 2 pendientes ]  [ 1 sin registrar ]
```

- Registradas → lime
- Pendientes (semana actual sin check-in) → amber
- Sin registrar (semanas pasadas sin dato) → rojo

Calculado desde `summary.weeks` que ya viene del servidor — sin query adicional.

### 3.2 Touch targets y cursor

- Cada fila `CheckInWeekRow` debe tener `minHeight: 44px` efectivo
- Filas interactivas (si se añade detalle en el futuro): `cursor: 'pointer'`
- Gap mínimo de 8px entre elementos táctiles (ya se cumple con la timeline)

---

## 4. Progreso de ejercicios — ExercisesProgressList

### 4.1 Indicador de tendencia en ExerciseCard

A la derecha del peak weight, añadir delta vs sesión anterior:

```
Sentadilla               72 kg  ↑ +4 kg
6 sesiones
```

- `↑ +X kg` en lime si subió
- `↓ -X kg` en rojo si bajó
- `→` en muted si igual
- Sin flecha si solo hay 1 sesión (sin datos comparativos)

Requiere añadir `previousTopSetKg: number | null` al tipo `ExerciseProgressData` en `progress-queries.ts`.

### 4.2 Touch targets

- Cards ya tienen padding suficiente — verificar que el area táctil sea ≥ 44px de alto

---

## 5. Carga semanal — WeeklyLoadPage + WeeklyLoadChart

### 5.1 KPI strip prominente (reemplaza TotalPills)

Mismo patrón visual que el KPI strip del Tab Progreso — valores grandes centrados, label debajo en uppercase muted:

```
┌────────────────────────────────────────────┐
│   2.3 t      ·    12 sesiones    ·  148 series │
│  TONELAJE       SESIONES           SERIES   │
└────────────────────────────────────────────┘
```

Componente: `KpiStrip` reutilizable (extraer del pattern de `ClientProgressContent`).

### 5.2 Accesibilidad en bar chart

- Añadir `aria-label` a cada botón de barra: `aria-label="Semana N: X kg"`
- El hint "toca una barra para resaltarla" se mueve a un `aria-description` del contenedor

---

## 6. Tab Sesiones — ClientSessionsList

### 6.1 Summary strip (nuevo)

Una línea de contexto encima de la lista:
```
12 sesiones completadas · Última hace 3 días
```
Sin card, sin borde — solo texto muted. No agrega peso visual.

Requiere: calcular días desde la última sesión en el componente (o pasar `lastSessionDate` como prop).

### 6.2 Agrupación por semana

En lugar de lista plana, agrupar sessions por `weekNumber`:

```
SEMANA 4 ──────────────────────────
[SessionRow]
[SessionRow]

SEMANA 3 ──────────────────────────
[SessionRow]
```

Overline de semana: fontSize 9, uppercase, letterSpacing 0.08em, color muted, con línea horizontal `flex-1 border-top`.

### 6.3 Estado vacío diferenciado

| Condición | Mensaje |
|-----------|---------|
| Sin plan activo | "Asigná un plan activo para que el cliente pueda registrar entrenamientos." |
| Plan activo, 0 sesiones | "Todavía no hay entrenamientos registrados en este plan." |
| Sesiones existentes | Lista agrupada por semana |

Requiere recibir `hasPlan: boolean` como prop adicional en `ClientSessionsList`.

---

## 7. Detalle de sesión — SessionDetailPage

### 7.1 Completion badge en header de sesión

A la derecha del título `CoachSubpageHeader`, mostrar series completadas vs planificadas:

```
Semana 4 · Jueves          18/22 ✓
```

- 100% completo → color lime
- Incompleto → color amber
- Requiere calcular `completedSets` y `totalSets` desde `session.exercises`

### 7.2 Reemplazar emojis por dots semánticos

Los indicadores de energía, sueño y dolor muscular usan emojis actualmente. Reemplazar por `dot (8px) + texto`:

```
Energía        ● Bien          (dot verde)
Sueño          ● Regular       (dot amber)
Dolor muscular ● Mucho         (dot rojo)
```

Dot: `width: 8, height: 8, borderRadius: 9999, backgroundColor: <color semántico>`.

Escala de colores por nivel (1→5):
- Nivel 1 → rojo `#F25252`
- Nivel 2 → naranja `#F2994A`
- Nivel 3 → amber `#F2C94A`
- Nivel 4 → verde `#4CAF82`
- Nivel 5 → lime `#B5F23D`

### 7.3 Touch targets en rows de sets

Padding vertical de sets: `7px 10px` → `12px 10px` para cumplir mínimo de 44px.

---

## Reglas de la skill ui-ux-pro-max aplicadas

| Regla | Aplicación |
|-------|-----------|
| `no-emoji-icons` | Detalle de sesión: reemplazar emojis por dots SVG |
| `touch-target-size` (44px) | Check-ins rows, session set rows, exercise cards |
| `cursor-pointer` | Todos los elementos táctiles interactivos |
| `color-contrast` (4.5:1) | Verificar muted text sobre fondo oscuro en todos los componentes |
| `loading-states` | Skeleton para NavTiles con preview (si se carga async) |
| `duration-timing` (150-300ms) | Transiciones existentes validadas |
| `chart-type` | Bar chart para carga semanal ✓. Line/Area para detalle por ejercicio (fase siguiente) |
| `style-match` | OLED dark + lime accent = correcto para fitness coaching |

---

## Bloques de implementación (orden de commits)

| Bloque | Archivos principales | Impacto |
|--------|---------------------|---------|
| **B1** | `compute-client-status.ts`, `client-status.ts`, `progress-queries.ts` | Base del sistema de estados |
| **B2** | `client-progress-content.tsx` (StatusBanner + NavTiles preview + tendencia) | Mayor impacto visual |
| **B3** | `check-ins/page.tsx` (summary strip + touch targets) | |
| **B4** | `exercises-progress-list.tsx` (tendencia en cards) | |
| **B5** | `weekly-load/page.tsx` + `weekly-load-chart.tsx` (KPI strip + a11y) | |
| **B6** | `client-sessions-list.tsx` (summary + agrupación + estado vacío) | |
| **B7** | `sessions/[sessionId]/page.tsx` (completion badge + dots + touch targets) | |
| **B8** | Integrar `status` en listado de clientes + app del cliente | Consistencia global |

Cada bloque = 1 commit limpio. Types/lint se verifican al cerrar cada bloque.

---

## Restricciones

- No reinventar el branding — dark #0A0A0A + lime #B5F23D se mantienen
- No agregar librerías de charting (el bar chart actual es CSS puro — mantener)
- No agregar animaciones pesadas — micro-interacciones máximo 200ms
- `prefers-reduced-motion` respetado en cualquier transición nueva
- Mobile-first estricto — breakpoint base 375px
