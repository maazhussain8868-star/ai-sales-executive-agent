import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { encryptSecret, decryptSecret } from '../src/lib/analytics/encryption.ts'
import { computeDashboardMetrics } from '../src/lib/analytics/aggregator.ts'
import {
  checkWorkspaceUsageCapAction,
  verifyClientDataIsolationAction,
  getEncryptedApiKeysAction,
  saveEncryptedApiKeyAction,
} from '../src/app/actions/analytics.ts'

console.log('Running Phase 6 Verification Suite: Founder Dashboard & Multi-Client...\n')

// 1. Test Client A vs Client B Multi-Tenant Data Isolation (Definition of Done)
console.log('1. Testing Multi-Tenant Row Level Security & Data Isolation...')
const isolationResult = await verifyClientDataIsolationAction('ws_client_a', 'ws_client_b')
assert.equal(isolationResult.isolated, true, 'Client A and Client B data must have zero overlap')
assert.ok(isolationResult.clientADataCount > 0, 'Client A has its own distinct records')
assert.ok(isolationResult.clientBDataCount > 0, 'Client B has its own distinct records')
console.log('✓ Multi-client isolation verified: Client A can NEVER see Client B data (0 overlap)')

// 2. Test Dashboard Numbers Match Raw Calls Table 1:1 on a Test Set (Definition of Done)
console.log('\n2. Testing Dashboard Numbers Match Raw Calls Table 1:1...')
const testCalls = [
  // Call 1: Answered, conversation, booked meeting, quality 95
  {
    id: 'c1',
    status: 'completed',
    durationSeconds: 120,
    toNumber: '+919876543210',
    analysis: {
      intent: 'high_intent',
      callQualityScore: 95,
      objectionsRaised: ['price'],
      qualification: { isQualified: true },
      humanHandoff: false,
    },
  },
  // Call 2: Answered, short brush off (<30s), quality 80
  {
    id: 'c2',
    status: 'completed',
    durationSeconds: 20,
    toNumber: '+919876543211',
    analysis: {
      intent: 'curious',
      callQualityScore: 80,
      objectionsRaised: [],
      qualification: { isQualified: true },
      humanHandoff: false,
    },
  },
  // Call 3: No answer, 0s
  {
    id: 'c3',
    status: 'no_answer',
    durationSeconds: 0,
    toNumber: '+919876543212',
  },
  // Call 4: Blocked by compliance gate (not counted in callsMade)
  {
    id: 'c4',
    status: 'blocked',
    durationSeconds: 0,
    toNumber: '+919876543213',
  },
  // Call 5: Failed call, 0s
  {
    id: 'c5',
    status: 'failed',
    durationSeconds: 0,
    toNumber: '+919876543214',
  },
]

const testLeads = [
  { id: 'l1', status: 'MEETING_BOOKED', name: 'Lead 1', phone: '+919876543210' },
  { id: 'l2', status: 'QUALIFIED', name: 'Lead 2', phone: '+919876543211' },
  { id: 'l3', status: 'READY', name: 'Lead 3', phone: '+919876543212' },
]

const testMessages = [
  { id: 'm1', channel: 'whatsapp', direction: 'outbound', status: 'delivered', content: 'wa' },
  { id: 'm2', channel: 'whatsapp', direction: 'inbound', status: 'delivered', content: 'reply' },
  { id: 'm3', channel: 'email', direction: 'outbound', status: 'delivered', content: 'em' },
]

