/**
 * PROMPT GENOME NETWORK — Kollektiver Intelligenz Score (KIS)
 *
 * KIS wird täglich per Cron Job für alle öffentlichen Prompts berechnet.
 *
 * Formel:
 * KIS = (erfolgsrate * 0.4) + (nutzungen_norm * 0.3) +
 *       (generations_tiefe_norm * 0.2) + (community_votes_norm * 0.1)
 */

import type { Prompt } from '@/types'

interface KisInput {
  erfolgsrate: number
  nutzungen: number
  generation: number
  positiveVotes: number
  negativeVotes: number
  // Normalisierungswerte aus dem Gesamtpool
  maxNutzungen: number
  maxGeneration: number
  maxVotes: number
}

/**
 * Berechnet den KIS für einen einzelnen Prompt.
 * Alle Teilscores werden auf [0, 1] normalisiert.
 */
export function berechneKis(input: KisInput): number {
  const {
    erfolgsrate,
    nutzungen,
    generation,
    positiveVotes,
    negativeVotes,
    maxNutzungen,
    maxGeneration,
    maxVotes,
  } = input

  // Normalisierte Teilscores
  const nutzungenNorm =
    maxNutzungen > 0 ? Math.min(nutzungen / maxNutzungen, 1.0) : 0
  const generationsNorm =
    maxGeneration > 0 ? Math.min(generation / maxGeneration, 1.0) : 0
  const totalVotes = positiveVotes + negativeVotes
  const communityVotesNorm =
    maxVotes > 0 && totalVotes > 0
      ? (positiveVotes / totalVotes) * Math.min(totalVotes / maxVotes, 1.0)
      : 0

  const kis =
    erfolgsrate * 0.4 +
    nutzungenNorm * 0.3 +
    generationsNorm * 0.2 +
    communityVotesNorm * 0.1

  return Math.max(0.0, Math.min(1.0, kis))
}

/**
 * Batch-Berechnung des KIS für eine Liste von Prompts.
 * Normalisierungswerte werden aus dem Pool selbst abgeleitet.
 *
 * Gibt ein Map von prompt_id → neuer KIS zurück.
 */
export function berechneKisBatch(
  prompts: Prompt[],
  feedbackCounts: Map<string, { positiv: number; negativ: number }>
): Map<string, number> {
  if (prompts.length === 0) return new Map()

  // Normalisierungswerte aus Pool berechnen
  const maxNutzungen = Math.max(...prompts.map((p) => p.nutzungen), 1)
  const maxGeneration = Math.max(...prompts.map((p) => p.generation), 1)
  const maxVotes = Math.max(
    ...Array.from(feedbackCounts.values()).map((f) => f.positiv + f.negativ),
    1
  )

  const result = new Map<string, number>()

  for (const prompt of prompts) {
    const votes = feedbackCounts.get(prompt.id) ?? { positiv: 0, negativ: 0 }
    const kis = berechneKis({
      erfolgsrate: prompt.erfolgsrate,
      nutzungen: prompt.nutzungen,
      generation: prompt.generation,
      positiveVotes: votes.positiv,
      negativeVotes: votes.negativ,
      maxNutzungen,
      maxGeneration,
      maxVotes,
    })
    result.set(prompt.id, kis)
  }

  return result
}

/**
 * Konvertiert einen KIS-Wert in ein lesbares Label.
 */
export function kisLabel(score: number): string {
  if (score >= 0.9) return 'Legendary'
  if (score >= 0.75) return 'Elite'
  if (score >= 0.6) return 'Advanced'
  if (score >= 0.4) return 'Developing'
  return 'Emerging'
}

/**
 * Gibt die Farbe für einen KIS-Badge zurück (Tailwind-Klassen).
 */
export function kisBadgeColor(score: number): string {
  if (score >= 0.9) return 'bg-yellow-500 text-yellow-950'
  if (score >= 0.75) return 'bg-purple-500 text-white'
  if (score >= 0.6) return 'bg-blue-500 text-white'
  if (score >= 0.4) return 'bg-green-500 text-white'
  return 'bg-gray-500 text-white'
}
