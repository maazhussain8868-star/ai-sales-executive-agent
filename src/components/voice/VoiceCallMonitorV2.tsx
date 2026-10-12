'use client';

import React, { useState } from 'react';
import { runSimulatedTestCallAction, getVoiceUsageSummaryAction } from '@/app/actions/voice-v2';

export function VoiceCallMonitorV2() {
  const [phoneNumber, setPhoneNumber] = useState('+919876543210');
  const [prospectName, setProspectName] = useState('Rahul Verma');
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'hi' | 'hinglish'>('hinglish');
  const [userReply, setUserReply] = useState('Pricing kitna hai aur demo kab ho sakta hai?');
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{
    callId: string;
    finalStatus: string;
    openingLine: string;
    dialogueHistory: Array<{ speaker: 'agent' | 'prospect'; text: string }>;
    durationSeconds: number;
    costInr: number;
    optedOut: boolean;
    suppressionReason?: string;
  } | null>(null);

  const [usageStats, setUsageStats] = useState<{
    totalEvents: number;
    totalCostInr: number;
    totalMinutes: number;
  } | null>(null);

  const handleRunCall = async (overrideReply?: string) => {
    setIsLoading(true);
    try {
      const replyToUse = overrideReply || userReply;
      const res = await runSimulatedTestCallAction({
        workspaceId: 'ws_pilot',
        phoneNumber,
        leadName: prospectName,
        language: selectedLanguage,
        prospectUtterances: [replyToUse],
      });
      setTestResult(res);

      const usage = await getVoiceUsageSummaryAction();
      setUsageStats(usage);
    } catch (err: unknown) {
      alert(`Error during test call: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptOutTrigger = () => {
    const optOutPhrases = {
      en: 'Please stop calling me, remove my number.',
      hinglish: 'Dobara call mat karna, mera number hata do.',
      hi: 'दोबारा कॉल मत करना, नंबर हटा दो।',
    };
    const phrase = optOutPhrases[selectedLanguage];
    setUserReply(phrase);
    handleRunCall(phrase);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px', fontFamily: 'system-ui, sans-serif', color: '#f8fafc' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px', borderBottom: '1px solid #334155', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 6px 0', color: '#ffffff' }}>
              Voice Calling Engine (OmniDimension Agent &quot;Priya&quot;)
            </h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>
              PRD v2.1 Voice Call Lifecycle, AI Disclosure Gate, Language Switching &amp; Instant Opt-Out Protection
            </p>
          </div>
          <span style={{
            fontSize: '12px',
            fontWeight: 600,
            padding: '4px 10px',
            borderRadius: '9999px',
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#10b981',
            border: '1px solid rgba(16, 185, 129, 0.3)',
          }}>
            Active Engine: Priya v2.1
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Left Column: Interactive Call Simulator */}
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0', color: '#e2e8f0' }}>
            Simulate Outbound Prospect Call
          </h2>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>
              Prospect Name
            </label>
            <input
              type="text"
              value={prospectName}
              onChange={(e) => setProspectName(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #334155',
                background: '#1e293b',
                color: '#ffffff',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>
              Phone Number (E.164 India)
            </label>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #334155',
                background: '#1e293b',
                color: '#ffffff',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>
              Call Language
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value as 'en' | 'hi' | 'hinglish')}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #334155',
                background: '#1e293b',
                color: '#ffffff',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            >
              <option value="hinglish">Hinglish (Natural conversational blend)</option>
              <option value="hi">Hindi (Formal Hindi)</option>
              <option value="en">English (Professional Indian English)</option>
            </select>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>
              Prospect Reply / Speech Input
            </label>
            <textarea
              rows={3}
              value={userReply}
              onChange={(e) => setUserReply(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #334155',
                background: '#1e293b',
                color: '#ffffff',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button
              onClick={() => handleRunCall()}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: '6px',
                border: 'none',
                background: '#3b82f6',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '14px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoading ? 'Dialing...' : 'Place Test Call'}
            </button>
            <button
              onClick={handleOptOutTrigger}
              disabled={isLoading}
              style={{
                padding: '10px 14px',
                borderRadius: '6px',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                fontWeight: 600,
                fontSize: '13px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              Test In-Call Opt-Out
            </button>
          </div>

          <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>
            * Strict PRD v2.1 compliance: mandatory AI disclosure spoken first. Any refusal phrase immediately terminates call and suppresses the number.
          </div>
        </div>

        {/* Right Column: Live Call Lifecycle & Transcript */}
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#e2e8f0' }}>
              Live Call Lifecycle Monitor
            </h2>
            {testResult && (
              <span style={{
                fontSize: '12px',
                fontWeight: 700,
                padding: '4px 8px',
                borderRadius: '4px',
                background: testResult.optedOut
                  ? 'rgba(239, 68, 68, 0.2)'
                  : testResult.finalStatus === 'COMPLETED'
                  ? 'rgba(16, 185, 129, 0.2)'
                  : 'rgba(59, 130, 246, 0.2)',
                color: testResult.optedOut
                  ? '#ef4444'
                  : testResult.finalStatus === 'COMPLETED'
                  ? '#10b981'
                  : '#3b82f6',
              }}>
                {testResult.finalStatus}
              </span>
            )}
          </div>

          {testResult ? (
            <div>
              {/* Telephony metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
                <div style={{ background: '#1e293b', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Duration</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffffff' }}>{testResult.durationSeconds}s</div>
                </div>
                <div style={{ background: '#1e293b', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Billed Cost</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#f59e0b' }}>₹{testResult.costInr}</div>
                </div>
                <div style={{ background: '#1e293b', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Opt-Out</div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: testResult.optedOut ? '#ef4444' : '#10b981' }}>
                    {testResult.optedOut ? 'SUPPRESSED' : 'CLEAN'}
                  </div>
                </div>
              </div>

              {testResult.optedOut && (
                <div style={{
                  padding: '10px 12px',
                  borderRadius: '6px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#fca5a5',
                  fontSize: '13px',
                  marginBottom: '16px',
                }}>
                  ⚠️ Lead permanently added to suppression list. Reason: {testResult.suppressionReason || 'Verbal refusal'}.
                </div>
              )}

              {/* Dialogue Transcript */}
              <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>Call Transcript</div>
              <div style={{
                maxHeight: '260px',
                overflowY: 'auto',
                background: '#1e293b',
                padding: '12px',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                {testResult.dialogueHistory.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      alignSelf: item.speaker === 'agent' ? 'flex-start' : 'flex-end',
                      background: item.speaker === 'agent' ? '#334155' : '#2563eb',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      maxWidth: '85%',
                      fontSize: '13px',
                      color: '#ffffff',
                    }}
                  >
                    <div style={{ fontSize: '10px', fontWeight: 600, color: '#cbd5e1', marginBottom: '2px' }}>
                      {item.speaker === 'agent' ? 'Priya (AI Sales Rep)' : prospectName}
                    </div>
                    {item.text}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{
              height: '320px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              fontSize: '14px',
              textAlign: 'center',
              border: '1px dashed #334155',
              borderRadius: '8px',
            }}>
              <p style={{ margin: '0 0 4px 0' }}>No active call session.</p>
              <p style={{ margin: 0, fontSize: '12px' }}>Place a test call or test the opt-out trigger to inspect live execution.</p>
            </div>
          )}
        </div>
      </div>

      {/* Usage & Cost Summary Footer */}
      {usageStats && (
        <div style={{
          marginTop: '24px',
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>Usage &amp; Telephony Ledger (`usage_events`)</div>
            <div style={{ fontSize: '14px', color: '#cbd5e1' }}>
              Recorded Events: <strong style={{ color: '#ffffff' }}>{usageStats.totalEvents}</strong> | Total Connected Minutes: <strong style={{ color: '#ffffff' }}>{usageStats.totalMinutes} mins</strong>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>Accumulated Provider Spend</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>₹{usageStats.totalCostInr.toFixed(2)} INR</div>
          </div>
        </div>
      )}
    </div>
  );
}