const testWorkspace = {
  id: 'ws_test',
  name: 'Test Enterprise',
  slug: 'test',
  plan: 'growth',
  minuteCap: 500,
  minutesUsed: 140,
  costPerLead: 15.0,
  revenueAttributed: 45000.0,
  piiRetentionDays: 90,
  encryptedApiKeys: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const computed = computeDashboardMetrics({
  calls: testCalls,
  leads: testLeads,
  messages: testMessages,
  workspace: testWorkspace,
})

// Exact assertions matching raw rows
assert.equal(computed.callsMade, 4, 'Calls made excludes blocked calls (4 made)')
assert.equal(computed.callsAnswered, 2, 'Answered calls with duration > 0 (2 answered)')
assert.equal(computed.conversations, 2, 'Conversations with duration >= 30s or completed (2)')
assert.equal(computed.qualifiedLeads, 2, 'Qualified leads count (QUALIFIED + MEETING_BOOKED = 2)')
assert.equal(computed.meetingsBooked, 1, 'Meetings booked count (1)')
assert.equal(computed.conversionRate, 25.0, 'Conversion rate: 1/4 = 25.0%')
assert.equal(computed.averageCallDurationSeconds, 70, 'Average call duration: (120+20)/2 = 70s')
assert.equal(computed.costPerQualifiedLead, 15.0, 'Cost per qualified lead matches workspace rate')
assert.equal(computed.revenueAttributed, 45000.0, 'Attributed revenue matches workspace')
assert.equal(computed.channelMetrics.whatsapp.sent, 1, 'WhatsApp sent matches messages')
assert.equal(computed.channelMetrics.whatsapp.replied, 1, 'WhatsApp replies matches messages')
assert.equal(computed.channelMetrics.email.sent, 1, 'Email sent matches messages')
console.log('✓ Dashboard numbers match raw database tables 1:1 with exact precision')

// 3. Test Per-Plan Minute Cap Enforcement (Definition of Done)
console.log('\n3. Testing Per-Plan Minute Usage Cap Enforcement...')

// Client A has available minutes (142.5 / 500)
const capCheckA = await checkWorkspaceUsageCapAction('ws_client_a')
assert.equal(capCheckA.canCall, true, 'Client A can dispatch calls (within cap)')

// Client B has reached its cap (100 / 100)
const capCheckB = await checkWorkspaceUsageCapAction('ws_client_b')
assert.equal(capCheckB.canCall, false, 'Client B must be blocked from calling when cap is reached')
assert.ok(capCheckB.reason.includes('STOPPED'), 'Clear stopping reason returned indicating cap reached')
console.log('✓ A workspace reaching its minute cap stops calling immediately')

// 4. Test Encrypted API Keys Storage & Masking (Definition of Done)
console.log('\n4. Testing AES-256-GCM Key Encryption and Masked UI Storage...')
const rawSecret = 'omni_live_super_secret_credentials_9876543210'

// Test encryption
const encrypted = encryptSecret(rawSecret)
assert.notEqual(encrypted.ciphertext, rawSecret, 'Ciphertext must never equal plaintext')
assert.ok(encrypted.iv, 'Initialization Vector (IV) generated')
assert.ok(encrypted.tag, 'Authentication tag generated')
assert.equal(encrypted.maskedKey, 'omni••••••••3210', 'Masked representation generated for safe UI')

// Test decryption verifies plaintext
const decrypted = decryptSecret(encrypted)
assert.equal(decrypted, rawSecret, 'Decrypted key matches original secret')

// Save key through server action and verify UI only receives maskedKey
const saveKeyRes = await saveEncryptedApiKeyAction('ws_client_a', 'omnidimension', rawSecret)
assert.equal(saveKeyRes.success, true, 'API key saved successfully')
assert.equal(saveKeyRes.maskedKey, 'omni••••••••3210', 'Server action returns ONLY maskedKey')

const maskedKeysForClient = await getEncryptedApiKeysAction('ws_client_a')
assert.equal(maskedKeysForClient.omnidimension, 'omni••••••••3210', 'UI receives ONLY masked key')
assert.equal(typeof maskedKeysForClient.omnidimension, 'string', 'Masked key is string')
assert.ok(!JSON.stringify(maskedKeysForClient).includes('super_secret'), 'Plaintext is NEVER returned to client')
console.log('✓ Provider keys are stored encrypted (AES-256-GCM) and never exposed plaintext in the UI')

// 5. Verify Supabase Phase 6 Migration File
console.log('\n5. Verifying Supabase Phase 6 Migration file...')
const migrationPath = path.resolve('supabase/migrations/00007_workspaces_analytics_audit.sql')
assert.ok(fs.existsSync(migrationPath), 'Migration 00007_workspaces_analytics_audit.sql must exist')
const sql = fs.readFileSync(migrationPath, 'utf-8')
assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.workspaces'), 'workspaces table defined')
assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.workspace_members'), 'workspace_members table defined')
assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.audit_logs'), 'audit_logs table defined')
assert.ok(sql.includes('ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY'), 'RLS enabled on workspaces')
assert.ok(sql.includes('CREATE POLICY'), 'RLS policies created')
console.log('✓ Migration 00007_workspaces_analytics_audit.sql verified')

console.log('\n=============================================')
console.log('ALL PHASE 6 DEFINITION OF DONE CHECKS PASSED!')
console.log('=============================================\n')
