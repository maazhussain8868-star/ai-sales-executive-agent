/**
 * PRD v2.1 Phase 9: Email Follow-Up Sequences & Compliance Types
 */

export interface EmailTemplateV2 {
  id: string;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  variables: string[];
  isCompliant: boolean; // Must include {{unsubscribe_url}} and postal address
  createdAt: string;
}

export interface EmailSequenceStep {
  stepNumber: number;
  delayHours: number;
  templateId: string;
  subjectOverride?: string;
}

export interface EmailSequenceV2 {
  id: string;
  workspaceId: string;
  name: string;
  triggerEvent: 'CALL_COMPLETED_UNQUALIFIED' | 'CALL_COMPLETED_QUALIFIED' | 'CALL_NO_ANSWER' | 'MANUAL';
  steps: EmailSequenceStep[];
  isActive: boolean;
  createdAt: string;
}

export interface LeadEmailSequenceEnrollment {
  id: string;
  workspaceId: string;
  sequenceId: string;
  leadId: string;
  leadEmail: string;
  leadName: string;
  currentStepNumber: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'PAUSED_ON_REPLY' | 'HALTED_UNSUBSCRIBED' | 'COMPLETED';
  enrolledAt: string;
  lastSentAt?: string;
  nextStepDueAt?: string;
  repliedAt?: string;
  unsubscribedAt?: string;
}

export interface OutboundEmailLog {
  id: string;
  workspaceId: string;
  enrollmentId?: string;
  recipientEmail: string;
  subject: string;
  body: string;
  headers: Record<string, string>;
  status: 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BLOCKED_SUPPRESSED';
  sentAt: string;
  unsubscribed?: boolean;
}
