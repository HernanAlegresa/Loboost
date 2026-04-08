# LoBoost — Spec de Arquitectura y Sistema de Trabajo
**Fecha:** 2026-04-08
**Estado:** Aprobado
**Stack:** Next.js 15 (App Router) + Supabase + TypeScript + Tailwind CSS + Zod

---

## 1. Descripción del producto

LoBoost es una web app mobile-first + desktop enfocada en coaches de fitness. Permite a entrenadores gestionar clientes, crear planes de entrenamiento y hacer seguimiento del progreso de cada cliente de forma profesional y eficiente.

**Enfoque principal:** fitness / entrenamiento
**Enfoque secundario:** nutrición simple (planes en texto, sin tracking de macros)
**MVP:** sin chat interno — comunicación externa (ej: WhatsApp)

### Roles de usuario

**Coach:**
- Crear y gestionar clientes
- Biblioteca de ejercicios propia (crear, reutilizar, hacer override en plan)
- Crear plan templates (semanas → días → ejercicios)
- Asignar planes a clientes (genera copia independiente)
- Crear planes de nutrición simples
- Ver dashboard individual de cada cliente

**Cliente:**
- Ver su dashboard personal
- Ver plan activo asignado
- Registrar peso por ejercicio
- Marcar ejercicios y días como completados
- Ver historial de progreso

---

## 2. Decisiones de arquitectura

### Stack
- **Frontend/Backend:** Next.js 15, App Router, TypeScript
- **Base de datos + Auth:** Supabase
- **Estilos:** Tailwind CSS
- **Validación:** Zod (schemas por feature)
- **Deployment:** Vercel

### Estructura de proyecto: feature-based con `src/`

Todo el código vive dentro de `src/`. La separación es por dominio (features), no por tipo de archivo (layers).

**Regla de clasificación:**
- ¿Es lógica específica de un dominio? → `src/features/[feature]/`
- ¿Es un primitivo visual reutilizable sin dominio? → `src/components/ui/`
- ¿Es infraestructura sin UI? → `src/lib/`

### Árbol de carpetas

```
loboost/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (coach)/
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── clients/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [clientId]/page.tsx
│   │   │   ├── exercises/page.tsx
│   │   │   └── plans/
│   │   │       ├── page.tsx
│   │   │       └── [planId]/page.tsx
│   │   ├── (client)/
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── plan/page.tsx
│   │   │   └── progress/page.tsx
│   │   ├── api/webhooks/route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── features/
│   │   ├── auth/
│   │   │   ├── components/       ← LoginForm, RegisterForm
│   │   │   ├── actions/          ← signIn, signUp, signOut
│   │   │   ├── schemas.ts        ← loginSchema, registerSchema
│   │   │   └── types.ts
│   │   ├── clients/
│   │   │   ├── components/       ← ClientCard, ClientList, ClientForm
│   │   │   ├── actions/          ← createClient, updateClient
│   │   │   ├── queries/          ← getClients, getClientById
│   │   │   ├── schemas.ts
│   │   │   └── types.ts
│   │   ├── plans/
│   │   │   ├── components/
│   │   │   │   ├── templates/    ← PlanEditor, PlanTemplateCard (vista coach)
│   │   │   │   └── assigned/     ← AssignedPlanView, AssignedPlanCard (vista cliente)
│   │   │   ├── actions/
│   │   │   │   ├── templates.ts  ← createPlan, updatePlan, deletePlan
│   │   │   │   └── assigned.ts   ← assignPlan (crea copia), updateAssignedPlan
│   │   │   ├── queries/
│   │   │   │   ├── templates.ts  ← getCoachPlans, getPlanById
│   │   │   │   └── assigned.ts   ← getClientActivePlan, getClientPlanHistory
│   │   │   ├── schemas.ts
│   │   │   └── types.ts          ← Plan, AssignedPlan, PlanWeek, PlanDay, ExerciseSlot
│   │   ├── exercises/
│   │   │   ├── components/       ← ExerciseCard, ExerciseLibrary, ExerciseForm
│   │   │   ├── actions/
│   │   │   ├── queries/
│   │   │   ├── schemas.ts
│   │   │   └── types.ts
│   │   ├── progress/
│   │   │   ├── components/       ← ProgressLog, CompletionToggle, WeightInput
│   │   │   ├── actions/          ← logExerciseWeight, markDayComplete
│   │   │   ├── schemas.ts
│   │   │   └── types.ts
│   │   └── nutrition/
│   │       ├── actions/
│   │       ├── schemas.ts
│   │       └── types.ts
│   │
│   ├── components/
│   │   └── ui/                   ← Button, Card, Input, Badge, Modal, Tabs, Spinner
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts         ← createBrowserClient()
│   │   │   ├── server.ts         ← createServerClient() para RSC y actions
│   │   │   └── middleware.ts     ← updateSession()
│   │   ├── auth/
│   │   │   ├── roles.ts          ← getUserRole(), requireRole()
│   │   │   └── session.ts        ← getSession(), getCurrentUser()
│   │   └── utils.ts              ← cn(), formatDate()
│   │
│   ├── types/
│   │   └── database.ts           ← generado con `supabase gen types`, nunca editar
│   │
│   └── middleware.ts             ← protección de rutas por rol
│
├── docs/
│   ├── superpowers/specs/        ← specs de brainstorming
│   └── design/
│       ├── DESIGN.md             ← tokens visuales, tipografía, guías UI
│       └── stitch/               ← referencias visuales de Stitch (nunca a producción)
│
├── CLAUDE.md
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── .env.local
```

