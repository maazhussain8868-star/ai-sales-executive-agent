'use server';

/**
 * Server Actions for PRD v2.1 Phase 6: Hardening, Release Gate & Pilot Readiness
 */

import { evaluateCampaignReleaseGate } from '@/lib/hardening/release-gate';
import { getDemoScenarios, DemoLeadScenario } from '@/lib/hardening/demo-mode';
import {
  getSystemAuditLogs,
  getFailedJobs,
  retryAdminJob,
  calculatePilotCostEconomics,
  logSystemAuditEvent,
} from '@/lib/hardening/audit-and-cost-reporter';
import { ReleaseGateReport, SystemAuditEntry, FailedJobRecord, PilotCostEconomics } from '@/types/hardening-v2';

/**
 * Validates the pre-flight campaign release gate.
 */
export async function checkReleaseGateAction(params?: {
  disclosureLine?: string;
  hasMandatoryCriteria?: boolean;
}): Promise<ReleaseGateReport> {
  const mockBrain = {
    version: 1,
    compiledAt: new Date().toISOString(),
    baseSystemPrompt: 'You are Priya...',
    aiDisclosureLine: params?.disclosureLine ?? 'This is Priya, an AI sales representative from Desynthic, and this call is recorded.',
    sections: {} as Record<string, { title: string; content: string }>,
    metadata: {},
  };

  const mockCampaign = {
    callingWindow: {
      startHour: 10,
      endHour: 18,
      timeZone: 'Asia/Kolkata',
      sundayShutdown: true,
    },
    qualificationRules: {
      mandatoryCriteria: params?.hasMandatoryCriteria !== false ? ['crit_b2b_icp', 'crit_lead_volume'] : [],
      scoringWeights: {},
      autoDisqualifyTriggers: ['b2c'],
    },
  };

  return evaluateCampaignReleaseGate({
    brain: mockBrain,
    campaign: mockCampaign,
    hasApprovedTemplates: true,
    dndAdapterOnline: true,
  });
}

/**
 * Returns available Zero-Call phone demo scenarios.
 */
export async function getDemoScenariosAction(): Promise<DemoLeadScenario[]> {
  return getDemoScenarios();
}

/**
 * Retrieves system audit logs, active failed jobs, and unit economics.
 */
export async function getPilotHardeningReportAction(): Promise<{
  auditLogs: SystemAuditEntry[];
  failedJobs: FailedJobRecord[];
  economics: PilotCostEconomics;
}> {
  const auditLogs = getSystemAuditLogs();
  const failedJobs = getFailedJobs();

  const economics = calculatePilotCostEconomics({
    totalCalls: 120,
    totalConnectedMinutes: 280,
    qualifiedLeadsCount: 42,
    bookedMeetingsCount: 19,
    ratePerMinuteInr: 12.0,
  });

  return { auditLogs, failedJobs, economics };
}

/**
 * Retries a failed job in the admin queue.
 */
export async function retryFailedJobAction(jobId: string): Promise<{ success: boolean }> {
  return retryAdminJob(jobId);
}

/**
 * Logs an admin action in the audit trail.
 */
export async function recordAdminAuditAction(eventType: SystemAuditEntry['eventType'], description: string): Promise<void> {
  logSystemAuditEvent({
    workspaceId: 'ws_pilot',
    eventType,
    actor: 'founder',
    description,
  });
}
