/**
 * PRD v2.1 Phase 6: Hardening, Release Gate & Pilot Readiness Types
 */

export interface ReleaseGateCheckItem {
  id: string;
  category: 'COMPLIANCE' | 'TELEPHONY' | 'SAFETY' | 'TEMPLATES' | 'QUALIFICATION';
  name: string;
  description: string;
  passed: boolean;
  remediationAdvice?: string;
}

export interface DemoLeadScenario {
  id: string;
  name: string;
  company: string;
  phone: string;
  industry: string;
  expectedOutcome: 'QUALIFIED_AND_BOOKED' | 'DISQUALIFIED_B2C' | 'CALLBACK_REQUESTED' | 'HOT_HANDOFF' | 'OPT_OUT';
  description: string;
  mockDialogue: Array<{ speaker: 'agent' | 'prospect'; text: string }>;
}

export interface ReleaseGateReport {
  isFullyReady: boolean;
  score: number; // 0 - 100
  items: ReleaseGateCheckItem[];
  evaluatedAt: string;
}

export interface SystemAuditEntry {
  id: string;
  workspaceId: string;
  eventType: 'CAMPAIGN_LAUNCH' | 'CAMPAIGN_STOP' | 'BRAIN_ACTIVATED' | 'SYNC_FAILURE' | 'CALL_FAILURE' | 'OPT_OUT';
  actor: string;
  description: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface FailedJobRecord {
  id: string;
  jobType: 'DIAL_CALL' | 'CRM_SYNC' | 'CALENDAR_BOOKING' | 'WHATSAPP_DISPATCH';
  leadId: string;
  callId?: string;
  errorReason: string;
  retryable: boolean;
  retryCount: number;
  lastAttemptAt: string;
}

export interface PilotCostEconomics {
  totalCalls: number;
  totalConnectedMinutes: number;
  totalSpendInr: number;
  costPerCallInr: number;
  costPerConnectedMinuteInr: number;
  costPerQualifiedLeadInr: number;
  costPerBookedMeetingInr: number;
  qualifiedLeadsCount: number;
  bookedMeetingsCount: number;
}
