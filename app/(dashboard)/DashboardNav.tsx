'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabase'
import type { Plan } from '@/types'

const NAV_ITEMS = [
  { href: '/builder', label: 'Prompt Builder', icon: '⚡', requiresPro: false },
  { href: '/bibliothek', label: 'Bibliothek', icon: '📚', requiresPro: true },
  { href: '/stammbaum', label: 'Stammbaum', icon: '🌳', requiresPro: true },
  { href: '/analytics', label: 'Analytics', icon: '📊', requiresPro: false },
  { href: '/einstellungen', label: 'Einstellungen', icon: '⚙️', requiresPro: false },
]

export default function DashboardNav({ plan }: { plan: Plan }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createBrowserSupabase()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const isPro = plan === 'pro' || plan === 'team'

  return (
    <nav className="flex-1 p-4 space-y-1">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname.startsWith(item.href)
        const isLocked = item.requiresPro && !isPro

        return (
          <Link
            key={item.href}
            href={isLocked ? '/einstellungen' : item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              isActive
                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                : 'text-[#6b7280] hover:text-[#e8e8f0] hover:bg-[#1e1e2e]'
            }`}
          >
            <span className="text-base">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {isLocked && (
              <span className="text-xs bg-[#1e1e2e] text-[#6b7280] px-1.5 py-0.5 rounded">
                Pro
              </span>
            )}
          </Link>
        )
      })}

      <button
        onClick={handleSignOut}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#6b7280] hover:text-red-400 hover:bg-red-500/5 transition-colors w-full mt-4"
      >
        <span className="text-base">🚪</span>
        <span>Abmelden</span>
      </button>
    </nav>
  )
}
