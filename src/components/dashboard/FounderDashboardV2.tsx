'use client';

import React, { useState, useEffect } from 'react';
import {
  getDashboardMetricsAction,
  processCallIntelligenceAction,
  submitReviewerFeedbackAction,
  getCrmSyncLogsAction,
  retryCrmSyncAction,
} from '@/app/actions/intelligence-v2';
import { DashboardMetrics, QualificationResult, CallQARecord, CRMSyncRecord, QualificationCategory } from '@/types/intelligence-v2';

export function FounderDashboardV2() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [syncLogs, setSyncLogs] = useState<CRMSyncRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'metrics' | 'reviewer' | 'crm'>('metrics');
  const [isLoading, setIsLoading] = useState(false);

  // Reviewer QA state
  const [sampleTranscript, setSampleTranscript] = useState(
    `Agent: Namaste Rahul ji, main Priya baat kar rahi hoon Desynthic se. Yeh call ek AI sales assistant dwara ki ja rahi hai. Do you have two minutes?
Prospect: Haan ji bataiye, we are a B2B SaaS startup with around 500 leads every month and our founder wants to automate outbound calling.
Agent: That is great! Our pricing starts at Rs 15,000 per month with complete telephony. Would you be open to a walkthrough?
Prospect: Pricing sounds affordable, send me the demo calendar link.`
  );
  const [leadName, setLeadName] = useState('Rahul Sharma');
  const [currentQA, setCurrentQA] = useState<CallQARecord | null>(null);
  const [currentQual, setCurrentQual] = useState<QualificationResult | null>(null);
  const [reviewerOverride, setReviewerOverride] = useState<QualificationCategory>('QUALIFIED');
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [coachingFeedback, setCoachingFeedback] = useState('Agent Priya handled opening and qualification very well.');
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getDashboardMetricsAction({ mockDataSeed: true })
      .then((data) => {
        if (isMounted) setMetrics(data);
      })
      .catch((err) => console.error(err));

    getCrmSyncLogsAction()
      .then((logs) => {
        if (isMounted) setSyncLogs(logs);
      })
      .catch((err) => console.error(err));

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefreshData = async () => {
    setIsLoading(true);
    try {
      const data = await getDashboardMetricsAction({ mockDataSeed: true });
      setMetrics(data);
      const logs = await getCrmSyncLogsAction();
      setSyncLogs(logs);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunAnalysis = async () => {
    setIsLoading(true);
    try {
      const res = await processCallIntelligenceAction({
        callId: `call_${Date.now()}`,
        workspaceId: 'ws_pilot',
        transcript: sampleTranscript,
        leadName,
        durationSeconds: 110,
      });
      setCurrentQual(res.qualification);
      setCurrentQA(res.qa);
      setReviewerOverride(res.qualification.category);
      // Refresh sync logs
      const logs = await getCrmSyncLogsAction();
      setSyncLogs(logs);
    } catch (err: unknown) {
      alert(`Error during analysis: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveReview = async () => {
    if (!currentQA) return;
    setIsLoading(true);
    try {
      await submitReviewerFeedbackAction({
        callId: currentQA.callId,
        overrideCategory: reviewerOverride,
        notes: reviewerNotes,
        coachingFeedback,
      });
      setFeedbackSuccess(true);
      setTimeout(() => setFeedbackSuccess(false), 3000);
    } catch (err: unknown) {
      alert(`Error saving feedback: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetrySync = async (syncId: string) => {
    setIsLoading(true);
    try {
      await retryCrmSyncAction(syncId);
      const logs = await getCrmSyncLogsAction();
      setSyncLogs(logs);
    } catch (err: unknown) {
      alert(`Retry failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px', fontFamily: 'system-ui, sans-serif', color: '#f8fafc' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 6px 0', color: '#ffffff' }}>
            Founder Sales Dashboard
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>
            PRD v2.1 Pipeline Intelligence, Call QA, Google Sheets CRM Sync &amp; Unit Economics
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('metrics')}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              border: activeTab === 'metrics' ? '1px solid #3b82f6' : '1px solid #334155',
              background: activeTab === 'metrics' ? '#1e3a8a' : '#0f172a',
              color: '#ffffff',
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            📊 Analytics
          </button>
          <button
            onClick={() => setActiveTab('reviewer')}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              border: activeTab === 'reviewer' ? '1px solid #3b82f6' : '1px solid #334155',
              background: activeTab === 'reviewer' ? '#1e3a8a' : '#0f172a',
              color: '#ffffff',
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            🔍 Call QA &amp; Reviewer
          </button>
          <button
            onClick={() => setActiveTab('crm')}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              border: activeTab === 'crm' ? '1px solid #3b82f6' : '1px solid #334155',
              background: activeTab === 'crm' ? '#1e3a8a' : '#0f172a',
              color: '#ffffff',
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            📑 Sheets CRM Sync
          </button>
        </div>
      </div>

      {/* Tab 1: Analytics & Metrics */}
      {activeTab === 'metrics' && metrics && (
        <div>
          {/* Top KPI Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '16px', borderRadius: '10px' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Calls Attempted</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff' }}>{metrics.callsAttempted}</div>
              <div style={{ fontSize: '11px', color: '#10b981', marginTop: '4px' }}>{metrics.conversationRate}% Conversation Rate</div>
            </div>

            <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '16px', borderRadius: '10px' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Qualified Leads</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{metrics.qualifiedCount}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>{metrics.qualificationRate}% of completed calls</div>
            </div>

            <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '16px', borderRadius: '10px' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Meetings Booked</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>{metrics.meetingsBooked}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>{metrics.followUpsDue} follow-ups scheduled</div>
            </div>

            <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '16px', borderRadius: '10px' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Cost per Qualified Lead</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>₹{metrics.costPerQualifiedLeadInr}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Total Spend: ₹{metrics.totalSpendInr} INR</div>
            </div>
          </div>

          {/* Secondary Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {/* Qualification Distribution */}
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '20px', borderRadius: '12px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0', color: '#e2e8f0' }}>
                Lead Qualification Breakdown
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                    <span style={{ color: '#10b981' }}>Qualified (ICP &amp; Intent Match)</span>
                    <span style={{ fontWeight: 'bold' }}>{metrics.qualifiedCount}</span>
                  </div>
                  <div style={{ background: '#1e293b', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${(metrics.qualifiedCount / (metrics.callsCompleted || 1)) * 100}%`, background: '#10b981', height: '100%' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                    <span style={{ color: '#ef4444' }}>Unqualified / Disqualified</span>
                    <span style={{ fontWeight: 'bold' }}>{metrics.unqualifiedCount}</span>
                  </div>
                  <div style={{ background: '#1e293b', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${(metrics.unqualifiedCount / (metrics.callsCompleted || 1)) * 100}%`, background: '#ef4444', height: '100%' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                    <span style={{ color: '#f59e0b' }}>Inconclusive / Unknown</span>
                    <span style={{ fontWeight: 'bold' }}>{metrics.unknownCount}</span>
                  </div>
                  <div style={{ background: '#1e293b', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${(metrics.unknownCount / (metrics.callsCompleted || 1)) * 100}%`, background: '#f59e0b', height: '100%' }} />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #1e293b', fontSize: '12px', color: '#64748b' }}>
                Opt-Outs recorded: <strong style={{ color: '#ef4444' }}>{metrics.optOutsCount}</strong> (immediately added to suppression list)
              </div>
            </div>

            {/* Top Objections */}
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '20px', borderRadius: '12px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0', color: '#e2e8f0' }}>
                Top Objections Tagged
              </h2>
              {metrics.topObjections.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {metrics.topObjections.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '10px 14px', borderRadius: '8px' }}>
                      <span style={{ fontSize: '13px', color: '#cbd5e1' }}>{item.objection}</span>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#f59e0b' }}>{item.count} mentions</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#64748b', fontSize: '13px' }}>No objections recorded yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Reviewer Screen & Call QA */}
      {activeTab === 'reviewer' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
          {/* Left: Transcript & Analyzer Input */}
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '20px', borderRadius: '12px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 14px 0', color: '#e2e8f0' }}>
              Inspect Call Transcript
            </h2>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Prospect Name</label>
              <input
                type="text"
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', color: '#ffffff', borderRadius: '6px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Transcript Text</label>
              <textarea
                rows={8}
                value={sampleTranscript}
                onChange={(e) => setSampleTranscript(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', color: '#ffffff', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>

            <button
              onClick={handleRunAnalysis}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: 'none',
                background: '#3b82f6',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '14px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoading ? 'Analyzing...' : 'Run QA & Qualification'}
            </button>
          </div>

          {/* Right: QA Findings & Reviewer Override */}
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '20px', borderRadius: '12px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 14px 0', color: '#e2e8f0' }}>
              Reviewer QA &amp; Coaching
            </h2>

            {currentQual && currentQA ? (
              <div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontWeight: 700,
                    fontSize: '13px',
                    background: currentQual.category === 'QUALIFIED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: currentQual.category === 'QUALIFIED' ? '#10b981' : '#ef4444',
                  }}>
                    {currentQual.category} ({currentQual.score}/100)
                  </span>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Sentiment: <strong>{currentQA.sentiment}</strong>
                  </span>
                </div>

                <div style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '14px', lineHeight: '1.4' }}>
                  <strong>Summary:</strong> {currentQA.summary}
                </div>

                {/* Evidence quotes */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Verbatim Evidence Quotes:</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {currentQual.evaluations.map((ev, i) => (
                      <div key={i} style={{ background: '#1e293b', padding: '8px 10px', borderRadius: '6px', fontSize: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                          <span>{ev.criterionName}</span>
                          <span style={{ color: ev.met === true ? '#10b981' : ev.met === false ? '#ef4444' : '#f59e0b' }}>
                            {ev.met === true ? 'MET' : ev.met === false ? 'FAILED' : 'UNKNOWN'}
                          </span>
                        </div>
                        {ev.evidenceQuote && (
                          <div style={{ color: '#cbd5e1', fontStyle: 'italic', marginTop: '4px' }}>
                            &ldquo;{ev.evidenceQuote}&rdquo;
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reviewer Override Form */}
                <div style={{ borderTop: '1px solid #334155', paddingTop: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                    Reviewer Outcome Override
                  </label>
                  <select
                    value={reviewerOverride}
                    onChange={(e) => setReviewerOverride(e.target.value as QualificationCategory)}
                    style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #334155', color: '#ffffff', borderRadius: '6px', marginBottom: '10px' }}
                  >
                    <option value="QUALIFIED">QUALIFIED</option>
                    <option value="UNQUALIFIED">UNQUALIFIED</option>
                    <option value="UNKNOWN">UNKNOWN</option>
                  </select>

                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                    Reviewer Notes / Context
                  </label>
                  <input
                    type="text"
                    value={reviewerNotes}
                    onChange={(e) => setReviewerNotes(e.target.value)}
                    placeholder="Enter manual reviewer notes..."
                    style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #334155', color: '#ffffff', borderRadius: '6px', fontSize: '12px', marginBottom: '10px', boxSizing: 'border-box' }}
                  />

                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                    Coaching Feedback (Feeds next Sales Brain update)
                  </label>
                  <textarea
                    rows={2}
                    value={coachingFeedback}
                    onChange={(e) => setCoachingFeedback(e.target.value)}
                    style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #334155', color: '#ffffff', borderRadius: '6px', fontSize: '12px', marginBottom: '12px', boxSizing: 'border-box' }}
                  />

                  <button
                    onClick={handleSaveReview}
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#10b981',
                      color: '#ffffff',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    Save Reviewer Feedback
                  </button>
                  {feedbackSuccess && (
                    <div style={{ color: '#10b981', fontSize: '12px', textAlign: 'center', marginTop: '6px' }}>
                      ✓ Feedback recorded for Sales Brain updates!
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>
                Run analysis on a call transcript to view automated QA findings and reviewer override controls.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Google Sheets CRM Sync Table */}
      {activeTab === 'crm' && (
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '20px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px 0', color: '#e2e8f0' }}>
                Google Sheets CRM Sync Log (`crm_sync_log`)
              </h2>
              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                Transactions logged per completed call with row IDs, failure visibility, and manual retry.
              </p>
            </div>
            <button
              onClick={handleRefreshData}
              style={{
                padding: '6px 12px',
                background: '#1e293b',
                border: '1px solid #334155',
                color: '#cbd5e1',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Refresh Logs
            </button>
          </div>

          {syncLogs.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', textAlign: 'left', color: '#94a3b8' }}>
                    <th style={{ padding: '8px' }}>Phone / Lead</th>
                    <th style={{ padding: '8px' }}>Provider</th>
                    <th style={{ padding: '8px' }}>Status</th>
                    <th style={{ padding: '8px' }}>Sheets Row ID</th>
                    <th style={{ padding: '8px' }}>Retries</th>
                    <th style={{ padding: '8px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {syncLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '10px 8px' }}>{log.leadPhone}</td>
                      <td style={{ padding: '10px 8px' }}>Google Sheets</td>
                      <td style={{ padding: '10px 8px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: log.status === 'SUCCESS' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: log.status === 'SUCCESS' ? '#10b981' : '#ef4444',
                        }}>
                          {log.status}
                        </span>
                        {log.errorMessage && (
                          <div style={{ fontSize: '11px', color: '#fca5a5', marginTop: '2px' }}>
                            {log.errorMessage}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px 8px', color: '#94a3b8' }}>
                        {log.rowIdentifier || '—'}
                      </td>
                      <td style={{ padding: '10px 8px' }}>{log.retryCount}</td>
                      <td style={{ padding: '10px 8px' }}>
                        {log.status === 'FAILED' && (
                          <button
                            onClick={() => handleRetrySync(log.id)}
                            style={{
                              padding: '4px 10px',
                              background: '#ef4444',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: 'pointer',
                            }}
                          >
                            Retry Sync
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '30px 0', fontSize: '13px' }}>
              No CRM sync events logged yet. Completed calls will synchronize automatically.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
