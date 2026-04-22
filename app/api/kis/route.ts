import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase-server'
import { berechneKisBatch } from '@/lib/kis'
import type { Prompt } from '@/types'

/**
 * POST /api/kis
 *
 * Cron-Job Endpunkt: Berechnet den KIS für alle öffentlichen Prompts neu.
 * Wird täglich um 03:00 UTC von Vercel Cron aufgerufen.
 *
 * Sicherheit: CRON_SECRET Header erforderlich
 *
 * Entscheidung: Admin-Client ohne RLS für Batch-Updates.
 * Chunk-Size: 100 Prompts pro Batch für Memory-Effizienz.
 */
export async function POST(request: NextRequest) {
  // Cron-Secret prüfen (Vercel Cron sendet diesen Header)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  const adminSupabase = createAdminSupabase()

  try {
    let totalUpdated = 0
    let offset = 0
    const chunkSize = 100

    while (true) {
      // Chunk öffentlicher Prompts laden
      const { data: prompts, error } = await adminSupabase
        .from('prompts')
        .select('*')
        .eq('is_public', true)
        .range(offset, offset + chunkSize - 1)

      if (error) throw error
      if (!prompts || prompts.length === 0) break

      // Feedback-Counts für diesen Chunk laden
      const promptIds = prompts.map((p: Prompt) => p.id)
      const { data: feedbackData } = await adminSupabase
        .from('feedback')
        .select('prompt_id, signal')
        .in('prompt_id', promptIds)

      // Feedback-Counts aggregieren
      const feedbackCounts = new Map<string, { positiv: number; negativ: number }>()
      for (const f of feedbackData ?? []) {
        const current = feedbackCounts.get(f.prompt_id) ?? { positiv: 0, negativ: 0 }
        if (f.signal === 1) current.positiv++
        else current.negativ++
        feedbackCounts.set(f.prompt_id, current)
      }

      // KIS berechnen
      const kisMap = berechneKisBatch(prompts as Prompt[], feedbackCounts)

      // Batch-Update in Supabase
      const updates = Array.from(kisMap.entries()).map(([id, score]) => ({
        id,
        kollektiver_score: score,
      }))

      // Supabase unterstützt kein Batch-Upsert über ein Array direkt,
      // daher in kleinere Chunks aufteilen
      for (let i = 0; i < updates.length; i += 10) {
        const batch = updates.slice(i, i + 10)
        await Promise.all(
          batch.map((u) =>
            adminSupabase
              .from('prompts')
              .update({ kollektiver_score: u.kollektiver_score })
              .eq('id', u.id)
          )
        )
      }

      // KIS History speichern
      const historyEntries = prompts.map((p: Prompt) => ({
        prompt_id: p.id,
        score: kisMap.get(p.id) ?? p.kollektiver_score,
        erfolgsrate: p.erfolgsrate,
        nutzungen: p.nutzungen,
        berechnet_am: new Date().toISOString().split('T')[0],
      }))

      await adminSupabase.from('kis_history').upsert(historyEntries, {
        onConflict: 'prompt_id,berechnet_am',
      })

      totalUpdated += prompts.length
      offset += chunkSize

      if (prompts.length < chunkSize) break
    }

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      total_updated: totalUpdated,
      duration_ms: duration,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[/api/kis]', error)
    return NextResponse.json({ error: 'KIS-Berechnung fehlgeschlagen' }, { status: 500 })
  }
}
