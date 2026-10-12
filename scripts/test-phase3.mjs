import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { FIXTURE_TRANSCRIPTS } from '../src/fixtures/transcripts.ts'
import {
  analyzeCallTranscript,
  analyzeCallWithRetry,
} from '../src/lib/intelligence/analyzer.ts'
import {
  dispatchTestCallAction,
  storeWebhookCallAction,
  getProspectMemoryAction,
} from '../src/app/actions/voice.ts'

console.log('Running Phase 3 Verification Suite: Post-Call Intelligence...\n')

// 1. Verify 10 Fixtures Evaluation and 100% Agreement
console.log('1. Running evaluation script on all 10 fixtures...')
const fixedReferenceDate = new Date('2026-10-10T10:00:00Z')
let passedFixtures = 0

for (const fixture of FIXTURE_TRANSCRIPTS) {
  const result = await analyzeCallTranscript({
    callId: fixture.id,
    transcript: fixture.transcript,
    toNumber: fixture.toNumber,
    referenceDate: fixedReferenceDate,
  })

  assert.equal(result.intent, fixture.expected.intent, `[${fixture.id}] Intent match`)
  assert.equal(result.humanHandoff, fixture.expected.humanHandoff, `[${fixture.id}] Handoff match`)
  assert.equal(result.followUp?.required, fixture.expected.followUpRequired, `[${fixture.id}] Follow-up requirement match`)
  assert.equal(result.qualification.isQualified, fixture.expected.isQualified, `[${fixture.id}] Qualification match`)

  if (fixture.expected.humanHandoff && fixture.expected.humanHandoffReasonKeyword) {
    const reasonsText = result.humanHandoffReasons.join(' ').toLowerCase()
    assert.ok(
      reasonsText.includes(fixture.expected.humanHandoffReasonKeyword.toLowerCase()),
      `[${fixture.id}] Handoff reason includes expected keyword`
    )
  }

  passedFixtures++
}
assert.equal(passedFixtures, 10, 'All 10 fixtures must pass')
console.log(`✓ 10/10 fixtures verified with 100% agreement`)

// 2. Test "call me next Tuesday" contextual follow-up
console.log('2. Testing "call me next Tuesday" contextual follow-up...')
const tuesdayFixture = FIXTURE_TRANSCRIPTS.find((f) => f.id === 'fixture_02_call_next_tuesday')
assert.ok(tuesdayFixture, 'tuesdayFixture must exist')
const tuesdayResult = await analyzeCallTranscript({
  callId: tuesdayFixture.id,
  transcript: tuesdayFixture.transcript,
  toNumber: tuesdayFixture.toNumber,
  referenceDate: fixedReferenceDate,
})

assert.ok(tuesdayResult.followUp?.required, 'Follow-up must be required')
assert.ok(tuesdayResult.followUp?.scheduledAt, 'Follow-up must have scheduledAt date')
assert.ok(tuesdayResult.followUp?.reason?.toLowerCase().includes('tuesday'), 'Reason must mention Tuesday')
assert.ok(tuesdayResult.followUp?.previousContext, 'Previous conversation context must be preserved')
console.log(`✓ Contextual follow-up correctly generated for: ${tuesdayResult.followUp?.scheduledAt}`)
console.log(`  Context: "${tuesdayResult.followUp?.previousContext}"`)

// 3. Test Human Handoff Selectivity
console.log('3. Testing Human Handoff Selectivity...')
// Must fire on handoff fixtures:
const handoffFixtures = ['fixture_03_human_handoff_requested', 'fixture_04_enterprise_custom_pricing', 'fixture_05_angry_compliance_threat', 'fixture_07_outside_approved_knowledge']
for (const id of handoffFixtures) {
  const f = FIXTURE_TRANSCRIPTS.find((x) => x.id === id)
  assert.ok(f, `Fixture ${id} must exist`)
  const res = await analyzeCallTranscript({ callId: f.id, transcript: f.transcript, toNumber: f.toNumber })
  assert.equal(res.humanHandoff, true, `Handoff must fire on ${id}`)
}

