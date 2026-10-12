import { ChannelAdapter, ChannelSendOptions, ChannelSendResult, InboundMessage } from './provider'
import { WhatsAppTemplate } from '@/types/channels'

// Pre-approved standard templates
export const APPROVED_WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'tpl_wa_intro_01',
    name: 'sales_discovery_followup',
    category: 'MARKETING',
    language: 'en_US',
    body: 'Hi {{name}}, this is Priya from Desynthic. Following up on our brief sales pipeline discussion. Would you like to review our automated outbound demo?',
    status: 'APPROVED',
    variables: ['name'],
  },
  {
    id: 'tpl_wa_meeting_confirm_01',
    name: 'meeting_confirmation',
    category: 'UTILITY',
    language: 'en_US',
    body: 'Hi {{name}}, your AI Discovery Audit with Desynthic is confirmed for {{time}}. Google Meet link: {{link}}. Reply RESCHEDULE if you need to adjust.',
    status: 'APPROVED',
    variables: ['name', 'time', 'link'],
  },
  {
    id: 'tpl_wa_meeting_reminder_01',
    name: 'meeting_reminder',
    category: 'UTILITY',
    language: 'en_US',
    body: 'Hi {{name}}, reminder: our AI Discovery Audit is starting in 30 minutes. Meet link: {{link}}.',
    status: 'APPROVED',
    variables: ['name', 'link'],
  },
]

export class WhatsAppAdapter implements ChannelAdapter {
  channel = 'whatsapp' as const

  async send(options: ChannelSendOptions): Promise<ChannelSendResult> {
    // 1. Consent Hard Block
    if (!options.hasConsent) {
      return {
        success: false,
        status: 'failed',
        blockedByConsent: true,
        error: `BLOCKED: Lead ${options.leadId} does not have explicit WhatsApp consent. Business-initiated messages strictly prohibited.`,
      }
    }

    // 2. 24-Hour Customer Care Window Evaluation
    const now = Date.now()
    let isInside24hWindow = false
    if (options.lastInboundTimestamp) {
      const lastInboundTime = new Date(options.lastInboundTimestamp).getTime()
      isInside24hWindow = now - lastInboundTime <= 24 * 60 * 60 * 1000
    }

    // 3. Template vs Free-Text Rule
    if (!isInside24hWindow) {
      // Must use an approved template
      if (!options.templateId) {
        return {
          success: false,
          status: 'failed',
          blockedByCompliance: true,
          error: 'BLOCKED: Outside 24-hour service window. Outbound WhatsApp messages must use an approved Meta Cloud API template.',
        }
      }

      const template = APPROVED_WHATSAPP_TEMPLATES.find((t) => t.id === options.templateId)
      if (!template || template.status !== 'APPROVED') {
        return {
          success: false,
          status: 'failed',
          blockedByCompliance: true,
          error: `BLOCKED: WhatsApp template "${options.templateId}" is not approved.`,
        }
      }
    }

    // 4. Simulate Meta Cloud API dispatch / External HTTP call
    const simulatedMessageId = `wam_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    return {
      success: true,
      messageId: simulatedMessageId,
      status: 'delivered',
    }
  }

  parseInbound(payload: unknown): InboundMessage | null {
    if (!payload || typeof payload !== 'object') return null

    const p = payload as Record<string, unknown>
    const from = String(p.from || p.sender || '')
    const to = String(p.to || p.recipient || '+919999900000')
    const content = String(p.text || p.content || p.body || '').trim()

    if (!from || !content) return null

    const lower = content.toLowerCase()
    const isOptOut =
      lower === 'stop' ||
      lower === 'unsubscribe' ||
      lower === 'opt out' ||
      lower.includes('do not contact') ||
      lower.includes("don't message")

    return {
      channel: 'whatsapp',
      from,
      to,
      content,
      timestamp: new Date().toISOString(),
      rawPayload: payload,
      isOptOut,
    }
  }
}
