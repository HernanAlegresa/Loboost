import Link from 'next/link'
import { Plus } from 'lucide-react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CoachSubpageHeader from '@/components/ui/coach-subpage-header'
import { getCoachExercises } from './queries'
import ExerciseList from './exercise-list'

export default async function ExercisesLibraryPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const exercises = await getCoachExercises(user.id)

  return (
    <div
      style={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <CoachSubpageHeader
        backHref="/coach/library"
        title="Ejercicios"
        titleColor="#F0F0F0"
        subtitle={`${exercises.length} ${exercises.length === 1 ? 'ejercicio' : 'ejercicios'}`}
        rightSlot={
          <Link
            href="/coach/library/exercises/new"
            aria-label="Crear ejercicio"
            style={{
              width: 40,
              height: 40,
              backgroundColor: '#B5F23D',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
            }}
          >
            <Plus size={22} color="#0A0A0A" strokeWidth={2.5} />
          </Link>
        }
      />

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          overscrollBehaviorY: 'contain',
          padding: '8px 20px 120px',
        }}
      >
        <ExerciseList exercises={exercises} />
      </div>
    </div>
  )
}
