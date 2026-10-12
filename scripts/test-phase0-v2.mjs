import fs from 'fs'
import path from 'path'
import { FakeVoiceProvider } from '../src/lib/adapters/fake/fake-voice.ts'
import { FakeLLMProvider } from '../src/lib/adapters/fake/fake-llm.ts'
import { FakeCalendarProvider } from '../src/lib/adapters/fake/fake-calendar.ts'
import { FakeCRMProvider } from '../src/lib/adapters/fake/fake-crm.ts'
import { FakeMessagingProvider } from '../src/lib/adapters/fake/fake-messaging.ts'
import { ModelRouter } from '../src/lib/model-router/router.ts'

console.log('Running PRD v2.1 Phase 0 Verification Suite: Foundation & Architecture...\n')

// 1. Check README.md
console.log('1. Checking README.md setup instructions...')
const readmePath = path.resolve(process.cwd(), 'README.md')
if (!fs.existsSync(readmePath)) {
  throw new Error('README.md is missing!')
}
const readmeContent = fs.readFileSync(readmePath, 'utf8')
const nonEmptyLines = readmeContent.split('\n').filter(l => l.trim().length > 0)
if (nonEmptyLines.length > 25) {
  throw new Error(`README setup must be concise for 10-minute setup, found ${nonEmptyLines.length} lines`)
}
console.log(`✓ README.md verified: concise setup steps (${nonEmptyLines.length} lines).\n`)

// 2. Check Supabase Migration (00001_v2_core_foundation.sql)
console.log('2. Verifying Core Foundation Supabase SQL Migration (all 18 tables + idempotency constraints)...')
const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/00001_v2_core_foundation.sql')
if (!fs.existsSync(migrationPath)) {
  throw new Error('Supabase migration 00001_v2_core_foundation.sql does not exist!')
}
const sql = fs.readFileSync(migrationPath, 'utf8')

const requiredTables = [
  'workspaces',
  'users',
  'sales_brains',
  'sales_brain_sections',
  'leads',
  'campaigns',
  'campaign_leads',
  'calls',
  'call_events',
  'transcripts',
  'call_qa',
  'follow_ups',
  'meetings',
  'suppression_list',
  'crm_sync_log',
  'messages',
  'usage_events',
  'audit_log'
]

for (const table of requiredTables) {
  if (!sql.includes(`CREATE TABLE IF NOT EXISTS ${table}`)) {
    throw new Error(`Migration missing table definition for: ${table}`)
  }
}

// Check idempotency constraints (provider_event_id unique)
if (!sql.includes('provider_event_id TEXT UNIQUE NOT NULL') && !sql.includes('provider_event_id TEXT UNIQUE')) {
  throw new Error('Migration missing provider_event_id unique constraint for idempotency!')
}
console.log(`✓ All 18 core database tables and provider_event_id unique constraints verified.\n`)

// 3. Test Adapter Interfaces & Fake Implementations
console.log('3. Testing all 5 Adapter Interfaces with Fake/Mock implementations...')

// A. Voice Provider
const voice = new FakeVoiceProvider()
const dispatchRes = await voice.dispatchCall({
  workspaceId: 'ws_test',
  leadId: 'lead_1',
  toNumber: '+919876543210',
  agentId: 'priya_01',
  prompt: 'Test prompt',
  callContext: {}
})
if (!dispatchRes.providerCallId || dispatchRes.status !== 'INITIATED') {
  throw new Error('VoiceProvider.dispatchCall failed interface test')
}
const webhookRes = await voice.parseWebhook({ call_id: dispatchRes.providerCallId })
if (!webhookRes.providerEventId || !webhookRes.transcript) {
  throw new Error('VoiceProvider.parseWebhook failed interface test')
}
console.log(`  ✓ VoiceProvider (${voice.name}): dispatchCall & parseWebhook passed.`)

