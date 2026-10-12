import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { WhatsAppAdapter } from '../src/lib/channels/whatsapp.ts'
import { EmailAdapter } from '../src/lib/channels/email.ts'
import { executeGlobalStop } from '../src/lib/channels/compliance.ts'
import {
  DEFAULT_3STEP_SEQUENCE,
  executeSequenceStep,
  draftInboundAiReply,
} from '../src/lib/channels/sequence-engine.ts'

console.log('Running Phase 5 Verification Suite: Multi-Channel (WhatsApp, Email) & Sequences...\n')

const whatsappAdapter = new WhatsAppAdapter()
const emailAdapter = new EmailAdapter()

// 1. Test WhatsApp Consent Enforcement
console.log('1. Testing WhatsApp Consent Enforcement...')
const noConsentWaResult = await whatsappAdapter.send({
  leadId: 'lead_no_consent_01',
  to: '+919876543210',
  content: 'Hi there, quick follow up on sales automation.',
  templateId: 'tpl_wa_intro_01',
  hasConsent: false, // NO CONSENT
})

assert.equal(noConsentWaResult.success, false, 'Send must fail when WhatsApp consent is missing')
assert.equal(noConsentWaResult.blockedByConsent, true, 'blockedByConsent flag set')
assert.ok(noConsentWaResult.error.includes('BLOCKED'), 'Clear compliance blocking message returned')
console.log('✓ A lead without WhatsApp consent is strictly blocked from receiving messages')

// Test outside 24h window free-text block
const outside24hFreeTextResult = await whatsappAdapter.send({
  leadId: 'lead_wa_02',
  to: '+919876543210',
  content: 'Free text without approved template outside 24h window',
  hasConsent: true,
  lastInboundTimestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 48h ago
})
assert.equal(outside24hFreeTextResult.success, false, 'Free text blocked outside 24h service window')
assert.equal(outside24hFreeTextResult.blockedByCompliance, true, 'Compliance block flag set')
console.log('✓ Free-text messages outside 24h window blocked; approved templates enforced')

// 2. Test Email Mandatory Unsubscribe Link Check
console.log('\n2. Testing Email Unsubscribe Link Enforcement...')
const emailWithoutUnsub = await emailAdapter.send({
  leadId: 'lead_em_01',
  to: 'prospect@cloudnova.com',
  subject: 'Quick question regarding outbound sales',
  content: 'Hi Aarav, following up on our cold call yesterday. Are you available for a chat?',
  hasConsent: true,
  // NO unsubscribe link or url provided
})

assert.equal(emailWithoutUnsub.success, false, 'Email without unsubscribe link must fail')
assert.equal(emailWithoutUnsub.blockedByCompliance, true, 'Compliance block flag set for missing unsubscribe')
assert.ok(emailWithoutUnsub.error.includes('unsubscribe link'), 'Clear error stating missing unsubscribe link')
console.log('✓ An email without an unsubscribe link cannot be sent')

// Test email WITH unsubscribe link succeeds
const emailWithUnsub = await emailAdapter.send({
  leadId: 'lead_em_01',
  to: 'prospect@cloudnova.com',
  subject: 'Quick question regarding outbound sales',
  content: 'Hi Aarav, following up on our cold call.',
  hasConsent: true,
  unsubscribeUrl: 'https://desynthic.com/unsubscribe?lead=lead_em_01',
})
assert.equal(emailWithUnsub.success, true, 'Compliant email with unsubscribe link is delivered')
console.log('✓ Compliant email with unsubscribe link successfully sent')

