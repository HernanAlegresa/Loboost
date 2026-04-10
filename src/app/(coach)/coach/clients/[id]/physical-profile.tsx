import { Calendar, User, Scale, Ruler, Dumbbell, CalendarDays, AlertTriangle } from 'lucide-react'

const SEX_LABELS: Record<string, string> = {
  male: 'Masculino',
  female: 'Femenino',
  other: 'Otro',
}
const EXPERIENCE_LABELS: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
}

const SECTION_TITLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#6B7280',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: 12,
}

const CARD: React.CSSProperties = {
  backgroundColor: '#111317',
  border: '1px solid #1F2227',
  borderRadius: 12,
  padding: '12px 14px',
  display: 'flex',
  gap: 10,
  alignItems: 'flex-start',
}

type Props = {
  age: number | null
  sex: 'male' | 'female' | 'other' | null
  weightKg: number | null
  heightCm: number | null
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | null
  daysPerWeek: number
  injuries: string | null
}

export default function PhysicalProfile({
  age,
  sex,
  weightKg,
  heightCm,
  experienceLevel,
  daysPerWeek,
  injuries,
}: Props) {
  const items = [
    { icon: <Calendar size={16} />, label: 'Edad', value: age ? `${age} anos` : '—' },
    { icon: <User size={16} />, label: 'Sexo', value: sex ? SEX_LABELS[sex] : '—' },
    { icon: <Scale size={16} />, label: 'Peso', value: weightKg ? `${weightKg} kg` : '—' },
    { icon: <Ruler size={16} />, label: 'Altura', value: heightCm ? `${heightCm} cm` : '—' },
    {
      icon: <Dumbbell size={16} />,
      label: 'Nivel',
      value: experienceLevel ? EXPERIENCE_LABELS[experienceLevel] : '—',
    },
    { icon: <CalendarDays size={16} />, label: 'Dias/sem', value: `${daysPerWeek} dias` },
  ]

  return (
    <div>
      <p style={SECTION_TITLE}>Perfil fisico</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {items.map((item) => (
          <div key={item.label} style={CARD}>
            <span style={{ color: '#6B7280', flexShrink: 0, marginTop: 2 }}>{item.icon}</span>
            <div>
              <p style={{ fontSize: 11, color: '#6B7280', fontWeight: 500, marginBottom: 3 }}>
                {item.label}
              </p>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#F0F0F0' }}>{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {injuries && (
        <div style={{ ...CARD, marginTop: 8 }}>
          <span style={{ color: '#F2994A', flexShrink: 0, marginTop: 2 }}>
            <AlertTriangle size={16} />
          </span>
          <div>
            <p style={{ fontSize: 11, color: '#6B7280', fontWeight: 500, marginBottom: 3 }}>
              Lesiones / limitaciones
            </p>
            <p style={{ fontSize: 14, color: '#F0F0F0' }}>{injuries}</p>
          </div>
        </div>
      )}
    </div>
  )
}
