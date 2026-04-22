import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { analysierePrompt, verbesserePrompt } from '@/lib/anthropic'
import { vektorToArray } from '@/lib/mutations'
import { PLAN_LIMITS } from '@/types'
import type { VerbessernRequest, VerbessernResponse } from '@/types'

/**
 * POST /api/prompts/verbessern
 *
 * Analysiert einen Prompt mit Claude und gibt:
 * - Verbesserte Version zurück
 * - 6D-Genotyp-Vektor (KI-Schätzung)
 * - Konkrete Verbesserungsempfehlungen
 *
 * Rate-Limiting: Free-User haben 5 Anfragen/Tag
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })
    }

    const body: VerbessernRequest = await request.json()
    const { prompt_text, kategorie } = body

    if (!prompt_text?.trim() || !kategorie) {
      return NextResponse.json(
        { error: 'prompt_text und kategorie sind erforderlich' },
        { status: 400 }
      )
    }

    if (prompt_text.length > 5000) {
      return NextResponse.json(
        { error: 'Prompt darf maximal 5000 Zeichen lang sein' },
        { status: 400 }
      )
    }

    // Plan und Nutzungslimit prüfen
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, prompts_verwendet')
      .eq('id', user.id)
      .single()

    const plan = profile?.plan ?? 'free'
    const limit = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS].verbesserungen_pro_tag

    // Tagesnutzung prüfen (Free-User)
    if (limit !== Infinity) {
      // Zähle heutige API-Nutzungen (vereinfacht: Gesamt-Counter)
      // Entscheidung: Tages-Reset erfolgt täglich via Cron (Session 5)
      // Vorerst: Gesamt-Limit als Proxy
      if ((profile?.prompts_verwendet ?? 0) >= limit * 7) {
        return NextResponse.json(
          {
            error: 'Tageslimit erreicht. Upgrade auf Pro für unbegrenzte Verbesserungen.',
            upgrade_url: '/einstellungen',
          },
          { status: 429 }
        )
      }
    }

    // Parallel: Prompt analysieren UND verbessern
    const [vektor, verbesserung] = await Promise.all([
      analysierePrompt(prompt_text, kategorie),
      verbesserePrompt(prompt_text, kategorie),
    ])

    // Nutzungszähler inkrementieren
    await supabase
      .from('profiles')
      .update({ prompts_verwendet: (profile?.prompts_verwendet ?? 0) + 1 })
      .eq('id', user.id)

    const response: VerbessernResponse = {
      verbesserter_prompt: verbesserung.verbesserter_prompt,
      vektor,
      empfehlungen: verbesserung.empfehlungen,
      erklaerung: verbesserung.erklaerung,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[/api/prompts/verbessern]', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
