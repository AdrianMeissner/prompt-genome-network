'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import type { Prompt } from '@/types'

// D3 nur client-seitig laden (kein SSR)
const StammbaumGraph = dynamic(
  () => import('@/components/StammbaumGraph'),
  { ssr: false, loading: () => (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl h-[500px] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
    </div>
  )}
)

interface StammbaumClientProps {
  initialPrompts: Prompt[]
  initialGenealogie: Array<{ parent_id: string; child_id: string; vererbungs_rate: number }>
}

export default function StammbaumClient({ initialPrompts, initialGenealogie }: StammbaumClientProps) {
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null)

  const selectedPrompt = selectedPromptId
    ? initialPrompts.find((p) => p.id === selectedPromptId)
    : null

  const stats = {
    total: initialPrompts.length,
    maxGeneration: Math.max(...initialPrompts.map((p) => p.generation), 0),
    vererbungsLinien: initialGenealogie.length,
    mitKindern: new Set(initialGenealogie.map((g) => g.parent_id)).size,
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#e8e8f0]">Stammbaum</h1>
        <p className="text-[#6b7280] mt-1">
          Visualisierung der Prompt-Genealogie und Vererbungslinien
        </p>
      </div>

      {/* Statistiken */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Gesamt Prompts', wert: stats.total },
          { label: 'Max. Generation', wert: stats.maxGeneration },
          { label: 'Vererbungslinien', wert: stats.vererbungsLinien },
          { label: 'Prompts mit Kindern', wert: stats.mitKindern },
        ].map((s) => (
          <div key={s.label} className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-4">
            <p className="text-2xl font-bold text-indigo-400">{s.wert}</p>
            <p className="text-xs text-[#6b7280] mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Hinweis wenn keine Genealogie */}
      {initialGenealogie.length === 0 && initialPrompts.length > 0 && (
        <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-5 mb-6">
          <p className="text-sm text-indigo-300">
            <strong>Tipp:</strong> Sobald ein Prompt eine Erfolgsrate von über 85% erreicht,
            kannst du im Builder mit &quot;Kind erzeugen&quot; den Stammbaum aufbauen.
          </p>
        </div>
      )}

      {/* D3 Graph */}
      <StammbaumGraph
        prompts={initialPrompts}
        genealogie={initialGenealogie}
        onNodeClick={setSelectedPromptId}
      />

      {/* Ausgewählter Prompt */}
      {selectedPrompt && (
        <div className="mt-6 bg-[#12121a] border border-indigo-500/30 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-[#e8e8f0]">{selectedPrompt.title}</h3>
              <p className="text-sm text-[#6b7280] mt-1 line-clamp-3">{selectedPrompt.text}</p>
            </div>
            <div className="text-right ml-4 shrink-0">
              <p className="text-xs text-[#6b7280]">Generation {selectedPrompt.generation}</p>
              <p className="text-xs text-indigo-400 mt-1">
                KIS {(selectedPrompt.kollektiver_score * 100).toFixed(0)}
              </p>
              <p className="text-xs text-[#6b7280] mt-1">
                Erfolg {(selectedPrompt.erfolgsrate * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
