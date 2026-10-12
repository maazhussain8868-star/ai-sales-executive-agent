'use client';

import React, { useState, useEffect } from 'react';
import {
  getEmailSequencesOverviewAction,
  enrollLeadInEmailSequenceAction,
  triggerNextSequenceStepAction,
  simulateInboundEmailReplyAction,
  simulateUnsubscribeAction,
} from '@/app/actions/email-sequences-v2';
import {
  EmailTemplateV2,
  LeadEmailSequenceEnrollment,
  OutboundEmailLog,
} from '@/types/email-sequences-v2';

export function EmailSequenceMonitorV2() {
  const [activeTab, setActiveTab] = useState<'enrollments' | 'templates' | 'logs'>('enrollments');
  const [templates, setTemplates] = useState<EmailTemplateV2[]>([]);
  const [enrollments, setEnrollments] = useState<LeadEmailSequenceEnrollment[]>([]);
  const [outboundLogs, setOutboundLogs] = useState<OutboundEmailLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Enrollment Form State
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');

  // Selected Email Log Modal
  const [selectedLog, setSelectedLog] = useState<OutboundEmailLog | null>(null);

  useEffect(() => {
    let isMounted = true;
    getEmailSequencesOverviewAction('ws_pilot')
      .then((data) => {
        if (isMounted) {
          setTemplates(data.templates);
          setEnrollments(data.enrollments);
          setOutboundLogs(data.outboundLogs);
        }
      })
      .catch(console.error);

    return () => {
      isMounted = false;
    };
  }, []);

  const refreshData = async () => {
    const data = await getEmailSequencesOverviewAction('ws_pilot');
    setTemplates(data.templates);
    setEnrollments(data.enrollments);
    setOutboundLogs(data.outboundLogs);
  };

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newName) return;
    setIsLoading(true);
    setFeedback(null);

    const res = await enrollLeadInEmailSequenceAction({
      workspaceId: 'ws_pilot',
      sequenceId: 'seq_post_call_nurture',
      leadId: `lead_${Date.now()}`,
      leadEmail: newEmail,
      leadName: newName,
    });

    setIsLoading(false);
    if (res.success && res.enrollment) {
      setEnrollments((prev) => [res.enrollment!, ...prev]);
      setNewEmail('');
      setNewName('');
      setFeedback({ type: 'success', text: `Enrolled ${res.enrollment.leadName} into Post-Call Nurture sequence.` });
    } else {
      setFeedback({ type: 'error', text: res.error || 'Failed to enroll lead.' });
    }
  };

  const handleSendNextStep = async (enrollmentId: string) => {
    setIsLoading(true);
    setFeedback(null);

    const res = await triggerNextSequenceStepAction({ enrollmentId });
    setIsLoading(false);
    if (res.success) {
      await refreshData();
      setFeedback({ type: 'success', text: `Step dispatched. Enrollment status: ${res.status}.` });
    } else {
      setFeedback({ type: 'error', text: res.error || 'Failed to dispatch step.' });
    }
  };

  const handleSimulateReply = async (email: string) => {
    setIsLoading(true);
    setFeedback(null);

    const res = await simulateInboundEmailReplyAction({
      recipientEmail: email,
      replyText: 'Hi Priya, thanks for the recap! What is the pricing for 1,000 minutes?',
    });

    setIsLoading(false);
    if (res.success) {
      await refreshData();
      setFeedback({
        type: 'success',
        text: `Inbound reply simulated: Paused ${res.pausedCount} active sequence(s) for ${email}.`,
      });
    }
  };

  const handleSimulateUnsubscribe = async (email: string) => {
    if (!confirm(`Simulate unsubscribe click for ${email}?`)) return;
    setIsLoading(true);
    setFeedback(null);

    const res = await simulateUnsubscribeAction({ email });
    setIsLoading(false);
    if (res.success) {
      await refreshData();
      setFeedback({
        type: 'success',
        text: `Unsubscribed: Halted ${res.haltedCount} sequence(s) and added ${email} to suppression list.`,
      });
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#f8fafc', margin: '0 0 8px 0' }}>
          Email Follow-Up Sequences & Compliance
        </h1>
        <p style={{ color: '#94a3b8', margin: 0 }}>
          Manage multi-step email nurture sequences, automated pause-on-reply, mandatory unsubscribe compliance, and outbound delivery.
        </p>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          background: feedback.type === 'success' ? '#064e3b' : '#7f1d1d',
          color: feedback.type === 'success' ? '#a7f3d0' : '#fecaca',
          border: `1px solid ${feedback.type === 'success' ? '#059669' : '#dc2626'}`,
          fontSize: '14px',
        }}>
          {feedback.text}
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #334155', marginBottom: '24px' }}>
        {[
          { key: 'enrollments', label: `Active Enrollments (${enrollments.length})` },
          { key: 'templates', label: `Email Templates (${templates.length})` },
          { key: 'logs', label: `Outbound Delivery Logs (${outboundLogs.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as 'enrollments' | 'templates' | 'logs')}
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

      {/* TAB 1: Enrollments & Sequence Actions */}
      {activeTab === 'enrollments' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
          {/* Enrollments List Table */}
          <div style={{ background: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
            <h2 style={{ fontSize: '18px', color: '#f8fafc', marginTop: 0, marginBottom: '16px' }}>Enrolled Prospects</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ color: '#64748b', borderBottom: '1px solid #334155' }}>
                  <th style={{ padding: '12px' }}>Prospect</th>
                  <th style={{ padding: '12px' }}>Current Step</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                      No leads currently enrolled. Use the form on the right to enroll a prospect.
                    </td>
                  </tr>
                ) : (
                  enrollments.map((enr) => (
                    <tr key={enr.id} style={{ borderBottom: '1px solid #334155', color: '#e2e8f0' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: '600' }}>{enr.leadName}</div>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>{enr.leadEmail}</div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ background: '#334155', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                          Step {enr.currentStepNumber} of 3
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          background:
                            enr.status === 'IN_PROGRESS'
                              ? '#1e3a8a'
                              : enr.status === 'PAUSED_ON_REPLY'
                              ? '#065f46'
                              : enr.status === 'HALTED_UNSUBSCRIBED'
                              ? '#7f1d1d'
                              : '#334155',
                          color:
                            enr.status === 'IN_PROGRESS'
                              ? '#93c5fd'
                              : enr.status === 'PAUSED_ON_REPLY'
                              ? '#34d399'
                              : enr.status === 'HALTED_UNSUBSCRIBED'
                              ? '#fecaca'
                              : '#cbd5e1',
                        }}>
                          {enr.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          {enr.status === 'IN_PROGRESS' && (
                            <>
                              <button
                                onClick={() => handleSendNextStep(enr.id)}
                                disabled={isLoading}
                                style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}
                              >
                                Dispatch Step
                              </button>
                              <button
                                onClick={() => handleSimulateReply(enr.leadEmail)}
                                disabled={isLoading}
                                style={{ background: '#059669', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                              >
                                Test Reply
                              </button>
                              <button
                                onClick={() => handleSimulateUnsubscribe(enr.leadEmail)}
                                disabled={isLoading}
                                style={{ background: '#b91c1c', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                              >
                                Test Unsub
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Enroll New Prospect Form */}
          <div style={{ background: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155', height: 'fit-content' }}>
            <h2 style={{ fontSize: '18px', color: '#f8fafc', marginTop: 0, marginBottom: '16px' }}>Enroll Prospect</h2>
            <form onSubmit={handleEnroll} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Prospect Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Ramesh Patel"
                  required
                  style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #475569', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Prospect Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="prospect@company.com"
                  required
                  style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #475569', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Sequence</label>
                <div style={{ padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#94a3b8', fontSize: '13px' }}>
                  Post-Call 3-Step Nurture (Summary &rarr; Case Study &rarr; Breakup)
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  padding: '10px',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginTop: '8px',
                }}
              >
                {isLoading ? 'Enrolling...' : 'Start Sequence'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: Templates & Compliance Preview */}
      {activeTab === 'templates' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {templates.map((tmpl) => (
            <div key={tmpl.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#f8fafc' }}>{tmpl.name}</span>
                <span style={{ background: '#065f46', color: '#34d399', fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px' }}>
                  COMPLIANT
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#38bdf8', marginBottom: '12px', fontWeight: '500' }}>
                <strong>Subject:</strong> {tmpl.subject}
              </div>
              <div style={{ background: '#0f172a', padding: '12px', borderRadius: '6px', fontSize: '11px', color: '#cbd5e1', lineHeight: '1.6', maxHeight: '180px', overflowY: 'auto' }}>
                {tmpl.bodyText}
              </div>
              <div style={{ marginTop: '12px', fontSize: '11px', color: '#94a3b8' }}>
                Includes List-Unsubscribe header & postal address.
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: Outbound Delivery Logs */}
      {activeTab === 'logs' && (
        <div style={{ background: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
          <h2 style={{ fontSize: '18px', color: '#f8fafc', marginTop: 0, marginBottom: '16px' }}>Outbound Dispatch Logs</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ color: '#64748b', borderBottom: '1px solid #334155' }}>
                <th style={{ padding: '12px' }}>Recipient</th>
                <th style={{ padding: '12px' }}>Subject</th>
                <th style={{ padding: '12px' }}>Sent Time</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Headers</th>
              </tr>
            </thead>
            <tbody>
              {outboundLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                    No emails dispatched yet in this workspace.
                  </td>
                </tr>
              ) : (
                outboundLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #334155', color: '#e2e8f0' }}>
                    <td style={{ padding: '12px', fontWeight: '600' }}>{log.recipientEmail}</td>
                    <td style={{ padding: '12px', color: '#cbd5e1' }}>{log.subject}</td>
                    <td style={{ padding: '12px', color: '#94a3b8' }}>{new Date(log.sentAt).toLocaleTimeString()}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ background: '#065f46', color: '#34d399', fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px' }}>
                        {log.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <button
                        onClick={() => setSelectedLog(log)}
                        style={{ background: '#334155', color: '#cbd5e1', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Inspect Headers Modal */}
      {selectedLog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 100,
        }}>
          <div style={{ background: '#1e293b', border: '1px solid #475569', borderRadius: '12px', padding: '24px', width: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '18px' }}>Email Compliance Inspection</h3>
              <button onClick={() => setSelectedLog(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '18px' }}>
                ✕
              </button>
            </div>
            <div style={{ marginBottom: '12px', fontSize: '13px', color: '#94a3b8' }}>
              <strong>To:</strong> {selectedLog.recipientEmail}
            </div>
            <div style={{ marginBottom: '16px', fontSize: '13px', color: '#94a3b8' }}>
              <strong>Subject:</strong> {selectedLog.subject}
            </div>
            <h4 style={{ fontSize: '13px', color: '#f8fafc', marginBottom: '6px' }}>Compliance Headers:</h4>
            <pre style={{ background: '#0f172a', padding: '12px', borderRadius: '6px', fontSize: '11px', color: '#38bdf8', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(selectedLog.headers, null, 2)}
            </pre>
            <h4 style={{ fontSize: '13px', color: '#f8fafc', marginBottom: '6px', marginTop: '16px' }}>Body Preview:</h4>
            <div style={{ background: '#0f172a', padding: '12px', borderRadius: '6px', fontSize: '12px', color: '#cbd5e1' }}>
              {selectedLog.body}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
