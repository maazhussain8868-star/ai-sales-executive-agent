/**
 * PRD v2.1 Phase 4: CRM Sync Engine (Google Sheets First)
 * Synchronizes completed call outcomes, scores, and summaries to Google Sheets.
 * Logs all transactions in crm_sync_log, surfaces failures visibly, and provides retry mechanisms.
 */

import { CRMProvider, CrmLeadData, CrmSyncResult } from '@/types/adapters';
import { FakeCrmSheetsProvider } from '@/lib/adapters/fake/fake-crm';
import { CRMSyncRecord, QualificationResult, CallQARecord } from '@/types/intelligence-v2';
import { CallRecord } from '@/types/voice-v2';

// In-memory sync log store representing `crm_sync_log`
const CRM_SYNC_LOGS: Map<string, CRMSyncRecord> = new Map();

export class GoogleSheetsSyncManager {
  private crmProvider: CRMProvider;
  private forceFailure: boolean;

  constructor(options?: { crmProvider?: CRMProvider; forceFailure?: boolean }) {
    this.crmProvider = options?.crmProvider || new FakeCrmSheetsProvider();
    this.forceFailure = options?.forceFailure || false;
  }

  public setForceFailure(force: boolean): void {
    this.forceFailure = force;
  }

  /**
   * Syncs completed call details and qualification results to Google Sheets.
   */
  async syncCompletedCall(params: {
    workspaceId: string;
    call: CallRecord;
    leadName?: string;
    qa?: CallQARecord;
    qualification?: QualificationResult;
    meetingTime?: string;
  }): Promise<CRMSyncRecord> {
    const { workspaceId, call, leadName, qa, qualification, meetingTime } = params;

    const syncId = `crm_sync_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const syncRecord: CRMSyncRecord = {
      id: syncId,
      workspaceId,
      callId: call.id,
      leadId: call.leadId,
      leadPhone: call.leadPhoneNumber,
      provider: 'google_sheets',
      status: 'PENDING',
      syncedPayload: {
        phone: call.leadPhoneNumber,
        name: leadName || call.leadName || 'Prospect',
        status: call.status,
        score: qualification?.score ?? 0,
        category: qualification?.category ?? 'UNKNOWN',
        summary: qa?.summary ?? 'No call summary',
        objections: qa?.objectionsTagged ?? [],
        nextAction: qa?.nextRecommendedAction ?? 'Follow up',
        meetingTime: meetingTime ?? undefined,
        durationSeconds: call.durationSeconds,
      },
      retryCount: 0,
      lastAttemptAt: new Date().toISOString(),
    };

    CRM_SYNC_LOGS.set(syncId, syncRecord);

    // Forced failure simulation for testing error handling & retry UI
    if (this.forceFailure) {
      syncRecord.status = 'FAILED';
      syncRecord.errorMessage = 'Google Sheets API error: 429 Rate Limit Exceeded';
      return syncRecord;
    }

    // Prepare payload for CRMProvider
    const crmLeadData: CrmLeadData = {
      leadId: call.leadId,
      phone: call.leadPhoneNumber,
      name: leadName || call.leadName || 'Prospect',
      status: call.status,
      summary: qa?.summary,
      score: qualification?.score,
      nextAction: qa?.nextRecommendedAction,
      meetingTime,
      objections: qa?.objectionsTagged,
    };

    try {
      const result: CrmSyncResult = await this.crmProvider.syncLead(crmLeadData);
      if (result.success) {
        syncRecord.status = 'SUCCESS';
        syncRecord.rowIdentifier = result.providerRecordId;
      } else {
        syncRecord.status = 'FAILED';
        syncRecord.errorMessage = result.error || 'Unknown CRM sync error';
      }
    } catch (err: unknown) {
      syncRecord.status = 'FAILED';
      syncRecord.errorMessage = err instanceof Error ? err.message : 'Network exception during Sheets sync';
    }

    return syncRecord;
  }

  /**
   * Retries a previously failed sync.
   */
  async retrySync(syncId: string): Promise<CRMSyncRecord> {
    const record = CRM_SYNC_LOGS.get(syncId);
    if (!record) {
      throw new Error(`CRM Sync record not found for id: ${syncId}`);
    }

    record.retryCount += 1;
    record.lastAttemptAt = new Date().toISOString();

    if (this.forceFailure) {
      record.status = 'FAILED';
      record.errorMessage = 'Google Sheets API error: Retry rejected by upstream provider.';
      return record;
    }

    const payload = record.syncedPayload;
    const crmData: CrmLeadData = {
      leadId: record.leadId,
      phone: record.leadPhone,
      name: (payload.name as string) || 'Prospect',
      status: (payload.status as string) || 'COMPLETED',
      summary: payload.summary as string,
      score: payload.score as number,
      nextAction: payload.nextAction as string,
      meetingTime: payload.meetingTime as string,
      objections: payload.objections as string[],
    };

    const result = await this.crmProvider.syncLead(crmData);
    if (result.success) {
      record.status = 'SUCCESS';
      record.rowIdentifier = result.providerRecordId;
      record.errorMessage = undefined;
    } else {
      record.status = 'FAILED';
      record.errorMessage = result.error || 'Retry failed';
    }

    return record;
  }

  public getSyncLog(syncId: string): CRMSyncRecord | undefined {
    return CRM_SYNC_LOGS.get(syncId);
  }

  public getAllSyncLogs(workspaceId?: string): CRMSyncRecord[] {
    const list = Array.from(CRM_SYNC_LOGS.values());
    if (workspaceId) {
      return list.filter((r) => r.workspaceId === workspaceId);
    }
    return list;
  }

  public clearLogs(): void {
    CRM_SYNC_LOGS.clear();
  }
}
