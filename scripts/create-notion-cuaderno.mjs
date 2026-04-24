const TOKEN = process.env.NOTION_TOKEN;
const PAGE_ID = process.env.NOTION_PAGE_ID;
const BASE = "https://api.notion.com/v1";

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Notion-Version": "2022-06-28",
  "Content-Type": "application/json",
};

async function notion(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${path}: ${JSON.stringify(data)}`);
  return data;
}

// ── Block helpers ──────────────────────────────────────────────
const t = (s, bold = false, color = "default") => ({ type: "text", text: { content: s }, annotations: { bold, color } });
const h1 = (s, color = "default") => ({ object: "block", type: "heading_1", heading_1: { rich_text: [t(s)], color } });
const h2 = (s) => ({ object: "block", type: "heading_2", heading_2: { rich_text: [t(s)] } });
const h3 = (s) => ({ object: "block", type: "heading_3", heading_3: { rich_text: [t(s)] } });
const p = (s) => ({ object: "block", type: "paragraph", paragraph: { rich_text: s ? [t(s)] : [] } });
const b = (s, bold = false) => ({ object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: [t(s, bold)] } });
const bR = (parts) => ({ object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: parts } });
const num = (s) => ({ object: "block", type: "numbered_list_item", numbered_list_item: { rich_text: [t(s)] } });
const todo = (s, checked = false) => ({ object: "block", type: "to_do", to_do: { rich_text: [t(s)], checked } });
const callout = (emoji, s, color = "gray_background") => ({ object: "block", type: "callout", callout: { rich_text: [t(s)], icon: { type: "emoji", emoji }, color } });
const divider = () => ({ object: "block", type: "divider", divider: {} });
const quote = (s) => ({ object: "block", type: "quote", quote: { rich_text: [t(s)] } });
const code = (s, lang = "plain text") => ({ object: "block", type: "code", code: { rich_text: [t(s)], language: lang } });
const toggle = (title, children) => ({ object: "block", type: "toggle", toggle: { rich_text: [t(title, true)], children } });

async function append(blockId, blocks) {
  for (let i = 0; i < blocks.length; i += 100) {
    await notion("PATCH", `/blocks/${blockId}/children`, { children: blocks.slice(i, i + 100) });
  }
}

async function clearPage(pageId) {
  const res = await notion("GET", `/blocks/${pageId}/children?page_size=100`);
  for (const block of res.results) {
    await notion("DELETE", `/blocks/${block.id}`);
  }
}

async function createSubpage(parentId, emoji, title, blocks) {
  const page = await notion("POST", "/pages", {
    parent: { page_id: parentId },
    icon: { type: "emoji", emoji },
    properties: { title: { title: [{ type: "text", text: { content: title } }] } },
  });
  await append(page.id, blocks);
  console.log(`  ✅ ${emoji} ${title}`);
  return page.id;
}

// ══════════════════════════════════════════════════════════════════
// CONTENIDO DE CADA SUBPÁGINA
// ══════════════════════════════════════════════════════════════════

const stackContent = [
  callout("🎯", "Todo lo que usás en este proyecto, qué hace cada herramienta y por qué se eligió.", "blue_background"),
  divider(),

  h1("Next.js 14 — App Router"),
  callout("📌", "Framework de React para construir aplicaciones web full-stack. Es el núcleo de toda la app.", "yellow_background"),
  h3("Qué es"),
  p("Next.js es un framework construido sobre React que agrega routing, server-side rendering, y herramientas para hacer aplicaciones de producción. La versión 14 introdujo el App Router, que es la forma nueva y recomendada de estructurar proyectos."),
  h3("Por qué se usa en LoBoost"),
  b("Permite mezclar código del servidor y del cliente en la misma app — ideal para conectar con Supabase sin exponer credenciales."),
  b("El App Router organiza las rutas por carpetas: cada carpeta es una URL. Muy intuitivo."),
  b("Los Server Actions permiten ejecutar código del servidor directamente desde formularios — sin necesidad de una API REST separada."),
  b("SEO y performance incluidos de fábrica."),
  h3("Conceptos clave que aprendiste"),
  toggle("App Router vs Pages Router", [
    p("El Pages Router (viejo) usaba /pages/. El App Router (nuevo) usa /app/ y habilita Server Components por defecto. LoBoost usa App Router."),
    p("En App Router: carpeta = ruta. /app/coach/dashboard/page.tsx → URL /coach/dashboard"),
  ]),
  toggle("Server Components vs Client Components", [
    p("Server Components: se renderizan en el servidor. Pueden hacer fetch de DB directamente. NO tienen useState ni useEffect. Son el default."),
    p("Client Components: se ejecutan en el browser. Necesitan 'use client' al tope del archivo. Necesarios para interactividad (formularios, clicks, animaciones)."),
    p("Regla en LoBoost: Server Component por defecto. 'use client' solo cuando hay interactividad real."),
  ]),
  toggle("Server Actions", [
    p("Funciones async marcadas con 'use server' que se ejecutan en el servidor. Se llaman desde forms o desde Client Components como si fueran funciones normales."),
    p("En LoBoost son todas las mutaciones de datos: createPlanAction, assignPlanAction, completeSessionAction, etc."),
    p("Ventaja: no necesitás escribir una API REST. El código del servidor vive junto al feature."),
  ]),
  toggle("Route Groups", [
    p("Carpetas con paréntesis como (coach), (client), (training) que agrupan rutas sin afectar la URL. Solo organización."),
    p("LoBoost tiene: (coach) para pantallas del coach, (client) para pantallas del cliente, (auth) para login/register, (training) para la sesión de entreno en vivo."),
  ]),
  divider(),

  h1("TypeScript"),
  callout("📌", "Superset de JavaScript que agrega tipos estáticos. Todo el proyecto está en TypeScript.", "yellow_background"),
  h3("Qué hace"),
  p("TypeScript te dice en tiempo de escritura si estás usando mal una variable, si falta un campo, si pasaste el tipo incorrecto. Atrapa errores antes de que lleguen a producción."),
  h3("Dónde se usa en LoBoost"),
  b("src/types/database.ts — generado automáticamente por Supabase CLI. Contiene los tipos exactos de cada tabla de la DB."),
  b("src/types/domain.ts — tipos de dominio custom: ExerciseType, PlanStatus, SessionStatus, etc."),
  b("src/features/*/schemas.ts — schemas Zod que también generan tipos TypeScript."),
  b("Todo: components, actions, queries están tipados."),
  divider(),

  h1("Supabase"),
  callout("📌", "Backend as a Service: base de datos PostgreSQL + autenticación + APIs generadas automáticamente. El backend de LoBoost.", "yellow_background"),
  h3("Qué incluye"),
  toggle("PostgreSQL (Base de datos)", [
    p("Supabase usa PostgreSQL, la base de datos relacional más popular del mundo. Tablas, columnas, relaciones, foreign keys, índices — todo SQL estándar."),
    p("En LoBoost: 14 tablas conectadas entre sí (profiles, plans, sessions, etc.)."),
  ]),
  toggle("Auth (Autenticación)", [
    p("Manejo completo de usuarios: registro, login, logout, refresh tokens, sesiones. LoBoost usa email/password."),
    p("Cada usuario tiene un ID en auth.users que se referencia en la tabla profiles."),
  ]),
  toggle("Row Level Security (RLS)", [
    p("SEGURIDAD A NIVEL DE FILA. Políticas que definen quién puede ver/modificar qué datos directamente en la DB."),
    p("Ejemplo: un cliente solo puede ver sus propias sesiones. Un coach solo puede ver los datos de sus propios clientes."),
    p("Sin RLS, cualquier usuario autenticado podría leer todos los datos de todos. Con RLS, la DB bloquea los accesos no autorizados automáticamente."),
    p("Es una capa de seguridad extra que existe aunque el código de la app tenga bugs."),
  ]),
  toggle("Supabase Client (JS SDK)", [
    p("librería JavaScript para interactuar con Supabase desde Next.js."),
    p("LoBoost tiene 3 clientes: server.ts (SSR con cookies), client.ts (browser), admin.ts (service role, bypassa RLS para operaciones privilegiadas)."),
  ]),
  toggle("Supabase CLI + Migraciones", [
    p("Herramienta de línea de comandos para gestionar el schema de la DB con archivos SQL versionados."),
    p("Cada cambio en la DB es una migración: 20260420000001_plan_weeks.sql, etc. Se aplican en orden y son reversibles."),
    p("También genera automáticamente src/types/database.ts a partir del schema actual."),
  ]),
  divider(),

  h1("Zod"),
  callout("📌", "Librería de validación de schemas con TypeScript. Valida datos en el borde del sistema.", "yellow_background"),
  h3("Qué hace"),
  p("Define la 'forma' que deben tener los datos (qué campos, qué tipos, qué reglas) y los valida en runtime. Si los datos no cumplen el schema, Zod devuelve errores claros."),
  h3("Dónde se usa en LoBoost"),
  b("En todos los Server Actions: antes de tocar la DB, se valida con Zod el input del usuario."),
  b("src/features/*/schemas.ts — un archivo de schemas por feature."),
  b("Ejemplo: createPlanSchema valida que el plan tenga nombre, número de semanas válido, y que cada semana tenga al menos un día con ejercicios."),
  h3("Por qué es importante"),
  p("Nunca confiás en datos que vienen del exterior (formularios, APIs). Zod es la primera línea de defensa."),
  divider(),

  h1("CSS (sin framework)"),
  callout("📌", "LoBoost no usa Tailwind ni Bootstrap. Usa CSS con variables personalizadas y estilos inline/modules.", "yellow_background"),
  p("El design system está definido en tokens CSS (variables) en el layout global. Paleta dark con lime/verde como color de acento. Mobile-first."),
  p("Decisión de diseño: más control y especificidad. El trade-off es más código CSS a mano."),
  divider(),

  h1("Vercel (Deployment)"),
  callout("📌", "Plataforma de deploy creada por el mismo equipo de Next.js. Deploy automático desde git push.", "yellow_background"),
  p("Conectás el repositorio y cada push a main hace deploy automático. Optimizado específicamente para Next.js: Edge Runtime, CDN global, previews por PR."),
];

const claudeContent = [
  callout("🤖", "Cómo usé IA en el desarrollo de esta app, qué herramientas de IA utilicé, y qué necesitás saber sobre esto para entrevistas de AI Engineer.", "blue_background"),
  divider(),

  h1("Claude Code — Qué es"),
  p("Claude Code es una herramienta CLI (command-line interface) de Anthropic que convierte a Claude en un asistente de programación que puede leer, escribir y editar código, ejecutar comandos, navegar el codebase y razonar sobre el proyecto completo."),
  p("No es solo un chatbot — es un agente que opera en tu entorno de desarrollo real."),
  h3("Capacidades"),
  b("Lee archivos del proyecto (código, configs, docs)"),
  b("Escribe y edita código directamente en los archivos"),
  b("Ejecuta comandos de terminal (npm run, git, scripts)"),
  b("Busca en el codebase (grep, glob patterns)"),
  b("Hace llamadas a APIs externas (como la de Notion que acabás de ver)"),
  b("Lanza subagentes especializados para tareas paralelas"),
  divider(),

  h1("Skills — El sistema de instrucciones"),
  p("Los Skills son archivos de instrucciones que le dicen a Claude cómo abordar ciertos tipos de tareas. Son como 'modos de trabajo' activables."),
  h3("Skills que usé en este proyecto"),
  toggle("superpowers:brainstorming", [
    p("Se activa antes de cualquier feature nueva. Hace preguntas una a la vez para entender el problema, propone 2-3 enfoques con trade-offs, presenta un diseño y genera un spec antes de tocar código."),
    p("Por qué importa: evita implementar la solución equivocada. Pensar antes de hacer."),
  ]),
  toggle("superpowers:writing-plans", [
    p("Convierte un spec aprobado en un plan de implementación paso a paso con tasks concretas."),
  ]),
  toggle("superpowers:systematic-debugging", [
    p("Protocolo estructurado para debuggear: reproduce el error, forma hipótesis, verifica antes de cambiar código, no aplica fixes sin entender la causa raíz."),
  ]),
  toggle("superpowers:verification-before-completion", [
    p("Antes de declarar una tarea completada, verifica que realmente funciona. Evita los 'debería funcionar' sin probar."),
  ]),
  toggle("supabase:supabase", [
    p("Instrucciones específicas para trabajar con Supabase: cómo escribir migraciones, cómo usar RLS, patrones recomendados."),
  ]),
  toggle("frontend-design:frontend-design", [
    p("Guidelines para crear UI de calidad: composición visual, jerarquía, mobile-first, tokens de diseño."),
  ]),
  divider(),

  h1("Memory — Memoria persistente entre sesiones"),
  p("Claude Code tiene un sistema de memoria en archivos que persiste entre conversaciones. No necesita que le re-expliques el contexto del proyecto cada vez."),
  h3("Tipos de memoria usados"),
  toggle("project memory", [
    p("Estado del proyecto: qué fases están completas, qué está pendiente, decisiones tomadas."),
    p("Ejemplo: 'Plan A completo 2026-04-20. Plan B completo 2026-04-20. Próximas áreas: edit plan, vista RPE coach.'"),
  ]),
  toggle("user memory", [
    p("Perfil del desarrollador: experiencia, preferencias de trabajo, stack conocido."),
  ]),
  toggle("feedback memory", [
    p("Correcciones y preferencias de trabajo: 'no gastes tokens repitiendo contexto', 'respuestas concisas', etc."),
  ]),
  divider(),

  h1("Agentes y Subagentes"),
  p("Claude Code puede lanzar agentes especializados que trabajan en paralelo o en secuencia para tareas complejas."),
  h3("Tipos de agentes disponibles"),
  toggle("Explore agent", [
    p("Especializado en explorar codebases. Dado un conjunto de preguntas, navega archivos, lee código y devuelve un mapa completo. Se usó para la auditoría funcional de LoBoost."),
  ]),
  toggle("Plan agent", [
    p("Diseña planes de implementación: identifica archivos críticos, propone estrategia, evalúa trade-offs."),
  ]),
  toggle("General-purpose agent", [
    p("Para investigación compleja, búsquedas en codebase, tareas multi-paso que requieren múltiples herramientas."),
  ]),
  toggle("code-reviewer agent", [
    p("Revisa código implementado contra el plan original y estándares de calidad."),
  ]),
  h3("Por qué importa en AI Engineering"),
  p("Los sistemas multi-agente son el presente de la IA en producción. Entender cómo descomponer tareas complejas en subtareas paralelas e independientes es una habilidad clave."),
  divider(),

  h1("Cómo usé IA en el desarrollo de LoBoost"),
  h3("Proceso real de trabajo"),
  num("Planteo el problema o feature en lenguaje natural."),
  num("Claude revisa el contexto del proyecto (memoria + archivos)."),
  num("Si es feature nueva: brainstorming → spec → plan → implementación."),
  num("Si es bug: debugging sistemático → hipótesis → fix verificado."),
  num("Claude escribe código, yo reviso, apruebo o corrijo."),
  num("Se commitea con mensaje descriptivo generado por Claude."),
  p(""),
  h3("Ejemplo real: Plan Builder multi-semana"),
  p("Pedí 'quiero que el plan builder soporte semanas independientes con tipos'. Claude:"),
  num("Exploró el código del plan builder existente (915 líneas)."),
  num("Revisó el schema de DB actual (tabla plan_days sin semanas independientes)."),
  num("Propuso 3 enfoques con trade-offs (nueva tabla plan_weeks vs columnas en plan_days vs JSON)."),
  num("Recomendó nueva tabla plan_weeks. Expliqué por qué estaba de acuerdo."),
  num("Escribió la migración SQL + actualizó los types + refactorizó el plan builder + actualizó las actions."),
  num("Todo en una sesión, código funcionando y tipado."),
  divider(),

  h1("Lo que preguntan en entrevistas de AI Engineer"),
  callout("💼", "Estas son preguntas reales de entrevistas técnicas. Podés responderlas con ejemplos de este proyecto.", "green_background"),
  toggle("¿Cómo usás IA en tu workflow de desarrollo?", [
    p("Respuesta: 'Uso Claude Code como pair programmer IA. Para features nuevas sigo un proceso de brainstorming → spec → implementación. Para bugs uso debugging sistemático. El contexto del proyecto está en memoria persistente para no re-explicar cada sesión. Los agentes especializados me permiten explorar el codebase o hacer auditorías completas de forma paralela.'"),
  ]),
  toggle("¿Qué son los agentes de IA?", [
    p("Un agente de IA es un sistema que no solo genera texto sino que puede ejecutar acciones: leer/escribir archivos, llamar APIs, ejecutar código, tomar decisiones basadas en resultados. Claude Code es un agente. Los agentes multi-step pueden descomponer una tarea compleja en subtareas y ejecutarlas en secuencia o paralelo."),
  ]),
  toggle("¿Qué es prompt engineering?", [
    p("El arte de escribir instrucciones efectivas para modelos de IA. Incluye: dar contexto suficiente, ser específico sobre el formato de respuesta, incluir ejemplos (few-shot), definir constraints, iterar basado en resultados."),
    p("En Claude Code, los Skills son prompt engineering estructurado y reutilizable."),
  ]),
  toggle("¿Qué modelos de Claude existen?", [
    p("Claude 4.X (2025): Opus 4.7 (más capaz, razonamiento complejo), Sonnet 4.6 (balance calidad/velocidad — el que se usa aquí), Haiku 4.5 (rápido y económico para tareas simples)."),
    p("La elección del modelo depende del trade-off entre calidad, velocidad y costo."),
  ]),
  toggle("¿Qué es tool use / function calling?", [
    p("Capacidad del modelo de IA de llamar funciones externas durante su ejecución. En lugar de solo generar texto, el modelo decide cuándo usar una herramienta (leer un archivo, hacer una búsqueda, llamar una API) y procesa el resultado."),
    p("En este proyecto: Claude usó tools de Read, Bash, WebFetch (Notion API), Grep, Edit para construir la app."),
  ]),
  toggle("¿Qué es MCP (Model Context Protocol)?", [
    p("Protocolo de Anthropic para conectar modelos de IA con herramientas y datos externos de forma estandarizada. Los MCP servers exponen capacidades (leer archivos de Figma, consultar Supabase, enviar emails) que el modelo puede usar."),
    p("En este proyecto se usa el MCP de Supabase y Figma."),
  ]),
  toggle("¿Cómo gestionás el contexto de conversaciones largas?", [
    p("Claude Code tiene memoria persistente en archivos y compresión automática de conversaciones largas. La clave es no repetir contexto innecesario, usar archivos de memoria para datos que no cambian, y usar /compact para resumir conversaciones extensas."),
  ]),
];

const arquitecturaContent = [
  callout("🏗️", "Cómo está estructurada la app, por qué cada decisión arquitectónica fue tomada, y cómo fluyen los datos de la DB hasta la UI.", "blue_background"),
  divider(),

  h1("Estructura de carpetas"),
  code(`src/
├── app/                    # Rutas Next.js App Router
│   ├── (auth)/             # Login, Register
│   ├── (coach)/            # Pantallas del coach
│   ├── (client)/           # Pantallas del cliente
│   └── (training)/         # Live training session
│
├── features/               # Lógica de negocio por dominio
│   ├── auth/
│   ├── clients/
│   ├── coach/
│   ├── exercises/
│   ├── plans/
│   └── training/
│
├── lib/                    # Infraestructura compartida
│   ├── supabase/           # Clientes Supabase
│   ├── auth/               # Session, roles
│   └── analytics/          # Compliance, alertas
│
├── components/             # Componentes UI reutilizables
│   └── ui/
│
└── types/                  # Tipos TypeScript
    ├── database.ts         # Auto-generado por Supabase CLI
    └── domain.ts           # Tipos de dominio custom`, "typescript"),
  divider(),

  h1("Feature-based architecture"),
  p("En lugar de organizar por tipo (todos los componentes juntos, todas las actions juntas), LoBoost organiza por dominio de negocio. Todo lo relacionado a 'plans' vive en src/features/plans/."),
  h3("Estructura de cada feature"),
  code(`src/features/plans/
├── schemas.ts              # Zod schemas (validación)
├── types.ts                # TypeScript types del dominio
├── actions/                # Server Actions (mutaciones)
│   ├── create-plan.ts
│   ├── assign-plan.ts
│   └── delete-plan.ts
└── plan-builder-persist.ts # Lógica compleja de negocio`, "typescript"),
  h3("Por qué esta estructura"),
  b("Cohesión: todo lo de un dominio está junto. Si tocás plans, solo abrís src/features/plans/."),
  b("Escalabilidad: agregar un feature nuevo no toca los existentes."),
  b("Testeable: cada feature tiene sus propios tests aislados."),
  divider(),

  h1("Flujo de datos — De la DB a la UI"),
  callout("📊", "Cómo un dato viaja desde PostgreSQL hasta lo que ve el usuario en pantalla.", "purple_background"),
  h3("Flujo de lectura (mostrar datos)"),
  num("Server Component en app/(coach)/coach/clients/page.tsx se renderiza en el servidor."),
  num("Llama a una query function: getClients(coachId)."),
  num("La query usa el cliente Supabase de servidor (con cookies de sesión)."),
  num("Supabase aplica RLS: solo devuelve clientes de ese coach."),
  num("Los datos tipados llegan al componente y se renderizan como HTML."),
  num("El HTML llega al browser ya renderizado — cero JS para mostrar la lista."),
  p(""),
  h3("Flujo de escritura (Server Actions)"),
  num("Usuario llena un form y hace submit."),
  num("Next.js intercepta el submit y llama al Server Action (función marcada con 'use server')."),
  num("El Action valida los datos con Zod."),
  num("Si válido: ejecuta la mutación en Supabase."),
  num("Revalida el cache de Next.js (revalidatePath)."),
  num("La página se re-renderiza con los nuevos datos."),
  p(""),
  h3("Cuándo se usa 'use client'"),
  b("Formularios con estado local (useState para campos controlados)."),
  b("Componentes interactivos: tabs, modals, toggles."),
  b("Animaciones, drag & drop."),
  b("El Live Training es 'use client' porque maneja estado complejo en tiempo real."),
  divider(),

  h1("Invariantes de dominio (reglas de negocio irrompibles)"),
  callout("⚠️", "Estas reglas NO pueden violarse bajo ninguna circunstancia. Están codificadas en las actions y validaciones.", "red_background"),
  b("plans son templates del coach. client_plans son copias asignadas a clientes.", true),
  b("assignPlan() siempre crea una copia completa de la estructura. Nunca guarda una referencia mutable al template.", true),
  b("Esto permite que el coach edite el template sin romper los planes ya asignados a clientes.", true),
  b("Ejercicios de tipo 'strength': requieren reps_min. NO pueden tener duration_seconds."),
  b("Ejercicios de tipo 'cardio': requieren duration_seconds. NO pueden tener reps."),
  b("reps_max siempre debe ser >= reps_min (constraint en DB)."),
  b("Un cliente solo puede tener un plan con status 'active' a la vez."),
  divider(),

  h1("Middleware y autenticación"),
  p("src/lib/supabase/middleware.ts se ejecuta en cada request. Refresca el token de sesión automáticamente y redirige a /login si el usuario no está autenticado en rutas protegidas."),
  p("El rol del usuario (coach/client) se guarda en la tabla profiles.role y determina a qué rutas tiene acceso."),
  divider(),

  h1("RLS — Row Level Security en detalle"),
  p("Cada tabla tiene policies que se evalúan automáticamente en cada query. Ejemplos reales de LoBoost:"),
  toggle("Coach solo ve sus propios clientes", [
    code(`CREATE POLICY "coach_sees_own_clients" ON profiles
FOR SELECT USING (
  auth.uid() = coach_id  -- el coach_id del cliente debe ser el usuario actual
);`, "sql"),
  ]),
  toggle("Cliente solo ve sus propias sesiones", [
    code(`CREATE POLICY "client_sees_own_sessions" ON sessions
FOR SELECT USING (
  auth.uid() = client_id
);`, "sql"),
  ]),
  toggle("Coach puede leer sesiones de sus clientes", [
    code(`CREATE POLICY "coach_reads_client_sessions" ON sessions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = sessions.client_id
    AND profiles.coach_id = auth.uid()
  )
);`, "sql"),
  ]),
];

