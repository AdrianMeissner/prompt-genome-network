'use client'

import { useState } from 'react'
import MutationsEngine from '@/components/MutationsEngine'
import PromptCard from '@/components/PromptCard'
import type { Prompt, Category } from '@/types'

interface BuilderClientProps {
  initialPrompts: Prompt[]
  tageslimit: number | null
  verwendetHeute: number
}

export default function BuilderClient({
  initialPrompts,
  tageslimit,
  verwendetHeute: initialVerwendet,
}: BuilderClientProps) {
  const [prompts, setPrompts] = useState<Prompt[]>(initialPrompts)
  const [verwendetHeute, setVerwendetHeute] = useState(initialVerwendet)
  const [activeTab, setActiveTab] = useState<'builder' | 'meine'>('builder')

  const tageslimitErreicht = tageslimit !== null && verwendetHeute >= tageslimit

  async function handlePromptSpeichern(data: {
    title: string
    text: string
    category: Category
    vektor: number[]
    is_public: boolean
  }) {
    const res = await fetch('/api/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error ?? 'Speichern fehlgeschlagen')
    }

    const { prompt } = await res.json()
    setPrompts((prev) => [prompt, ...prev])
    setVerwendetHeute((v) => v + 1)
  }

  async function handleFeedback(promptId: string, signal: 1 | -1) {
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt_id: promptId, signal }),
    })

    if (!res.ok) return

    const data = await res.json()

    // Prompt in lokaler Liste updaten
    setPrompts((prev) =>
      prev.map((p) =>
        p.id === promptId
          ? {
              ...p,
              vektor: data.neuer_vektor,
              erfolgsrate: data.neue_erfolgsrate,
              nutzungen: p.nutzungen + 1,
            }
          : p
      )
    )
  }

  async function handleKindErzeugen(promptId: string) {
    const res = await fetch('/api/genealogie/kind-erzeugen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parent_id: promptId }),
    })

    if (!res.ok) {
      const err = await res.json()
      alert(err.error ?? 'Kind-Erzeugung fehlgeschlagen')
      return
    }

    const { kind } = await res.json()
    setPrompts((prev) => [kind, ...prev])
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#e8e8f0]">Prompt Builder</h1>
        <p className="text-[#6b7280] mt-1">
          KI-gestützte Analyse und Verbesserung mit Genotyp-Vektor
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-[#12121a] border border-[#1e1e2e] rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('builder')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'builder'
              ? 'bg-indigo-500 text-white'
              : 'text-[#6b7280] hover:text-[#e8e8f0]'
          }`}
        >
          ⚡ Builder
        </button>
        <button
          onClick={() => setActiveTab('meine')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'meine'
              ? 'bg-indigo-500 text-white'
              : 'text-[#6b7280] hover:text-[#e8e8f0]'
          }`}
        >
          🧬 Meine Prompts ({prompts.length})
        </button>
      </div>

      {/* Builder Tab */}
      {activeTab === 'builder' && (
        <MutationsEngine
          onPromptSpeichern={handlePromptSpeichern}
          tageslimitErreicht={tageslimitErreicht}
          verwendetHeute={verwendetHeute}
          tageslimit={tageslimit}
        />
      )}

      {/* Meine Prompts Tab */}
      {activeTab === 'meine' && (
        <div>
          {prompts.length === 0 ? (
            <div className="text-center py-20 text-[#6b7280]">
              <div className="text-5xl mb-4">🧬</div>
              <p className="font-medium text-[#e8e8f0]">Noch keine Prompts</p>
              <p className="text-sm mt-1">Erstelle deinen ersten Prompt im Builder</p>
              <button
                onClick={() => setActiveTab('builder')}
                className="mt-4 bg-indigo-500 hover:bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Zum Builder
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {prompts.map((prompt) => (
                <PromptCard
                  key={prompt.id}
                  prompt={prompt}
                  showRadar
                  eigenerPrompt
                  onFeedback={(signal) => handleFeedback(prompt.id, signal)}
                  onKindErzeugen={() => handleKindErzeugen(prompt.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
