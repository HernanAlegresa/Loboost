import type { CSSProperties, ReactNode } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

const grid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '44px 1fr 44px',
  alignItems: 'center',
  padding: '12px 16px 16px',
  flexShrink: 0,
  flexGrow: 0,
  backgroundColor: '#0A0A0A',
}

const backLink: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  color: '#6B7280',
  textDecoration: 'none',
  minHeight: 44,
}

type Props = {
  backHref: string
  title: string
  subtitle?: string
  rightSlot?: ReactNode
  /** e.g. accent lime for plan/exercise titles */
  titleColor?: string
  backColor?: string
  titleSize?: number
}

export default function CoachSubpageHeader({
  backHref,
  title,
  subtitle,
  rightSlot,
  titleColor = '#F0F0F0',
  backColor = '#6B7280',
  titleSize = 17,
}: Props) {
  return (
    <header style={grid}>
      <Link href={backHref} style={{ ...backLink, color: backColor }} aria-label="Volver">
        <ChevronLeft size={24} />
      </Link>
      <div style={{ textAlign: 'center', minWidth: 0 }}>
        <h1
          style={{
            fontSize: titleSize,
            fontWeight: 700,
            color: titleColor,
            margin: 0,
            lineHeight: 1.25,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </h1>
        {subtitle ? (
          <p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0', lineHeight: 1.35 }}>
            {subtitle}
          </p>
        ) : null}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        {rightSlot ?? null}
      </div>
    </header>
  )
}
