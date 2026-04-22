'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createBrowserSupabase()
      const { error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        setError(error.message === 'Invalid login credentials'
          ? 'Ungültige E-Mail oder Passwort'
          : error.message
        )
        return
      }

      router.push('/builder')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#e8e8f0] mb-2">Willkommen zurück</h1>
          <p className="text-sm text-[#6b7280]">Melde dich bei deinem Konto an</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#e8e8f0] mb-2">
              E-Mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="deine@email.de"
              className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-4 py-3 text-[#e8e8f0] placeholder-[#6b7280] focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#e8e8f0] mb-2">
              Passwort
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-4 py-3 text-[#e8e8f0] placeholder-[#6b7280] focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors"
          >
            {loading ? 'Anmelden...' : 'Anmelden'}
          </button>
        </form>

        <p className="text-center text-sm text-[#6b7280] mt-6">
          Noch kein Konto?{' '}
          <Link href="/register" className="text-indigo-400 hover:text-indigo-300 transition-colors">
            Kostenlos registrieren
          </Link>
        </p>
      </div>
    </div>
  )
}
