/**
 * PRD v2.1 Phase 5: Booking, Follow-ups, WhatsApp & Human Handoff Types
 */

export interface MeetingRecord {
  id: string;
  workspaceId: string;
  leadId: string;
  callId?: string;
  attendeeEmail: string;
  attendeeName: string;
  attendeePhone: string;
  title: string;
  scheduledAt: string; // ISO timestamp
  timeZone: string;
  durationMinutes: number;
  meetingUrl?: string;
  providerEventId: string; // Idempotency key from calendar provider
  status: 'CONFIRMED' | 'FAILED' | 'CANCELLED' | 'RESCHEDULED';
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpTask {
  id: string;
  workspaceId: string;
  leadId: string;
  leadPhone: string;
  leadName: string;
  scheduledAt: string; // ISO timestamp
  timeZone: string;
  reason: string;
  priorContext: string;
  status: 'PENDING' | 'TRIGGERED' | 'CANCELLED' | 'COMPLETED';
  attemptCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  language: 'en' | 'hi' | 'hinglish';
  body: string;
  variables: string[];
  approvalStatus: 'APPROVED' | 'PENDING' | 'REJECTED';
}

export interface WhatsAppMessageRecord {
  id: string;
  workspaceId: string;
  leadId: string;
  recipientPhone: string;
  templateId: string;
  templateName: string;
  providerMessageId: string; // Idempotency key
  status: 'QUEUED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  deliveryError?: string;
  sentAt: string;
}

export type HandoffTriggerReason =
  | 'HOT_BUYING_INTENT'
  | 'DIRECT_HUMAN_REQUEST'
  | 'UNSUPPORTED_QUESTION'
  | 'LOW_CONFIDENCE'
  | 'COMPLIANCE_ESCALATION';

export type HandoffPath = 'LIVE_TRANSFER' | 'WHATSAPP_ALERT' | 'CALLBACK_TASK';

export interface HumanHandoffRecord {
  id: string;
  workspaceId: string;
  leadId: string;
  callId: string;
  prospectName: string;
  prospectPhone: string;
  triggerReason: HandoffTriggerReason;
  triggerUtterance: string;
  leadSummary: string;
  pathAttempted: HandoffPath;
  status: 'INITIATED' | 'CONNECTED' | 'ACKNOWLEDGED' | 'COMPLETED';
  ownerAlertSent: boolean;
  callbackTaskId?: string;
  responseTimeSeconds?: number;
  createdAt: string;
  updatedAt: string;
}
