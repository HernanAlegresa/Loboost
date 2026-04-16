import { redirect } from 'next/navigation'

export default async function ExercisesLibraryPage() {
  redirect('/coach/library?tab=exercises')
}
