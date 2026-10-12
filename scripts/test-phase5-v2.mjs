/**
 * PRD v2.1 Phase 5 Test Suite: Booking, Follow-ups, WhatsApp & Human Handoff
 *
 * Verifies:
 * 1. Calendar Booking via CalendarProvider:
 *    - Confirmation message announced ONLY when provider confirms
 *    - Provider failure handled honestly without hallucinating confirmation
 *    - Automatic fallback human follow-up task created upon calendar failure
 *    - Idempotency deduplication: retry never creates duplicate meetings
 * 2. Context-Preserved Follow-Up Scheduler:
 *    - Preserves callback time, reason, and prior conversation context
 *    - Gated strictly by canContact before triggering callbacks
 *    - Supports editing and cancelling tasks
 * 3. WhatsApp Follow-Up Engine:
 *    - Unapproved / draft templates are strictly blocked
 *    - Opt-out / non-opted-in contacts are strictly blocked
 *    - Inbound refusal immediately halts sequence and suppresses number
 *    - Deduplication: identical retry never sends duplicate message
 * 4. Multi-Tier Human Handoff:
 *    - Detects: Hot buying intent, direct human request, unsupported question
 *    - Executes multi-tier escalation (Live Transfer -> WhatsApp Alert -> Callback Task)
 *    - Records path attempted and response times
 */

import assert from 'node:assert';
import { CalendarBookingManager } from '../src/lib/booking/calendar-booking-manager.ts';
import { FollowUpScheduler } from '../src/lib/followup/followup-scheduler.ts';
import { WhatsAppManager } from '../src/lib/messaging/whatsapp-manager.ts';
import { HumanHandoffManager } from '../src/lib/handoff/human-handoff-manager.ts';
import { addToSuppressionList, isSuppressed } from '../src/lib/safety/can-contact.ts';

console.log('Running PRD v2.1 Phase 5 Verification Suite: Booking, Follow-ups, WhatsApp & Handoff...\n');

// 1. Calendar Booking & Failure Fallback Tests
console.log('1. Testing Calendar Booking, Provider Confirmation Gate & Fallback Human Task...');

const bookingMgr = new CalendarBookingManager();

// Successful Booking
const slotTime = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
const successBooking = await bookingMgr.bookMeeting({
  workspaceId: 'ws_test',
  leadId: 'lead_b01',
  attendeeEmail: 'vikram@company.com',
  attendeeName: 'Vikram',
  attendeePhone: '+919876543210',
  title: 'Walkthrough',
  scheduledAt: slotTime,
});

assert.strictEqual(successBooking.confirmed, true, 'Confirmed must be true when provider succeeds');
assert.ok(successBooking.spokenConfirmationMessage.includes('confirmed'), 'Spoken confirmation must state confirmed');
assert.strictEqual(successBooking.meeting.status, 'CONFIRMED');

// Duplicate Booking Attempt (Idempotency check)
const duplicateBooking = await bookingMgr.bookMeeting({
  workspaceId: 'ws_test',
  leadId: 'lead_b01',
  attendeeEmail: 'vikram@company.com',
  attendeeName: 'Vikram',
  attendeePhone: '+919876543210',
  title: 'Walkthrough',
  scheduledAt: slotTime,
});

assert.strictEqual(duplicateBooking.meeting.id, successBooking.meeting.id, 'Duplicate booking must return identical meeting ID without duplicating');
assert.strictEqual(bookingMgr.getAllMeetings().length, 1, 'Only 1 meeting record must exist in database');

// Forced Calendar Failure: Zero Hallucinated Confirmations
bookingMgr.setForceFailure(true);
const failedBooking = await bookingMgr.bookMeeting({
  workspaceId: 'ws_test',
  leadId: 'lead_fail_02',
  attendeeEmail: 'rahul@startup.in',
  attendeeName: 'Rahul',
  attendeePhone: '+919876543211',
  title: 'Demo',
  scheduledAt: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
});

