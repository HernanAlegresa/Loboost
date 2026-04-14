type AvatarSize = 'sm' | 'md' | 'lg'

type AvatarProps = {
  fullName: string
  size?: AvatarSize
  /**
   * Color del estado (borde + iniciales). Si no se pasa, estilo neutro.
   */
  ringColor?: string
}

const SIZE_CONFIG: Record<AvatarSize, { px: number; fontSize: number }> = {
  sm: { px: 28, fontSize: 11 },
  md: { px: 40, fontSize: 13 },
  lg: { px: 52, fontSize: 16 },
}

export function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function Avatar({ fullName, size = 'md', ringColor }: AvatarProps) {
  const { px, fontSize } = SIZE_CONFIG[size]
  const accent = ringColor ?? '#9CA3AF'
  const hasState = Boolean(ringColor)

  return (
    <div
      style={{
        width: `${px}px`,
        height: `${px}px`,
        borderRadius: '50%',
        backgroundColor: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        border: hasState ? `2px solid ${accent}` : '1px solid #3F4450',
        boxShadow: hasState ? `0 0 14px ${accent}40` : 'none',
      }}
    >
      <span
        style={{
          fontSize,
          fontWeight: 700,
          color: accent,
          lineHeight: 1,
          letterSpacing: '0.04em',
        }}
      >
        {getInitials(fullName)}
      </span>
    </div>
  )
}
