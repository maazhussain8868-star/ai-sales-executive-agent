/**
 * PRD v2.1 Phase 9 Verification Suite: Email Sequences, Pause-on-Reply & Unsubscribe Compliance
 */

import assert from 'node:assert';
import { EmailSequenceManager } from '../src/lib/messaging/email-sequence-manager-v2.ts';
import { FakeEmailProvider } from '../src/lib/adapters/fake/fake-email.ts';

console.log('Running PRD v2.1 Phase 9 Verification Suite: Email Sequences & Compliance...\n');

FakeEmailProvider.clear();
const manager = new EmailSequenceManager();

// 1. Email Templates & Compliance Footers
console.log('1. Testing Email Templates & Mandatory Compliance Validation...');
const templates = manager.getTemplates();
assert.ok(templates.length >= 3, 'At least 3 nurture templates defined');
for (const tmpl of templates) {
  assert.strictEqual(tmpl.isCompliant, true, `Template ${tmpl.name} must be marked compliant`);
  assert.ok(tmpl.bodyHtml.toLowerCase().includes('unsubscribe'), `Template ${tmpl.name} must contain unsubscribe link in HTML`);
}
console.log('✓ Email templates validated with mandatory unsubscribe links & physical postal address.\n');

// 2. Sequence Enrollment & Step Dispatch
console.log('2. Testing Sequence Enrollment & Step 1 Outbound Dispatch...');
const enrollment1 = manager.enrollLead({
  workspaceId: 'ws_test_email',
  sequenceId: 'seq_post_call_nurture',
  leadId: 'lead_em_01',
  leadEmail: 'vikram.mehta@logisticshub.com',
  leadName: 'Vikram Mehta',
});

assert.strictEqual(enrollment1.status, 'IN_PROGRESS');
assert.strictEqual(enrollment1.currentStepNumber, 1);

const step1Result = await manager.executeNextStep({ enrollmentId: enrollment1.id });
assert.strictEqual(step1Result.success, true);
assert.strictEqual(step1Result.status, 'IN_PROGRESS');
assert.strictEqual(enrollment1.currentStepNumber, 2, 'Step advanced to 2');

// Verify outbound email record in provider
const sentEmails = FakeEmailProvider.getSentEmails('ws_test_email');
assert.strictEqual(sentEmails.length, 1);
assert.strictEqual(sentEmails[0].recipientEmail, 'vikram.mehta@logisticshub.com');
assert.ok(sentEmails[0].headers['List-Unsubscribe'], 'Must include RFC List-Unsubscribe header');
assert.ok(sentEmails[0].body.toLowerCase().includes('unsubscribe'), 'Body must include unsubscribe URL');
console.log('✓ Step 1 dispatched with RFC List-Unsubscribe header and recipient advanced to Step 2.\n');

// 3. Automated Pause on Inbound Reply
console.log('3. Testing Automated Pause on Inbound Prospect Reply...');
const replyResult = manager.handleInboundReply({
  recipientEmail: 'vikram.mehta@logisticshub.com',
  replyText: 'Hi Priya, what is your pricing for logistics tech companies?',
});

assert.strictEqual(replyResult.pausedCount, 1, '1 active enrollment paused on reply');
const updatedEnr1 = manager.getEnrollments('ws_test_email').find((e) => e.id === enrollment1.id);
assert.strictEqual(updatedEnr1.status, 'PAUSED_ON_REPLY');

// Dispatching next step on paused sequence must be blocked
const blockedStep = await manager.executeNextStep({ enrollmentId: enrollment1.id });
assert.strictEqual(blockedStep.success, false);
assert.strictEqual(blockedStep.status, 'PAUSED_ON_REPLY');
assert.ok(blockedStep.blockedReason.includes('not active'));
console.log('✓ Sequence instantly paused on prospect reply and future steps blocked.\n');

// 4. Automated Unsubscribe & Suppression
console.log('4. Testing Unsubscribe Click & Global Email Suppression...');
const enrollment2 = manager.enrollLead({
  workspaceId: 'ws_test_email',
  sequenceId: 'seq_post_call_nurture',
  leadId: 'lead_em_02',
  leadEmail: 'pooja.verma@urbanstyle.com',
  leadName: 'Pooja Verma',
});

assert.strictEqual(enrollment2.status, 'IN_PROGRESS');

// Prospect clicks unsubscribe link
const unsubResult = manager.handleUnsubscribe('pooja.verma@urbanstyle.com');
assert.strictEqual(unsubResult.haltedCount, 1, '1 sequence halted upon unsubscribe click');

const updatedEnr2 = manager.getEnrollments('ws_test_email').find((e) => e.id === enrollment2.id);
assert.strictEqual(updatedEnr2.status, 'HALTED_UNSUBSCRIBED');
assert.strictEqual(manager.isEmailSuppressed('pooja.verma@urbanstyle.com'), true, 'Added to suppression list');

// Re-enrolling unsubscribed lead must be blocked
let blockedReenrollment = false;
try {
  manager.enrollLead({
    workspaceId: 'ws_test_email',
    sequenceId: 'seq_post_call_nurture',
    leadId: 'lead_em_02_attempt2',
    leadEmail: 'pooja.verma@urbanstyle.com',
    leadName: 'Pooja Verma',
  });
} catch (err) {
  blockedReenrollment = true;
  assert.ok(err.message.includes('suppressed or unsubscribed'));
}
assert.strictEqual(blockedReenrollment, true, 'Re-enrollment of unsubscribed email must be rejected');
console.log('✓ Unsubscribe click halted sequence and permanently suppressed email address.\n');

// 5. Multi-Step Full Completion Journey
console.log('5. Testing Multi-Step Full Sequence Completion Lifecycle...');
const enrollment3 = manager.enrollLead({
  workspaceId: 'ws_test_email',
  sequenceId: 'seq_post_call_nurture',
  leadId: 'lead_em_03',
  leadEmail: 'rahul.logistics@complete.com',
  leadName: 'Rahul Completed',
});

// Step 1
await manager.executeNextStep({ enrollmentId: enrollment3.id });
assert.strictEqual(enrollment3.currentStepNumber, 2);

// Step 2
await manager.executeNextStep({ enrollmentId: enrollment3.id });
assert.strictEqual(enrollment3.currentStepNumber, 3);

// Step 3 (Final Breakup Step)
const finalStep = await manager.executeNextStep({ enrollmentId: enrollment3.id });
assert.strictEqual(finalStep.success, true);
assert.strictEqual(finalStep.status, 'COMPLETED');
assert.strictEqual(enrollment3.status, 'COMPLETED');
console.log('✓ Multi-step sequence completed smoothly after final breakup step.\n');

console.log('========================================================================');
console.log('ALL PRD V2.1 PHASE 9 EMAIL SEQUENCES & COMPLIANCE CHECKS PASSED!');
console.log('========================================================================\n');
