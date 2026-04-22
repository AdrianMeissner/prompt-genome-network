/**
 * Browser-seitiger Supabase Client.
 * Nur für 'use client' Komponenten importieren.
 * Verwendet neues PUBLISHABLE_KEY Format (Supabase 2025+).
 */
import { createBrowserClient } from '@supabase/ssr'

export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
