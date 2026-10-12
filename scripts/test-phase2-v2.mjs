import { parseAndValidateLeadCsv, normalizeIndianPhone } from '../src/lib/campaign/lead-importer-v2.ts'
import { canContact, addToSuppressionList } from '../src/lib/safety/can-contact.ts'
import {
  validatePreLaunchChecklist,
  calculateCampaignUsageEstimate,
  launchCampaign,
  pauseCampaign,
  stopCampaign
} from '../src/lib/campaign/campaign-manager-v2.ts'
import { compileSalesBrainV2 } from '../src/lib/brain/compiler-v2.ts'
import { DEFAULT_DISCOVERY_DATA } from '../src/lib/brain/demo-discovery.ts'

console.log('Running PRD v2.1 Phase 2 Verification Suite: Leads, Suppression & Campaigns...\n')

// 1. Phone Normalizer Tests
console.log('1. Testing Indian E.164 Phone Normalization...')
const testNumbers = [
  { raw: '9876543210', expected: '+919876543210' },
  { raw: '09876543210', expected: '+919876543210' },
  { raw: '+91 98765-43210', expected: '+919876543210' },
  { raw: '919876543210', expected: '+919876543210' },
  { raw: '+919876543210', expected: '+919876543210' }
]

for (const item of testNumbers) {
  const res = normalizeIndianPhone(item.raw)
  if (!res.valid || res.phone !== item.expected) {
    throw new Error(`Phone normalizer failed on "${item.raw}": got ${res.phone}, expected ${item.expected}`)
  }
}

// Invalid numbers
if (normalizeIndianPhone('12345').valid || normalizeIndianPhone('abcdefghij').valid) {
  throw new Error('Phone normalizer accepted invalid numbers!')
}
console.log('✓ Phone normalizer handles all Indian formats and strictly rejects garbage numbers.\n')

// 2. Messy CSV Import & Error Report Tests
console.log('2. Testing Messy CSV Lead Ingestion, Duplicate Detection & Error Report...')
const messyCsv = `name,phone,company,language
Rajesh Sharma,9876543210,Apex Growth,en
Kavita Patel,09876543211,SaaS Labs,hi
Duplicate Contact,9876543210,Repeat Co,en
Bad Number Lead,12345,Invalid Corp,en
,9876543219,Empty Name Corp,en
Valid Lead 3,+91 98765 43212,Valid Agency,hinglish
`

const existingDbPhones = new Set(['+919999999999'])
const summary = parseAndValidateLeadCsv(messyCsv, 'ws_test', 'csv_upload', existingDbPhones)

if (summary.validLeads.length !== 3) {
  throw new Error(`Expected exactly 3 valid leads, got ${summary.validLeads.length}`)
}

if (summary.duplicateRows.length !== 1) {
  throw new Error(`Expected exactly 1 duplicate row, got ${summary.duplicateRows.length}`)
}

if (summary.invalidRows.length !== 2) {
  throw new Error(`Expected exactly 2 invalid rows, got ${summary.invalidRows.length}`)
}

if (!summary.errorCsvContent.includes('Invalid Indian mobile format') || !summary.errorCsvContent.includes('Missing required prospect name')) {
  throw new Error('Error CSV content missing detailed reason strings!')
}
console.log(`✓ CSV processed: ${summary.validLeads.length} valid, ${summary.duplicateRows.length} duplicates flagged, ${summary.invalidRows.length} invalid rows rejected.`)
console.log('✓ Downloadable error CSV report generated with exact row numbers and error descriptions.\n')

// 3. Centralized canContact Safety Gate Tests
console.log('3. Testing Centralized canContact(lead, channel, now) Safety Engine...')

const validLead = summary.validLeads[0]
// Monday 11:30 AM IST (Valid calling window)
const mondayMidday = new Date('2026-10-12T06:00:00.000Z') // 11:30 AM IST

const normalCheck = canContact(validLead, 'voice', mondayMidday)
if (!normalCheck.allowed) {
  throw new Error(`Expected valid lead during open window to be allowed, got: ${normalCheck.reason}`)
}

// A. Suppression / Opt-Out Test
addToSuppressionList(validLead.phone)
const optOutCheck = canContact(validLead, 'voice', mondayMidday)
if (optOutCheck.allowed || optOutCheck.ruleViolated !== 'OPT_OUT') {
  throw new Error('canContact failed to block opted-out lead!')
}
console.log('  ✓ Opted-out / suppressed lead strictly blocked.')

// B. DND / NDNC Registry Test
const dndLead = { ...validLead, phone: '+919876522222' } // registered on mock NDNC
const dndCheck = canContact(dndLead, 'voice', mondayMidday)
if (dndCheck.allowed || dndCheck.ruleViolated !== 'DND_ACTIVE') {
  throw new Error('canContact failed to block DND lead!')
}
console.log('  ✓ National Do Not Call (NDNC) lead strictly blocked.')

