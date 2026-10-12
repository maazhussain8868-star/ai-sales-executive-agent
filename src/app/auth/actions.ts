'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const email = (formData.get('email') as string)?.trim()
  const password = (formData.get('password') as string)?.trim()

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const cookieStore = await cookies()

  // If Supabase credentials are missing or default placeholder, use local admin credentials
  const isMockMode = !supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-project-id')

  if (isMockMode) {
    const defaultAdminEmail = (process.env.ADMIN_EMAIL || 'admin@desynthic.com').toLowerCase()
    const defaultAdminPassword = process.env.ADMIN_PASSWORD || 'password123'

    if (email.toLowerCase() === defaultAdminEmail && password === defaultAdminPassword) {
      cookieStore.set('ai_sales_admin_session', JSON.stringify({ email, role: 'admin', loggedInAt: new Date().toISOString() }), {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })

      revalidatePath('/', 'layout')
      redirect('/dashboard')
    } else {
      return { error: `Invalid credentials. For local dev mode, use ${defaultAdminEmail} / ${defaultAdminPassword}` }
    }
  }

  // Real Supabase Auth
  const supabase = await createClient()
  if (!supabase) {
    return { error: 'Failed to initialize Supabase client.' }
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete('ai_sales_admin_session')

  const supabase = await createClient()
  if (supabase) {
    await supabase.auth.signOut()
  }

  revalidatePath('/', 'layout')
  redirect('/login')
}
