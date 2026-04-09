type ComplianceBadgeProps = {
  value: number | null
}

type BadgeConfig = {
  label: string
  bg: string
  color: string
}

export function getBadgeConfig(value: number | null): BadgeConfig {
  if (value === null) {
    return { label: 'Sin plan', bg: 'rgba(242,82,82,0.12)', color: 'rgb(242, 82, 82)' }
  }
  if (value >= 70) {
    return { label: `${value}%`, bg: 'rgba(181,242,61,0.12)', color: 'rgb(181, 242, 61)' }
  }
  if (value >= 40) {
    return { label: `${value}%`, bg: 'rgba(242,153,74,0.12)', color: 'rgb(242, 153, 74)' }
  }
  return { label: `${value}%`, bg: 'rgba(242,82,82,0.12)', color: 'rgb(242, 82, 82)' }
}

export default function ComplianceBadge({ value }: ComplianceBadgeProps) {
  const { label, bg, color } = getBadgeConfig(value)
  return (
    <span
      style={{
        display: 'inline-block',
        backgroundColor: bg,
        color,
        fontSize: 12,
        fontWeight: 600,
        padding: '3px 8px',
        borderRadius: 9999,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}
