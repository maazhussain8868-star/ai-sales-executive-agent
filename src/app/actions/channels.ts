'use server'

import { revalidatePath } from 'next/cache'
import {
  ChannelConsent,
  TimelineMessage,
  ChannelType,
  ConsentStatus,
  SequenceEnrollment,
} from '@/types/channels'
import { WhatsAppAdapter } from '@/lib/channels/whatsapp'
import { EmailAdapter } from '@/lib/channels/email'
import { executeGlobalStop } from '@/lib/channels/compliance'
import {
  DEFAULT_3STEP_SEQUENCE,
  executeSequenceStep,
  draftInboundAiReply,
} from '@/lib/channels/sequence-engine'
import { getLeadsAction, updateLeadStatusAction } from './campaign'
import { createClient } from '@/lib/supabase/server'

function safeRevalidate(path: string) {
  try {
    revalidatePath(path)
  } catch {
    // Non-request context
  }
}

// In-memory stores
const globalChannelStore = {
  consents: [] as ChannelConsent[],
  messages: [] as TimelineMessage[],
  enrollments: [] as SequenceEnrollment[],
  initialized: false,
}

function initializeChannelStore() {
  if (globalChannelStore.initialized) return

  // Demo consents: Opted in for test leads
  const testLeads = [
    'lead_seed_1',
    'lead_seed_2',
    'lead_seed_3',
    'lead_seed_4',
    'lead_seed_5',
  ]

  const now = new Date().toISOString()
  for (const id of testLeads) {
    globalChannelStore.consents.push(
      { id: `cst_${id}_voice`, leadId: id, channel: 'voice', status: 'opted_in', source: 'web_form', timestamp: now },
      { id: `cst_${id}_wa`, leadId: id, channel: 'whatsapp', status: 'opted_in', source: 'optin_checkbox', timestamp: now },
      { id: `cst_${id}_em`, leadId: id, channel: 'email', status: 'opted_in', source: 'double_optin_email', timestamp: now }
    )
  }

  // Pre-seed some timeline messages for demonstration
  globalChannelStore.messages.push({
    id: 'msg_init_call_01',
    leadId: 'lead_seed_1',
    channel: 'voice',
    direction: 'outbound',
    sender: 'Priya (AI Voice)',
    recipient: '+919876543210',
    content: 'Phone call completed (120s). Discovery discussed, prospect interested in SDR automation.',
    status: 'delivered',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  })

  globalChannelStore.initialized = true
}

initializeChannelStore()

export async function getChannelConsentsAction(leadId: string): Promise<ChannelConsent[]> {
  const supabase = await createClient()
  if (supabase) {
    try {
      const { data } = await supabase.from('channel_consents').select('*').eq('lead_id', leadId)
      if (data && data.length > 0) return data as ChannelConsent[]
    } catch {
      // Fallback
    }
  }
  return globalChannelStore.consents.filter((c) => c.leadId === leadId)
}

export async function updateChannelConsentAction(
  leadId: string,
  channel: ChannelType,
  status: ConsentStatus
) {
  const existing = globalChannelStore.consents.find((c) => c.leadId === leadId && c.channel === channel)
  const now = new Date().toISOString()

  if (existing) {
    existing.status = status
    existing.timestamp = now
  } else {
    globalChannelStore.consents.push({
      id: `cst_${Date.now()}_${channel}`,
      leadId,
      channel,
      status,
      source: 'admin_dashboard',
      timestamp: now,
    })
  }

  const supabase = await createClient()
  if (supabase) {
    try {
      await supabase.from('channel_consents').upsert({
        lead_id: leadId,
        channel,
        status,
        updated_at: now,
      })
    } catch {
      // Fallback
    }
  }

  safeRevalidate('/campaigns')
  return { success: true }
}

