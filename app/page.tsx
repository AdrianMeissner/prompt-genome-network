import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-[#e8e8f0] flex flex-col">
      {/* Nav */}
      <nav className="border-b border-[#1e1e2e] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">
            PG
          </div>
          <span className="font-semibold text-lg">Prompt Genome</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm text-[#6b7280] hover:text-[#e8e8f0] transition-colors"
          >
            Anmelden
          </Link>
          <Link
            href="/register"
            className="text-sm bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Kostenlos starten
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-[#12121a] border border-[#1e1e2e] rounded-full px-4 py-1.5 text-xs text-indigo-400 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
          Kollektive KI-Intelligenz für Prompts
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-4xl">
          Prompts die sich{' '}
          <span className="text-indigo-400">selbst verbessern</span>
        </h1>

        <p className="text-lg text-[#6b7280] max-w-2xl mb-12">
          Jeder Prompt hat einen mathematischen Genotyp. Durch kollektives Feedback
          mutiert er, lernt und vererbt seine Stärken an neue Generationen.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/register"
            className="bg-indigo-500 hover:bg-indigo-600 text-white px-8 py-4 rounded-xl font-medium text-lg transition-colors"
          >
            Jetzt starten — kostenlos
          </Link>
          <Link
            href="/bibliothek"
            className="bg-[#12121a] hover:bg-[#1e1e2e] border border-[#1e1e2e] text-[#e8e8f0] px-8 py-4 rounded-xl font-medium text-lg transition-colors"
          >
            Bibliothek ansehen
          </Link>
        </div>

        {/* Feature-Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 max-w-5xl w-full text-left">
          {[
            {
              icon: '🧬',
              title: 'Genotyp-Vektor',
              desc: '6 Dimensionen: Klarheit, Spezifität, Struktur, Ton, Kontext-Tiefe, Erfolgsrate. Jeder Prompt hat eine mathematische DNA.',
            },
            {
              icon: '⚡',
              title: 'Mutations-Algorithmus',
              desc: 'P_neu = P_alt + α × signal × gradient. Jedes Feedback verschiebt den Vektor in Richtung Exzellenz.',
            },
            {
              icon: '🌳',
              title: 'Prompt-Genealogie',
              desc: 'Erfolgreiche Prompts (>85% Rate) erzeugen Kinder. 70% Eltern-DNA + 30% Mutation = Evolution.',
            },
            {
              icon: '🏆',
              title: 'Kollektiver Score (KIS)',
              desc: 'Täglich berechnetes Ranking aus Erfolgsrate, Nutzungen, Generations-Tiefe und Community-Votes.',
            },
            {
              icon: '🔍',
              title: 'Vektor-Suche',
              desc: 'Pinecone findet die 5 ähnlichsten Top-Prompts als Referenz für jeden Mutations-Gradienten.',
            },
            {
              icon: '📊',
              title: 'Live Analytics',
              desc: 'Supabase Realtime zeigt Vektor-Entwicklung in Echtzeit. Radar-Charts visualisieren alle 6 Dimensionen.',
            },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-6 hover:border-indigo-500/50 transition-colors"
            >
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-[#6b7280]">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Preise */}
        <div className="mt-24 max-w-4xl w-full">
          <h2 className="text-3xl font-bold mb-12 text-center">Einfache Preise</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: 'Free',
                preis: '0€',
                features: [
                  '5 Verbesserungen/Tag',
                  'Private Prompts',
                  'Basis-Analytics',
                ],
                href: '/register',
                highlight: false,
              },
              {
                name: 'Pro',
                preis: '12€/Monat',
                features: [
                  'Unbegrenzte Verbesserungen',
                  'Öffentliche Bibliothek',
                  'Genealogie-Feature',
                  'Vollständige Analytics',
                ],
                href: '/register',
                highlight: true,
              },
              {
                name: 'Team',
                preis: '39€/Monat',
                features: [
                  'Alles aus Pro',
                  'Geteilte Team-Prompts',
                  'Team-Analytics',
                  'Priority Support',
                ],
                href: '/register',
                highlight: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl p-6 border ${
                  plan.highlight
                    ? 'bg-indigo-500/10 border-indigo-500'
                    : 'bg-[#12121a] border-[#1e1e2e]'
                }`}
              >
                <div className="font-semibold text-lg mb-1">{plan.name}</div>
                <div className="text-3xl font-bold mb-4">{plan.preis}</div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="text-sm text-[#6b7280] flex items-center gap-2">
                      <span className="text-[#10b981]">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`block text-center py-2 rounded-lg text-sm font-medium transition-colors ${
                    plan.highlight
                      ? 'bg-indigo-500 hover:bg-indigo-600 text-white'
                      : 'bg-[#1e1e2e] hover:bg-[#2a2a3e] text-[#e8e8f0]'
                  }`}
                >
                  Jetzt starten
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1e1e2e] px-6 py-8 text-center text-sm text-[#6b7280]">
        © 2025 Prompt Genome Network
      </footer>
    </main>
  )
}
