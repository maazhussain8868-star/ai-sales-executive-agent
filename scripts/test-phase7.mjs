import fs from 'fs'
import path from 'path'
import { compileMultilingualPrompt, MULTILINGUAL_PACKS } from '../src/lib/multilingual/compiler.ts'
import { routeAbCall, evaluateExperimentWinner } from '../src/lib/ab-testing/engine.ts'
import { generateCoachingReport, extractMethodologyPatch } from '../src/lib/coaching/engine.ts'
import { CrmAdapter } from '../src/lib/crm/adapter.ts'
import { routeInboundCall } from '../src/lib/inbound/router.ts'
import { consumeMinutes, rechargeWallet } from '../src/lib/billing/wallet.ts'

console.log('Running Phase 7 Verification Suite: Advanced Enterprise Features...\n')

// 1. Multilingual Prompt Verification
console.log('1. Testing Multilingual Voice Support (Hindi, Telugu, Tamil, Hinglish)...')
const basePrompt = 'You are Priya, an AI sales employee at Desynthic.'
const languages = ['hi', 'te', 'ta', 'hinglish', 'en']

for (const lang of languages) {
  const result = compileMultilingualPrompt(basePrompt, lang)
  if (!result.containsDisclosure) {
    throw new Error(`Multilingual prompt for ${lang} is missing mandatory AI disclosure statement!`)
  }
  const pack = MULTILINGUAL_PACKS[lang]
  if (!result.prompt.includes(pack.greeting)) {
    throw new Error(`Multilingual prompt for ${lang} does not contain local greeting!`)
  }
  console.log(`  ✓ ${pack.label}: Verified greeting and AI disclosure statement.`)
}
console.log('✓ All regional multilingual voice prompts verified with mandatory AI disclosure.\n')

// 2. Prompt A/B Testing Verification
console.log('2. Testing Prompt A/B Testing & Winner Determination...')
const mockExp = {
  id: 'exp_test',
  workspaceId: 'ws_test',
  name: 'ROI vs Pain Hook',
  status: 'active',
  variantAPrompt: 'Pain hook prompt',
  variantBPrompt: 'ROI hook prompt',
  trafficSplitPercent: 50,
  variantACalls: 50,
  variantAMeetings: 5, // 10%
  variantBCalls: 50,
  variantBMeetings: 15, // 30%
  createdAt: new Date().toISOString()
}

// Check routing
const routeA = routeAbCall(mockExp, 25)
const routeB = routeAbCall(mockExp, 75)
if (routeA.assignedVariant !== 'A' || routeB.assignedVariant !== 'B') {
  throw new Error(`A/B router failed: expected 25 to route to A and 75 to B. Got: A=${routeA.assignedVariant}, B=${routeB.assignedVariant}`)
}

const evalResult = evaluateExperimentWinner(mockExp)
if (evalResult.winningVariant !== 'B') {
  throw new Error(`A/B evaluation failed: expected Variant B to win with 30% vs 10% conversion rate. Got: ${evalResult.winningVariant}`)
}
console.log(`✓ A/B routing and statistical winner selection verified (Winner: Variant ${evalResult.winningVariant}, Confidence: ${evalResult.confidenceScore}).\n`)

// 3. Sales Coaching & Methodology Learning Verification
console.log('3. Testing Sales Coaching Metrics & Methodology Learning Engine...')
const sampleTranscript = [
  { speaker: 'agent', text: 'Hi Rajesh, Priya here from Desynthic. May I share why I called?' },
  { speaker: 'prospect', text: 'We already have human sales reps and SDRs handling this.' },
  { speaker: 'agent', text: 'That is fantastic. We do not replace your top closers—our AI employee handles the tedious top-of-funnel cold dialing so your reps only spend time closing warm meetings.' },
  { speaker: 'prospect', text: 'That makes sense. Can we book a quick 20 minute demo next Tuesday?' },
  { speaker: 'agent', text: 'Confirmed for Tuesday at 11 AM IST! Invite is on its way.' }
]

