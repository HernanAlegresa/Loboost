export type ClientStatus = 'al_dia' | 'naranja' | 'riesgo' | 'sin_plan'

export const CLIENT_STATUS_CONFIG: Record<
  ClientStatus,
  { label: string; color: string; bg: string }
> = {
  al_dia:   { label: 'Al día',    color: '#22C55E', bg: 'rgba(34,197,94,0.12)'    },
  naranja:  { label: 'Pendiente', color: '#F2C94A', bg: 'rgba(242,201,74,0.12)'   },
  riesgo:   { label: 'En riesgo', color: '#F25252', bg: 'rgba(242,82,82,0.12)'    },
  sin_plan: { label: 'Sin plan',  color: '#6B7280', bg: 'rgba(107,114,128,0.12)'  },
}