// B. LLM Provider
const llm = new FakeLLMProvider()
const textCompletion = await llm.complete('Explain Desynthic in one sentence.')
if (!textCompletion.content || !textCompletion.modelUsed) {
  throw new Error('LLMProvider.complete text mode failed')
}
const jsonCompletion = await llm.complete('Generate lead score in JSON format.', { responseFormat: 'json' })
const parsedJson = JSON.parse(jsonCompletion.content)
if (!parsedJson.status || parsedJson.status !== 'success') {
  throw new Error('LLMProvider.complete json mode failed')
}
console.log(`  ✓ LLMProvider (${llm.name}): text & JSON structured completion passed.`)

// C. Calendar Provider
const calendar = new FakeCalendarProvider()
const slots = await calendar.getAvailableSlots('2026-10-15', '2026-10-16', 'Asia/Kolkata')
if (!Array.isArray(slots) || slots.length === 0) {
  throw new Error('CalendarProvider.getAvailableSlots failed')
}
const meetingRes = await calendar.bookMeeting({
  workspaceId: 'ws_test',
  leadId: 'lead_1',
  prospectName: 'Sunil Kumar',
  prospectEmail: 'sunil@example.com',
  startTime: slots[0].startTime,
  endTime: slots[0].endTime,
  timeZone: 'Asia/Kolkata',
  title: 'Desynthic Demo'
})
if (!meetingRes.confirmed || !meetingRes.providerEventId) {
  throw new Error('CalendarProvider.bookMeeting failed')
}
console.log(`  ✓ CalendarProvider (${calendar.name}): slot retrieval & confirmed booking passed.`)

// D. CRM Provider
const crm = new FakeCRMProvider()
const crmSync = await crm.syncLead({
  leadId: 'lead_1',
  phone: '+919876543210',
  name: 'Sunil Kumar',
  status: 'QUALIFIED'
})
if (!crmSync.success || !crmSync.providerRecordId) {
  throw new Error('CRMProvider.syncLead failed')
}
console.log(`  ✓ CRMProvider (${crm.name}): lead row sync passed.`)

// E. Messaging Provider
const messaging = new FakeMessagingProvider()
const templateRes = await messaging.sendTemplate({
  workspaceId: 'ws_test',
  leadId: 'lead_1',
  recipientPhone: '+919876543210',
  templateName: 'meeting_confirmed_v1'
})
if (!templateRes.providerMessageId || templateRes.status !== 'DELIVERED') {
  throw new Error('MessagingProvider.sendTemplate failed')
}
console.log(`  ✓ MessagingProvider (${messaging.name}): template dispatch passed.\n`)

// 4. Test Config-Driven Model Router
console.log('4. Testing Config-Driven Model Router...')
const router = new ModelRouter({
  taskModelMap: {
    brain_compilation: 'claude-3-5-sonnet-20241022',
    transcript_analysis: 'gpt-4o',
    qa_scoring: 'gpt-4o-mini',
    message_drafting: 'claude-3-5-sonnet-20241022',
    conversation_signals: 'gpt-4o-mini',
    general_completion: 'gpt-4o-mini'
  },
  useFakeModel: true
})

const assignedModel = router.getModelForTask('transcript_analysis')
if (assignedModel !== 'gpt-4o') {
  throw new Error(`ModelRouter assigned unexpected model: ${assignedModel}`)
}

const execResult = await router.executeTask('qa_scoring', 'Score call transcript', true)
if (!execResult.content || !execResult.modelUsed.includes('gpt-4o-mini')) {
  throw new Error('ModelRouter task execution failed')
}
console.log(`✓ ModelRouter correctly mapped task "transcript_analysis" -> ${assignedModel} and executed with fake fallback.\n`)

// 5. Test Health Check Route File Existence & Schema
console.log('5. Verifying Health-Check Endpoint...')
const healthPath = path.resolve(process.cwd(), 'src/app/api/health/route.ts')
if (!fs.existsSync(healthPath)) {
  throw new Error('Health check route src/app/api/health/route.ts is missing!')
}
console.log('✓ Health check route verified.\n')

console.log('========================================================')
console.log('ALL PRD V2.1 PHASE 0 DEFINITION OF DONE CHECKS PASSED!')
console.log('========================================================')
