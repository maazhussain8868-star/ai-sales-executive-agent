/**
 * PRD v2.1 Phase 7: Multi-Tenant Roles & RBAC Types
 */

export type WorkspaceRole = 'owner' | 'admin' | 'member';

export type WorkspaceAction =
  | 'workspace:delete'
  | 'workspace:manage_billing'
  | 'workspace:manage_api_keys'
  | 'team:invite'
  | 'team:remove'
  | 'team:change_role'
  | 'brain:edit'
  | 'brain:activate'
  | 'brain:rollback'
  | 'campaign:create'
  | 'campaign:launch'
  | 'campaign:pause_stop'
  | 'compliance:modify_rules'
  | 'leads:import'
  | 'leads:export'
  | 'calls:view'
  | 'calls:listen_recordings'
  | 'dashboard:view'
  | 'audit:view';

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  email: string;
  name: string;
  role: WorkspaceRole;
  joinedAt: string;
  invitedBy?: string;
}

export interface BrainVersionRecord {
  id: string;
  workspaceId: string;
  version: number;
  baseSystemPrompt: string;
  aiDisclosureLine?: string;
  sections: Record<string, { title: string; content: string; updatedAt: string }>;
  createdBy: string;
  createdReason: 'INITIAL' | 'DISCOVERY_UPDATE' | 'COACHING_FEEDBACK' | 'ROLLBACK';
  rollbackSourceVersion?: number;
  isActive: boolean;
  createdAt: string;
}

export interface BrainVersionDiff {
  versionA: number;
  versionB: number;
  changedSections: Array<{
    key: string;
    title: string;
    hasChanged: boolean;
    contentA: string;
    contentB: string;
  }>;
}
