'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
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
}: FlowHeaderConfigProps) {
  const { setFlowConfig } = useHeaderContext()

  // rightSlot creates a new reference on every render (JSX object identity).
  // Track it via ref so the effect always uses the latest value without
  // treating it as a dependency that triggers re-runs.
  const rightSlotRef = useRef(rightSlot)
  rightSlotRef.current = rightSlot

  useIsomorphicLayoutEffect(() => {
    setFlowConfig({ title, subtitle, fallbackHref, rightSlot: rightSlotRef.current })
    return () => setFlowConfig(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, subtitle, fallbackHref, setFlowConfig])

  return null
}
