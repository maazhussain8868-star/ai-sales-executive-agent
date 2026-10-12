import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  let cookieStore: Awaited<ReturnType<typeof cookies>> | null = null
  try {
    cookieStore = await cookies()
  } catch {
    // Called outside request scope (e.g. CLI scripts or background tasks)
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore ? cookieStore.getAll() : []
      },
      setAll(cookiesToSet) {
        if (!cookieStore) return
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Ignored in Server Component / non-request
        }
      },
    },
  })
}