const modeloDatosContent = [
  callout("🗄️", "Todas las tablas de la base de datos, qué guarda cada una, cómo se relacionan y las decisiones detrás del diseño.", "blue_background"),
  divider(),

  h1("Diagrama de relaciones"),
  code(`auth.users (Supabase Auth)
    └── profiles (id = auth.uid, role, coach_id)
         └── client_profiles (datos físicos del cliente)
         └── exercises (biblioteca del coach)
         └── plans (templates del coach)
              └── plan_weeks
                   └── plan_days
                        └── plan_day_exercises → exercises
         └── client_plans (plan asignado a cliente)
              └── client_plan_days
                   └── client_plan_day_exercises → exercises
                        └── session_sets
              └── sessions (cada entreno completado)
         └── body_measurements
         └── coach_notes
         └── notification_preferences`, "plain text"),
  divider(),

  h1("Tablas — Detalle completo"),

  toggle("profiles — Hub central de usuarios", [
    p("Extiende auth.users de Supabase. Cada usuario (coach o cliente) tiene un registro aquí."),
    code(`id          uuid PK   → FK a auth.users
role        text      → 'coach' | 'client'
full_name   text
avatar_url  text
coach_id    uuid FK   → profiles(id) — NULL si es coach, apunta al coach si es cliente
created_at  timestamptz`, "plain text"),
    p("Relación self-referencial: un cliente tiene coach_id apuntando al coach. El coach tiene coach_id = NULL."),
  ]),

  toggle("client_profiles — Datos físicos del cliente", [
    p("ONE-TO-ONE con profiles. Solo existe para clientes. Guarda datos de onboarding."),
    code(`id               uuid PK FK → profiles(id)
age              integer
sex              text      → 'male' | 'female' | 'other'
goal             text
weight_kg        numeric(5,2)
height_cm        numeric(5,2)
experience_level text      → 'beginner' | 'intermediate' | 'advanced'
days_per_week    integer   → 1-7
injuries         text`, "plain text"),
  ]),

  toggle("exercises — Biblioteca de ejercicios del coach", [
    code(`id           uuid PK
coach_id     uuid FK → profiles(id)
name         text NOT NULL
muscle_group text
type         text → 'strength' | 'cardio'
video_url    text nullable
created_at   timestamptz`, "plain text"),
    p("Cada coach tiene su propia biblioteca. Un ejercicio de coach A no es visible para coach B."),
  ]),

  toggle("plans → plan_weeks → plan_days → plan_day_exercises", [
    p("Jerarquía del template de plan:"),
    code(`plans: id, coach_id, name, description, weeks (cantidad total)
  plan_weeks: id, plan_id, week_number, week_type ('normal'|'deload'|'peak'|'test')
    plan_days: id, plan_week_id, day_of_week (1-7)
      plan_day_exercises: exercise_id, order, sets, reps_min, reps_max, duration_seconds, rest_seconds`, "plain text"),
    p("Decisión clave: plan_weeks independientes (en lugar de repetir la misma estructura cada semana) permiten que cada semana tenga ejercicios, volumen y tipos distintos. Fundamental para periodización real."),
  ]),

  toggle("client_plans → client_plan_days → client_plan_day_exercises", [
    p("Copia exacta de la jerarquía del plan, pero asignada a un cliente específico."),
    code(`client_plans: id, client_id, coach_id, plan_id(ref original), name, weeks, start_date, end_date, status
  client_plan_days: id, client_plan_id, week_number, day_of_week
    client_plan_day_exercises: exercise_id, sets, reps_min, reps_max, duration_seconds`, "plain text"),
    p("Por qué una copia y no una referencia: si el coach modifica el plan template después, no afecta al cliente que ya empezó. Cada asignación es inmutable desde el punto de vista del cliente."),
  ]),

  toggle("sessions + session_sets — El log de cada entreno", [
    code(`sessions:
  id, client_id, client_plan_day_id
  date, status ('in_progress'|'completed')
  started_at, completed_at
  rpe (1-10), notes

session_sets:
  id, session_id, client_plan_day_exercise_id
  set_number, weight_kg, reps_performed
  duration_seconds, completed (bool)
  logged_at
  UNIQUE(session_id, exercise_id, set_number)`, "plain text"),
    p("Por cada sesión hay N session_sets (uno por cada set de cada ejercicio). El constraint UNIQUE evita duplicados si el cliente hace doble submit."),
  ]),

  toggle("body_measurements — Historial de peso/medidas", [
    code(`id, client_id, date, weight_kg, notes, created_at`, "plain text"),
    p("Simple pero extensible. Hoy solo tiene peso. Falta: circunferencias, % graso."),
  ]),

  toggle("coach_notes — Notas privadas del coach sobre el cliente", [
    code(`id, coach_id, client_id, content, created_at, updated_at`, "plain text"),
    p("Solo el coach que las creó puede verlas. El cliente no tiene acceso."),
  ]),

  divider(),

  h1("Decisiones de diseño importantes"),
  b("reps_min y reps_max en lugar de un solo 'reps': permite definir rangos (8-10) que son más reales en el entrenamiento de fuerza.", true),
  b("week_type en plan_weeks: distingue semanas normales de deload (descarga), peak (pico de intensidad) y test (testeo de 1RM). Fundamental para periodización.", true),
  b("plan_id nullable en client_plans: permite crear planes de cliente sin template (asignación manual directa, no implementada aún).", true),
  b("UNIQUE constraint en session_sets: idempotencia. Múltiples submissions del mismo set no crean duplicados.", true),
  divider(),

  h1("Migraciones — Historia del schema"),
  toggle("20260408 — Init", [p("Tabla profiles + trigger handle_new_user() que crea perfil automáticamente cuando se registra un usuario en auth.")]),
  toggle("20260409 — Fase 2", [p("Todas las tablas principales: exercises, plans, plan_days, sessions, session_sets, client_plans, body_measurements, coach_notes + todas las RLS policies.")]),
  toggle("20260420 — Plan weeks refactor", [p("Nueva tabla plan_weeks. Migra plan_days existentes. Fundamental para multi-semana real.")]),
  toggle("20260420 — Reps range", [p("Cambia columna reps → (reps_min, reps_max). Migra datos existentes.")]),
  toggle("20260420 — Session tracking", [p("Agrega rpe y notes a sessions. Agrega reps_performed a session_sets.")]),
];

