/**
 * PRD v2.1 Phase 8 Verification Suite: Usage Ledger, Plan Allowance, Overage, Invoices & CDR Reconciliation
 */

import assert from 'node:assert';
import { UsageLedger, PLAN_TIERS } from '../src/lib/billing/usage-ledger-v2.ts';
import { InvoiceGenerator } from '../src/lib/billing/invoice-generator-v2.ts';
import { ReconciliationEngine } from '../src/lib/billing/reconciliation-engine-v2.ts';

console.log('Running PRD v2.1 Phase 8 Verification Suite: Billing, Overage & Reconciliation...\n');

// Reset store for clean test run
UsageLedger.resetUsageEvents();

// 1. Plan Tiers & Specifications
console.log('1. Testing Plan Tier Allowances & Overage Rates...');
assert.strictEqual(PLAN_TIERS.starter.includedMinutes, 500);
assert.strictEqual(PLAN_TIERS.starter.monthlyFeeInr, 6000);
assert.strictEqual(PLAN_TIERS.starter.overageRatePerMinuteInr, 15.0);

assert.strictEqual(PLAN_TIERS.growth.includedMinutes, 1500);
assert.strictEqual(PLAN_TIERS.growth.monthlyFeeInr, 15000);
assert.strictEqual(PLAN_TIERS.growth.overageRatePerMinuteInr, 12.0);

assert.strictEqual(PLAN_TIERS.scale.includedMinutes, 5000);
assert.strictEqual(PLAN_TIERS.scale.monthlyFeeInr, 45000);
assert.strictEqual(PLAN_TIERS.scale.overageRatePerMinuteInr, 10.0);
console.log('✓ Plan tiers and allowance specifications correctly configured.\n');

// 2. Real-time Minute Consumption & 80% Threshold Alert
console.log('2. Testing Consumption Tracking & 80% Utilization Alert...');
UsageLedger.updateSubscription('ws_test_billing', {
  planId: 'growth',
  allowOverage: true,
  currentBillingPeriod: {
    startDate: '2026-10-01T00:00:00.000Z',
    endDate: '2026-10-31T23:59:59.000Z',
  },
});

// Record 1,220 minutes (out of 1,500 included = 81.3% utilization)
UsageLedger.recordCallUsage({
  workspaceId: 'ws_test_billing',
  callId: 'call_batch_1',
  connectedMinutes: 1220,
  recordedAt: '2026-10-05T12:00:00.000Z',
});

const summary80 = UsageLedger.getUsageSummary('ws_test_billing');
assert.strictEqual(summary80.consumedMinutes, 1220);
assert.strictEqual(summary80.remainingMinutes, 280);
assert.strictEqual(summary80.utilizationPercentage, 81);
assert.strictEqual(summary80.alertLevel, 'WARNING_80', 'Must trigger WARNING_80 alert at >= 80%');
assert.strictEqual(summary80.overageMinutes, 0);
assert.strictEqual(summary80.isDialingBlocked, false);
console.log('✓ 80% usage threshold warning triggered accurately at 81% utilization.\n');

// 3. 100% Plan Cap & Overage Fee Calculation
console.log('3. Testing 100% Plan Limit, Overage Accrual & Rate Calculation...');
// Record additional 380 minutes (Total: 1,600 minutes -> 100 overage minutes)
UsageLedger.recordCallUsage({
  workspaceId: 'ws_test_billing',
  callId: 'call_batch_2',
  connectedMinutes: 380,
  recordedAt: '2026-10-10T15:00:00.000Z',
});

const summary100 = UsageLedger.getUsageSummary('ws_test_billing');
assert.strictEqual(summary100.consumedMinutes, 1600);
assert.strictEqual(summary100.remainingMinutes, 0);
assert.strictEqual(summary100.overageMinutes, 100, '100 minutes of overage accrued');
// Growth overage rate = ₹12.00/min -> 100 * 12 = ₹1,200
assert.strictEqual(summary100.overageChargeInr, 1200, 'Overage cost must be ₹1,200 INR');
assert.strictEqual(summary100.alertLevel, 'LIMIT_100', 'Must trigger LIMIT_100 alert at >= 100%');
console.log('✓ Overage accurately calculated (100 mins @ ₹12/min = ₹1,200 INR).\n');

// 4. Dialing Pause Enforcement (Auto-Pause when overage is disabled)
console.log('4. Testing Auto-Pause Dialing Gate when Overage is Prohibited...');
// When allowOverage is true, calls continue
assert.strictEqual(summary100.isDialingBlocked, false, 'Dialing allowed when overage enabled');

