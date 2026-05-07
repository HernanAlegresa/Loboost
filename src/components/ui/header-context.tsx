'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useLayoutEffect,
  type ReactNode,
} from 'react'

// useLayoutEffect fires before paint (no flash); falls back to useEffect on SSR
// to avoid the "useLayoutEffect does nothing on server" warning.
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect

export type FlowHeaderConfig = {
  title: string
  subtitle?: string
  fallbackHref: string
  rightSlot?: ReactNode
  onBack?: () => void
}

type HeaderContextValue = {
  flowConfig: FlowHeaderConfig | null
  setFlowConfig: (config: FlowHeaderConfig | null) => void
}

const HeaderContext = createContext<HeaderContextValue>({
  flowConfig: null,
  setFlowConfig: () => {},
})

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [flowConfig, setFlowConfig] = useState<FlowHeaderConfig | null>(null)
  return (
    <HeaderContext.Provider value={{ flowConfig, setFlowConfig }}>
      {children}
    </HeaderContext.Provider>
  )
}

export function useHeaderContext() {
  return useContext(HeaderContext)
}

type FlowHeaderConfigProps = FlowHeaderConfig

export function FlowHeaderConfig({
  title,
  subtitle,
  fallbackHref,
  rightSlot,
  onBack,
}: FlowHeaderConfigProps) {
  const { setFlowConfig } = useHeaderContext()

  useIsomorphicLayoutEffect(() => {
    setFlowConfig({ title, subtitle, fallbackHref, rightSlot, onBack })
    return () => setFlowConfig(null)
  }, [title, subtitle, fallbackHref, rightSlot, onBack, setFlowConfig])

  return null
}
