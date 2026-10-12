'use server';

import { RbacManager } from '@/lib/auth/rbac-manager-v2';
import { BrainVersionManager } from '@/lib/brain/version-manager-v2';
import { getAuditLogs } from '@/lib/hardening/audit-and-cost-reporter';
import { WorkspaceRole, WorkspaceMember, BrainVersionRecord, BrainVersionDiff } from '@/types/roles-v2';
import { SystemAuditEntry } from '@/types/hardening-v2';

export async function getWorkspaceMembersAction(workspaceId: string = 'ws_pilot'): Promise<WorkspaceMember[]> {
  return RbacManager.getMembers(workspaceId);
}

export async function inviteMemberAction(params: {
  workspaceId: string;
  email: string;
  name: string;
  role: WorkspaceRole;
  actorUserId?: string;
  actorRole?: WorkspaceRole;
}): Promise<{ success: boolean; member?: WorkspaceMember; error?: string }> {
  try {
    const member = RbacManager.inviteMember({
      workspaceId: params.workspaceId,
      email: params.email,
      name: params.name,
      role: params.role,
      actorRole: params.actorRole || 'owner',
      actorUserId: params.actorUserId || 'usr_founder_01',
    });
    return { success: true, member };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function updateMemberRoleAction(params: {
  memberId: string;
  newRole: WorkspaceRole;
  actorUserId?: string;
  actorRole?: WorkspaceRole;
}): Promise<{ success: boolean; member?: WorkspaceMember; error?: string }> {
  try {
    const member = RbacManager.updateMemberRole({
      memberId: params.memberId,
      newRole: params.newRole,
      actorRole: params.actorRole || 'owner',
      actorUserId: params.actorUserId || 'usr_founder_01',
    });
    return { success: true, member };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function removeMemberAction(params: {
  memberId: string;
  actorUserId?: string;
  actorRole?: WorkspaceRole;
}): Promise<{ success: boolean; error?: string }> {
  try {
    RbacManager.removeMember({
      memberId: params.memberId,
      actorRole: params.actorRole || 'owner',
      actorUserId: params.actorUserId || 'usr_founder_01',
    });
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function getBrainVersionsAction(workspaceId: string = 'ws_pilot'): Promise<BrainVersionRecord[]> {
  return BrainVersionManager.getVersions(workspaceId);
}

export async function diffBrainVersionsAction(
  workspaceId: string = 'ws_pilot',
  versionA: number,
  versionB: number
): Promise<BrainVersionDiff | null> {
  try {
    return BrainVersionManager.diffVersions(workspaceId, versionA, versionB);
  } catch {
    return null;
  }
}

export async function rollbackBrainVersionAction(params: {
  workspaceId: string;
  targetVersion: number;
  actorUserId?: string;
  actorRole?: WorkspaceRole;
}): Promise<{ success: boolean; newVersion?: BrainVersionRecord; error?: string }> {
  try {
    // RBAC verification: Only owner or admin may perform a rollback
    RbacManager.authorize(params.actorRole || 'owner', 'brain:rollback');

    const newVersion = BrainVersionManager.rollbackToVersion({
      workspaceId: params.workspaceId,
      targetVersion: params.targetVersion,
      actorUserId: params.actorUserId || 'usr_founder_01',
    });
    return { success: true, newVersion };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function getAuditLogsAction(workspaceId: string = 'ws_pilot'): Promise<SystemAuditEntry[]> {
  return getAuditLogs(workspaceId);
}
