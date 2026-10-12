'use server';

/**
 * Server Actions for PRD v2.1 Phase 4: Intelligence, Call QA, CRM Sync & Dashboard
 */

import { evaluateCallQualification } from '@/lib/intelligence/qualification-engine';
import { generateCallQAAnalysis, submitReviewerFeedback, getAllCoachingFeedback } from '@/lib/intelligence/call-qa';
import { GoogleSheetsSyncManager } from '@/lib/crm/sheets-sync';
import { QualificationResult, CallQARecord, CRMSyncRecord, DashboardMetrics, QualificationCategory } from '@/types/intelligence-v2';
import { CallRecord } from '@/types/voice-v2';
import { getAllUsageEvents } from '@/lib/voice/webhook-handler';

const syncManagerInstance = new GoogleSheetsSyncManager();

// In-memory demo/runtime store for calls
const MOCK_CALLS_STORE: CallRecord[] = [];

/**
 * Evaluates transcript and generates qualification and Call QA records.
 */
export async function processCallIntelligenceAction(params: {
  callId: string;
  workspaceId: string;
  transcript: string;
  leadName?: string;
  leadPhone?: string;
  durationSeconds?: number;
}): Promise<{
  qualification: QualificationResult;
  qa: CallQARecord;
  syncRecord: CRMSyncRecord;
}> {
  const { callId, workspaceId, transcript, leadName = 'Prospect', leadPhone = '+919876543210', durationSeconds = 90 } = params;

  // 1. Run Qualification Engine
  const qualification = evaluateCallQualification(transcript);

  // 2. Run Call QA Analysis
  const qa = generateCallQAAnalysis({
    callId,
    workspaceId,
    transcript,
    leadName,
    optedOut: qualification.category === 'UNQUALIFIED' && transcript.toLowerCase().includes('stop calling'),
  });

  // 3. Sync to Google Sheets CRM
  const mockCallRecord: CallRecord = {
    id: callId,
    workspaceId,
    campaignId: 'camp_v2',
    leadId: `lead_${callId}`,
    leadPhoneNumber: leadPhone,
    leadName,
    provider: 'omnidimension',
    status: 'COMPLETED',
    direction: 'outbound',
    durationSeconds,
    costInr: Math.ceil(durationSeconds / 60) * 12.0,
    transcriptStatus: 'READY',
    transcriptText: transcript,
    retryCount: 0,
    maxRetries: 3,
    detectedLanguage: 'hinglish',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  MOCK_CALLS_STORE.push(mockCallRecord);

  const syncRecord = await syncManagerInstance.syncCompletedCall({
    workspaceId,
    call: mockCallRecord,
    leadName,
    qa,
    qualification,
  });

  return { qualification, qa, syncRecord };
}

/**
 * Allows a human reviewer to correct qualification outcome and enter coaching feedback.
 */
export async function submitReviewerFeedbackAction(params: {
  callId: string;
  overrideCategory?: QualificationCategory;
  notes?: string;
  coachingFeedback?: string;
}): Promise<{ success: boolean; updatedRecord?: CallQARecord }> {
  const record = submitReviewerFeedback({
    callId: params.callId,
    reviewerOutcomeOverride: params.overrideCategory,
    reviewerNotes: params.notes,
    coachingFeedback: params.coachingFeedback,
  });

  return {
    success: !!record,
    updatedRecord: record,
  };
}

/**
 * Retries a failed Google Sheets CRM sync.
 */
export async function retryCrmSyncAction(syncId: string): Promise<CRMSyncRecord> {
  return await syncManagerInstance.retrySync(syncId);
}

/**
 * Retrieves all CRM sync records for the workspace.
 */
export async function getCrmSyncLogsAction(workspaceId?: string): Promise<CRMSyncRecord[]> {
  return syncManagerInstance.getAllSyncLogs(workspaceId);
}

/**
 * Computes aggregated Dashboard Metrics.
 */
export async function getDashboardMetricsAction(params?: {
  workspaceId?: string;
  callsData?: CallRecord[];
  mockDataSeed?: boolean;
}): Promise<DashboardMetrics> {
  const calls = params?.callsData && params.callsData.length > 0 ? params.callsData : MOCK_CALLS_STORE;

  let attempted = 0;
  let answered = 0;
  let completed = 0;
  let failed = 0;
  let totalDuration = 0;
  let optOuts = 0;
  let qualified = 0;
  let unqualified = 0;
  let unknownCount = 0;

  const objectionCounts: Record<string, number> = {};

  for (const call of calls) {
    if (call.status !== 'QUEUED') attempted++;
    if (['ANSWERED', 'IN_PROGRESS', 'COMPLETED', 'OPTED_OUT'].includes(call.status)) answered++;
    if (call.status === 'COMPLETED') completed++;
    if (['FAILED', 'CANCELLED'].includes(call.status)) failed++;
    if (call.status === 'OPTED_OUT') optOuts++;

    totalDuration += call.durationSeconds || 0;

    // Check transcript if available
    if (call.transcriptText) {
      const q = evaluateCallQualification(call.transcriptText);
      if (q.category === 'QUALIFIED') qualified++;
      else if (q.category === 'UNQUALIFIED') unqualified++;
      else unknownCount++;

      const lower = call.transcriptText.toLowerCase();
      if (lower.includes('price') || lower.includes('cost')) {
        objectionCounts['Pricing / Budget'] = (objectionCounts['Pricing / Budget'] || 0) + 1;
      }
      if (lower.includes('timing') || lower.includes('busy')) {
        objectionCounts['Bad Timing'] = (objectionCounts['Bad Timing'] || 0) + 1;
      }
      if (lower.includes('competitor')) {
        objectionCounts['Competitor Lock-in'] = (objectionCounts['Competitor Lock-in'] || 0) + 1;
      }
    }
  }

  // Fallback defaults for empty dashboard preview
  if (calls.length === 0 && params?.mockDataSeed) {
    attempted = 142;
    answered = 118;
    completed = 94;
    failed = 6;
    totalDuration = 94 * 160;
    qualified = 41;
    unqualified = 38;
    unknownCount = 15;
    optOuts = 8;
    objectionCounts['Pricing / Budget'] = 24;
    objectionCounts['Bad Timing'] = 19;
    objectionCounts['Competitor Lock-in'] = 11;
  }

  const conversationRate = attempted > 0 ? Math.round((answered / attempted) * 100) : 0;
  const avgDuration = answered > 0 ? Math.round(totalDuration / answered) : 0;
  const qualificationRate = completed > 0 ? Math.round((qualified / completed) * 100) : 0;

  const usageEvents = getAllUsageEvents();
  let totalSpend = usageEvents.reduce((acc, u) => acc + u.costInr, 0);
  if (totalSpend === 0 && calls.length === 0 && params?.mockDataSeed) {
    totalSpend = 3012.0;
  }

  const costPerQualified = qualified > 0 ? Math.round((totalSpend / qualified) * 100) / 100 : totalSpend;

  const topObjections = Object.entries(objectionCounts)
    .map(([objection, count]) => ({ objection, count }))
    .sort((a, b) => b.count - a.count);

  return {
    callsAttempted: attempted,
    callsAnswered: answered,
    callsCompleted: completed,
    callsFailed: failed,
    conversationRate,
    averageDurationSeconds: avgDuration,
    qualifiedCount: qualified,
    unqualifiedCount: unqualified,
    unknownCount,
    qualificationRate,
    meetingsBooked: Math.round(qualified * 0.45),
    followUpsDue: Math.round(answered * 0.2),
    optOutsCount: optOuts,
    topObjections,
    totalSpendInr: totalSpend,
    costPerQualifiedLeadInr: costPerQualified,
  };
}

/**
 * Returns all recorded coaching feedback items.
 */
export async function getCoachingFeedbackAction(): Promise<Array<{ callId: string; feedback: string; createdAt: string }>> {
  return getAllCoachingFeedback();
}
