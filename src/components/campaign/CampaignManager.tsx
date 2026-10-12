'use client'

import React, { useState, useTransition } from 'react'
import {
  Lead,
  Campaign,
  Appointment,
  LeadStatus,
  SchedulerRunResult,
} from '@/types/campaign'
import {
  importLeadsAction,
  updateLeadStatusAction,
  toggleCampaignStatusAction,
  runCampaignSchedulerAction,
  bookAppointmentAction,
} from '@/app/actions/campaign'
import { runSequenceOnLeadsAction } from '@/app/actions/channels'
import { LeadTimelineDrawer } from './LeadTimelineDrawer'
import {
  Users,
  Play,
  Pause,
  RefreshCw,
  Upload,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  CalendarCheck,
  FileSpreadsheet,
  ExternalLink,
  Sparkles,
} from 'lucide-react'

interface CampaignManagerProps {
  initialLeads: Lead[]
  initialCampaigns: Campaign[]
  initialAppointments: Appointment[]
}

const SAMPLE_CSV = `name,company,role,phone,dnd
Aarav Sharma,CloudNova Systems,Head of Sales,9876543210,false
Neha Gupta,GrowthBridge,VP Operations,9999999999,false
Vikram Patel,ScaleLogix,Director of Growth,09811122233,false
Sunil Rao,Vertex B2B,Sales Lead,+91 98888 99900,false
Rajesh Malhotra,DoNotCall Corp,Managing Director,9711100001,true`

