import Link from 'next/link'
import { logout } from '@/app/auth/actions'
import {
  getLeadsAction,
  getCampaignsAction,
  getAppointmentsAction,
} from '@/app/actions/campaign'
import { CampaignManager } from '@/components/campaign/CampaignManager'
import { Bot, LogOut, PhoneCall, BrainCircuit, Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function CampaignsPage() {
  const leads = await getLeadsAction()
  const campaigns = await getCampaignsAction()
  const appointments = await getAppointmentsAction()

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      {/* Top Header */}
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
                  Phase 4: Campaigns & Leads
                </span>
              </div>
            </div>

            {/* Navigation Switcher */}
            <nav className="hidden sm:flex items-center gap-2 text-xs">
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-neutral-400 hover:text-white hover:bg-neutral-900 transition"
              >
                <BrainCircuit className="h-3.5 w-3.5" />
                Sales Brain
              </Link>
              <Link
                href="/calls"
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-neutral-400 hover:text-white hover:bg-neutral-900 transition"
              >
                <PhoneCall className="h-3.5 w-3.5" />
                Calls & Audio
              </Link>
              <Link
                href="/campaigns"
                className="flex items-center gap-1.5 rounded-lg bg-neutral-800/80 px-3 py-1.5 font-medium text-white shadow-sm border border-neutral-700/50"
              >
                <Users className="h-3.5 w-3.5 text-blue-400" />
                Campaigns & Leads
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <form action={logout}>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-400 hover:bg-neutral-800 hover:text-white transition"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8">
        <CampaignManager
          initialLeads={leads}
          initialCampaigns={campaigns}
          initialAppointments={appointments}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 bg-neutral-950 py-4 text-center text-xs text-neutral-600">
        AI Sales Employee • Safe Outbound Calling (10:00-18:00 IST) • DND Guard Active
      </footer>
    </div>
  )
}
