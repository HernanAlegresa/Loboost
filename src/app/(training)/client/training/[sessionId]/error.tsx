'use client'

import ErrorView from '@/components/ui/error-view'

export default function LiveTrainingError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div style={{ backgroundColor: '#0A0A0A', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <ErrorView
        title="Error al cargar el entrenamiento"
        message="No se pudo cargar la sesión. Intentá de nuevo o volvé al inicio."
        onReset={reset}
      />
    </div>
  )
}
