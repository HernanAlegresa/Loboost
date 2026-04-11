/**
 * Padding superior para filas “pegadas” al borde superior del viewport
 * (notch, Dynamic Island, barra de estado en PWA / Chrome Android con viewport-fit=cover).
 *
 * Usar en el primer header/toolbar de cada shell (cliente, coach, entreno sin shell).
 */
export const SAFE_HEADER_PADDING_TOP = 'calc(16px + env(safe-area-inset-top, 0px))'
export const SAFE_HEADER_PADDING_TOP_COMPACT = 'calc(14px + env(safe-area-inset-top, 0px))'
