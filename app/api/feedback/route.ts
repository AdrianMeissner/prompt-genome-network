import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { mutiere, berechneGradient, aktualisiereErfolgsrate, kannVererben, arrayToVektor } from '@/lib/mutations'
import { findeBestenPrompt, upsertPromptVektor } from '@/lib/pinecone'
import type { FeedbackRequest, FeedbackResponse } from '@/types'

/**
 * POST /api/feedback
 *
 * Kern-Endpunkt: Nimmt Nutzer-Feedback entgegen und mutiert den Prompt-Vektor.
 *
 * Ablauf:
 * 1. Auth prüfen
 * 2. Prompt aus DB laden
 * 3. Besten Referenz-Prompt aus Pinecone holen (für Gradienten)
 * 4. Vektor mutieren: P_neu = P_alt + α * signal * gradient
 * 5. Erfolgsrate aktualisieren
 * 6. Vektor in Supabase + Pinecone updaten
 * 7. Vektor-History speichern (für Analytics)
 * 8. Prüfen ob Vererbung möglich
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })
    }

    const body: FeedbackRequest = await request.json()
    const { prompt_id, signal, kontext } = body

    if (!prompt_id || !signal || (signal !== 1 && signal !== -1)) {
      return NextResponse.json(
        { error: 'Ungültige Anfrage: prompt_id und signal (1 oder -1) erforderlich' },
        { status: 400 }
      )
    }

    // Prompt aus DB laden
    const { data: prompt, error: promptError } = await supabase
      .from('prompts')
      .select('*')
      .eq('id', prompt_id)
      .single()

    if (promptError || !prompt) {
      return NextResponse.json({ error: 'Prompt nicht gefunden' }, { status: 404 })
    }

    // Feedback speichern (unique constraint verhindert doppelte Votes)
    const { error: feedbackError } = await supabase
      .from('feedback')
      .insert({
        prompt_id,
        user_id: user.id,
        signal,
        kontext: kontext ?? null,
      })

    if (feedbackError) {
      // Unique constraint = bereits gevoted
      if (feedbackError.code === '23505') {
        return NextResponse.json(
          { error: 'Du hast diesen Prompt bereits bewertet' },
          { status: 409 }
        )
      }
      throw feedbackError
    }

    // Besten Referenz-Prompt aus Pinecone holen
    // Fallback: idealer Vektor [1,1,1,1,1,1] wenn kein Pinecone-Eintrag
    const referenzVektor = await findeBestenPrompt(prompt.category).catch(() => null)
    const gradientReferenz = referenzVektor ?? [1, 1, 1, 1, 1, 1]

    // Mutations-Algorithmus anwenden
    const alterVektor: number[] = prompt.vektor
    const gradient = berechneGradient(alterVektor, gradientReferenz)
    const neuerVektor = mutiere(alterVektor, signal, gradient)
    const neueErfolgsrate = aktualisiereErfolgsrate(prompt.erfolgsrate, signal)

    // Prompt in Supabase updaten
    await supabase
      .from('prompts')
      .update({
        vektor: neuerVektor,
        erfolgsrate: neueErfolgsrate,
        nutzungen: prompt.nutzungen + 1,
      })
      .eq('id', prompt_id)

    // Vektor-History speichern (asynchron, kein Await nötig)
    supabase.from('vektor_history').insert({
      prompt_id,
      vektor: neuerVektor,
      trigger_type: 'feedback',
    }).then(() => {})

    // Pinecone updaten (nur für öffentliche Prompts)
    if (prompt.is_public) {
      upsertPromptVektor(prompt_id, neuerVektor, prompt.category, {
        erfolgsrate: neueErfolgsrate,
        nutzungen: prompt.nutzungen + 1,
      }).catch(console.error)
    }

    const response: FeedbackResponse = {
      success: true,
      neuer_vektor: neuerVektor,
      neue_erfolgsrate: neueErfolgsrate,
      vererbung_moeglich: kannVererben(neueErfolgsrate),
      message: signal === 1
        ? 'Daumen hoch gespeichert — Vektor verbessert!'
        : 'Daumen runter gespeichert — Vektor angepasst.',
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[/api/feedback]', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
