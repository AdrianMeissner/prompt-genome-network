'use client'

import { useState, useCallback } from 'react'
import PromptCard from '@/components/PromptCard'
import { KATEGORIE_LABELS } from '@/types'
import type { Prompt, Category } from '@/types'

const KATEGORIEN: Array<{ value: Category | 'alle'; label: string }> = [
  { value: 'alle', label: 'Alle' },
  { value: 'code', label: 'Code' },
  { value: 'writing', label: 'Schreiben' },
  { value: 'analysis', label: 'Analyse' },
  { value: 'creative', label: 'Kreativ' },
  { value: 'business', label: 'Business' },
]

interface BibliothekClientProps {
  initialPrompts: Prompt[]
  userId: string
}

export default function BibliothekClient({ initialPrompts, userId }: BibliothekClientProps) {
  const [prompts, setPrompts] = useState<Prompt[]>(initialPrompts)
  const [aktivKategorie, setAktivKategorie] = useState<Category | 'alle'>('alle')
  const [minErfolgsrate, setMinErfolgsrate] = useState(0)
  const [laden, setLaden] = useState(false)
  const [seite, setSeite] = useState(0)
  const [hatMehr, setHatMehr] = useState(initialPrompts.length === 20)

  const ladePrompts = useCallback(async (
    kategorie: Category | 'alle',
    minRate: number,
    offset = 0,
    append = false
  ) => {
    setLaden(true)
    try {
      const params = new URLSearchParams({
        limit: '20',
        offset: String(offset),
        min_erfolgsrate: String(minRate),
      })
      if (kategorie !== 'alle') params.set('kategorie', kategorie)

      const res = await fetch(`/api/bibliothek?${params}`)
      const data = await res.json()

      setPrompts((prev) => append ? [...prev, ...data.prompts] : data.prompts)
      setHatMehr(data.prompts.length === 20)
    } finally {
      setLaden(false)
    }
  }, [])

  async function handleKategorieWechsel(k: Category | 'alle') {
    setAktivKategorie(k)
    setSeite(0)
    await ladePrompts(k, minErfolgsrate, 0, false)
  }

  async function handleMehrLaden() {
    const naechsteSeite = seite + 1
    setSeite(naechsteSeite)
    await ladePrompts(aktivKategorie, minErfolgsrate, naechsteSeite * 20, true)
  }

  async function handleFeedback(promptId: string, signal: 1 | -1) {
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt_id: promptId, signal }),
    })

    // Lokales Update der Erfolgsrate
    setPrompts((prev) =>
      prev.map((p) =>
        p.id === promptId
          ? { ...p, nutzungen: p.nutzungen + 1 }
          : p
      )
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#e8e8f0]">Bibliothek</h1>
        <p className="text-[#6b7280] mt-1">
          Die besten Prompts der Community, nach KIS-Score gerankt
        </p>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-4 mb-8">
        {/* Kategorie-Filter */}
        <div className="flex gap-1 bg-[#12121a] border border-[#1e1e2e] rounded-xl p-1">
          {KATEGORIEN.map((k) => (
            <button
              key={k.value}
              onClick={() => handleKategorieWechsel(k.value)}
              className={`px-4 py-1.5 rounded-lg text-sm transition-colors ${
                aktivKategorie === k.value
                  ? 'bg-indigo-500 text-white'
                  : 'text-[#6b7280] hover:text-[#e8e8f0]'
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>

        {/* Erfolgsrate-Filter */}
        <div className="flex items-center gap-3 bg-[#12121a] border border-[#1e1e2e] rounded-xl px-4 py-2">
          <span className="text-xs text-[#6b7280]">Min. Erfolg</span>
          <input
            type="range"
            min={0}
            max={90}
            step={10}
            value={minErfolgsrate * 100}
            onChange={(e) => {
              const v = parseInt(e.target.value) / 100
              setMinErfolgsrate(v)
              ladePrompts(aktivKategorie, v, 0, false)
              setSeite(0)
            }}
            className="w-24 accent-indigo-500"
          />
          <span className="text-xs text-[#e8e8f0] w-8">{(minErfolgsrate * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* Prompt-Grid */}
      {laden && prompts.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : prompts.length === 0 ? (
        <div className="text-center py-20 text-[#6b7280]">
          <div className="text-5xl mb-4">📭</div>
          <p className="text-[#e8e8f0] font-medium">Keine Prompts gefunden</p>
          <p className="text-sm mt-1">Versuche andere Filter oder Kategorien</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {prompts.map((prompt) => (
              <PromptCard
                key={prompt.id}
                prompt={prompt}
                showRadar={false}
                onFeedback={(signal) => handleFeedback(prompt.id, signal)}
              />
            ))}
          </div>

          {hatMehr && (
            <div className="flex justify-center mt-8">
              <button
                onClick={handleMehrLaden}
                disabled={laden}
                className="bg-[#12121a] border border-[#1e1e2e] hover:border-indigo-500/50 text-[#e8e8f0] px-6 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                {laden ? 'Laden...' : 'Mehr laden'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
