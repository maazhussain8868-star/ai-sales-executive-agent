/**
 * PRD v2.1 Phase 3: Campaign Dialing Queue Worker
 * Responsible for selecting READY leads, checking canContact right before dialing,
 * enforcing concurrency and retry limits, and managing the call lifecycle.
 */

import { CallRecord, CallState, DialingWorkerConfig } from '@/types/voice-v2';
import { canContact } from '@/lib/safety/can-contact';
import { VoiceProvider, CallDispatchRequest } from '@/types/adapters';
import { OmniDimensionVoiceProvider } from '@/lib/adapters/omnidimension-voice';
import { FakeVoiceProvider } from '@/lib/adapters/fake/fake-voice';

export const DEFAULT_WORKER_CONFIG: DialingWorkerConfig = {
  maxConcurrency: 5,
  retryLimit: 3,
  backoffMinutes: [15, 60, 240],
  costPerMinuteInr: 12.0,
};

export interface WorkerLeadCandidate {
  leadId: string;
  campaignId: string;
  workspaceId: string;
  phoneNumber: string;
  name: string;
  status: 'READY' | 'QUEUED' | 'IN_PROGRESS' | 'RETRY_PENDING' | 'COMPLETED' | 'BLOCKED';
  retryCount: number;
  lastAttemptAt?: string;
  nextRetryAt?: string;
}

// In-memory active calls store for runtime tracking & test execution
const ACTIVE_CALLS_STORE = new Map<string, CallRecord>();
const CALL_HISTORY_STORE: CallRecord[] = [];

export class CampaignDialingWorker {
  private config: DialingWorkerConfig;
  private voiceProvider: VoiceProvider;

  constructor(options?: {
    config?: Partial<DialingWorkerConfig>;
    voiceProvider?: VoiceProvider;
  }) {
    this.config = { ...DEFAULT_WORKER_CONFIG, ...(options?.config || {}) };
    this.voiceProvider = options?.voiceProvider || (
      process.env.VOICE_PROVIDER === 'omnidimension'
        ? new OmniDimensionVoiceProvider()
        : new FakeVoiceProvider()
    );
  }

  /**
   * Returns currently active calls for a campaign.
   */
  public getActiveCallCount(campaignId: string): number {
    let count = 0;
    for (const call of ACTIVE_CALLS_STORE.values()) {
      if (
        call.campaignId === campaignId &&
        ['INITIATED', 'RINGING', 'ANSWERED', 'IN_PROGRESS'].includes(call.status)
      ) {
        count++;
      }
    }
    return count;
  }

