'use client'

import React, { useState } from 'react'
import {
  SupportedLanguage,
  AbExperiment,
  SalesCoachingReport,
  MethodologyPatch,
  CrmIntegration,
  HumanSalesRep,
  WalletLedger
} from '@/types/phase7'
import { MULTILINGUAL_PACKS, compileMultilingualPrompt } from '@/lib/multilingual/compiler'
import {
  Globe,
  Split,
  GraduationCap,
  Database,
  PhoneForwarded,
  CreditCard,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'

interface Phase7AdvancedSuiteProps {
  workspaceId?: string
  initialExperiments: AbExperiment[]
  initialCoachingReports: SalesCoachingReport[]
  initialMethodologyPatches: MethodologyPatch[]
  initialCrmIntegrations: CrmIntegration[]
  initialHumanReps: HumanSalesRep[]
  initialWallet: WalletLedger
}

export function Phase7AdvancedSuite({
  initialExperiments,
  initialCoachingReports,
  initialMethodologyPatches,
  initialCrmIntegrations,
  initialHumanReps,
  initialWallet
}: Phase7AdvancedSuiteProps) {
  const [selectedSubTab, setSelectedSubTab] = useState<
    'multilingual' | 'ab_testing' | 'coaching' | 'crm' | 'inbound' | 'wallet'
  >('multilingual')

  // Multilingual State
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>('hi')
  const [sampleBasePrompt] = useState(
    'You are Priya, an AI sales employee at Desynthic. Your goal is to qualify outbound B2B prospects and book a 20-minute Zoom demo.'
  )
  const compiledPromptObj = compileMultilingualPrompt(sampleBasePrompt, selectedLang)

  // A/B Testing State
  const [experiments] = useState<AbExperiment[]>(initialExperiments)

  // Coaching State
  const [coachingReports] = useState<SalesCoachingReport[]>(initialCoachingReports)
  const [patches, setPatches] = useState<MethodologyPatch[]>(initialMethodologyPatches)

  // CRM State
  const [crmIntegrations, setCrmIntegrations] = useState<CrmIntegration[]>(initialCrmIntegrations)
  const [crmSyncMessage, setCrmSyncMessage] = useState<string | null>(null)

  // Inbound & Human Team State
  const [humanReps] = useState<HumanSalesRep[]>(initialHumanReps)
  const [inboundTestResult, setInboundTestResult] = useState<string | null>(null)

  // Wallet State
  const [wallet, setWallet] = useState<WalletLedger>(initialWallet)
  const [rechargeSuccess, setRechargeSuccess] = useState<string | null>(null)

  const handleAcceptPatch = (patchId: string) => {
    setPatches((prev) =>
      prev.map((p) => (p.id === patchId ? { ...p, status: 'accepted' as const } : p))
    )
  }

  const handleSimulateInbound = (intentType: 'enterprise' | 'normal') => {
    if (intentType === 'enterprise') {
      const rep = humanReps.find((r) => r.status === 'available') || humanReps[0]
      setInboundTestResult(
        `🚨 WARM TRANSFER INITIATED: Transferred to ${rep.name} (${rep.role}). Audio whisper dispatched: "Incoming transfer from Rajesh at Apex Logistics (Enterprise Tier, requested pricing for 500 agents)."`
      )
    } else {
      setInboundTestResult(
        `🤖 AI HANDLED: Priya connected with prospect. Greeting: "${MULTILINGUAL_PACKS[selectedLang].greeting}" with verified AI disclosure.`
      )
    }
  }

  const handleRechargeWallet = (mins: number, amount: number) => {
    setWallet((prev) => ({
      ...prev,
      currentMinutesBalance: prev.currentMinutesBalance + mins,
      totalMinutesPurchased: prev.totalMinutesPurchased + mins
    }))
    setRechargeSuccess(`Successfully recharged ${mins} minutes (₹${amount.toLocaleString()} INR).`)
    setTimeout(() => setRechargeSuccess(null), 5000)
  }

  const handleTestCrmSync = (provider: string) => {
    setCrmIntegrations((prev) =>
      prev.map((c) =>
        c.provider === provider
          ? {
              ...c,
              syncStats: {
                ...c.syncStats,
                leadsSynced: c.syncStats.leadsSynced + 1,
                callsSynced: c.syncStats.callsSynced + 1
              }
            }
          : c
      )
    )
    setCrmSyncMessage(`Lead & Call Activity successfully pushed to ${provider.toUpperCase()} timeline!`)
    setTimeout(() => setCrmSyncMessage(null), 4000)
  }

  return (
    <div className="space-y-6">
      {/* Subtab Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 bg-neutral-900/60 p-1.5 rounded-2xl border border-neutral-800">
        <button
          onClick={() => setSelectedSubTab('multilingual')}
          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition ${
            selectedSubTab === 'multilingual'
              ? 'bg-blue-600 text-white shadow'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
          }`}
        >
          <Globe className="h-3.5 w-3.5" />
          Multilingual
        </button>

        <button
          onClick={() => setSelectedSubTab('ab_testing')}
          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition ${
            selectedSubTab === 'ab_testing'
              ? 'bg-blue-600 text-white shadow'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
          }`}
        >
          <Split className="h-3.5 w-3.5" />
          Prompt A/B
        </button>

        <button
          onClick={() => setSelectedSubTab('coaching')}
          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition ${
            selectedSubTab === 'coaching'
              ? 'bg-blue-600 text-white shadow'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
          }`}
        >
          <GraduationCap className="h-3.5 w-3.5" />
          Coaching & Learn
        </button>

        <button
          onClick={() => setSelectedSubTab('crm')}
          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition ${
            selectedSubTab === 'crm'
              ? 'bg-blue-600 text-white shadow'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
          }`}
        >
          <Database className="h-3.5 w-3.5" />
          CRM Sync
        </button>

        <button
          onClick={() => setSelectedSubTab('inbound')}
          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition ${
            selectedSubTab === 'inbound'
              ? 'bg-blue-600 text-white shadow'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
          }`}
        >
          <PhoneForwarded className="h-3.5 w-3.5" />
          Inbound & Reps
        </button>

        <button
          onClick={() => setSelectedSubTab('wallet')}
          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition ${
            selectedSubTab === 'wallet'
              ? 'bg-blue-600 text-white shadow'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
          }`}
        >
          <CreditCard className="h-3.5 w-3.5" />
          Minute Wallet
        </button>
      </div>

      {/* 1. Multilingual Tab */}
      {selectedSubTab === 'multilingual' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-400" />
                  Regional Indian Voice Localization
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Autonomous phone agent fluency in Hindi (हिन्दी), Telugu (తెలుగు), Tamil (தமிழ்), Hinglish, and English with strict AI disclosure compliance.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-400">Target Spoken Language:</span>
                <select
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value as SupportedLanguage)}
                  className="bg-neutral-800 border border-neutral-700 text-white text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500"
                >
                  <option value="en">English (Global)</option>
                  <option value="hi">Hindi (हिन्दी)</option>
                  <option value="te">Telugu (తెలుగు)</option>
                  <option value="ta">Tamil (தமிழ்)</option>
                  <option value="hinglish">Hinglish (Urban Conversational)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4">
                <div className="text-xs font-medium text-neutral-400 mb-1">Local Spoken Greeting</div>
                <div className="text-sm font-medium text-white mb-3">
                  &ldquo;{MULTILINGUAL_PACKS[selectedLang].greeting}&rdquo;
                </div>

                <div className="text-xs font-medium text-neutral-400 mb-1">Mandatory AI Disclosure</div>
                <div className="text-xs text-amber-300/90 bg-amber-950/30 border border-amber-900/50 p-2.5 rounded-lg">
                  &ldquo;{MULTILINGUAL_PACKS[selectedLang].aiDisclosure}&rdquo;
                </div>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4">
                <div className="text-xs font-medium text-neutral-400 mb-1">Cultural Objection Anchor</div>
                <div className="text-sm text-neutral-300 mb-3">
                  &ldquo;{MULTILINGUAL_PACKS[selectedLang].objectionResponseSnippet}&rdquo;
                </div>

                <div className="text-xs font-medium text-neutral-400 mb-1">Meeting Confirmation (IST)</div>
                <div className="text-xs text-emerald-300 bg-emerald-950/30 border border-emerald-900/50 p-2.5 rounded-lg">
                  &ldquo;{MULTILINGUAL_PACKS[selectedLang].bookingConfirmation}&rdquo;
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-neutral-300">Compiled Voice Prompt Output</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800">
                  AI Disclosure Verified
                </span>
              </div>
              <pre className="text-[11px] text-neutral-400 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
                {compiledPromptObj.prompt}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* 2. Prompt A/B Testing Tab */}
      {selectedSubTab === 'ab_testing' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Split className="h-5 w-5 text-indigo-400" />
                  Voice Prompt A/B Experiments
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Split outbound traffic across prompt value propositions to empirically maximize qualified demo conversions.
                </p>
              </div>

              <span className="text-xs bg-indigo-950/60 text-indigo-300 border border-indigo-800 px-3 py-1 rounded-full font-medium">
                Live Traffic Split: 50/50
              </span>
            </div>

            {experiments.map((exp) => (
              <div key={exp.id} className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">{exp.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-400">Winning Variant:</span>
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-800 px-2 py-0.5 rounded">
                      Variant {exp.winningVariant} ({Math.round((exp.confidenceScore || 0) * 100)}% Confidence)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Variant A */}
                  <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-neutral-300">Variant A (Curiosity & Pain)</span>
                      <span className="text-xs text-neutral-400">
                        Conversion: {exp.variantACalls > 0 ? ((exp.variantAMeetings / exp.variantACalls) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mb-3 italic">&ldquo;{exp.variantAPrompt}&rdquo;</p>
                    <div className="flex items-center justify-between text-xs text-neutral-500 pt-2 border-t border-neutral-800">
                      <span>Calls Dialed: {exp.variantACalls}</span>
                      <span>Meetings Booked: {exp.variantAMeetings}</span>
                    </div>
                  </div>

                  {/* Variant B */}
                  <div className="rounded-lg border border-blue-900/50 bg-blue-950/20 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-blue-300">Variant B (Direct ROI & Outcome Fee) ⭐</span>
                      <span className="text-xs font-bold text-emerald-400">
                        Conversion: {exp.variantBCalls > 0 ? ((exp.variantBMeetings / exp.variantBCalls) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                    <p className="text-xs text-blue-200/90 mb-3 italic">&ldquo;{exp.variantBPrompt}&rdquo;</p>
                    <div className="flex items-center justify-between text-xs text-neutral-400 pt-2 border-t border-blue-900/30">
                      <span>Calls Dialed: {exp.variantBCalls}</span>
                      <span className="font-semibold text-emerald-400">Meetings Booked: {exp.variantBMeetings}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Sales Coaching & Methodology Tab */}
      {selectedSubTab === 'coaching' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
            <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-1">
              <GraduationCap className="h-5 w-5 text-emerald-400" />
              Sales Coaching & Automated Methodology Learning
            </h3>
            <p className="text-xs text-neutral-400 mb-6">
              Analyzes actual prospect phone dialogue to score conversational pacing, listening discipline, and extract winning objection handlers.
            </p>

            {coachingReports.map((report) => (
              <div key={report.id} className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-5 space-y-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-white">{report.prospectName}</span>
                    <span className="text-xs text-neutral-500 ml-2">({report.callId})</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-800 px-2.5 py-1 rounded-full">
                    Objection Score: {report.objectionHandlingScore}/100
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-neutral-900 p-3 text-center border border-neutral-800">
                    <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Talk/Listen Ratio</div>
                    <div className="text-sm font-semibold text-white mt-1">
                      {Math.round(report.talkToListenRatio * 100)}% / {Math.round((1 - report.talkToListenRatio) * 100)}%
                    </div>
                  </div>

                  <div className="rounded-lg bg-neutral-900 p-3 text-center border border-neutral-800">
                    <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Speech Pace</div>
                    <div className="text-sm font-semibold text-white mt-1">{report.speechPaceWpm} WPM</div>
                  </div>

                  <div className="rounded-lg bg-neutral-900 p-3 text-center border border-neutral-800">
                    <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Filler Words</div>
                    <div className="text-sm font-semibold text-white mt-1">{report.fillerWordsCount} detected</div>
                  </div>
                </div>

                <div className="text-xs text-neutral-300 space-y-1.5 pt-2 border-t border-neutral-800">
                  <div className="font-semibold text-neutral-400">Observed Strengths:</div>
                  {report.strengths.map((str, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-emerald-400">
                      <CheckCircle2 className="h-3 w-3 shrink-0" />
                      {str}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Methodology Patches */}
            <div className="pt-4 border-t border-neutral-800">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                Learned Playbook Patches (Awaiting Brain Update)
              </h4>

              {patches.map((patch) => (
                <div key={patch.id} className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300">Extracted from Call #{patch.sourceCallId}</span>
                    {patch.status === 'accepted' ? (
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
                        Applied to Brain
                      </span>
                    ) : (
                      <button
                        onClick={() => handleAcceptPatch(patch.id)}
                        className="text-[11px] font-semibold bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-lg transition"
                      >
                        Accept to Sales Brain
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-white italic">&ldquo;{patch.suggestedPatch}&rdquo;</p>
                  <p className="text-[11px] text-neutral-400">{patch.rationale}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. CRM Integrations Tab */}
      {selectedSubTab === 'crm' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
            <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-1">
              <Database className="h-5 w-5 text-blue-400" />
              Unified CRM Bi-directional Sync
            </h3>
            <p className="text-xs text-neutral-400 mb-6">
              Automatically syncs leads, transcripts, call durations, and pipeline deals directly into HubSpot, Zoho CRM, or custom webhooks.
            </p>

            {crmSyncMessage && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {crmSyncMessage}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {crmIntegrations.map((crm) => (
                <div key={crm.id} className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold uppercase text-white tracking-wider">{crm.provider} CRM</span>
                    <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/50 border border-emerald-800 px-2 py-0.5 rounded">
                      {crm.status}
                    </span>
                  </div>

                  <div className="text-xs text-neutral-400">
                    API Key: <code className="text-neutral-300">{crm.apiKeyMasked}</code>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-neutral-800 text-xs">
                    <div>
                      <div className="text-neutral-500 text-[10px]">Leads Synced</div>
                      <div className="font-semibold text-white">{crm.syncStats.leadsSynced}</div>
                    </div>
                    <div>
                      <div className="text-neutral-500 text-[10px]">Calls Synced</div>
                      <div className="font-semibold text-white">{crm.syncStats.callsSynced}</div>
                    </div>
                    <div>
                      <div className="text-neutral-500 text-[10px]">Deals Created</div>
                      <div className="font-semibold text-emerald-400">{crm.syncStats.dealsCreated}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleTestCrmSync(crm.provider)}
                    className="w-full text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-white py-2 rounded-xl border border-neutral-700 transition"
                  >
                    Sync Live Test Lead & Activity
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. Inbound & Human Reps Tab */}
      {selectedSubTab === 'inbound' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
            <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-1">
              <PhoneForwarded className="h-5 w-5 text-emerald-400" />
              Inbound Triage & Human + AI Sales Team Routing
            </h3>
            <p className="text-xs text-neutral-400 mb-6">
              AI automatically handles top-of-funnel inbound calls, qualifies intent, and seamlessly warm-transfers Enterprise accounts with contextual whisper briefing.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-4">
                <div className="text-xs font-semibold text-white mb-3">Live Human Sales Roster</div>
                <div className="space-y-2.5">
                  {humanReps.map((rep) => (
                    <div key={rep.id} className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-900/60 border border-neutral-800 text-xs">
                      <div>
                        <div className="font-semibold text-white">{rep.name}</div>
                        <div className="text-[11px] text-neutral-400">{rep.role} ({rep.tier})</div>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                        rep.status === 'available'
                          ? 'text-emerald-400 bg-emerald-950/50 border-emerald-800'
                          : 'text-amber-400 bg-amber-950/50 border-amber-800'
                      }`}>
                        {rep.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-4">
                <div className="text-xs font-semibold text-white mb-2">Simulate Inbound Call Scenario</div>
                <p className="text-[11px] text-neutral-400 mb-4">
                  Test routing decision between AI self-handling vs instant warm transfer to human reps.
                </p>

                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => handleSimulateInbound('enterprise')}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-2 px-3 rounded-xl transition"
                  >
                    Enterprise Inbound (Transfer)
                  </button>
                  <button
                    onClick={() => handleSimulateInbound('normal')}
                    className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold py-2 px-3 rounded-xl border border-neutral-700 transition"
                  >
                    Standard Inbound (AI Handled)
                  </button>
                </div>

                {inboundTestResult && (
                  <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300">
                    {inboundTestResult}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Minute Wallet Tab */}
      {selectedSubTab === 'wallet' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
            <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-1">
              <CreditCard className="h-5 w-5 text-purple-400" />
              Minute Wallet & Calling Balance
            </h3>
            <p className="text-xs text-neutral-400 mb-6">
              Track voice calling minutes, plan usage, and recharge packs seamlessly.
            </p>

            {rechargeSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {rechargeSuccess}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-4 text-center">
                <div className="text-[11px] text-neutral-400 uppercase tracking-wider">Available Minutes</div>
                <div className="text-2xl font-bold text-emerald-400 mt-1">{wallet.currentMinutesBalance} mins</div>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-4 text-center">
                <div className="text-[11px] text-neutral-400 uppercase tracking-wider">Minutes Consumed</div>
                <div className="text-2xl font-bold text-white mt-1">{wallet.totalMinutesConsumed} mins</div>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-4 text-center">
                <div className="text-[11px] text-neutral-400 uppercase tracking-wider">Current Tier</div>
                <div className="text-2xl font-bold text-purple-400 mt-1">{wallet.planName}</div>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-5">
              <div className="text-xs font-semibold text-white mb-3">Quick Top-Up Minute Packs</div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => handleRechargeWallet(500, 15000)}
                  className="bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition flex items-center gap-2"
                >
                  <span>+500 Minutes</span>
                  <span className="text-neutral-400 text-[11px]">(₹15,000 INR)</span>
                </button>

                <button
                  onClick={() => handleRechargeWallet(1000, 28000)}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition flex items-center gap-2 shadow"
                >
                  <span>+1,000 Minutes (Growth Pack)</span>
                  <span className="text-blue-200 text-[11px]">(₹28,000 INR)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
