/**
 * PRD v2.1 Phase 4: Qualification, Call QA, and CRM Sync Types
 */

export type QualificationCategory = 'QUALIFIED' | 'UNQUALIFIED' | 'UNKNOWN';

export interface QualificationCriterion {
  id: string;
  name: string;
  description: string;
  isMandatory: boolean;
}

export interface CriterionEvaluation {
  criterionId: string;
  criterionName: string;
  met: boolean | 'unknown';
  evidenceQuote?: string;
  reasoning: string;
}

export interface QualificationResult {
  score: number; // 0 - 100
  category: QualificationCategory;
  plainLanguageReason: string;
  evaluations: CriterionEvaluation[];
  missingAnswers: string[];
}

export interface CallQARecord {
  id: string;
  callId: string;
  workspaceId: string;
  summary: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  intent: 'high_intent' | 'nurture' | 'disqualified' | 'opt_out' | 'callback_requested';
  objectionsTagged: string[];
  whereDealWasLost?: string;
  nextRecommendedAction: string;
  reviewerOutcomeOverride?: QualificationCategory;
  reviewerNotes?: string;
  coachingFeedback?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CRMSyncRecord {
  id: string;
  workspaceId: string;
  callId: string;
  leadId: string;
  leadPhone: string;
  provider: 'google_sheets' | 'hubspot' | 'zoho';
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  rowIdentifier?: string;
  syncedPayload: Record<string, unknown>;
  errorMessage?: string;
  retryCount: number;
  lastAttemptAt: string;
}

export interface DashboardMetrics {
  callsAttempted: number;
  callsAnswered: number;
  callsCompleted: number;
  callsFailed: number;
  conversationRate: number; // Answered / Attempted %
  averageDurationSeconds: number;
  qualifiedCount: number;
  unqualifiedCount: number;
  unknownCount: number;
  qualificationRate: number; // Qualified / Completed %
  meetingsBooked: number;
  followUpsDue: number;
  optOutsCount: number;
  topObjections: Array<{ objection: string; count: number }>;
  totalSpendInr: number;
  costPerQualifiedLeadInr: number;
}
