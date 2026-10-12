import { ChannelType, MessageStatus } from '@/types/channels'

export interface ChannelSendOptions {
  leadId: string
  to: string
  content: string
  subject?: string
  templateId?: string
  templateVariables?: Record<string, string>
  hasConsent: boolean
  lastInboundTimestamp?: string
  unsubscribeUrl?: string
}

export interface ChannelSendResult {
  success: boolean
  messageId?: string
  status: MessageStatus
  error?: string
  blockedByConsent?: boolean
  blockedByCompliance?: boolean
}

export interface InboundMessage {
  channel: ChannelType
  from: string
  to: string
  content: string
  subject?: string
  timestamp: string
  rawPayload?: unknown
  isOptOut: boolean
}

export interface ChannelAdapter {
  channel: ChannelType
  send(options: ChannelSendOptions): Promise<ChannelSendResult>
  parseInbound(payload: unknown): InboundMessage | null
}
