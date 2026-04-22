'use client'

import { useState, useTransition } from 'react'
import VektorRadar from '@/components/VektorRadar'
import { vektorQualitaet, VEKTOR_LABELS } from '@/lib/mutations'
import { KATEGORIE_LABELS } from '@/types'
import type { Category, VerbessernResponse } from '@/types'

interface MutationsEngineProps {
  onPromptSpeichern: (data: {
    title: string
    text: string
    category: Category
    vektor: number[]
    is_public: boolean
  }) => Promise<void>
  tageslimitErreicht: boolean
  verwendetHeute: number
  tageslimit: number | null
}

const KATEGORIEN: Category[] = ['code', 'writing', 'analysis', 'creative', 'business']

export default function MutationsEngine({
  onPromptSpeichern,
  tageslimitErreicht,
  verwendetHeute,
  tageslimit,
}: MutationsEngineProps) {
  const [titel, setTitel] = useState('')
  const [promptText, setPromptText] = useState('')
  const [kategorie, setKategorie] = useState<Category>('code')
  const [isPublic, setIsPublic] = useState(false)
  const [ergebnis, setErgebnis] = useState<VerbessernResponse | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [speichern, setSpeichern] = useState(false)
  const [gespeichert, setGespeichert] = useState(false)

  // Ursprünglichen Vektor für Vergleich merken
  const [originVektor] = useState<number[] | null>(null)

  async function handleVerbessern() {
    if (!promptText.trim()) return
    setFehler(null)
    setErgebnis(null)
    setGespeichert(false)

    startTransition(async () => {
      try {
        const res = await fetch('/api/prompts/verbessern', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt_text: promptText, kategorie }),
        })

        const data = await res.json()

        if (!res.ok) {
          setFehler(data.error ?? 'Verbesserung fehlgeschlagen')
          return
        }

        setErgebnis(data)
      } catch {
        setFehler('Netzwerkfehler — bitte erneut versuchen')
      }
    })
  }

  async function handleSpeichern() {
    if (!ergebnis || !titel.trim()) return
    setSpeichern(true)
    try {
      const vektorArray = [
        ergebnis.vektor.klarheit,
        ergebnis.vektor.spezifitaet,
        ergebnis.vektor.struktur,
        ergebnis.vektor.ton,
        ergebnis.vektor.kontext_tiefe,
        ergebnis.vektor.erfolgsrate,
      ]

      await onPromptSpeichern({
        title: titel,
        text: ergebnis.verbesserter_prompt,
        category: kategorie,
        vektor: vektorArray,
        is_public: isPublic,
      })
      setGespeichert(true)
    } finally {
      setSpeichern(false)
    }
  }

  const vektorArray = ergebnis
    ? [
        ergebnis.vektor.klarheit,
        ergebnis.vektor.spezifitaet,
        ergebnis.vektor.struktur,
        ergebnis.vektor.ton,
        ergebnis.vektor.kontext_tiefe,
        ergebnis.vektor.erfolgsrate,
      ]
    : null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Linke Spalte: Input */}
      <div className="space-y-5">
        {/* Tageslimit-Anzeige */}
        {tageslimit && (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-[#1e1e2e] rounded-full">
              <div
                className={`h-full rounded-full transition-all ${
                  tageslimitErreicht ? 'bg-red-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${Math.min((verwendetHeute / tageslimit) * 100, 100)}%` }}
              />
            </div>
            <span className="text-xs text-[#6b7280] shrink-0">
              {verwendetHeute}/{tageslimit} heute
            </span>
          </div>
        )}

        {/* Titel */}
        <div>
          <label className="block text-sm font-medium text-[#e8e8f0] mb-2">
            Prompt-Titel
          </label>
          <input
            type="text"
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            placeholder="z.B. Python Code-Review Assistent"
            className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-4 py-3 text-[#e8e8f0] placeholder-[#6b7280] focus:outline-none focus:border-indigo-500 transition-colors text-sm"
          />
        </div>

        {/* Kategorie */}
        <div>
          <label className="block text-sm font-medium text-[#e8e8f0] mb-2">
            Kategorie
          </label>
          <div className="flex flex-wrap gap-2">
            {KATEGORIEN.map((k) => (
              <button
                key={k}
                onClick={() => setKategorie(k)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  kategorie === k
                    ? 'bg-indigo-500 text-white'
                    : 'bg-[#1e1e2e] text-[#6b7280] hover:text-[#e8e8f0]'
                }`}
              >
                {KATEGORIE_LABELS[k]}
              </button>
            ))}
          </div>
        </div>

        {/* Prompt Text */}
        <div>
          <label className="block text-sm font-medium text-[#e8e8f0] mb-2">
            Dein Prompt
          </label>
          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="Füge deinen Prompt hier ein. Claude analysiert alle 6 Dimensionen und generiert eine verbesserte Version..."
            rows={8}
            maxLength={5000}
            className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-4 py-3 text-[#e8e8f0] placeholder-[#6b7280] focus:outline-none focus:border-indigo-500 transition-colors text-sm resize-none font-mono leading-relaxed"
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-[#6b7280]">{promptText.length}/5000 Zeichen</span>
          </div>
        </div>

        {fehler && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400">
            {fehler}
          </div>
        )}

        <button
          onClick={handleVerbessern}
          disabled={isPending || !promptText.trim() || tageslimitErreicht}
          className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Claude analysiert...
            </>
          ) : tageslimitErreicht ? (
            '⚠ Tageslimit erreicht — Upgrade auf Pro'
          ) : (
            '⚡ Mit KI verbessern'
          )}
        </button>
      </div>

      {/* Rechte Spalte: Ergebnis + Radar */}
      <div className="space-y-5">
        {!ergebnis && !isPending && (
          <div className="bg-[#12121a] border border-[#1e1e2e] border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
            <div className="text-5xl mb-4">🧬</div>
            <p className="text-[#6b7280] text-sm">
              Der Genotyp-Vektor erscheint hier nach der Analyse
            </p>
          </div>
        )}

        {isPending && (
          <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-8 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
            <div className="w-12 h-12 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
            <p className="text-[#6b7280] text-sm">Claude analysiert alle 6 Dimensionen...</p>
          </div>
        )}

        {ergebnis && vektorArray && (
          <>
            {/* Vektor Radar */}
            <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-[#e8e8f0]">Genotyp-Vektor</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  vektorQualitaet(vektorArray) === 'hoch'
                    ? 'bg-green-500/10 text-green-400'
                    : vektorQualitaet(vektorArray) === 'mittel'
                    ? 'bg-yellow-500/10 text-yellow-400'
                    : 'bg-red-500/10 text-red-400'
                }`}>
                  {vektorQualitaet(vektorArray)} Qualität
                </span>
              </div>
              <VektorRadar vektor={vektorArray} vergleichsVektor={originVektor ?? undefined} size={240} />

              {/* Dimensionen-Liste */}
              <div className="grid grid-cols-2 gap-2 mt-3">
                {VEKTOR_LABELS.map((label, i) => (
                  <div key={label} className="flex items-center justify-between text-xs">
                    <span className="text-[#6b7280]">{label}</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-1 bg-[#1e1e2e] rounded-full">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${(vektorArray[i] ?? 0) * 100}%` }}
                        />
                      </div>
                      <span className="text-[#e8e8f0] w-8 text-right">
                        {((vektorArray[i] ?? 0) * 100).toFixed(0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Verbesserter Prompt */}
            <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-[#e8e8f0]">Verbesserter Prompt</h3>
                <button
                  onClick={() => navigator.clipboard.writeText(ergebnis.verbesserter_prompt)}
                  className="text-xs text-[#6b7280] hover:text-indigo-400 transition-colors"
                >
                  Kopieren
                </button>
              </div>
              <div className="bg-[#0a0a0f] rounded-lg p-3 text-sm text-[#e8e8f0] font-mono leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                {ergebnis.verbesserter_prompt}
              </div>
            </div>

            {/* Empfehlungen */}
            {ergebnis.empfehlungen.length > 0 && (
              <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5">
                <h3 className="text-sm font-medium text-[#e8e8f0] mb-3">Empfehlungen</h3>
                <ul className="space-y-2">
                  {ergebnis.empfehlungen.map((e, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#6b7280]">
                      <span className="text-indigo-400 shrink-0 mt-0.5">→</span>
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Speichern */}
            <div className="bg-[#12121a] border border-indigo-500/20 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="w-4 h-4 rounded border-[#1e1e2e] bg-[#0a0a0f] accent-indigo-500"
                  />
                  <span className="text-sm text-[#6b7280]">Öffentlich in Bibliothek</span>
                </label>
              </div>

              {gespeichert ? (
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <span>✓</span> Prompt gespeichert!
                </div>
              ) : (
                <button
                  onClick={handleSpeichern}
                  disabled={speichern || !titel.trim()}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
                >
                  {speichern ? 'Speichern...' : !titel.trim() ? 'Bitte Titel eingeben ↑' : '💾 Prompt speichern'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
