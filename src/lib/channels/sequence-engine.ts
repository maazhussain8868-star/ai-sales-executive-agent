import { Lead } from '@/types/campaign'
import {
  Sequence,
  SequenceEnrollment,
  TimelineMessage,
  ChannelConsent,
} from '@/types/channels'
import { WhatsAppAdapter } from './whatsapp'
import { EmailAdapter } from './email'

const whatsappAdapter = new WhatsAppAdapter()
const emailAdapter = new EmailAdapter()

export interface SequenceStepExecutionResult {
  enrollmentId: string
  leadId: string
  stepOrder: number
  channel: string
  dispatched: boolean
  message?: TimelineMessage
  halted?: boolean
  haltReason?: string
  skipped?: boolean
  skipReason?: string
}

/**
 * Standard 3-step default sequence:
 * Step 1: Voice Call (initial outreach)
 * Step 2: WhatsApp follow-up after 2 hours if no answer and opted in
 * Step 3: Consultative Email on Day 2 with case study
 */
export const DEFAULT_3STEP_SEQUENCE: Sequence = {
  id: 'seq_multichannel_3step',
  name: '3-Step Omnichannel Accelerator (Call -> WhatsApp -> Email)',
  description: 'Initial phone call, followed by WhatsApp template if unanswered, then consultative email follow-up.',
  status: 'active',
  steps: [
    {
      id: 'step_1',
      sequenceId: 'seq_multichannel_3step',
      stepOrder: 1,
      channel: 'voice',
      waitHours: 0,
      condition: 'always',
    },
    {
      id: 'step_2',
      sequenceId: 'seq_multichannel_3step',
      stepOrder: 2,
      channel: 'whatsapp',
      waitHours: 2,
      condition: 'no_answer',
      templateId: 'tpl_wa_intro_01',
    },
    {
      id: 'step_3',
      sequenceId: 'seq_multichannel_3step',
      stepOrder: 3,
      channel: 'email',
      waitHours: 24,
      condition: 'not_booked',
      subject: 'Desynthic Case Study: Automated Outbound SDR Replacement',
      bodyPrompt: 'Follow up with verified case study metrics and discovery audit link.',
    },
  ],
}

/**
 * Evaluates and executes the next step in a sequence for an enrolled lead.
 */
