# Dual AI Workflow — Cursor + Claude Code

Objetivo: usar Cursor y Claude Code como sistema complementario, sin drift de reglas ni pérdida de contexto.

## Principio operativo

- **Claude Code (terminal):** ejecución rápida de implementación, comandos y fixes iterativos.
- **Cursor Agent:** planificación guiada por reglas del repo, validación de arquitectura, coordinación de slices y verificación final.
- **Fuente de verdad compartida:** `.cursor/rules/*.mdc`, `.cursor/skills/*/SKILL.md`, `docs/decisions/*`, `docs/superpowers/handoffs/cursor-development-log.md`.

## Ritual de inicio de sesión (siempre igual)

1. Leer `docs/superpowers/handoffs/cursor-development-log.md`.
2. Si toca negocio/arquitectura, revisar `docs/decisions/`.
3. Alinear objetivo en una frase: qué cambia y qué no.
4. Si hay ambigüedad, correr `grill-me`.
5. Si hay múltiples partes dependientes, correr `slice`.

## Cuándo usar cada herramienta

- Usa **Cursor** para:
  - decisiones de diseño técnico, descomposición por slices y calidad de entrega.
  - tareas con riesgo en límites de dominio, auth, ownership o consistencia multi-entidad.
- Usa **Claude Code** para:
  - ejecución táctica rápida de cambios ya definidos.
  - iteraciones de refactor local y ciclos cortos de feedback en terminal.

## Reglas para evitar drift entre herramientas

- No inventar reglas en chat: persistir en `.cursor/rules/` o `.cursor/skills/` si deben repetirse.
- Toda decisión no trivial queda en `docs/decisions/` (ADR) o en plan/handoff.
- Antes de cerrar una tarea, aplicar `done` y dejar verificación manual reproducible.
- Si se actualiza un skill, actualizar referencias en reglas/docs en la misma sesión.

## MCP baseline recomendado

- `plugin-supabase-supabase`: activo para DB/auth/logs/advisors.
- `plugin-vercel-vercel`: activo para deploy y diagnóstico de entorno.
- `cursor-ide-browser`: activo para validación UI end-to-end.
- `plugin-figma-figma`: activar solo cuando hay trabajo de Figma/design system.

## Checklist de cierre por sesión

1. `npx tsc --noEmit` en verde.
2. Lista de archivos modificados con propósito.
3. Pasos manuales de verificación.
4. Riesgos residuales explícitos (o `ninguno`).
5. Actualización de `cursor-development-log.md` para la próxima sesión.
