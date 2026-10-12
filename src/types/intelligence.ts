export type CallIntent =
  | 'positive'
  | 'negative'
  | 'neutral'
  | 'curious'
  | 'high_intent'

export type ObjectionType =
  | 'price'
  | 'timing'
  | 'trust'
  | 'authority'
  | 'competitor'
  | 'no_need'
  | 'budget'

export type BuyingSignal =
  | 'price'
  | 'demo'
  | 'implementation'
  | 'results'
  | 'timeline'
  | 'contract'

export type ConversationSignal =
  | 'busy'
  | 'interested'
  | 'skeptical'
  | 'confused'
  | 'frustrated'

export interface CallQualityRubric {
  opening: number // 0-20
  discovery: number // 0-20
  objectionHandling: number // 0-20
  callToAction: number // 0-20
  compliance: number // 0-20
}

export interface QualificationResult {
  isQualified: boolean
  matchedCriteria: string[]
  unmetCriteria: string[]
  notes: string
}

export interface ContextualFollowUp {
  required: boolean
  scheduledAt?: string // ISO string
  reason?: string
  previousContext?: string
}

export interface ProspectMemory {
  id?: string
  phone: string
  name: string
  company: string
  role: string
  pain: string
  pastObjections: string[]
  promises: string
  lastContact: string
  nextFollowUp?: string
  notes?: string
}

export interface CallAnalysisResult {
  id?: string
  callId: string
  intent: CallIntent
  objectionsRaised: ObjectionType[]
  buyingSignals: BuyingSignal[]
  conversationSignals: ConversationSignal[]
  qualification: QualificationResult
  leadScore: number // 0-100
  leadScoreReasons: string
  nextAction: string
  summary: string
  humanHandoff: boolean
  humanHandoffReasons: string[]
  callQualityScore: number // 0-100
  callQualityBreakdown: CallQualityRubric
  coachingNotes: string
  confidenceScore: number // 0.0 - 1.0
  followUp?: ContextualFollowUp
  prospectMemory?: ProspectMemory
  analyzedAt: string
}
