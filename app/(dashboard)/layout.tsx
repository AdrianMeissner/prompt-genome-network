import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase-server'
import DashboardNav from './DashboardNav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Profil laden
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, plan')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex">
      {/* Sidebar */}
      <aside className="w-64 min-h-screen bg-[#12121a] border-r border-[#1e1e2e] flex flex-col fixed left-0 top-0 bottom-0">
        {/* Logo */}
        <div className="p-6 border-b border-[#1e1e2e]">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">
              PG
            </div>
            <span className="font-semibold text-[#e8e8f0]">Prompt Genome</span>
          </Link>
        </div>

        {/* Navigation */}
        <DashboardNav plan={profile?.plan ?? 'free'} />

        {/* User Info */}
        <div className="p-4 border-t border-[#1e1e2e] mt-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-sm font-medium">
              {(profile?.name ?? user.email ?? 'U')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#e8e8f0] truncate">
                {profile?.name ?? 'Nutzer'}
              </p>
              <p className="text-xs text-[#6b7280] capitalize">
                {profile?.plan ?? 'free'} Plan
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 min-h-screen">
        {children}
      </main>
    </div>
  )
}
