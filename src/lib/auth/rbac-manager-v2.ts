/**
 * PRD v2.1 Phase 7: Multi-Tenant RBAC Manager
 * Enforces role-based access control across owner, admin, and member tiers.
 */

import { WorkspaceRole, WorkspaceAction, WorkspaceMember } from '@/types/roles-v2';
import { logAuditEvent } from '@/lib/hardening/audit-and-cost-reporter';

// RBAC Permissions Mapping
const ROLE_PERMISSIONS: Record<WorkspaceRole, Set<WorkspaceAction>> = {
  owner: new Set<WorkspaceAction>([
    'workspace:delete',
    'workspace:manage_billing',
    'workspace:manage_api_keys',
    'team:invite',
    'team:remove',
    'team:change_role',
    'brain:edit',
    'brain:activate',
    'brain:rollback',
    'campaign:create',
    'campaign:launch',
    'campaign:pause_stop',
    'compliance:modify_rules',
    'leads:import',
    'leads:export',
    'calls:view',
    'calls:listen_recordings',
    'dashboard:view',
    'audit:view',
  ]),
  admin: new Set<WorkspaceAction>([
    'team:invite',
    'brain:edit',
    'brain:activate',
    'brain:rollback',
    'campaign:create',
    'campaign:launch',
    'campaign:pause_stop',
    'leads:import',
    'leads:export',
    'calls:view',
    'calls:listen_recordings',
    'dashboard:view',
    'audit:view',
  ]),
  member: new Set<WorkspaceAction>([
    'calls:view',
    'dashboard:view',
  ]),
};

// In-Memory Membership Store seeded with default test records
const MEMBERS_STORE: Map<string, WorkspaceMember> = new Map([
  [
    'mem_owner_01',
    {
      id: 'mem_owner_01',
      workspaceId: 'ws_pilot',
      userId: 'usr_founder_01',
      email: 'founder@desynthic.com',
      name: 'Aditya Founder',
      role: 'owner',
      joinedAt: '2026-10-01T10:00:00.000Z',
    },
  ],
  [
    'mem_admin_01',
    {
      id: 'mem_admin_01',
      workspaceId: 'ws_pilot',
      userId: 'usr_ops_01',
      email: 'ops@desynthic.com',
      name: 'Rohit Operations',
      role: 'admin',
      joinedAt: '2026-10-02T10:00:00.000Z',
      invitedBy: 'usr_founder_01',
    },
  ],
  [
    'mem_viewer_01',
    {
      id: 'mem_viewer_01',
      workspaceId: 'ws_pilot',
      userId: 'usr_analyst_01',
      email: 'analyst@desynthic.com',
      name: 'Simran Analyst',
      role: 'member',
      joinedAt: '2026-10-05T10:00:00.000Z',
      invitedBy: 'usr_ops_01',
    },
  ],
]);

export class RbacManager {
  /**
   * Check if a given role is authorized to perform a specific action.
   */
  public static canPerform(role: WorkspaceRole, action: WorkspaceAction): boolean {
    const allowed = ROLE_PERMISSIONS[role]?.has(action) ?? false;
    return allowed;
  }

  /**
   * Enforces that a role can perform an action, throwing an error if unauthorized.
   */
  public static authorize(role: WorkspaceRole, action: WorkspaceAction): void {
    if (!this.canPerform(role, action)) {
      throw new Error(`Unauthorized: Role '${role}' lacks permission for action '${action}'.`);
    }
  }

  /**
   * Retrieve all members for a given workspace.
   */
  public static getMembers(workspaceId: string): WorkspaceMember[] {
    return Array.from(MEMBERS_STORE.values()).filter((m) => m.workspaceId === workspaceId);
  }

  /**
   * Retrieve a single member by user ID and workspace ID.
   */
  public static getMemberByUser(workspaceId: string, userId: string): WorkspaceMember | undefined {
    return Array.from(MEMBERS_STORE.values()).find(
      (m) => m.workspaceId === workspaceId && m.userId === userId
    );
  }

  /**
   * Invite a new member to the workspace.
   */
  public static inviteMember(params: {
    actorRole: WorkspaceRole;
    actorUserId: string;
    workspaceId: string;
    email: string;
    name: string;
    role: WorkspaceRole;
  }): WorkspaceMember {
    this.authorize(params.actorRole, 'team:invite');

    if (params.role === 'owner' && params.actorRole !== 'owner') {
      throw new Error('Unauthorized: Only an owner can invite another owner.');
    }

    const id = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newMember: WorkspaceMember = {
      id,
      workspaceId: params.workspaceId,
      userId: `usr_${Date.now()}`,
      email: params.email.trim().toLowerCase(),
      name: params.name.trim(),
      role: params.role,
      joinedAt: new Date().toISOString(),
      invitedBy: params.actorUserId,
    };

    MEMBERS_STORE.set(id, newMember);

    logAuditEvent({
      workspaceId: params.workspaceId,
      eventType: 'CAMPAIGN_LAUNCH',
      actor: params.actorUserId,
      description: `Invited new team member ${newMember.email} with role '${newMember.role}'.`,
    });

    return newMember;
  }

  /**
   * Change a member's role.
   */
  public static updateMemberRole(params: {
    actorRole: WorkspaceRole;
    actorUserId: string;
    memberId: string;
    newRole: WorkspaceRole;
  }): WorkspaceMember {
    this.authorize(params.actorRole, 'team:change_role');

    const member = MEMBERS_STORE.get(params.memberId);
    if (!member) {
      throw new Error(`Member '${params.memberId}' not found.`);
    }

    // Protection: Prevent demoting the last owner
    if (member.role === 'owner' && params.newRole !== 'owner') {
      const allOwners = this.getMembers(member.workspaceId).filter((m) => m.role === 'owner');
      if (allOwners.length <= 1) {
        throw new Error('Action blocked: Cannot demote the sole owner of the workspace.');
      }
    }

    member.role = params.newRole;
    MEMBERS_STORE.set(params.memberId, member);

    logAuditEvent({
      workspaceId: member.workspaceId,
      eventType: 'CAMPAIGN_LAUNCH',
      actor: params.actorUserId,
      description: `Updated role for member ${member.email} to '${params.newRole}'.`,
    });

    return member;
  }

  /**
   * Remove a member from the workspace.
   */
  public static removeMember(params: {
    actorRole: WorkspaceRole;
    actorUserId: string;
    memberId: string;
  }): boolean {
    this.authorize(params.actorRole, 'team:remove');

    const member = MEMBERS_STORE.get(params.memberId);
    if (!member) {
      throw new Error(`Member '${params.memberId}' not found.`);
    }

    if (member.role === 'owner') {
      const allOwners = this.getMembers(member.workspaceId).filter((m) => m.role === 'owner');
      if (allOwners.length <= 1) {
        throw new Error('Action blocked: Cannot remove the sole owner of the workspace.');
      }
    }

    MEMBERS_STORE.delete(params.memberId);

    logAuditEvent({
      workspaceId: member.workspaceId,
      eventType: 'CAMPAIGN_STOP',
      actor: params.actorUserId,
      description: `Removed team member ${member.email} from workspace.`,
    });

    return true;
  }
}
