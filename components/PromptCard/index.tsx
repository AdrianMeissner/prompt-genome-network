'use client'

import { useState } from 'react'
import { kisLabel, kisBadgeColor } from '@/lib/kis'
import { vektorQualitaet, VEKTOR_LABELS } from '@/lib/mutations'
import { KATEGORIE_LABELS } from '@/types'
import type { Prompt } from '@/types'
import VektorRadar from '@/components/VektorRadar'

interface PromptCardProps {
  prompt: Prompt
  showRadar?: boolean
  onFeedback?: (signal: 1 | -1) => void
  onKindErzeugen?: () => void
  eigenerPrompt?: boolean
}

export default function PromptCard({
  prompt,
  showRadar = false,
  onFeedback,
  onKindErzeugen,
  eigenerPrompt = false,
}: PromptCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [feedbackGesendet, setFeedbackGesendet] = useState(false)
  const [loading, setLoading] = useState(false)

  const qualitaet = vektorQualitaet(prompt.vektor)
  const kisScore = prompt.kollektiver_score
  const badgeColor = kisBadgeColor(kisScore)
  const kisText = kisLabel(kisScore)

  async function handleFeedback(signal: 1 | -1) {
    if (feedbackGesendet || loading) return
    setLoading(true)
    try {
      await onFeedback?.(signal)
      setFeedbackGesendet(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl overflow-hidden hover:border-indigo-500/30 transition-all duration-200">
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs bg-[#1e1e2e] text-[#6b7280] px-2 py-0.5 rounded">
                {KATEGORIE_LABELS[prompt.category] ?? prompt.category}
              </span>
              <span className="text-xs text-[#6b7280]">Gen. {prompt.generation}</span>
              {prompt.parent_id && (
                <span className="text-xs text-indigo-400">🧬 Kind</span>
              )}
            </div>
            <h3 className="font-semibold text-[#e8e8f0] truncate">{prompt.title}</h3>
          </div>

          {/* KIS Badge */}
          <div className="shrink-0 text-right">
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${badgeColor}`}>
              {kisText}
            </span>
            <p className="text-xs text-[#6b7280] mt-1">
              KIS {(kisScore * 100).toFixed(0)}
            </p>
          </div>
        </div>

        {/* Prompt Text */}
        <p className={`text-sm text-[#6b7280] mt-3 leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}>
          {prompt.text}
        </p>
        {prompt.text.length > 200 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-indigo-400 hover:text-indigo-300 mt-1 transition-colors"
          >
            {expanded ? 'Weniger' : 'Mehr anzeigen'}
          </button>
        )}

        {/* Metriken */}
        <div className="flex items-center gap-4 mt-4 text-xs text-[#6b7280]">
          <span>
            Erfolg: <strong className="text-[#e8e8f0]">{(prompt.erfolgsrate * 100).toFixed(0)}%</strong>
          </span>
          <span>
            Nutzungen: <strong className="text-[#e8e8f0]">{prompt.nutzungen}</strong>
          </span>
          <span>
            Qualität:{' '}
            <strong className={
              qualitaet === 'hoch' ? 'text-green-400' :
              qualitaet === 'mittel' ? 'text-yellow-400' : 'text-red-400'
            }>
              {qualitaet}
            </strong>
          </span>
        </div>
      </div>

      {/* Radar Chart (optional) */}
      {showRadar && (
        <div className="px-5 pb-3 border-t border-[#1e1e2e] pt-4">
          <p className="text-xs text-[#6b7280] mb-2">Genotyp-Vektor</p>
          <VektorRadar vektor={prompt.vektor} size={220} />
        </div>
      )}

      {/* Aktionen */}
      {(onFeedback || onKindErzeugen) && (
        <div className="px-5 py-3 border-t border-[#1e1e2e] flex items-center gap-2">
          {onFeedback && (
            <>
              <button
                onClick={() => handleFeedback(1)}
                disabled={feedbackGesendet || loading}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  feedbackGesendet
                    ? 'bg-green-500/10 text-green-400 cursor-default'
                    : 'bg-[#1e1e2e] hover:bg-green-500/10 hover:text-green-400 text-[#6b7280]'
                }`}
              >
                👍 Gut
              </button>
              <button
                onClick={() => handleFeedback(-1)}
                disabled={feedbackGesendet || loading}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  feedbackGesendet
                    ? 'bg-red-500/10 text-red-400 cursor-default'
                    : 'bg-[#1e1e2e] hover:bg-red-500/10 hover:text-red-400 text-[#6b7280]'
                }`}
              >
                👎 Schlecht
              </button>
            </>
          )}

          {onKindErzeugen && prompt.erfolgsrate >= 0.85 && (
            <button
              onClick={onKindErzeugen}
              className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors"
            >
              🧬 Kind erzeugen
            </button>
          )}
        </div>
      )}
    </div>
  )
}
