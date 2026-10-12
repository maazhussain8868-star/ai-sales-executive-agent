'use server'

import { revalidatePath } from 'next/cache'
import { getVoiceProvider, ParsedCallWebhook } from '@/lib/voice'
import { validateCallCompliance, normalizePhoneNumber } from '@/lib/voice/compliance-gate'
import { getCompiledBrainAction } from './brain'
import { createClient } from '@/lib/supabase/server'
import { CallAnalysisResult, ProspectMemory } from '@/types/intelligence'
import { analyzeCallWithRetry } from '@/lib/intelligence/analyzer'

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path)
  } catch {
    // Outside request store (e.g. tests or CLI scripts)
  }
}

export interface CallRecord {
  id: string
  providerCallId: string
  toNumber: string
  fromNumber?: string
  status: 'dispatched' | 'ringing' | 'in_progress' | 'completed' | 'failed' | 'blocked' | 'busy' | 'no_answer'
  durationSeconds: number
  transcript: string
  summary: string
  extractedVariables: Record<string, unknown>
  complianceNotes?: string
  rawWebhookPayload?: unknown
  analysis?: CallAnalysisResult
  createdAt: string
  updatedAt: string
}

export interface VoiceSettingsData {
  provider: string
  agentId: string
  allowListedNumbers: string[]
  callingHoursStart: string
  callingHoursEnd: string
  timezone: string
  enforceDnd: boolean
}

// In-memory prospect memory store by phone number
const globalProspectMemoryStore: Record<string, ProspectMemory> = {
  '+919876543210': {
    phone: '+919876543210',
    name: 'Rahul',
    company: 'ScaleSync',
    role: 'Head of Growth',
    pain: 'SDR turnover and inconsistency',
    pastObjections: ['competitor'],
    promises: 'Send invite for Thursday 3 PM audit',
    lastContact: new Date(Date.now() - 3600000).toISOString(),
    nextFollowUp: new Date(Date.now() + 86400000 * 3).toISOString(),
    notes: 'High intent decision maker. Booked growth audit demo.',
  },
}

