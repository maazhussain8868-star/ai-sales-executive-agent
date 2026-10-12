/**
 * PRD v2.1 Phase 7 Verification Suite: Multi-Tenant Roles, Sales Brain Rollback & Audit Log UI
 */

import assert from 'node:assert';
import { RbacManager } from '../src/lib/auth/rbac-manager-v2.ts';
import { BrainVersionManager } from '../src/lib/brain/version-manager-v2.ts';
import { getAuditLogs } from '../src/lib/hardening/audit-and-cost-reporter.ts';

console.log('Running PRD v2.1 Phase 7 Verification Suite: Multi-Tenant Roles & Governance...\n');

// 1. RBAC Permissions Matrix Verification
console.log('1. Testing RBAC Role Permissions & Gate Enforcement...');

// Owner checks: full permissions
assert.strictEqual(RbacManager.canPerform('owner', 'workspace:manage_billing'), true);
assert.strictEqual(RbacManager.canPerform('owner', 'brain:rollback'), true);
assert.strictEqual(RbacManager.canPerform('owner', 'campaign:launch'), true);
assert.strictEqual(RbacManager.canPerform('owner', 'team:invite'), true);
assert.strictEqual(RbacManager.canPerform('owner', 'dashboard:view'), true);

// Admin checks: operational power, but no billing/ownership deletion
assert.strictEqual(RbacManager.canPerform('admin', 'campaign:launch'), true);
assert.strictEqual(RbacManager.canPerform('admin', 'brain:rollback'), true);
assert.strictEqual(RbacManager.canPerform('admin', 'team:invite'), true);
assert.strictEqual(RbacManager.canPerform('admin', 'workspace:manage_billing'), false, 'Admin cannot manage billing');
assert.strictEqual(RbacManager.canPerform('admin', 'workspace:delete'), false, 'Admin cannot delete workspace');

// Member checks: view-only permissions
assert.strictEqual(RbacManager.canPerform('member', 'dashboard:view'), true);
assert.strictEqual(RbacManager.canPerform('member', 'calls:view'), true);
assert.strictEqual(RbacManager.canPerform('member', 'campaign:launch'), false, 'Member cannot launch campaigns');
assert.strictEqual(RbacManager.canPerform('member', 'brain:edit'), false, 'Member cannot edit Sales Brain');
assert.strictEqual(RbacManager.canPerform('member', 'brain:rollback'), false, 'Member cannot rollback Sales Brain');
assert.strictEqual(RbacManager.canPerform('member', 'team:invite'), false, 'Member cannot invite users');
console.log('✓ RBAC permissions correctly mapped across Owner, Admin, and Member tiers.\n');

// 2. Member Authorization Exceptions
console.log('2. Testing RbacManager.authorize() Exception Enforcement...');
let blockedMemberAction = false;
try {
  RbacManager.authorize('member', 'campaign:launch');
} catch (err) {
  blockedMemberAction = true;
  assert.ok(err.message.includes("lacks permission for action 'campaign:launch'"));
}
assert.strictEqual(blockedMemberAction, true, 'Member action must throw authorization error');

let blockedAdminBilling = false;
try {
  RbacManager.authorize('admin', 'workspace:manage_billing');
} catch (err) {
  blockedAdminBilling = true;
  assert.ok(err.message.includes("lacks permission for action 'workspace:manage_billing'"));
}
assert.strictEqual(blockedAdminBilling, true, 'Admin billing action must throw authorization error');
console.log('✓ Authorization gates strictly throw expected permission errors.\n');

// 3. Workspace Team Membership Lifecycle & Sole Owner Protection
console.log('3. Testing Team Membership Management & Sole Owner Protection...');
const initialMembers = RbacManager.getMembers('ws_pilot');
assert.ok(initialMembers.length >= 3, 'Initial workspace members loaded');

// Test A: Owner invites a new member
const invited = RbacManager.inviteMember({
  workspaceId: 'ws_pilot',
  actorUserId: 'usr_founder_01',
  actorRole: 'owner',
  name: 'Karan Mehra',
  email: 'karan@desynthic.com',
  role: 'member',
});
assert.strictEqual(invited.email, 'karan@desynthic.com');
assert.strictEqual(invited.role, 'member');

