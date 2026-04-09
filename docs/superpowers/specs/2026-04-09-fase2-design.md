# LoBoost — Fase 2: Gestión de Clientes, Ejercicios, Planes y Seguimiento

## Objetivo

Construir el núcleo funcional de LoBoost: el coach puede gestionar sus clientes, armar planes de entrenamiento y asignarlos. El cliente puede ver su plan, registrar sus sesiones y trackear su progreso. El coach tiene una herramienta real de trabajo para monitorear la adherencia y evolución de cada cliente.

---

## Modelo de datos

### Tablas nuevas

**`client_profiles`** — datos fitness del cliente, creados por el coach
```
id            uuid PK references profiles(id) on delete cascade
age           integer
sex           text check (sex in ('male', 'female', 'other'))
goal          text
weight_kg     numeric(5,2)
height_cm     numeric(5,2)
experience_level text check (experience_level in ('beginner', 'intermediate', 'advanced'))
days_per_week integer check (days_per_week between 1 and 7)
injuries      text (nullable)
created_at    timestamptz default now()
```

**`exercises`** — biblioteca de ejercicios del coach
```
id            uuid PK default gen_random_uuid()
coach_id      uuid references profiles(id) on delete cascade
name          text not null
muscle_group  text not null
category      text not null
type          text check (type in ('strength', 'cardio')) not null
video_url     text (nullable)
created_at    timestamptz default now()
```

**`plans`** — templates de entrenamiento del coach
```
id            uuid PK default gen_random_uuid()
coach_id      uuid references profiles(id) on delete cascade
name          text not null
description   text (nullable)
weeks         integer check (weeks between 1 and 12) not null
created_at    timestamptz default now()
```

**`plan_days`** — días de entrenamiento dentro de un template (se repiten igual cada semana)
```
id            uuid PK default gen_random_uuid()
plan_id       uuid references plans(id) on delete cascade
day_of_week   integer check (day_of_week between 1 and 7) not null  -- 1=lunes, 7=domingo
order         integer not null
```

**`plan_day_exercises`** — ejercicios dentro de un día del template
```
id                uuid PK default gen_random_uuid()
plan_day_id       uuid references plan_days(id) on delete cascade
exercise_id       uuid references exercises(id) on delete restrict
order             integer not null
sets              integer not null
reps              integer (nullable -- null si cardio)
duration_seconds  integer (nullable -- null si fuerza)
rest_seconds      integer (nullable)
```

**`client_plans`** — copia del plan asignada a un cliente
```
id            uuid PK default gen_random_uuid()
client_id     uuid references profiles(id) on delete cascade
coach_id      uuid references profiles(id) on delete cascade
plan_id       uuid references plans(id) on delete set null  -- referencia al template original
name          text not null
weeks         integer not null
start_date    date not null
end_date      date not null  -- calculado: start_date + (weeks * 7 days)
status        text check (status in ('active', 'completed', 'paused')) default 'active'
created_at    timestamptz default now()
```

**`client_plan_days`** — copia de los días del plan para el cliente
```
id                uuid PK default gen_random_uuid()
client_plan_id    uuid references client_plans(id) on delete cascade
week_number       integer not null
day_of_week       integer check (day_of_week between 1 and 7) not null
order             integer not null
```

**`client_plan_day_exercises`** — copia de los ejercicios por día para el cliente
```
id                    uuid PK default gen_random_uuid()
client_plan_day_id    uuid references client_plan_days(id) on delete cascade
exercise_id           uuid references exercises(id) on delete restrict
order                 integer not null
sets                  integer not null
reps                  integer (nullable)
duration_seconds      integer (nullable)
rest_seconds          integer (nullable)
```

**`sessions`** — registro de cada entrenamiento del cliente
```
id                    uuid PK default gen_random_uuid()
client_id             uuid references profiles(id) on delete cascade
client_plan_day_id    uuid references client_plan_days(id) on delete cascade
date                  date not null
status                text check (status in ('in_progress', 'completed')) default 'in_progress'
started_at            timestamptz default now()
completed_at          timestamptz (nullable)
```

**`session_sets`** — peso o tiempo registrado por serie por ejercicio
```
id                            uuid PK default gen_random_uuid()
session_id                    uuid references sessions(id) on delete cascade
client_plan_day_exercise_id   uuid references client_plan_day_exercises(id) on delete cascade
set_number                    integer not null
weight_kg                     numeric(6,2) (nullable -- null si cardio)
duration_seconds              integer (nullable -- null si fuerza)
completed                     boolean default false
logged_at                     timestamptz default now()
```

**`body_measurements`** — evolución física del cliente
```
id            uuid PK default gen_random_uuid()
client_id     uuid references profiles(id) on delete cascade
date          date not null
weight_kg     numeric(5,2) (nullable)
notes         text (nullable)
created_at    timestamptz default now()
```