export function CampaignManager({
  initialLeads,
  initialCampaigns,
  initialAppointments,
}: CampaignManagerProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns)
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments)
  const [activeCampaign] = useState<Campaign | undefined>(initialCampaigns[0])

  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')
  const [showImportModal, setShowImportModal] = useState(false)
  const [csvText, setCsvText] = useState('')
  const [importResult, setImportResult] = useState<{
    imported: number
    duplicates: number
    dnd: number
    errors: string[]
  } | null>(null)

  const [showBookModal, setShowBookModal] = useState<Lead | null>(null)
  const [bookNotes, setBookNotes] = useState('')
  const [selectedDate, setSelectedDate] = useState('')

  const [selectedTimelineLead, setSelectedTimelineLead] = useState<Lead | null>(null)
  const [schedulerLogs, setSchedulerLogs] = useState<SchedulerRunResult[]>([])
  const [isPending, startTransition] = useTransition()
  const [notice, setNotice] = useState<string | null>(null)

  const currentCamp = campaigns.find((c) => c.id === activeCampaign?.id) || activeCampaign

  // Metrics
  const totalLeads = leads.length
  const readyLeads = leads.filter((l) => l.status === 'READY').length
  const dndLeads = leads.filter((l) => l.dnd).length
  const callsToday = currentCamp?.callsToday || 0
  const dailyCap = currentCamp?.dailyCap || 20
  const meetingsBooked = leads.filter((l) => l.status === 'MEETING_BOOKED').length

  const filteredLeads = selectedStatus === 'ALL'
    ? leads
    : leads.filter((l) => l.status === selectedStatus)

  // Actions
  const handleToggleCampaignStatus = () => {
    if (!currentCamp) return
    const nextStatus = currentCamp.status === 'running' ? 'paused' : 'running'
    startTransition(async () => {
      const res = await toggleCampaignStatusAction(currentCamp.id, nextStatus)
      if (res.success && res.campaign) {
        setCampaigns((prev) =>
          prev.map((c) => (c.id === res.campaign!.id ? res.campaign! : c))
        )
        setNotice(
          `Campaign ${nextStatus === 'running' ? 'resumed' : 'paused'} successfully. Scheduler will ${nextStatus === 'running' ? 'dispatch queued calls' : 'halt new calls within this cycle'}.`
        )
      }
    })
  }

  const handleRunScheduler = (simulatedTimeIso?: string) => {
    if (!currentCamp) return
    startTransition(async () => {
      try {
        const res = await runCampaignSchedulerAction(currentCamp.id, simulatedTimeIso)
        if (res.success) {
          setSchedulerLogs((prev) => [res.result, ...prev])
          // Refresh callsToday in campaign
          setCampaigns((prev) =>
            prev.map((c) =>
              c.id === currentCamp.id
                ? { ...c, callsToday: c.callsToday + res.result.callsDispatched, lastRunAt: res.result.timestamp }
                : c
            )
          )
          // Update status of dispatched leads locally
          if (res.result.callsDispatched > 0) {
            setLeads((prev) =>
              prev.map((l) => {
                if (res.result.dispatchedCallIds.some((id) => id.includes(l.id))) {
                  return { ...l, attempts: l.attempts + 1, status: 'CALLED', lastCalledAt: new Date().toISOString() }
                }
                return l
              })
            )
          }

          let summary = `Scheduler executed: ${res.result.callsDispatched} calls dispatched.`
          if (res.result.skippedReasons.campaignPaused) {
            summary = `Scheduler cycle skipped: Campaign is PAUSED.`
          } else if (res.result.skippedReasons.sunday) {
            summary = `Scheduler blocked calls: Sunday shutdown active.`
          } else if (res.result.skippedReasons.outsideCallingHours) {
            summary = `Scheduler blocked calls: Outside calling window (${currentCamp.callWindowStart}-${currentCamp.callWindowEnd} IST).`
          } else if (res.result.skippedReasons.dailyCapReached) {
            summary = `Daily cap reached (${dailyCap}/${dailyCap}). No further calls will be placed today.`
          }
          setNotice(summary)
        }
      } catch (err) {
        setNotice(err instanceof Error ? err.message : 'Scheduler run failed')
      }
    })
  }

  const handleImportCSV = () => {
    if (!csvText.trim()) return
    startTransition(async () => {
      const res = await importLeadsAction(csvText)
      setImportResult({
        imported: res.importedCount,
        duplicates: res.duplicatesSkipped,
        dnd: res.dndCount,
        errors: res.errors,
      })
      if (res.leads.length > 0) {
        setLeads((prev) => [...res.leads, ...prev])
        setCsvText('')
      }
    })
  }

  const handleBookMeeting = () => {
    if (!showBookModal || !selectedDate) return
    startTransition(async () => {
      const res = await bookAppointmentAction(
        showBookModal.id,
        selectedDate,
        currentCamp?.id,
        bookNotes
      )
      if (res.success && res.appointment) {
        setAppointments((prev) => [res.appointment!, ...prev])
        setLeads((prev) =>
          prev.map((l) => (l.id === showBookModal.id ? { ...l, status: 'MEETING_BOOKED' } : l))
        )
        setNotice(
          `Meeting booked for ${showBookModal.name}! Google Meet event created and n8n WhatsApp confirmation triggered.`
        )
        setShowBookModal(null)
        setSelectedDate('')
        setBookNotes('')
      }
    })
  }

  const handleUpdateStatus = (leadId: string, status: LeadStatus) => {
    startTransition(async () => {
      const res = await updateLeadStatusAction(leadId, status)
      if (res.success && res.lead) {
        setLeads((prev) => prev.map((l) => (l.id === leadId ? res.lead! : l)))
      }
    })
  }

  const handleRunSequence = () => {
    const targetLeadIds = leads.slice(0, 5).map((l) => l.id)
    startTransition(async () => {
      const res = await runSequenceOnLeadsAction({
        sequenceId: 'seq_multichannel_3step',
        leadIds: targetLeadIds,
      })
      if (res.success) {
        setNotice(
          `3-step sequence executed on ${targetLeadIds.length} leads! Unified timeline updated with Call, WhatsApp and Email actions.`
        )
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
          <button
            onClick={() => setNotice(null)}
            className="text-xs text-neutral-400 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Banner & Campaign Controls */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 backdrop-blur">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white tracking-tight">
                {currentCamp?.name || 'Outbound Campaign'}
              </h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider border ${
                  currentCamp?.status === 'running'
                    ? 'border-emerald-500/30 bg-emerald-950/50 text-emerald-400'
                    : 'border-amber-500/30 bg-amber-950/50 text-amber-400'
                }`}
              >
                {currentCamp?.status || 'DRAFT'}
              </span>
            </div>
            <p className="mt-1 text-xs text-neutral-400">
              Assigned AI Employee: <span className="text-neutral-200 font-medium">Priya</span> •
              Calling Window: <span className="text-neutral-200 font-medium">10:00 - 18:00 IST</span> •
              Sundays: <span className="text-amber-400 font-medium">Off</span> •
              Max Attempts: <span className="text-neutral-200 font-medium">3</span> •
              Retry Gap: <span className="text-neutral-200 font-medium">4 hrs</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleToggleCampaignStatus}
              disabled={isPending}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold shadow transition ${
                currentCamp?.status === 'running'
                  ? 'border border-amber-600/50 bg-amber-950/30 text-amber-300 hover:bg-amber-900/40'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500'
              }`}
            >
              {currentCamp?.status === 'running' ? (
                <>
                  <Pause className="h-4 w-4" /> Pause Campaign
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" /> Start Campaign
                </>
              )}
            </button>

            <button
              onClick={() => handleRunScheduler()}
              disabled={isPending}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-500 transition disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
              Run Scheduler Cycle
            </button>

            <button
              onClick={handleRunSequence}
              disabled={isPending}
              className="flex items-center gap-2 rounded-xl border border-purple-500/40 bg-purple-950/40 px-3.5 py-2 text-xs font-semibold text-purple-300 hover:bg-purple-900/50 transition disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4 text-purple-400" />
              Run 3-Step Sequence
            </button>

            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800/80 px-3.5 py-2 text-xs font-medium text-neutral-200 hover:bg-neutral-700 transition"
            >
              <Upload className="h-4 w-4 text-neutral-400" />
              Import CSV
            </button>
          </div>
        </div>

        {/* Real-time KPI Bar */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-3.5">
            <span className="text-[11px] font-medium text-neutral-400">Total Leads</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-white">{totalLeads}</span>
              <span className="text-[10px] text-neutral-500">leads</span>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-3.5">
            <span className="text-[11px] font-medium text-neutral-400">Ready in Queue</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-blue-400">{readyLeads}</span>
              <span className="text-[10px] text-neutral-500">pending</span>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-3.5">
            <span className="text-[11px] font-medium text-neutral-400">Daily Cap Usage</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-amber-400">{callsToday}</span>
              <span className="text-xs text-neutral-500">/ {dailyCap}</span>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-neutral-800 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  callsToday >= dailyCap ? 'bg-rose-500' : 'bg-amber-400'
                }`}
                style={{ width: `${Math.min(100, (callsToday / dailyCap) * 100)}%` }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-3.5">
            <span className="text-[11px] font-medium text-neutral-400">DND Filtered</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-neutral-400">{dndLeads}</span>
              <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                <ShieldCheck className="h-3 w-3" /> Safe
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-3.5">
            <span className="text-[11px] font-medium text-neutral-400">Meetings Booked</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-emerald-400">{meetingsBooked}</span>
              <span className="text-[10px] text-neutral-500">outcomes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Pipeline & Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Leads Table & Lifecycle */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-neutral-400" />
              <h2 className="text-sm font-semibold text-white">Leads Pipeline</h2>
              <span className="text-xs text-neutral-500">({filteredLeads.length})</span>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {['ALL', 'READY', 'CALLED', 'QUALIFIED', 'FOLLOW-UP', 'MEETING_BOOKED', 'UNQUALIFIED'].map(
                (st) => (
                  <button
                    key={st}
                    onClick={() => setSelectedStatus(st)}
                    className={`rounded-lg px-2.5 py-1 font-medium transition whitespace-nowrap ${
                      selectedStatus === st
                        ? 'bg-neutral-100 text-neutral-950'
                        : 'bg-neutral-900 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Leads Card List */}
          <div className="space-y-2.5">
            {filteredLeads.length === 0 ? (
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-8 text-center text-sm text-neutral-500">
                No leads found in category &quot;{selectedStatus}&quot;.
              </div>
            ) : (
              filteredLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 transition hover:border-neutral-700 hover:bg-neutral-900/70"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="font-semibold text-white text-sm">{lead.name}</span>
                        {lead.dnd ? (
                          <span className="rounded-full bg-rose-950/60 border border-rose-800/40 px-2 py-0.5 text-[10px] font-semibold text-rose-400 flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" /> DND Opted-Out
                          </span>
                        ) : (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                              lead.status === 'MEETING_BOOKED'
                                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/40'
                                : lead.status === 'QUALIFIED'
                                ? 'bg-blue-950/80 text-blue-300 border border-blue-800/40'
                                : lead.status === 'READY'
                                ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/40'
                                : lead.status === 'FOLLOW-UP'
                                ? 'bg-purple-950/80 text-purple-300 border border-purple-800/40'
                                : 'bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            {lead.status}
                          </span>
                        )}
                        <span className="text-xs text-neutral-400 font-mono">{lead.phone}</span>
                      </div>

                      <div className="text-xs text-neutral-400 flex items-center gap-2">
                        <span>{lead.role || 'Executive'}</span>
                        <span>•</span>
                        <span className="text-neutral-300">{lead.company || 'Enterprise'}</span>
                        {lead.attempts > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-amber-400">Attempts: {lead.attempts}</span>
                          </>
                        )}
                        {lead.lastCalledAt && (
                          <>
                            <span>•</span>
                            <span>Last called: {new Date(lead.lastCalledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => setSelectedTimelineLead(lead)}
                        className="rounded-lg border border-neutral-700 bg-neutral-800/80 px-2.5 py-1 text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-700 transition"
                      >
                        Timeline
                      </button>

                      {lead.status !== 'MEETING_BOOKED' && !lead.dnd && (
                        <button
                          onClick={() => {
                            setShowBookModal(lead)
                            setSelectedDate(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
                          }}
                          className="flex items-center gap-1 rounded-lg border border-emerald-600/40 bg-emerald-950/40 px-2.5 py-1 text-xs font-medium text-emerald-300 hover:bg-emerald-900/50 transition"
                        >
                          <CalendarCheck className="h-3.5 w-3.5" /> Book Meeting
                        </button>
                      )}

                      {lead.status === 'READY' && (
                        <button
                          onClick={() => handleUpdateStatus(lead.id, 'QUALIFIED')}
                          className="rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs font-medium text-neutral-300 hover:text-white transition"
                        >
                          Mark Qualified
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Col: Appointments & Scheduler Audit Stream */}
        <div className="space-y-6">
          {/* Appointments Box */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5 backdrop-blur">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Booked Appointments</h3>
              </div>
              <span className="rounded-full bg-emerald-950 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-800/40">
                {appointments.length} confirmed
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {appointments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-neutral-800 p-6 text-center text-xs text-neutral-500">
                  No appointments booked yet. Click &quot;Book Meeting&quot; on any qualified lead to test Google Calendar &amp; n8n webhook flow.
                </div>
              ) : (
                appointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-3.5 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">{apt.title}</span>
                      <span className="rounded-full bg-blue-950/70 border border-blue-800/30 px-2 py-0.5 text-[10px] text-blue-300">
                        {apt.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <Clock className="h-3.5 w-3.5 text-neutral-500" />
                      <span>{new Date(apt.scheduledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    </div>

                    {apt.meetingLink && (
                      <a
                        href={apt.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 underline"
                      >
                        <ExternalLink className="h-3 w-3" /> Join Google Meet
                      </a>
                    )}

                    <div className="pt-1 flex items-center justify-between text-[11px] border-t border-neutral-800/60">
                      <span className="text-neutral-500">WhatsApp Reminder:</span>
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> n8n Webhook Triggered
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Scheduler Audit Stream */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5 backdrop-blur">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Scheduler Execution Log</h3>
              </div>
              <span className="text-[10px] text-neutral-500">Auto-audit</span>
            </div>

            <div className="mt-4 space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {schedulerLogs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-neutral-800 p-6 text-center text-xs text-neutral-500">
                  No cycles executed yet. Click &quot;Run Scheduler Cycle&quot; above to test automated batch evaluation.
                </div>
              ) : (
                schedulerLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-3 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-neutral-400">
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span
                        className={`font-semibold ${
                          log.callsDispatched > 0 ? 'text-emerald-400' : 'text-neutral-400'
                        }`}
                      >
                        {log.callsDispatched} dispatched / {log.leadsEvaluated} evaluated
                      </span>
                    </div>

                    <div className="text-[11px] text-neutral-400 space-y-0.5">
                      {log.skippedReasons.sunday && (
                        <div className="text-amber-400">• Sundays off (0 calls dispatched)</div>
                      )}
                      {log.skippedReasons.outsideCallingHours && (
                        <div className="text-amber-400">• Outside calling hours (10:00-18:00 IST)</div>
                      )}
                      {log.skippedReasons.dailyCapReached && (
                        <div className="text-rose-400">• Daily cap reached ({dailyCap}/{dailyCap})</div>
                      )}
                      {log.skippedReasons.campaignPaused && (
                        <div className="text-neutral-400">• Campaign paused (0 calls)</div>
                      )}
                      {log.skippedReasons.dnd && (
                        <div className="text-emerald-400">• DND filtered: {log.skippedReasons.dnd} protected</div>
                      )}
                      {log.skippedReasons.retryGapNotElapsed && (
                        <div className="text-neutral-400">• Retry gap active: {log.skippedReasons.retryGapNotElapsed}</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">Import Leads via CSV</h3>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false)
                  setImportResult(null)
                }}
                className="text-neutral-400 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-neutral-400">
              Columns supported: <code className="text-neutral-200">name, company, role, phone, dnd</code>.
              Phone numbers are automatically normalized to <code className="text-emerald-400">+91</code> format and duplicates are removed.
            </p>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-300">CSV Content</label>
                <button
                  type="button"
                  onClick={() => setCsvText(SAMPLE_CSV)}
                  className="text-xs text-blue-400 hover:text-blue-300 underline"
                >
                  Load 5 Sample Leads
                </button>
              </div>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Paste CSV rows here..."
                rows={6}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 p-3 font-mono text-xs text-neutral-200 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {importResult && (
              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3.5 text-xs space-y-1">
                <div className="text-emerald-400 font-semibold">
                  ✓ Successfully imported {importResult.imported} leads!
                </div>
                <div className="text-neutral-400">
                  Duplicates skipped: {importResult.duplicates} • DND flagged: {importResult.dnd}
                </div>
                {importResult.errors.length > 0 && (
                  <div className="text-rose-400 mt-1">
                    Errors: {importResult.errors.join(', ')}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setShowImportModal(false)
                  setImportResult(null)
                }}
                className="rounded-xl border border-neutral-800 px-4 py-2 text-xs font-medium text-neutral-400 hover:bg-neutral-800 transition"
              >
                Close
              </button>
              <button
                onClick={handleImportCSV}
                disabled={isPending || !csvText.trim()}
                className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow hover:bg-blue-500 transition disabled:opacity-50"
              >
                {isPending ? 'Processing...' : 'Run Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Booking Modal */}
      {showBookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Book Discovery Audit</h3>
              </div>
              <button
                onClick={() => setShowBookModal(null)}
                className="text-neutral-400 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-xs space-y-1">
              <div className="font-semibold text-white">{showBookModal.name}</div>
              <div className="text-neutral-400">{showBookModal.company} • {showBookModal.phone}</div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300">Scheduled Date & Time (IST)</label>
              <input
                type="datetime-local"
                value={selectedDate ? new Date(new Date(selectedDate).getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 16) : ''}
                onChange={(e) => {
                  const val = e.target.value
                  if (val) {
                    const d = new Date(val)
                    setSelectedDate(d.toISOString())
                  }
                }}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 p-2.5 text-xs text-neutral-200 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300">Agenda / Discovery Notes</label>
              <textarea
                value={bookNotes}
                onChange={(e) => setBookNotes(e.target.value)}
                placeholder="e.g. Prospect requested automated outbound audit for 5 SDR team."
                rows={3}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 p-2.5 text-xs text-neutral-200 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowBookModal(null)}
                className="rounded-xl border border-neutral-800 px-4 py-2 text-xs font-medium text-neutral-400 hover:bg-neutral-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleBookMeeting}
                disabled={isPending || !selectedDate}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-500 transition disabled:opacity-50"
              >
                {isPending ? 'Confirming...' : 'Confirm & Send n8n Webhook'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Lead Timeline Drawer */}
      {selectedTimelineLead && (
        <LeadTimelineDrawer
          lead={selectedTimelineLead}
          onClose={() => setSelectedTimelineLead(null)}
          onLeadUpdated={() => {
            setLeads((prev) =>
              prev.map((l) => (l.id === selectedTimelineLead.id ? { ...l, dnd: true, status: 'UNQUALIFIED' } : l))
            )
          }}
        />
      )}
    </div>
  )
}
