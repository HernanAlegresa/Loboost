import Link from 'next/link'
import Avatar from '@/components/ui/avatar'
import { CLIENT_STATUS_CONFIG } from '@/features/clients/types/client-status'
import type { ClientStatus } from '@/features/clients/types/client-status'

type Props = {
  clientId: string
  fullName: string
  status: ClientStatus
  sex: 'male' | 'female' | 'other' | null
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | null
  age: number | null
  weightKg: number | null
  heightCm: number | null
  daysPerWeek: number
  injuries: string | null
  planExpired: boolean
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
  clientId,
  fullName,
  status,
  sex,
  experienceLevel,
  age,
  weightKg,
  heightCm,
  daysPerWeek,
  injuries,
  planExpired,
}: Props) {
  const ringColor = CLIENT_STATUS_CONFIG[status].color

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
      {planExpired && (
        <div
          style={{
            backgroundColor: 'rgba(242,82,82,0.08)',
            border: '1px solid rgba(242,82,82,0.25)',
            borderRadius: 12,
            padding: '12px 16px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#F25252' }}>
              Plan vencido
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9CA3AF' }}>
              El plan de este cliente ha finalizado.
            </p>
            <Link
              href={`/coach/library/plans?assignTo=${clientId}`}
              style={{
                display: 'inline-block',
                marginTop: 8,
                fontSize: 12,
                fontWeight: 700,
                color: '#0A0A0A',
                backgroundColor: '#B5F23D',
                borderRadius: 8,
                padding: '6px 12px',
                textDecoration: 'none',
              }}
            >
              Asignar nuevo plan →
            </Link>
          </div>
        </div>
      )}
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
            marginTop: 2,
            paddingTop: 2,
            textAlign: 'center',
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
            Lesiones / limitaciones
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
            {injuries}
          </p>
        </div>
      ) : null}
    </div>
  )
}