const historiaContent = [
  callout("📖", "Cómo nació y evolucionó LoBoost: decisiones, fases y qué se aprendió en cada etapa.", "blue_background"),
  divider(),

  h1("El punto de partida"),
  p("LoBoost empezó con una visión clara: una plataforma de coaching fitness profesional, mobile-first, para coaches que gestionan múltiples clientes. La idea central es que el coach crea planes de entrenamiento y los asigna a clientes, los clientes los ejecutan y el coach monitorea el progreso."),
  p("Stack elegido desde el inicio: Next.js App Router + TypeScript + Supabase. Razones: full-stack con un solo lenguaje, auth y DB integrados en Supabase, deploy simple en Vercel."),
  divider(),

  h1("Fase 1 — Setup inicial"),
  h3("Qué se hizo"),
  b("Inicialización del proyecto Next.js con App Router y TypeScript."),
  b("Conexión con Supabase: credenciales, cliente SSR/CSR/admin."),
  b("Schema inicial de DB: tabla profiles + trigger handle_new_user()."),
  b("Sistema de autenticación: login, register, logout con redirección por rol."),
  b("Middleware para proteger rutas y refrescar tokens."),
  b("Estructura base de carpetas: app/, features/, lib/, components/, types/."),
  h3("Decisiones tomadas"),
  b("App Router desde el inicio — no Pages Router. Apuesta por el futuro de Next.js."),
  b("Separación de cliente Supabase en server.ts / client.ts / admin.ts desde día 1."),
  b("Roles en profiles.role ('coach' | 'client') en lugar de tablas separadas — suficiente para este dominio."),
  divider(),

  h1("Fase 2 / Plan A — Backend completo"),
  h3("Qué se hizo"),
  b("Todas las tablas de DB: exercises, plans, plan_days, client_plans, sessions, session_sets, body_measurements, coach_notes."),
  b("RLS policies para todas las tablas."),
  b("Zod schemas para todos los dominios."),
  b("Server Actions para todas las mutaciones (CRUD de exercises, plans, clients, sessions)."),
  b("assignPlan(): la acción más crítica. Copia toda la estructura del plan al cliente."),
  b("Tipos TypeScript generados desde Supabase CLI + tipos de dominio custom."),
  h3("Decisiones importantes"),
  callout("💡", "assignPlan crea una copia completa en lugar de una referencia. Decisión arquitectónica que evita problemas de consistencia a futuro.", "yellow_background"),
  b("Validaciones en plan-builder-persist.ts: strength → reps required, cardio → duration required. Lógica de negocio explícita."),
  b("service role solo donde es necesario (logBodyMeasurement para bypass de RLS por necesidad operativa)."),
  divider(),

  h1("Plan B — UI multi-semana + Live Training + Progreso"),
  h3("Qué se hizo"),
  b("Refactor del plan builder: tabs por semana, tipos de semana (normal/deload/peak/test), copiar semana anterior."),
  b("Migración de plan_days a plan_weeks independientes: cada semana puede tener estructura diferente."),
  b("Migración reps → reps_min/reps_max: soporte para rangos de repeticiones."),
  b("Live Training del cliente: UI interactiva para loguear sets, peso, reps en tiempo real."),
  b("Modal RPE (1-10) al completar sesión + notas."),
  b("Historial semanal con reps_performed por set."),
  b("Vista /client/progress con PRs por ejercicio y gráfico de mediciones corporales."),
  h3("Desafíos técnicos resueltos"),
  toggle("Plan weeks refactor sin romper datos existentes", [
    p("El schema original tenía plan_days con week_number como columna simple. Para hacerlo independiente se creó la tabla plan_weeks y se migró el dato existente en una sola migración sin pérdida de datos."),
  ]),
  toggle("TypeScript con reps_min/reps_max", [
    p("El cambio de columna reps a reps_min/reps_max requirió actualizar: la migración SQL, el schema de Supabase, los tipos generados, los Zod schemas, las actions, los queries y los componentes de UI. Proceso sistemático, sin errores de tipo al final."),
  ]),
  toggle("Live Training — estado complejo", [
    p("El componente live-training.tsx tiene 1072 líneas. Maneja: ejercicios del día, estado de cada set, persistencia optimista, edición de peso, modal RPE. Toda la lógica de estado en un Client Component con Server Actions para persistir."),
  ]),
  divider(),

  h1("Herramientas de desarrollo usadas"),
  b("Claude Code (CLI) — pair programmer IA para todo el desarrollo."),
  b("Supabase CLI — migraciones, generación de tipos TypeScript."),
  b("Git — control de versiones. Cada feature en commits descriptivos."),
  b("VS Code — editor principal con extensión de Claude Code."),
  b("Supabase Studio — UI web para inspeccionar DB, testear queries, revisar RLS."),
  divider(),

  h1("Commits clave — Timeline del proyecto"),
  toggle("e3a9654 — feat(training): persist RPE and notes on session completion", [
    p("Agrega campos rpe y notes a la tabla sessions. Implementa el modal de RPE en live-training.tsx. Primera vez que el cliente puede registrar sensación de esfuerzo percibido."),
  ]),
  toggle("5e5872f — fix: resolve all TypeScript errors from reps_min/max migration", [
    p("Después del refactor de reps_min/reps_max, había errores de TypeScript en toda la app. Este commit los resuelve sistemáticamente actualizando todos los tipos y referencias."),
  ]),
  toggle("6358035 — feat(builder): multi-week plan builder", [
    p("El plan builder ahora soporta múltiples semanas con tabs, tipos de semana y copiar semana anterior. Commit grande, resultado de varios ciclos de brainstorming → spec → implementación."),
  ]),
  toggle("06374b1 — feat(client): add progress view with PRs and body measurement history", [
    p("Vista /client/progress con personal records por ejercicio y gráfico de evolución de peso corporal."),
  ]),
  toggle("7394729 — fix(types): add repsPerformed to WeekDetailSet and history query", [
    p("Fix de tipos para mostrar correctamente las reps realizadas en el historial semanal del cliente."),
  ]),
];

