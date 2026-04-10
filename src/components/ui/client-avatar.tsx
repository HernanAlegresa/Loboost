function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
}

const AVATAR_COLORS = ['#7C3AED', '#2563EB', '#059669', '#D97706', '#DC2626']

export default function ClientAvatar({
  name,
  size = 40,
}: {
  name: string
  size?: number
}) {
  const initials = getInitials(name) || '?'
  const colorIndex = (name.charCodeAt(0) ?? 0) % AVATAR_COLORS.length
  const bg = AVATAR_COLORS[colorIndex]

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.round(size * 0.38),
        fontWeight: 700,
        color: '#fff',
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {initials}
    </div>
  )
}