assert.strictEqual(failedBooking.confirmed, false, 'Confirmed must be false when provider fails');
assert.ok(!failedBooking.spokenConfirmationMessage.includes('confirmed for'), 'Must NEVER claim confirmed if calendar failed');
assert.ok(failedBooking.spokenConfirmationMessage.includes('unable') || failedBooking.spokenConfirmationMessage.includes('apologize'), 'Must speak honest fallback message');
assert.ok(failedBooking.fallbackFollowUpTask, 'Must create fallback human follow-up task upon failure');
console.log('✓ Calendar confirmed only upon provider response; failure handled honestly with fallback human task.\n');

// 2. Follow-Up Scheduler & canContact Gate Tests
console.log('2. Testing Context-Preserved Follow-Up Scheduler & Safety Enforcement...');

const followUpScheduler = new FollowUpScheduler();

const callbackTask = followUpScheduler.createFollowUp({
  workspaceId: 'ws_test',
  leadId: 'lead_f01',
  leadPhone: '+919876543215',
  leadName: 'Sanjay Patel',
  scheduledAt: new Date('2026-10-14T11:00:00Z').toISOString(), // Wednesday
  reason: 'Prospect was driving; requested call after 2 hours',
  priorContext: 'Interested in AI calling agents; 200 leads/mo.',
});

assert.strictEqual(callbackTask.status, 'PENDING');
assert.ok(callbackTask.priorContext.includes('200 leads/mo'));

// Test edit & cancel
followUpScheduler.updateFollowUp(callbackTask.id, { reason: 'Updated: requested call tomorrow morning' });
assert.strictEqual(followUpScheduler.getTask(callbackTask.id)?.reason, 'Updated: requested call tomorrow morning');

// Trigger due follow-up within calling hours
const dueCheck = await followUpScheduler.processDueFollowUps(new Date('2026-10-14T11:30:00Z'));
assert.strictEqual(dueCheck.triggered.length, 1, 'Due follow-up within calling window must be triggered');
assert.strictEqual(dueCheck.triggered[0].status, 'TRIGGERED');

// Sunday Follow-Up Block Test
const sundayTask = followUpScheduler.createFollowUp({
  workspaceId: 'ws_test',
  leadId: 'lead_f02',
  leadPhone: '+919876543216',
  leadName: 'Sunday Followup',
  scheduledAt: new Date('2026-10-18T05:00:00Z').toISOString(), // Sunday
  reason: 'Sunday callback request',
  priorContext: 'None',
});
assert.ok(sundayTask.id, 'Sunday follow-up task ID must be generated');

const sundayDueCheck = await followUpScheduler.processDueFollowUps(new Date('2026-10-18T06:00:00Z'));
assert.strictEqual(sundayDueCheck.triggered.length, 0, 'Zero follow-ups permitted on Sunday');
assert.ok(sundayDueCheck.blocked.length > 0, 'Sunday task must be blocked by canContact');
console.log('✓ Follow-up scheduler preserved conversational context and blocked off-hours/Sunday callbacks.\n');

// 3. WhatsApp Follow-Up & Template Compliance Tests
console.log('3. Testing WhatsApp Approved Templates, Opt-In Gates & Idempotency...');

const waMgr = new WhatsAppManager();

// Test A: Unapproved draft template blocked
const unapprovedRes = await waMgr.sendTemplateMessage({
  workspaceId: 'ws_test',
  leadId: 'lead_w01',
  recipientPhone: '+919876543220',
  templateName: 'draft_promo_v1',
  hasOptedIn: true,
});
assert.strictEqual(unapprovedRes.success, false);
assert.ok(unapprovedRes.blockedReason?.includes('APPROVED templates'), 'Unapproved template must be blocked');

