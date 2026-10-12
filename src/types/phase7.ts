export type SupportedLanguage = 'en' | 'hi' | 'te' | 'ta' | 'hinglish'

export interface MultilingualGreeting {
  language: SupportedLanguage
  label: string
  greeting: string
  aiDisclosure: string
  objectionResponseSnippet: string
  bookingConfirmation: string
}

export interface AbExperiment {
  id: string
  workspaceId: string
  name: string
  status: 'active' | 'paused' | 'concluded'
  variantAPrompt: string
  variantBPrompt: string
  trafficSplitPercent: number // e.g. 50 for 50/50
  variantACalls: number
  variantAMeetings: number
  variantBCalls: number
  variantBMeetings: number
  winningVariant?: 'A' | 'B' | null
  confidenceScore?: number
  createdAt: string
}

export interface SalesCoachingReport {
  id: string
  workspaceId: string
  callId: string
  prospectName: string
  talkToListenRatio: number // e.g. 0.45 (agent talked 45% of time)
  speechPaceWpm: number // words per minute (optimal ~130-150)
  fillerWordsCount: number
  objectionHandlingScore: number // 0-100
  strengths: string[]
  improvementAreas: string[]
  recommendedPromptPatch?: string
  appliedToBrain: boolean
  createdAt: string
}

export interface MethodologyPatch {
  id: string
  workspaceId: string
  sourceCallId: string
  category: 'objection_response' | 'value_proposition' | 'closing_hook'
  suggestedPatch: string
  rationale: string
  status: 'pending_review' | 'accepted' | 'rejected'
  createdAt: string
}

export type CrmProvider = 'hubspot' | 'zoho' | 'salesforce' | 'webhook'

export interface CrmIntegration {
  id: string
  workspaceId: string
  provider: CrmProvider
  status: 'connected' | 'disconnected' | 'error'
  apiKeyMasked?: string
  webhookUrl?: string
  lastSyncedAt?: string
  syncStats: {
    leadsSynced: number
    callsSynced: number
    dealsCreated: number
  }
}

export interface HumanSalesRep {
  id: string
  workspaceId: string
  name: string
  phone: string
  email: string
  role: 'Account Executive' | 'Sales Director' | 'Solutions Architect'
  status: 'available' | 'in_call' | 'offline'
  tier: 'enterprise' | 'standard'
  assignedMeetingsCount: number
}

export interface InboundCallLog {
  id: string
  workspaceId: string
  callerNumber: string
  language: SupportedLanguage
  intentDetected: string
  routedTo: 'ai_agent' | 'human_rep' | 'voicemail'
  transferredToRepName?: string
  resolution: 'qualified' | 'meeting_booked' | 'escalated' | 'inquiry_resolved' | 'dropped'
  durationSeconds: number
  createdAt: string
}

export interface WalletLedger {
  workspaceId: string
  currentMinutesBalance: number
  totalMinutesPurchased: number
  totalMinutesConsumed: number
  planName: 'Starter' | 'Growth' | 'Enterprise Scale'
  rechargeHistory: Array<{
    id: string
    amountInr: number
    minutesAdded: number
    paymentId: string
    timestamp: string
  }>
}
