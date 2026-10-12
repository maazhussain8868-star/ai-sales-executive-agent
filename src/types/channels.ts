export type ChannelType = 'voice' | 'whatsapp' | 'email'

export type ConsentStatus = 'opted_in' | 'opted_out' | 'pending'

export interface ChannelConsent {
  id: string
  leadId: string
  channel: ChannelType
  status: ConsentStatus
  source: string
  proof?: string
  timestamp: string
}

export type MessageDirection = 'outbound' | 'inbound'

export type MessageStatus =
  | 'draft'
  | 'pending_approval'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'replied'

export interface TimelineMessage {
  id: string
  leadId: string
  channel: ChannelType
  direction: MessageDirection
  sender: string
  recipient: string
  subject?: string
  content: string
  templateId?: string
  status: MessageStatus
  aiDrafted?: boolean
  approvedBy?: string
  externalId?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface WhatsAppTemplate {
  id: string
  name: string
  category: 'MARKETING' | 'UTILITY'
  language: string
  body: string
  status: 'APPROVED' | 'PENDING' | 'REJECTED'
  variables: string[]
}

export interface SequenceStep {
  id: string
  sequenceId: string
  stepOrder: number
  channel: ChannelType
  waitHours: number
  condition?: 'always' | 'no_answer' | 'not_booked'
  templateId?: string
  subject?: string
  bodyPrompt?: string
}

export interface Sequence {
  id: string
  name: string
  description?: string
  status: 'active' | 'paused'
  steps: SequenceStep[]
}

export interface SequenceEnrollment {
  id: string
  sequenceId: string
  leadId: string
  currentStep: number
  status: 'in_progress' | 'completed' | 'halted' | 'replied'
  nextActionAt?: string
  haltReason?: string
  createdAt?: string
  updatedAt?: string
}