const auditContent = [
  callout("📋", "Auditoría funcional completa del producto al 2026-04-21. Estado actual, problemas detectados, benchmark y roadmap.", "orange_background"),
  p("Este documento fue generado mediante un análisis exhaustivo del codebase completo (src/, supabase/migrations/, types/, features/) comparado contra las mejores plataformas de coaching actuales."),
  divider(),

  h1("A. Resumen Ejecutivo"),
  callout("🎯", "Estado: ~65–70% completo. Base técnica sólida. Huecos de producto críticos que deben resolverse antes de seguir con UI.", "yellow_background"),
  b("El flujo del cliente (entrenar, ver progreso) está más completo que el del coach."),
  b("El coach puede crear y asignar planes, pero NO puede editarlos ni ver el detalle de los entrenos de sus clientes."),
  b("La data clave (RPE, notas, pesos) se guarda correctamente pero no se muestra al coach."),
  p(""),
  h3("Problemas críticos"),
  callout("🔴", "El plan template no se puede editar — updatePlanFullAction es un TODO vacío.", "red_background"),
  callout("🔴", "El coach no puede ver RPE ni detalle de sesiones de sus clientes.", "red_background"),
  callout("🔴", "El plan asignado al cliente no se puede ajustar — updateClientPlanAction es un TODO vacío.", "red_background"),
  divider(),

  h1("B. Lo que ya está bien"),
  b("✅ Modelo de datos: limpio, normalizado, plan_weeks independientes fue la decisión correcta."),
  b("✅ Live Training: iniciar → loguear sets → completar con RPE/notas funciona."),
  b("✅ assignPlan con copia completa: arquitectónicamente correcto."),
  b("✅ Analytics de compliance: calculateWeeklyCompliance, alertas, estados (al_día/atención/crítico)."),
  b("✅ Plan builder multi-semana con tipos de semana."),
  b("✅ reps_min/reps_max: soportar rangos es mejor que la mayoría de competidores."),
  divider(),

  h1("C. Problemas Detectados"),
  toggle("🔴 Críticos", [
    b("Plan template no editable (updatePlanFullAction vacío)"),
    b("Client plan no ajustable (updateClientPlanAction vacío)"),
    b("Coach no ve sesiones completas del cliente (data existe, UI no)"),
    b("Coach no puede editar datos del cliente (action existe, UI no)"),
  ]),
  toggle("🟡 Altos", [
    b("No hay instrucciones/cues por ejercicio visibles durante el entreno"),
    b("No hay UI para agregar mediciones corporales"),
    b("Heatmap del coach no es clickeable para ver detalle de sesión"),
    b("Cliente sin plan activo: app no guía hacia ninguna acción"),
    b("weekly-load existe como demo sin datos reales"),
  ]),
  toggle("🟢 Medios", [
    b("Nutrición: placeholder total, sin backing"),
    b("Notificaciones: saveNotificationPrefsAction no implementada"),
    b("Coach settings: placeholder vacío"),
    b("Video player: TODO en video-modal.tsx"),
  ]),
  divider(),

  h1("D. Benchmark — Competidores"),
  p("TrueCoach, TrainHeroic, Trainerize, Everfit tienen:"),
  num("Edición de plan en vivo (sin reasignar todo)"),
  num("Feedback del coach por sesión completada"),
  num("Comunicación directa in-app coach ↔ cliente"),
  num("Check-ins estructurados semanales del cliente"),
  num("Progresión automática de carga sugerida"),
  num("Biblioteca base de ejercicios compartida"),
  num("Instrucciones + video por ejercicio durante el entreno"),
  num("Vista completa del coach de cada sesión"),
  num("Resumen semanal automático"),
  num("Gráfico de evolución de peso por ejercicio"),
  p(""),
  h3("Ventajas de LoBoost sobre competidores"),
  b("✅ Multi-week con tipos de semana (deload/peak/test) — muchos no lo tienen"),
  b("✅ Rangos de reps (8-10) — la mayoría usa valor fijo"),
  b("✅ Arquitectura técnica más limpia y escalable"),
  divider(),

  h1("E. Decisiones Pendientes de Producto"),
  callout("❓", "¿Cómo avanza la semana del plan? ¿Por fecha calendario fijo o por semanas completadas?", "gray_background"),
  callout("❓", "¿Qué pasa si el cliente no entrena en el día asignado? ¿Se puede mover la sesión?", "gray_background"),
  callout("❓", "¿Qué pasa cuando el plan llega a end_date? ¿Status automático a 'completed'?", "gray_background"),
  callout("❓", "¿La edición del template afecta clientes que ya tienen ese plan asignado?", "gray_background"),
  callout("❓", "¿Puede el cliente modificar su propio plan?", "gray_background"),
];

