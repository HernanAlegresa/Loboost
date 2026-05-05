# Cursor Development Log

_Actualizar al final de cada sesión. Este archivo es lo primero que debe leer el agente al iniciar._

---

## 2026-05-05 — Cursor config optimización + próximo: UI/design

### Estado del proyecto
- **Fases 1–3 completas.** Backend, auth, sesiones, carga semanal, seguridad RLS.
- **AppHeader Refactor COMPLETO.** Se estableció el patrón `DynamicHeader` / `FlowHeaderConfig`. No existen headers hardcodeados — todas las pantallas usan este sistema.
- **AI System rediseñado.** Flujo `grill-me → slice → backend → done` activo.
- **Fase 4 pendiente.** Ver backlog en `docs/superpowers/plans/ROADMAP.md`.

### Decisiones técnicas vigentes
- `plans` = templates del coach. `client_plans` = copias asignadas. Ver `docs/decisions/ADR-0001-agent-governance.md`.
- Stack: Next.js App Router + TypeScript + Supabase + Zod. Server Components por defecto.
- Rutas: `(coach)`, `(client)`, `(training)`, `(auth)`.

### Último commit
`fc9a139` — Merge feat/appheader-refactor → master

### Próxima sesión: trabajo de UI/design
**Scope previsto:** diseño de pantallas, headers, footer nav, y navegación.
**Skill a usar:** `.cursor/skills/ui-design/SKILL.md`
**Prerequisito:** si el scope de pantallas es ambiguo al iniciar, usar `grill-me` primero.

### Deuda técnica conocida
- Timezone y país del coach: DB migrations aplicadas, UI/lógica pendiente.

---

## 2026-05-05 — Cursor hardening dual-stack (Cursor + Claude Code)

### Slices completados
- Slice 1 — Gobernanza y skills: se agregó gate de testing crítico y baseline MCP operativo.
- Slice 2 — Memoria operativa: se alinearon referencias ADR y se creó guía de workflow dual.

### Estado al cerrar
- Stack dual operativo sin cambios destructivos en flujo Claude Code.
- Reglas activas: `00-core`, `10-architecture`, `20-supabase`, `30-ui-ux`, `45-workflow`, `50-mcp-ops`.
- Skills activas: `grill-me`, `slice`, `backend`, `ui-design`, `testing-quality-gates`, `done`.
- MCP: Supabase y Vercel autenticados; Figma pendiente de auth por skip explícito del usuario.

### Próxima sesión
- Si se trabaja UI: usar `.cursor/skills/ui-design/SKILL.md`.
- Si se toca lógica crítica: usar `.cursor/skills/testing-quality-gates/SKILL.md` antes de implementar.
- Revisar `docs/superpowers/guides/dual-ai-workflow-cursor-claude.md` como ritual de inicio.

---

## Template para próximas sesiones

```
## YYYY-MM-DD — [descripción]

### Slices completados
- Slice N — [nombre]: [qué habilitó]

### Estado al cerrar
[dónde quedó el trabajo, qué está en progreso, qué está bloqueado]

### Próxima sesión
[qué viene, qué skill usar, qué leer primero]
```
