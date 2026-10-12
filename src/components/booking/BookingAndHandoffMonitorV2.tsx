'use client';

import React, { useState, useEffect } from 'react';
import {
  bookMeetingAction,
  getMeetingsAction,
  scheduleFollowUpAction,
  getFollowUpsAction,
  cancelFollowUpAction,
  sendWhatsAppAction,
  getWhatsAppMessagesAction,
  triggerHandoffAction,
  getHandoffsAction,
} from '@/app/actions/booking-followup-v2';
import { MeetingRecord, FollowUpTask, WhatsAppMessageRecord, HumanHandoffRecord } from '@/types/booking-followup-v2';

export function BookingAndHandoffMonitorV2() {
  const [activeTab, setActiveTab] = useState<'calendar' | 'followup' | 'whatsapp' | 'handoff'>('calendar');
  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpTask[]>([]);
  const [whatsappLogs, setWhatsappLogs] = useState<WhatsAppMessageRecord[]>([]);
  const [handoffs, setHandoffs] = useState<HumanHandoffRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [leadName, setLeadName] = useState('Ankit Sharma');
  const [leadPhone, setLeadPhone] = useState('+919876543210');
  const [leadEmail, setLeadEmail] = useState('ankit@sharmalogistics.in');
  const [selectedSlot, setSelectedSlot] = useState('2026-10-15T11:30:00.000Z');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // WhatsApp form
  const [selectedTemplate, setSelectedTemplate] = useState('meeting_confirmation_v1');
  const [optInConfirmed, setOptInConfirmed] = useState(true);

  // Handoff form
  const [handoffReason, setHandoffReason] = useState<'HOT_BUYING_INTENT' | 'DIRECT_HUMAN_REQUEST' | 'UNSUPPORTED_QUESTION'>('HOT_BUYING_INTENT');

  const refreshAllData = async () => {
    try {
      const [m, f, w, h] = await Promise.all([
        getMeetingsAction('ws_pilot'),
        getFollowUpsAction('ws_pilot'),
        getWhatsAppMessagesAction(),
        getHandoffsAction('ws_pilot'),
      ]);
      setMeetings(m);
      setFollowUps(f);
      setWhatsappLogs(w);
      setHandoffs(h);
    } catch (err: unknown) {
      console.error(err);
    }
  };

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      getMeetingsAction('ws_pilot'),
      getFollowUpsAction('ws_pilot'),
      getWhatsAppMessagesAction(),
      getHandoffsAction('ws_pilot'),
    ]).then(([m, f, w, h]) => {
      if (isMounted) {
        setMeetings(m);
        setFollowUps(f);
        setWhatsappLogs(w);
        setHandoffs(h);
      }
    }).catch(console.error);

    return () => {
      isMounted = false;
    };
  }, []);

  const handleTestBooking = async () => {
    setIsLoading(true);
    try {
      const res = await bookMeetingAction({
        workspaceId: 'ws_pilot',
        leadId: `lead_${Date.now()}`,
        attendeeName: leadName,
        attendeeEmail: leadEmail,
        attendeePhone: leadPhone,
        title: 'Desynthic AI Walkthrough - 20 mins',
        scheduledAt: selectedSlot,
      });

      setActionNotice(`✓ ${res.spokenConfirmationMessage}`);
      await refreshAllData();
    } catch (err: unknown) {
      alert(`Booking failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScheduleFollowUp = async () => {
    setIsLoading(true);
    try {
      await scheduleFollowUpAction({
        workspaceId: 'ws_pilot',
        leadId: `lead_${Date.now()}`,
        leadName,
        leadPhone,
        scheduledAt: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
        reason: 'Prospect requested afternoon callback',
        priorContext: 'Interested in AI qualification but currently driving.',
      });

      setActionNotice('✓ Follow-up callback scheduled within approved calling hours.');
      await refreshAllData();
    } catch (err: unknown) {
      alert(`Follow-up scheduling failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelFollowUp = async (id: string) => {
    await cancelFollowUpAction(id);
    await refreshAllData();
  };

  const handleSendWhatsApp = async () => {
    setIsLoading(true);
    try {
      const res = await sendWhatsAppAction({
        workspaceId: 'ws_pilot',
        leadId: `lead_${Date.now()}`,
        recipientPhone: leadPhone,
        templateName: selectedTemplate,
        hasOptedIn: optInConfirmed,
        variables: {
          name: leadName,
          time: 'Tomorrow 11:30 AM',
          link: 'https://meet.google.com/xyz-abc',
        },
      });

      if (res.success) {
        setActionNotice('✓ WhatsApp template sent successfully with delivery tracking!');
      } else {
        setActionNotice(`⚠️ WhatsApp blocked: ${res.blockedReason}`);
      }
      await refreshAllData();
    } catch (err: unknown) {
      alert(`WhatsApp dispatch failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerHandoff = async () => {
    setIsLoading(true);
    try {
      const res = await triggerHandoffAction({
        workspaceId: 'ws_pilot',
        leadId: `lead_${Date.now()}`,
        callId: `call_${Date.now()}`,
        prospectName: leadName,
        prospectPhone: leadPhone,
        triggerReason: handoffReason,
        triggerUtterance: 'I am ready to sign contract today, connect me to manager.',
        leadSummary: 'High-intent B2B prospect ready to commit to annual agreement.',
      });

      setActionNotice(`✓ Handoff initiated (${res.handoffRecord.pathAttempted}): ${res.spokenUtterance}`);
      await refreshAllData();
    } catch (err: unknown) {
      alert(`Handoff failed: ${err instanceof Error ? err.message : String(err)}`);
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
            Booking, Follow-ups, WhatsApp &amp; Handoff
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>
            PRD v2.1 Calendar Integration, WhatsApp Drip Control &amp; Human Escalation Paths
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => { setActiveTab('calendar'); setActionNotice(null); }}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: activeTab === 'calendar' ? '1px solid #3b82f6' : '1px solid #334155',
              background: activeTab === 'calendar' ? '#1e3a8a' : '#0f172a',
              color: '#ffffff',
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            📅 Meetings ({meetings.length})
          </button>
          <button
            onClick={() => { setActiveTab('followup'); setActionNotice(null); }}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: activeTab === 'followup' ? '1px solid #3b82f6' : '1px solid #334155',
              background: activeTab === 'followup' ? '#1e3a8a' : '#0f172a',
              color: '#ffffff',
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            ⏰ Callbacks ({followUps.length})
          </button>
          <button
            onClick={() => { setActiveTab('whatsapp'); setActionNotice(null); }}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: activeTab === 'whatsapp' ? '1px solid #3b82f6' : '1px solid #334155',
              background: activeTab === 'whatsapp' ? '#1e3a8a' : '#0f172a',
              color: '#ffffff',
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            💬 WhatsApp ({whatsappLogs.length})
          </button>
          <button
            onClick={() => { setActiveTab('handoff'); setActionNotice(null); }}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: activeTab === 'handoff' ? '1px solid #3b82f6' : '1px solid #334155',
              background: activeTab === 'handoff' ? '#1e3a8a' : '#0f172a',
              color: '#ffffff',
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            🚨 Handoffs ({handoffs.length})
          </button>
        </div>
      </div>

      {actionNotice && (
        <div style={{
          padding: '12px 16px',
          background: actionNotice.includes('✓') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${actionNotice.includes('✓') ? '#10b981' : '#ef4444'}`,
          borderRadius: '8px',
          color: actionNotice.includes('✓') ? '#10b981' : '#ef4444',
          marginBottom: '20px',
          fontSize: '13px',
        }}>
          {actionNotice}
        </div>
      )}

      {/* Tab 1: Calendar Meetings */}
      {activeTab === 'calendar' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '20px', borderRadius: '12px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0', color: '#e2e8f0' }}>
              Book Walkthrough Meeting
            </h2>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Lead Name</label>
              <input
                type="text"
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #334155', color: '#ffffff', borderRadius: '6px', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Email</label>
              <input
                type="email"
                value={leadEmail}
                onChange={(e) => setLeadEmail(e.target.value)}
                style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #334155', color: '#ffffff', borderRadius: '6px', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Target Slot (ISO)</label>
              <input
                type="text"
                value={selectedSlot}
                onChange={(e) => setSelectedSlot(e.target.value)}
                style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #334155', color: '#ffffff', borderRadius: '6px', boxSizing: 'border-box' }}
              />
            </div>
            <button
              onClick={handleTestBooking}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '10px',
                background: '#3b82f6',
                border: 'none',
                borderRadius: '6px',
                color: '#ffffff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isLoading ? 'Confirming...' : 'Book Verified Slot'}
            </button>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '10px' }}>
              * Strictly complies with Rule 5: Confirmation announced ONLY after provider returns success.
            </div>
          </div>

          <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '20px', borderRadius: '12px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0', color: '#e2e8f0' }}>
              Confirmed Google Calendar Meetings
            </h2>
            {meetings.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {meetings.map((m) => (
                  <div key={m.id} style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, color: '#ffffff' }}>{m.attendeeName}</span>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: 'rgba(16, 185, 129, 0.2)',
                        color: '#10b981',
                      }}>
                        {m.status}
                      </span>
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '12px' }}>{new Date(m.scheduledAt).toLocaleString('en-IN')}</div>
                    {m.meetingUrl && (
                      <div style={{ color: '#60a5fa', fontSize: '12px', marginTop: '4px' }}>
                        🔗 <a href={m.meetingUrl} target="_blank" rel="noreferrer" style={{ color: '#60a5fa' }}>{m.meetingUrl}</a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#64748b', textAlign: 'center', padding: '30px 0', fontSize: '13px' }}>
                No meetings booked yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Follow-up Callbacks */}
      {activeTab === 'followup' && (
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '20px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#e2e8f0' }}>
              Scheduled Context-Preserved Callbacks
            </h2>
            <button
              onClick={handleScheduleFollowUp}
              disabled={isLoading}
              style={{ padding: '6px 12px', background: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              + Schedule New Callback
            </button>
          </div>

          {followUps.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {followUps.map((f) => (
                <div key={f.id} style={{ background: '#1e293b', padding: '14px', borderRadius: '8px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div>
                      <strong style={{ color: '#ffffff' }}>{f.leadName}</strong> ({f.leadPhone})
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: '#334155', color: '#e2e8f0' }}>
                        {f.status}
                      </span>
                      {f.status === 'PENDING' && (
                        <button
                          onClick={() => handleCancelFollowUp(f.id)}
                          style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '12px' }}>Scheduled: {new Date(f.scheduledAt).toLocaleString('en-IN')}</div>
                  <div style={{ color: '#cbd5e1', fontSize: '12px', marginTop: '4px' }}>Reason: {f.reason}</div>
                  <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>Prior Context: {f.priorContext}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#64748b', textAlign: 'center', padding: '30px 0', fontSize: '13px' }}>
              No callbacks currently scheduled.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: WhatsApp Drip & Templates */}
      {activeTab === 'whatsapp' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '20px', borderRadius: '12px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0', color: '#e2e8f0' }}>
              Dispatch Approved WhatsApp Template
            </h2>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Template</label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #334155', color: '#ffffff', borderRadius: '6px' }}
              >
                <option value="meeting_confirmation_v1">meeting_confirmation_v1 (APPROVED)</option>
                <option value="followup_info_v1">followup_info_v1 (APPROVED)</option>
                <option value="draft_promo_v1">draft_promo_v1 (PENDING - Rejected by gate)</option>
              </select>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Recipient Phone</label>
              <input
                type="text"
                value={leadPhone}
                onChange={(e) => setLeadPhone(e.target.value)}
                style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #334155', color: '#ffffff', borderRadius: '6px', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="optin-toggle"
                checked={optInConfirmed}
                onChange={(e) => setOptInConfirmed(e.target.checked)}
              />
              <label htmlFor="optin-toggle" style={{ fontSize: '13px', color: '#cbd5e1' }}>
                Prospect Explicit WhatsApp Opt-in Verified
              </label>
            </div>
            <button
              onClick={handleSendWhatsApp}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '10px',
                background: '#10b981',
                border: 'none',
                borderRadius: '6px',
                color: '#ffffff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isLoading ? 'Sending...' : 'Send WhatsApp Template'}
            </button>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '10px' }}>
              * Rule 6: Blocked leads or unapproved templates are stopped in code.
            </div>
          </div>

          <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '20px', borderRadius: '12px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0', color: '#e2e8f0' }}>
              WhatsApp Delivery Ledger
            </h2>
            {whatsappLogs.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {whatsappLogs.map((w) => (
                  <div key={w.id} style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, color: '#ffffff' }}>{w.templateName}</span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: w.status === 'DELIVERED' ? '#10b981' : '#ef4444' }}>
                        {w.status}
                      </span>
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '12px' }}>To: {w.recipientPhone}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#64748b', textAlign: 'center', padding: '30px 0', fontSize: '13px' }}>
                No messages sent yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Human Handoff Escalations */}
      {activeTab === 'handoff' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '20px', borderRadius: '12px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0', color: '#e2e8f0' }}>
              Simulate Human Handoff
            </h2>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Trigger Reason</label>
              <select
                value={handoffReason}
                onChange={(e) => setHandoffReason(e.target.value as 'HOT_BUYING_INTENT' | 'DIRECT_HUMAN_REQUEST' | 'UNSUPPORTED_QUESTION')}
                style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #334155', color: '#ffffff', borderRadius: '6px' }}
              >
                <option value="HOT_BUYING_INTENT">Hot Buying Intent (Ready to sign / custom contract)</option>
                <option value="DIRECT_HUMAN_REQUEST">Direct Human Request (&quot;Connect me to manager&quot;)</option>
                <option value="UNSUPPORTED_QUESTION">Unsupported Question (Out of Brain scope)</option>
              </select>
            </div>
            <button
              onClick={handleTriggerHandoff}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '10px',
                background: '#f59e0b',
                border: 'none',
                borderRadius: '6px',
                color: '#ffffff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isLoading ? 'Escalating...' : 'Trigger Multi-Tier Escalation'}
            </button>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '10px' }}>
              * Tier 1: Live Transfer → Tier 2: WhatsApp Owner Alert → Tier 3: Priority Callback Task.
            </div>
          </div>

          <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '20px', borderRadius: '12px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0', color: '#e2e8f0' }}>
              Active Handoff Ledger
            </h2>
            {handoffs.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {handoffs.map((h) => (
                  <div key={h.id} style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, color: '#ffffff' }}>{h.prospectName}</span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b' }}>
                        {h.pathAttempted}
                      </span>
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '12px' }}>Reason: {h.triggerReason}</div>
                    <div style={{ color: '#cbd5e1', fontSize: '12px', marginTop: '2px' }}>Owner Alerted: {h.ownerAlertSent ? 'YES' : 'NO'}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#64748b', textAlign: 'center', padding: '30px 0', fontSize: '13px' }}>
                No active handoff escalations.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
