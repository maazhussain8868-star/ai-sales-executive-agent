/**
 * PRD v2.1 Phase 8: Monthly Invoice Generator with GST Breakdown
 */

import { MonthlyInvoice, InvoiceItem } from '@/types/billing-v2';
import { PLAN_TIERS, UsageLedger } from '@/lib/billing/usage-ledger-v2';

const INVOICES_STORE: Map<string, MonthlyInvoice> = new Map([
  [
    'inv_pilot_2026_09',
    {
      id: 'inv_pilot_2026_09',
      workspaceId: 'ws_pilot',
      invoiceNumber: 'INV-DES-2026-0091',
      billingPeriod: '1 Sep 2026 - 30 Sep 2026',
      issueDate: '2026-10-01T00:00:00.000Z',
      dueDate: '2026-10-15T00:00:00.000Z',
      status: 'PAID',
      items: [
        {
          description: 'Growth Plan Subscription (1,500 included voice minutes)',
          quantity: 1,
          unitPriceInr: 15000,
          totalInr: 15000,
        },
        {
          description: 'Voice Minute Overage (120 minutes @ ₹12.00/min)',
          quantity: 120,
          unitPriceInr: 12,
          totalInr: 1440,
        },
      ],
      subtotalInr: 16440,
      gstRate: 0.18,
      gstAmountInr: 2959.2,
      totalAmountInr: 19399.2,
    },
  ],
]);

export class InvoiceGenerator {
  /**
   * Generates a monthly invoice based on current usage and plan subscription.
   */
  public static generateMonthlyInvoice(params: {
    workspaceId: string;
    billingPeriod: string;
    issueDate?: string;
  }): MonthlyInvoice {
    const summary = UsageLedger.getUsageSummary(params.workspaceId);
    const sub = UsageLedger.getSubscription(params.workspaceId);
    const plan = PLAN_TIERS[sub.planId] || PLAN_TIERS.growth;

    const items: InvoiceItem[] = [
      {
        description: `${plan.name} Monthly Subscription (${plan.includedMinutes.toLocaleString()} included voice minutes)`,
        quantity: 1,
        unitPriceInr: plan.monthlyFeeInr,
        totalInr: plan.monthlyFeeInr,
      },
    ];

    if (summary.overageMinutes > 0) {
      items.push({
        description: `Voice Minute Overage (${summary.overageMinutes} minutes @ ₹${plan.overageRatePerMinuteInr.toFixed(2)}/min)`,
        quantity: summary.overageMinutes,
        unitPriceInr: plan.overageRatePerMinuteInr,
        totalInr: summary.overageChargeInr,
      });
    }

    const subtotalInr = items.reduce((sum, item) => sum + item.totalInr, 0);
    const gstRate = 0.18; // 18% GST
    const gstAmountInr = Math.round(subtotalInr * gstRate * 100) / 100;
    const totalAmountInr = Math.round((subtotalInr + gstAmountInr) * 100) / 100;

    const id = `inv_${params.workspaceId}_${Date.now()}`;
    const invoice: MonthlyInvoice = {
      id,
      workspaceId: params.workspaceId,
      invoiceNumber: `INV-DES-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      billingPeriod: params.billingPeriod,
      issueDate: params.issueDate || new Date().toISOString(),
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
      status: 'PENDING',
      items,
      subtotalInr,
      gstRate,
      gstAmountInr,
      totalAmountInr,
    };

    INVOICES_STORE.set(id, invoice);
    return invoice;
  }

  /**
   * Retrieves all invoices for a workspace.
   */
  public static getInvoices(workspaceId: string): MonthlyInvoice[] {
    return Array.from(INVOICES_STORE.values())
      .filter((inv) => inv.workspaceId === workspaceId)
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
  }
}
