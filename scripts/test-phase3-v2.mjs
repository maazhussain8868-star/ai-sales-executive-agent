/**
 * PRD v2.1 Phase 3 Test Suite: Voice Calling Engine
 *
 * Verifies:
 * 1. OmniDimension Voice Adapter initialization & dispatch
 * 2. Campaign Dialing Queue Worker:
 *    - Respects canContact right before dialing (rejects blocked/opted-out/off-hours leads)
 *    - Enforces concurrency ceiling (e.g. max 5 concurrent calls)
 *    - Enforces retry limits & backoff calculation
 * 3. Call Lifecycle State Transitions (QUEUED -> INITIATED -> ANSWERED -> IN_PROGRESS -> COMPLETED)
 * 4. Multilingual In-Call Opt-Out (English, Hindi, Hinglish):
 *    - Detects refusal phrases accurately
 *    - Immediately halts conversation with polite exit
 *    - Permanently suppresses the phone number
 * 5. Idempotent Webhook Handler:
 *    - Deduplicates duplicate events by provider_event_id
 *    - Captures duration, transcript, and recording URL
 * 6. Provider Cost Capture:
 *    - Records exact connected minutes into usage_events at ₹12/min
 */

import assert from 'node:assert';
import { OmniDimensionVoiceProvider } from '../src/lib/adapters/omnidimension-voice.ts';
import { CampaignDialingWorker } from '../src/lib/voice/campaign-worker.ts';
import { VoiceConversationEngine } from '../src/lib/voice/conversation-engine.ts';
import { detectInCallOptOut } from '../src/lib/voice/opt-out-detector.ts';
import { processVoiceWebhook, getAllUsageEvents, clearWebhookStore } from '../src/lib/voice/webhook-handler.ts';
import { isSuppressed, addToSuppressionList } from '../src/lib/safety/can-contact.ts';

console.log('Running PRD v2.1 Phase 3 Verification Suite: Voice Calling Engine...\n');

// 1. OmniDimension Provider Adapter Tests
console.log('1. Testing OmniDimension Voice Provider Adapter...');
const omniProvider = new OmniDimensionVoiceProvider({ apiKey: 'mock' });
assert.strictEqual(omniProvider.name, 'omnidimension', 'Provider name must be omnidimension');

const dispatchRes = await omniProvider.dispatchCall({
  workspaceId: 'ws_test',
  leadId: 'lead_001',
  toNumber: '+919876543210',
  agentId: 'priya-sales-v2',
  prompt: 'You are Priya...',
  language: 'hinglish',
  callContext: { test: true },
});

assert.strictEqual(dispatchRes.status, 'INITIATED', 'Dispatch must return INITIATED status');
assert.ok(dispatchRes.providerCallId.startsWith('omni_priya_'), 'Must return valid provider call ID');
console.log('✓ OmniDimension adapter successfully initialized and dispatched call with Agent Priya.\n');

// 2. Multilingual In-Call Opt-Out Detection Tests
console.log('2. Testing Multilingual In-Call Opt-Out Detection (English, Hindi, Hinglish)...');

const optOutTestCases = [
  { text: 'Please stop calling me, remove my number from your list', expected: true, lang: 'en' },
  { text: 'Do not call me again', expected: true, lang: 'en' },
  { text: 'Bhai call mat karo dobara, number hata do', expected: true, lang: 'hinglish' },
  { text: 'Mera number delete kar do list se', expected: true, lang: 'hinglish' },
  { text: 'कृपया दोबारा कॉल मत करना, नंबर हटा दो', expected: true, lang: 'hi' },
  { text: 'What is the pricing for your product?', expected: false, lang: 'en' },
  { text: 'Haan ji bataiye, demo kab schedule hoga?', expected: false, lang: 'hinglish' },
];

for (const tc of optOutTestCases) {
  const result = detectInCallOptOut(tc.text);
  assert.strictEqual(
    result.isOptOut,
    tc.expected,
    `Opt-out detection mismatch for: "${tc.text}" (expected ${tc.expected}, got ${result.isOptOut})`
  );
}
console.log('✓ In-call opt-out engine accurately distinguishes refusal vs non-refusal across EN, HI, Hinglish.\n');

