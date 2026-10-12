/**
 * Types for Business Discovery, Sales Brain, and Built-in Test Suite (PRD v2.1 Phase 1)
 */

export interface DiscoveryInterviewData {
  company: {
    name: string
    website: string
    industry: string
    description: string
    headquarters: string
  }
  offer: {
    offerings: string
    valueProposition: string
    differentiators: string
  }
  icp: {
    targetIndustries: string
    targetCompanySize: string
    targetRoles: string
    disqualifiers: string
    primaryPains: string
  }
  salesProcess: {
    salesMotion: string
    primaryCallGoal: string
    meetingLengthMinutes: number
    calendarBookingMechanism: string
  }
  pricing: {
    approvedPricingModel: string
    negotiable: boolean
    pricingNotes: string
  }
  proofPoints: {
    caseStudiesSummary: string
    quantifiableMetrics: string
  }
  objections: Array<{
    objection: string
    approvedResponse: string
  }>
  prohibitedClaims: string
  brandVoice: {
    tone: string
    energy: string
    personaName: string
  }
  callOpening: {
    greeting: string
    mandatoryAiDisclosure: string
  }
  handoffRules: {
    triggers: string[]
    contactPersonName: string
    contactEmail: string
  }
  languages: Array<'en' | 'hi' | 'hinglish'>
}

export type BrainSectionKey =
  | 'company'
  | 'products'
  | 'icp'
  | 'objections'
  | 'pricing'
  | 'compliance'
  | 'voice_and_tone'
  | 'handoff_rules'

export interface BrainSection {
  key: BrainSectionKey
  title: string
  content: string
  updatedAt: string
}

export interface VersionedSalesBrain {
  id: string
  workspaceId: string
  version: number
  isActive: boolean
  baseSystemPrompt: string
  aiDisclosureLine?: string
  optOutProtocol?: string
  sections: Record<BrainSectionKey, BrainSection>
  createdAt: string
  activatedAt?: string
}

export interface CompiledSalesBrain {
  version: number
  compiledAt: string
  baseSystemPrompt: string
  aiDisclosureLine?: string
  optOutProtocol?: string
  sections: Record<string, { title?: string; content?: string; isComplete?: boolean }>
  metadata: {
    companyName?: string
    agentPersona?: string
    targetLanguages?: string[]
    approvedBy?: string
  }
}

export interface BrainTestScenario {
  id: string
  name: string
  category:
    | 'product_question'
    | 'pricing'
    | 'top_objection'
    | 'competitor_question'
    | 'disqualified_lead'
    | 'angry_busy_prospect'
    | 'opt_out_english'
    | 'opt_out_hindi'
    | 'opt_out_hinglish'
    | 'request_human'
    | 'unknown_question'
  prospectUtterance: string
  expectedBehavior: string
  passCriteria: (response: string) => { passed: boolean; reason: string }
}

export interface BrainTestResult {
  scenarioId: string
  scenarioName: string
  category: BrainTestScenario['category']
  prospectUtterance: string
  aiResponse: string
  passed: boolean
  reason: string
}
