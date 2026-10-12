/**
 * PRD v2.1 Phase 8: Telephony Provider Reconciliation Engine
 * Reconciles internal platform usage against provider Call Detail Records (CDRs).
 */

import { ProviderCdrRecord, ReconciliationReport } from '@/types/billing-v2';

export class ReconciliationEngine {
  /**
   * Reconciles internal call logs against external provider CDR records.
   */
  public static reconcile(params: {
    workspaceId: string;
    period: string;
    internalRecords: Array<{ callId: string; minutes: number }>;
    providerCdrs: ProviderCdrRecord[];
    maxAllowedVariancePercentage?: number;
  }): ReconciliationReport {
    const {
      workspaceId,
      period,
      internalRecords,
      providerCdrs,
      maxAllowedVariancePercentage = 3.0,
    } = params;

    const providerMap = new Map<string, ProviderCdrRecord>();
    for (const cdr of providerCdrs) {
      providerMap.set(cdr.callId, cdr);
    }

    let internalTotalMinutes = 0;
    let providerTotalMinutes = 0;
    let matchedCallsCount = 0;
    const discrepancies: ReconciliationReport['discrepancies'] = [];

    for (const internal of internalRecords) {
      internalTotalMinutes += internal.minutes;
      const cdr = providerMap.get(internal.callId);

      if (cdr) {
        matchedCallsCount++;
        providerTotalMinutes += cdr.billedMinutes;

        const diff = Math.round(Math.abs(cdr.billedMinutes - internal.minutes) * 100) / 100;
        // Flag discrepancy if difference exceeds 0.5 minutes (e.g. 30s pulse mismatch or drop)
        if (diff > 0.5) {
          discrepancies.push({
            callId: internal.callId,
            internalMinutes: internal.minutes,
            providerMinutes: cdr.billedMinutes,
            differenceMinutes: diff,
            reason:
              cdr.billedMinutes > internal.minutes
                ? 'Provider rounded up to full minute pulse or included ring time.'
                : 'Provider billed fewer minutes than internal connected duration.',
          });
        }
      } else {
        // Missing provider CDR for an internal call
        discrepancies.push({
          callId: internal.callId,
          internalMinutes: internal.minutes,
          providerMinutes: 0,
          differenceMinutes: internal.minutes,
          reason: 'Internal call missing matching provider CDR record.',
        });
      }
    }

    // Add any provider CDRs that were not in internal logs
    for (const cdr of providerCdrs) {
      const internalMatch = internalRecords.find((r) => r.callId === cdr.callId);
      if (!internalMatch) {
        providerTotalMinutes += cdr.billedMinutes;
        discrepancies.push({
          callId: cdr.callId,
          internalMinutes: 0,
          providerMinutes: cdr.billedMinutes,
          differenceMinutes: cdr.billedMinutes,
          reason: 'Provider charged for call not present in platform call logs.',
        });
      }
    }

    internalTotalMinutes = Math.round(internalTotalMinutes * 100) / 100;
    providerTotalMinutes = Math.round(providerTotalMinutes * 100) / 100;

    const varianceMinutes = Math.round(Math.abs(providerTotalMinutes - internalTotalMinutes) * 100) / 100;
    const variancePercentage =
      internalTotalMinutes > 0
        ? Math.round((varianceMinutes / internalTotalMinutes) * 10000) / 100
        : 0;

    const status: 'RECONCILED' | 'DISCREPANCY_FLAGGED' =
      variancePercentage <= maxAllowedVariancePercentage && discrepancies.length === 0
        ? 'RECONCILED'
        : 'DISCREPANCY_FLAGGED';

    return {
      workspaceId,
      period,
      internalTotalMinutes,
      providerTotalMinutes,
      varianceMinutes,
      variancePercentage,
      matchedCallsCount,
      discrepanciesCount: discrepancies.length,
      discrepancies,
      status,
    };
  }
}
