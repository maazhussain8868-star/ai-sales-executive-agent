/**
 * PRD v2.1 Phase 8: Usage Ledger, Plan Allowance & Overage Manager
 */

import {
  PlanTier,
  PlanTierId,
  WorkspaceSubscription,
  WorkspaceUsageSummary,
} from '@/types/billing-v2';
import { logAuditEvent } from '@/lib/hardening/audit-and-cost-reporter';

export const PLAN_TIERS: Record<PlanTierId, PlanTier> = {
  starter: {
    id: 'starter',
    name: 'Starter Pilot',
    monthlyFeeInr: 6000,
    includedMinutes: 500,
    overageRatePerMinuteInr: 15.0,
    maxConcurrency: 3,
    features: ['500 AI Voice Minutes', '1 AI Employee (Priya)', 'Google Sheets Sync', 'Basic Call QA'],
  },
  growth: {
    id: 'growth',
    name: 'Growth Scale',
    monthlyFeeInr: 15000,
    includedMinutes: 1500,
    overageRatePerMinuteInr: 12.0,
    maxConcurrency: 10,
    features: ['1,500 AI Voice Minutes', 'Up to 3 AI Employees', 'Calendar Booking', 'WhatsApp Outreach', 'Advanced Call QA'],
  },
  scale: {
    id: 'scale',
    name: 'Enterprise Scale',
    monthlyFeeInr: 45000,
    includedMinutes: 5000,
    overageRatePerMinuteInr: 10.0,
    maxConcurrency: 25,
    features: ['5,000 AI Voice Minutes', 'Unlimited AI Employees', 'Multi-tenant RBAC', 'Priority Human Handoff', 'Dedicated DID'],
  },
  custom: {
    id: 'custom',
    name: 'Custom Enterprise',
    monthlyFeeInr: 90000,
    includedMinutes: 12000,
    overageRatePerMinuteInr: 8.5,
    maxConcurrency: 50,
    features: ['Custom Minute Pack', 'SLA Guarantee', 'Dedicated Account Manager'],
  },
};

// In-Memory Subscriptions Store
const SUBSCRIPTIONS_STORE: Map<string, WorkspaceSubscription> = new Map([
  [
    'ws_pilot',
    {
      workspaceId: 'ws_pilot',
      planId: 'growth',
      status: 'ACTIVE',
      currentBillingPeriod: {
        startDate: '2026-10-01T00:00:00.000Z',
        endDate: '2026-10-31T23:59:59.000Z',
      },
      allowOverage: true,
      hardCapMinutes: 2000,
    },
  ],
]);

// Logged Usage Events
interface LoggedUsageEvent {
  id: string;
  workspaceId: string;
  callId: string;
  connectedMinutes: number;
  recordedAt: string;
}

const USAGE_EVENTS: LoggedUsageEvent[] = [
  { id: 'use_1', workspaceId: 'ws_pilot', callId: 'call_seed_1', connectedMinutes: 350, recordedAt: '2026-10-03T10:00:00.000Z' },
  { id: 'use_2', workspaceId: 'ws_pilot', callId: 'call_seed_2', connectedMinutes: 450, recordedAt: '2026-10-06T14:00:00.000Z' },
  { id: 'use_3', workspaceId: 'ws_pilot', callId: 'call_seed_3', connectedMinutes: 420, recordedAt: '2026-10-09T16:00:00.000Z' },
];

export class UsageLedger {
  /**
   * Retrieves the current subscription for a workspace.
   */
  public static getSubscription(workspaceId: string): WorkspaceSubscription {
    const sub = SUBSCRIPTIONS_STORE.get(workspaceId);
    if (!sub) {
      // Default to growth plan
      const defaultSub: WorkspaceSubscription = {
        workspaceId,
        planId: 'growth',
        status: 'ACTIVE',
        currentBillingPeriod: {
          startDate: '2026-10-01T00:00:00.000Z',
          endDate: '2026-10-31T23:59:59.000Z',
        },
        allowOverage: false,
      };
      SUBSCRIPTIONS_STORE.set(workspaceId, defaultSub);
      return defaultSub;
    }
    return sub;
  }

