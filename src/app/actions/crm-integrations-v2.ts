'use server';

import { HubSpotCrmAdapter } from '@/lib/adapters/crm/hubspot-crm';
import { ZohoCrmAdapter } from '@/lib/adapters/crm/zoho-crm';
import { GoogleSheetsSyncManager } from '@/lib/crm/sheets-sync';
import { CrmConnectionStatus, RegionalLanguageConfig } from '@/types/crm-integrations-v2';

const hubspotAdapter = new HubSpotCrmAdapter();
const zohoAdapter = new ZohoCrmAdapter();
const sheetsManager = new GoogleSheetsSyncManager();

export const REGIONAL_LANGUAGES: RegionalLanguageConfig[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    aiDisclosureLine: 'This is an AI sales representative calling from Desynthic, and this call is recorded.',
    optOutPhrases: ['stop calling', 'remove my number', 'put me on dnd', 'not interested stop'],
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    aiDisclosureLine: 'नमस्ते, मैं डेसिंथिक से एआई सेल्स एग्जीक्यूटिव प्रिया बोल रही हूँ। यह कॉल रिकॉर्ड की जा रही है।',
    optOutPhrases: ['कॉल मत करो', 'नंबर हटा दो', 'दोबारा कॉल मत करना', 'नहीं चाहिए फोन रखो'],
  },
  {
    code: 'hinglish',
    name: 'Hinglish',
    nativeName: 'Hinglish',
    aiDisclosureLine: 'Hello ji, Priya here from Desynthic. This is an AI sales rep and our call is recorded.',
    optOutPhrases: ['call mat karo', 'number hata do', 'phir se call mat karna', 'phone mat karo'],
  },
  {
    code: 'te',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    aiDisclosureLine: 'నమస్కారం, నేను డెసింథిక్ నుండి ప్రియను. ఇది ఆర్టిఫిషియల్ ఇంటెలిజెన్స్ ద్వారా రికార్డ్ చేయబడిన కాల్.',
    optOutPhrases: ['కాల్ చేయవద్దు', 'ఫోన్ చేయవద్దు', 'మళ్ళీ కాల్ చేయకండి', 'నెంబర్ తొలగించండి'],
  },
  {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    aiDisclosureLine: 'வணக்கம், நான் டெசிந்திக் நிறுவனத்திலிருந்து பிரியா பேசுகிறேன். இது AI விற்பனை பிரதிநிதி அழைப்பு.',
    optOutPhrases: ['கால் பண்ணாதீங்க', 'போன் செய்யாதீங்க', 'மீண்டும் அழைக்க வேண்டாம்', 'நம்பர் நீக்குங்கள்'],
  },
  {
    code: 'mr',
    name: 'Marathi',
    nativeName: 'मराठी',
    aiDisclosureLine: 'नमस्कार, मी डेसिंथिककडून प्रिया बोलत आहे. हा एक AI सेल्स प्रतिनिधी कॉल आहे.',
    optOutPhrases: ['कॉल करू नका', 'फोन करू नका', 'पुन्हा कॉल नको', 'नंबर हटवा'],
  },
];

export async function getCrmConnectionsAction(): Promise<CrmConnectionStatus[]> {
  return [
    {
      provider: 'google_sheets',
      isConnected: true,
      portalId: 'Desynthic_Sales_Master_Sheet',
      lastSyncedAt: new Date().toISOString(),
      totalSyncedLeads: 142,
    },
    {
      provider: 'hubspot',
      isConnected: true,
      apiKeyMasked: 'pat-na1-••••••••4219',
      portalId: 'hubspot_portal_89211',
      lastSyncedAt: new Date().toISOString(),
      totalSyncedLeads: 87,
    },
    {
      provider: 'zoho',
      isConnected: true,
      apiKeyMasked: '1000.••••••••8912',
      portalId: 'zoho_org_76120',
      lastSyncedAt: new Date().toISOString(),
      totalSyncedLeads: 54,
    },
  ];
}

export async function testCrmSyncAction(params: {
  provider: 'google_sheets' | 'hubspot' | 'zoho';
  leadName?: string;
  leadPhone?: string;
  company?: string;
  status?: string;
}): Promise<{ success: boolean; recordId?: string; error?: string }> {
  try {
    const leadData = {
      leadId: `lead_test_${Date.now()}`,
      phone: params.leadPhone || '+919876543210',
      name: params.leadName || 'Vikram Mehta',
      company: params.company || 'Mehta Logistics Pvt Ltd',
      status: params.status || 'QUALIFIED',
      summary: 'High-volume logistics founder handling 500 leads/mo.',
      score: 85,
      nextAction: 'Schedule 20-min demo walkthrough',
      meetingTime: 'Tomorrow 11:30 AM IST',
    };

    if (params.provider === 'hubspot') {
      const res = await hubspotAdapter.syncLead(leadData);
      return { success: res.success, recordId: res.providerRecordId, error: res.error };
    }

    if (params.provider === 'zoho') {
      const res = await zohoAdapter.syncLead(leadData);
      return { success: res.success, recordId: res.providerRecordId, error: res.error };
    }

    const nowIso = new Date().toISOString();
    const callId = `call_${Date.now()}`;
    const res = await sheetsManager.syncCompletedCall({
      workspaceId: 'ws_pilot',
      call: {
        id: callId,
        workspaceId: 'ws_pilot',
        campaignId: 'camp_pilot',
        leadId: leadData.leadId,
        leadPhoneNumber: leadData.phone,
        leadName: leadData.name,
        provider: 'fake',
        status: 'COMPLETED',
        direction: 'outbound',
        durationSeconds: 120,
        costInr: 6,
        transcriptStatus: 'READY',
        retryCount: 0,
        maxRetries: 3,
        detectedLanguage: 'en',
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      leadName: leadData.name,
      qa: {
        id: `qa_${Date.now()}`,
        callId,
        workspaceId: 'ws_pilot',
        summary: leadData.summary,
        sentiment: 'positive',
        intent: 'high_intent',
        objectionsTagged: [],
        nextRecommendedAction: leadData.nextAction,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      qualification: {
        score: leadData.score,
        category: leadData.score >= 70 ? 'QUALIFIED' : 'UNQUALIFIED',
        plainLanguageReason: 'Prospect fits enterprise profile',
        evaluations: [],
        missingAnswers: [],
      },
      meetingTime: leadData.meetingTime,
    });
    return { success: res.status === 'SUCCESS', recordId: res.rowIdentifier, error: res.errorMessage };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function getRegionalLanguagesAction(): Promise<RegionalLanguageConfig[]> {
  return REGIONAL_LANGUAGES;
}
