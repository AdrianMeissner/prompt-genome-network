import { createServerSupabase } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { PLAN_PREISE } from '@/types'

export default async function EinstellungenPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#e8e8f0]">Einstellungen</h1>
        <p className="text-[#6b7280] mt-1">API-Schlüssel, Plan und Kontodaten</p>
      </div>

      {/* Aktueller Plan */}
      <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-[#e8e8f0] mb-4">Dein Plan</h2>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold text-[#e8e8f0] capitalize">
              {profile?.plan ?? 'free'}
            </span>
            <p className="text-sm text-[#6b7280] mt-1">
              {profile?.plan === 'free' && '5 Verbesserungen pro Tag'}
              {profile?.plan === 'pro' && 'Unbegrenzte Verbesserungen + Bibliothek + Genealogie'}
              {profile?.plan === 'team' && 'Alles aus Pro + Team-Features'}
            </p>
          </div>
          {profile?.plan === 'free' && (
            <a
              href="/api/stripe/checkout?plan=pro"
              className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Auf Pro upgraden — 12€/Monat
            </a>
          )}
          {profile?.plan === 'pro' && (
            <a
              href="/api/stripe/checkout?plan=team"
              className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Auf Team upgraden — 39€/Monat
            </a>
          )}
        </div>
      </div>

      {/* Profil */}
      <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-[#e8e8f0] mb-4">Profil</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[#6b7280] uppercase tracking-wider">Name</label>
            <p className="text-[#e8e8f0] mt-1">{profile?.name ?? '—'}</p>
          </div>
          <div>
            <label className="text-xs text-[#6b7280] uppercase tracking-wider">E-Mail</label>
            <p className="text-[#e8e8f0] mt-1">{user.email}</p>
          </div>
          <div>
            <label className="text-xs text-[#6b7280] uppercase tracking-wider">Mitglied seit</label>
            <p className="text-[#e8e8f0] mt-1">
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString('de-DE')
                : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Statistiken */}
      <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-6">
        <h2 className="font-semibold text-[#e8e8f0] mb-4">Nutzungsstatistik</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#0a0a0f] rounded-lg p-4">
            <p className="text-2xl font-bold text-indigo-400">{profile?.prompts_verwendet ?? 0}</p>
            <p className="text-xs text-[#6b7280] mt-1">Prompts verbessert</p>
          </div>
          <div className="bg-[#0a0a0f] rounded-lg p-4">
            <p className="text-2xl font-bold text-indigo-400 capitalize">{profile?.plan ?? 'free'}</p>
            <p className="text-xs text-[#6b7280] mt-1">Aktueller Plan</p>
          </div>
        </div>
      </div>
    </div>
  )
}
