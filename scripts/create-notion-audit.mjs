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
  if (!res.ok) {
    console.error("Error:", JSON.stringify(data, null, 2));
    throw new Error(`Notion API error: ${res.status}`);
  }
  return data;
}

const t = (content, bold = false, color = "default") => ({
  type: "text",
  text: { content },
  annotations: { bold, color },
});

const h1 = (content, color = "default") => ({
  object: "block",
  type: "heading_1",
  heading_1: { rich_text: [t(content)], color },
});

const h2 = (content) => ({
  object: "block",
  type: "heading_2",
  heading_2: { rich_text: [t(content)] },
});

const h3 = (content) => ({
  object: "block",
  type: "heading_3",
  heading_3: { rich_text: [t(content)] },
});

const p = (content) => ({
  object: "block",
  type: "paragraph",
  paragraph: { rich_text: [t(content)] },
});

const pRich = (parts) => ({
  object: "block",
  type: "paragraph",
  paragraph: { rich_text: parts },
});

const bullet = (content, bold = false) => ({
  object: "block",
  type: "bulleted_list_item",
  bulleted_list_item: { rich_text: [t(content, bold)] },
});

const bulletRich = (parts) => ({
  object: "block",
  type: "bulleted_list_item",
  bulleted_list_item: { rich_text: parts },
});

const todo = (content, checked = false) => ({
  object: "block",
  type: "to_do",
  to_do: { rich_text: [t(content)], checked },
});

const callout = (emoji, content, color = "gray_background") => ({
  object: "block",
  type: "callout",
  callout: {
    rich_text: [t(content)],
    icon: { type: "emoji", emoji },
    color,
  },
});

const calloutRich = (emoji, parts, color = "gray_background") => ({
  object: "block",
  type: "callout",
  callout: {
    rich_text: parts,
    icon: { type: "emoji", emoji },
    color,
  },
});

const divider = () => ({ object: "block", type: "divider", divider: {} });

const quote = (content) => ({
  object: "block",
  type: "quote",
  quote: { rich_text: [t(content)] },
});

const numbered = (content) => ({
  object: "block",
  type: "numbered_list_item",
  numbered_list_item: { rich_text: [t(content)] },
});

const toggle = (title, children) => ({
  object: "block",
  type: "toggle",
  toggle: {
    rich_text: [t(title, true)],
    children,
  },
});

async function appendBlocks(blockId, blocks) {
  // Notion limit: 100 blocks per request
  for (let i = 0; i < blocks.length; i += 100) {
    const chunk = blocks.slice(i, i + 100);
    await notion("PATCH", `/blocks/${blockId}/children`, { children: chunk });
  }
}