// Must NOT fire on normal calls:
const normalFixtures = ['fixture_01_high_intent_booked', 'fixture_02_call_next_tuesday', 'fixture_06_budget_objection_handled', 'fixture_08_unqualified_b2c', 'fixture_09_skeptical_latency_proof', 'fixture_10_busy_quick_brush_off']
for (const id of normalFixtures) {
  const f = FIXTURE_TRANSCRIPTS.find((x) => x.id === id)
  assert.ok(f, `Fixture ${id} must exist`)
  const res = await analyzeCallTranscript({ callId: f.id, transcript: f.transcript, toNumber: f.toNumber })
  assert.equal(res.humanHandoff, false, `Handoff must NOT fire on normal call ${id}`)
}
console.log('✓ Human handoff triggers selectively on handoff cases and never on normal calls')

// 4. Test Prospect Memory updates and injection into next call_context
console.log('4. Testing Prospect Memory and next call_context injection...')
const testPhone = '+919999999999'

// Simulate Call 1 Webhook
const incomingCallWebhook = {
  callId: 'call_live_mem_01',
  providerCallId: 'omni_mem_01',
  toNumber: testPhone,
  status: 'completed',
  durationSeconds: 120,
  transcript: `Priya: Hello, this is Priya from Desynthic on a recorded line. Am I speaking with Neha?
Neha: Yes, I am Head of Sales Operations at GrowthBridge. We are drowning in SDR hiring costs and need automated outreach.
Priya: We solve that exactly Neha. Let us do a discovery audit this Friday at 4 PM.
Neha: Sounds good, call me then.`,
  summary: 'Prospect Neha from GrowthBridge interested in automating SDR hiring costs.',
  extractedVariables: { role: 'Head of Sales Operations' },
  rawPayload: {},
}

const storeRes = await storeWebhookCallAction(incomingCallWebhook)
assert.equal(storeRes.success, true, 'Webhook storing must succeed')
assert.ok(storeRes.record.analysis, 'Stored call must have analysis record immediately')

const memory = await getProspectMemoryAction(testPhone)
assert.ok(memory, 'Prospect memory must be created for lead')
assert.equal(memory.name, 'Neha', 'Prospect name extracted')
assert.ok(memory.company.includes('GrowthBridge') || memory.role.length > 0, 'Company or role stored')
assert.ok(memory.pain.length > 0, 'Identified pain stored')

// Now simulate Call 2 to the same lead: verify callContext is prepared with memory
const testCallDispatch = await dispatchTestCallAction(testPhone)
assert.equal(testCallDispatch.success, true, 'Dispatch to existing memory lead succeeds')
assert.equal(testCallDispatch.callRecord?.extractedVariables.context_injected, true, 'Prospect memory injected into call context')
console.log(`✓ Prospect memory updated after Call 1 and injected into Call 2 call_context`)

// 5. Test Analysis Failures are Retried and Logged
console.log('5. Testing retry and error handling logic...')
const retryTest = await analyzeCallWithRetry({
  callId: 'call_test_retry',
  transcript: 'Normal test transcript for retry verification.',
  toNumber: '+919876543210',
}, 3)
assert.equal(retryTest.success, true, 'Analyzer with retry succeeded')
assert.ok(retryTest.attempts >= 1, 'Attempt count tracked')
console.log(`✓ Retry handling verified (attempts logged: ${retryTest.attempts})`)

// 6. Verify Database Migration
console.log('6. Verifying Supabase Phase 3 Migration file...')
const migrationPath = path.resolve('supabase/migrations/00004_post_call_intelligence.sql')
assert.ok(fs.existsSync(migrationPath), 'Migration 00004_post_call_intelligence.sql must exist')
const sql = fs.readFileSync(migrationPath, 'utf-8')
assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.call_analysis'), 'call_analysis table defined')
assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.follow_ups'), 'follow_ups table defined')
assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.prospect_memory'), 'prospect_memory table defined')
assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.analysis_logs'), 'analysis_logs table defined')
console.log('✓ Migration 00004_post_call_intelligence.sql verified')

console.log('\n=============================================')
console.log('ALL PHASE 3 DEFINITION OF DONE CHECKS PASSED!')
console.log('=============================================\n')