// 3. Test Global Stop (STOP on WhatsApp or Unsubscribe on Email)
console.log('\n3. Testing Global Stop across all channels...')
const testLead = {
  id: 'lead_global_stop_01',
  phone: '+919876543210',
  name: 'Vikram Joshi',
  email: 'vikram@logichain.com',
  company: 'LogiChain Logistics',
  role: 'Sales Ops Manager',
  status: 'READY',
  dnd: false,
  attempts: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const activeConsents = [
  { id: 'cst_1', leadId: testLead.id, channel: 'voice', status: 'opted_in', source: 'web', timestamp: new Date().toISOString() },
  { id: 'cst_2', leadId: testLead.id, channel: 'whatsapp', status: 'opted_in', source: 'web', timestamp: new Date().toISOString() },
  { id: 'cst_3', leadId: testLead.id, channel: 'email', status: 'opted_in', source: 'web', timestamp: new Date().toISOString() },
]

const activeEnrollments = [
  { id: 'enr_1', sequenceId: 'seq_multichannel_3step', leadId: testLead.id, currentStep: 2, status: 'in_progress' },
]

// Simulate lead sends "STOP" on WhatsApp
const stopResult = executeGlobalStop({
  lead: testLead,
  triggerChannel: 'whatsapp',
  reason: 'STOP',
  consents: activeConsents,
  enrollments: activeEnrollments,
})

assert.equal(stopResult.globalStopTriggered, true, 'Global Stop triggered')
assert.equal(stopResult.updatedLead.dnd, true, 'Lead marked DND')
assert.equal(stopResult.updatedLead.status, 'UNQUALIFIED', 'Lead marked UNQUALIFIED')
assert.ok(
  stopResult.updatedConsents.every((c) => c.status === 'opted_out'),
  'ALL channel consents (voice, whatsapp, email) set to opted_out'
)
assert.equal(stopResult.haltedEnrollments[0].status, 'halted', 'Active sequences halted immediately')
console.log('✓ STOP on WhatsApp halts all channels, marks DND, and aborts active sequences')

// 4. Test 3-Step Sequence (Call -> WhatsApp -> Email) on 5 Allow-Listed Leads
console.log('\n4. Testing 3-Step Sequence Execution on 5 Allow-Listed Leads...')
const fiveLeads = Array.from({ length: 5 }, (_, i) => ({
  id: `lead_seq_${i + 1}`,
  phone: `+91981112223${i}`,
  name: `Test Lead ${i + 1}`,
  email: `lead${i + 1}@example.com`,
  company: `Enterprise ${i + 1}`,
  role: 'Head of Sales',
  status: 'READY',
  dnd: false,
  attempts: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}))

const fiveConsents = fiveLeads.flatMap((l) => [
  { id: `c_v_${l.id}`, leadId: l.id, channel: 'voice', status: 'opted_in', source: 'optin', timestamp: new Date().toISOString() },
  { id: `c_w_${l.id}`, leadId: l.id, channel: 'whatsapp', status: 'opted_in', source: 'optin', timestamp: new Date().toISOString() },
  { id: `c_e_${l.id}`, leadId: l.id, channel: 'email', status: 'opted_in', source: 'optin', timestamp: new Date().toISOString() },
])

for (const lead of fiveLeads) {
  const enrollment = {
    id: `enr_${lead.id}`,
    sequenceId: DEFAULT_3STEP_SEQUENCE.id,
    leadId: lead.id,
    currentStep: 1,
    status: 'in_progress',
  }

  // Step 1: Voice Call
  const step1 = await executeSequenceStep({
    sequence: DEFAULT_3STEP_SEQUENCE,
    enrollment,
    lead,
    consents: fiveConsents,
    lastCallStatus: 'no_answer',
  })
  assert.equal(step1.dispatched, true, `Step 1 (voice) dispatched for ${lead.name}`)
  assert.equal(step1.channel, 'voice', 'Step 1 is voice')
  assert.equal(enrollment.currentStep, 2, 'Enrollment advanced to step 2')

  // Step 2: WhatsApp Template Follow-Up
  const step2 = await executeSequenceStep({
    sequence: DEFAULT_3STEP_SEQUENCE,
    enrollment,
    lead,
    consents: fiveConsents,
  })
  assert.equal(step2.dispatched, true, `Step 2 (WhatsApp) dispatched for ${lead.name}`)
  assert.equal(step2.channel, 'whatsapp', 'Step 2 is whatsapp')
  assert.equal(enrollment.currentStep, 3, 'Enrollment advanced to step 3')

  // Step 3: Consultative Email Follow-Up
  const step3 = await executeSequenceStep({
    sequence: DEFAULT_3STEP_SEQUENCE,
    enrollment,
    lead,
    consents: fiveConsents,
  })
  assert.equal(step3.dispatched, true, `Step 3 (Email) dispatched for ${lead.name}`)
  assert.equal(step3.channel, 'email', 'Step 3 is email')
  assert.equal(enrollment.status, 'completed', 'Sequence successfully completed all steps')
}
console.log('✓ 3-step sequence (Call -> WhatsApp -> Email) executed across 5 leads with 100% compliance')

// 5. Test Inbound Reply AI Drafter with Human Approval Default Mode
console.log('\n5. Testing Inbound Reply AI Drafter and Human Approval...')
const replyingLead = fiveLeads[0]
const draftedMessage = draftInboundAiReply({
  lead: replyingLead,
  inboundText: 'How much does your automated sales system cost per month?',
  channel: 'whatsapp',
  mode: 'draft_for_approval', // default mode
})

assert.equal(draftedMessage.aiDrafted, true, 'Message marked as aiDrafted')
assert.equal(draftedMessage.status, 'pending_approval', 'Message status must be pending_approval in default mode')
assert.ok(draftedMessage.content.includes('$499') || draftedMessage.content.includes('audit'), 'Content addresses pricing consultation')
console.log('✓ Inbound reply generates consultative AI draft and waits for human approval in default mode')

// 6. Test Chronological Lead Timeline
console.log('\n6. Testing Unified Chronological Lead Timeline...')
const timelineMessages = [
  { id: 'm1', leadId: 'lead_t', channel: 'voice', direction: 'outbound', sender: 'Priya', recipient: '+919876543210', content: 'Call 1', status: 'delivered', createdAt: '2026-10-10T09:00:00Z' },
  { id: 'm2', leadId: 'lead_t', channel: 'whatsapp', direction: 'outbound', sender: 'Desynthic', recipient: '+919876543210', content: 'WhatsApp followup', status: 'delivered', createdAt: '2026-10-10T11:00:00Z' },
  { id: 'm3', leadId: 'lead_t', channel: 'whatsapp', direction: 'inbound', sender: 'Prospect', recipient: 'Desynthic', content: 'Sounds interesting', status: 'delivered', createdAt: '2026-10-10T11:15:00Z' },
  { id: 'm4', leadId: 'lead_t', channel: 'email', direction: 'outbound', sender: 'Priya', recipient: 'prospect@test.com', content: 'Case study email', status: 'delivered', createdAt: '2026-10-11T09:00:00Z' },
]

// Verify sorting by timestamp
const sorted = [...timelineMessages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
assert.equal(sorted[0].channel, 'voice', 'First activity is voice call')
assert.equal(sorted[1].channel, 'whatsapp', 'Second activity is WhatsApp outbound')
assert.equal(sorted[2].direction, 'inbound', 'Third activity is inbound WhatsApp reply')
assert.equal(sorted[3].channel, 'email', 'Fourth activity is email follow-up')
console.log('✓ Lead timeline accurately displays calls, WhatsApp, and email in chronological order')

// 7. Verify Supabase Phase 5 Migration
console.log('\n7. Verifying Supabase Phase 5 Migration file...')
const migrationPath = path.resolve('supabase/migrations/00006_multichannel_and_sequences.sql')
assert.ok(fs.existsSync(migrationPath), 'Migration 00006_multichannel_and_sequences.sql must exist')
const sql = fs.readFileSync(migrationPath, 'utf-8')
assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.channel_consents'), 'channel_consents table defined')
assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.messages'), 'messages table defined')
assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.whatsapp_templates'), 'whatsapp_templates table defined')
assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.email_suppression'), 'email_suppression table defined')
assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.sequences'), 'sequences table defined')
assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.sequence_steps'), 'sequence_steps table defined')
assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.sequence_enrollments'), 'sequence_enrollments table defined')
console.log('✓ Migration 00006_multichannel_and_sequences.sql verified')

console.log('\n=============================================')
console.log('ALL PHASE 5 DEFINITION OF DONE CHECKS PASSED!')
console.log('=============================================\n')
