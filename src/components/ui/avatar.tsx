type AvatarSize = 'sm' | 'md' | 'lg'

type AvatarProps = {
  fullName: string
  size?: AvatarSize
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

export default function Avatar({ fullName, size = 'md' }: AvatarProps) {
  const { px, fontSize } = SIZE_CONFIG[size]
  return (
    <div
      style={{
        width: `${px}px`,
        height: `${px}px`,
        borderRadius: '50%',
        backgroundColor: '#1A1D22',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize, fontWeight: 600, color: '#B5F23D', lineHeight: 1 }}>
        {getInitials(fullName)}
      </span>
    </div>
  )
}
