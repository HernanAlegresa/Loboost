import Avatar from '@/components/ui/avatar'

type Props = {
  fullName: string
  statusColor: 'active' | 'warning' | 'critical'
  sex: 'male' | 'female' | 'other' | null
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | null
  age: number | null
  weightKg: number | null
  heightCm: number | null
  daysPerWeek: number
  injuries: string | null
}

type HeroStat = {
  label: string
  value: string
}

function valueOrDash(value: number | null, unit: string) {
  if (value === null) return '—'
  return `${value} ${unit}`
}

const SEX_LABELS: Record<'male' | 'female' | 'other', string> = {
  male: 'Masculino',
  female: 'Femenino',
  other: 'Otro',
}

const LEVEL_LABELS: Record<'beginner' | 'intermediate' | 'advanced', string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
}

export default function ClientProfileHeroCard({
  fullName,
  statusColor,
  sex,
  experienceLevel,
  age,
  weightKg,
  heightCm,
  daysPerWeek,
  injuries,
}: Props) {
  const ringColor =
    statusColor === 'active' ? '#22C55E' : statusColor === 'warning' ? '#F2994A' : '#F25252'

  const leftStats: HeroStat[] = [
    { label: 'Sexo', value: sex ? SEX_LABELS[sex] : '—' },
    { label: 'Nivel', value: experienceLevel ? LEVEL_LABELS[experienceLevel] : '—' },
    { label: 'Días/sem', value: `${daysPerWeek} días` },
  ]
  const rightStats: HeroStat[] = [
    { label: 'Edad', value: valueOrDash(age, 'años') },
    { label: 'Peso', value: valueOrDash(weightKg, 'kg') },
    { label: 'Altura', value: valueOrDash(heightCm, 'cm') },
  ]

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
          alignItems: 'center',
          columnGap: 16,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
          {leftStats.map((item, index) => (
            <div
              key={item.label}
              style={{
                width: '100%',
                maxWidth: 112,
                padding: '7px 7px',
                borderTop: index > 0 ? '1px solid #252A31' : 'none',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#6B7280',
                  letterSpacing: '0.04em',
                  textAlign: 'center',
                }}
              >
                {item.label}
              </p>
              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#F0F0F0',
                  lineHeight: 1.2,
                  textAlign: 'center',
                }}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <Avatar fullName={fullName} ringColor={ringColor} size="xl" />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
          {rightStats.map((item, index) => (
            <div
              key={item.label}
              style={{
                width: '100%',
                maxWidth: 112,
                padding: '7px 7px',
                borderTop: index > 0 ? '1px solid #252A31' : 'none',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#6B7280',
                  letterSpacing: '0.04em',
                  textAlign: 'center',
                }}
              >
                {item.label}
              </p>
              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#F0F0F0',
                  lineHeight: 1.2,
                  textAlign: 'center',
                }}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {injuries ? (
        <div
          style={{
            marginTop: 14,
            borderTop: '1px solid #1F2227',
            paddingTop: 10,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 11,
              fontWeight: 600,
              color: '#6B7280',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Lesiones / limitaciones
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#F0F0F0', lineHeight: 1.4 }}>
            {injuries}
          </p>
        </div>
      ) : null}
    </div>
  )
}
