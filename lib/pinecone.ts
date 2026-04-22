/**
 * PROMPT GENOME NETWORK — Pinecone Vektor-Datenbank
 *
 * Index: 6 Dimensionen, cosine similarity
 * Für jede Suche: finde die 5 ähnlichsten Prompts als Referenz
 * für den Mutations-Gradienten
 *
 * Entscheidung: Pinecone Serverless (keine Server-Verwaltung)
 * Namespace-Strategie: pro Kategorie ein Namespace für bessere
 * Isolation und schnellere Suche
 */

import { Pinecone } from '@pinecone-database/pinecone'
import type { Category } from '@/types'

let pineconeClient: Pinecone | null = null

function getPinecone(): Pinecone {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    })
  }
  return pineconeClient
}

const INDEX_NAME = process.env.PINECONE_INDEX_NAME ?? 'prompt-genome-network'

/**
 * Sucht die N ähnlichsten Prompts zur Berechnung des Mutations-Gradienten.
 * Gibt die Prompt-IDs und ihre Vektoren zurück.
 */
export async function sucheAehnlichePrompts(
  vektor: number[],
  kategorie: Category,
  topK = 5
): Promise<Array<{ id: string; vektor: number[]; score: number }>> {
  const pc = getPinecone()
  const index = pc.index(INDEX_NAME).namespace(kategorie)

  const result = await index.query({
    vector: vektor,
    topK,
    includeValues: true,
  })

  return (result.matches ?? [])
    .filter((m) => m.values && m.values.length === 6)
    .map((m) => ({
      id: m.id,
      vektor: m.values!,
      score: m.score ?? 0,
    }))
}

/**
 * Speichert oder aktualisiert einen Prompt-Vektor in Pinecone.
 */
export async function upsertPromptVektor(
  promptId: string,
  vektor: number[],
  kategorie: Category,
  metadata?: Record<string, string | number | boolean>
): Promise<void> {
  const pc = getPinecone()
  const index = pc.index(INDEX_NAME).namespace(kategorie)

  await index.upsert({
    records: [
      {
        id: promptId,
        values: vektor,
        metadata: {
          kategorie,
          ...metadata,
        },
      },
    ],
  })
}

/**
 * Löscht einen Prompt-Vektor aus Pinecone (z.B. bei Prompt-Löschung).
 */
export async function loeschePromptVektor(
  promptId: string,
  kategorie: Category
): Promise<void> {
  const pc = getPinecone()
  const index = pc.index(INDEX_NAME).namespace(kategorie)
  await index.deleteOne({ id: promptId })
}

/**
 * Findet den besten Prompt in einer Kategorie als Referenz für den Gradienten.
 * "Bester" = höchste erfolgsrate (Metadaten-Filter).
 *
 * Entscheidung: Wir suchen nach dem Vektor der einem "perfekten" Prompt
 * am nächsten kommt [1,1,1,1,1,1] um immer einen sinnvollen Gradienten zu haben,
 * auch wenn kein echter bester Prompt existiert.
 */
export async function findeBestenPrompt(
  kategorie: Category
): Promise<number[] | null> {
  const pc = getPinecone()
  const index = pc.index(INDEX_NAME).namespace(kategorie)

  // Idealer Vektor = [1,1,1,1,1,1]
  const idealerVektor = [1, 1, 1, 1, 1, 1]

  const result = await index.query({
    vector: idealerVektor,
    topK: 1,
    includeValues: true,
  })

  const match = result.matches?.[0]
  if (!match?.values || match.values.length !== 6) return null

  return match.values
}