// In-memory store for dev / fallback mode
const globalVoiceStore: {
  calls: CallRecord[]
  settings: VoiceSettingsData
  lastAgentUpdate: { success: boolean; updatedAt: string; agentId: string } | null
} = {
  calls: [
    {
      id: 'call_seed_01',
      providerCallId: 'omni_call_seed_01',
      toNumber: '+919876543210',
      status: 'completed',
      durationSeconds: 142,
      transcript:
        'Priya: Hello, this is Priya, an AI sales assistant calling from Desynthic on a recorded line. Am I speaking with Rahul?\nProspect: Yes, speaking. What is this about?\nPriya: I know you are busy, but I noticed you head outbound growth at ScaleSync. Many agency leaders tell us keeping sales reps consistent on top-of-funnel calls is a major headache. Are you handling outbound in-house?\nProspect: Yes, we have two SDRs but turnover has been rough.\nPriya: Exactly why we created Desynthic. Our AI employee handles the cold dialing and books qualified meetings directly on your calendar for 1/5th the cost. Would you be open to a 20-minute growth audit this Thursday at 3 PM?\nProspect: Sure, Thursday 3 PM sounds fine. Send the invite to rahul@scalesync.io.',
      summary:
        'Prospect Rahul confirmed pain around SDR turnover. Priya handled objections regarding in-house reps and booked a 20-minute growth audit for Thursday at 3:00 PM.',
      extractedVariables: {
        prospect_name: 'Rahul',
        pain: 'SDR turnover and inconsistency',
        meeting_confirmed: true,
        meeting_time: 'Thursday 3:00 PM IST',
        email: 'rahul@scalesync.io',
      },
      complianceNotes: 'Passed allow-list check, DND clear, AI disclosure declared in opening.',
      analysis: {
        callId: 'call_seed_01',
        intent: 'high_intent',
        objectionsRaised: ['competitor'],
        buyingSignals: ['demo', 'timeline', 'results'],
        conversationSignals: ['interested'],
        qualification: {
          isQualified: true,
          matchedCriteria: ['Active B2B outbound requirement', 'Authority role engaged', 'Commercial fit'],
          unmetCriteria: [],
          notes: 'Lead meets target ICP criteria.',
        },
        leadScore: 94,
        leadScoreReasons: 'Prospect confirmed specific discovery audit time on calendar, stated clear pain, and provided direct email.',
        nextAction: 'Confirm Google Calendar invite and alert AE for executive demo.',
        summary: 'Call with Rahul (ScaleSync). Identified intent as HIGH_INTENT with a lead score of 94/100. Meeting successfully booked for executive demo.',
        humanHandoff: false,
        humanHandoffReasons: [],
        callQualityScore: 98,
        callQualityBreakdown: {
          opening: 20,
          discovery: 20,
          objectionHandling: 19,
          callToAction: 19,
          compliance: 20,
        },
        coachingNotes: 'Excellent pacing, strong compliance disclosure, and effective consultative redirection.',
        confidenceScore: 0.98,
        analyzedAt: new Date(Date.now() - 3500000).toISOString(),
      },
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ],
  settings: {
    provider: 'omnidimension',
    agentId: process.env.OMNIDIMENSION_AGENT_ID || 'priya_agent_01',
    allowListedNumbers: (process.env.VOICE_ALLOW_LIST || '+919876543210,+919999999999')
      .split(',')
      .map((n) => normalizePhoneNumber(n.trim())),
    callingHoursStart: '10:00',
    callingHoursEnd: '18:30',
    timezone: 'Asia/Kolkata',
    enforceDnd: true,
  },
  lastAgentUpdate: null,
}

export async function getVoiceSettingsAction(): Promise<VoiceSettingsData> {
  const supabase = await createClient()
  if (supabase) {
    try {
      const { data } = await supabase.from('voice_settings').select('*').limit(1).single()
      if (data) {
        return {
          provider: data.provider,
          agentId: data.agent_id,
          allowListedNumbers: data.allow_listed_numbers,
          callingHoursStart: data.calling_hours_start,
          callingHoursEnd: data.calling_hours_end,
          timezone: data.timezone,
          enforceDnd: data.enforce_dnd,
        }
      }
    } catch {
      // Fallback to store
    }
  }
  return globalVoiceStore.settings
}

export async function addAllowListNumberAction(number: string) {
  const normalized = normalizePhoneNumber(number.trim())
  if (!globalVoiceStore.settings.allowListedNumbers.includes(normalized)) {
    globalVoiceStore.settings.allowListedNumbers.push(normalized)
  }

  const supabase = await createClient()
  if (supabase) {
    try {
      await supabase
        .from('voice_settings')
        .update({ allow_listed_numbers: globalVoiceStore.settings.allowListedNumbers })
        .eq('provider', 'omnidimension')
    } catch {
      // Fallback
    }
  }

  safeRevalidatePath('/calls')
  return { success: true, allowListedNumbers: globalVoiceStore.settings.allowListedNumbers }
}

export async function updateVoiceAgentAction(): Promise<{
  success: boolean
  message: string
  updatedAt?: string
  agentId?: string
}> {
  const brain = await getCompiledBrainAction()
  if (!brain?.voiceAgentPrompt) {
    return {
      success: false,
      message: 'No compiled Voice Agent Prompt found. Please compile the Sales Brain first.',
    }
  }

  const settings = await getVoiceSettingsAction()
  const provider = getVoiceProvider(settings.provider)

  const result = await provider.updateAgentPrompt({
    agentId: settings.agentId,
    prompt: brain.voiceAgentPrompt,
  })

  if (!result.success) {
    return {
      success: false,
      message: result.error || 'Failed to update agent prompt at provider.',
    }
  }

  const updateInfo = {
    success: true,
    updatedAt: result.updatedAt || new Date().toISOString(),
    agentId: settings.agentId,
  }
  globalVoiceStore.lastAgentUpdate = updateInfo

  const supabase = await createClient()
  if (supabase) {
    try {
      await supabase
        .from('agents')
        .update({ voice_prompt: brain.voiceAgentPrompt, updated_at: new Date().toISOString() })
        .eq('name', 'Priya')
    } catch {
      // Fallback
    }
  }

  safeRevalidatePath('/calls')
  return {
    success: true,
    message: `Successfully pushed compiled Sales Brain prompt to OmniDimension agent "${settings.agentId}".`,
    updatedAt: updateInfo.updatedAt,
    agentId: settings.agentId,
  }
}

export async function dispatchTestCallAction(toNumber: string): Promise<{
  success: boolean
  message: string
  callRecord?: CallRecord
}> {
  const brain = await getCompiledBrainAction()
  if (!brain?.voiceAgentPrompt) {
    return {
      success: false,
      message: 'Cannot dispatch call: Voice Agent Prompt is not compiled yet.',
    }
  }

  const settings = await getVoiceSettingsAction()
  const normalizedNumber = normalizePhoneNumber(toNumber)

  // 1. Run through Compliance Gate
  const compliance = validateCallCompliance({
    toNumber: normalizedNumber,
    voicePrompt: brain.voiceAgentPrompt,
    allowList: settings.allowListedNumbers,
    isDnd: false,
    checkCallingHours: false, // In test call mode, focus on allow-list & AI disclosure
  })

  if (!compliance.allowed) {
    // Record blocked call for audit
    const blockedCall: CallRecord = {
      id: `call_blocked_${Date.now()}`,
      providerCallId: 'none',
      toNumber: normalizedNumber,
      status: 'blocked',
      durationSeconds: 0,
      transcript: 'Call blocked by Compliance Gate prior to dispatch.',
      summary: compliance.reason || 'Blocked by compliance rules',
      extractedVariables: {},
      complianceNotes: compliance.reason,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    globalVoiceStore.calls.unshift(blockedCall)
    safeRevalidatePath('/calls')

    return {
      success: false,
      message: compliance.reason || 'Call blocked by compliance gate.',
      callRecord: blockedCall,
    }
  }

  // 2. Fetch or prepare Prospect Memory to pass as call_context
  const memory = globalProspectMemoryStore[normalizedNumber]
  const callContext: Record<string, unknown> = memory
    ? {
        lead_name: memory.name,
        company: memory.company,
        role: memory.role,
        pain: memory.pain,
        past_objections: memory.pastObjections,
        promises: memory.promises,
        last_contact: memory.lastContact,
        next_follow_up: memory.nextFollowUp,
      }
    : {
        lead_name: 'Test Prospect',
        company: 'ScaleSync',
        source: 'Admin Test Call Interface',
      }

  // 3. Dispatch via Voice Provider
  const provider = getVoiceProvider(settings.provider)
  const dispatchResult = await provider.dispatchCall({
    agentId: settings.agentId,
    toNumber: normalizedNumber,
    callContext,
  })

  if (!dispatchResult.success) {
    return {
      success: false,
      message: dispatchResult.error || 'Provider failed to dispatch call.',
    }
  }

  const newCall: CallRecord = {
    id: `call_${Date.now()}`,
    providerCallId: dispatchResult.providerCallId || `omni_${Date.now()}`,
    toNumber: normalizedNumber,
    status: (dispatchResult.status as CallRecord['status']) || 'dispatched',
    durationSeconds: 0,
    transcript: 'Call in progress. Awaiting post-call webhook transcript...',
    summary: 'Test call connected to allow-listed number. Ongoing conversation.',
    extractedVariables: { test_mode: true, context_injected: !!memory },
    complianceNotes: 'Passed allow-list verification and AI disclosure gate.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  globalVoiceStore.calls.unshift(newCall)

  const supabase = await createClient()
  if (supabase) {
    try {
      await supabase.from('calls').insert({
        provider_call_id: newCall.providerCallId,
        to_number: newCall.toNumber,
        status: newCall.status,
        transcript: newCall.transcript,
        summary: newCall.summary,
        compliance_notes: newCall.complianceNotes,
      })
    } catch {
      // Fallback
    }
  }

  safeRevalidatePath('/calls')
  return {
    success: true,
    message: `Test call successfully dispatched to allow-listed number ${newCall.toNumber}!`,
    callRecord: newCall,
  }
}

export async function getCallsAction(): Promise<CallRecord[]> {
  const supabase = await createClient()
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('calls')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data && data.length > 0) {
        return data.map((row: Record<string, unknown>) => ({
          id: String(row.id),
          providerCallId: String(row.provider_call_id || ''),
          toNumber: String(row.to_number || ''),
          fromNumber: row.from_number ? String(row.from_number) : undefined,
          status: (row.status as CallRecord['status']) || 'completed',
          durationSeconds: Number(row.duration_seconds || 0),
          transcript: String(row.transcript || ''),
          summary: String(row.summary || ''),
          extractedVariables: (row.extracted_variables || {}) as Record<string, unknown>,
          complianceNotes: String(row.compliance_notes || ''),
          rawWebhookPayload: row.raw_webhook_payload,
          createdAt: String(row.created_at || new Date().toISOString()),
          updatedAt: String(row.updated_at || new Date().toISOString()),
        }))
      }
    } catch {
      // Fallback
    }
  }
  return globalVoiceStore.calls
}