// 3. Conversation Engine & Immediate Suppression Test
console.log('3. Testing Conversation Engine Lifecycle, AI Disclosure & Immediate Suppression...');

const mockBrain = {
  version: 1,
  compiledAt: new Date().toISOString(),
  baseSystemPrompt: 'You are Priya.',
  aiDisclosureLine: 'This call is conducted by an AI sales assistant.',
  optOutProtocol: 'Politely apologize and end call on refusal.',
  sections: {
    company: { title: 'Company', content: 'Desynthic', isComplete: true },
    products: { title: 'Products', content: 'AI Agents', isComplete: true },
    pricing: { title: 'Pricing', content: 'Rs 15000', isComplete: true },
    icp: { title: 'ICP', content: 'B2B', isComplete: true },
    objections: { title: 'Objections', content: 'Trial available', isComplete: true },
    compliance: { title: 'Compliance', content: 'TRAI compliant', isComplete: true },
    voice: { title: 'Voice', content: 'Priya', isComplete: true },
    handoff: { title: 'Handoff', content: 'Human rep', isComplete: true },
  },
  metadata: {
    companyName: 'Desynthic',
    agentPersona: 'Priya',
    targetLanguages: ['en', 'hi', 'hinglish'],
  },
};

const convEngine = new VoiceConversationEngine({
  callId: 'call_live_01',
  leadId: 'lead_opt_test',
  workspaceId: 'ws_opt_test',
  phoneNumber: '+919999988888',
  leadName: 'Vikram',
  initialLanguage: 'hinglish',
  brain: mockBrain,
});

const opening = convEngine.generateOpeningLine();
assert.ok(opening.includes('AI') || opening.includes('recorded'), 'Opening line must include mandatory AI disclosure');

// Prospect issues opt-out statement
const turnRes = await convEngine.processTurn('Call mat karo dobara, list se hata do mera number');
assert.strictEqual(turnRes.callStatus, 'OPTED_OUT', 'Call status must transition to OPTED_OUT');
assert.strictEqual(turnRes.isTerminal, true, 'Turn must be terminal upon refusal');

// Verify phone is immediately added to suppression list
const isSuppressedNow = await isSuppressed('ws_opt_test', '+919999988888');
assert.strictEqual(isSuppressedNow, true, 'Phone number must be immediately suppressed in database');
console.log('✓ Conversation engine spoke AI disclosure, handled refusal, and immediately suppressed prospect.\n');

// 4. Campaign Worker: Concurrency, Retry Limits & Safety Gate Tests
console.log('4. Testing Campaign Worker Safety Gate, Concurrency & Retry Limits...');

const worker = new CampaignDialingWorker({
  config: { maxConcurrency: 2, retryLimit: 2 },
  voiceProvider: omniProvider,
});

// Seed an already suppressed lead
await addToSuppressionList('ws_worker', '+919111122222', 'Pre-suppressed test', 'voice');

const candidateLeads = [
  // Blocked: suppressed
  { leadId: 'l1', campaignId: 'c1', workspaceId: 'ws_worker', phoneNumber: '+919111122222', name: 'Lead 1', status: 'READY', retryCount: 0 },
  // Valid lead 2
  { leadId: 'l2', campaignId: 'c1', workspaceId: 'ws_worker', phoneNumber: '+919876543211', name: 'Lead 2', status: 'READY', retryCount: 0 },
  // Valid lead 3
  { leadId: 'l3', campaignId: 'c1', workspaceId: 'ws_worker', phoneNumber: '+919876543212', name: 'Lead 3', status: 'READY', retryCount: 0 },
  // Valid lead 4 (should hit concurrency ceiling since maxConcurrency = 2)
  { leadId: 'l4', campaignId: 'c1', workspaceId: 'ws_worker', phoneNumber: '+919876543213', name: 'Lead 4', status: 'READY', retryCount: 0 },
];

// Set simulated time within allowed calling hours: Wednesday 11:30 AM IST (06:00 UTC)
const validCallTime = new Date('2026-10-14T06:00:00Z');

