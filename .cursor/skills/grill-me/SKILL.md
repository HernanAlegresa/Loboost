---
name: grill-me
description: Alignment protocol before implementation in LoBoost. Use when requirements are ambiguous, scope is incomplete, or the task touches UX, business logic, DB, auth, or multi-file changes. Asks one focused question per round with a recommendation, then outputs a concrete agreed context block.
---

# Grill Me — Alignment Protocol

## Cuándo usar

- Requerimiento ambiguo o incompleto.
- Impacto en UX, negocio, DB, auth o múltiples archivos.
- No está claro qué significa "hecho".

## Proceso

1. **Una sola pregunta por ronda.** Nunca lista de preguntas.
2. Cada pregunta debe incluir recomendación explícita:

> _Mi recomendación: [qué haría y por qué, en una oración]_

3. Esperar respuesta antes de seguir.
4. Si toca negocio/DB/auth, revisar decisiones vigentes en `docs/decisions/`.
5. Repetir hasta que el alcance esté claro y ejecutable sin supuestos críticos.

## Ejes de validación por ronda

- **Scope:** qué cambia y qué no.
- **Constraints:** qué no se puede romper (invariantes, patrones, límites técnicos).
- **Riesgos:** regresiones probables y dependencias.

## Output obligatorio

Cuando hay alineación suficiente, publicar este bloque exacto en chat:

---
## Contexto acordado

**Qué hacemos:** [una oración]
**Archivos involucrados:** [lista concreta]
**Constraints:** [lista o "ninguno"]
**Riesgos:** [lista o "ninguno"]
**Próximo paso:** [slice | implementar directamente]
---

No crear archivos desde esta skill. Solo alineación.