// Disable overage
UsageLedger.updateSubscription('ws_test_billing', { allowOverage: false });
const summaryBlocked = UsageLedger.getUsageSummary('ws_test_billing');
assert.strictEqual(summaryBlocked.isDialingBlocked, true, 'Dialing must be blocked at 100% when overage disabled');
console.log('✓ Campaign dialing hard-blocked at plan cap when overage protection active.\n');

// 5. Itemized Monthly GST Invoice Generation
console.log('5. Testing Itemized Monthly Invoice Generation & 18% GST Breakdown...');
const invoice = InvoiceGenerator.generateMonthlyInvoice({
  workspaceId: 'ws_test_billing',
  billingPeriod: '1 Oct 2026 - 31 Oct 2026',
});

assert.strictEqual(invoice.items.length, 2, '2 items expected: Base Subscription + Overage');
assert.strictEqual(invoice.items[0].totalInr, 15000, 'Base plan ₹15,000');
assert.strictEqual(invoice.items[1].totalInr, 1200, 'Overage ₹1,200');
assert.strictEqual(invoice.subtotalInr, 16200, 'Subtotal ₹16,200');
assert.strictEqual(invoice.gstRate, 0.18, '18% GST');
assert.strictEqual(invoice.gstAmountInr, 2916, 'GST amount ₹2,916 (16200 * 0.18)');
assert.strictEqual(invoice.totalAmountInr, 19116, 'Total amount due ₹19,116');
console.log('✓ Itemized GST invoice generated (Subtotal: ₹16,200 + GST: ₹2,916 = Total: ₹19,116 INR).\n');

// 6. Upstream Telephony Provider Reconciliation
console.log('6. Testing Carrier CDR Reconciliation & Discrepancy Auditing...');
const internalRecords = [
  { callId: 'call_c1', minutes: 120 },
  { callId: 'call_c2', minutes: 200 },
  { callId: 'call_c3', minutes: 180 },
];

// Carrier CDRs matching within standard 60-second billing pulse tolerance
const matchingCdrs = [
  { callId: 'call_c1', providerCallId: 'p_c1', startTime: '2026-10-01', endTime: '2026-10-01', durationSeconds: 7200, billedMinutes: 120, providerCostInr: 1440 },
  { callId: 'call_c2', providerCallId: 'p_c2', startTime: '2026-10-02', endTime: '2026-10-02', durationSeconds: 12000, billedMinutes: 200, providerCostInr: 2400 },
  { callId: 'call_c3', providerCallId: 'p_c3', startTime: '2026-10-03', endTime: '2026-10-03', durationSeconds: 10800, billedMinutes: 180, providerCostInr: 2160 },
];

const reconciledReport = ReconciliationEngine.reconcile({
  workspaceId: 'ws_test_billing',
  period: 'October 2026',
  internalRecords,
  providerCdrs: matchingCdrs,
});

assert.strictEqual(reconciledReport.status, 'RECONCILED');
assert.strictEqual(reconciledReport.varianceMinutes, 0);
assert.strictEqual(reconciledReport.variancePercentage, 0);
assert.strictEqual(reconciledReport.matchedCallsCount, 3);
assert.strictEqual(reconciledReport.discrepanciesCount, 0);

// Discrepancy scenario: carrier overbilled due to 3-minute ghost session
const mismatchedCdrs = [
  ...matchingCdrs.slice(0, 2),
  { callId: 'call_c3', providerCallId: 'p_c3', startTime: '2026-10-03', endTime: '2026-10-03', durationSeconds: 12600, billedMinutes: 210, providerCostInr: 2520 }, // 30 min variance
];

const flaggedReport = ReconciliationEngine.reconcile({
  workspaceId: 'ws_test_billing',
  period: 'October 2026',
  internalRecords,
  providerCdrs: mismatchedCdrs,
});

assert.strictEqual(flaggedReport.status, 'DISCREPANCY_FLAGGED');
assert.strictEqual(flaggedReport.discrepanciesCount, 1);
assert.strictEqual(flaggedReport.discrepancies[0].callId, 'call_c3');
assert.strictEqual(flaggedReport.discrepancies[0].differenceMinutes, 30);
console.log('✓ Carrier reconciliation verified: passed matching CDRs and flagged 30-min discrepancy.\n');

console.log('========================================================================');
console.log('ALL PRD V2.1 PHASE 8 BILLING, OVERAGE & RECONCILIATION CHECKS PASSED!');
console.log('========================================================================\n');
