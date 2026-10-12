/**
 * PRD v2.1 Phase 8: Billing, Minute Allowance, Overage & Reconciliation Types
 */

export type PlanTierId = 'starter' | 'growth' | 'scale' | 'custom';

export interface PlanTier {
  id: PlanTierId;
  name: string;
  monthlyFeeInr: number;
  includedMinutes: number;
  overageRatePerMinuteInr: number;
  maxConcurrency: number;
  features: string[];
}

export interface WorkspaceSubscription {
  workspaceId: string;
  planId: PlanTierId;
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELLED';
  currentBillingPeriod: {
    startDate: string;
    endDate: string;
  };
  allowOverage: boolean;
  hardCapMinutes?: number;
}

export interface WorkspaceUsageSummary {
  workspaceId: string;
  periodStart: string;
  periodEnd: string;
  includedMinutes: number;
  consumedMinutes: number;
  remainingMinutes: number;
  overageMinutes: number;
  overageChargeInr: number;
  utilizationPercentage: number;
  alertLevel: 'NORMAL' | 'WARNING_80' | 'LIMIT_100';
  isDialingBlocked: boolean;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPriceInr: number;
  totalInr: number;
}

export interface MonthlyInvoice {
  id: string;
  workspaceId: string;
  invoiceNumber: string;
  billingPeriod: string;
  issueDate: string;
  dueDate: string;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  items: InvoiceItem[];
  subtotalInr: number;
  gstRate: number; // 0.18 for 18% GST
  gstAmountInr: number;
  totalAmountInr: number;
}

export interface ProviderCdrRecord {
  callId: string;
  providerCallId: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  billedMinutes: number;
  providerCostInr: number;
}

export interface ReconciliationReport {
  workspaceId: string;
  period: string;
  internalTotalMinutes: number;
  providerTotalMinutes: number;
  varianceMinutes: number;
  variancePercentage: number;
  matchedCallsCount: number;
  discrepanciesCount: number;
  discrepancies: Array<{
    callId: string;
    internalMinutes: number;
    providerMinutes: number;
    differenceMinutes: number;
    reason: string;
  }>;
  status: 'RECONCILED' | 'DISCREPANCY_FLAGGED';
}
