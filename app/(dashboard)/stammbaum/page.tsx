import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import StammbaumClient from './StammbaumClient'

export default async function StammbaumPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  const isPro = profile?.plan === 'pro' || profile?.plan === 'team'

  if (!isPro) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="text-5xl mb-4">🌳</div>
        <h2 className="text-2xl font-bold text-[#e8e8f0] mb-2">Genealogie — Pro-Feature</h2>
        <p className="text-[#6b7280] max-w-md mb-6">
          Visualisiere den Stammbaum deiner Prompts und wie sie Eigenschaften vererben.
          Verfügbar ab Pro-Plan.
        </p>
        <a
          href="/api/stripe/checkout?plan=pro"
          className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium transition-colors"
        >
          Auf Pro upgraden — 12€/Monat
        </a>
      </div>
    )
  }

  // Eigene Prompts + ihre Genealogie laden
  const { data: prompts } = await supabase
    .from('prompts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  const promptIds = (prompts ?? []).map((p) => p.id)

  const { data: genealogie } = promptIds.length > 0
    ? await supabase
        .from('genealogie')
        .select('parent_id, child_id, vererbungs_rate')
        .or(`parent_id.in.(${promptIds.join(',')}),child_id.in.(${promptIds.join(',')})`)
    : { data: [] }

  return (
    <StammbaumClient
      initialPrompts={prompts ?? []}
      initialGenealogie={genealogie ?? []}
    />
  )
}