**`coach_notes`** — notas internas del coach sobre el cliente
```
id            uuid PK default gen_random_uuid()
coach_id      uuid references profiles(id) on delete cascade
client_id     uuid references profiles(id) on delete cascade
content       text not null
created_at    timestamptz default now()
updated_at    timestamptz default now()
```

---

### Relaciones clave

- `profiles.coach_id` → `profiles.id` — cliente pertenece a un coach
- `client_plans.plan_id` → `plans.id` — referencia al template original (informativa, no estructural)
- Un cliente solo puede tener un `client_plan` con `status = 'active'` a la vez (enforced en server action)
- `sessions` se crean con `status = 'in_progress'` al iniciar el entrenamiento y se actualizan a `completed` cuando el cliente finaliza

---

### Lógica de completado (calculada, no almacenada)

- **Ejercicio completo** → todos los `session_sets` del ejercicio tienen `completed = true`
- **Día completo** → sesión existe con `status = 'completed'`
- **Semana completa** → todos los días de entrenamiento de esa semana tienen sesión completada
- **Plan completo** → todas las semanas completadas
- **Cumplimiento semanal %** → sesiones completadas esta semana / días de entrenamiento esperados esta semana
- **Alerta de inactividad** → última sesión hace más de 5 días
- **Alerta de bajo cumplimiento** → cumplimiento semanal < 60%

Estos cálculos se realizan en funciones de servidor al momento de leer, no se persisten.

---

## Features del Coach

### 1. Gestión de clientes

**Crear cliente:**
- El coach completa un formulario con: nombre completo, email, contraseña temporal, edad, sexo, objetivo, peso, altura, nivel de experiencia, días disponibles por semana, lesiones o limitaciones
- Un Server Action usa `SUPABASE_SERVICE_ROLE_KEY` para crear el usuario en Supabase Auth (admin API)
- Se crea el `profile` con `role = 'client'` y `coach_id` apuntando al coach
- Se crea el `client_profile` con los datos fitness
- El coach le envía las credenciales al cliente por fuera de la app (WhatsApp, email, etc.)
- El cliente puede cambiar su contraseña al ingresar

**Lista de clientes:**
- El coach ve todos sus clientes con: nombre, estado (activo/inactivo), última actividad, cumplimiento semanal
- Filtros básicos: activos / inactivos

**Perfil del cliente (herramienta de trabajo):**
1. Resumen rápido: objetivo, estado, última actividad, cumplimiento semanal %
2. Alertas automáticas: inactividad (+5 días), bajo cumplimiento (<60%), sin registros de peso
3. Actividad reciente: últimos entrenamientos con fecha y días
4. Progreso por ejercicio: evolución de peso a lo largo del tiempo por ejercicio clave
5. Historial completo de sesiones: fecha, ejercicios, series, pesos registrados
6. Evolución física: peso corporal registrado
7. Notas internas del coach: observaciones privadas, editables

### 2. Biblioteca de ejercicios

- El coach crea ejercicios con: nombre, grupo muscular, categoría, tipo (fuerza | cardio), link de video (opcional)
- Los ejercicios son privados por coach
- Puede editar o eliminar ejercicios (eliminar solo si no están en uso en ningún plan activo)
- Al armar un plan elige ejercicios de su biblioteca

### 3. Plan builder (templates)

- El coach crea un plan con: nombre, descripción (opcional), duración en semanas (1-12)
- Define qué días de la semana son de entrenamiento (ej: lunes, miércoles, viernes)
- Esos días se repiten igual para todas las semanas del plan (se almacenan una sola vez en el template; al asignar se generan N semanas de client_plan_days automáticamente)
- En cada día agrega ejercicios de su biblioteca con: series, repeticiones (fuerza) o duración en segundos (cardio), descanso en segundos
- Puede reordenar ejercicios dentro de un día
- El template es reutilizable — puede asignarlo a múltiples clientes

### 4. Asignación de plan a cliente

- El coach elige un cliente, selecciona un plan template como base y define la fecha de inicio
- La fecha de fin se calcula automáticamente: `start_date + (weeks * 7 days)`
- El sistema crea una copia completa e independiente del template (client_plan + client_plan_days + client_plan_day_exercises)
- Antes de confirmar, el coach puede modificar la copia (ejercicios, series, reps) sin afectar el template
- Si el cliente ya tiene un plan activo, el sistema lo marca como `completed` antes de crear el nuevo
- Una vez activo, el coach puede editar el plan del cliente en cualquier momento — los cambios se reflejan de inmediato

---

## Features del Cliente

### 1. Vista global del plan

