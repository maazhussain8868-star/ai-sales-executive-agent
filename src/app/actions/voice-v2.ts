'use server';

/**
 * Server Actions for PRD v2.1 Phase 3: Voice Calling Engine
 */

import { CampaignDialingWorker, WorkerLeadCandidate } from '@/lib/voice/campaign-worker';
import { VoiceConversationEngine } from '@/lib/voice/conversation-engine';
import { processVoiceWebhook, getAllUsageEvents } from '@/lib/voice/webhook-handler';
import { CallRecord, CallState } from '@/types/voice-v2';
import { CompiledSalesBrain } from '@/types/brain-v2';
import { canContact } from '@/lib/safety/can-contact';

const workerInstance = new CampaignDialingWorker();

// Sample demo Sales Brain if not provided
const FALLBACK_BRAIN: CompiledSalesBrain = {
  version: 1,
  compiledAt: new Date().toISOString(),
  baseSystemPrompt: 'You are Priya, an AI sales representative. Always state you are an AI. Stop on refusal.',
  aiDisclosureLine: 'I am an AI sales assistant calling from Desynthic, and this call is recorded.',
  optOutProtocol: 'If the prospect asks to stop calling, politely apologize and end the call immediately.',
  sections: {
    company: { title: 'Company', content: 'Desynthic provides autonomous AI sales employees.', isComplete: true },
    products: { title: 'Products', content: 'Voice AI agents that qualify leads and book meetings.', isComplete: true },
    pricing: { title: 'Pricing', content: 'Pricing starts at ₹15,000/month plus voice usage at ₹12/min.', isComplete: true },
    icp: { title: 'ICP', content: 'B2B SMBs with 100+ outbound leads per month.', isComplete: true },
    objections: { title: 'Objections', content: 'We offer a 14-day zero-risk trial with 100 included minutes.', isComplete: true },
    compliance: { title: 'Compliance', content: 'Strict adherence to TRAI 10am-6pm IST calling hours and NDNC.', isComplete: true },
    voice: { title: 'Voice & Tone', content: 'Polite, clear, conversational tone in English and Hinglish.', isComplete: true },
    handoff: { title: 'Handoff Rules', content: 'Offer human callback for custom pricing or objections.', isComplete: true },
  },
  metadata: {
    companyName: 'Desynthic AI',
    agentPersona: 'Priya',
    targetLanguages: ['en', 'hi', 'hinglish'],
    approvedBy: 'founder@desynthic.com',
  },
};

/**
 * Server action to trigger dialing worker on pending leads for a campaign.
 */
export async function triggerCampaignDialerAction(params: {
  campaignId: string;
  workspaceId: string;
  leads: WorkerLeadCandidate[];
  systemPrompt?: string;
  preferredLanguage?: 'en' | 'hi' | 'hinglish';
}): Promise<{
  dialedCount: number;
  blockedCount: number;
  blockedReasons: Array<{ leadId: string; reason: string }>;
  dialedCalls: CallRecord[];
}> {
  const result = await workerInstance.processBatch(
    params.leads,
    {
      campaignId: params.campaignId,
      workspaceId: params.workspaceId,
      systemPrompt: params.systemPrompt || FALLBACK_BRAIN.baseSystemPrompt,
      preferredLanguage: params.preferredLanguage || 'hinglish',
    },
    new Date()
  );

  return {
    dialedCount: result.dialed.length,
    blockedCount: result.blocked.length,
    blockedReasons: result.blocked,
    dialedCalls: result.dialed,
  };
}

/**
 * Interactive simulated call test action for live dashboard preview.
 */
export async function runSimulatedTestCallAction(params: {
  workspaceId: string;
  phoneNumber: string;
  leadName?: string;
  prospectUtterances: string[];
  language?: 'en' | 'hi' | 'hinglish';
}): Promise<{
  callId: string;
  finalStatus: CallState;
  openingLine: string;
  dialogueHistory: Array<{ speaker: 'agent' | 'prospect'; text: string }>;
  durationSeconds: number;
  costInr: number;
  optedOut: boolean;
  suppressionReason?: string;
}> {
  const { workspaceId, phoneNumber, leadName, prospectUtterances, language = 'hinglish' } = params;

  // 1. Safety check
  const safety = await canContact(
    { id: 'lead_test', workspaceId, phoneNumber },
    'voice',
    new Date()
  );

  if (!safety.allowed) {
    return {
      callId: 'blocked_call',
      finalStatus: 'FAILED',
      openingLine: '',
      dialogueHistory: [{ speaker: 'agent', text: `Call blocked by safety engine: ${safety.reason}` }],
      durationSeconds: 0,
      costInr: 0,
      optedOut: safety.reason.includes('suppression') || safety.reason.includes('opted-out'),
      suppressionReason: safety.reason,
    };
  }

  // 2. Initialize conversation engine
  const callId = `sim_call_${Date.now()}`;
  const engine = new VoiceConversationEngine({
    callId,
    leadId: 'lead_sim',
    workspaceId,
    phoneNumber,
    leadName: leadName || 'Prospect',
    initialLanguage: language,
    brain: FALLBACK_BRAIN,
  });

  const openingLine = engine.generateOpeningLine();
  let callStatus: CallState = 'IN_PROGRESS';
  let isTerminal = false;

  // 3. Process prospect utterances
  for (const utterance of prospectUtterances) {
    if (isTerminal) break;
    const turnResult = await engine.processTurn(utterance);
    callStatus = turnResult.callStatus;
    isTerminal = turnResult.isTerminal;
  }

  if (!isTerminal) {
    callStatus = 'COMPLETED';
  }

  const finalState = engine.getState();
  const dialogueHistory = finalState.turns.map((t) => ({ speaker: t.speaker, text: t.text }));
  const durationSeconds = dialogueHistory.length * 15; // 15s estimated per turn
  const billedMinutes = Math.max(1, Math.ceil(durationSeconds / 60));
  const costInr = billedMinutes * 12.0;

  // 4. Webhook completion processing
  await processVoiceWebhook({
    provider_event_id: `evt_sim_${callId}`,
    provider_call_id: callId,
    event_type: callStatus === 'OPTED_OUT' ? 'opt_out_detected' : 'call_completed',
    timestamp: new Date().toISOString(),
    call_duration_seconds: durationSeconds,
    transcript: engine.getFormattedTranscript(),
    cost_inr: costInr,
  }, {
    id: callId,
    workspaceId,
    campaignId: 'camp_test',
    leadId: 'lead_sim',
    leadPhoneNumber: phoneNumber,
    status: callStatus,
    durationSeconds,
  });

  return {
    callId,
    finalStatus: callStatus,
    openingLine,
    dialogueHistory,
    durationSeconds,
    costInr,
    optedOut: finalState.isOptedOut,
    suppressionReason: finalState.optOutReason,
  };
}

/**
 * Retrieves total recorded usage events and spend.
 */
export async function getVoiceUsageSummaryAction(): Promise<{
  totalEvents: number;
  totalCostInr: number;
  totalMinutes: number;
}> {
  const events = getAllUsageEvents();
  const totalCostInr = events.reduce((sum, e) => sum + e.costInr, 0);
  const totalMinutes = events.reduce((sum, e) => sum + e.quantity, 0);

  return {
    totalEvents: events.length,
    totalCostInr,
    totalMinutes,
  };
}
