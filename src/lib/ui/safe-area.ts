/**
 * Padding superior para filas “pegadas” al borde superior del viewport
 * (notch, Dynamic Island, barra de estado en PWA / Chrome Android con viewport-fit=cover).
 *
 * Usar en el primer header/toolbar de cada shell (cliente, coach, entreno sin shell).
 */
export const SAFE_AREA_TOP = 'var(--sat, 0px)'
export const SAFE_AREA_BOTTOM = 'var(--sab, 0px)'

export const SAFE_HEADER_PADDING_TOP = `calc(16px + ${SAFE_AREA_TOP})`
export const SAFE_HEADER_PADDING_TOP_COMPACT = `calc(14px + ${SAFE_AREA_TOP})`

/**
 * Altura total del header del shell coach (padding + fila de logo/iconos).
 * Alinea overlays (búsqueda, panel de notificaciones) debajo del header.
 */
export const COACH_HEADER_TOTAL_HEIGHT = `calc(76px + ${SAFE_AREA_TOP})`

/**
 * Bottom nav visualmente más alta y cómoda de tocar, sin quedar pegada
 * al borde inferior del dispositivo / home indicator.
 */
export const SAFE_BOTTOM_NAV_HEIGHT = `calc(64px + ${SAFE_AREA_BOTTOM})`
export const SAFE_BOTTOM_NAV_PADDING_BOTTOM = SAFE_AREA_BOTTOM
export const SAFE_BOTTOM_NAV_PADDING_TOP = '8px'

/** Fin de scroll en listas del coach sobre la bottom nav (altura + respiro). */
export const COACH_LIST_SCROLL_END_ABOVE_NAV =
  `calc(72px + ${SAFE_AREA_BOTTOM})`
