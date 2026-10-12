/**
 * Types for Leads, Suppression, Campaigns & Pre-Launch Compliance (PRD v2.1 Phase 2)
 */

export type ContactChannel = 'voice' | 'whatsapp' | 'email' | 'sms'

export interface LeadV2 {
  id: string
  workspaceId: string
  phone: string // E.164 format (+91...)
  name: string
  email?: string
  company?: string
  preferredLanguage: 'en' | 'hi' | 'hinglish' | 'te'
  timeZone: string
  source: string
  importedAt: string
  status: 'NEW' | 'READY' | 'QUEUED' | 'CALLED' | 'CONNECTED' | 'QUALIFIED' | 'UNQUALIFIED' | 'OPTED_OUT'
  customFields?: Record<string, string>
}

export interface CsvImportRow {
  name?: string
  phone?: string
  email?: string
  company?: string
  language?: string
  [key: string]: unknown
}

export interface CsvImportSummary {
  totalRows: number
  validLeads: LeadV2[]
  duplicateRows: Array<{ rowNumber: number; phone: string; name: string; reason: string }>
  invalidRows: Array<{ rowNumber: number; rawData: Record<string, unknown>; error: string }>
  errorCsvContent: string
}

export interface CanContactResult {
  allowed: boolean
  reason: string
  ruleViolated?: 'OPT_OUT' | 'DND_ACTIVE' | 'OUTSIDE_HOURS' | 'SUNDAY_BLOCKED' | 'INVALID_PHONE'
  checkedAt: string
}

export interface CampaignV2 {
  id: string
  workspaceId: string
  name: string
  goal: string
  brainId: string
  language: 'en' | 'hi' | 'hinglish'
  status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'STOPPED' | 'COMPLETED'
  callingWindow: {
    start: string // HH:mm format, e.g. "10:00"
    end: string   // HH:mm format, e.g. "18:00"
    timeZone: string
  }
  qualificationRules: string[]
  followUpSequence: string[]
  dailyCap: number
  retryGapMinutes: number
  maxAttempts: number
  leadsCount: number
  leadIds: string[]
  createdAt: string
  updatedAt: string
}

export interface CampaignConfigV2 {
  id?: string
  name?: string
  callingWindow?: {
    start?: string
    end?: string
    startHour?: number
    endHour?: number
    timeZone?: string
    sundayShutdown?: boolean
  }
  qualificationRules?: string[] | {
    mandatoryCriteria?: string[]
    scoringWeights?: Record<string, number>
    autoDisqualifyTriggers?: string[]
  }
  followUpSequence?: string[]
}

export interface PreLaunchChecklist {
  hasLeadSource: boolean
  hasCallingWindow: boolean
  hasQualificationRules: boolean
  hasAiDisclosureLine: boolean
  hasOptOutHandling: boolean
  isReadyToLaunch: boolean
  missingItems: string[]
}

export interface CampaignCostEstimate {
  leadCount: number
  averageMinutesPerCall: number
  providerCostPerMinuteInr: number
  totalEstimatedMinutes: number
  totalEstimatedCostInr: number
}