const roadmapContent = [
  callout("🗺️", "Fases de desarrollo ordenadas por prioridad. Las fases 1 y 2 son funcionales — sin ellas la app no sirve para uso real. Las fases 3 y 4 son de valor añadido.", "blue_background"),
  divider(),

  h1("Fase 1 — Corregir base funcional"),
  callout("🔴", "BLOQUEANTE. Sin esto el coach no puede trabajar profesionalmente con la app.", "red_background"),
  todo("1. Implementar edición de plan template (updatePlanFullAction)"),
  todo("2. Implementar ajuste de plan de cliente (updateClientPlanAction)"),
  todo("3. Pantalla: coach ve sesiones completas del cliente (sets, pesos, RPE, notas)"),
  todo("4. UI para agregar mediciones corporales desde perfil del cliente"),
  todo("5. UI para editar perfil del cliente desde /coach/clients/[id]"),
  divider(),

  h1("Fase 2 — Completar flujos clave"),
  callout("🟡", "Sin esto la app funciona pero le faltan features de valor real para el coach.", "orange_background"),
  todo("6. Instructions/cues en ejercicios — el coach escribe, el cliente ve durante el entreno"),
  todo("7. Coach ve RPE en dashboard — indicador por cliente"),
  todo("8. Check-ins del cliente — formulario semanal (energía, sueño, peso)"),
  todo("9. Notificaciones funcionales — implementar saveNotificationPrefsAction"),
  todo("10. Biblioteca base de ejercicios compartida"),
  divider(),

  h1("Fase 3 — Robustecer seguimiento y métricas"),
  callout("🟢", "Features que diferencian la app y la acercan a los mejores del mercado.", "green_background"),
  todo("11. Gráfico de progreso por ejercicio — evolución de peso máximo en timeline"),
  todo("12. Volumen semanal real — tonelaje con datos reales en weekly-load"),
  todo("13. Mensajería básica — canal coach ↔ cliente dentro de la app"),
  todo("14. Sugerencia de progresión de carga automática"),
  todo("15. Resumen semanal — notificación/mail al coach"),
  divider(),

  h1("Fase 4 — Pulido visual (ÚLTIMO)"),
  callout("🔵", "Recién cuando la funcionalidad esté completa se pule la UI a fondo.", "blue_background"),
  todo("16. Refinar dashboard del coach"),
  todo("17. Onboarding del cliente sin plan activo"),
  todo("18. Animaciones y transiciones en LiveTraining"),
  todo("19. Modo oscuro completo / theming"),
  todo("20. PWA manifest, app icon, splash screen"),
  divider(),

  h1("Tareas concretas de Backend"),
  toggle("🔴 Crítico", [
    b("src/features/plans/actions/update-plan-full.ts — reemplazar árbol plan_weeks/days/exercises"),
    b("src/features/plans/actions/update-client-plan.ts — modificar exercises del plan de un cliente"),
    b("src/features/coach/queries.ts (nueva) — getClientSessionHistory con sets, pesos, RPE"),
  ]),
  toggle("🟡 Alto", [
    b("supabase/migrations — agregar columna instructions text a exercises"),
    b("supabase/migrations — nueva tabla check_ins"),
    b("supabase/migrations — nueva tabla messages"),
  ]),
  divider(),

  h1("Tareas concretas de Frontend"),
  toggle("🔴 Crítico", [
    b("plan-builder-form.tsx — modo edit: cargar estructura existente y permitir modificar"),
    b("Nueva página /coach/clients/[id]/sessions — lista de sesiones con detalle expandible"),
  ]),
  toggle("🟡 Alto", [
    b("Form agregar body measurement desde /coach/clients/[id]"),
    b("Form editar perfil del cliente desde /coach/clients/[id]"),
    b("coach-weekly-heatmap.tsx — click en celda → ver detalle de sesión"),
    b("live-training.tsx — mostrar instructions del ejercicio si existen"),
  ]),
];

