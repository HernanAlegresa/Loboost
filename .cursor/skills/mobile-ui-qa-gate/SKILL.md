---
name: mobile-ui-qa-gate
description: Mobile UI quality gate for LoBoost before declaring frontend work done. Use after any visual/interaction change to verify layout, accessibility basics, safe areas, and functional states with concrete evidence.
---

# Mobile UI QA Gate

## Cuándo usar

- Antes de cerrar tareas de frontend/UI.
- Antes de `done`, commit o PR cuando hubo cambios visuales.

## Checklist obligatorio

1. **Layout**
   - Sin solapes con top/bottom bars.
   - Scroll estable, sin cortes ni contenido escondido.
   - Espaciado consistente entre bloques principales.

2. **Interacción**
   - Botones/controles tocables en mobile.
   - Estados hover no son requeridos para entender la UI.
   - Acciones críticas tienen feedback claro.

3. **Estados funcionales**
   - Normal, loading, disabled, error y vacío (si aplica).
   - Mensajes de error comprensibles.
   - CTAs no quedan sin contexto.

4. **Accesibilidad base**
   - Contraste legible en dark mode.
   - Labels y textos de botones explícitos.
   - Icon-only actions con `aria-label` cuando corresponda.

5. **Verificación técnica**
   - Ejecutar `npx tsc --noEmit`.
   - Si hay lógica sensible, correr tests objetivos.

## Output en chat (obligatorio)

---
## Mobile UI QA
**Pantalla/s verificadas:** [paths]
**Checks visuales:** [ok / hallazgos]
**Checks funcionales:** [ok / hallazgos]
**Comandos ejecutados:** [`npx tsc --noEmit`, tests]
**Pendientes:** [ninguno | lista]
---
