import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import AnalyticsClient from './AnalyticsClient'

export default async function AnalyticsPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Eigene Prompts + Vektor-History
  const { data: prompts } = await supabase
    .from('prompts')
    .select('id, title, vektor, erfolgsrate, nutzungen, kollektiver_score, generation, category')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  // Vektor-History für die ersten 3 Prompts laden
  const topPromptIds = (prompts ?? []).slice(0, 3).map((p) => p.id)

  const { data: vektorHistory } = topPromptIds.length > 0
    ? await supabase
        .from('vektor_history')
        .select('prompt_id, vektor, trigger_type, created_at')
        .in('prompt_id', topPromptIds)
        .order('created_at', { ascending: true })
        .limit(100)
    : { data: [] }

  return (
    <AnalyticsClient
      prompts={prompts ?? []}
      vektorHistory={vektorHistory ?? []}
    />
  )
}
