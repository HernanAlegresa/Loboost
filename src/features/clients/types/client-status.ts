export type ClientStatus = 'al-dia' | 'atencion' | 'riesgo' | 'sin-datos'

export const CLIENT_STATUS_CONFIG: Record<
  ClientStatus,
  { label: string; color: string; bg: string }
> = {
  'al-dia':    { label: 'Al día',    color: '#B5F23D', bg: 'rgba(181,242,61,0.12)'  },
  'atencion':  { label: 'Atención',  color: '#F2C94A', bg: 'rgba(242,201,74,0.12)'  },
  'riesgo':    { label: 'Riesgo',    color: '#F25252', bg: 'rgba(242,82,82,0.12)'   },
  'sin-datos': { label: 'Sin datos', color: '#4B5563', bg: 'rgba(75,85,99,0.12)'    },
}
