---
name: coach-mobile-ui-premium
description: Premium frontend playbook for LoBoost coach screens. Use when creating or refining coach UI (dashboard, clients, library, settings), especially spacing, hierarchy, FAB behavior, tabs, and motion in mobile-first dark theme.
---

# Coach Mobile UI Premium

## Cuándo usar

- Cambios visuales o de interacción en rutas de coach.
- Rediseño de pantallas o mejoras de pulido UI.
- Ajustes de spacing, FAB, tabs, cards, o jerarquía de contenido.

## Protocolo

1. **Alinear superficie**
   - Confirmar ruta objetivo (`src/app/(coach)/**`).
   - Identificar componentes compartidos que no se deben romper.

2. **Anclar tokens y sistema**
   - Usar `docs/design/DESIGN.md` como base visual.
   - Mantener dark-first + acento lima selectivo.
   - Evitar introducir nuevos colores sin necesidad clara.

3. **Spacing y estructura**
   - Priorizar constantes (px) con nombres semánticos sobre números sueltos.
   - Definir aire entre: header -> tabs -> filtros -> contenido -> FAB.
   - Respetar safe area + bottom nav en todas las vistas.

4. **Interacción y estados**
   - Estado normal, vacío, loading, disabled y error deben ser explícitos.
   - Touch targets cómodos en mobile.
   - CTA principal claro y único por zona.

5. **Motion premium (sin ruido)**
   - Transiciones cortas (150-250ms) y sutiles.
   - Usar transform/opacity; no animaciones pesadas.
   - Si hay animación no esencial, debe degradar bien.

## Hard gates

- No romper invariantes de navegación o ownership.
- No mezclar estilos incompatibles con LoBoost.
- No introducir cambios globales cuando el pedido es local.

## Output en chat (obligatorio)

---
## UI Premium Pass
**Pantalla/s:** [paths]
**Jerarquía aplicada:** [cómo quedó la estructura visual]
**Spacing clave:** [constantes nuevas o ajustadas]
**Estados cubiertos:** [normal/vacío/loading/disabled/error]
**Motion:** [qué se animó y por qué]
**Riesgo visual residual:** [ninguno | detalle]
---
