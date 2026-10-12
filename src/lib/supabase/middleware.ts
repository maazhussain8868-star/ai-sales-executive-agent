import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const isAuthPage = request.nextUrl.pathname.startsWith('/login')
  const isDashboardPage = request.nextUrl.pathname.startsWith('/dashboard')
  const isRootPage = request.nextUrl.pathname === '/'

  // Development fallback session cookie support when Supabase isn't configured
  const devSession = request.cookies.get('ai_sales_admin_session')

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-project-id')) {
    // Local dev mock mode
    if (isDashboardPage && !devSession) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if ((isAuthPage || isRootPage) && devSession) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    if (isRootPage && !devSession) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return response
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (isDashboardPage && !user && !devSession) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if ((isAuthPage || isRootPage) && (user || devSession)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (isRootPage && !user && !devSession) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}
