export type LeadStatus =
  | 'NEW'
  | 'READY'
  | 'CALLED'
  | 'CONNECTED'
  | 'CONVERSATION'
  | 'QUALIFIED'
  | 'UNQUALIFIED'
  | 'FOLLOW-UP'
  | 'MEETING_BOOKED'

export interface Lead {
  id: string
  phone: string
  name: string
  email?: string
  company?: string
  role?: string
  status: LeadStatus
  dnd: boolean
  attempts: number
  lastCalledAt?: string
  nextFollowUp?: string
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface LeadImportResult {
  totalRows: number
  importedCount: number
  duplicatesSkipped: number
  dndCount: number
  invalidPhoneCount: number
  leads: Lead[]
  errors: string[]
}

export type CampaignStatus = 'draft' | 'running' | 'paused' | 'completed'

export interface Campaign {
  id: string
  name: string
  agentName: string
  status: CampaignStatus
  callWindowStart: string // e.g. '10:00'
  callWindowEnd: string // e.g. '18:00'
  timezone: string // 'Asia/Kolkata'
  maxAttempts: number // e.g. 3
  retryGapHours: number // e.g. 4
  dailyCap: number // e.g. 20
  callsToday: number
  lastRunAt?: string
  leadIds: string[]
  createdAt: string
  updatedAt: string
}

export interface Appointment {
  id: string
  leadId: string
  leadName: string
  leadPhone: string
  campaignId?: string
  title: string
  scheduledAt: string
  durationMinutes: number
  meetingLink?: string
  status: 'confirmed' | 'rescheduled' | 'cancelled'
  calendarEventId?: string
  n8nNotified: boolean
  notes?: string
  createdAt: string
}

export interface SchedulerRunResult {
  campaignId: string
  timestamp: string
  leadsEvaluated: number
  callsDispatched: number
  skippedReasons: {
    outsideCallingHours?: number
    sunday?: number
    dnd?: number
    maxAttemptsReached?: number
    retryGapNotElapsed?: number
    dailyCapReached?: number
    notReadyOrFollowUp?: number
    campaignPaused?: number
    blockedBySafety?: number
  }
  dispatchedCallIds: string[]
}