const glosarioContent = [
  callout("💡", "Conceptos técnicos explicados de forma clara. De menos a más técnico.", "blue_background"),
  divider(),

  h1("Conceptos de Frontend"),
  toggle("React", [p("Librería JavaScript para construir interfaces de usuario. La idea central es dividir la UI en componentes reutilizables. LoBoost está construido sobre React (vía Next.js).")]),
  toggle("Next.js", [p("Framework sobre React que agrega routing, server-side rendering, optimizaciones de performance y convenciones de proyecto. LoBoost usa Next.js 14 con App Router.")]),
  toggle("Server Component", [p("Componente de React que se ejecuta y renderiza en el servidor. No puede usar hooks de estado ni efectos. Puede hacer fetch de DB directamente. Es el default en Next.js App Router.")]),
  toggle("Client Component", [p("Componente de React que se ejecuta en el browser. Puede usar useState, useEffect, event listeners. Se declara con 'use client' al inicio del archivo.")]),
  toggle("Server Action", [p("Función async marcada con 'use server' que se ejecuta en el servidor cuando se llama desde el cliente. Permite hacer mutaciones de DB sin escribir una API REST. La alternativa moderna a los endpoints de API.")]),
  toggle("Hydration", [p("El proceso de 'activar' el HTML estático del servidor en el browser, adjuntando event listeners y estado de React. Costo de performance. Server Components no se hidratan.")]),
  toggle("TypeScript", [p("Superset de JavaScript que agrega tipado estático. El tipo de cada variable, parámetro y retorno de función está declarado. Los errores de tipo se detectan al escribir, no al ejecutar.")]),
  toggle("Zod", [p("Librería de validación de schemas en TypeScript. Definís la forma esperada de los datos y Zod verifica en runtime si se cumple, devolviendo errores descriptivos si no.")]),

  divider(),
  h1("Conceptos de Backend / DB"),
  toggle("PostgreSQL", [p("Base de datos relacional. Organiza datos en tablas con filas y columnas. Soporta relaciones entre tablas (foreign keys), transacciones, índices, y queries complejas con SQL.")]),
  toggle("Supabase", [p("Plataforma que ofrece PostgreSQL + Auth + Storage + APIs generadas automáticamente. El 'Firebase de código abierto'. LoBoost usa Supabase como backend completo.")]),
  toggle("RLS (Row Level Security)", [p("Mecanismo de PostgreSQL que define quién puede leer/escribir cada fila de una tabla. Las políticas se evalúan automáticamente en cada query. Capa de seguridad a nivel de DB, independiente de la lógica de la app.")]),
  toggle("Migración", [p("Archivo SQL versionado que describe un cambio en el schema de la DB. Se aplican en orden. Permiten evolucionar la DB de forma controlada y reproducible.")]),
  toggle("Foreign Key", [p("Columna que referencia la clave primaria de otra tabla. Establece una relación entre tablas. Ej: sessions.client_id → profiles.id.")]),
  toggle("UUID", [p("Identificador único universal. String de 36 caracteres como '349615fe-a76c-8007-b109-cdf4f65d4cd3'. Se usa como PK en todas las tablas de LoBoost.")]),
  toggle("Upsert", [p("Operación de DB que inserta un registro si no existe, o actualiza si ya existe. LoBoost usa upsert en complete-set.ts para evitar duplicados.")]),

  divider(),
  h1("Conceptos de IA"),
  toggle("LLM (Large Language Model)", [p("Modelo de IA entrenado en grandes cantidades de texto. Genera texto prediciendo el token siguiente. Claude, GPT-4, Gemini son LLMs.")]),
  toggle("Token", [p("Unidad de texto que el modelo procesa. Aproximadamente 1 token = 0.75 palabras en español. Los modelos tienen límites de contexto (tokens máximos en una conversación) y cobran por tokens procesados.")]),
  toggle("Prompt engineering", [p("El arte de escribir instrucciones efectivas para un LLM. Incluye: dar contexto, ser específico, proporcionar ejemplos, definir formato de respuesta, iterar.")]),
  toggle("Context window", [p("La cantidad máxima de tokens que el modelo puede procesar en una conversación. Claude Sonnet 4.6 tiene 200K tokens de contexto. Cuando se llena, las conversaciones antiguas se comprimen.")]),
  toggle("Tool use / Function calling", [p("Capacidad del LLM de llamar funciones externas durante su ejecución. En lugar de solo generar texto, decide cuándo usar una herramienta y procesa el resultado.")]),
  toggle("Agent", [p("Sistema de IA que puede ejecutar acciones en el mundo real: leer/escribir archivos, llamar APIs, ejecutar código, tomar decisiones basadas en resultados intermedios. Claude Code es un agente.")]),
  toggle("Multi-agent", [p("Arquitectura donde múltiples agentes colaboran, cada uno especializado en una tarea. Uno puede explorar el codebase, otro implementar, otro revisar. Permite paralelismo y especialización.")]),
  toggle("RAG (Retrieval Augmented Generation)", [p("Técnica donde el LLM busca información relevante en una base de conocimiento antes de generar la respuesta. Útil para dar contexto específico del proyecto sin que esté en el prompt base.")]),
  toggle("MCP (Model Context Protocol)", [p("Protocolo de Anthropic para conectar modelos con herramientas externas de forma estandarizada. Los MCP servers exponen capacidades (Figma, Supabase, Gmail) que el modelo puede usar.")]),
  toggle("Prompt caching", [p("Técnica de Anthropic que guarda en caché partes del prompt que no cambian entre llamadas. Reduce costo y latencia. Importante para aplicaciones con prompts de sistema largos.")]),

  divider(),
  h1("Conceptos de arquitectura"),
  toggle("Feature-based architecture", [p("Organizar el código por dominio de negocio (plans/, clients/) en lugar de por tipo técnico (components/, utils/). Mejor cohesión y escalabilidad.")]),
  toggle("Separation of concerns", [p("Cada módulo tiene una responsabilidad clara. En LoBoost: schemas.ts valida, actions/ muta, queries/ lee, components/ renderiza. No mezclar responsabilidades.")]),
  toggle("Invariante de dominio", [p("Regla de negocio que nunca puede violarse. Ej: 'assignPlan siempre crea una copia completa'. Se codifica en la lógica de la app, no solo en la DB.")]),
  toggle("Idempotencia", [p("Una operación es idempotente si ejecutarla múltiples veces tiene el mismo resultado que ejecutarla una vez. El upsert en session_sets es idempotente: si el cliente completa el mismo set dos veces, el resultado es el mismo.")]),
];