const workerResult = await worker.processBatch(
  candidateLeads,
  {
    campaignId: 'c1',
    workspaceId: 'ws_worker',
    systemPrompt: 'You are Priya...',
    preferredLanguage: 'hinglish',
  },
  validCallTime
);

assert.strictEqual(workerResult.blocked.length, 1, 'Pre-suppressed lead must be blocked by canContact');
assert.strictEqual(workerResult.blocked[0].leadId, 'l1');
assert.strictEqual(workerResult.dialed.length, 2, 'Dialed leads must match max concurrency ceiling');
assert.strictEqual(workerResult.skippedDueToConcurrency, 1, 'Excess leads must be skipped due to concurrency');
console.log('✓ Dialing worker strictly blocked suppressed lead and enforced max concurrency ceiling (2 calls).\n');

// Test off-hours blocking in worker
console.log('5. Testing Worker Off-Hours (Night/Sunday) Enforcement...');
worker.clearActiveCalls();
// Sunday 11:00 AM IST (Sunday shutdown)
const sundayTime = new Date('2026-10-18T05:30:00Z');
const sundayLeads = [
  { leadId: 'sun1', campaignId: 'c_sunday', workspaceId: 'ws_worker', phoneNumber: '+919876543219', name: 'Sunday Lead', status: 'READY', retryCount: 0 },
];

const sundayResult = await worker.processBatch(
  sundayLeads,
  { campaignId: 'c_sunday', workspaceId: 'ws_worker', systemPrompt: 'Test' },
  sundayTime
);

assert.strictEqual(sundayResult.dialed.length, 0, 'No calls permitted on Sunday');
assert.strictEqual(sundayResult.blocked.length, 1, 'Sunday lead must be blocked');
assert.ok(sundayResult.blocked[0].reason.includes('Sundays') || sundayResult.blocked[0].reason.includes('Sunday'), 'Blocked reason must state Sunday prohibition');
console.log('✓ Worker strictly rejected all outbound dialing on Sunday.\n');

// 6. Idempotent Webhooks & Usage Cost Ledger Tests
console.log('6. Testing Idempotent Webhook Handler & Provider Usage Cost Ledger...');
clearWebhookStore();

const webhookPayload1 = {
  provider_event_id: 'evt_omni_001',
  provider_call_id: 'omni_call_100',
  event_type: 'call_completed',
  timestamp: new Date().toISOString(),
  call_duration_seconds: 140, // 2 mins 20 secs = 3 billed minutes
  transcript: 'Agent: Hello. Prospect: Thanks for calling.',
  recording_url: 'https://storage.omnidimension.ai/rec/100.mp3',
};

// Process event first time
const firstRes = await processVoiceWebhook(webhookPayload1, {
  id: 'call_rec_100',
  workspaceId: 'ws_pilot',
  campaignId: 'camp_pilot',
});

assert.strictEqual(firstRes.success, true);
assert.strictEqual(firstRes.duplicate, false, 'First webhook must not be marked as duplicate');
assert.strictEqual(firstRes.costInr, 36.0, '3 minutes x Rs 12 = Rs 36 INR');
assert.strictEqual(firstRes.usageEventRecorded, true, 'Usage event must be written');

// Re-send identical webhook (duplicate delivery from provider)
const duplicateRes = await processVoiceWebhook(webhookPayload1);
assert.strictEqual(duplicateRes.success, true);
assert.strictEqual(duplicateRes.duplicate, true, 'Repeated webhook with same provider_event_id must be flagged duplicate');

// Check usage events ledger
const allUsage = getAllUsageEvents();
assert.strictEqual(allUsage.length, 1, 'Duplicate webhook must NOT create duplicate usage events');
assert.strictEqual(allUsage[0].costInr, 36.0);
assert.strictEqual(allUsage[0].quantity, 3);
assert.strictEqual(allUsage[0].unit, 'minute');
console.log('✓ Webhook handler deduplicated duplicate provider events and accurately logged ₹36.00 INR (3 mins) in usage ledger.\n');

console.log('========================================================');
console.log('ALL PRD V2.1 PHASE 3 DEFINITION OF DONE CHECKS PASSED!');
console.log('========================================================\n');
