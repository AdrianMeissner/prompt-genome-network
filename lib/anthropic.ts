/**
 * PROMPT GENOME NETWORK — Anthropic SDK Integration
 *
 * Verantwortlich für:
 * 1. Prompt-Analyse und Vektor-Extraktion
 * 2. Prompt-Verbesserung mit Claude
 *
 * Modell: claude-sonnet-4-20250514 (wie in Spec definiert)
 * Entscheidung: Prompt Caching aktiviert für System-Prompts
 * da diese bei jeder Anfrage gleich sind → spart ~70% Tokens
 */

import Anthropic from '@anthropic-ai/sdk'
import type { Category, GenotypVektor } from '@/types'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const MODEL = 'claude-sonnet-4-20250514'

const ANALYSE_SYSTEM_PROMPT = `Du bist ein Experte für Prompt Engineering und analysierst Prompts nach 6 Qualitätsdimensionen.

Für jeden Prompt schätzt du Werte zwischen 0.0 und 1.0 für:
1. klarheit: Wie eindeutig und verständlich ist die Anweisung?
2. spezifitaet: Wie präzise und konkret ist der Kontext?
3. struktur: Wie logisch gegliedert ist der Prompt?
4. ton: Wie angemessen ist der Stil für den Zweck?
5. kontext_tiefe: Wie viel Hintergrundwissen wird bereitgestellt?
6. erfolgsrate: Wie wahrscheinlich ist ein hochwertiges Output? (Schätzung)

Antworte NUR mit einem JSON-Objekt. Kein Text davor oder danach.`

/**
 * Analysiert einen Prompt und extrahiert den 6D-Genotyp-Vektor.
 * Nutzt Prompt Caching für den System-Prompt.
 */
export async function analysierePrompt(
  promptText: string,
  kategorie: Category
): Promise<GenotypVektor> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 256,
    system: [
      {
        type: 'text',
        text: ANALYSE_SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' }, // Prompt Caching für System-Prompt
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Analysiere diesen ${kategorie}-Prompt:\n\n"${promptText}"\n\nGib einen JSON-Block zurück: {"klarheit":0.0,"spezifitaet":0.0,"struktur":0.0,"ton":0.0,"kontext_tiefe":0.0,"erfolgsrate":0.0}`,
      },
    ],
  })

  const textContent = response.content.find((c) => c.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('Keine Textantwort von Claude erhalten')
  }

  try {
    // JSON aus Antwort extrahieren (robust gegen Markdown-Blöcke)
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Kein JSON in Antwort gefunden')

    const parsed = JSON.parse(jsonMatch[0])

    return {
      klarheit: clamp(parsed.klarheit ?? 0.5),
      spezifitaet: clamp(parsed.spezifitaet ?? 0.5),
      struktur: clamp(parsed.struktur ?? 0.5),
      ton: clamp(parsed.ton ?? 0.5),
      kontext_tiefe: clamp(parsed.kontext_tiefe ?? 0.5),
      erfolgsrate: clamp(parsed.erfolgsrate ?? 0.5),
    }
  } catch {
    // Fallback: Mittelwerte wenn JSON-Parsing fehlschlägt
    return {
      klarheit: 0.5,
      spezifitaet: 0.5,
      struktur: 0.5,
      ton: 0.5,
      kontext_tiefe: 0.5,
      erfolgsrate: 0.5,
    }
  }
}

const VERBESSER_SYSTEM_PROMPT = `Du bist ein weltklasse Prompt Engineer. Du verbesserst Prompts so, dass sie:
- Klarer und präziser formuliert sind
- Den richtigen Kontext bereitstellen
- Eine logische Struktur haben
- Den optimalen Ton für den Zweck nutzen
- Spezifische, handlungsorientierte Anweisungen geben

Antworte immer mit diesem JSON-Format:
{
  "verbesserter_prompt": "...",
  "empfehlungen": ["...", "..."],
  "erklaerung": "..."
}`

/**
 * Verbessert einen Prompt mit Claude und gibt Empfehlungen zurück.
 * System-Prompt wird gecacht für konsistente Performance.
 */
export async function verbesserePrompt(
  promptText: string,
  kategorie: Category
): Promise<{
  verbesserter_prompt: string
  empfehlungen: string[]
  erklaerung: string
}> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: VERBESSER_SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Verbessere diesen ${kategorie}-Prompt:\n\n"${promptText}"`,
      },
    ],
  })

  const textContent = response.content.find((c) => c.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('Keine Textantwort von Claude erhalten')
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Kein JSON in Antwort gefunden')
  }

  const parsed = JSON.parse(jsonMatch[0])
  return {
    verbesserter_prompt: parsed.verbesserter_prompt ?? promptText,
    empfehlungen: parsed.empfehlungen ?? [],
    erklaerung: parsed.erklaerung ?? '',
  }
}

function clamp(v: number): number {
  return Math.max(0.0, Math.min(1.0, v))
}
