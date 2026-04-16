import { redirect } from 'next/navigation'

export default async function PlansLibraryPage() {
  redirect('/coach/library?tab=plans')
}