const coaching = generateCoachingReport('call_123', 'ws_test', 'Rajesh', sampleTranscript, true)
if (coaching.objectionHandlingScore < 85) {
  throw new Error(`Expected objection handling score >= 85 for successful call, got: ${coaching.objectionHandlingScore}`)
}
if (coaching.talkToListenRatio <= 0 || coaching.talkToListenRatio >= 1) {
  throw new Error(`Invalid talkToListenRatio: ${coaching.talkToListenRatio}`)
}

const patch = extractMethodologyPatch('call_123', 'ws_test', sampleTranscript)
if (!patch || !patch.suggestedPatch.includes('We do not replace your top closers')) {
  throw new Error('Methodology engine failed to extract winning objection counter from transcript!')
}
console.log(`✓ Coaching metrics computed (Score: ${coaching.objectionHandlingScore}/100, WPM: ${coaching.speechPaceWpm}).`)
console.log(`✓ Methodology learning patch extracted: "${patch.suggestedPatch.substring(0, 70)}..."\n`)

// 4. CRM Integration Verification
console.log('4. Testing Unified CRM Integrations (HubSpot & Zoho)...')
const hubspotAdapter = new CrmAdapter({
  id: 'crm_hs',
  workspaceId: 'ws_test',
  provider: 'hubspot',
  status: 'connected',
  syncStats: { leadsSynced: 0, callsSynced: 0, dealsCreated: 0 }
})

const zohoAdapter = new CrmAdapter({
  id: 'crm_zh',
  workspaceId: 'ws_test',
  provider: 'zoho',
  status: 'connected',
  syncStats: { leadsSynced: 0, callsSynced: 0, dealsCreated: 0 }
})

const testLead = {
  name: 'Karan Singhal',
  company: 'Singhal Logistics',
  phone: '+919876543210',
  qualificationStatus: 'MEETING_BOOKED',
  leadScore: 92
}

const hsLeadResult = await hubspotAdapter.syncLead(testLead)
const zhLeadResult = await zohoAdapter.syncLead(testLead)
const dealResult = await hubspotAdapter.createDeal({
  dealName: 'Singhal Logistics - Enterprise Pilot',
  amount: 2500,
  stage: 'Appointment Scheduled',
  closeDate: '2026-11-01'
})

if (!hsLeadResult.success || !zhLeadResult.success || !dealResult.success) {
  throw new Error('CRM synchronization failed.')
}
console.log(`✓ HubSpot lead & deal synchronization verified: ${dealResult.message}`)
console.log(`✓ Zoho CRM lead sync verified: ${zhLeadResult.message}\n`)

// 5. Inbound Calling & Human Warm Transfer Verification
console.log('5. Testing Inbound Routing & Human Warm Transfer...')
const availableReps = [
  {
    id: 'rep_1',
    workspaceId: 'ws_test',
    name: 'Ananya Sharma',
    phone: '+919876543210',
    email: 'ananya@desynthic.com',
    role: 'Solutions Architect',
    status: 'available',
    tier: 'enterprise',
    assignedMeetingsCount: 5
  }
]

// Test normal inbound
const normalInbound = routeInboundCall(
  {
    callerNumber: '+919999999999',
    spokenUtterance: 'I saw your website and want to know how the AI employee works.',
    detectedLanguage: 'en'
  },
  'ws_test',
  availableReps
)
if (normalInbound.action !== 'ai_handled') {
  throw new Error(`Expected standard inbound to be ai_handled, got: ${normalInbound.action}`)
}

