// Canonical muscle group values. Used by Zod schema, forms, and display.

export const MUSCLE_GROUPS = [
  'pecho',
  'espalda',
  'hombros',
  'biceps',
  'triceps',
  'cuadriceps',
  'isquiotibiales',
  'gluteos',
  'abdomen',
  'pantorrillas',
] as const

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number]

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  pecho:          'Pecho',
  espalda:        'Espalda',
  hombros:        'Hombros',
  biceps:         'Bíceps',
  triceps:        'Tríceps',
  cuadriceps:     'Cuádriceps',
  isquiotibiales: 'Isquiotibiales',
  gluteos:        'Glúteos',
  abdomen:        'Abdomen',
  pantorrillas:   'Pantorrillas',
}

/** Returns the display label for any stored muscle_group value.
 *  Falls back to the raw value if it pre-dates the fixed list. */
export function muscleGroupLabel(value: string): string {
  return MUSCLE_GROUP_LABELS[value as MuscleGroup] ?? value
}

/** Options array ready for CustomSelect. */
export const MUSCLE_GROUP_OPTIONS = MUSCLE_GROUPS.map((v) => ({
  value: v,
  label: MUSCLE_GROUP_LABELS[v],
}))

/** For sorting display groups in canonical order. */
export const MUSCLE_GROUP_ORDER = [...MUSCLE_GROUPS] as string[]