  /**
   * Main worker execution loop: processes a batch of ready leads.
   */
  public async processBatch(
    leads: WorkerLeadCandidate[],
    campaignContext: {
      campaignId: string;
      workspaceId: string;
      isPaused?: boolean;
      isStopped?: boolean;
      systemPrompt: string;
      preferredLanguage?: 'en' | 'hi' | 'hinglish';
    },
    currentTime: Date = new Date()
  ): Promise<{
    dialed: CallRecord[];
    blocked: Array<{ leadId: string; reason: string }>;
    skippedDueToConcurrency: number;
  }> {
    const dialed: CallRecord[] = [];
    const blocked: Array<{ leadId: string; reason: string }> = [];
    let skippedDueToConcurrency = 0;

    // 1. Immediately halt if campaign is paused or stopped
    if (campaignContext.isPaused || campaignContext.isStopped) {
      return { dialed, blocked, skippedDueToConcurrency };
    }

    // 2. Iterate through candidate leads
    for (const lead of leads) {
      // Check concurrency ceiling
      const currentActive = this.getActiveCallCount(campaignContext.campaignId);
      if (currentActive >= this.config.maxConcurrency) {
        skippedDueToConcurrency++;
        continue;
      }

      // Check retry schedule if lead is pending retry
      if (lead.nextRetryAt && new Date(lead.nextRetryAt) > currentTime) {
        continue;
      }

      // Check maximum retry limit
      if (lead.retryCount >= this.config.retryLimit) {
        lead.status = 'BLOCKED';
        continue;
      }

      // 3. MANDATORY SAFETY GATE: canContact right before dialing
      const contactGate = await canContact(
        {
          id: lead.leadId,
          workspaceId: lead.workspaceId,
          phoneNumber: lead.phoneNumber,
        },
        'voice',
        currentTime
      );

      if (!contactGate.allowed) {
        lead.status = 'BLOCKED';
        blocked.push({ leadId: lead.leadId, reason: contactGate.reason });
        continue;
      }

      // 4. Create Call Record in QUEUED state
      const callId = `call_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      const callRecord: CallRecord = {
        id: callId,
        workspaceId: lead.workspaceId,
        campaignId: lead.campaignId,
        leadId: lead.leadId,
        leadPhoneNumber: lead.phoneNumber,
        leadName: lead.name,
        provider: this.voiceProvider.name,
        status: 'QUEUED',
        direction: 'outbound',
        startedAt: currentTime.toISOString(),
        durationSeconds: 0,
        costInr: 0,
        transcriptStatus: 'NONE',
        retryCount: lead.retryCount,
        maxRetries: this.config.retryLimit,
        detectedLanguage: campaignContext.preferredLanguage || 'hinglish',
        createdAt: currentTime.toISOString(),
        updatedAt: currentTime.toISOString(),
      };

      ACTIVE_CALLS_STORE.set(callId, callRecord);

      // 5. Dispatch call to Voice Provider
      callRecord.status = 'INITIATED';
      const dispatchReq: CallDispatchRequest = {
        workspaceId: lead.workspaceId,
        leadId: lead.leadId,
        toNumber: lead.phoneNumber,
        agentId: 'priya-sales-v2',
        prompt: campaignContext.systemPrompt,
        language: campaignContext.preferredLanguage || 'hinglish',
        callContext: {
          campaignId: lead.campaignId,
          callId: callRecord.id,
          leadName: lead.name,
        },
      };

      const dispatchResult = await this.voiceProvider.dispatchCall(dispatchReq);

      if (dispatchResult.status === 'FAILED') {
        callRecord.status = 'FAILED';
        callRecord.failureReason = dispatchResult.error || 'Provider dispatch failed';
        callRecord.endedAt = new Date().toISOString();
        ACTIVE_CALLS_STORE.delete(callId);
        CALL_HISTORY_STORE.push(callRecord);

        // Schedule retry if under limit
        this.handleRetrySchedule(lead, currentTime);
      } else {
        callRecord.providerCallId = dispatchResult.providerCallId;
        lead.status = 'IN_PROGRESS';
        dialed.push(callRecord);
      }
    }

    return { dialed, blocked, skippedDueToConcurrency };
  }

  /**
   * Updates call state in store.
   */
  public updateCallStatus(
    callId: string,
    newStatus: CallState,
    extra?: Partial<CallRecord>
  ): CallRecord | undefined {
    const record = ACTIVE_CALLS_STORE.get(callId);
    if (!record) return undefined;

    record.status = newStatus;
    record.updatedAt = new Date().toISOString();

    if (extra) {
      Object.assign(record, extra);
    }

    // If call reached terminal state, calculate cost and archive from active map
    if (['COMPLETED', 'FAILED', 'NO_ANSWER', 'BUSY', 'CANCELLED', 'OPTED_OUT'].includes(newStatus)) {
      if (!record.endedAt) {
        record.endedAt = new Date().toISOString();
      }
      // Calculate call cost based on duration minutes
      if (record.durationSeconds > 0) {
        const billedMinutes = Math.ceil(record.durationSeconds / 60);
        record.costInr = billedMinutes * this.config.costPerMinuteInr;
      }
      ACTIVE_CALLS_STORE.delete(callId);
      CALL_HISTORY_STORE.push(record);
    }

    return record;
  }

  /**
   * Computes next retry schedule based on backoff intervals.
   */
  private handleRetrySchedule(lead: WorkerLeadCandidate, now: Date): void {
    lead.retryCount += 1;
    if (lead.retryCount < this.config.retryLimit) {
      const backoffMin = this.config.backoffMinutes[lead.retryCount - 1] || 120;
      const nextTime = new Date(now.getTime() + backoffMin * 60 * 1000);
      lead.nextRetryAt = nextTime.toISOString();
      lead.status = 'RETRY_PENDING';
    } else {
      lead.status = 'BLOCKED';
    }
  }

  public getCallRecord(callId: string): CallRecord | undefined {
    return ACTIVE_CALLS_STORE.get(callId) || CALL_HISTORY_STORE.find((c) => c.id === callId);
  }

  public getAllCalls(): CallRecord[] {
    return [...Array.from(ACTIVE_CALLS_STORE.values()), ...CALL_HISTORY_STORE];
  }

  public clearActiveCalls(): void {
    ACTIVE_CALLS_STORE.clear();
    CALL_HISTORY_STORE.length = 0;
  }
}