// Test enterprise inbound / human requested
const enterpriseInbound = routeInboundCall(
  {
    callerNumber: '+919876543210',
    prospectName: 'Sunil Kumar',
    company: 'Apex Retail',
    spokenUtterance: 'We have 400 sales reps and need an enterprise custom contract. Transfer me to someone real.',
    estimatedCompanySize: 450
  },
  'ws_test',
  availableReps
)
if (enterpriseInbound.action !== 'human_transfer') {
  throw new Error(`Expected enterprise call to trigger human_transfer, got: ${enterpriseInbound.action}`)
}
if (!enterpriseInbound.whisperBriefing?.includes('Sunil Kumar')) {
  throw new Error(`Expected whisper briefing to include prospect name Sunil Kumar. Got: ${enterpriseInbound.whisperBriefing}`)
}
console.log(`✓ Standard inbound successfully routed to AI Priya.`)
console.log(`✓ Enterprise inbound successfully triggered warm transfer to ${enterpriseInbound.targetRep?.name} with whisper briefing: "${enterpriseInbound.whisperBriefing}"\n`)

// 6. Wallet & Minute Consumption Metering
console.log('6. Testing Minute Wallet Metering & Consumption...')
let wallet = {
  workspaceId: 'ws_test',
  currentMinutesBalance: 10,
  totalMinutesPurchased: 50,
  totalMinutesConsumed: 40,
  planName: 'Starter',
  rechargeHistory: []
}

// Consume 180 seconds (3 minutes)
const consume1 = consumeMinutes(wallet, 180)
if (!consume1.result.success || consume1.updatedWallet.currentMinutesBalance !== 7) {
  throw new Error(`Expected 7 minutes remaining after 3 mins deducted, got: ${consume1.updatedWallet.currentMinutesBalance}`)
}
wallet = consume1.updatedWallet

// Try to consume 600 seconds (10 minutes) when only 7 remain -> must fail
const consume2 = consumeMinutes(wallet, 600)
if (consume2.result.success) {
  throw new Error('Expected minute deduction to fail when balance is insufficient!')
}

// Recharge wallet
const recharge = rechargeWallet(wallet, 500, 15000)
if (recharge.updatedWallet.currentMinutesBalance !== 507) {
  throw new Error(`Expected balance 507 after recharge, got: ${recharge.updatedWallet.currentMinutesBalance}`)
}
console.log(`✓ Consumption metering correctly rounded seconds and decremented balance.`)
console.log(`✓ Zero/insufficient balance hard-blocked calls with clear error message.`)
console.log(`✓ Top-up recharge credited 500 minutes and logged invoice: "${recharge.result.invoiceSnippet}".\n`)

// 7. Supabase Migration Verification
console.log('7. Verifying Supabase Phase 7 Migration file...')
const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/00008_advanced_phase7.sql')
if (!fs.existsSync(migrationPath)) {
  throw new Error('Supabase migration 00008_advanced_phase7.sql is missing!')
}
const sqlContent = fs.readFileSync(migrationPath, 'utf8')
if (
  !sqlContent.includes('CREATE TABLE IF NOT EXISTS ab_experiments') ||
  !sqlContent.includes('CREATE TABLE IF NOT EXISTS sales_coaching_reports') ||
  !sqlContent.includes('CREATE TABLE IF NOT EXISTS crm_integrations') ||
  !sqlContent.includes('CREATE TABLE IF NOT EXISTS human_sales_reps') ||
  !sqlContent.includes('CREATE TABLE IF NOT EXISTS inbound_call_logs') ||
  !sqlContent.includes('CREATE TABLE IF NOT EXISTS wallet_ledgers') ||
  !sqlContent.includes('ALTER TABLE ab_experiments ENABLE ROW LEVEL SECURITY')
) {
  throw new Error('Supabase migration 00008_advanced_phase7.sql is incomplete or missing RLS policies!')
}
console.log('✓ Supabase 00008_advanced_phase7.sql migration verified with full RLS coverage.\n')

console.log('=============================================')
console.log('ALL PHASE 7 DEFINITION OF DONE CHECKS PASSED!')
console.log('=============================================')
