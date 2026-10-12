/**
 * Core Adapter Interfaces for Desynthic AI Sales Employee (PRD v2.1)
 * Enforces swappable external infrastructure behind typed abstractions.
 */

// 1. Voice Provider Interface
export interface CallDispatchRequest {
  workspaceId: string
  leadId: string
  toNumber: string
  fromNumberId?: string
  agentId: string
  prompt: string
  language?: 'en' | 'hi' | 'hinglish' | 'te'
  callContext: Record<string, unknown>
}

export interface CallDispatchResult {
  providerCallId: string
  status: 'INITIATED' | 'QUEUED' | 'FAILED'
  timestamp: string
  error?: string
}

export interface VoiceWebhookPayload {
  providerEventId: string
  providerCallId: string
  eventType: 'call.started' | 'call.ringing' | 'call.connected' | 'call.completed' | 'call.failed'
  durationSeconds?: number
  recordingUrl?: string
  transcript?: Array<{ speaker: 'agent' | 'prospect'; text: string; timestamp?: string }>
  summary?: string
  extractedVariables?: Record<string, unknown>
  failureReason?: string
}

export interface VoiceProvider {
  name: string
  dispatchCall(request: CallDispatchRequest): Promise<CallDispatchResult>
  updateAgentPrompt(agentId: string, prompt: string): Promise<{ success: boolean; updatedAgentId: string }>
  parseWebhook(rawPayload: unknown): Promise<VoiceWebhookPayload>
}

// 2. LLM Provider Interface
export interface LLMCompletionOptions {
  temperature?: number
  maxTokens?: number
  responseFormat?: 'text' | 'json'
}

export interface LLMResponse {
  content: string
  modelUsed: string
  tokenUsage: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
}

export interface LLMProvider {
  name: string
  complete(prompt: string, options?: LLMCompletionOptions): Promise<LLMResponse>
}

// 3. Calendar Provider Interface
export interface CalendarSlot {
  startTime: string
  endTime: string
  timeZone: string
}

export interface BookMeetingRequest {
  workspaceId: string
  leadId: string
  prospectName: string
  prospectEmail: string
  startTime: string
  endTime: string
  timeZone: string
  title: string
  description?: string
}

export interface BookMeetingResult {
  providerEventId: string
  meetingUrl?: string
  confirmed: boolean
  scheduledAt: string
}

export interface CalendarProvider {
  name: string
  getAvailableSlots(startDate: string, endDate: string, timeZone: string): Promise<CalendarSlot[]>
  bookMeeting(request: BookMeetingRequest): Promise<BookMeetingResult>
}

// 4. CRM Provider Interface
export interface CrmLeadData {
  leadId: string
  phone: string
  name: string
  company?: string
  status: string
  summary?: string
  score?: number
  nextAction?: string
  meetingTime?: string
  objections?: string[]
}

export interface CrmSyncResult {
  providerRecordId: string
  success: boolean
  syncedAt: string
  error?: string
}

export interface CRMProvider {
  name: string
  syncLead(data: CrmLeadData): Promise<CrmSyncResult>
}

// 5. Messaging Provider (WhatsApp) Interface
export interface SendMessageRequest {
  workspaceId: string
  leadId: string
  recipientPhone: string
  templateName?: string
  templateLanguage?: string
  templateVariables?: Record<string, string>
  freeText?: string
}

export interface SendMessageResult {
  providerMessageId: string
  status: 'SENT' | 'DELIVERED' | 'FAILED'
  timestamp: string
  error?: string
}

export interface MessagingProvider {
  name: string
  sendTemplate(request: SendMessageRequest): Promise<SendMessageResult>
  sendFreeText(request: SendMessageRequest): Promise<SendMessageResult>
}
