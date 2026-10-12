export const BRAIN_FILE_KEYS = [
  '01_company',
  '02_products',
  '03_icp',
  '04_buyer_personas',
  '05_sales_methodology',
  '06_objections',
  '07_case_studies',
  '08_pricing',
  '09_conversation_rules',
  '10_compliance',
  '11_qualification',
  '12_followup',
] as const

export type BrainFileKey = (typeof BRAIN_FILE_KEYS)[number]

export const BRAIN_FILE_TITLES: Record<BrainFileKey, string> = {
  '01_company': 'Company & Mission Profile',
  '02_products': 'Products & Services Catalog',
  '03_icp': 'Ideal Customer Profile (ICP)',
  '04_buyer_personas': 'Buyer Personas & Pain Maps',
  '05_sales_methodology': 'Sales Methodology & Talk Tracks',
  '06_objections': 'Objection Handling Playbook',
  '07_case_studies': 'Case Studies & Proof Points',
  '08_pricing': 'Pricing & Commercial Terms',
  '09_conversation_rules': 'Phone Conversation Rules & Flow',
  '10_compliance': 'Compliance, Calling Hours & AI Disclosure',
  '11_qualification': 'Lead Qualification & Disqualification Rubric',
  '12_followup': 'Follow-Up, Escalation & Next Action Protocols',
}

export interface AIEmployeeProfile {
  name: string
  role: string
  industry: string
  personality: string
  salesStyle: string
  goal: string
}

export interface ObjectionEntry {
  objection: string
  preferredResponse: string
}

export interface SourceMaterialEntry {
  id: string
  title: string
  contentType: 'script' | 'case_study' | 'faq' | 'transcript'
  content: string
}

export interface InterviewData {
  company: {
    name: string
    website: string
    industry: string
    description: string
    mission: string
    headquarters: string
  }
  products: {
    offerings: string
    valueProposition: string
    keyDifferentiators: string
    pricingModels: string
  }
  icp: {
    targetIndustries: string
    targetCompanySize: string
    targetRoles: string
    primaryPains: string
  }
  salesProcess: {
    salesMotion: string
    primaryCallGoal: string
    calendarMeetingLength: string
    bookingLinkOrMechanism: string
  }
  objections: {
    entries: ObjectionEntry[]
  }
  qualification: {
    mustHaveCriteria: string
    dealBreakers: string
    budgetThreshold: string
    decisionMakerRequirement: string
  }
  escalation: {
    escalationTriggers: string
    escalationContact: string
    emergencyResponse: string
  }
  compliance: {
    callingHours: string
    dndPolicy: string
    aiDisclosureLine: string
    consentRecordRequirement: string
  }
  brandVoice: {
    tone: string
    vocabularyToAvoid: string
    keyPhrasesToUse: string
    agentProfile: AIEmployeeProfile
  }
  proofPoints: {
    caseStudies: string
    metricsAndResults: string
    notableClients: string
    sourceMaterials: SourceMaterialEntry[]
  }
}

export interface SampleObjectionTest {
  id: number
  objection: string
  category: string
  expectedStyle: string
  recommendedScript: string
}

export interface CompiledSalesBrain {
  files: Record<BrainFileKey, string>
  voiceAgentPrompt: string
  sampleObjections: SampleObjectionTest[]
  compiledAt: string
}

export interface BrainFileVersion {
  version: number
  content: string
  createdAt: string
}
