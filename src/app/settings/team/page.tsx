import { WorkspaceRolesAndAuditV2 } from '@/components/admin/WorkspaceRolesAndAuditV2';

export const metadata = {
  title: 'Team & Governance | Desynthic AI Sales Executive',
  description: 'Manage workspace roles, Sales Brain version history and rollback, and audit trail.',
};

export default function TeamSettingsPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#0b0f19', color: '#f8fafc', padding: '32px 16px' }}>
      <WorkspaceRolesAndAuditV2 />
    </main>
  );
}
