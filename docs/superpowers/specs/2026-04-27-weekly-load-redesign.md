# Weekly Load — Rediseño Completo (Coach Client Profile)

**Fecha:** 2026-04-27  
**Ruta:** `src/app/(coach)/coach/clients/[id]/weekly-load/`  
**Scope:** Capa de datos + UI completa. No toca otras rutas ni features.

---

## Objetivo

Llevar la pantalla de Carga Semanal al estándar de apps profesionales de coaching (Hevy Coach, TrainHeroic, Intensity Coach). El coach debe poder responder en un único scroll: ¿está entrenando suficiente? ¿en los grupos correctos? ¿cumplió lo planificado?

---

## Estructura de pantalla — Enfoque A (Single Scroll)

Una sola pantalla scrolleable. El chart actúa como controlador global: al tocar una barra de semana, los bloques 3 y 4 se actualizan sincrónicamente. Sin tabs, sin bottom sheets, sin navegación adicional.

```
[CoachSubpageHeader]
[WeeklyHeroKpis]         ← Server Component, datos semana actual
[WeeklyLoadChart]        ← Client Component (chart + estado selectedWeek)
  └── [MuscleGroupBreakdown]  ← reactivo a selectedWeek
  └── [AdherenceBlock]        ← reactivo a selectedWeek
  └── [WeeklyRowList]         ← lista existente refinada
```

---

## Sección 1 — Capa de Datos

### Tipos nuevos en `progress-queries.ts`

```ts
// Extiende WeeklyLoadPoint existente
export type WeeklyLoadPoint = {
  weekNumber: number
  weekLabel: string
  completedSets: number
  tonnageKg: number
  avgIntensityKg: number | null
  sessionCount: number
  plannedSets: number       // NUEVO — suma de client_plan_day_exercises.sets para esa semana
  plannedSessions: number   // NUEVO — count de client_plan_days para esa semana
}

export type MuscleWeekPoint = {
  weekNumber: number
  breakdown: Array<{ muscleGroup: string; completedSets: number }>
}

export type WeeklyLoadEnriched = {
  weeks: WeeklyLoadPoint[]
  muscleByWeek: MuscleWeekPoint[]
}
```

### Función nueva: `getWeeklyLoadEnrichedData`

Reemplaza `getWeeklyLoadData` en `page.tsx`. Retorna `WeeklyLoadEnriched`.

**Estrategia de queries (sin round-trips extra):**

1. `client_plan_days` (ya existente) → agrega select de `client_plan_day_exercises(sets, exercise_id)` en el mismo fetch via join.
2. De ese join: calcular `plannedSets` y `plannedSessions` por semana en memoria (JS loop, sin query extra).
3. `session_sets` join `client_plan_day_exercises` (ya existente) → agrega `exercises(muscle_group)` al select.
4. En el loop de agregación de sets: además de acumular tonelaje/series, acumular `(weekNumber, muscleGroup) → setCount`.
5. Construir `muscleByWeek` desde esa acumulación.

**Resultado:** mismo número de queries que la función original (≈4), con datos adicionales obtenidos en los mismos fetches vía joins.

**IMPORTANTE — semanas a retornar:** La función construye `Array.from({ length: activePlan.weeks }, ...)` — es decir, **todas las semanas del plan** (no solo hasta `currentWeek`). Las semanas futuras (`weekNumber > currentWeek`) tienen `completedSets: 0`, `tonnageKg: 0`, `sessionCount: 0`, `plannedSets` y `plannedSessions` calculados del plan. Esto permite mostrarlas en el chart como slots vacíos grises, dando al coach contexto del total del plan.

### Grupos musculares canónicos

Orden fijo para mostrar siempre los mismos grupos (con 0 si no hay datos):

```ts
const MUSCLE_GROUPS_ORDER = [
  'Piernas', 'Empuje', 'Espalda', 'Hombros', 'Core', 'Brazos', 'Cardio', 'Otro'
]
```

Ejercicios con `muscle_group` no reconocido → se agrupan bajo `'Otro'`.

---

## Sección 2 — Componentes UI

### `WeeklyHeroKpis` (Server Component)

Props: `weeks: WeeklyLoadPoint[]`, `currentWeek: number`

Deriva internamente:
- `currentWeekData = weeks.find(w => w.weekNumber === currentWeek)`
- `prevWeekData = weeks.find(w => w.weekNumber === currentWeek - 1)`
- WoW % = `(current - prev) / prev * 100`

Tres tarjetas horizontales con borde `#1F2227`, fondo `#111317`:

| Card | Valor | Sub-label |
|---|---|---|
| Tonelaje | `X.X t` o `X kg` | `↑/↓ X%` vs sem anterior |
| Volumen | `XX series` | `XX / XX planificadas` |
| Intensidad | `XX.X kg/serie` | `↑/↓ X%` vs sem anterior |

Colores de delta: verde `#22C55E` (subida), rojo `#F87171` (bajada), gris `#6B7280` (sin base).

---

### `WeeklyLoadChart` (Client Component — mejora del existente)

**Estado:** `useState<number>(currentWeek)` → `selectedWeek`

