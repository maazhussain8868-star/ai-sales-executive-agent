'use client';

import React, { useState, useEffect } from 'react';
import {
  checkReleaseGateAction,
  getDemoScenariosAction,
  getPilotHardeningReportAction,
  retryFailedJobAction,
} from '@/app/actions/hardening-v2';
import { ReleaseGateReport, DemoLeadScenario, SystemAuditEntry, FailedJobRecord, PilotCostEconomics } from '@/types/hardening-v2';

export function ReleaseGateAndDemoV2() {
  const [activeTab, setActiveTab] = useState<'gate' | 'demo' | 'audit'>('gate');
  const [gateReport, setGateReport] = useState<ReleaseGateReport | null>(null);
  const [scenarios, setScenarios] = useState<DemoLeadScenario[]>([]);
  const [activeScenario, setActiveScenario] = useState<DemoLeadScenario | null>(null);
  const [auditLogs, setAuditLogs] = useState<SystemAuditEntry[]>([]);
  const [failedJobs, setFailedJobs] = useState<FailedJobRecord[]>([]);
  const [economics, setEconomics] = useState<PilotCostEconomics | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      checkReleaseGateAction(),
      getDemoScenariosAction(),
      getPilotHardeningReportAction(),
    ]).then(([gate, scens, report]) => {
      if (isMounted) {
        setGateReport(gate);
        setScenarios(scens);
        if (scens.length > 0) setActiveScenario(scens[0]);
        setAuditLogs(report.auditLogs);
        setFailedJobs(report.failedJobs);
        setEconomics(report.economics);
      }
    }).catch(console.error);

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRetryJob = async (jobId: string) => {
    setIsLoading(true);
    try {
      await retryFailedJobAction(jobId);
      const report = await getPilotHardeningReportAction();
      setFailedJobs(report.failedJobs);
      setAuditLogs(report.auditLogs);
    } catch (err: unknown) {
      alert(`Retry failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 16px', fontFamily: 'system-ui, sans-serif', color: '#f8fafc' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 6px 0', color: '#ffffff' }}>
            Pilot Readiness &amp; Release Gate
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>
            PRD v2.1 Pre-Flight Safety Gate, Zero-Call Smartphone Demo &amp; Unit Economics
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('gate')}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              border: activeTab === 'gate' ? '1px solid #10b981' : '1px solid #334155',
              background: activeTab === 'gate' ? '#064e3b' : '#0f172a',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            🛡️ Release Gate {gateReport ? `(${gateReport.score}%)` : ''}
          </button>
          <button
            onClick={() => setActiveTab('demo')}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              border: activeTab === 'demo' ? '1px solid #3b82f6' : '1px solid #334155',
              background: activeTab === 'demo' ? '#1e3a8a' : '#0f172a',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            📱 Phone Demo Mode
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              border: activeTab === 'audit' ? '1px solid #f59e0b' : '1px solid #334155',
              background: activeTab === 'audit' ? '#78350f' : '#0f172a',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            💰 Unit Economics &amp; Audit
          </button>
        </div>
      </div>

      {/* Tab 1: Pre-Flight Release Gate */}
      {activeTab === 'gate' && gateReport && (
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '24px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 4px 0', color: '#ffffff' }}>
                Pre-Flight Compliance Checklist
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
                Every item must be fully verified (100% Green) before launching live outbound campaigns.
              </p>
            </div>
            <div style={{
              padding: '6px 14px',
              borderRadius: '9999px',
              fontWeight: 700,
              fontSize: '14px',
              background: gateReport.isFullyReady ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              color: gateReport.isFullyReady ? '#10b981' : '#ef4444',
              border: `1px solid ${gateReport.isFullyReady ? '#10b981' : '#ef4444'}`,
            }}>
              {gateReport.isFullyReady ? 'READY FOR LIVE PILOT' : 'LAUNCH BLOCKED'}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {gateReport.items.map((item) => (
              <div
                key={item.id}
                style={{
                  background: '#1e293b',
                  border: `1px solid ${item.passed ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.4)'}`,
                  padding: '14px 16px',
                  borderRadius: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: '#ffffff' }}>
                    {item.passed ? '✓' : '✗'} {item.name}
                  </div>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: item.passed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: item.passed ? '#10b981' : '#ef4444',
                  }}>
                    {item.passed ? 'PASSED' : 'ACTION REQUIRED'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>{item.description}</div>
                {!item.passed && item.remediationAdvice && (
                  <div style={{ fontSize: '12px', color: '#fca5a5', marginTop: '6px' }}>
                    💡 Fix: {item.remediationAdvice}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Smartphone Zero-Call Demo Mode */}
      {activeTab === 'demo' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '20px', borderRadius: '12px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 14px 0', color: '#e2e8f0' }}>
              Select Prospect Scenario
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {scenarios.map((scen) => (
                <button
                  key={scen.id}
                  onClick={() => setActiveScenario(scen)}
                  style={{
                    textAlign: 'left',
                    padding: '12px 14px',
                    background: activeScenario?.id === scen.id ? '#1e3a8a' : '#1e293b',
                    border: `1px solid ${activeScenario?.id === scen.id ? '#3b82f6' : '#334155'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    color: '#ffffff',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>{scen.name}</div>
                  <div style={{ fontSize: '12px', color: '#cbd5e1' }}>{scen.company} ({scen.industry})</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Outcome: {scen.expectedOutcome}</div>
                </button>
              ))}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '14px' }}>
              * Allows founders to pitch live prospects on phones without placing actual outbound phone calls.
            </div>
          </div>

          <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '20px', borderRadius: '12px' }}>
            {activeScenario ? (
              <div>
                <div style={{ marginBottom: '14px', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px 0', color: '#ffffff' }}>
                    {activeScenario.name} — {activeScenario.company}
                  </h3>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>{activeScenario.description}</div>
                </div>

                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>Turn-by-Turn Dialogue:</div>
                <div style={{
                  maxHeight: '360px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  background: '#1e293b',
                  padding: '12px',
                  borderRadius: '8px',
                }}>
                  {activeScenario.mockDialogue.map((d: { speaker: 'agent' | 'prospect'; text: string }, i: number) => (
                    <div
                      key={i}
                      style={{
                        alignSelf: d.speaker === 'agent' ? 'flex-start' : 'flex-end',
                        background: d.speaker === 'agent' ? '#334155' : '#2563eb',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        maxWidth: '85%',
                        fontSize: '13px',
                        color: '#ffffff',
                      }}
                    >
                      <div style={{ fontSize: '10px', fontWeight: 600, color: '#cbd5e1', marginBottom: '2px' }}>
                        {d.speaker === 'agent' ? 'Priya (AI Sales Rep)' : activeScenario.name}
                      </div>
                      {d.text}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ color: '#64748b', textAlign: 'center', padding: '40px 0' }}>
                Select a scenario to view dialogue.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Unit Economics & Audit Ledger */}
      {activeTab === 'audit' && (
        <div>
          {/* Economics Cards */}
          {economics && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '14px', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Cost / Call</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffffff' }}>₹{economics.costPerCallInr}</div>
              </div>
              <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '14px', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Cost / Connected Min</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6' }}>₹{economics.costPerConnectedMinuteInr}</div>
              </div>
              <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '14px', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Cost / Qualified Lead</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>₹{economics.costPerQualifiedLeadInr}</div>
              </div>
              <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '14px', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Cost / Booked Meeting</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f59e0b' }}>₹{economics.costPerBookedMeetingInr}</div>
              </div>
            </div>
          )}

          {/* Failed Job Queue & Retry */}
          {failedJobs.length > 0 && (
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '18px', borderRadius: '12px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 12px 0', color: '#fca5a5' }}>
                ⚠️ Failed Background Jobs Queue
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {failedJobs.map((job) => (
                  <div key={job.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '10px 14px', borderRadius: '6px' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>{job.jobType} (Lead: {job.leadId})</div>
                      <div style={{ fontSize: '11px', color: '#fca5a5' }}>{job.errorReason}</div>
                    </div>
                    <button
                      onClick={() => handleRetryJob(job.id)}
                      disabled={isLoading}
                      style={{ padding: '6px 12px', background: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                    >
                      Retry Job
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit Trail */}
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 12px 0', color: '#e2e8f0' }}>
              System Audit Trail (`audit_log`)
            </h3>
            {auditLogs.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {auditLogs.map((log) => (
                  <div key={log.id} style={{ background: '#1e293b', padding: '10px 14px', borderRadius: '6px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                      <span style={{ fontWeight: 600, color: '#ffffff' }}>{log.eventType}</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString('en-IN')}</span>
                    </div>
                    <div style={{ color: '#cbd5e1', marginTop: '2px' }}>{log.description}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#64748b', textAlign: 'center', padding: '20px 0', fontSize: '13px' }}>
                Audit trail active. Events will log automatically.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
