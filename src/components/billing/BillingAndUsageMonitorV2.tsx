'use client';

import React, { useState, useEffect } from 'react';
import {
  getBillingOverviewAction,
  updateSubscriptionSettingsAction,
  generateNewInvoiceAction,
  runProviderReconciliationAction,
} from '@/app/actions/billing-v2';
import {
  PlanTierId,
  WorkspaceSubscription,
  WorkspaceUsageSummary,
  MonthlyInvoice,
  PlanTier,
  ReconciliationReport,
} from '@/types/billing-v2';

export function BillingAndUsageMonitorV2() {
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'reconciliation'>('overview');
  const [subscription, setSubscription] = useState<WorkspaceSubscription | null>(null);
  const [usage, setUsage] = useState<WorkspaceUsageSummary | null>(null);
  const [plans, setPlans] = useState<Record<string, PlanTier>>({});
  const [invoices, setInvoices] = useState<MonthlyInvoice[]>([]);
  const [reconciliationReport, setReconciliationReport] = useState<ReconciliationReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let isMounted = true;
    getBillingOverviewAction('ws_pilot')
      .then((data) => {
        if (isMounted) {
          setSubscription(data.subscription);
          setUsage(data.usageSummary);
          setPlans(data.plans);
          setInvoices(data.invoices);
        }
      })
      .catch(console.error);

    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggleOverage = async () => {
    if (!subscription) return;
    setIsLoading(true);
    setFeedbackMsg(null);

    const newOverageSetting = !subscription.allowOverage;
    const res = await updateSubscriptionSettingsAction({
      workspaceId: 'ws_pilot',
      allowOverage: newOverageSetting,
    });

    setIsLoading(false);
    if (res.success && res.subscription) {
      setSubscription(res.subscription);
      // Refresh summary
      const overview = await getBillingOverviewAction('ws_pilot');
      setUsage(overview.usageSummary);
      setFeedbackMsg({
        type: 'success',
        text: `Overage protection updated: ${newOverageSetting ? 'Allowed (pay-as-you-go)' : 'Disabled (auto-pause on limit)'}.`,
      });
    } else {
      setFeedbackMsg({ type: 'error', text: res.error || 'Failed to update overage setting.' });
    }
  };

  const handlePlanChange = async (newPlanId: PlanTierId) => {
    if (!confirm(`Switch subscription plan to ${plans[newPlanId]?.name}?`)) return;
    setIsLoading(true);
    setFeedbackMsg(null);

    const res = await updateSubscriptionSettingsAction({
      workspaceId: 'ws_pilot',
      planId: newPlanId,
    });

    setIsLoading(false);
    if (res.success && res.subscription) {
      setSubscription(res.subscription);
      const overview = await getBillingOverviewAction('ws_pilot');
      setUsage(overview.usageSummary);
      setFeedbackMsg({ type: 'success', text: `Subscription successfully switched to ${plans[newPlanId]?.name}.` });
    } else {
      setFeedbackMsg({ type: 'error', text: res.error || 'Failed to switch plan.' });
    }
  };

  const handleGenerateInvoice = async () => {
    setIsLoading(true);
    setFeedbackMsg(null);

    const res = await generateNewInvoiceAction({
      workspaceId: 'ws_pilot',
      billingPeriod: '1 Oct 2026 - 31 Oct 2026',
    });

    setIsLoading(false);
    if (res.success && res.invoice) {
      setInvoices((prev) => [res.invoice!, ...prev]);
      setFeedbackMsg({ type: 'success', text: `Generated invoice ${res.invoice.invoiceNumber} for ₹${res.invoice.totalAmountInr.toLocaleString()}.` });
    } else {
      setFeedbackMsg({ type: 'error', text: res.error || 'Failed to generate invoice.' });
    }
  };

  const handleRunReconciliation = async () => {
    setIsLoading(true);
    setFeedbackMsg(null);

    // Simulated provider CDR records from OmniDimension telephony
    const mockCdrs = [
      { callId: 'call_seed_1', providerCallId: 'omni_cdr_01', startTime: '2026-10-03T10:00:00Z', endTime: '2026-10-03T15:50:00Z', durationSeconds: 21000, billedMinutes: 350, providerCostInr: 4200 },
      { callId: 'call_seed_2', providerCallId: 'omni_cdr_02', startTime: '2026-10-06T14:00:00Z', endTime: '2026-10-06T21:30:00Z', durationSeconds: 27000, billedMinutes: 450, providerCostInr: 5400 },
      { callId: 'call_seed_3', providerCallId: 'omni_cdr_03', startTime: '2026-10-09T16:00:00Z', endTime: '2026-10-09T23:00:00Z', durationSeconds: 25200, billedMinutes: 420, providerCostInr: 5040 },
    ];

    const res = await runProviderReconciliationAction({
      workspaceId: 'ws_pilot',
      period: 'October 2026',
      providerCdrs: mockCdrs,
    });

    setIsLoading(false);
    if (res.success && res.report) {
      setReconciliationReport(res.report);
      setFeedbackMsg({
        type: 'success',
        text: `Reconciliation completed: ${res.report.status} (${res.report.matchedCallsCount} matched calls, ${res.report.variancePercentage}% variance).`,
      });
    } else {
      setFeedbackMsg({ type: 'error', text: res.error || 'Failed to run reconciliation.' });
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#f8fafc', margin: '0 0 8px 0' }}>
          Usage Ledger & Subscription Billing
        </h1>
        <p style={{ color: '#94a3b8', margin: 0 }}>
          Real-time voice minute tracking, plan allowances, overage controls, itemized GST invoices, and telephony reconciliation.
        </p>
      </div>

      {/* Notifications */}
      {feedbackMsg && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          background: feedbackMsg.type === 'success' ? '#064e3b' : '#7f1d1d',
          color: feedbackMsg.type === 'success' ? '#a7f3d0' : '#fecaca',
          border: `1px solid ${feedbackMsg.type === 'success' ? '#059669' : '#dc2626'}`,
          fontSize: '14px',
        }}>
          {feedbackMsg.text}
        </div>
      )}

      {/* Usage Alert Banners */}
      {usage?.alertLevel === 'WARNING_80' && (
        <div style={{
          background: '#451a03',
          border: '1px solid #d97706',
          color: '#fef3c7',
          padding: '14px 18px',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <strong>Usage Warning (80% Reached):</strong> You have consumed {usage.consumedMinutes} of your {usage.includedMinutes} included voice minutes ({usage.utilizationPercentage}%).
          </div>
          <button
            onClick={() => handlePlanChange('scale')}
            style={{ background: '#d97706', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Upgrade Plan
          </button>
        </div>
      )}

      {usage?.alertLevel === 'LIMIT_100' && (
        <div style={{
          background: '#450a0a',
          border: '1px solid #ef4444',
          color: '#fee2e2',
          padding: '14px 18px',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <strong>Plan Limit Reached (100%):</strong> Consumed {usage.consumedMinutes} minutes.
            {usage.isDialingBlocked
              ? ' Dialing is currently BLOCKED to prevent unwanted overages.'
              : ` Overage is ACTIVE: ${usage.overageMinutes} overage minutes accrued (₹${usage.overageChargeInr.toLocaleString()}).`}
          </div>
          <button
            onClick={handleToggleOverage}
            style={{ background: '#b91c1c', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {usage.isDialingBlocked ? 'Enable Overage Dialing' : 'Disable Overage'}
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #334155', marginBottom: '24px' }}>
        {[
          { key: 'overview', label: 'Minute Allowance & Plans' },
          { key: 'invoices', label: `Invoices & Statements (${invoices.length})` },
          { key: 'reconciliation', label: 'Carrier Reconciliation' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as 'overview' | 'invoices' | 'reconciliation')}
            style={{
              padding: '12px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.key ? '3px solid #3b82f6' : '3px solid transparent',
              color: activeTab === tab.key ? '#f8fafc' : '#94a3b8',
              fontWeight: activeTab === tab.key ? 'bold' : 'normal',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Minute Allowance & Plans */}
      {activeTab === 'overview' && usage && subscription && (
        <div>
          {/* Top Utilization Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: '#1e293b', padding: '16px', borderRadius: '10px', border: '1px solid #334155' }}>
              <div style={{ color: '#94a3b8', fontSize: '13px' }}>Included Minutes</div>
              <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#f8fafc', marginTop: '6px' }}>
                {usage.includedMinutes.toLocaleString()} min
              </div>
              <div style={{ fontSize: '12px', color: '#38bdf8', marginTop: '4px' }}>
                Plan: {plans[subscription.planId]?.name}
              </div>
            </div>

            <div style={{ background: '#1e293b', padding: '16px', borderRadius: '10px', border: '1px solid #334155' }}>
              <div style={{ color: '#94a3b8', fontSize: '13px' }}>Consumed Minutes</div>
              <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#f8fafc', marginTop: '6px' }}>
                {usage.consumedMinutes.toLocaleString()} min
              </div>
              <div style={{ fontSize: '12px', color: usage.utilizationPercentage >= 80 ? '#fbbf24' : '#4ade80', marginTop: '4px' }}>
                {usage.utilizationPercentage}% utilized
              </div>
            </div>

            <div style={{ background: '#1e293b', padding: '16px', borderRadius: '10px', border: '1px solid #334155' }}>
              <div style={{ color: '#94a3b8', fontSize: '13px' }}>Remaining Allowance</div>
              <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#f8fafc', marginTop: '6px' }}>
                {usage.remainingMinutes.toLocaleString()} min
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                Resets end of month
              </div>
            </div>

            <div style={{ background: '#1e293b', padding: '16px', borderRadius: '10px', border: '1px solid #334155' }}>
              <div style={{ color: '#94a3b8', fontSize: '13px' }}>Overage Accrued</div>
              <div style={{ fontSize: '26px', fontWeight: 'bold', color: usage.overageMinutes > 0 ? '#f87171' : '#f8fafc', marginTop: '6px' }}>
                ₹{usage.overageChargeInr.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                {usage.overageMinutes} mins @ ₹{plans[subscription.planId]?.overageRatePerMinuteInr.toFixed(2)}/min
              </div>
            </div>
          </div>

          {/* Usage Progress Bar */}
          <div style={{ background: '#1e293b', padding: '20px', borderRadius: '10px', border: '1px solid #334155', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#f8fafc', fontWeight: '600', fontSize: '14px' }}>Monthly Consumption Progress</span>
              <span style={{ color: '#94a3b8', fontSize: '13px' }}>
                {usage.consumedMinutes} / {usage.includedMinutes} Minutes ({usage.utilizationPercentage}%)
              </span>
            </div>
            <div style={{ width: '100%', height: '12px', background: '#0f172a', borderRadius: '6px', overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min(100, usage.utilizationPercentage)}%`,
                height: '100%',
                background: usage.utilizationPercentage >= 100 ? '#ef4444' : usage.utilizationPercentage >= 80 ? '#f59e0b' : '#3b82f6',
                borderRadius: '6px',
                transition: 'width 0.3s ease',
              }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #334155' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc' }}>Overage Protection Gate</div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  {subscription.allowOverage
                    ? 'Calls will continue past 100% at standard overage rate.'
                    : 'Outbound campaign dialing will automatically pause when plan limit is reached.'}
                </div>
              </div>
              <button
                onClick={handleToggleOverage}
                disabled={isLoading}
                style={{
                  background: subscription.allowOverage ? '#065f46' : '#334155',
                  color: subscription.allowOverage ? '#34d399' : '#cbd5e1',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                {subscription.allowOverage ? 'Overage Allowed (Enabled)' : 'Auto-Pause at Cap (Active)'}
              </button>
            </div>
          </div>

          {/* Plan Comparison Grid */}
          <h2 style={{ fontSize: '18px', color: '#f8fafc', marginBottom: '16px' }}>Available Plan Tiers</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {Object.values(plans).filter((p) => p.id !== 'custom').map((p) => {
              const isCurrent = subscription.planId === p.id;
              return (
                <div
                  key={p.id}
                  style={{
                    background: isCurrent ? '#0f172a' : '#1e293b',
                    border: `1px solid ${isCurrent ? '#3b82f6' : '#334155'}`,
                    borderRadius: '12px',
                    padding: '20px',
                    position: 'relative',
                  }}
                >
                  {isCurrent && (
                    <div style={{ position: 'absolute', top: '16px', right: '16px', background: '#1e3a8a', color: '#93c5fd', fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '12px' }}>
                      CURRENT PLAN
                    </div>
                  )}
                  <h3 style={{ fontSize: '18px', color: '#f8fafc', margin: '0 0 4px 0' }}>{p.name}</h3>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '12px' }}>
                    ₹{p.monthlyFeeInr.toLocaleString()}<span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 'normal' }}>/month</span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#38bdf8', marginBottom: '16px', fontWeight: '500' }}>
                    {p.includedMinutes.toLocaleString()} Voice Minutes Included (₹{p.overageRatePerMinuteInr.toFixed(2)}/min overage)
                  </div>
                  <ul style={{ paddingLeft: '18px', color: '#cbd5e1', fontSize: '13px', lineHeight: '1.7', margin: '0 0 20px 0' }}>
                    {p.features.map((feat, idx) => (
                      <li key={idx}>{feat}</li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handlePlanChange(p.id)}
                    disabled={isCurrent || isLoading}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: 'none',
                      background: isCurrent ? '#334155' : '#2563eb',
                      color: isCurrent ? '#94a3b8' : '#fff',
                      fontWeight: '600',
                      cursor: isCurrent ? 'default' : 'pointer',
                      fontSize: '13px',
                    }}
                  >
                    {isCurrent ? 'Current Plan' : 'Select Plan'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Invoices & Statements */}
      {activeTab === 'invoices' && (
        <div style={{ background: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', color: '#f8fafc', margin: 0 }}>Itemized Billing Statements</h2>
            <button
              onClick={handleGenerateInvoice}
              disabled={isLoading}
              style={{
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              Generate Current Cycle Invoice
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ color: '#64748b', borderBottom: '1px solid #334155' }}>
                <th style={{ padding: '12px' }}>Invoice #</th>
                <th style={{ padding: '12px' }}>Period</th>
                <th style={{ padding: '12px' }}>Issue Date</th>
                <th style={{ padding: '12px' }}>Subtotal</th>
                <th style={{ padding: '12px' }}>GST (18%)</th>
                <th style={{ padding: '12px' }}>Total Amount</th>
                <th style={{ padding: '12px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} style={{ borderBottom: '1px solid #334155', color: '#e2e8f0' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{inv.invoiceNumber}</td>
                  <td style={{ padding: '12px', color: '#94a3b8' }}>{inv.billingPeriod}</td>
                  <td style={{ padding: '12px', color: '#94a3b8' }}>{new Date(inv.issueDate).toLocaleDateString()}</td>
                  <td style={{ padding: '12px' }}>₹{inv.subtotalInr.toLocaleString()}</td>
                  <td style={{ padding: '12px', color: '#94a3b8' }}>₹{inv.gstAmountInr.toLocaleString()}</td>
                  <td style={{ padding: '12px', fontWeight: 'bold', color: '#38bdf8' }}>₹{inv.totalAmountInr.toLocaleString()}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      background: inv.status === 'PAID' ? '#065f46' : '#78350f',
                      color: inv.status === 'PAID' ? '#34d399' : '#fde68a',
                    }}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: Carrier Reconciliation */}
      {activeTab === 'reconciliation' && (
        <div style={{ background: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '18px', color: '#f8fafc', margin: '0 0 4px 0' }}>Telephony CDR Reconciliation</h2>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
                Audit internal platform call duration against upstream carrier Call Detail Records (CDRs) to verify accurate minute billing.
              </p>
            </div>
            <button
              onClick={handleRunReconciliation}
              disabled={isLoading}
              style={{
                background: '#059669',
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              Run CDR Audit
            </button>
          </div>

          {reconciliationReport ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
                <div style={{ background: '#0f172a', padding: '14px', borderRadius: '8px', border: '1px solid #334155' }}>
                  <div style={{ color: '#94a3b8', fontSize: '12px' }}>Internal Minutes</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f8fafc', marginTop: '4px' }}>
                    {reconciliationReport.internalTotalMinutes} min
                  </div>
                </div>
                <div style={{ background: '#0f172a', padding: '14px', borderRadius: '8px', border: '1px solid #334155' }}>
                  <div style={{ color: '#94a3b8', fontSize: '12px' }}>Provider Billed Minutes</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f8fafc', marginTop: '4px' }}>
                    {reconciliationReport.providerTotalMinutes} min
                  </div>
                </div>
                <div style={{ background: '#0f172a', padding: '14px', borderRadius: '8px', border: '1px solid #334155' }}>
                  <div style={{ color: '#94a3b8', fontSize: '12px' }}>Variance</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: reconciliationReport.variancePercentage <= 3 ? '#4ade80' : '#f87171', marginTop: '4px' }}>
                    {reconciliationReport.variancePercentage}%
                  </div>
                </div>
                <div style={{ background: '#0f172a', padding: '14px', borderRadius: '8px', border: '1px solid #334155' }}>
                  <div style={{ color: '#94a3b8', fontSize: '12px' }}>Audit Status</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: reconciliationReport.status === 'RECONCILED' ? '#34d399' : '#f87171', marginTop: '4px' }}>
                    {reconciliationReport.status}
                  </div>
                </div>
              </div>

              {reconciliationReport.discrepancies.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '14px', color: '#f8fafc', marginBottom: '8px' }}>Flagged Discrepancies</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ color: '#64748b', borderBottom: '1px solid #334155' }}>
                        <th style={{ padding: '8px' }}>Call ID</th>
                        <th style={{ padding: '8px' }}>Internal (min)</th>
                        <th style={{ padding: '8px' }}>Provider (min)</th>
                        <th style={{ padding: '8px' }}>Diff (min)</th>
                        <th style={{ padding: '8px' }}>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reconciliationReport.discrepancies.map((d, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #334155', color: '#e2e8f0' }}>
                          <td style={{ padding: '8px' }}>{d.callId}</td>
                          <td style={{ padding: '8px' }}>{d.internalMinutes}</td>
                          <td style={{ padding: '8px' }}>{d.providerMinutes}</td>
                          <td style={{ padding: '8px', color: '#f87171' }}>{d.differenceMinutes}</td>
                          <td style={{ padding: '8px', color: '#94a3b8' }}>{d.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
              No CDR audit executed yet. Click &quot;Run CDR Audit&quot; to cross-verify carrier billed minutes against recorded call sessions.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