**Mejoras visuales sobre el chart actual:**
- Barras con gradiente vertical: `barColor` → `barColor + '99'` de arriba a abajo
- Semana actual: borde lima `#B5F23D` + `box-shadow: 0 0 8px rgba(181,242,61,0.3)`
- Semanas futuras (si `weekNumber > currentWeek`): slot visible en gris muy tenue `#1A1E24`, sin barra, label en `#374151`
- Semana seleccionada: fondo `rgba(255,255,255,0.08)`, outline `rgba(255,255,255,0.2)`
- Transición de altura con `transition: 'height 0.3s ease'` (ya existe, se mantiene)

**Selector de métrica:** se mantiene igual (Tonelaje / Intensidad / Series).

---

### `MuscleGroupBreakdown` (dentro de WeeklyLoadChart)

Props: `breakdown: Array<{ muscleGroup: string; completedSets: number }>`, `weekNumber: number`

- Lista de grupos en orden canónico `MUSCLE_GROUPS_ORDER`
- Barra horizontal: ancho proporcional al grupo con más series de esa semana
- Grupos con 0 series: barra vacía en `#1F2227`, label en `#4B5563`, valor `—`
- Barra activa (> 0): color `#B5F23D` con opacidad reducida (`#B5F23D66`) y el conteo en blanco
- Si todos los grupos tienen 0 → estado vacío: `"Sin sesiones en semana X"`

```
Piernas   [████████████░░░░]  24 series
Empuje    [████████░░░░░░░░]  16 series
Espalda   [░░░░░░░░░░░░░░░░]  —
```

---

### `AdherenceBlock` (dentro de WeeklyLoadChart)

Props: `week: WeeklyLoadPoint`, `weekNumber: number`

**Se oculta si `week.plannedSessions === 0`** (semana sin días planificados).

- Dots de sesiones: `●` completada (lima), `○` pendiente (`#374151`)
- Barra de series: `completedSets / plannedSets` — se muestra fracción `87/90`
- Etiqueta interpretativa automática:
  - `≥ 90%` → `"Carga dentro del rango"` — color `#22C55E`
  - `70–89%` → `"Carga moderada"` — color `#F59E0B`
  - `< 70%` → `"Carga baja — revisar"` — color `#F87171`
- Porcentaje base: `completedSets / plannedSets`; si `plannedSets = 0`, se oculta la barra de series pero se muestran los dots de sesiones

---

### `WeeklyRowList` (refinement del existente)

- Se mantiene la lógica actual
- Ajuste visual: padding y tipografía consistentes con los bloques nuevos
- El highlight de semana seleccionada ya funciona — se conecta al mismo `selectedWeek`

---

## Sección 3 — Data Flow

```
page.tsx (Server Component)
  → getWeeklyLoadEnrichedData(clientId, activePlan)
  → <WeeklyHeroKpis weeks={weeks} currentWeek={activePlan.currentWeek} />
  → <WeeklyLoadChart
       weeks={weeks}
       muscleByWeek={muscleByWeek}
       currentWeek={activePlan.currentWeek}
       planStartDate={activePlan.startDate}
     />

WeeklyLoadChart (Client Component)
  → selectedWeek: useState(currentWeek)
  → semana seleccionada = weeks[selectedWeek - 1]
  → muscleData = muscleByWeek.find(m => m.weekNumber === selectedWeek)
  → <MuscleGroupBreakdown breakdown={muscleData.breakdown} />
  → <AdherenceBlock week={semanaSeleccionada} />
  → <WeeklyRowList weeks={weeks} selectedWeek={selectedWeek} />
```

Sin fetches en cliente. Todos los datos viajan una vez desde el servidor.

---

## Sección 4 — Empty States

| Situación | Comportamiento |
|---|---|
| Sin plan activo | Pantalla existente — no se toca |
| Plan activo, 0 sesiones | Chart visible (barras vacías), bloques 3 y 4 ocultos |
| Semana sin sesiones | Músculo: todos en gris `—`; Adherencia: `0/N sesiones`, sin barra de series |
| `muscle_group` no reconocido | Agrupa bajo `"Otro"` |
| `plannedSets = 0` para una semana | Oculta barra de series en AdherenceBlock; dots de sesiones visibles |
| Semana futura seleccionada | Bloques 3 y 4 muestran estado vacío inline |

---

## Sección 5 — Paleta y Restricciones de Estilo

- Fondos: `#0A0A0A`, `#111317`, `#12161C`
- Bordes: `#1F2227`, `#252A31`, `#2A313B`
- Texto primario: `#F0F0F0`
- Texto secundario: `#9CA3AF`, `#6B7280`, `#4B5563`
- Acento lima: `#B5F23D` — solo para acción primaria, semana actual, estados positivos
- Delta positivo: `#22C55E`
- Delta negativo: `#F87171`
- Warning: `#F59E0B`
- Sin colores fuera de esta paleta

---

## Sección 6 — Checklist de Entrega

- [ ] `getWeeklyLoadEnrichedData` pasa todos los campos nuevos correctamente
- [ ] `WeeklyLoadPoint.plannedSets` y `plannedSessions` correctos para todas las semanas
- [ ] `MuscleWeekPoint.breakdown` cubre todos los grupos (incluyendo 0s)
- [ ] `npx tsc --noEmit` sin errores
- [ ] Pantalla mobile-first — testear en viewport 390px
- [ ] Empty states visibles y elegantes
- [ ] Semana actual destacada correctamente en el chart
- [ ] Bloques 3 y 4 actualizan al tocar barras del chart