**Regla sobre carpetas vacías:** no se crean por anticipación. Una subcarpeta (`hooks/`, `queries/`) aparece cuando hay al menos un archivo real para poner en ella.

---

## 3. Autenticación y sistema de roles

**Mecanismo:** Supabase Auth + tabla `profiles` con campo `role: 'coach' | 'client'`

**Quién se registra:**
- Los **coaches** se registran por cuenta propia en `/register`.
- Los **clientes** son creados por el coach (no se auto-registran). El coach crea el cliente desde su dashboard; Supabase crea la cuenta vía `admin.createUser()` o invitación por email. El cliente recibe credenciales para acceder a su dashboard.

Un trigger de Supabase crea automáticamente el registro en `profiles` al crearse el usuario, con el rol correspondiente (`'coach'` en registro directo, `'client'` cuando lo crea el coach).

**Flujo de middleware (`src/middleware.ts`):**
```
request
  → updateSession(supabase)           ← refresca cookie de sesión
  → getUserRole()                     ← lee rol desde profiles
  → sin sesión          → /login
  → coach en ruta /client → /coach/dashboard
  → cliente en ruta /coach → /client/dashboard
  → ok → continúa
```

Las route groups `(coach)/` y `(client)/` tienen layouts y protección propios. `lib/auth/roles.ts` expone helpers usados tanto en middleware como en Server Components.

---

## 4. Convenciones de código

### Server vs Client Components
- Todo componente es Server Component por defecto.
- `'use client'` solo cuando hay interactividad real: estado local, event handlers, efectos.
- Nunca marcar layouts o páginas enteras como client sin razón.

### Server Actions
- Siempre `'use server'` al inicio del archivo.
- Validar con Zod antes de cualquier operación con Supabase.
- Usar `createServerClient()` de `lib/supabase/server.ts`. Nunca el browser client.

### Supabase clients
- `lib/supabase/client.ts` → solo para componentes con `'use client'`
- `lib/supabase/server.ts` → Server Components, server actions, middleware
- Nunca mezclar los dos contextos.

### Tipos
- `types/database.ts` → generado automáticamente, nunca editar a mano. Regenerar con `supabase gen types typescript` al cambiar el schema.
- `features/[feature]/types.ts` → tipos de dominio derivados, orientados a la UI. Ej: `PlanWithWeeks`, `ClientWithActivePlan`.

### Schemas Zod
- Un `schemas.ts` por feature. No inline dentro de actions.
- Los schemas compartidos entre features (raro) van a `lib/schemas.ts`.

### Nombres de archivos y carpetas
- Archivos: `kebab-case` (`create-plan.ts`, `plan-editor.tsx`)
- Componentes React: `PascalCase` (`PlanEditor`)
- Carpetas de features: `kebab-case` en minúsculas

---

## 5. Modelo de base de datos (Supabase)

### Tablas

