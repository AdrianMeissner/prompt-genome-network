/**
 * PROMPT GENOME NETWORK — Mutations-Algorithmus
 *
 * Kern des Systems: Berechnet wie ein Prompt-Vektor nach
 * Feedback mutiert und wie Kinder-Vektoren erzeugt werden.
 *
 * Mathematisches Modell:
 * P_neu = P_alt + α * feedback_signal * gradient
 * α = 0.05 (Lernrate)
 * feedback_signal: +1 (👍) oder -1 (👎)
 * gradient = normalisierter Differenzvektor zum besten Prompt
 */

import type { GenotypVektor, FeedbackSignal } from '@/types'

/** Lernrate α — wie stark ein einzelnes Feedback den Vektor verschiebt */
const LERNRATE = 0.05

/** Vererbungsrate — wie viel Prozent des Eltern-Vektors das Kind erbt */
const VERERBUNGS_RATE = 0.7

/** Schwellwert für Vererbungsberechtigung */
export const VERERBUNGS_SCHWELLE = 0.85

/**
 * Konvertiert ein Float-Array [0..5] in ein typisiertes GenotypVektor-Objekt.
 */
export function arrayToVektor(arr: number[]): GenotypVektor {
  return {
    klarheit: arr[0] ?? 0.5,
    spezifitaet: arr[1] ?? 0.5,
    struktur: arr[2] ?? 0.5,
    ton: arr[3] ?? 0.5,
    kontext_tiefe: arr[4] ?? 0.5,
    erfolgsrate: arr[5] ?? 0.5,
  }
}

/**
 * Konvertiert ein GenotypVektor-Objekt in ein Float-Array.
 */
export function vektorToArray(v: GenotypVektor): number[] {
  return [v.klarheit, v.spezifitaet, v.struktur, v.ton, v.kontext_tiefe, v.erfolgsrate]
}

/**
 * Berechnet den normierten Gradient-Vektor zwischen aktuellem Prompt
 * und dem besten Referenz-Prompt in der Kategorie.
 *
 * gradient = (bester_vektor - aktueller_vektor) / |bester_vektor - aktueller_vektor|
 */
export function berechneGradient(
  aktuell: number[],
  bester: number[]
): number[] {
  const diff = aktuell.map((v, i) => (bester[i] ?? 0.5) - v)
  const magnitude = Math.sqrt(diff.reduce((sum, d) => sum + d * d, 0))

  // Wenn Magnitude ~0 (Vektoren fast identisch), gib Null-Vektor zurück
  if (magnitude < 1e-10) {
    return new Array(6).fill(0)
  }

  return diff.map((d) => d / magnitude)
}

/**
 * Wendet die Mutations-Formel an:
 * P_neu = P_alt + α * signal * gradient
 *
 * Alle Werte werden auf [0.0, 1.0] geclampt.
 */
export function mutiere(
  vektor: number[],
  signal: FeedbackSignal,
  gradient: number[],
  lernrate = LERNRATE
): number[] {
  return vektor.map((v, i) => {
    const delta = lernrate * signal * (gradient[i] ?? 0)
    return Math.max(0.0, Math.min(1.0, v + delta))
  })
}

/**
 * Aktualisiert die Erfolgsrate basierend auf einem neuen Feedback-Signal.
 *
 * Exponentieller gleitender Durchschnitt mit α=0.1:
 * neue_rate = alte_rate * 0.9 + signal_normalisiert * 0.1
 * signal_normalisiert: +1 → 1.0, -1 → 0.0
 */
export function aktualisiereErfolgsrate(
  aktuell: number,
  signal: FeedbackSignal
): number {
  const alpha = 0.1
  const signalNorm = signal === 1 ? 1.0 : 0.0
  const neu = aktuell * (1 - alpha) + signalNorm * alpha
  return Math.max(0.0, Math.min(1.0, neu))
}

/**
 * Prüft ob ein Prompt die Schwelle für Vererbung erreicht hat.
 */
export function kannVererben(erfolgsrate: number): boolean {
  return erfolgsrate >= VERERBUNGS_SCHWELLE
}

/**
 * Berechnet den Vektor eines Kind-Prompts.
 *
 * kind_vektor = parent_vektor * 0.7 + mutation * 0.3
 *
 * Die Mutation ist ein zufälliger Vektor mit kleiner Gauss-Verteilung
 * um den Eltern-Vektor herum (σ=0.1).
 */
export function erzeugeKindVektor(
  parentVektor: number[],
  vererbungsRate = VERERBUNGS_RATE
): number[] {
  const mutationsRate = 1 - vererbungsRate

  return parentVektor.map((v) => {
    // Gauss-Mutation via Box-Muller Transform
    const u1 = Math.random()
    const u2 = Math.random()
    const gauss = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    const mutation = v + gauss * 0.1

    const kind = v * vererbungsRate + mutation * mutationsRate
    return Math.max(0.0, Math.min(1.0, kind))
  })
}

/**
 * Berechnet wie unterschiedlich zwei Vektoren sind (euklidische Distanz).
 * Nützlich für Analytics und Stammbaum-Visualisierung.
 */
export function vektorDistanz(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, v, i) => sum + Math.pow(v - (b[i] ?? 0), 2), 0))
}

/**
 * Gibt eine lesbare Zusammenfassung der Vektor-Dimensionen zurück.
 * Entscheidung: Labels auf Deutsch für konsistente UI-Sprache.
 */
export const VEKTOR_LABELS = [
  'Klarheit',
  'Spezifität',
  'Struktur',
  'Ton',
  'Kontext-Tiefe',
  'Erfolgsrate',
] as const

/**
 * Bewertet die Qualität eines Vektors mit einem einfachen Score.
 * Wird für schnelle UI-Anzeige genutzt (keine DB-Abfrage nötig).
 */
export function vektorQualitaet(vektor: number[]): 'niedrig' | 'mittel' | 'hoch' {
  const avg = vektor.reduce((sum, v) => sum + v, 0) / vektor.length
  if (avg < 0.4) return 'niedrig'
  if (avg < 0.7) return 'mittel'
  return 'hoch'
}