// ══════════════════════════════════════════════════════════════════
// MAIN — Ejecutar todo
// ══════════════════════════════════════════════════════════════════

async function main() {
  console.log("🚀 Construyendo Cuaderno Maestro en Notion...\n");

  // 1. Limpiar página existente
  console.log("🧹 Limpiando página existente...");
  await clearPage(PAGE_ID);

  // 2. Actualizar hub principal
  await notion("PATCH", `/pages/${PAGE_ID}`, {
    icon: { type: "emoji", emoji: "📓" },
    cover: {
      type: "external",
      external: { url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1500" },
    },
    properties: {
      title: { title: [{ type: "text", text: { content: "LoBoost — Cuaderno Maestro de Aprendizaje" } }] },
    },
  });

  // 3. Hub content
  await append(PAGE_ID, [
    callout("👋", "Todo lo que necesitás saber sobre cómo se construyó LoBoost: stack, arquitectura, IA, base de datos, historia del desarrollo y roadmap. Actualizado continuamente.", "blue_background"),
    divider(),
    h2("📚 Contenido"),
    b("🛠️ Stack & Herramientas — Next.js, TypeScript, Supabase, Zod y por qué se eligió cada uno"),
    b("🤖 Claude Code & AI Engineering — Cómo usé IA, agentes, skills, memoria y qué preguntan en entrevistas"),
    b("🏗️ Arquitectura de la App — App Router, Server Components, Server Actions, estructura de carpetas"),
    b("🗄️ Modelo de Datos — Todas las tablas, relaciones, RLS, migraciones"),
    b("📖 Historia del Desarrollo — Fases del proyecto de inicio a hoy"),
    b("📋 Auditoría Funcional — Estado actual, problemas detectados, benchmark contra competidores"),
    b("🗺️ Roadmap — Lo que falta, en qué orden y por qué"),
    b("💡 Glosario — Conceptos técnicos explicados claro, de menos a más técnico"),
    divider(),
    callout("🔄", "Este cuaderno se actualiza a medida que el proyecto avanza. Cada nueva feature, decisión o aprendizaje se agrega aquí.", "green_background"),
  ]);

  console.log("✅ Hub principal configurado\n🏗️ Creando subpáginas...\n");

  // 4. Crear subpáginas
  await createSubpage(PAGE_ID, "🛠️", "Stack & Herramientas", stackContent);
  await createSubpage(PAGE_ID, "🤖", "Claude Code & AI Engineering", claudeContent);
  await createSubpage(PAGE_ID, "🏗️", "Arquitectura de la App", arquitecturaContent);
  await createSubpage(PAGE_ID, "🗄️", "Modelo de Datos", modeloDatosContent);
  await createSubpage(PAGE_ID, "📖", "Historia del Desarrollo", historiaContent);
  await createSubpage(PAGE_ID, "📋", "Auditoría Funcional", auditContent);
  await createSubpage(PAGE_ID, "🗺️", "Roadmap", roadmapContent);
  await createSubpage(PAGE_ID, "💡", "Glosario de Conceptos", glosarioContent);

  console.log(`\n✅ Cuaderno Maestro creado!`);
  console.log(`🔗 https://www.notion.so/${PAGE_ID.replace(/-/g, "")}`);
}

main().catch(console.error);
