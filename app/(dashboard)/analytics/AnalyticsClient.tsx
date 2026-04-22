'use client'

import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import VektorRadar from '@/components/VektorRadar'
import { VEKTOR_LABELS } from '@/lib/mutations'
import { kisLabel, kisBadgeColor } from '@/lib/kis'
import { KATEGORIE_LABELS } from '@/types'

interface AnalyticsClientProps {
  prompts: Array<{
    id: string
    title: string
    vektor: number[]
    erfolgsrate: number
    nutzungen: number
    kollektiver_score: number
    generation: number
    category: string
  }>
  vektorHistory: Array<{
    prompt_id: string
    vektor: number[]
    trigger_type: string
    created_at: string
  }>
}

const DIMENSION_FARBEN = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6']

export default function AnalyticsClient({ prompts, vektorHistory }: AnalyticsClientProps) {
  const [selectedPromptId, setSelectedPromptId] = useState<string>(prompts[0]?.id ?? '')

  const selectedPrompt = prompts.find((p) => p.id === selectedPromptId)
  const selectedHistory = vektorHistory.filter((h) => h.prompt_id === selectedPromptId)

  // Linien-Chart Daten: Entwicklung jeder Dimension über Zeit
  const chartDaten = selectedHistory.map((h, i) => {
    const entry: Record<string, string | number> = {
      index: i + 1,
      trigger: h.trigger_type,
    }
    VEKTOR_LABELS.forEach((label, j) => {
      entry[label] = Math.round((h.vektor[j] ?? 0) * 100)
    })
    return entry
  })

  // Gesamt-Statistiken
  const gesamtNutzungen = prompts.reduce((s, p) => s + p.nutzungen, 0)
  const avgKis = prompts.length > 0
    ? prompts.reduce((s, p) => s + p.kollektiver_score, 0) / prompts.length
    : 0
  const maxGeneration = Math.max(...prompts.map((p) => p.generation), 0)
  const bestErfolgsrate = Math.max(...prompts.map((p) => p.erfolgsrate), 0)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#e8e8f0]">Analytics</h1>
        <p className="text-[#6b7280] mt-1">Vektor-Entwicklung und KIS-Verlauf</p>
      </div>

      {/* Übersichts-Kacheln */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Gesamt Nutzungen', wert: gesamtNutzungen.toLocaleString() },
          { label: 'Ø KIS Score', wert: (avgKis * 100).toFixed(1) },
          { label: 'Tiefste Generation', wert: maxGeneration },
          { label: 'Beste Erfolgsrate', wert: `${(bestErfolgsrate * 100).toFixed(0)}%` },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-4">
            <p className="text-2xl font-bold text-indigo-400">{stat.wert}</p>
            <p className="text-xs text-[#6b7280] mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {prompts.length === 0 ? (
        <div className="text-center py-20 text-[#6b7280]">
          <div className="text-5xl mb-4">📊</div>
          <p className="text-[#e8e8f0] font-medium">Noch keine Analytics</p>
          <p className="text-sm mt-1">Erstelle Prompts und sammle Feedback um Daten zu sehen</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Linke Spalte: Prompt-Liste */}
          <div>
            <h2 className="text-sm font-medium text-[#6b7280] uppercase tracking-wider mb-3">
              Deine Prompts
            </h2>
            <div className="space-y-2">
              {prompts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPromptId(p.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-colors ${
                    selectedPromptId === p.id
                      ? 'bg-indigo-500/10 border-indigo-500/50 text-[#e8e8f0]'
                      : 'bg-[#12121a] border-[#1e1e2e] text-[#6b7280] hover:border-indigo-500/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">{p.title}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ml-2 shrink-0 ${kisBadgeColor(p.kollektiver_score)}`}>
                      {(p.kollektiver_score * 100).toFixed(0)}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-1 text-xs">
                    <span>{KATEGORIE_LABELS[p.category as keyof typeof KATEGORIE_LABELS]}</span>
                    <span>·</span>
                    <span>Gen. {p.generation}</span>
                    <span>·</span>
                    <span>{p.nutzungen}× genutzt</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Rechte Spalte: Details */}
          <div className="xl:col-span-2 space-y-6">
            {selectedPrompt && (
              <>
                {/* Aktueller Vektor-Radar */}
                <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-[#e8e8f0]">Aktueller Genotyp-Vektor</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${kisBadgeColor(selectedPrompt.kollektiver_score)}`}>
                      {kisLabel(selectedPrompt.kollektiver_score)}
                    </span>
                  </div>
                  <VektorRadar vektor={selectedPrompt.vektor} size={260} />
                </div>

                {/* Vektor-Entwicklung über Zeit */}
                {chartDaten.length > 1 && (
                  <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5">
                    <h3 className="font-medium text-[#e8e8f0] mb-4">
                      Vektor-Entwicklung ({chartDaten.length} Mutationen)
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={chartDaten}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                        <XAxis
                          dataKey="index"
                          tick={{ fill: '#6b7280', fontSize: 10 }}
                          label={{ value: 'Mutation', position: 'bottom', fill: '#6b7280', fontSize: 10 }}
                        />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fill: '#6b7280', fontSize: 10 }}
                          tickFormatter={(v) => `${v}%`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#12121a',
                            border: '1px solid #1e1e2e',
                            borderRadius: '8px',
                            color: '#e8e8f0',
                            fontSize: '12px',
                          }}
                          formatter={(v) => [`${v}%`]}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: '10px', color: '#6b7280' }}
                        />
                        {VEKTOR_LABELS.map((label, i) => (
                          <Line
                            key={label}
                            type="monotone"
                            dataKey={label}
                            stroke={DIMENSION_FARBEN[i]}
                            strokeWidth={1.5}
                            dot={false}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {chartDaten.length <= 1 && (
                  <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5 text-center text-[#6b7280]">
                    <p className="text-sm">
                      Sammle mehr Feedback um den Mutations-Verlauf zu sehen
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
