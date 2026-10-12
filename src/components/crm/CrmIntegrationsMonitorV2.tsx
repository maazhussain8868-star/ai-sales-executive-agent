'use client';

import React, { useState, useEffect } from 'react';
import {
  getCrmConnectionsAction,
  testCrmSyncAction,
  getRegionalLanguagesAction,
} from '@/app/actions/crm-integrations-v2';
import { CrmConnectionStatus, RegionalLanguageConfig } from '@/types/crm-integrations-v2';

export function CrmIntegrationsMonitorV2() {
  const [activeTab, setActiveTab] = useState<'crm' | 'languages'>('crm');
  const [connections, setConnections] = useState<CrmConnectionStatus[]>([]);
  const [languages, setLanguages] = useState<RegionalLanguageConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let isMounted = true;
    Promise.all([getCrmConnectionsAction(), getRegionalLanguagesAction()])
      .then(([conns, langs]) => {
        if (isMounted) {
          setConnections(conns);
          setLanguages(langs);
        }
      })
      .catch(console.error);

    return () => {
      isMounted = false;
    };
  }, []);

  const handleTestSync = async (provider: 'google_sheets' | 'hubspot' | 'zoho') => {
    setIsLoading(true);
    setFeedback(null);

    const res = await testCrmSyncAction({
      provider,
      leadName: 'Vikram Mehta',
      company: 'Mehta Logistics India',
      status: 'QUALIFIED',
    });

    setIsLoading(false);
    if (res.success) {
      setFeedback({
        type: 'success',
        text: `Successfully synced lead & opportunity to ${provider.toUpperCase()} (Record ID: ${res.recordId}).`,
      });
    } else {
      setFeedback({ type: 'error', text: res.error || `Failed to sync to ${provider}.` });
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#f8fafc', margin: '0 0 8px 0' }}>
          Integrations & Regional Voice Localization
        </h1>
        <p style={{ color: '#94a3b8', margin: 0 }}>
          Manage unified CRM integrations (HubSpot, Zoho, Google Sheets) and explore localized regional language models (Telugu, Tamil, Marathi, Hindi).
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

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #334155', marginBottom: '24px' }}>
        {[
          { key: 'crm', label: `CRM Connectors (${connections.length})` },
          { key: 'languages', label: `Regional Languages (${languages.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as 'crm' | 'languages')}
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

      {/* TAB 1: CRM Connectors */}
      {activeTab === 'crm' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          {connections.map((conn) => (
            <div
              key={conn.provider}
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '18px', color: '#f8fafc', margin: 0, textTransform: 'capitalize' }}>
                    {conn.provider === 'google_sheets' ? 'Google Sheets' : conn.provider === 'hubspot' ? 'HubSpot CRM' : 'Zoho CRM'}
                  </h3>
                  <span style={{
                    background: conn.isConnected ? '#065f46' : '#7f1d1d',
                    color: conn.isConnected ? '#34d399' : '#fecaca',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    padding: '2px 8px',
                    borderRadius: '12px',
                  }}>
                    {conn.isConnected ? 'CONNECTED' : 'DISCONNECTED'}
                  </span>
                </div>

                <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>
                  <strong>Target Account:</strong> {conn.portalId || 'N/A'}
                </div>
                {conn.apiKeyMasked && (
                  <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>
                    <strong>API Key:</strong> <code style={{ color: '#38bdf8' }}>{conn.apiKeyMasked}</code>
                  </div>
                )}
                <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px' }}>
                  <strong>Total Synced Leads:</strong> {conn.totalSyncedLeads}
                </div>
              </div>

              <div style={{ borderTop: '1px solid #334155', paddingTop: '16px', display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleTestSync(conn.provider)}
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    background: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Test Sync Opportunity
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: Regional Languages */}
      {activeTab === 'languages' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          {languages.map((lang) => (
            <div
              key={lang.code}
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '12px',
                padding: '20px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', color: '#f8fafc', margin: '0 0 2px 0' }}>
                    {lang.name}
                  </h3>
                  <span style={{ fontSize: '13px', color: '#38bdf8' }}>{lang.nativeName} ({lang.code})</span>
                </div>
                <span style={{ background: '#065f46', color: '#34d399', fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px' }}>
                  ACTIVE
                </span>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: '600' }}>
                  Opening Line & AI Disclosure:
                </div>
                <div style={{ background: '#0f172a', padding: '10px', borderRadius: '6px', fontSize: '12px', color: '#cbd5e1', lineHeight: '1.5' }}>
                  &quot;{lang.aiDisclosureLine}&quot;
                </div>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: '600' }}>
                  In-Call Opt-Out Refusal Triggers:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {lang.optOutPhrases.map((phrase, idx) => (
                    <span
                      key={idx}
                      style={{
                        background: '#334155',
                        color: '#f1f5f9',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                      }}
                    >
                      {phrase}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
