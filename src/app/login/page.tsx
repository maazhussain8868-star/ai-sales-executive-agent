'use client'

import { useState, useTransition } from 'react'
import { login } from '@/app/auth/actions'
import { ShieldCheck, Mail, Lock, Loader2, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const formData = new FormData(event.currentTarget)

    startTransition(async () => {
      const result = await login(formData)
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 px-4 py-12 text-neutral-100">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-8 shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20 mb-2">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">AI Sales Employee</h1>
          <p className="text-sm text-neutral-400">
            Sign in to access the Sales Brain & Admin Control
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-950/40 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Admin Email
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-500">
                <Mail className="h-4 w-4" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                required
                defaultValue="admin@desynthic.com"
                placeholder="admin@desynthic.com"
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950/80 py-2.5 pl-10 pr-4 text-sm text-neutral-100 placeholder-neutral-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Password
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-500">
                <Lock className="h-4 w-4" />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                defaultValue="password123"
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950/80 py-2.5 pl-10 pr-4 text-sm text-neutral-100 placeholder-neutral-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Sign in
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Development info */}
        <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-3 text-xs text-neutral-400">
          <span className="font-semibold text-neutral-300">Phase 0 Admin Credentials:</span>
          <br />
          Email: <code className="text-blue-400">admin@desynthic.com</code>
          <br />
          Password: <code className="text-blue-400">password123</code>
        </div>
      </div>
    </div>
  )
}
