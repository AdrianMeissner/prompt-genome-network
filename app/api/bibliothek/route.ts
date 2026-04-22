import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import type { Category } from '@/types'

/**
 * GET /api/bibliothek
 *
 * Öffentliche Prompts sortiert nach KIS (kollektiver_score).
 * Filter: kategorie, generation, min_erfolgsrate
 * Pagination: 20 pro Seite (offset-basiert)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()

    const { searchParams } = new URL(request.url)
    const kategorie = searchParams.get('kategorie') as Category | null
    const minGeneration = parseInt(searchParams.get('min_generation') ?? '0', 10)
    const minErfolgsrate = parseFloat(searchParams.get('min_erfolgsrate') ?? '0')
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50)
    const offset = parseInt(searchParams.get('offset') ?? '0', 10)

    let query = supabase
      .from('prompts')
      .select(
        `
        id, title, text, category, vektor, erfolgsrate,
        nutzungen, generation, kollektiver_score, parent_id,
        created_at,
        profiles!prompts_user_id_fkey(name)
        `,
        { count: 'exact' }
      )
      .eq('is_public', true)
      .gte('generation', minGeneration)
      .gte('erfolgsrate', minErfolgsrate)
      .order('kollektiver_score', { ascending: false })
      .range(offset, offset + limit - 1)

    if (kategorie) {
      query = query.eq('category', kategorie)
    }

    const { data, error, count } = await query

    if (error) throw error

    return NextResponse.json({
      prompts: data,
      total: count,
      page: Math.floor(offset / limit),
      per_page: limit,
    })
  } catch (error) {
    console.error('[GET /api/bibliothek]', error)
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}
