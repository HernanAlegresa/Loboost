# LoBoost Skills Map

Este archivo define el flujo recomendado de skills para este proyecto.

## Núcleo

- `grill-me`: alinear alcance cuando hay ambigüedad o riesgo.
- `slice`: dividir en slices verticales verificables.
- `backend`: implementar queries/actions con guardas e invariantes.
- `done`: cierre con evidencia (`tsc`, archivos, guía manual, riesgos).

## Frontend mobile premium (coach)

- `coach-mobile-ui-premium`: guía de implementación visual y de interacción.
- `mobile-ui-qa-gate`: gate de calidad visual/funcional antes de cerrar.

## Orden recomendado por tipo de tarea

### Feature o cambio no trivial
1. `grill-me`
2. `slice` (si aplica)
3. `backend` (si cruza Supabase)
4. `coach-mobile-ui-premium` (si hay UI coach)
5. `mobile-ui-qa-gate` (si hay UI)
6. `done`

### Ajuste UI puntual
1. `coach-mobile-ui-premium`
2. `mobile-ui-qa-gate`
3. `done`

## Compatibilidad con Claude Code

Se mantiene espejo local en `.claude/skills/` para uso en sesiones de Claude Code.
