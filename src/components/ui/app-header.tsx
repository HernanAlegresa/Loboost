'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { SAFE_HEADER_PADDING_TOP } from '@/lib/ui/safe-area'

type AppHeaderRootProps = {
  variant: 'root'
  rightSlot: React.ReactNode
  showBorder?: boolean
}

type AppHeaderFlowProps = {
  variant: 'flow'
  title: string
  subtitle?: string
  fallbackHref: string
  rightSlot?: React.ReactNode
}

export type AppHeaderProps = AppHeaderRootProps | AppHeaderFlowProps

export default function AppHeader(props: AppHeaderProps) {
  const router = useRouter()

  if (props.variant === 'flow') {
    const { title, subtitle, fallbackHref, rightSlot } = props

    function handleBack() {
      if (window.history.length > 1) {
        router.back()
      } else {
        router.push(fallbackHref)
      }
    }

    return (
      <header
        className="shrink-0 z-50 bg-[var(--color-bg-base)] pb-4 grid grid-cols-[44px_1fr_44px] items-center gap-x-2"
        style={{ paddingTop: SAFE_HEADER_PADDING_TOP }}
      >
        <button
          onClick={handleBack}
          aria-label="Volver"
          className="flex items-center justify-center pl-5 text-[var(--color-accent)] w-11 h-11 shrink-0"
        >
          <ChevronLeft size={24} />
        </button>

        <div className="min-w-0 text-center">
          <p className="text-[20px] font-bold text-[var(--color-text-primary)] truncate leading-[1.2]">
            {title}
          </p>
          {subtitle && (
            <p className="text-[13px] text-[var(--color-text-secondary)] truncate mt-1">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end shrink-0 pr-5">
          {rightSlot ?? null}
        </div>
      </header>
    )
  }

  // variant === 'root'
  const { rightSlot, showBorder = false } = props
  return (
    <header
      className="shrink-0 z-50 bg-[var(--color-bg-base)] px-5 pb-4 flex items-center justify-between"
      style={{
        paddingTop: SAFE_HEADER_PADDING_TOP,
        borderBottom: showBorder ? '1px solid var(--color-border-subtle)' : undefined,
      }}
    >
      <span className="text-[22px] font-extrabold tracking-[0.04em] uppercase">
        <span className="text-[var(--color-accent)]">Lobo</span>
        <span className="text-[var(--color-text-primary)]">ost</span>
      </span>
      <div className="flex items-center gap-3">
        {rightSlot}
      </div>
    </header>
  )
}
