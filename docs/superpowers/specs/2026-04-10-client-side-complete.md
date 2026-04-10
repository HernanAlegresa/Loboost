# LoBoost — Lado Cliente Completo: Spec de Diseño

## Objetivo

Completar y mejorar todas las pantallas del lado cliente para que la experiencia sea funcional, clara y enfocada en lo esencial: que el cliente entrene, sepa qué tiene que hacer y pueda registrar su progreso sin fricción.

---

## Navegación

**Bottom nav (4 items):** Inicio | Plan | Historial | Ajustes

Rutas del nav:
- `Inicio` → `/client/dashboard`
- `Plan` → `/client/plan`
- `Historial` → `/client/history`
- `Ajustes` → `/client/settings`

El componente `ClientBottomNav` existente se actualiza para reflejar estos 4 items.

---

## Pantallas

### 1. Dashboard — `/client/dashboard` (mejorar existente)

**Header:**
- Avatar con iniciales del cliente (círculo con color fijo, sin foto)
- Saludo: "Hola, {nombre}" + fecha actual (ej: "Viernes 10 de abril")

**Bloque plan activo** (si tiene plan):
- Nombre del plan
- Barra de progreso con label "Semana X de Y"
- Botón "Ver plan" → `/client/plan`

**Bloque sesión en progreso** (prioritario, aparece encima del bloque de hoy):
- Si existe una sesión con `status = 'in_progress'` para hoy → mostrar banner destacado
- Texto: "Tenés un entrenamiento en curso"
- Botón "Retomar" → `/client/training/[sessionId]`

**Bloque de hoy:**
- Si es día de entrenamiento:
  - Indicar grupo muscular o cantidad de ejercicios (ej: "5 ejercicios · Pecho y tríceps")
  - Botón principal "Empezar entrenamiento" → crea sesión y navega a `/client/training/[id]`
- Si es día de descanso:
  - Icono + mensaje de descanso (ej: "Hoy es día de descanso. Recuperate bien.")
- Si no tiene plan asignado:
  - Mensaje "Tu coach todavía no te asignó un plan"

**Botón Nutrición:**
- Botón secundario en el dashboard → `/client/nutrition`
- Siempre visible

**Sin plan:** mostrar solo mensaje vacío, sin bloques de hoy ni plan.

---

### 2. Vista del plan — `/client/plan` (nueva)

**Header:** Nombre del plan, fecha de inicio y fin

**Navegación de semanas:** ← Semana X de Y →

**Por semana:** lista de días de entrenamiento con estado:
- Completado ✓ (verde)
- Hoy (resaltado)
- Pendiente (gris)
- Descanso (sin estilo especial, no aparece en la lista)

**Al tocar un día** → navega a `/client/plan/[weekNumber]/[clientPlanDayId]`

**Barra de progreso general** en la parte superior (% de sesiones completadas / total)

---

### 3. Detalle de día — `/client/plan/[weekNumber]/[clientPlanDayId]` (nueva)

**Header:** día de la semana + número de semana, botón volver

**Lista de ejercicios del día:**
- Por cada ejercicio: nombre, grupo muscular, series × reps (o duración si cardio)
- Si el ejercicio tiene `video_url`: botón "Ver video" → abre modal con el link (iframe o link externo)
- Si no tiene `video_url`: no muestra botón

**Estado del día:** si la sesión existe y está completada, mostrar badge "Completado"

**Botón CTA:** si el día es hoy y la sesión no existe → "Empezar entrenamiento"; si está `in_progress` → "Retomar"; si está completado → sin botón de acción

---

### 4. Live training — `/client/training/[sessionId]` (rediseñar existente)

**Estructura:** un ejercicio por pantalla completa.

**Header:**
- Botón volver (con confirmación si hay sets completados)
- Indicador "Ejercicio X de Y"
- Nombre del ejercicio (grande)
- Grupo muscular
- Si tiene `video_url`: botón "Ver video" → modal, no interrumpe el flujo