```sql
-- Extiende auth.users de Supabase
profiles
  id           uuid PK references auth.users
  role         text CHECK (role IN ('coach', 'client'))
  full_name    text
  avatar_url   text
  coach_id     uuid nullable references profiles  -- para clientes
  created_at   timestamptz default now()

-- Biblioteca de ejercicios del coach
exercises
  id           uuid PK default gen_random_uuid()
  coach_id     uuid references profiles
  name         text NOT NULL
  description  text
  muscle_group text
  created_at   timestamptz default now()

-- Plan templates creados por el coach
plans
  id             uuid PK default gen_random_uuid()
  coach_id       uuid references profiles
  name           text NOT NULL
  description    text
  duration_weeks int NOT NULL
  created_at     timestamptz default now()

plan_weeks
  id          uuid PK default gen_random_uuid()
  plan_id     uuid references plans ON DELETE CASCADE
  week_number int NOT NULL

plan_days
  id           uuid PK default gen_random_uuid()
  plan_week_id uuid references plan_weeks ON DELETE CASCADE
  day_of_week  text CHECK (day_of_week IN ('monday','tuesday','wednesday','thursday','friday','saturday','sunday'))

plan_day_exercises
  id                     uuid PK default gen_random_uuid()
  plan_day_id            uuid references plan_days ON DELETE CASCADE
  exercise_id            uuid nullable references exercises
  exercise_name_override text nullable  -- override sin afectar biblioteca
  sets                   int NOT NULL
  reps                   text NOT NULL  -- "10", "8-12", "AMRAP"
  notes                  text
  order_index            int NOT NULL default 0

-- ─────────────────────────────────────────
-- Copias asignadas al cliente (independientes del template)
-- ─────────────────────────────────────────

client_plans
  id               uuid PK default gen_random_uuid()
  client_id        uuid references profiles
  original_plan_id uuid nullable references plans  -- referencia histórica solamente
  name             text NOT NULL
  duration_weeks   int NOT NULL
  status           text CHECK (status IN ('active','completed','archived')) default 'active'
  started_at       date
  created_at       timestamptz default now()

client_plan_weeks
  id             uuid PK default gen_random_uuid()
  client_plan_id uuid references client_plans ON DELETE CASCADE
  week_number    int NOT NULL

client_plan_days
  id                  uuid PK default gen_random_uuid()
  client_plan_week_id uuid references client_plan_weeks ON DELETE CASCADE
  day_of_week         text
  is_completed        bool default false
  completed_at        timestamptz

client_plan_exercises
  id                 uuid PK default gen_random_uuid()
  client_plan_day_id uuid references client_plan_days ON DELETE CASCADE
  exercise_name      text NOT NULL  -- copiado, independiente de la biblioteca
  sets               int NOT NULL
  reps               text NOT NULL
  weight_logged      numeric       -- registrado por el cliente
  is_completed       bool default false
  completed_at       timestamptz
  notes              text

-- Planes de nutrición (simples)
nutrition_plans
  id         uuid PK default gen_random_uuid()
  coach_id   uuid references profiles
  client_id  uuid nullable references profiles
  title      text NOT NULL
  content    text NOT NULL  -- texto libre o markdown simple
  created_at timestamptz default now()
```

### Decisiones de diseño clave

1. `original_plan_id` en `client_plans` es referencia histórica con `nullable`. Si el template se elimina, el plan del cliente no se rompe.
2. `exercise_name` en `client_plan_exercises` es texto copiado, no FK. El historial del cliente es inmune a cambios en la biblioteca.
3. `reps` es `text` para soportar rangos (`"8-12"`) y valores especiales (`"AMRAP"`).
4. RLS obligatorio en todas las tablas desde la primera migración. Las políticas viajan en `supabase/migrations/`, nunca se configuran solo en el dashboard.

---

## 6. Integración de Stitch

### Pipeline

```
Stitch (exploración visual)
    ↓
docs/design/stitch/          ← capturas y referencias visuales
    ↓
docs/design/DESIGN.md        ← extracción de tokens: colores, tipografía, espaciado
    ↓
Claude Code lee DESIGN.md    ← implementa componentes reales en Next.js + Tailwind
    ↓
src/components/ui/           ← primitivos del design system
    ↓
src/features/[feature]/components/
```

### Qué documenta `DESIGN.md`
- Paleta de colores con variables CSS
- Escala tipográfica (familia, pesos, tamaños)
- Escala de espaciado (unidad base, padding de componentes, secciones)
- Principios visuales (cómo se usa el color de acento, cuándo usar sombras, etc.)

### Reglas de Stitch
- El código exportado por Stitch es solo referencia visual, nunca código final.
- Nunca copiar HTML/JSX de Stitch directamente a `features/`.
- Si Stitch genera un layout interesante, usarlo como referencia para que Claude Code lo implemente correctamente en Tailwind con las convenciones del proyecto.

### Quién prepara los prompts de Stitch
Claude Code prepara todos los prompts para Stitch. El usuario no trabaja en Stitch directamente.

Cuando una feature requiera exploración visual, Claude Code genera el prompt óptimo en base al spec, al `DESIGN.md` vigente y al contexto de la feature. El usuario ejecuta el prompt en Stitch y devuelve el output (captura o export) para que Claude Code lo procese e integre al pipeline.

---

## 7. Workflow con Claude Code

### Flujo de sesión estándar

