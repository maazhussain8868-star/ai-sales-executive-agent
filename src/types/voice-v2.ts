/**
 * PRD v2.1 Phase 3: Voice Calling Engine Types
 */

export type CallState =
  | 'QUEUED'
  | 'INITIATED'
  | 'RINGING'
  | 'ANSWERED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'NO_ANSWER'
  | 'BUSY'
  | 'FAILED'
  | 'CANCELLED'
  | 'OPTED_OUT';

export interface CallRecord {
  id: string;
  workspaceId: string;
  campaignId: string;
  leadId: string;
  leadPhoneNumber: string;
  leadName: string;
  provider: string; // 'omnidimension' | 'fake'
  providerCallId?: string;
  status: CallState;
  direction: 'outbound' | 'inbound';
  startedAt?: string;
  answeredAt?: string;
  endedAt?: string;
  durationSeconds: number;
  costInr: number;
  recordingUrl?: string;
  transcriptStatus: 'NONE' | 'PENDING' | 'READY' | 'FAILED';
  transcriptText?: string;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: string;
  detectedLanguage: 'en' | 'hi' | 'hinglish';
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CallEvent {
  id: string;
  callId: string;
  providerEventId: string;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface VoiceWebhookPayload {
  provider_event_id: string;
  provider_call_id: string;
  event_type: 'call_initiated' | 'call_ringing' | 'call_answered' | 'call_completed' | 'call_failed' | 'transcript_ready' | 'opt_out_detected';
  timestamp: string;
  call_duration_seconds?: number;
  recording_url?: string;
  transcript?: string;
  failure_reason?: string;
  cost_inr?: number;
  metadata?: Record<string, unknown>;
}

export interface InCallOptOutResult {
  isOptOut: boolean;
  phrase?: string;
  detectedLanguage: 'en' | 'hi' | 'hinglish';
  confidence: number;
}

export interface DialingWorkerConfig {
  maxConcurrency: number;
  retryLimit: number;
  backoffMinutes: number[];
  costPerMinuteInr: number;
}
