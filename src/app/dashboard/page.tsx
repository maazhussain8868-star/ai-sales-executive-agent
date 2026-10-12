import Link from 'next/link'
import { logout } from '@/app/auth/actions'
import { getInterviewDataAction, getCompiledBrainAction } from '@/app/actions/brain'
import {
  getActiveWorkspaceAction,
  getWorkspacesAction,
  getDashboardAnalyticsAction,
  getAuditLogsAction,
  getEncryptedApiKeysAction,
} from '@/app/actions/analytics'
import { DashboardTabs } from '@/components/dashboard/DashboardTabs'
import { LogOut, Bot, BrainCircuit, PhoneCall, Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const initialInterviewData = await getInterviewDataAction()
  const initialCompiledBrain = await getCompiledBrainAction()
  const initialWorkspace = await getActiveWorkspaceAction()
  const allWorkspaces = await getWorkspacesAction()
  const initialMetrics = await getDashboardAnalyticsAction(initialWorkspace.id)
  const initialAuditLogs = await getAuditLogsAction(initialWorkspace.id)
  const initialMaskedKeys = await getEncryptedApiKeysAction(initialWorkspace.id)

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/10 text-blue-400 border border-blue-500/20">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-white">AI Sales Employee</span>
                <span className="ml-2 rounded-full bg-blue-950/60 border border-blue-800/40 px-2 py-0.5 text-[10px] font-medium text-blue-400">
                  Desynthic Voice
                </span>
              </div>
            </div>

            {/* Navigation Switcher */}
            <nav className="hidden sm:flex items-center gap-2 text-xs">
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 rounded-lg bg-neutral-800 px-3 py-1.5 text-white font-semibold transition"
              >
                <BrainCircuit className="h-3.5 w-3.5 text-blue-400" />
                Sales Brain
              </Link>
              <Link
                href="/calls"
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-neutral-400 hover:text-white hover:bg-neutral-900 transition"
              >
                <PhoneCall className="h-3.5 w-3.5 text-emerald-400" />
                Calls & Voice Agent
              </Link>
              <Link
                href="/campaigns"
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-neutral-400 hover:text-white hover:bg-neutral-900 transition"
              >
                <Users className="h-3.5 w-3.5" />
                Campaigns & Leads
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-medium text-neutral-200">Admin</span>
              <span className="text-[11px] text-neutral-500">Desynthic</span>
            </div>
            <form action={logout}>
              <button
                type="submit"
                id="logout-button"
                className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-300 transition-colors hover:border-red-900/50 hover:bg-red-950/30 hover:text-red-400 focus:outline-none"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Dashboard Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <DashboardTabs
          initialWorkspace={initialWorkspace}
          allWorkspaces={allWorkspaces}
          initialMetrics={initialMetrics}
          initialAuditLogs={initialAuditLogs}
          initialMaskedKeys={initialMaskedKeys}
          initialInterviewData={initialInterviewData}
          initialCompiledBrain={initialCompiledBrain}
        />
      </main>
    </div>
  )
}
