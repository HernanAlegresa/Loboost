'use client'

import ErrorView from '@/components/ui/error-view'

export default function ClientProfileError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorView
      title="Error al cargar el perfil"
      message="No se pudo cargar la información del cliente."
      onReset={reset}
    />
  )
}
