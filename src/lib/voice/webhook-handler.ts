/**
 * PRD v2.1 Phase 3: Voice Webhook Handler
 * Idempotent event processing deduplicating by provider_event_id,
 * updating call lifecycle, capturing transcripts, and recording usage costs.
 */

import { VoiceWebhookPayload, CallRecord } from '@/types/voice-v2';
import { executeInCallOptOut } from './opt-out-detector';

export interface WebhookProcessingResult {
  success: boolean;
  duplicate: boolean;
  providerEventId: string;
  callId?: string;
  updatedStatus?: string;
  usageEventRecorded?: boolean;
  costInr?: number;
  message?: string;
}

export interface UsageEvent {
  id: string;
  workspaceId: string;
  campaignId: string;
  callId: string;
  eventType: 'call_connected_minute' | 'call_attempt';
  quantity: number;
  unit: 'minute' | 'call';
  costInr: number;
  provider: string;
  providerEventId: string;
  createdAt: string;
}

// Stores for runtime & tests
const PROCESSED_EVENT_IDS = new Set<string>();
const USAGE_EVENTS_STORE: UsageEvent[] = [];
const CALL_WEBHOOK_STORE = new Map<string, Partial<CallRecord>>();

export async function processVoiceWebhook(
  payload: VoiceWebhookPayload,
  callRecordContext?: Partial<CallRecord>
): Promise<WebhookProcessingResult> {
  const { provider_event_id, provider_call_id, event_type } = payload;

  if (!provider_event_id) {
    return {
      success: false,
      duplicate: false,
      providerEventId: '',
      message: 'Missing provider_event_id in webhook payload',
    };
  }

  // 1. Idempotency Check: deduplicate by provider_event_id
  if (PROCESSED_EVENT_IDS.has(provider_event_id)) {
    return {
      success: true,
      duplicate: true,
      providerEventId: provider_event_id,
      message: 'Event already processed (idempotent ignore)',
    };
  }

  // Mark event ID as processed
  PROCESSED_EVENT_IDS.add(provider_event_id);

  // 2. Locate or initialize call state record
  const existingCall = CALL_WEBHOOK_STORE.get(provider_call_id) || callRecordContext || {};
  const workspaceId = existingCall.workspaceId || 'ws_default';
  const campaignId = existingCall.campaignId || 'camp_default';
  const callId = existingCall.id || provider_call_id;

  let newStatus: CallRecord['status'] = existingCall.status || 'INITIATED';
  let usageRecorded = false;
  let billedCost = 0;

  switch (event_type) {
    case 'call_initiated':
      newStatus = 'INITIATED';
      break;

    case 'call_ringing':
      newStatus = 'RINGING';
      break;

    case 'call_answered':
      newStatus = 'ANSWERED';
      existingCall.answeredAt = payload.timestamp || new Date().toISOString();
      break;

    case 'call_completed': {
      newStatus = 'COMPLETED';
      existingCall.endedAt = payload.timestamp || new Date().toISOString();
      existingCall.durationSeconds = payload.call_duration_seconds || 0;
      existingCall.recordingUrl = payload.recording_url;

      if (payload.transcript) {
        existingCall.transcriptStatus = 'READY';
        existingCall.transcriptText = payload.transcript;
      } else {
        existingCall.transcriptStatus = 'PENDING';
      }

      // Cost calculation: ₹12 per connected minute (minimum 1 minute if duration > 0)
      if (existingCall.durationSeconds > 0) {
        const billedMinutes = Math.ceil(existingCall.durationSeconds / 60);
        billedCost = billedMinutes * 12.0;
        existingCall.costInr = billedCost;

        // Record usage event for cost tracking
        const usageEvent: UsageEvent = {
          id: `use_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          workspaceId,
          campaignId,
          callId,
          eventType: 'call_connected_minute',
          quantity: billedMinutes,
          unit: 'minute',
          costInr: billedCost,
          provider: 'omnidimension',
          providerEventId: provider_event_id,
          createdAt: new Date().toISOString(),
        };
        USAGE_EVENTS_STORE.push(usageEvent);
        usageRecorded = true;
      }
      break;
    }

    case 'call_failed':
      newStatus = 'FAILED';
      existingCall.endedAt = payload.timestamp || new Date().toISOString();
      existingCall.failureReason = payload.failure_reason || 'Call failed at telephony gateway';
      break;

    case 'transcript_ready':
      existingCall.transcriptStatus = payload.transcript ? 'READY' : 'FAILED';
      existingCall.transcriptText = payload.transcript;
      break;

    case 'opt_out_detected':
      newStatus = 'OPTED_OUT';
      existingCall.endedAt = payload.timestamp || new Date().toISOString();
      if (existingCall.leadPhoneNumber) {
        await executeInCallOptOut({
          workspaceId,
          phoneNumber: existingCall.leadPhoneNumber,
          leadId: existingCall.leadId,
          callId,
          triggerPhrase: payload.metadata?.triggerPhrase as string || 'Webhook opt-out event',
        });
      }
      break;
  }

  existingCall.status = newStatus;
  CALL_WEBHOOK_STORE.set(provider_call_id, existingCall);

  return {
    success: true,
    duplicate: false,
    providerEventId: provider_event_id,
    callId,
    updatedStatus: newStatus,
    usageEventRecorded: usageRecorded,
    costInr: billedCost,
  };
}

export function getUsageEventsForWorkspace(workspaceId: string): UsageEvent[] {
  return USAGE_EVENTS_STORE.filter((u) => u.workspaceId === workspaceId);
}

export function getAllUsageEvents(): UsageEvent[] {
  return [...USAGE_EVENTS_STORE];
}

export function clearWebhookStore(): void {
  PROCESSED_EVENT_IDS.clear();
  USAGE_EVENTS_STORE.length = 0;
  CALL_WEBHOOK_STORE.clear();
}
