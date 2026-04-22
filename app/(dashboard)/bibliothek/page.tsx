import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import BibliothekClient from './BibliothekClient'

export default async function BibliothekPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Plan prüfen
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  const isPro = profile?.plan === 'pro' || profile?.plan === 'team'

  if (!isPro) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="text-5xl mb-4">📚</div>
        <h2 className="text-2xl font-bold text-[#e8e8f0] mb-2">Pro-Feature</h2>
        <p className="text-[#6b7280] max-w-md mb-6">
          Die öffentliche Bibliothek mit KIS-Ranking ist im Pro-Plan verfügbar.
          Entdecke die besten Prompts der Community.
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

  // Initial-Daten für SSR laden
  const { data: initialPrompts } = await supabase
    .from('prompts')
    .select('*')
    .eq('is_public', true)
    .order('kollektiver_score', { ascending: false })
    .limit(20)

  return <BibliothekClient initialPrompts={initialPrompts ?? []} userId={user.id} />
}
