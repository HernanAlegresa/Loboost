import type { CSSProperties } from 'react'

const SHIMMER_STYLE = `
@keyframes shimmer {
  0% { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
`

interface SkeletonProps {
  width?: number | string
  height?: number | string
  borderRadius?: number | string
  style?: CSSProperties
}

export default function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  return (
    <>
      <style>{SHIMMER_STYLE}</style>
      <div
        style={{
          width,
          height,
          borderRadius,
          background: 'linear-gradient(90deg, #1A1D24 25%, #22262F 50%, #1A1D24 75%)',
          backgroundSize: '800px 100%',
          animation: 'shimmer 1.4s infinite linear',
          flexShrink: 0,
          ...style,
        }}
      />
    </>
  )
}