- El cliente ve su plan activo: nombre, semanas totales, fecha inicio y fin, semana actual
- Vista de todos los días de entrenamiento con su estado: completado ✓, pendiente, hoy
- Puede navegar entre semanas para ver qué viene
- Progreso visual: semanas y días completados

### 2. Modo live training

- El cliente toca "Iniciar entrenamiento" en el día actual
- Se crea inmediatamente una sesión con `status = 'in_progress'`
- UI diferente, limpia, pensada para el celular en el gym:
  - Muestra un ejercicio a la vez con nombre, video, músculo
  - Por cada serie: input de peso (kg) o tiempo (segundos según tipo), botón completar
  - Al completar todas las series pasa automáticamente al siguiente ejercicio
  - Al completar todos los ejercicios: sesión se cierra con `status = 'completed'`
- **Guardado en tiempo real:** cada serie completada se escribe en `session_sets` inmediatamente
- Si el cliente cierra la app, al volver retoma desde donde estaba (sesión `in_progress` abierta)

### 3. Registro flexible (post-entrenamiento)

- El cliente puede registrar los pesos de una sesión después de entrenar
- Puede ingresar los pesos de cada serie en cualquier momento
- Puede marcar un día como completado sin registrar pesos
- La sesión queda `in_progress` hasta que el cliente la completa manualmente

### 4. Completado en cadena

- Serie completada → ejercicio completo → día completo → semana completa → plan completo
- Estado visible en la vista global del plan
- El cliente ve de un vistazo cuánto lleva del plan

### 5. Historial de sesiones

- Lista de todos los entrenamientos anteriores con fecha
- Detalle de cada sesión: ejercicios realizados, series, pesos registrados por serie

---

## Decisiones técnicas

### Creación de clientes (service role)
Requiere `SUPABASE_SERVICE_ROLE_KEY` como variable de entorno del servidor (nunca expuesta al browser). El Server Action usa el cliente admin de Supabase para crear el usuario en Auth. Esta key tiene acceso total a la DB — solo se usa en este Server Action específico.

```
SUPABASE_SERVICE_ROLE_KEY=...  (agregar a .env.local, nunca a .env.public)
```

### Sesión en tiempo real
Cada `session_set` se persiste inmediatamente al completarse. No hay submit final — los datos fluyen al servidor serie por serie. Esto garantiza cero pérdida de datos si el cliente cierra la app.

### Plan activo único
Enforced en el Server Action de asignación:
1. Buscar client_plan activo del cliente
2. Si existe → UPDATE status = 'completed'
3. INSERT nuevo client_plan con status = 'active'
Todo en una transacción.

### Edición del plan del cliente
El coach edita directamente las tablas `client_plan_days` y `client_plan_day_exercises`. El template `plans` / `plan_days` / `plan_day_exercises` nunca se modifica desde el flujo de cliente. Cambios son inmediatos.

### RLS (Row Level Security)
- Coach solo ve sus propios clientes, ejercicios y planes
- Cliente solo ve su propio plan, sesiones y sets
- Coach puede leer sesiones y sets de sus clientes (para el perfil de cliente)
- Nadie puede leer datos de otros coaches o clientes no asignados

---

## Tipos de dominio

```typescript
type ExerciseType = 'strength' | 'cardio'
type PlanStatus = 'active' | 'completed' | 'paused'
type SessionStatus = 'in_progress' | 'completed'
type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced'
type Sex = 'male' | 'female' | 'other'
```

---

## Convenciones de esta fase

- Toda la lógica de negocio vive en Server Actions (`features/[feature]/actions/`)
- Los cálculos de cumplimiento y alertas viven en `lib/analytics/` — funciones puras de servidor
- Schemas Zod para todos los inputs de coach y cliente
- TDD para: funciones de analytics, schemas, lógica de completado
- `SUPABASE_SERVICE_ROLE_KEY` solo se importa en el Server Action de creación de clientes

---

## Estructura de carpetas nueva

```
src/
├── features/
│   ├── clients/
│   │   ├── actions/        (create-client, update-client)
│   │   ├── components/     (client-list, client-form, client-profile)
│   │   └── schemas.ts
│   ├── exercises/
│   │   ├── actions/        (create-exercise, update-exercise, delete-exercise)
│   │   ├── components/     (exercise-list, exercise-form)
│   │   └── schemas.ts
│   ├── plans/
│   │   ├── actions/        (create-plan, update-plan, assign-plan)
│   │   ├── components/     (plan-builder, plan-list, plan-day-editor)
│   │   └── schemas.ts
│   └── training/
│       ├── actions/        (start-session, complete-set, complete-session)
│       ├── components/     (plan-view, live-training, session-history)
│       └── schemas.ts
├── lib/
│   └── analytics/          (compliance, alerts, progress calculations)
```
