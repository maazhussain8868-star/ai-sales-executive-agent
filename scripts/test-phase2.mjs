import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { getVoiceProvider } from '../src/lib/voice/index.ts'
import { validateCallCompliance } from '../src/lib/voice/compliance-gate.ts'
import { DEMO_BUSINESS_DATA } from '../src/lib/demo-data.ts'
import { compileSalesBrain } from '../src/lib/model-router/index.ts'

console.log('Running Phase 2 Verification Suite: Voice Provider Connection...\n')

// 1. Verify Isolated Voice Provider Architecture
console.log('1. Checking Voice Provider Interface & Isolation...')
const provider = getVoiceProvider('omnidimension')
assert.ok(provider, 'getVoiceProvider must return an instance')
assert.equal(provider.name, 'omnidimension', 'Provider name must be omnidimension')
assert.equal(typeof provider.updateAgentPrompt, 'function', 'updateAgentPrompt method must exist')
assert.equal(typeof provider.dispatchCall, 'function', 'dispatchCall method must exist')
assert.equal(typeof provider.parseWebhook, 'function', 'parseWebhook method must exist')
console.log('✓ Isolated Voice Provider interface verified')

// 2. Test "Update agent" prompt at provider
console.log('2. Testing "Update agent" prompt change at provider...')
const compiled = await compileSalesBrain(DEMO_BUSINESS_DATA, 3800)
const updateResult = await provider.updateAgentPrompt({
  agentId: 'priya_agent_01',
  prompt: compiled.voiceAgentPrompt,
})
assert.equal(updateResult.success, true, 'updateAgentPrompt must succeed')
assert.ok(updateResult.updatedAt, 'updateAgentPrompt must return timestamp')
console.log('✓ "Update agent" successfully changed prompt at provider')

// 3. Test Compliance Gate: Allow-listed test call connects
console.log('3. Testing Test Call to allow-listed number...')
const allowList = ['+919876543210', '+919999999999']
const allowedCheck = validateCallCompliance({
  toNumber: '+919876543210',
  voicePrompt: compiled.voiceAgentPrompt,
  allowList,
  isDnd: false,
})
assert.equal(allowedCheck.allowed, true, 'Allow-listed number must pass compliance')

const dispatchResult = await provider.dispatchCall({
  agentId: 'priya_agent_01',
  toNumber: '+919876543210',
  callContext: { prospect_name: 'Rahul', company: 'ScaleSync' },
})
assert.equal(dispatchResult.success, true, 'Dispatch call to allow-listed number must succeed')
assert.ok(dispatchResult.callId, 'Dispatch call must return a callId')
console.log(`✓ Test call to allow-listed number connected (Call ID: ${dispatchResult.callId})`)

// 4. Test Compliance Gate: Non-allowed number blocked with clear message
console.log('4. Testing call to non-allowed number is blocked with clear message...')
const nonAllowedCheck = validateCallCompliance({
  toNumber: '+918888888888',
  voicePrompt: compiled.voiceAgentPrompt,
  allowList,
  isDnd: false,
})
assert.equal(nonAllowedCheck.allowed, false, 'Non-allowed number must be blocked')
assert.equal(nonAllowedCheck.code, 'ALLOWLIST_BLOCKED')
assert.ok(
  nonAllowedCheck.reason?.includes('not on the allow-list'),
  `Reason must clearly mention allow-list (got: "${nonAllowedCheck.reason}")`
)
console.log(`✓ Blocked non-allowed number with clear message: "${nonAllowedCheck.reason}"`)

// 5. Test Compliance Gate: Missing AI disclosure blocked
console.log('5. Testing call with missing AI disclosure line is blocked...')
const missingDisclosureCheck = validateCallCompliance({
  toNumber: '+919876543210',
  voicePrompt: 'Hello this is an outbound sales pitch for our software with zero disclosure.',
  allowList,
})
assert.equal(missingDisclosureCheck.allowed, false, 'Missing AI disclosure must be blocked')
assert.equal(missingDisclosureCheck.code, 'MISSING_AI_DISCLOSURE')
assert.ok(missingDisclosureCheck.reason?.includes('AI disclosure'))
console.log(`✓ Missing AI disclosure blocked with message: "${missingDisclosureCheck.reason}"`)

// 6. Test Compliance Gate: DND blocked
console.log('6. Testing DND-flagged lead is blocked...')
const dndCheck = validateCallCompliance({
  toNumber: '+919876543210',
  voicePrompt: compiled.voiceAgentPrompt,
  allowList,
  isDnd: true,
})
assert.equal(dndCheck.allowed, false, 'DND lead must be blocked')
assert.equal(dndCheck.code, 'DND_BLOCKED')
console.log('✓ DND flagged lead blocked successfully')

// 7. Test Webhook Ingestion & Parser
console.log('7. Testing Webhook parser for OmniDimension post-call payload...')
const mockOmniWebhookPayload = {
  call_id: 'omni_call_live_99',
  agent_id: 'priya_agent_01',
  to_number: '+919876543210',
  status: 'completed',
  call_report: {
    duration_seconds: 185,
    summary: 'Prospect Rahul agreed to a 20-minute growth audit on Thursday at 3 PM.',
    extracted_variables: {
      decision_maker: true,
      budget: '$2,000/mo',
      pain: 'SDR churn',
      scheduled_time: '2026-10-15T15:00:00+05:30',
    },
    interactions: [
      { speaker: 'Priya', message: 'Hello, this is Priya, an AI sales assistant calling from Desynthic on a recorded line.' },
      { speaker: 'Rahul', message: 'Hi Priya, what is this about?' },
      { speaker: 'Priya', message: 'We help agency founders replace high SDR churn with autonomous AI employees.' },
      { speaker: 'Rahul', message: 'Sounds interesting. Can you book a time for Thursday at 3 PM?' },
    ],
  },
}

const parsedWebhook = provider.parseWebhook(mockOmniWebhookPayload)
assert.equal(parsedWebhook.callId, 'omni_call_live_99', 'callId parsed correctly')
assert.equal(parsedWebhook.status, 'completed', 'status parsed correctly')
assert.equal(parsedWebhook.durationSeconds, 185, 'duration parsed correctly')
assert.ok(parsedWebhook.summary.includes('Rahul'), 'summary parsed correctly')
assert.equal(parsedWebhook.extractedVariables.budget, '$2,000/mo', 'extracted variables parsed')
assert.ok(parsedWebhook.transcript.includes('Priya: Hello'), 'transcript parsed from interactions')
console.log('✓ Webhook parser successfully parsed transcript, summary, and extracted variables')

// 8. Verify Phase 2 Database Migration
console.log('8. Verifying Supabase Phase 2 Migration file...')
const migrationPath = path.resolve('supabase/migrations/00003_voice_calls.sql')
assert.ok(fs.existsSync(migrationPath), 'Migration 00003_voice_calls.sql must exist')
const sql = fs.readFileSync(migrationPath, 'utf-8')
assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.calls'), 'calls table defined')
assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.voice_settings'), 'voice_settings table defined')
console.log('✓ Migration 00003_voice_calls.sql verified')

console.log('\n=============================================')
console.log('ALL PHASE 2 DEFINITION OF DONE CHECKS PASSED!')
console.log('=============================================\n')
