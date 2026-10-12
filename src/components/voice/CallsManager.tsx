'use client'

import { useState, useTransition } from 'react'
import {
  CallRecord,
  VoiceSettingsData,
  updateVoiceAgentAction,
  dispatchTestCallAction,
  addAllowListNumberAction,
} from '@/app/actions/voice'
import {
  PhoneCall,
  RefreshCw,
  ShieldAlert,
  Bot,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Sparkles,
  Phone,
  Plus,
  BrainCircuit,
  UserCheck,
  Calendar,
  AlertTriangle,
  Award,
} from 'lucide-react'

interface CallsManagerProps {
  initialCalls: CallRecord[]
  initialSettings: VoiceSettingsData
  lastUpdated: { success: boolean; updatedAt: string; agentId: string } | null
}

export function CallsManager({
  initialCalls,
  initialSettings,
  lastUpdated,
}: CallsManagerProps) {
  const [calls, setCalls] = useState<CallRecord[]>(initialCalls)
  const [settings, setSettings] = useState<VoiceSettingsData>(initialSettings)
  const [selectedNumber, setSelectedNumber] = useState<string>(
    initialSettings.allowListedNumbers[0] || '+919876543210'
  )
  const [customNumber, setCustomNumber] = useState<string>('')
  const [newAllowNumber, setNewAllowNumber] = useState<string>('')
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const [lastUpdateInfo, setLastUpdateInfo] = useState(lastUpdated)
  const [selectedCallDetails, setSelectedCallDetails] = useState<CallRecord | null>(null)
  const [isUpdatingAgent, startUpdateTransition] = useTransition()
  const [isCalling, startCallTransition] = useTransition()

  function handleUpdateAgent() {
    setActionFeedback(null)
    startUpdateTransition(async () => {
      const res = await updateVoiceAgentAction()
      if (res.success) {
        setActionFeedback({ type: 'success', message: res.message })
        if (res.updatedAt && res.agentId) {
          setLastUpdateInfo({ success: true, updatedAt: res.updatedAt, agentId: res.agentId })
        }
      } else {
        setActionFeedback({ type: 'error', message: res.message })
      }
    })
  }

  function handleTestCall(numberToDial: string) {
    setActionFeedback(null)
    startCallTransition(async () => {
      const res = await dispatchTestCallAction(numberToDial)
      if (res.success) {
        setActionFeedback({ type: 'success', message: res.message })
        if (res.callRecord) {
          setCalls((prev) => [res.callRecord!, ...prev])
        }
      } else {
        setActionFeedback({ type: 'error', message: res.message })
        if (res.callRecord) {
          setCalls((prev) => [res.callRecord!, ...prev])
        }
      }
    })
  }

  async function handleAddAllowNumber(e: React.FormEvent) {
    e.preventDefault()
    if (!newAllowNumber.trim()) return
    const res = await addAllowListNumberAction(newAllowNumber.trim())
    if (res.success) {
      setSettings((prev) => ({ ...prev, allowListedNumbers: res.allowListedNumbers }))
      setNewAllowNumber('')
      setActionFeedback({
        type: 'success',
        message: `Added ${newAllowNumber} to the safe allow-list.`,
      })
    }
  }

  return (
    <div className="space-y-8">
      {/* Action Banner / Notification */}
      {actionFeedback && (
        <div
          className={`flex items-start gap-3 rounded-xl border p-4 text-xs ${
            actionFeedback.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300'
              : 'border-red-500/30 bg-red-950/40 text-red-300'
          }`}
        >
          {actionFeedback.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
          )}
          <div className="flex-1 font-medium">{actionFeedback.message}</div>
        </div>
      )}

      {/* Top 2 Columns: Update Agent & Test Call */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Voice Provider Connection */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Voice Provider Connection</h2>
                <p className="text-xs text-neutral-400">
                  Provider: <span className="font-semibold text-neutral-200">OmniDimension</span> • Agent: <span className="font-semibold text-neutral-200">{settings.agentId}</span>
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active Adapter
            </span>
          </div>

          <p className="text-xs text-neutral-300 leading-relaxed">
            Synchronizes the compiled phone-ready Sales Brain prompt to the OmniDimension voice engine for agent <span className="font-semibold text-white">&quot;Priya&quot;</span>.
          </p>

          <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-3 space-y-1 text-xs">
            <div className="flex justify-between text-neutral-400">
              <span>Status:</span>
              <span className="text-neutral-200">Ready to update</span>
            </div>
            {lastUpdateInfo && (
              <div className="flex justify-between text-neutral-400">
                <span>Last Pushed:</span>
                <span className="text-blue-400 font-mono text-[11px]">
                  {new Date(lastUpdateInfo.updatedAt).toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            id="update-agent-button"
            onClick={handleUpdateAgent}
            disabled={isUpdatingAgent}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 disabled:opacity-50 transition"
          >
            {isUpdatingAgent ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Pushing Prompt to OmniDimension...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                Update Agent Prompt at Provider
              </>
            )}
          </button>
        </div>

        {/* Card 2: Test Call & Compliance Gate */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <PhoneCall className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Test Call Dispatcher</h2>
                <p className="text-xs text-neutral-400">
                  Protected by Safety & Compliance Gate
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full font-medium">
              <ShieldAlert className="h-3 w-3" />
              Allow-List Only
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <label className="font-semibold text-neutral-300">
              Select Verified Allow-Listed Number:
            </label>
            <div className="flex flex-wrap gap-2">
              {settings.allowListedNumbers.map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    setSelectedNumber(num)
                    setCustomNumber(num)
                  }}
                  className={`rounded-lg border px-3 py-1.5 font-mono text-xs transition ${
                    selectedNumber === num
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 font-semibold'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>

            <div className="space-y-1 pt-1">
              <label className="font-semibold text-neutral-300">
                Or Enter Number (Tested against Compliance Gate):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="+91..."
                  value={customNumber || selectedNumber}
                  onChange={(e) => {
                    setCustomNumber(e.target.value)
                    setSelectedNumber(e.target.value)
                  }}
                  className="flex-1 rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs font-mono text-white focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  id="dispatch-test-call-button"
                  onClick={() => handleTestCall(customNumber || selectedNumber)}
                  disabled={isCalling}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition shadow-lg shadow-emerald-900/30"
                >
                  {isCalling ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Calling...
                    </>
                  ) : (
                    <>
                      <Phone className="h-3.5 w-3.5" /> Test Call
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Quick add to allow list */}
          <form onSubmit={handleAddAllowNumber} className="border-t border-neutral-800/80 pt-3 flex gap-2">
            <input
              type="text"
              placeholder="+91... add to allow-list"
              value={newAllowNumber}
              onChange={(e) => setNewAllowNumber(e.target.value)}
              className="flex-1 rounded-lg border border-neutral-800 bg-neutral-950 px-2.5 py-1.5 text-xs text-neutral-200"
            />
            <button
              type="submit"
              className="flex items-center gap-1 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700"
            >
              <Plus className="h-3 w-3" /> Add
            </button>
          </form>
        </div>
      </div>

      {/* Calls Feed Table */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-4">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Calls & Post-Call Intelligence</span>
              <span className="rounded-full bg-neutral-800 border border-neutral-700 px-2 py-0.5 text-[10px] text-neutral-400 font-mono">
                {calls.length} calls
              </span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Live transcript intelligence: intent, lead score (0-100), human-handoff triggers, and prospect memory.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-800 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="pb-3 pr-4">Recipient</th>
                <th className="pb-3 px-3">Status</th>
                <th className="pb-3 px-3">Lead Score</th>
                <th className="pb-3 px-3">Intent</th>
                <th className="pb-3 px-3">Handoff</th>
                <th className="pb-3 px-3">Quality</th>
                <th className="pb-3 px-3">Summary</th>
                <th className="pb-3 pl-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 font-medium">
              {calls.map((c) => {
                const isBlocked = c.status === 'blocked'
                const isCompleted = c.status === 'completed'
                const analysis = c.analysis
                const leadScore = analysis?.leadScore
                return (
                  <tr key={c.id} className="hover:bg-neutral-800/30 transition">
                    <td className="py-3 pr-4 font-mono text-neutral-200">
                      {c.toNumber}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          isBlocked
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : isCompleted
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}
                      >
                        {isBlocked ? (
                          <ShieldAlert className="h-3 w-3" />
                        ) : isCompleted ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <Clock className="h-3 w-3" />
                        )}
                        {c.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {leadScore !== undefined ? (
                        <span
                          className={`inline-flex items-center gap-1 font-bold font-mono px-2 py-0.5 rounded-md text-[11px] ${
                            leadScore >= 80
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                              : leadScore >= 50
                              ? 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                              : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                          }`}
                        >
                          {leadScore}/100
                        </span>
                      ) : (
                        <span className="text-neutral-500">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {analysis ? (
                        <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-400 uppercase">
                          {analysis.intent}
                        </span>
                      ) : (
                        <span className="text-neutral-500">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {analysis?.humanHandoff ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                          <AlertTriangle className="h-3 w-3" />
                          HANDOFF
                        </span>
                      ) : (
                        <span className="text-neutral-500 text-[11px]">AI Autonomous</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-neutral-300 font-mono text-[11px]">
                      {analysis ? `${analysis.callQualityScore}%` : '—'}
                    </td>
                    <td className="py-3 px-3 text-neutral-300 max-w-xs truncate">
                      {c.summary}
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedCallDetails(c)}
                        className="inline-flex items-center gap-1 rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-[11px] font-medium text-neutral-200 hover:bg-neutral-700"
                      >
                        <FileText className="h-3 w-3" />
                        Inspect Call
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal / Details Drawer */}
      {selectedCallDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Call Record: {selectedCallDetails.toNumber}</span>
                  {selectedCallDetails.analysis?.humanHandoff && (
                    <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 text-[11px] font-bold text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Human Handoff Triggered
                    </span>
                  )}
                </h3>
                <span className="text-[11px] text-neutral-500 font-mono">
                  ID: {selectedCallDetails.providerCallId}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCallDetails(null)}
                className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1 text-xs text-neutral-400 hover:text-white"
              >
                Close
              </button>
            </div>

            {/* Post-Call Intelligence Score Card */}
            {selectedCallDetails.analysis && (
              <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400">
                    <BrainCircuit className="h-4 w-4" />
                    <span>Post-Call Intelligence Analysis</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                      <Award className="h-4 w-4" />
                      <span>Lead Score: {selectedCallDetails.analysis.leadScore}/100</span>
                    </div>
                    <div className="text-xs font-semibold text-neutral-300">
                      Quality: {selectedCallDetails.analysis.callQualityScore}%
                    </div>
                  </div>
                </div>

                <p className="text-xs text-neutral-300 leading-relaxed">
                  <span className="font-semibold text-white">Rationale: </span>
                  {selectedCallDetails.analysis.leadScoreReasons}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                  <div className="rounded-lg bg-neutral-950/70 p-2 border border-neutral-800">
                    <span className="text-[10px] text-neutral-500 uppercase font-semibold">Intent</span>
                    <div className="font-bold text-white capitalize">{selectedCallDetails.analysis.intent}</div>
                  </div>
                  <div className="rounded-lg bg-neutral-950/70 p-2 border border-neutral-800">
                    <span className="text-[10px] text-neutral-500 uppercase font-semibold">Objections Raised</span>
                    <div className="font-bold text-amber-400">
                      {selectedCallDetails.analysis.objectionsRaised.length > 0
                        ? selectedCallDetails.analysis.objectionsRaised.join(', ')
                        : 'None'}
                    </div>
                  </div>
                  <div className="rounded-lg bg-neutral-950/70 p-2 border border-neutral-800">
                    <span className="text-[10px] text-neutral-500 uppercase font-semibold">Next Action</span>
                    <div className="font-medium text-emerald-300 truncate">{selectedCallDetails.analysis.nextAction}</div>
                  </div>
                </div>

                <div className="text-xs text-neutral-400 border-t border-neutral-800/80 pt-2">
                  <span className="font-semibold text-neutral-300">Coaching Note: </span>
                  {selectedCallDetails.analysis.coachingNotes}
                </div>
              </div>
            )}

            {/* Scheduled Contextual Follow-Up */}
            {selectedCallDetails.analysis?.followUp?.required && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <Calendar className="h-4 w-4" />
                  <span>Contextual Follow-Up Scheduled</span>
                </div>
                <div className="text-xs text-neutral-200">
                  <span className="font-semibold">Callback: </span>
                  {selectedCallDetails.analysis.followUp.scheduledAt ? new Date(selectedCallDetails.analysis.followUp.scheduledAt).toLocaleString() : 'TBD'}
                  {' '}({selectedCallDetails.analysis.followUp.reason})
                </div>
                {selectedCallDetails.analysis.followUp.previousContext && (
                  <p className="text-[11px] text-neutral-400 bg-neutral-950/60 p-2 rounded border border-neutral-800">
                    {selectedCallDetails.analysis.followUp.previousContext}
                  </p>
                )}
              </div>
            )}

            {/* Prospect Memory Card (Passed as call_context on next call) */}
            {selectedCallDetails.analysis?.prospectMemory && (
              <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-300">
                  <UserCheck className="h-4 w-4 text-blue-400" />
                  <span>Prospect Memory (Injected as call_context for next call)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-neutral-500">Name</span>
                    <div className="font-semibold text-white">{selectedCallDetails.analysis.prospectMemory.name}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500">Company</span>
                    <div className="font-semibold text-white">{selectedCallDetails.analysis.prospectMemory.company}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500">Identified Pain</span>
                    <div className="font-semibold text-amber-300 truncate">{selectedCallDetails.analysis.prospectMemory.pain}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500">Promises</span>
                    <div className="font-semibold text-emerald-300 truncate">{selectedCallDetails.analysis.prospectMemory.promises}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2 text-xs">
              <span className="font-semibold text-neutral-300">Summary:</span>
              <p className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-neutral-200 leading-relaxed">
                {selectedCallDetails.summary}
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <span className="font-semibold text-neutral-300">Full Audio Transcript:</span>
              <pre className="max-h-60 overflow-y-auto whitespace-pre-wrap rounded-xl border border-neutral-800 bg-neutral-950 p-3 font-mono text-[11px] text-neutral-300 leading-relaxed">
                {selectedCallDetails.transcript}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