export async function getLeadTimelineAction(leadId: string): Promise<TimelineMessage[]> {
  const supabase = await createClient()
  if (supabase) {
    try {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: true })
      if (data && data.length > 0) return data as TimelineMessage[]
    } catch {
      // Fallback
    }
  }

  return globalChannelStore.messages
    .filter((m) => m.leadId === leadId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

export async function sendWhatsAppMessageAction(params: {
  leadId: string
  to: string
  templateId: string
  customText?: string
}) {
  const { leadId, to, templateId } = params
  const consents = await getChannelConsentsAction(leadId)
  const waConsent = consents.find((c) => c.channel === 'whatsapp')
  const hasConsent = waConsent ? waConsent.status === 'opted_in' : false

  const adapter = new WhatsAppAdapter()
  const result = await adapter.send({
    leadId,
    to,
    content: params.customText || 'Template message',
    templateId,
    hasConsent,
  })

  if (result.success) {
    const newMsg: TimelineMessage = {
      id: result.messageId || `msg_wa_${Date.now()}`,
      leadId,
      channel: 'whatsapp',
      direction: 'outbound',
      sender: 'Desynthic WhatsApp Business (+919999900000)',
      recipient: to,
      templateId,
      content: params.customText || `Template message: ${templateId}`,
      status: result.status,
      createdAt: new Date().toISOString(),
    }
    globalChannelStore.messages.push(newMsg)
  }

  safeRevalidate('/campaigns')
  return result
}

export async function sendEmailMessageAction(params: {
  leadId: string
  to: string
  subject: string
  content: string
  unsubscribeUrl?: string
}) {
  const { leadId, to, subject, content, unsubscribeUrl } = params
  const consents = await getChannelConsentsAction(leadId)
  const emailConsent = consents.find((c) => c.channel === 'email')
  const hasConsent = emailConsent ? emailConsent.status === 'opted_in' : false

  const adapter = new EmailAdapter()
  const result = await adapter.send({
    leadId,
    to,
    subject,
    content,
    hasConsent,
    unsubscribeUrl: unsubscribeUrl || `https://desynthic.com/unsubscribe?lead=${leadId}`,
  })

  if (result.success) {
    const newMsg: TimelineMessage = {
      id: result.messageId || `msg_em_${Date.now()}`,
      leadId,
      channel: 'email',
      direction: 'outbound',
      sender: 'priya@desynthic.com',
      recipient: to,
      subject,
      content,
      status: result.status,
      createdAt: new Date().toISOString(),
    }
    globalChannelStore.messages.push(newMsg)
  }

  safeRevalidate('/campaigns')
  return result
}

export async function processInboundReplyAction(params: {
  leadId: string
  channel: 'whatsapp' | 'email'
  text: string
  mode?: 'draft_for_approval' | 'auto_reply'
}) {
  const { leadId, channel, text, mode = 'draft_for_approval' } = params
  const leads = await getLeadsAction()
  const lead = leads.find((l) => l.id === leadId)
  if (!lead) return { success: false, error: 'Lead not found' }

  // 1. Record Inbound Message in Timeline
  const inboundMsg: TimelineMessage = {
    id: `msg_in_${Date.now()}`,
    leadId,
    channel,
    direction: 'inbound',
    sender: lead.name,
    recipient: 'Desynthic AI Assistant',
    content: text,
    status: 'delivered',
    createdAt: new Date().toISOString(),
  }
  globalChannelStore.messages.push(inboundMsg)

  // 2. Check for Global Stop / Opt-out
  const lower = text.toLowerCase().trim()
  const isStop =
    lower === 'stop' ||
    lower === 'unsubscribe' ||
    lower === 'opt out' ||
    lower.includes('do not contact') ||
    lower.includes('stop emailing')

  if (isStop) {
    const stopResult = executeGlobalStop({
      lead,
      triggerChannel: channel,
      reason: text,
      consents: globalChannelStore.consents,
      enrollments: globalChannelStore.enrollments,
    })

    globalChannelStore.consents = stopResult.updatedConsents
    globalChannelStore.enrollments = stopResult.haltedEnrollments
    await updateLeadStatusAction(lead.id, 'UNQUALIFIED')

    safeRevalidate('/campaigns')
    return {
      success: true,
      globalStopTriggered: true,
      inboundMessage: inboundMsg,
      message: `Global STOP received via ${channel}. All channels halted and lead marked DND.`,
    }
  }

  // 3. Draft Consultative Reply from Sales Brain
  const aiDraft = draftInboundAiReply({
    lead,
    inboundText: text,
    channel,
    mode,
  })
  globalChannelStore.messages.push(aiDraft)

  safeRevalidate('/campaigns')
  return {
    success: true,
    globalStopTriggered: false,
    inboundMessage: inboundMsg,
    aiDraft,
  }
}

export async function approveAiDraftAction(messageId: string) {
  const msg = globalChannelStore.messages.find((m) => m.id === messageId)
  if (msg && msg.status === 'pending_approval') {
    msg.status = 'sent'
    msg.approvedBy = 'Admin (Faraz)'
  }
  safeRevalidate('/campaigns')
  return { success: true, message: msg }
}

export async function runSequenceOnLeadsAction(params: {
  sequenceId: string
  leadIds: string[]
}) {
  const leads = await getLeadsAction()
  const results = []

  for (const leadId of params.leadIds) {
    const lead = leads.find((l) => l.id === leadId)
    if (!lead) continue

    let enrollment = globalChannelStore.enrollments.find((e) => e.leadId === leadId)
    if (!enrollment) {
      const newEnrollment: SequenceEnrollment = {
        id: `enr_${Date.now()}_${leadId}`,
        sequenceId: params.sequenceId,
        leadId,
        currentStep: 1,
        status: 'in_progress',
        createdAt: new Date().toISOString(),
      }
      globalChannelStore.enrollments.push(newEnrollment)
      enrollment = newEnrollment
    }

    const res = await executeSequenceStep({
      sequence: DEFAULT_3STEP_SEQUENCE,
      enrollment: enrollment,
      lead,
      consents: globalChannelStore.consents,
    })

    if (res.message) {
      globalChannelStore.messages.push(res.message)
    }
    results.push(res)
  }

  safeRevalidate('/campaigns')
  return { success: true, results }
}
