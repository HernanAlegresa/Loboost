import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ActivityConceptsPreview from './activity-concepts-preview'

export default async function ActivityConceptsPreviewPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  return <ActivityConceptsPreview />
}
