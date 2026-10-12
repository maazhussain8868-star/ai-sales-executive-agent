import { Lead } from '@/types/campaign'
import { ChannelConsent, SequenceEnrollment } from '@/types/channels'

export interface GlobalStopResult {
  leadId: string
  globalStopTriggered: boolean
  triggerChannel?: string
  reason?: string
  updatedLead: Lead
  updatedConsents: ChannelConsent[]
  haltedEnrollments: SequenceEnrollment[]
}

/**
 * Executes a Global Stop for a lead across ALL channels.
 * Rules:
 * - Marks lead.dnd = true and status = 'UNQUALIFIED'
 * - Sets all channel consents (voice, whatsapp, email) to 'opted_out'
 * - Halts any in-progress sequences for that lead
 */
export function executeGlobalStop(params: {
  lead: Lead
  triggerChannel: 'voice' | 'whatsapp' | 'email'
  reason: string
  consents: ChannelConsent[]
  enrollments: SequenceEnrollment[]
}): GlobalStopResult {
  const { lead, triggerChannel, reason, consents, enrollments } = params

  const updatedLead: Lead = {
    ...lead,
    dnd: true,
    status: 'UNQUALIFIED',
    updatedAt: new Date().toISOString(),
  }

  const updatedConsents: ChannelConsent[] = consents.map((c) => {
    if (c.leadId === lead.id) {
      return {
        ...c,
        status: 'opted_out',
        proof: `Global STOP received via ${triggerChannel}: "${reason}" at ${new Date().toISOString()}`,
        timestamp: new Date().toISOString(),
      }
    }
    return c
  })

  // Ensure all 3 channels exist and are marked opted_out
  const channels: Array<'voice' | 'whatsapp' | 'email'> = ['voice', 'whatsapp', 'email']
  for (const ch of channels) {
    if (!updatedConsents.some((c) => c.leadId === lead.id && c.channel === ch)) {
      updatedConsents.push({
        id: `cst_${Date.now()}_${ch}`,
        leadId: lead.id,
        channel: ch,
        status: 'opted_out',
        source: 'global_stop',
        proof: `Global STOP triggered via ${triggerChannel}: ${reason}`,
        timestamp: new Date().toISOString(),
      })
    }
  }

  const haltedEnrollments = enrollments.map((en) => {
    if (en.leadId === lead.id && en.status === 'in_progress') {
      return {
        ...en,
        status: 'halted' as const,
        haltReason: `Halted by Global Stop on ${triggerChannel}: ${reason}`,
      }
    }
    return en
  })

  return {
    leadId: lead.id,
    globalStopTriggered: true,
    triggerChannel,
    reason,
    updatedLead,
    updatedConsents,
    haltedEnrollments,
  }
}
