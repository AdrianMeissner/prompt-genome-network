import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import BuilderClient from './BuilderClient'

export default async function BuilderPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: prompts }, { data: profile }] = await Promise.all([
    supabase
      .from('prompts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('profiles')
      .select('plan, prompts_verwendet')
      .eq('id', user.id)
      .single(),
  ])

  const isPro = profile?.plan === 'pro' || profile?.plan === 'team'
  const tageslimit = isPro ? null : 5
  const verwendetHeute = profile?.prompts_verwendet ?? 0

  return (
    <BuilderClient
      initialPrompts={prompts ?? []}
      tageslimit={tageslimit}
      verwendetHeute={verwendetHeute}
    />
  )
}