async function main() {
  console.log("🚀 Creando página LoBoost Auditoría en Notion...");

  // 1. Update page title + icon
  await notion("PATCH", `/pages/${PAGE_ID}`, {
    icon: { type: "emoji", emoji: "🏋️" },
    cover: {
      type: "external",
      external: {
        url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200",
      },
    },
    properties: {
      title: {
        title: [{ type: "text", text: { content: "LoBoost — Auditoría Funcional del Producto" } }],
      },
    },
  });
  console.log("✅ Título e ícono actualizados");

  // 2. Main content blocks
  const blocks = [
    // Header callout
    callout(
      "📋",
      "Auditoría funcional completa del producto. Estado actual, problemas detectados, benchmark contra competidores y roadmap de implementación. Actualizado: 2026-04-21.",
      "blue_background"
    ),
    divider(),

    // ─── A. RESUMEN EJECUTIVO ───
    h1("A. Resumen Ejecutivo"),
    callout(
      "🎯",
      "Estado general: ~65–70% de una plataforma de coaching funcional. La base técnica es sólida pero hay huecos de producto importantes que deben resolverse antes de seguir con UI.",
      "yellow_background"
    ),
    p(""),
    h3("Situación actual"),
    bullet("Stack: Next.js App Router + TypeScript + Supabase + Zod. Arquitectura limpia y escalable.", true),
    bullet("El flujo del cliente (entrenar, ver progreso) está más completo que el del coach."),
    bullet("El coach puede crear y asignar planes, pero no puede editarlos ni ver el detalle de los entrenos de sus clientes."),
    bullet("La data clave (RPE, notas, pesos) se guarda correctamente pero no se muestra al coach desde ninguna pantalla."),
    p(""),
    h3("Principales problemas hoy"),
    callout("🔴", "CRÍTICO — El plan template no se puede editar. updatePlanFullAction es un TODO vacío.", "red_background"),
    callout("🔴", "CRÍTICO — El coach no puede ver el RPE ni el detalle de los entrenos de sus clientes.", "red_background"),
    callout("🔴", "CRÍTICO — El plan asignado al cliente no se puede ajustar. updateClientPlanAction es un TODO vacío.", "red_background"),
    callout("🟡", "ALTO — No hay UI para agregar mediciones corporales ni editar perfil del cliente.", "orange_background"),
    callout("🟡", "ALTO — El cliente no ve instrucciones ni cues por ejercicio durante el entreno.", "orange_background"),
    p(""),
    h3("¿Cuán cerca está de ser usable en producción?"),
    quote("Con 4–6 semanas de trabajo focalizado puede estar en beta real con usuarios reales."),
    divider(),

    // ─── B. LO QUE YA ESTÁ BIEN ───
    h1("B. Lo que ya está bien"),
    bullet("✅ Modelo de datos: limpio, normalizado, bien pensado. El refactor a plan_weeks independientes fue la decisión correcta.", true),
    bullet("✅ Live Training del cliente: iniciar sesión → loguear sets → completar con RPE/notas funciona bien. Es el corazón del producto."),
    bullet("✅ assignPlan con copia completa: copiar la estructura al asignar (no referenciar el template) es arquitectónicamente correcto."),
    bullet("✅ Analytics de compliance: calculateWeeklyCompliance, alertas de cliente y estados (al_día/atención/crítico) son buen esqueleto."),
    bullet("✅ Plan builder multi-semana: tabs de semana + tipos (normal/deload/peak/test) + copiar semana anterior son features reales de valor."),
    bullet("✅ reps_min/reps_max: soportar rangos de reps (8–10) es algo que varios competidores no tienen."),
    bullet("✅ Estructura de features por dominio: src/features/auth, clients, coach, exercises, plans, training — separación limpia."),
    divider(),

    // ─── C. PROBLEMAS ───
    h1("C. Problemas e Incompletitudes"),

    toggle("📊 Modelo de datos", [
      bulletRich([t("❌ ", false, "red"), t("body_measurements solo tiene weight_kg y notes — sin circunferencias, % graso, fotos", true)]),
      bulletRich([t("❌ ", false, "red"), t("No hay tabla messages ni canal de comunicación coach-cliente", true)]),
      bulletRich([t("❌ ", false, "red"), t("No hay concepto de check-in o reporte periódico del cliente (energía, sueño, etc.)", true)]),
      bulletRich([t("⚠️ ", false, "orange"), t("exercises no tiene campo instructions ni cues para tips de ejecución")]),
      bulletRich([t("⚠️ ", false, "orange"), t("category en exercises está nullable sin uso claro — duplica/confunde con muscle_group")]),
      bulletRich([t("ℹ️ ", false, "blue"), t("No hay historial de versiones del plan (audit trail)")]),
    ]),

    toggle("📋 Planes", [
      bulletRich([t("🔴 CRÍTICO — ", true, "red"), t("El plan template no se puede editar. updatePlanFullAction es un TODO vacío.")]),
      bulletRich([t("🔴 CRÍTICO — ", true, "red"), t("El plan del cliente no se puede ajustar. updateClientPlanAction es un TODO vacío.")]),
      bulletRich([t("❌ ", false, "red"), t("Vista del plan template no respeta estructura de semanas independientes (muestra flat)")]),
      bulletRich([t("❌ ", false, "red"), t("No hay forma de pausar/reanudar el plan activo de un cliente")]),
      bulletRich([t("⚠️ ", false, "orange"), t("La progresión de semana actual no es clara: ¿por fecha calendario o por semanas completadas?")]),
    ]),

    toggle("🏋️ Ejercicios", [
      bulletRich([t("❌ ", false, "red"), t("No hay campo instructions/cues para que el coach escriba tips de ejecución visibles durante el entreno")]),
      bulletRich([t("❌ ", false, "red"), t("No hay biblioteca base de ejercicios — cada coach empieza desde cero")]),
      bulletRich([t("⚠️ ", false, "orange"), t("video_url acepta cualquier URL pero video-modal.tsx tiene TODO: player sin implementar")]),
    ]),

    toggle("👤 Clientes", [
      bulletRich([t("🔴 CRÍTICO — ", true, "red"), t("El coach no puede editar los datos del cliente desde ninguna pantalla (updateClientAction existe sin UI)")]),
      bulletRich([t("❌ ", false, "red"), t("No hay UI para agregar mediciones corporales (logBodyMeasurementAction existe pero no hay form)")]),
      bulletRich([t("⚠️ ", false, "orange"), t("Perfil del cliente muy básico para coaching real (faltan objetivos cuantitativos)")]),
    ]),

    toggle("🎯 Logging de entrenamientos", [
      bulletRich([t("⚠️ ", false, "orange"), t("El cliente no puede agregar notas por ejercicio (solo notas globales al final de la sesión)")]),
      bulletRich([t("⚠️ ", false, "orange"), t("No hay forma de marcar 'no pude completar este ejercicio' de forma estructurada")]),
      bulletRich([t("❌ ", false, "red"), t("Si el cliente no tiene plan, el dashboard está roto funcionalmente (no guía a ninguna acción)")]),
    ]),

    toggle("📈 Seguimiento / Progreso", [
      bulletRich([t("🔴 CRÍTICO — ", true, "red"), t("El coach no puede ver el RPE ni las notas de los entrenos de sus clientes (data en DB, sin UI)")]),
      bulletRich([t("❌ ", false, "red"), t("weekly-load existe como demo pero no carga datos reales")]),
      bulletRich([t("⚠️ ", false, "orange"), t("No hay comparación semana-a-semana en la vista del cliente")]),
      bulletRich([t("⚠️ ", false, "orange"), t("Historial del cliente no tiene resumen de métricas clave")]),
    ]),

    toggle("🎛️ Experiencia Coach", [
      bulletRich([t("🔴 CRÍTICO — ", true, "red"), t("No hay pantalla para ver el detalle de sesiones del cliente (sets, pesos, RPE, notas)")]),
      bulletRich([t("❌ ", false, "red"), t("No se puede hacer click en el heatmap del dashboard para ver qué pasó ese día")]),
      bulletRich([t("❌ ", false, "red"), t("No hay comunicación directa coach → cliente")]),
      bulletRich([t("⚠️ ", false, "orange"), t("Coach settings es un placeholder vacío")]),
    ]),

    toggle("📱 Experiencia Cliente", [
      bulletRich([t("❌ ", false, "red"), t("Si no hay plan activo, la app no guía al cliente hacia ninguna acción")]),
      bulletRich([t("❌ ", false, "red"), t("El cliente no ve instrucciones ni cues por ejercicio (no existen en el modelo)")]),
      bulletRich([t("⚠️ ", false, "orange"), t("Sección de nutrición es placeholder total")]),
      bulletRich([t("⚠️ ", false, "orange"), t("Notificaciones no funcionan (preference se guarda, save-action no implementada)")]),
    ]),

    toggle("⚡ Consistencia funcional", [
      bulletRich([t("⚠️ ", false, "orange"), t("¿Qué pasa si el cliente se saltea una semana? ¿Avanza igual el calendario?")]),
      bulletRich([t("⚠️ ", false, "orange"), t("day_of_week en el plan vs fecha real: si empieza un miércoles y el plan tiene 'lunes', ¿qué pasa en semana 1?")]),
    ]),

    divider(),

    // ─── D. BENCHMARK ───
    h1("D. Benchmark Conceptual"),
    callout("🔍", "Referencia: TrueCoach, TrainHeroic, Trainerize, My PT Hub, Everfit — las mejores plataformas actuales.", "purple_background"),
    p(""),
    h3("Lo que tienen y LoBoost no tiene"),
    numbered("Edición de plan en vivo — el coach modifica el plan de un cliente en curso sin reasignar todo."),
    numbered("Feedback por sesión — el coach puede comentar directamente en la sesión completada del cliente."),
    numbered("Comunicación directa in-app — mensajería básica coach ↔ cliente."),
    numbered("Check-ins estructurados — el cliente responde un formulario semanal (energía, sueño, peso)."),
    numbered("Progresión automática de carga — el sistema detecta que el cliente logró el target y sugiere subir peso."),
    numbered("Biblioteca base de ejercicios — los coaches no empiezan desde cero."),
    numbered("Instrucciones + video por ejercicio — el cliente ve el video Y los tips clave durante el entreno."),
    numbered("Vista del coach de cada sesión — sets, pesos, RPE, notas — no solo el heatmap."),
    numbered("Resumen semanal automático — mail/notificación al coach con el resumen de la semana de cada cliente."),
    numbered("Gráfico de progreso por ejercicio — evolución de peso máximo en timeline para coach y cliente."),
    p(""),
    h3("Lo que LoBoost tiene mejor que algunos competidores"),
    bullet("✅ Multi-week plans con tipos de semana (deload/peak/test) — muchos competidores no lo tienen."),
    bullet("✅ Rangos de reps (8–10 en lugar de valor fijo) — la mayoría maneja solo un número."),
    bullet("✅ Arquitectura técnica limpia y escalable (Supabase RLS bien planteado)."),
    divider(),

    // ─── E. PROPUESTA ───
    h1("E. Propuesta de Funcionamiento Correcto"),
    h3("Flujo diario del Coach"),
    numbered("Entra al dashboard → ve qué clientes entrenaron ayer, quiénes tienen alertas."),
    numbered("Click en un cliente → ve la sesión de ayer completa (ejercicios, pesos, RPE)."),
    numbered("Puede dejar un comentario en esa sesión."),
    numbered("Puede ajustar el plan en curso directamente (cambiar ejercicio, series, reps)."),
    numbered("Puede agregar una medición corporal del cliente."),
    numbered("Puede enviar un mensaje rápido al cliente."),
    p(""),
    h3("Flujo regular del Cliente"),
    numbered("Entra → dashboard muestra qué toca hoy con contexto (ejercicios + cues + video)."),
    numbered("Empieza sesión → loguea sets con el peso del último entreno precargado como referencia."),
    numbered("Al terminar: RPE + notas opcionales → sesión completada."),
    numbered("Ve feedback del coach si dejó un comentario."),
    numbered("Puede ver su progreso (gráfico por ejercicio, PRs actuales)."),
    p(""),
    h3("Decisiones de producto pendientes de definir"),
    callout("❓", "¿Cómo avanza la semana del plan? ¿Por fecha calendario fijo o por semanas completadas?", "gray_background"),
    callout("❓", "¿Qué pasa si el cliente no entrena en el día asignado? ¿Se puede mover la sesión o se marca missed?", "gray_background"),
    callout("❓", "¿Qué pasa cuando el plan llega a end_date? ¿Status automático a 'completed'?", "gray_background"),
    callout("❓", "¿La edición del template afecta clientes que ya tienen ese plan asignado?", "gray_background"),
    callout("❓", "¿Puede el cliente modificar su propio plan? (probablemente no, solo el coach)", "gray_background"),
    divider(),

    // ─── F. ROADMAP ───
    h1("F. Roadmap Recomendado"),

    toggle("🔴 Fase 1 — Corregir base funcional (HACER PRIMERO)", [
      todo("1. Implementar edit de plan template — el coach puede volver a un plan y editarlo"),
      todo("2. Implementar edit de client_plan — el coach ajusta plan asignado a un cliente específico"),
      todo("3. Coach ve sesiones del cliente — pantalla con sets, pesos, RPE, notas de cada sesión"),
      todo("4. UI para agregar mediciones corporales — form accesible desde perfil del cliente"),
      todo("5. UI para editar perfil del cliente — form desde /coach/clients/[id]"),
    ]),

    toggle("🟡 Fase 2 — Completar flujos clave", [
      todo("6. Instructions/cues en ejercicios — el coach escribe, el cliente ve durante el entreno"),
      todo("7. Coach ve RPE en dashboard — indicador de RPE en heatmap o detalle del cliente"),
      todo("8. Check-ins del cliente — formulario semanal simple (energía, sueño, peso)"),
      todo("9. Notificaciones funcionales — implementar saveNotificationPrefsAction"),
      todo("10. Biblioteca base de ejercicios — ejercicios predefinidos accesibles a todos los coaches"),
    ]),

    toggle("🟢 Fase 3 — Robustecer seguimiento y métricas", [
      todo("11. Gráfico de progreso por ejercicio — evolución de peso máximo (timeline)"),
      todo("12. Volumen semanal real — tonelaje por semana con datos reales"),
      todo("13. Mensajería básica — canal coach ↔ cliente dentro de la app"),
      todo("14. Sugerencia de progresión de carga — detectar cuando el cliente logró el target"),
      todo("15. Resumen semanal — notificación/mail al coach con resumen de cada cliente"),
    ]),

    toggle("🔵 Fase 4 — Pulido visual y pantallas finales (ÚLTIMO)", [
      todo("16. Refinar dashboard del coach (layout, filtros avanzados)"),
      todo("17. Onboarding del cliente (primera vez sin plan)"),
      todo("18. Animaciones y transiciones en LiveTraining"),
      todo("19. Modo oscuro completo / theming"),
      todo("20. PWA manifest, app icon, splash screen"),
    ]),

    divider(),

    // ─── G. TAREAS CONCRETAS ───
    h1("G. Tareas Concretas para Implementar"),

    h2("Backend"),
    toggle("🔴 Crítico", [
      bullet("Implementar updatePlanFullAction — reemplazar plan_weeks/days/exercises de un plan existente", true),
      bullet("  → src/features/plans/actions/update-plan-full.ts"),
      bullet("Implementar updateClientPlanAction — modificar exercises/sets/reps del plan de un cliente", true),
      bullet("  → src/features/plans/actions/update-client-plan.ts"),
      bullet("Crear query getClientSessionHistory(clientId) con detalle completo para el coach", true),
      bullet("  → src/features/coach/queries.ts (nueva)"),
    ]),
    toggle("🟡 Alto", [
      bullet("Migración: agregar columna instructions text a tabla exercises"),
      bullet("  → supabase/migrations/nueva"),
      bullet("Crear tabla check_ins (client_id, week, energy 1–5, sleep 1–5, weight, notes)"),
      bullet("  → supabase/migrations/nueva"),
      bullet("Crear tabla messages (sender_id, receiver_id, content, created_at)"),
      bullet("  → supabase/migrations/nueva"),
    ]),
    toggle("🟢 Medio", [
      bullet("Implementar saveNotificationPrefsAction"),
      bullet("  → src/features/training/actions/save-notification-prefs.ts"),
    ]),

    h2("Frontend"),
    toggle("🔴 Crítico", [
      bullet("Plan builder en modo edit — cargar estructura existente y permitir modificar", true),
      bullet("  → src/app/(coach)/coach/library/plans/plan-builder-form.tsx"),
      bullet("/coach/clients/[id]/sessions — lista de sesiones con detalle expandible (sets, pesos, RPE)", true),
      bullet("  → nueva página"),
    ]),
    toggle("🟡 Alto", [
      bullet("Form para agregar body measurement desde /coach/clients/[id]"),
      bullet("Form para editar perfil del cliente desde /coach/clients/[id]"),
      bullet("Dashboard del coach — click en celda del heatmap → ver detalle de esa sesión"),
      bullet("  → src/app/(coach)/coach/dashboard/coach-weekly-heatmap.tsx"),
      bullet("LiveTraining: mostrar instructions del ejercicio si existen"),
      bullet("  → src/app/(training)/client/training/[sessionId]/live-training.tsx"),
    ]),
    toggle("🟢 Medio", [
      bullet("/client/history/week/[weekNumber] — agregar métricas resumen (volumen total, RPE promedio)"),
      bullet("Gráfico de evolución de peso por ejercicio (para cliente y coach)"),
    ]),

    divider(),
    callout(
      "💡",
      "Próximo paso recomendado: definir las 5 decisiones de producto pendientes (sección E), luego arrancar Fase 1 en orden.",
      "green_background"
    ),
  ];

  await appendBlocks(PAGE_ID, blocks);
  console.log("✅ Página creada con éxito!");
  console.log(`🔗 https://www.notion.so/${PAGE_ID.replace(/-/g, "")}`);
}

main().catch(console.error);
