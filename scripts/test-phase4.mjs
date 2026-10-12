import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { cleanPhoneNumber, parseLeadsCSV } from '../src/lib/campaign/lead-importer.ts'
import { checkCallingHours, runSchedulerCycle, recoverStuckLeads } from '../src/lib/campaign/scheduler.ts'
import { bookAppointment, getAvailableSlots } from '../src/lib/campaign/appointment-service.ts'

console.log('Running Phase 4 Verification Suite: Leads, Campaigns & Scheduling...\n')

// 1. Test CSV Lead Import with Phone Cleanup (+91), Deduplication, and DND Detection
console.log('1. Testing CSV Lead Import, Phone Normalization, and DND Detection...')

// Test phone normalizer directly
assert.equal(cleanPhoneNumber('9876543210'), '+919876543210', '10-digit Indian mobile normalizes with +91')
assert.equal(cleanPhoneNumber('09876543210'), '+919876543210', '11-digit leading zero normalizes with +91')
assert.equal(cleanPhoneNumber('+91 98765 43210'), '+919876543210', 'Spaced +91 normalizes cleanly')
assert.equal(cleanPhoneNumber('919876543210'), '+919876543210', '12-digit 91 prefix normalizes with +91')
assert.equal(cleanPhoneNumber('12345'), null, 'Invalid phone number rejected')
console.log('✓ Phone normalizer handles all Indian mobile formats and rejects invalid numbers')

const testCsv = `name,company,role,phone,dnd
Aarav Sharma,CloudNova,Head of Sales,9876543210,false
Aarav Duplicate,CloudNova,Head of Sales,09876543210,false
Neha Gupta,GrowthBridge,VP Ops,+91 99999 99999,false
Rajesh Malhotra,DoNotCall Corp,Director,9711100001,true
Invalid Person,BadCo,Manager,12345,false`

const importResult = parseLeadsCSV(testCsv)
assert.equal(importResult.importedCount, 3, 'Imported valid non-duplicate leads count')
assert.equal(importResult.duplicatesSkipped, 1, 'Duplicate phone number correctly detected and skipped')
assert.equal(importResult.dndCount, 1, 'DND flagged lead correctly detected')
assert.equal(importResult.invalidPhoneCount, 1, 'Invalid phone rejected')

const dndLead = importResult.leads.find((l) => l.name === 'Rajesh Malhotra')
assert.ok(dndLead, 'DND lead found in imported list')
assert.equal(dndLead.dnd, true, 'DND flag set to true')
assert.equal(dndLead.status, 'UNQUALIFIED', 'DND lead marked UNQUALIFIED')
console.log('✓ CSV parser cleanly handles deduplication, DND detection, and phone formatting')

// 2. Test Calling Hours and Sunday Shutdown (IST)
console.log('\n2. Testing IST Calling Hours and Sunday Shutdown Rules...')

// Sunday simulation: 2026-10-11 is Sunday (12:00 PM IST / 06:30 UTC)
const sundayTest = new Date('2026-10-11T06:30:00Z')
const sundayCheck = checkCallingHours(sundayTest, '10:00', '18:00')
assert.equal(sundayCheck.allowed, false, 'Calls on Sunday must be blocked')
assert.equal(sundayCheck.dayOfWeek, 'Sunday', 'Day detected as Sunday')
console.log('✓ Sunday shutdown verified: all outbound calls blocked on Sunday')

// Outside hours simulation: Monday at 08:00 AM IST (02:30 UTC) -> Before 10:00 AM IST
const earlyMorning = new Date('2026-10-12T02:30:00Z')
const earlyCheck = checkCallingHours(earlyMorning, '10:00', '18:00')
assert.equal(earlyCheck.allowed, false, 'Calls before 10:00 AM IST must be blocked')

// Outside hours simulation: Monday at 19:00 IST (13:30 UTC) -> After 18:00 IST
const lateEvening = new Date('2026-10-12T13:30:00Z')
const lateCheck = checkCallingHours(lateEvening, '10:00', '18:00')
assert.equal(lateCheck.allowed, false, 'Calls after 18:00 IST must be blocked')

// Inside calling window: Monday at 14:00 IST (08:30 UTC)
const validTime = new Date('2026-10-12T08:30:00Z')
const validCheck = checkCallingHours(validTime, '10:00', '18:00')
assert.equal(validCheck.allowed, true, 'Calls during 10:00-18:00 IST on Monday permitted')
console.log('✓ Calling hours verified: 10:00-18:00 IST window strictly enforced')

// 3. Test 20-Lead Campaign Run with Caps and DND Guard
console.log('\n3. Testing 20-Lead Campaign Run and Daily Cap Enforcement...')

// Create 20 test leads (including 2 DND leads)
const testLeads = Array.from({ length: 20 }, (_, i) => ({
  id: `lead_t_${i + 1}`,
  phone: `+9198000000${String(i).padStart(2, '0')}`,
  name: `Prospect ${i + 1}`,
  company: `Company ${i + 1}`,
  role: 'Decision Maker',
  status: i >= 18 ? 'UNQUALIFIED' : 'READY',
  dnd: i >= 18, // Leads 19 and 20 are DND
  attempts: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}))

