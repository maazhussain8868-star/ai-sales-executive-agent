'use client'

import React, { useState, useTransition } from 'react'
import {
  Workspace,
  DashboardMetrics,
  AuditLog,
} from '@/types/analytics'
import {
  switchWorkspaceAction,
  updateRevenueAttributedAction,
  saveEncryptedApiKeyAction,
} from '@/app/actions/analytics'
import {
  Building2,
  DollarSign,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Award,
  Sparkles,
  Mail,
  MessageSquare,
  Lock,
} from 'lucide-react'

interface FounderDashboardProps {
  initialWorkspace: Workspace
  allWorkspaces: Workspace[]
  initialMetrics: DashboardMetrics
  initialAuditLogs: AuditLog[]
  initialMaskedKeys: Record<string, string>
}

export function FounderDashboard({
  initialWorkspace,
  allWorkspaces,
  initialMetrics,
  initialAuditLogs,
  initialMaskedKeys,
}: FounderDashboardProps) {
  const [workspace, setWorkspace] = useState<Workspace>(initialWorkspace)
  const [metrics] = useState<DashboardMetrics>(initialMetrics)
  const [auditLogs] = useState<AuditLog[]>(initialAuditLogs)
  const [maskedKeys, setMaskedKeys] = useState<Record<string, string>>(initialMaskedKeys)

  const [newRevenue, setNewRevenue] = useState<string>(String(workspace.revenueAttributed || 48500))
  const [newApiKey, setNewApiKey] = useState('')
  const [isPending, startTransition] = useTransition()
  const [notice, setNotice] = useState<string | null>(null)

  const isCapReached = workspace.minutesUsed >= workspace.minuteCap
  const capPercent = Math.min(100, Math.round((workspace.minutesUsed / workspace.minuteCap) * 100))

  const handleSwitchWorkspace = (wsId: string) => {
    startTransition(async () => {
      const res = await switchWorkspaceAction(wsId)
      if (res.success && res.workspace) {
        setWorkspace(res.workspace)
        setNotice(`Switched to workspace: ${res.workspace.name}`)
      }
    })
  }

  const handleSaveRevenue = () => {
    const val = parseFloat(newRevenue)
    if (isNaN(val)) return
    startTransition(async () => {
      const res = await updateRevenueAttributedAction(workspace.id, val)
      if (res.success) {
        setWorkspace((prev) => ({ ...prev, revenueAttributed: val }))
        setNotice(`Attributed revenue updated to $${val.toLocaleString()}`)
      }
    })
  }

  const handleSaveKey = () => {
    if (!newApiKey.trim()) return
    startTransition(async () => {
      const res = await saveEncryptedApiKeyAction(workspace.id, 'omnidimension', newApiKey)
      if (res.success && res.maskedKey) {
        setMaskedKeys((prev) => ({ ...prev, omnidimension: res.maskedKey! }))
        setNewApiKey('')
        setNotice('Provider API key encrypted with AES-256-GCM and stored securely.')
      }
    })
  }

  return (
    <div className="space-y-6">
      {notice && (
        <div className="flex items-center justify-between rounded-xl border border-blue-800/40 bg-blue-950/40 px-4 py-3 text-sm text-blue-200">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-400 shrink-0" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-xs text-neutral-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Top Banner: Workspace Switcher & Minute Cap Meter */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 backdrop-blur">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-400 border border-blue-500/20">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-white tracking-tight">{workspace.name}</h1>
                <span className="rounded-full bg-blue-950 border border-blue-800/40 px-2.5 py-0.5 text-xs font-semibold text-blue-400 uppercase">
                  {workspace.plan} Plan
                </span>
                {isCapReached && (
                  <span className="rounded-full bg-rose-950 border border-rose-800/40 px-2.5 py-0.5 text-xs font-semibold text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Calling Capped
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-neutral-400">
                Multi-Tenant Row Level Security Active • PII Retention:{' '}
                <span className="text-neutral-200 font-medium">{workspace.piiRetentionDays} days</span>
              </p>
            </div>
          </div>

          {/* Workspace Switcher Pills */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400 font-medium hidden sm:inline">Workspace:</span>
            {allWorkspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => handleSwitchWorkspace(ws.id)}
                disabled={isPending}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition border ${
                  workspace.id === ws.id
                    ? 'border-blue-500/40 bg-blue-950/60 text-blue-300 shadow'
                    : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white'
                }`}
              >
                {ws.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Usage Metering Bar */}
        <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-neutral-300">
              <Clock className="h-4 w-4 text-amber-400" />
              <span>Monthly Voice Usage Metering</span>
            </div>
            <span className={`font-mono font-bold ${isCapReached ? 'text-rose-400' : 'text-neutral-300'}`}>
              {workspace.minutesUsed} / {workspace.minuteCap} minutes ({capPercent}%)
            </span>
          </div>

          <div className="h-2 w-full rounded-full bg-neutral-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                isCapReached ? 'bg-rose-500' : capPercent > 80 ? 'bg-amber-400' : 'bg-blue-500'
              }`}
              style={{ width: `${capPercent}%` }}
            />
          </div>

          {isCapReached && (
            <p className="text-[11px] text-rose-400 pt-1">
              ⚠️ Per-plan minute cap reached. Automated scheduler has paused new dispatches until plan upgrade.
            </p>
          )}
        </div>
      </div>

      {/* Primary Executive Financial & Outcome Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
          <span className="text-[11px] font-medium text-neutral-400">Calls Dispatched</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-white">{metrics.callsMade}</span>
            <span className="text-[10px] text-neutral-500">outbound</span>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
          <span className="text-[11px] font-medium text-neutral-400">Conversations</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-blue-400">{metrics.conversations}</span>
            <span className="text-[10px] text-neutral-500">&gt;30s talks</span>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
          <span className="text-[11px] font-medium text-neutral-400">Qualified Leads</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-emerald-400">{metrics.qualifiedLeads}</span>
            <span className="text-[10px] text-neutral-500">ICP fit</span>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
          <span className="text-[11px] font-medium text-neutral-400">Meetings Booked</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-emerald-300">{metrics.meetingsBooked}</span>
            <span className="text-[10px] text-neutral-500">calendar</span>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
          <span className="text-[11px] font-medium text-neutral-400">Conversion Rate</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-purple-400">{metrics.conversionRate}%</span>
            <span className="text-[10px] text-neutral-500">lead-to-meet</span>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
          <span className="text-[11px] font-medium text-neutral-400">Avg Call Duration</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-cyan-400">{metrics.averageCallDurationSeconds}s</span>
            <span className="text-[10px] text-neutral-500">talk time</span>
          </div>
        </div>
      </div>

      {/* Revenue Attribution & Commercial Unit Economics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-400" />
              <h2 className="text-base font-bold text-white">Commercial Attribution & ROI</h2>
            </div>
            <span className="text-xs text-neutral-500">Sell Outcomes, Not Minutes</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
              <span className="text-xs text-neutral-400">Cost per Qualified Lead</span>
              <div className="mt-1 text-2xl font-bold text-white font-mono">
                ${metrics.costPerQualifiedLead}
              </div>
              <p className="mt-1 text-[11px] text-neutral-500">vs $180 industry human SDR baseline</p>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
              <span className="text-xs text-neutral-400">Attributed Pipeline Revenue</span>
              <div className="mt-1 text-2xl font-bold text-emerald-400 font-mono">
                ${workspace.revenueAttributed.toLocaleString()}
              </div>
              <p className="mt-1 text-[11px] text-neutral-500">Confirmed by executive discovery audits</p>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
              <span className="text-xs text-neutral-400">Revenue / AI Employee (Priya)</span>
              <div className="mt-1 text-2xl font-bold text-blue-400 font-mono">
                ${metrics.revenuePerAiEmployee.toLocaleString()}
              </div>
              <p className="mt-1 text-[11px] text-neutral-500">Calculated on active voice agents</p>
            </div>
          </div>

          {/* Revenue Update Form */}
          <div className="rounded-xl border border-neutral-800/80 bg-neutral-950/70 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-neutral-300">
              Update Attributed Revenue (Manual Entry from CRM Closed-Won):
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-neutral-500">$</span>
                <input
                  type="number"
                  value={newRevenue}
                  onChange={(e) => setNewRevenue(e.target.value)}
                  className="w-36 rounded-lg border border-neutral-800 bg-neutral-900 py-1.5 pl-6 pr-2 text-xs font-mono text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <button
                onClick={handleSaveRevenue}
                disabled={isPending}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-emerald-500 transition disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>

        {/* Call Quality Rubric & AI Performance */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-400" />
              <h2 className="text-base font-bold text-white">Call Quality Rubric</h2>
            </div>
            <span className="text-xs font-bold text-amber-400 font-mono">
              {metrics.secondaryMetrics.averageCallQualityScore} / 100
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Call Answer Rate</span>
              <span className="font-semibold text-white">{metrics.secondaryMetrics.callAnswerRate}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Objection Resolution Rate</span>
              <span className="font-semibold text-emerald-400">{metrics.secondaryMetrics.objectionResolutionRate}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Follow-up Completion Rate</span>
              <span className="font-semibold text-blue-400">{metrics.secondaryMetrics.followUpCompletionRate}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Human-Handoff Rate</span>
              <span className="font-semibold text-purple-400">{metrics.secondaryMetrics.humanHandoffRate}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">AI Error Rate</span>
              <span className="font-semibold text-neutral-300">{metrics.secondaryMetrics.aiErrorRate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Channel Performance Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* WhatsApp Channel Card */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-400" />
              <h3 className="text-sm font-bold text-white">WhatsApp Cloud API Channel</h3>
            </div>
            <span className="rounded-full bg-green-950 border border-green-800/40 px-2 py-0.5 text-[10px] font-semibold text-green-400">
              Active
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-2.5">
              <span className="text-[10px] text-neutral-400">Sent</span>
              <div className="mt-0.5 text-lg font-bold text-white">{metrics.channelMetrics.whatsapp.sent}</div>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-2.5">
              <span className="text-[10px] text-neutral-400">Delivered</span>
              <div className="mt-0.5 text-lg font-bold text-blue-400">{metrics.channelMetrics.whatsapp.delivered}</div>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-2.5">
              <span className="text-[10px] text-neutral-400">Replied</span>
              <div className="mt-0.5 text-lg font-bold text-emerald-400">{metrics.channelMetrics.whatsapp.replied}</div>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-2.5">
              <span className="text-[10px] text-neutral-400">Opt-Outs</span>
              <div className="mt-0.5 text-lg font-bold text-neutral-400">{metrics.channelMetrics.whatsapp.unsubscribed}</div>
            </div>
          </div>
        </div>

        {/* Email Channel Card */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-400" />
              <h3 className="text-sm font-bold text-white">Transactional Email Channel</h3>
            </div>
            <span className="rounded-full bg-blue-950 border border-blue-800/40 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
              SPF / DKIM Verified
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-2.5">
              <span className="text-[10px] text-neutral-400">Sent</span>
              <div className="mt-0.5 text-lg font-bold text-white">{metrics.channelMetrics.email.sent}</div>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-2.5">
              <span className="text-[10px] text-neutral-400">Delivered</span>
              <div className="mt-0.5 text-lg font-bold text-blue-400">{metrics.channelMetrics.email.delivered}</div>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-2.5">
              <span className="text-[10px] text-neutral-400">Replied</span>
              <div className="mt-0.5 text-lg font-bold text-emerald-400">{metrics.channelMetrics.email.replied}</div>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-2.5">
              <span className="text-[10px] text-neutral-400">Unsubscribed</span>
              <div className="mt-0.5 text-lg font-bold text-neutral-400">{metrics.channelMetrics.email.unsubscribed}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Security, Encrypted Keys & Audit Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Encrypted Key Manager Card */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-blue-400" />
              <h3 className="text-sm font-bold text-white">Encrypted Provider Credentials</h3>
            </div>
            <span className="text-xs text-neutral-500">AES-256-GCM</span>
          </div>

          <p className="text-xs text-neutral-400">
            Provider API keys are encrypted at rest with hardware-derived AES-256-GCM. Raw plaintext keys are never returned or rendered in the browser.
          </p>

          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-300">OmniDimension Voice API Key</span>
              <span className="font-mono text-emerald-400">{maskedKeys.omnidimension || 'omni_••••••••d8e9'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="password"
              value={newApiKey}
              onChange={(e) => setNewApiKey(e.target.value)}
              placeholder="Paste new API key to rotate..."
              className="flex-1 rounded-xl border border-neutral-800 bg-neutral-950 p-2 text-xs text-neutral-200 focus:border-blue-500 focus:outline-none font-mono"
            />
            <button
              onClick={handleSaveKey}
              disabled={isPending || !newApiKey.trim()}
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-500 transition disabled:opacity-50"
            >
              Rotate Key
            </button>
          </div>
        </div>

        {/* Audit Trail Card */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Workspace Audit Trail</h3>
            </div>
            <span className="text-xs text-neutral-500">Immutable</span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {auditLogs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-800 p-6 text-center text-xs text-neutral-500">
                No administrative actions logged yet for this workspace.
              </div>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-lg border border-neutral-800 bg-neutral-950 p-2.5 text-xs flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <span className="font-semibold text-white">{log.action}</span>
                    <div className="text-[10px] text-neutral-400">
                      {log.actorEmail} • {log.resource}
                    </div>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
