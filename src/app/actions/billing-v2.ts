'use server';

import { UsageLedger, PLAN_TIERS } from '@/lib/billing/usage-ledger-v2';
import { InvoiceGenerator } from '@/lib/billing/invoice-generator-v2';
import { ReconciliationEngine } from '@/lib/billing/reconciliation-engine-v2';
import {
  PlanTierId,
  WorkspaceSubscription,
  WorkspaceUsageSummary,
  MonthlyInvoice,
  ReconciliationReport,
  ProviderCdrRecord,
} from '@/types/billing-v2';

export async function getBillingOverviewAction(workspaceId: string = 'ws_pilot'): Promise<{
  subscription: WorkspaceSubscription;
  usageSummary: WorkspaceUsageSummary;
  invoices: MonthlyInvoice[];
  plans: typeof PLAN_TIERS;
}> {
  const subscription = UsageLedger.getSubscription(workspaceId);
  const usageSummary = UsageLedger.getUsageSummary(workspaceId);
  const invoices = InvoiceGenerator.getInvoices(workspaceId);

  return {
    subscription,
    usageSummary,
    invoices,
    plans: PLAN_TIERS,
  };
}

export async function updateSubscriptionSettingsAction(params: {
  workspaceId: string;
  planId?: PlanTierId;
  allowOverage?: boolean;
  hardCapMinutes?: number;
}): Promise<{ success: boolean; subscription?: WorkspaceSubscription; error?: string }> {
  try {
    const updated = UsageLedger.updateSubscription(params.workspaceId, {
      ...(params.planId ? { planId: params.planId } : {}),
      ...(typeof params.allowOverage === 'boolean' ? { allowOverage: params.allowOverage } : {}),
      ...(typeof params.hardCapMinutes === 'number' ? { hardCapMinutes: params.hardCapMinutes } : {}),
    });
    return { success: true, subscription: updated };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function generateNewInvoiceAction(params: {
  workspaceId: string;
  billingPeriod: string;
}): Promise<{ success: boolean; invoice?: MonthlyInvoice; error?: string }> {
  try {
    const invoice = InvoiceGenerator.generateMonthlyInvoice(params);
    return { success: true, invoice };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function runProviderReconciliationAction(params: {
  workspaceId: string;
  period: string;
  providerCdrs: ProviderCdrRecord[];
}): Promise<{ success: boolean; report?: ReconciliationReport; error?: string }> {
  try {
    // Collect internal call records
    const internalRecords = [
      { callId: 'call_seed_1', minutes: 350 },
      { callId: 'call_seed_2', minutes: 450 },
      { callId: 'call_seed_3', minutes: 420 },
    ];

    const report = ReconciliationEngine.reconcile({
      workspaceId: params.workspaceId,
      period: params.period,
      internalRecords,
      providerCdrs: params.providerCdrs,
    });

    return { success: true, report };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
