import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middleware: Auth-Session-Refresh und Route-Schutz.
 *
 * Entscheidung: Middleware refresht Tokens automatisch.
 * Dashboard-Routen erfordern Authentifizierung.
 * API-Routen prüfen Auth individuell.
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Session refreshen (wichtig: vor jeder Route-Prüfung)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  const isDashboardRoute = url.pathname.startsWith('/builder') ||
    url.pathname.startsWith('/bibliothek') ||
    url.pathname.startsWith('/stammbaum') ||
    url.pathname.startsWith('/analytics') ||
    url.pathname.startsWith('/einstellungen')

  const isAuthRoute = url.pathname.startsWith('/login') ||
    url.pathname.startsWith('/register')

  // Nicht eingeloggte User von Dashboard fernhalten
  if (!user && isDashboardRoute) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Eingeloggte User von Auth-Seiten fernhalten
  if (user && isAuthRoute) {
    url.pathname = '/builder'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
