export interface EncryptedSecret {
  ciphertext: string
  iv: string
  tag: string
  maskedKey: string // e.g. "sk-live-...4a9f" for safe UI rendering
}

export interface Workspace {
  id: string
  name: string
  slug: string
  plan: 'starter' | 'growth' | 'enterprise'
  minuteCap: number
  minutesUsed: number
  costPerLead: number
  revenueAttributed: number
  piiRetentionDays: number
  encryptedApiKeys: Record<string, EncryptedSecret>
  createdAt: string
  updatedAt: string
}

export interface SecondaryMetrics {
  callAnswerRate: number // percentage (0-100)
  objectionResolutionRate: number // percentage (0-100)
  followUpCompletionRate: number // percentage (0-100)
  humanHandoffRate: number // percentage (0-100)
  aiErrorRate: number // percentage (0-100)
  averageCallQualityScore: number // 0-100
}

export interface ChannelPerformance {
  sent: number
  delivered: number
  replied: number
  unsubscribed: number
  conversionRate: number // percentage
}

export interface DashboardMetrics {
  callsMade: number
  callsAnswered: number
  conversations: number
  qualifiedLeads: number
  meetingsBooked: number
  conversionRate: number // percentage (0-100)
  averageCallDurationSeconds: number
  costPerQualifiedLead: number
  revenueAttributed: number
  revenuePerAiEmployee: number
  secondaryMetrics: SecondaryMetrics
  channelMetrics: {
    whatsapp: ChannelPerformance
    email: ChannelPerformance
  }
}

export interface AuditLog {
  id: string
  workspaceId: string
  actorEmail: string
  action: string
  resource: string
  details?: Record<string, unknown>
  timestamp: string
}
