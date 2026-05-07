'use client'

import type { ReactNode } from 'react'
import AppHeader from './app-header'
import { useHeaderContext } from './header-context'

type DynamicHeaderProps = {
  rootRightSlot: ReactNode
  showBorder?: boolean
}

export default function DynamicHeader({ rootRightSlot, showBorder }: DynamicHeaderProps) {
  const { flowConfig } = useHeaderContext()

  if (flowConfig) {
    return (
      <AppHeader
        variant="flow"
        title={flowConfig.title}
        subtitle={flowConfig.subtitle}
        fallbackHref={flowConfig.fallbackHref}
        rightSlot={flowConfig.rightSlot}
        onBack={flowConfig.onBack}
      />
    )
  }

  return (
    <AppHeader
      variant="root"
      rightSlot={rootRightSlot}
      showBorder={showBorder}
    />
  )
}