**Por cada serie (lista vertical):**
- Label "Serie N"
- Input: peso en kg (strength) o duración en segundos (cardio)
- Botón / check "Completar"
- Cuando está completada: muestra el valor registrado + check verde, no editable

**Navegación entre ejercicios:**
- Al completar todas las series del ejercicio actual: aparece botón "Siguiente ejercicio →"
- Botón "← Ejercicio anterior" disponible siempre (excepto en el primero)
- No hay scroll libre entre ejercicios

**Fin del entrenamiento:**
- Cuando se completa el último ejercicio: pantalla de cierre con mensaje "¡Entrenamiento completado!" y botón "Volver al inicio" → llama `completeSessionAction` + navega a `/client/dashboard`

**Resume:** si el cliente cierra la app y vuelve, retoma desde el primer ejercicio con sets incompletos (inicializado desde server data igual que ahora)

---

### 5. Historial — `/client/history` (rediseñar existente)

**Estructura:** lista de semanas (no de sesiones individuales)

**Por semana:**
- Label "Semana X" + rango de fechas (ej: "7 – 13 abr")
- Días completados / días totales (ej: "3 de 4 días")
- % de cumplimiento
- Chevron → expandible o navega a detalle

**Al entrar a una semana** → `/client/history/week/[weekNumber]`:
- Lista de días de esa semana
- Por cada día: fecha, ejercicios realizados, sets completados
- Al tocar un día: muestra ejercicios con series y valores registrados (inline, no pantalla nueva)

**Estado vacío:** "Todavía no completaste ninguna semana. ¡Empezá hoy!"

---

### 6. Nutrición — `/client/nutrition` (nueva, simple)

**Estado vacío siempre por ahora:**
- Icono + título "Nutrición"
- Mensaje "Tu coach aún no cargó recomendaciones de nutrición"
- Subtexto "Cuando tu coach agregue contenido, lo vas a ver acá"

No hay acciones ni inputs en esta pantalla por ahora.

---

### 7. Ajustes — `/client/settings` (nueva)

**Header de perfil:**
- Avatar con iniciales (mismo componente que dashboard)
- Nombre del cliente
- Email (solo lectura)
- Objetivo (solo lectura, viene de `client_profiles.goal`)

**Sección Notificaciones:**
- Toggle "Recordatorios de entrenamiento" — guarda en `notification_preferences` (nueva columna o tabla)
- Toggle "Mensajes del coach" — ídem
- Los toggles se persisten en DB pero no disparan push notifications

**Sección cuenta:**
- Botón "Cerrar sesión" (rojo, con acción `signOut`)

---

## Base de datos — cambios necesarios

### Tabla `notification_preferences` (nueva)
```sql
id           uuid PK default gen_random_uuid()
client_id    uuid references profiles(id) on delete cascade unique
reminders    boolean default true
coach_msgs   boolean default true
updated_at   timestamptz default now()
```

La unicidad en `client_id` garantiza un registro por cliente. Upsert al guardar.

---

## Componentes compartidos (nuevos)

- `ClientAvatar` — círculo con iniciales, reutilizable en dashboard y ajustes
- `VideoModal` — modal que muestra iframe o enlace externo, reutilizable en plan y live training
- `WeekNavigation` — flechas ← semana → reutilizable en plan e historial

---

## Rutas completas

| Ruta | Pantalla | Estado |
|------|----------|--------|
| `/client/dashboard` | Dashboard | mejorar |
| `/client/plan` | Vista del plan | nueva |
| `/client/plan/[weekNumber]/[clientPlanDayId]` | Detalle de día | nueva |
| `/client/training/[sessionId]` | Live training | rediseñar |
| `/client/history` | Historial semanal | rediseñar |
| `/client/history/week/[weekNumber]` | Detalle de semana | nueva |
| `/client/nutrition` | Nutrición | nueva |
| `/client/settings` | Ajustes | nueva |

---

## Qué NO entra en este scope

- Subir foto de perfil (requiere Supabase Storage, queda para después)
- Push notifications reales (los toggles se guardan pero no disparan nada)
- Edición de datos del perfil (peso, edad, etc.) — lo hace el coach
- Mensajería coach–cliente