export async function storeWebhookCallAction(parsedWebhook: ParsedCallWebhook) {
  const existingIndex = globalVoiceStore.calls.findIndex(
    (c) => c.providerCallId === parsedWebhook.providerCallId || c.id === parsedWebhook.callId
  )

  const callId = existingIndex >= 0 ? globalVoiceStore.calls[existingIndex].id : `call_${Date.now()}`
  const toNumber = parsedWebhook.toNumber || (existingIndex >= 0 ? globalVoiceStore.calls[existingIndex].toNumber : '+919876543210')

  // Run Post-Call Intelligence with Retry
  const analysisResult = await analyzeCallWithRetry({
    callId,
    transcript: parsedWebhook.transcript,
    toNumber,
    existingMemory: globalProspectMemoryStore[toNumber],
  })

  const analysis = analysisResult.success ? analysisResult.result : undefined

  // Update Prospect Memory if available
  if (analysis?.prospectMemory) {
    globalProspectMemoryStore[toNumber] = analysis.prospectMemory
  }

  const updatedRecord: CallRecord = {
    id: callId,
    providerCallId: parsedWebhook.providerCallId,
    toNumber,
    status: parsedWebhook.status,
    durationSeconds: parsedWebhook.durationSeconds,
    transcript: parsedWebhook.transcript,
    summary: analysis?.summary || parsedWebhook.summary,
    extractedVariables: parsedWebhook.extractedVariables,
    rawWebhookPayload: parsedWebhook.rawPayload,
    complianceNotes: 'Webhook ingested and post-call intelligence analyzed successfully.',
    analysis,
    createdAt: existingIndex >= 0 ? globalVoiceStore.calls[existingIndex].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  if (existingIndex >= 0) {
    globalVoiceStore.calls[existingIndex] = updatedRecord
  } else {
    globalVoiceStore.calls.unshift(updatedRecord)
  }

  const supabase = await createClient()
  if (supabase) {
    try {
      await supabase.from('calls').upsert({
        provider_call_id: updatedRecord.providerCallId,
        to_number: updatedRecord.toNumber,
        status: updatedRecord.status,
        duration_seconds: updatedRecord.durationSeconds,
        transcript: updatedRecord.transcript,
        summary: updatedRecord.summary,
        extracted_variables: updatedRecord.extractedVariables,
        raw_webhook_payload: updatedRecord.rawWebhookPayload,
        compliance_notes: updatedRecord.complianceNotes,
        updated_at: new Date().toISOString(),
      })

      if (analysis) {
        await supabase.from('call_analysis').insert({
          call_id: updatedRecord.id,
          intent: analysis.intent,
          objections_raised: analysis.objectionsRaised,
          buying_signals: analysis.buyingSignals,
          conversation_signals: analysis.conversationSignals,
          qualification_result: analysis.qualification,
          lead_score: analysis.leadScore,
          lead_score_reasons: analysis.leadScoreReasons,
          next_action: analysis.nextAction,
          summary: analysis.summary,
          human_handoff: analysis.humanHandoff,
          human_handoff_reasons: analysis.humanHandoffReasons,
          call_quality_score: analysis.callQualityScore,
          call_quality_breakdown: analysis.callQualityBreakdown,
          coaching_notes: analysis.coachingNotes,
          confidence_score: analysis.confidenceScore,
        })

        if (analysis.prospectMemory) {
          const pm = analysis.prospectMemory
          await supabase.from('prospect_memory').upsert(
            {
              phone: pm.phone,
              name: pm.name,
              company: pm.company,
              role: pm.role,
              pain: pm.pain,
              past_objections: pm.pastObjections,
              promises: pm.promises,
              last_contact: pm.lastContact,
              next_follow_up: pm.nextFollowUp,
              notes: pm.notes,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'phone' }
          )
        }
      }
    } catch {
      // Fallback
    }
  }

  safeRevalidatePath('/calls')
  return { success: true, record: updatedRecord, analysis }
}

export async function getProspectMemoryAction(phone: string): Promise<ProspectMemory | null> {
  const normalized = normalizePhoneNumber(phone)
  return globalProspectMemoryStore[normalized] || null
}

export async function getLastAgentUpdateAction() {
  return globalVoiceStore.lastAgentUpdate
}