  /**
   * Updates workspace subscription configuration (e.g. change plan, toggle overage).
   */
  public static updateSubscription(
    workspaceId: string,
    updates: Partial<WorkspaceSubscription>
  ): WorkspaceSubscription {
    const sub = this.getSubscription(workspaceId);
    const updated: WorkspaceSubscription = { ...sub, ...updates };
    SUBSCRIPTIONS_STORE.set(workspaceId, updated);

    logAuditEvent({
      workspaceId,
      eventType: 'CAMPAIGN_LAUNCH',
      actor: 'system',
      description: `Subscription updated: Plan '${updated.planId}', Allow Overage: ${updated.allowOverage}.`,
    });

    return updated;
  }

  /**
   * Records completed call minutes into the workspace ledger.
   */
  public static recordCallUsage(params: {
    workspaceId: string;
    callId: string;
    connectedMinutes: number;
    recordedAt?: string;
  }): LoggedUsageEvent {
    const event: LoggedUsageEvent = {
      id: `use_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      workspaceId: params.workspaceId,
      callId: params.callId,
      connectedMinutes: Math.max(0, Math.round(params.connectedMinutes * 100) / 100),
      recordedAt: params.recordedAt || new Date().toISOString(),
    };

    USAGE_EVENTS.push(event);
    return event;
  }

  /**
   * Calculates real-time usage summary, overage, and threshold alert levels.
   */
  public static getUsageSummary(workspaceId: string): WorkspaceUsageSummary {
    const sub = this.getSubscription(workspaceId);
    const plan = PLAN_TIERS[sub.planId] || PLAN_TIERS.growth;

    // Filter events for this workspace in current billing cycle
    const events = USAGE_EVENTS.filter(
      (e) =>
        e.workspaceId === workspaceId &&
        e.recordedAt >= sub.currentBillingPeriod.startDate &&
        e.recordedAt <= sub.currentBillingPeriod.endDate
    );

    const consumedMinutes = events.reduce((sum, e) => sum + e.connectedMinutes, 0);
    const includedMinutes = plan.includedMinutes;
    const remainingMinutes = Math.max(0, includedMinutes - consumedMinutes);
    const overageMinutes = Math.max(0, consumedMinutes - includedMinutes);
    const overageChargeInr = Math.round(overageMinutes * plan.overageRatePerMinuteInr * 100) / 100;

    const utilizationPercentage = Math.round((consumedMinutes / includedMinutes) * 100);

    let alertLevel: 'NORMAL' | 'WARNING_80' | 'LIMIT_100' = 'NORMAL';
    if (utilizationPercentage >= 100) {
      alertLevel = 'LIMIT_100';
    } else if (utilizationPercentage >= 80) {
      alertLevel = 'WARNING_80';
    }

    // Dialing is blocked if:
    // 1. Reached 100% and overage is explicitly disallowed
    // 2. Or hard cap is defined and consumedMinutes exceeds hardCapMinutes
    let isDialingBlocked = false;
    if (consumedMinutes >= includedMinutes && !sub.allowOverage) {
      isDialingBlocked = true;
    } else if (sub.hardCapMinutes && consumedMinutes >= sub.hardCapMinutes) {
      isDialingBlocked = true;
    }

    return {
      workspaceId,
      periodStart: sub.currentBillingPeriod.startDate,
      periodEnd: sub.currentBillingPeriod.endDate,
      includedMinutes,
      consumedMinutes,
      remainingMinutes,
      overageMinutes,
      overageChargeInr,
      utilizationPercentage,
      alertLevel,
      isDialingBlocked,
    };
  }

  /**
   * Resets usage events (for test isolation).
   */
  public static resetUsageEvents(): void {
    USAGE_EVENTS.length = 0;
  }
}
