/**
 * Padding superior para filas “pegadas” al borde superior del viewport
 * (notch, Dynamic Island, barra de estado en PWA / Chrome Android con viewport-fit=cover).
 *
 * Usar en el primer header/toolbar de cada shell (cliente, coach, entreno sin shell).
 */
export const SAFE_HEADER_PADDING_TOP = 'calc(16px + env(safe-area-inset-top, 0px))'
export const SAFE_HEADER_PADDING_TOP_COMPACT = 'calc(14px + env(safe-area-inset-top, 0px))'

/**
 * Bottom nav visualmente más alta y cómoda de tocar, sin quedar pegada
 * al borde inferior del dispositivo / home indicator.
 */
export const SAFE_BOTTOM_NAV_HEIGHT = 'calc(64px + env(safe-area-inset-bottom, 0px))'
export const SAFE_BOTTOM_NAV_PADDING_BOTTOM =
  'calc(8px + env(safe-area-inset-bottom, 0px))'
export const SAFE_BOTTOM_NAV_PADDING_TOP = '8px'
