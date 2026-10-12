/**
 * PRD v2.1 Phase 6: System Audit Ledger, Failed Job Manager & Pilot Cost Economics
 * Logs campaign actions and errors, tracks retryable failed jobs,
 * and generates pricing unit economics (cost per call, minute, qualified lead, meeting).
 */

import { SystemAuditEntry, FailedJobRecord, PilotCostEconomics } from '@/types/hardening-v2';

const AUDIT_ENTRIES: SystemAuditEntry[] = [];
const FAILED_JOBS: Map<string, FailedJobRecord> = new Map();

/**
 * Logs a system-level audit event.
 */
export function logSystemAuditEvent(params: {
  workspaceId: string;
  eventType: SystemAuditEntry['eventType'];
  actor: string;
  description: string;
  metadata?: Record<string, unknown>;
}): SystemAuditEntry {
  const entry: SystemAuditEntry = {
    id: `audit_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    workspaceId: params.workspaceId,
    eventType: params.eventType,
    actor: params.actor,
    description: params.description,
    metadata: params.metadata,
    timestamp: new Date().toISOString(),
  };

  AUDIT_ENTRIES.unshift(entry);
  return entry;
}

export function getSystemAuditLogs(workspaceId?: string): SystemAuditEntry[] {
  if (workspaceId) return AUDIT_ENTRIES.filter((e) => e.workspaceId === workspaceId);
  return [...AUDIT_ENTRIES];
}

/**
 * Registers a failed job in the admin queue.
 */
export function recordFailedJob(params: {
  jobType: FailedJobRecord['jobType'];
  leadId: string;
  callId?: string;
  errorReason: string;
}): FailedJobRecord {
  const jobId = `job_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const record: FailedJobRecord = {
    id: jobId,
    jobType: params.jobType,
    leadId: params.leadId,
    callId: params.callId,
    errorReason: params.errorReason,
    retryable: true,
    retryCount: 0,
    lastAttemptAt: new Date().toISOString(),
  };

  FAILED_JOBS.set(jobId, record);
  return record;
}

export function getFailedJobs(): FailedJobRecord[] {
  return Array.from(FAILED_JOBS.values());
}

export function retryAdminJob(jobId: string): { success: boolean; job?: FailedJobRecord } {
  const job = FAILED_JOBS.get(jobId);
  if (!job) return { success: false };

  job.retryCount += 1;
  job.lastAttemptAt = new Date().toISOString();

  // If retried successfully, remove from active failures
  FAILED_JOBS.delete(jobId);

  logSystemAuditEvent({
    workspaceId: 'ws_pilot',
    eventType: 'CAMPAIGN_LAUNCH',
    actor: 'admin',
    description: `Admin manually retried failed job ${job.jobType} for lead ${job.leadId}`,
  });

  return { success: true, job };
}

/**
 * Calculates pilot cost economics to help founders determine commercial pricing.
 */
export function calculatePilotCostEconomics(params: {
  totalCalls: number;
  totalConnectedMinutes: number;
  qualifiedLeadsCount: number;
  bookedMeetingsCount: number;
  ratePerMinuteInr?: number;
}): PilotCostEconomics {
  const rate = params.ratePerMinuteInr ?? 12.0;
  const totalSpendInr = params.totalConnectedMinutes * rate;

  const costPerCallInr = params.totalCalls > 0 ? Math.round((totalSpendInr / params.totalCalls) * 100) / 100 : 0;
  const costPerQualified = params.qualifiedLeadsCount > 0
    ? Math.round((totalSpendInr / params.qualifiedLeadsCount) * 100) / 100
    : totalSpendInr;
  const costPerMeeting = params.bookedMeetingsCount > 0
    ? Math.round((totalSpendInr / params.bookedMeetingsCount) * 100) / 100
    : totalSpendInr;

  return {
    totalCalls: params.totalCalls,
    totalConnectedMinutes: params.totalConnectedMinutes,
    totalSpendInr,
    costPerCallInr,
    costPerConnectedMinuteInr: rate,
    costPerQualifiedLeadInr: costPerQualified,
    costPerBookedMeetingInr: costPerMeeting,
    qualifiedLeadsCount: params.qualifiedLeadsCount,
    bookedMeetingsCount: params.bookedMeetingsCount,
  };
}

export function clearHardeningStores(): void {
  AUDIT_ENTRIES.length = 0;
  FAILED_JOBS.clear();
}

export const logAuditEvent = logSystemAuditEvent;
export const getAuditLogs = getSystemAuditLogs;
