import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { upsertPromptVektor } from '@/lib/pinecone'
import type { Category } from '@/types'

/**
 * GET /api/prompts
 * Eigene Prompts des eingeloggten Users laden
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const kategorie = searchParams.get('kategorie') as Category | null
    const limit = parseInt(searchParams.get('limit') ?? '20', 10)
    const offset = parseInt(searchParams.get('offset') ?? '0', 10)

    let query = supabase
      .from('prompts')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (kategorie) {
      query = query.eq('category', kategorie)
    }

    const { data, error, count } = await query

    if (error) throw error

    return NextResponse.json({ prompts: data, total: count })
  } catch (error) {
    console.error('[GET /api/prompts]', error)
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}

/**
 * POST /api/prompts
 * Neuen Prompt erstellen
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })
    }

    const body = await request.json()
    const { title, text, category, vektor, is_public = false } = body

    if (!title?.trim() || !text?.trim() || !category) {
      return NextResponse.json(
        { error: 'title, text und category sind erforderlich' },
        { status: 400 }
      )
    }

    const promptVektor = vektor ?? [0.5, 0.5, 0.5, 0.5, 0.5, 0.5]

    const { data: prompt, error } = await supabase
      .from('prompts')
      .insert({
        user_id: user.id,
        title,
        text,
        category,
        vektor: promptVektor,
        is_public,
      })
      .select()
      .single()

    if (error) throw error

    // Wenn öffentlich: auch in Pinecone indizieren
    if (is_public && prompt) {
      upsertPromptVektor(prompt.id, promptVektor, category).catch(console.error)
    }

    return NextResponse.json({ prompt }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/prompts]', error)
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}