export async function executeSequenceStep(params: {
  sequence: Sequence
  enrollment: SequenceEnrollment
  lead: Lead
  consents: ChannelConsent[]
  lastCallStatus?: string // 'completed' | 'no_answer' | 'busy' | 'failed'
  currentTime?: Date
}): Promise<SequenceStepExecutionResult> {
  const { sequence, enrollment, lead, consents, lastCallStatus = 'no_answer' } = params

  // 1. Check Automatic Termination Conditions
  if (lead.dnd || lead.status === 'UNQUALIFIED') {
    enrollment.status = 'halted'
    enrollment.haltReason = 'Lead opted out / marked DND'
    return {
      enrollmentId: enrollment.id,
      leadId: lead.id,
      stepOrder: enrollment.currentStep,
      channel: 'none',
      dispatched: false,
      halted: true,
      haltReason: enrollment.haltReason,
    }
  }

  if (lead.status === 'MEETING_BOOKED') {
    enrollment.status = 'completed'
    enrollment.haltReason = 'Meeting booked successfully'
    return {
      enrollmentId: enrollment.id,
      leadId: lead.id,
      stepOrder: enrollment.currentStep,
      channel: 'none',
      dispatched: false,
      halted: true,
      haltReason: 'Meeting booked',
    }
  }

  // 2. Identify Current Step
  const currentStep = sequence.steps.find((s) => s.stepOrder === enrollment.currentStep)
  if (!currentStep) {
    enrollment.status = 'completed'
    return {
      enrollmentId: enrollment.id,
      leadId: lead.id,
      stepOrder: enrollment.currentStep,
      channel: 'none',
      dispatched: false,
      halted: true,
      haltReason: 'All steps completed',
    }
  }

  // 3. Check Channel Consent
  const consent = consents.find((c) => c.leadId === lead.id && c.channel === currentStep.channel)
  const hasConsent = consent ? consent.status === 'opted_in' : false

  // 4. Execute Channel Action
  let createdMessage: TimelineMessage | undefined

  if (currentStep.channel === 'voice') {
    // Voice Step
    createdMessage = {
      id: `msg_call_${Date.now()}`,
      leadId: lead.id,
      channel: 'voice',
      direction: 'outbound',
      sender: 'Priya (AI Voice Employee)',
      recipient: lead.phone,
      content: `Outbound AI phone call initiated to ${lead.name} (${lead.phone}). Status: ${lastCallStatus}.`,
      status: 'delivered',
      createdAt: new Date().toISOString(),
    }
  } else if (currentStep.channel === 'whatsapp') {
    // WhatsApp Step: Must respect consent
    const waResult = await whatsappAdapter.send({
      leadId: lead.id,
      to: lead.phone,
      content: `Hi ${lead.name}, this is Priya from Desynthic following up on our call.`,
      templateId: currentStep.templateId || 'tpl_wa_intro_01',
      hasConsent,
    })

    if (!waResult.success) {
      return {
        enrollmentId: enrollment.id,
        leadId: lead.id,
        stepOrder: currentStep.stepOrder,
        channel: 'whatsapp',
        dispatched: false,
        skipped: true,
        skipReason: waResult.error || 'Blocked by WhatsApp consent or compliance',
      }
    }

    createdMessage = {
      id: waResult.messageId || `msg_wa_${Date.now()}`,
      leadId: lead.id,
      channel: 'whatsapp',
      direction: 'outbound',
      sender: 'Desynthic WhatsApp Business (+919999900000)',
      recipient: lead.phone,
      templateId: currentStep.templateId,
      content: `Hi ${lead.name}, this is Priya from Desynthic. Following up on our brief sales pipeline discussion. Would you like to review our automated outbound demo?`,
      status: 'delivered',
      createdAt: new Date().toISOString(),
    }
  } else if (currentStep.channel === 'email') {
    // Email Step: Must respect consent & mandatory unsubscribe link
    const recipientEmail = lead.email || `${lead.name.toLowerCase().replace(/\s+/g, '.')}@example.com`
    const unsubscribeUrl = `https://desynthic.com/unsubscribe?lead=${lead.id}`

    const emailResult = await emailAdapter.send({
      leadId: lead.id,
      to: recipientEmail,
      subject: currentStep.subject || 'Automated Outbound Strategy for ' + (lead.company || 'Enterprise'),
      content: `Hi ${lead.name},\n\nFollowing up on our outbound sales automation talk tracks. GrowthBridge reduced SDR hiring costs by 65% in 30 days.\n\nLet me know if Friday at 4 PM IST works for a quick 20-minute audit.`,
      hasConsent,
      unsubscribeUrl,
    })

    if (!emailResult.success) {
      return {
        enrollmentId: enrollment.id,
        leadId: lead.id,
        stepOrder: currentStep.stepOrder,
        channel: 'email',
        dispatched: false,
        skipped: true,
        skipReason: emailResult.error || 'Blocked by email consent or compliance',
      }
    }

    createdMessage = {
      id: emailResult.messageId || `msg_em_${Date.now()}`,
      leadId: lead.id,
      channel: 'email',
      direction: 'outbound',
      sender: 'priya@desynthic.com',
      recipient: recipientEmail,
      subject: currentStep.subject,
      content: `Hi ${lead.name},\n\nFollowing up on our outbound sales automation talk tracks.\n\nUnsubscribe: ${unsubscribeUrl}`,
      status: 'delivered',
      createdAt: new Date().toISOString(),
    }
  }

  // Advance to next step
  enrollment.currentStep += 1
  enrollment.updatedAt = new Date().toISOString()
  if (enrollment.currentStep > sequence.steps.length) {
    enrollment.status = 'completed'
  }

  return {
    enrollmentId: enrollment.id,
    leadId: lead.id,
    stepOrder: currentStep.stepOrder,
    channel: currentStep.channel,
    dispatched: true,
    message: createdMessage,
  }
}

/**
 * Drafts an AI response from the Sales Brain for inbound replies.
 * In "draft_for_approval" mode (default), saves message with status 'pending_approval'.
 */
export function draftInboundAiReply(params: {
  lead: Lead
  inboundText: string
  channel: 'whatsapp' | 'email'
  mode?: 'draft_for_approval' | 'auto_reply'
}): TimelineMessage {
  const { lead, inboundText, channel, mode = 'draft_for_approval' } = params
  const lower = inboundText.toLowerCase()

  let draftedResponse = `Hi ${lead.name}, thank you for your response! We can definitely help you with that. Would you prefer a quick 20-minute Google Meet this Thursday at 4 PM IST?`

  if (lower.includes('cost') || lower.includes('price') || lower.includes('pricing')) {
    draftedResponse = `Hi ${lead.name}, our pricing starts at $499/month for unlimited conversational outbound. Let's schedule a 20-minute audit this Friday to review your SDR math.`
  } else if (lower.includes('later') || lower.includes('next week')) {
    draftedResponse = `Understood ${lead.name}. I will follow up with you early next week as requested!`
  }

  const status = mode === 'auto_reply' ? 'sent' : 'pending_approval'

  return {
    id: `msg_ai_draft_${Date.now()}`,
    leadId: lead.id,
    channel,
    direction: 'outbound',
    sender: 'Priya (Sales Brain Drafter)',
    recipient: channel === 'whatsapp' ? lead.phone : lead.email || 'prospect@example.com',
    content: draftedResponse,
    status,
    aiDrafted: true,
    createdAt: new Date().toISOString(),
  }
}