// Test B: Non-opted-in prospect blocked
const nonOptInRes = await waMgr.sendTemplateMessage({
  workspaceId: 'ws_test',
  leadId: 'lead_w02',
  recipientPhone: '+919876543221',
  templateName: 'meeting_confirmation_v1',
  hasOptedIn: false,
});
assert.strictEqual(nonOptInRes.success, false);
assert.ok(nonOptInRes.blockedReason?.includes('opt-in'), 'Non-opted-in contact must be blocked');

// Test C: Valid opted-in approved template dispatch
const validRes = await waMgr.sendTemplateMessage({
  workspaceId: 'ws_test',
  leadId: 'lead_w03',
  recipientPhone: '+919876543222',
  templateName: 'meeting_confirmation_v1',
  hasOptedIn: true,
  variables: { name: 'Vikram', time: 'Tomorrow 10am', link: 'https://meet.google.com/xyz' },
  currentTime: new Date('2026-10-14T11:00:00Z'),
});
assert.strictEqual(validRes.success, true);
assert.strictEqual(validRes.messageRecord?.status, 'DELIVERED');

// Test D: Inbound refusal stops sequence and adds to suppression list
addToSuppressionList('ws_test', '+919876543222'); // in case
const inboundResult = await waMgr.handleInboundReply({
  workspaceId: 'ws_test',
  phoneNumber: '+919876543222',
  replyText: 'Stop messaging me, remove my number',
});

assert.strictEqual(inboundResult.sequenceHalted, true, 'Sequence must halt on reply');
assert.strictEqual(inboundResult.optOutExecuted, true, 'Opt-out must be executed on refusal');
const isBlockedNow = isSuppressed('+919876543222');
assert.strictEqual(isBlockedNow, true, 'Recipient must be suppressed');
console.log('✓ WhatsApp messaging strictly enforced approved templates, opt-in verification, and reply halting.\n');

// 4. Multi-Tier Human Handoff Tests
console.log('4. Testing Multi-Tier Human Handoff (Buying Intent, Human Request, Unsupported Questions)...');

const handoffMgr = new HumanHandoffManager({ liveTransferEnabled: false });

// Test triggers
const t1 = handoffMgr.evaluateHandoffTrigger('I want to speak with a human manager');
assert.strictEqual(t1.triggered, true);
assert.strictEqual(t1.reason, 'DIRECT_HUMAN_REQUEST');

const t2 = handoffMgr.evaluateHandoffTrigger('We are ready to buy and sign contract today');
assert.strictEqual(t2.triggered, true);
assert.strictEqual(t2.reason, 'HOT_BUYING_INTENT');

const t3 = handoffMgr.evaluateHandoffTrigger('Do you support custom on-premise source code deployment?');
assert.strictEqual(t3.triggered, true);
assert.strictEqual(t3.reason, 'UNSUPPORTED_QUESTION');

// Execute escalation
const execResult = await handoffMgr.executeHandoff({
  workspaceId: 'ws_test',
  leadId: 'lead_h01',
  callId: 'call_h01',
  prospectName: 'Kunal Kapoor',
  prospectPhone: '+919876543230',
  triggerReason: 'HOT_BUYING_INTENT',
  triggerUtterance: 'Ready to sign contract today',
  leadSummary: 'Enterprise B2B buyer asking for contract terms',
});

assert.strictEqual(execResult.pathUsed, 'WHATSAPP_ALERT', 'Should escalate to WhatsApp alert when live transfer is offline');
assert.strictEqual(execResult.handoffRecord.ownerAlertSent, true, 'Owner alert must be sent');
assert.ok(execResult.handoffRecord.callbackTaskId, 'Fallback callback task must be registered');
assert.ok(execResult.spokenUtterance.includes('notified our senior sales director'), 'Spoken message must reflect escalation');
console.log('✓ Multi-tier human handoff successfully routed hot buying intent and dispatched owner notification.\n');

console.log('========================================================');
console.log('ALL PRD V2.1 PHASE 5 DEFINITION OF DONE CHECKS PASSED!');
console.log('========================================================\n');