```
1. superpowers:brainstorming     → entender qué construir y cómo
2. superpowers:writing-plans     → plan de implementación paso a paso
3. superpowers:executing-plans   → implementación con checkpoints
4. frontend-design               → si la sesión es de UI
5. superpowers:verification      → antes de cerrar la sesión
6. superpowers:requesting-code-review → al completar la feature
```

### Reglas de contexto

- Una sesión = una feature o tarea acotada con objetivo claro.
- Usar `/clear` al cambiar a una feature independiente.
- Referenciar archivos específicos, no "el proyecto" en general.
- CLAUDE.md reemplaza la explicación de convenciones — no repetir en cada prompt.

### Skills a usar

| Skill | Cuándo |
|---|---|
| `superpowers:brainstorming` | Antes de cualquier feature nueva |
| `superpowers:writing-plans` | Después del brainstorming |
| `superpowers:executing-plans` | Durante implementación |
| `frontend-design` | Al construir componentes UI |
| `figma:figma-implement-design` | Al convertir referencia de Stitch a código |
| `superpowers:systematic-debugging` | Ante cualquier bug |
| `superpowers:verification-before-completion` | Antes de cerrar cada sesión |
| `superpowers:requesting-code-review` | Al completar una feature |

### Subagents: cuándo usarlos

**Sí:** tareas independientes en paralelo, investigación sin tocar código, exploración de alternativas, generación de migración SQL + tipos en simultáneo.

**No:** features con dependencias secuenciales, cambios de un solo archivo, flujo principal de implementación.

---

## 8. Riesgos y errores a evitar

| # | Riesgo | Consecuencia | Regla |
|---|---|---|---|
| 1 | RLS no configurado | Leak de datos entre usuarios | Toda tabla nueva incluye políticas RLS en la misma migración |
| 2 | `assignPlan` crea referencia, no copia | Editar template afecta clientes activos | `actions/assigned.ts` siempre copia todas las filas |
| 3 | Browser client en server actions | Errores de autenticación silenciosos | `createServerClient()` en todo lo que corre en servidor |
| 4 | `'use client'` por defecto | JS innecesario al cliente, peor performance | Server Component por defecto, `'use client'` solo con interactividad real |
| 5 | Código de Stitch directo a `features/` | Deuda técnica desde el día 1 | Pipeline siempre pasa por DESIGN.md → Claude Code |
| 6 | Editar `types/database.ts` a mano | Cambios se pierden al regenerar | Solo tipos de dominio en `features/[feature]/types.ts` |
| 7 | Sesiones sin scope claro | Cambios incorrectos, inconsistencias | Definir objetivo antes de abrir sesión |
| 8 | Schema cambiado sin migración SQL | Schema no reproducible en otro entorno | Todos los cambios en `supabase/migrations/` |
| 9 | Lógica de negocio en componentes | Código duplicado, difícil de mantener | Queries en `queries/`, mutaciones en `actions/`, componentes solo consumen |
| 10 | Saltarse brainstorming en "features pequeñas" | Implicancias no previstas descubiertas tarde | El proceso existe para atrapar eso antes de escribir código |

---

## 9. Dirección visual

**Estética:** premium, deportiva, minimalista, moderna.

**Paleta base:**
- Fondo: negros / grises oscuros (`#0a0a0a`, `#141414`)
- Primario: verde / lima (`#b5f23d` o similar — definir en DESIGN.md)
- Secundarios: grises / plateados
- Acentos: blanco / detalles premium

**Tipografía:** moderna, legible en mobile, con jerarquía visual clara.

**Principios:**
- Mobile-first, compatible desktop
- Separación de superficies por color, no por sombras pesadas
- Acentos de color solo en CTAs y estados activos

La dirección visual definitiva se define en `docs/design/DESIGN.md` después de exploración en Stitch.

---

## 10. Próximos pasos

El siguiente paso es crear el plan de implementación para la primera fase del proyecto. El orden recomendado de construcción:

1. **Setup del proyecto** — Next.js + Supabase + Tailwind + CLAUDE.md
2. **Auth + roles** — registro, login, middleware, protección de rutas
3. **Design system base** — primitivos en `components/ui/`, DESIGN.md
4. **Gestión de clientes** — CRUD básico del coach
5. **Biblioteca de ejercicios** — CRUD del coach
6. **Editor de planes** — plan template con semanas/días/ejercicios
7. **Asignación de planes** — lógica de copia + plan activo del cliente
8. **Dashboard del cliente** — ver plan, registrar progreso
9. **Historial y progreso** — tracking en el tiempo
10. **Nutrición** — planes simples de texto
