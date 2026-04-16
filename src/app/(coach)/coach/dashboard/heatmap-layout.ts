/**
 * Escala visual del mapa semanal (grilla, celdas, tipografías del bloque).
 * Subí el valor (p. ej. 1.1 → 1.15 → 1.2) para agrandar todo proporcionalmente.
 */
export const HEATMAP_UI_SCALE = 1.12

export function hmPx(base: number): number {
  return Math.max(1, Math.round(base * HEATMAP_UI_SCALE))
}