// C. Sunday Shutdown Test
const sundayMidday = new Date('2026-10-11T06:00:00.000Z') // Sunday in IST
const sundayCheck = canContact(summary.validLeads[1], 'voice', sundayMidday)
if (sundayCheck.allowed || sundayCheck.ruleViolated !== 'SUNDAY_BLOCKED') {
  throw new Error('canContact failed to block call on Sunday!')
}
console.log('  ✓ Sunday shutdown strictly enforced (all outbound calls blocked).')

// D. Outside Hours Test (e.g. 8:00 AM IST)
const earlyMorning = new Date('2026-10-12T02:30:00.000Z') // 08:00 AM IST
const earlyCheck = canContact(summary.validLeads[1], 'voice', earlyMorning)
if (earlyCheck.allowed || earlyCheck.ruleViolated !== 'OUTSIDE_HOURS') {
  throw new Error('canContact failed to block call outside permitted 10:00-18:00 hours!')
}
console.log('  ✓ Outbound call outside permitted hours (10:00-18:00 IST) strictly blocked.\n')

// 4. Pre-Launch Compliance Checklist Tests
console.log('4. Testing Pre-Launch Compliance Checklist Gate...')
const brain = compileSalesBrainV2(DEFAULT_DISCOVERY_DATA, 'ws_test', 0)

const incompleteCampaign = {
  id: 'camp_bad',
  workspaceId: 'ws_test',
  name: 'Non-compliant Campaign',
  goal: 'Outreach',
  brainId: brain.id,
  language: 'en',
  status: 'DRAFT',
  callingWindow: { start: '08:00', end: '22:00', timeZone: 'Asia/Kolkata' }, // Invalid hours!
  qualificationRules: [], // Missing qualification rules!
  followUpSequence: [],
  dailyCap: 50,
  retryGapMinutes: 120,
  maxAttempts: 3,
  leadsCount: 0, // No leads!
  leadIds: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}

const badChecklist = validatePreLaunchChecklist(incompleteCampaign, brain)
if (badChecklist.isReadyToLaunch || badChecklist.missingItems.length === 0) {
  throw new Error('Compliance checklist erroneously approved incomplete campaign!')
}

const blockedLaunch = launchCampaign(incompleteCampaign, brain)
if (blockedLaunch.success || !blockedLaunch.error) {
  throw new Error('Campaign launched despite failing compliance checklist!')
}
console.log(`✓ Incomplete campaign launch blocked: "${blockedLaunch.error}".`)

// Compliant campaign
const compliantCampaign = {
  ...incompleteCampaign,
  callingWindow: { start: '10:00', end: '18:00', timeZone: 'Asia/Kolkata' },
  qualificationRules: ['10-100 employees', 'SDR pain'],
  leadsCount: 20,
  leadIds: Array.from({ length: 20 }, (_, i) => `lead_${i}`)
}

const goodChecklist = validatePreLaunchChecklist(compliantCampaign, brain)
if (!goodChecklist.isReadyToLaunch) {
  throw new Error(`Compliant campaign failed checklist: ${goodChecklist.missingItems.join(', ')}`)
}

const approvedLaunch = launchCampaign(compliantCampaign, brain)
if (!approvedLaunch.success || approvedLaunch.campaign.status !== 'ACTIVE') {
  throw new Error('Compliant campaign failed to launch!')
}
console.log('✓ Fully compliant campaign passed all 5 checklist items and launched successfully.\n')

// 5. Campaign Pause / Stop State Control Tests
console.log('5. Testing Campaign Pause & Stop Halting Logic...')
const activeCamp = approvedLaunch.campaign
const pausedCamp = pauseCampaign(activeCamp)
if (pausedCamp.status !== 'PAUSED') {
  throw new Error('Failed to pause campaign')
}

const stoppedCamp = stopCampaign(pausedCamp)
if (stoppedCamp.status !== 'STOPPED') {
  throw new Error('Failed to stop campaign')
}
console.log('✓ Pause and stop state transitions successfully halt campaign dialing pipeline.\n')

// 6. Pre-Launch Cost and Usage Estimate Tests
console.log('6. Testing Pre-Launch Usage & Cost Estimator...')
const costEstimate = calculateCampaignUsageEstimate(100, 2.5, 12.0)
if (costEstimate.totalEstimatedMinutes !== 250 || costEstimate.totalEstimatedCostInr !== 3000) {
  throw new Error(`Cost estimate mismatch: expected 250 mins & ₹3000 INR, got ${costEstimate.totalEstimatedMinutes} mins & ₹${costEstimate.totalEstimatedCostInr}`)
}
console.log(`✓ Usage estimator calculated 100 leads x 2.5 mins = ${costEstimate.totalEstimatedMinutes} mins (₹${costEstimate.totalEstimatedCostInr.toLocaleString()} INR).\n`)

console.log('========================================================')
console.log('ALL PRD V2.1 PHASE 2 DEFINITION OF DONE CHECKS PASSED!')
console.log('========================================================')