const testCampaign = {
  id: 'camp_test_20',
  name: 'Test 20-Lead Campaign',
  agentName: 'Priya',
  status: 'running',
  callWindowStart: '10:00',
  callWindowEnd: '18:00',
  timezone: 'Asia/Kolkata',
  maxAttempts: 3,
  retryGapHours: 4,
  dailyCap: 10, // Cap set to 10 to test cap enforcement on 20 leads
  callsToday: 0,
  leadIds: testLeads.map((l) => l.id),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

// Run scheduler cycle during valid calling window
const cycle1 = runSchedulerCycle({
  campaign: testCampaign,
  leads: testLeads,
  currentTime: validTime,
})

assert.equal(cycle1.result.callsDispatched, 10, 'Dispatches exactly up to daily cap (10 calls)')
assert.equal(cycle1.updatedCampaign.callsToday, 10, 'Campaign callsToday incremented to 10')
assert.ok(cycle1.result.skippedReasons.dailyCapReached >= 1, 'Remaining leads skipped due to daily cap')
console.log('✓ 20-lead campaign respected daily cap: exactly 10 calls dispatched, excess leads deferred')

// Verify DND leads were NEVER dispatched
const dnd1 = cycle1.updatedLeads.find((l) => l.id === 'lead_t_19')
const dnd2 = cycle1.updatedLeads.find((l) => l.id === 'lead_t_20')
assert.equal(dnd1.attempts, 0, 'DND lead 19 must have 0 attempts')
assert.equal(dnd2.attempts, 0, 'DND lead 20 must have 0 attempts')
console.log('✓ DND leads were strictly protected and never called')

// 4. Test Pausing Campaign Halts Calls Within One Cycle
console.log('\n4. Testing Pausing Campaign Halts Calls within One Cycle...')
const pausedCampaign = {
  ...testCampaign,
  status: 'paused',
  callsToday: 0,
}

const pauseCycle = runSchedulerCycle({
  campaign: pausedCampaign,
  leads: testLeads,
  currentTime: validTime,
})

assert.equal(pauseCycle.result.callsDispatched, 0, 'Zero calls dispatched when campaign is paused')
assert.equal(pauseCycle.result.skippedReasons.campaignPaused, testLeads.length, 'All leads skipped with campaignPaused reason')
console.log('✓ Pausing campaign halts all calls immediately within one scheduler cycle')

// 5. Test Stuck Lead Recovery
console.log('\n5. Testing Stuck Lead Recovery...')
const stuckLead = {
  id: 'lead_stuck',
  phone: '+919911223344',
  name: 'Stuck Lead',
  status: 'CALLED',
  dnd: false,
  attempts: 1,
  lastCalledAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(), // 20 mins ago
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}
const recoveredCount = recoverStuckLeads([stuckLead], 10)
assert.equal(recoveredCount, 1, 'Stuck lead successfully recovered')
assert.equal(stuckLead.status, 'READY', 'Lead reset back to READY for next cycle')
console.log('✓ Stuck leads timed-out in CALLED state are safely restored to READY')

// 6. Test Appointment Booking and n8n Webhook Notification
console.log('\n6. Testing Appointment Booking and n8n Webhook Flow...')
const slots = getAvailableSlots(validTime)
assert.ok(slots.length >= 2, 'Available meeting slots returned for business days')

const qualifyingLead = testLeads[0]
const bookingResult = await bookAppointment(qualifyingLead, {
  leadId: qualifyingLead.id,
  campaignId: testCampaign.id,
  scheduledAt: slots[0].datetime,
  durationMinutes: 30,
  notes: 'High-intent lead requested 20-min AI outbound discovery audit.',
})

assert.equal(bookingResult.success, true, 'Appointment booking succeeded')
assert.ok(bookingResult.appointment, 'Appointment object generated')
assert.equal(bookingResult.appointment.status, 'confirmed', 'Appointment status is confirmed')
assert.ok(bookingResult.appointment.meetingLink.includes('meet.google.com'), 'Google Meet link generated')
assert.equal(bookingResult.n8nDispatched, true, 'n8n WhatsApp reminder webhook triggered')
console.log('✓ Booked meeting generated Google Calendar appointment and fired n8n webhook')

// 7. Verify Supabase Phase 4 Migration file
console.log('\n7. Verifying Supabase Phase 4 Migration file...')
const migrationPath = path.resolve('supabase/migrations/00005_leads_campaigns_scheduling.sql')
assert.ok(fs.existsSync(migrationPath), 'Migration 00005_leads_campaigns_scheduling.sql must exist')
const sql = fs.readFileSync(migrationPath, 'utf-8')
assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.leads'), 'leads table defined')
assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.campaigns'), 'campaigns table defined')
assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.campaign_leads'), 'campaign_leads table defined')
assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.appointments'), 'appointments table defined')
assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.scheduler_logs'), 'scheduler_logs table defined')
console.log('✓ Migration 00005_leads_campaigns_scheduling.sql verified')

console.log('\n=============================================')
console.log('ALL PHASE 4 DEFINITION OF DONE CHECKS PASSED!')
console.log('=============================================\n')
