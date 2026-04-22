'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabase'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (password.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen lang sein')
      setLoading(false)
      return
    }

    try {
      const supabase = createBrowserSupabase()
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${window.location.origin}/builder`,
        },
      })

      if (error) {
        setError(error.message)
        return
      }

      setSuccess(true)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✓</span>
          </div>
          <h2 className="text-xl font-bold text-[#e8e8f0] mb-2">Fast geschafft!</h2>
          <p className="text-sm text-[#6b7280] mb-6">
            Wir haben dir eine Bestätigungs-E-Mail gesendet. Klicke auf den Link um dein Konto zu aktivieren.
          </p>
          <Link
            href="/login"
            className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Zurück zur Anmeldung
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#e8e8f0] mb-2">Konto erstellen</h1>
          <p className="text-sm text-[#6b7280]">Kostenlos starten — keine Kreditkarte nötig</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#e8e8f0] mb-2">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Dein Name"
              className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-4 py-3 text-[#e8e8f0] placeholder-[#6b7280] focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

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
              placeholder="Mindestens 8 Zeichen"
              minLength={8}
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
            {loading ? 'Konto wird erstellt...' : 'Konto erstellen'}
          </button>
        </form>

        <p className="text-center text-xs text-[#6b7280] mt-4">
          Mit der Registrierung stimmst du unseren Nutzungsbedingungen zu.
        </p>

        <p className="text-center text-sm text-[#6b7280] mt-6">
          Bereits ein Konto?{' '}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors">
            Jetzt anmelden
          </Link>
        </p>
      </div>
    </div>
  )
}
