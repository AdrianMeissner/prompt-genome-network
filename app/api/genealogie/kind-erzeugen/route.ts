import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { erzeugeKindVektor, kannVererben, VERERBUNGS_SCHWELLE } from '@/lib/mutations'
import { upsertPromptVektor } from '@/lib/pinecone'
import type { KindErzeugenRequest, KindErzeugenResponse } from '@/types'

/**
 * POST /api/genealogie/kind-erzeugen
 *
 * Erzeugt einen Kind-Prompt aus einem Eltern-Prompt mit hoher Erfolgsrate.
 *
 * Voraussetzung: parent.erfolgsrate > 0.85
 * Kind-Vektor: parent * 0.7 + gauss_mutation * 0.3
 *
 * Entscheidung: Nur Pro/Team-User können Kinder erzeugen.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })
    }

    // Plan prüfen
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single()

    if (profile?.plan === 'free') {
      return NextResponse.json(
        { error: 'Genealogie-Feature erfordert Pro-Plan', upgrade_url: '/einstellungen' },
        { status: 403 }
      )
    }

    const body: KindErzeugenRequest = await request.json()
    const { parent_id } = body

    if (!parent_id) {
      return NextResponse.json({ error: 'parent_id ist erforderlich' }, { status: 400 })
    }

    // Eltern-Prompt laden
    const { data: parent, error: parentError } = await supabase
      .from('prompts')
      .select('*')
      .eq('id', parent_id)
      .single()

    if (parentError || !parent) {
      return NextResponse.json({ error: 'Eltern-Prompt nicht gefunden' }, { status: 404 })
    }

    // Zugriffsrecht prüfen
    if (parent.user_id !== user.id && !parent.is_public) {
      return NextResponse.json({ error: 'Kein Zugriff auf diesen Prompt' }, { status: 403 })
    }

    // Vererbungs-Schwelle prüfen
    if (!kannVererben(parent.erfolgsrate)) {
      return NextResponse.json(
        {
          error: `Eltern-Prompt braucht Erfolgsrate > ${VERERBUNGS_SCHWELLE} (aktuell: ${parent.erfolgsrate.toFixed(2)})`,
        },
        { status: 422 }
      )
    }

    // Kind-Vektor berechnen
    const kindVektor = erzeugeKindVektor(parent.vektor)
    const vektorDiff = kindVektor.map((v, i) => v - (parent.vektor[i] ?? 0))

    // Kind-Prompt in DB erstellen
    const { data: kind, error: kindError } = await supabase
      .from('prompts')
      .insert({
        user_id: user.id,
        title: `${parent.title} (Kind)`,
        text: parent.text, // Wird in Session 3 mit Claude optimiert
        category: parent.category,
        vektor: kindVektor,
        parent_id,
        generation: parent.generation + 1,
        is_public: false, // Kinder starten privat
        erfolgsrate: parent.erfolgsrate * 0.7, // Kinder starten mit 70% der Eltern-Rate
      })
      .select()
      .single()

    if (kindError || !kind) throw kindError

    // Genealogie-Eintrag anlegen
    await supabase.from('genealogie').insert({
      parent_id,
      child_id: kind.id,
      generation: kind.generation,
      vererbungs_rate: 0.7,
    })

    // Vektor-History für Kind
    await supabase.from('vektor_history').insert({
      prompt_id: kind.id,
      vektor: kindVektor,
      trigger_type: 'vererbung',
    })

    // Pinecone indizieren wenn Eltern public
    if (parent.is_public) {
      upsertPromptVektor(kind.id, kindVektor, kind.category, {
        generation: kind.generation,
        parent_id,
      }).catch(console.error)
    }

    const response: KindErzeugenResponse = {
      success: true,
      kind,
      vektor_diff: vektorDiff,
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('[/api/genealogie/kind-erzeugen]', error)
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}
