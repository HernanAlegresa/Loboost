import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getExerciseForEdit } from '../../queries'
import EditExerciseForm from './edit-exercise-form'

type Props = { params: Promise<{ id: string }> }

export default async function EditExercisePage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const exercise = await getExerciseForEdit(user.id, id)
  if (!exercise) notFound()

  return <EditExerciseForm exercise={exercise} />
}