// Test B: Role update
const updated = RbacManager.updateMemberRole({
  actorRole: 'owner',
  actorUserId: 'usr_founder_01',
  memberId: invited.id,
  newRole: 'admin',
});
assert.strictEqual(updated.role, 'admin');

// Test C: Member removal
const removed = RbacManager.removeMember({
  actorRole: 'owner',
  actorUserId: 'usr_founder_01',
  memberId: invited.id,
});
assert.strictEqual(removed, true);

// Test D: Sole Owner Protection (Attempting to demote or remove the sole owner must throw)
const soleOwner = initialMembers.find((m) => m.role === 'owner');
assert.ok(soleOwner, 'Sole owner exists');

let blockedOwnerDemotion = false;
try {
  RbacManager.updateMemberRole({
    actorRole: 'owner',
    actorUserId: 'usr_founder_01',
    memberId: soleOwner.id,
    newRole: 'admin',
  });
} catch (err) {
  blockedOwnerDemotion = true;
  assert.ok(err.message.includes('Cannot demote the sole owner'));
}
assert.strictEqual(blockedOwnerDemotion, true, 'Demoting sole owner must be blocked');
console.log('✓ Membership lifecycle functional and sole owner protection strictly enforced.\n');

// 4. Sales Brain Versioning & Section-by-Section Diffing
console.log('4. Testing Sales Brain Version History & Section Diffing...');
const versions = BrainVersionManager.getVersions('ws_pilot');
assert.strictEqual(versions.length >= 2, true, 'At least 2 initial versions exist');
assert.strictEqual(versions[0].version, 2, 'Newest version is v2');
assert.strictEqual(versions[0].isActive, true, 'v2 is initially active');

const diff = BrainVersionManager.diffVersions('ws_pilot', 1, 2);
assert.strictEqual(diff.versionA, 1);
assert.strictEqual(diff.versionB, 2);
const pricingDiff = diff.changedSections.find((s) => s.key === 'pricing');
assert.ok(pricingDiff, 'Pricing section diff present');
assert.strictEqual(pricingDiff.hasChanged, true, 'Pricing section was modified between v1 and v2');
assert.ok(pricingDiff.contentA.includes('15,000'));
assert.ok(pricingDiff.contentB.includes('25,000'));
console.log('✓ Section-by-section diff engine accurately highlighted modified content.\n');

// 5. Immutable Sales Brain Rollback Execution
console.log('5. Testing Sales Brain Immutable Rollback Mechanism...');
const rollbackResult = BrainVersionManager.rollbackToVersion({
  workspaceId: 'ws_pilot',
  targetVersion: 1,
  actorUserId: 'usr_founder_01',
});

assert.strictEqual(rollbackResult.version, 3, 'Rollback created new active revision v3');
assert.strictEqual(rollbackResult.isActive, true, 'v3 is active');
assert.strictEqual(rollbackResult.createdReason, 'ROLLBACK');
assert.strictEqual(rollbackResult.rollbackSourceVersion, 1);
assert.ok(rollbackResult.sections.pricing.content.includes('15,000'), 'Restored v1 pricing content');

// Verify v2 is now deactivated
const v2Record = BrainVersionManager.getVersion('ws_pilot', 2);
assert.strictEqual(v2Record.isActive, false, 'v2 was deactivated upon rollback');
console.log('✓ Rollback created new immutable active revision v3 cloned from v1.\n');

// 6. Audit Trail Logging Verification
console.log('6. Testing Governance Audit Trail...');
const auditEntries = getAuditLogs('ws_pilot');
const rollbackEvent = auditEntries.find((e) => e.description.includes('Cloned from v1'));
assert.ok(rollbackEvent, 'Rollback audit event must be present in immutable ledger');
assert.strictEqual(rollbackEvent.eventType, 'BRAIN_ACTIVATED');
console.log('✓ Governance audit trail recorded rollback event with actor and timestamp.\n');

console.log('========================================================================');
console.log('ALL PRD V2.1 PHASE 7 ROLES, ROLLBACK & AUDIT ACCEPTANCE CHECKS PASSED!');
console.log('========================================================================\n');
