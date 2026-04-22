/**
 * Server-seitiger Supabase Client.
 * Nur in Server Components, API Routes und proxy.ts verwenden.
 * Verwendet neues PUBLISHABLE_KEY Format (Supabase 2025+).
 */
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

export async function createServerSupabase() {
  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Server Components können keine Cookies setzen — proxy.ts übernimmt das.
        }
      },
    },
  })
}

/**
 * Admin-Client mit Service Role Key.
 * NUR für serverseitige Batch-Operationen (z.B. KIS Cron).
 */
export function createAdminSupabase() {
  return createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
