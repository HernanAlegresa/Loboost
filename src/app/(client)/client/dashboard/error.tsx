'use client'

import ErrorView from '@/components/ui/error-view'

export default function ClientDashboardError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorView
      title="Error al cargar el dashboard"
      message="No se pudo cargar tu información. Intentá de nuevo."
      onReset={reset}
    />
  )
}
