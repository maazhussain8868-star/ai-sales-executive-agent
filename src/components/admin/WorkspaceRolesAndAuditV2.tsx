'use client';

import React, { useState, useEffect } from 'react';
import {
  getWorkspaceMembersAction,
  inviteMemberAction,
  updateMemberRoleAction,
  removeMemberAction,
  getBrainVersionsAction,
  diffBrainVersionsAction,
  rollbackBrainVersionAction,
  getAuditLogsAction,
} from '@/app/actions/roles-and-audit-v2';
import { WorkspaceMember, WorkspaceRole, BrainVersionRecord, BrainVersionDiff } from '@/types/roles-v2';
import { SystemAuditEntry } from '@/types/hardening-v2';

export function WorkspaceRolesAndAuditV2() {
  const [activeTab, setActiveTab] = useState<'team' | 'versions' | 'audit'>('team');
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [versions, setVersions] = useState<BrainVersionRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<SystemAuditEntry[]>([]);
  const [selectedDiff, setSelectedDiff] = useState<BrainVersionDiff | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Invite Member Form State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('member');

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      getWorkspaceMembersAction('ws_pilot'),
      getBrainVersionsAction('ws_pilot'),
      getAuditLogsAction('ws_pilot'),
    ]).then(([mems, vers, logs]) => {
      if (isMounted) {
        setMembers(mems);
        setVersions(vers);
        setAuditLogs(logs);
      }
    }).catch(console.error);

    return () => {
      isMounted = false;
    };
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteName) return;
    setIsLoading(true);
    setStatusMsg(null);

    const res = await inviteMemberAction({
      workspaceId: 'ws_pilot',
      email: inviteEmail,
      name: inviteName,
      role: inviteRole,
    });

    setIsLoading(false);
    if (res.success && res.member) {
      setMembers((prev) => [...prev, res.member!]);
      setInviteEmail('');
      setInviteName('');
      setStatusMsg({ type: 'success', text: `Invited ${res.member.name} (${res.member.role}) successfully.` });
    } else {
      setStatusMsg({ type: 'error', text: res.error || 'Failed to invite member.' });
    }
  };

  const handleRoleChange = async (memberId: string, newRole: WorkspaceRole) => {
    setIsLoading(true);
    setStatusMsg(null);

    const res = await updateMemberRoleAction({
      memberId,
      newRole,
    });

    setIsLoading(false);
    if (res.success && res.member) {
      setMembers((prev) => prev.map((m) => (m.id === memberId ? res.member! : m)));
      setStatusMsg({ type: 'success', text: `Role updated for ${res.member.name} to ${newRole}.` });
    } else {
      setStatusMsg({ type: 'error', text: res.error || 'Failed to update role.' });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    setIsLoading(true);
    setStatusMsg(null);

    const res = await removeMemberAction({ memberId });
    setIsLoading(false);
    if (res.success) {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      setStatusMsg({ type: 'success', text: 'Member removed successfully.' });
    } else {
      setStatusMsg({ type: 'error', text: res.error || 'Failed to remove member.' });
    }
  };

  const handleViewDiff = async (vA: number, vB: number) => {
    setIsLoading(true);
    const diff = await diffBrainVersionsAction('ws_pilot', vA, vB);
    setIsLoading(false);
    setSelectedDiff(diff);
  };

  const handleRollback = async (targetVersion: number) => {
    if (!confirm(`Rollback Sales Brain to Version ${targetVersion}? This will create a new active version cloned from v${targetVersion}.`)) {
      return;
    }
    setIsLoading(true);
    setStatusMsg(null);

    const res = await rollbackBrainVersionAction({
      workspaceId: 'ws_pilot',
      targetVersion,
    });

    setIsLoading(false);
    if (res.success && res.newVersion) {
      const updatedVersions = await getBrainVersionsAction('ws_pilot');
      setVersions(updatedVersions);
      setSelectedDiff(null);
      setStatusMsg({
        type: 'success',
        text: `Successfully rolled back to v${targetVersion}. New active revision v${res.newVersion.version} created.`,
      });
    } else {
      setStatusMsg({ type: 'error', text: res.error || 'Failed to rollback version.' });
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#f8fafc', margin: '0 0 8px 0' }}>
          Workspace Management & Governance
        </h1>
        <p style={{ color: '#94a3b8', margin: 0 }}>
          Manage team roles (Owner/Admin/Member), audit Sales Brain version history, and inspect governance logs.
        </p>
      </div>

      {/* Notifications */}
      {statusMsg && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          background: statusMsg.type === 'success' ? '#064e3b' : '#7f1d1d',
          color: statusMsg.type === 'success' ? '#a7f3d0' : '#fecaca',
          border: `1px solid ${statusMsg.type === 'success' ? '#059669' : '#dc2626'}`,
          fontSize: '14px',
        }}>
          {statusMsg.text}
        </div>
      )}

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #334155', marginBottom: '24px' }}>
        {[
          { key: 'team', label: `Team & Roles (${members.length})` },
          { key: 'versions', label: `Sales Brain Versions (${versions.length})` },
          { key: 'audit', label: `System Audit Trail (${auditLogs.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key as any); setSelectedDiff(null); }}
            style={{
              padding: '12px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.key ? '3px solid #3b82f6' : '3px solid transparent',
              color: activeTab === tab.key ? '#f8fafc' : '#94a3b8',
              fontWeight: activeTab === tab.key ? 'bold' : 'normal',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Team & Roles */}
      {activeTab === 'team' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
          {/* Members Table */}
          <div style={{ background: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
            <h2 style={{ fontSize: '18px', color: '#f8fafc', marginTop: 0, marginBottom: '16px' }}>Workspace Members</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ color: '#64748b', borderBottom: '1px solid #334155' }}>
                  <th style={{ padding: '12px' }}>Member</th>
                  <th style={{ padding: '12px' }}>Role</th>
                  <th style={{ padding: '12px' }}>Joined</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid #334155', color: '#e2e8f0' }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: '600' }}>{m.name}</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>{m.email}</div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.id, e.target.value as WorkspaceRole)}
                        disabled={isLoading}
                        style={{
                          background: m.role === 'owner' ? '#431407' : m.role === 'admin' ? '#172554' : '#1e293b',
                          color: m.role === 'owner' ? '#fed7aa' : m.role === 'admin' ? '#bfdbfe' : '#94a3b8',
                          border: '1px solid #475569',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="owner">Owner</option>
                        <option value="admin">Admin</option>
                        <option value="member">Member (View Only)</option>
                      </select>
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#94a3b8' }}>
                      {new Date(m.joinedAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleRemoveMember(m.id)}
                        disabled={isLoading || m.role === 'owner'}
                        style={{
                          background: '#7f1d1d',
                          color: '#fecaca',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          cursor: m.role === 'owner' ? 'not-allowed' : 'pointer',
                          opacity: m.role === 'owner' ? 0.4 : 1,
                          fontSize: '12px',
                        }}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Invite Member Form */}
          <div style={{ background: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155', height: 'fit-content' }}>
            <h2 style={{ fontSize: '18px', color: '#f8fafc', marginTop: 0, marginBottom: '16px' }}>Invite New Member</h2>
            <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Full Name</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Priyanshu Dave"
                  required
                  style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #475569', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  required
                  style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #475569', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as WorkspaceRole)}
                  style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #475569', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }}
                >
                  <option value="member">Member (View Only)</option>
                  <option value="admin">Admin (Manage Campaigns & Brain)</option>
                  <option value="owner">Owner (Full Permissions)</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  padding: '10px',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginTop: '8px',
                }}
              >
                {isLoading ? 'Inviting...' : 'Send Invitation'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: Sales Brain Version History & Rollback */}
      {activeTab === 'versions' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedDiff ? '1fr 1fr' : '1fr', gap: '24px' }}>
          {/* Versions Timeline List */}
          <div style={{ background: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
            <h2 style={{ fontSize: '18px', color: '#f8fafc', marginTop: 0, marginBottom: '16px' }}>Version Timeline</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {versions.map((ver) => (
                <div
                  key={ver.id}
                  style={{
                    background: ver.isActive ? '#0f172a' : '#1e293b',
                    border: `1px solid ${ver.isActive ? '#3b82f6' : '#334155'}`,
                    borderRadius: '8px',
                    padding: '16px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#f8fafc', marginRight: '8px' }}>
                        Version {ver.version}
                      </span>
                      {ver.isActive && (
                        <span style={{ background: '#065f46', color: '#34d399', fontSize: '11px', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                          ACTIVE
                        </span>
                      )}
                      <span style={{ marginLeft: '8px', fontSize: '12px', color: '#94a3b8' }}>
                        Reason: {ver.createdReason}
                        {ver.rollbackSourceVersion ? ` (Cloned from v${ver.rollbackSourceVersion})` : ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {versions.length > 1 && (
                        <button
                          onClick={() => handleViewDiff(ver.version, versions[0].version)}
                          style={{
                            background: '#334155',
                            color: '#e2e8f0',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          Compare with v{versions[0].version}
                        </button>
                      )}
                      {!ver.isActive && (
                        <button
                          onClick={() => handleRollback(ver.version)}
                          disabled={isLoading}
                          style={{
                            background: '#d97706',
                            color: '#fff',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                          }}
                        >
                          Rollback to This
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px' }}>
                    Created at {new Date(ver.createdAt).toLocaleString()} by {ver.createdBy}
                  </div>
                  <div style={{ background: '#0f172a', padding: '10px', borderRadius: '6px', fontSize: '12px', color: '#cbd5e1' }}>
                    <strong>Mandatory Disclosure:</strong> {ver.aiDisclosureLine || 'None'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Diff Comparison Viewer */}
          {selectedDiff && (
            <div style={{ background: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '18px', color: '#f8fafc', margin: 0 }}>
                  Diff: Version {selectedDiff.versionA} vs Version {selectedDiff.versionB}
                </h2>
                <button
                  onClick={() => setSelectedDiff(null)}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '16px' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '600px', overflowY: 'auto' }}>
                {selectedDiff.changedSections.map((sec) => (
                  <div
                    key={sec.key}
                    style={{
                      background: '#0f172a',
                      borderRadius: '8px',
                      padding: '14px',
                      border: `1px solid ${sec.hasChanged ? '#f59e0b' : '#334155'}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 'bold', color: '#f8fafc', fontSize: '14px' }}>{sec.title}</span>
                      <span style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: sec.hasChanged ? '#78350f' : '#1e293b',
                        color: sec.hasChanged ? '#fde68a' : '#94a3b8',
                      }}>
                        {sec.hasChanged ? 'MODIFIED' : 'IDENTICAL'}
                      </span>
                    </div>

                    {sec.hasChanged ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                        <div style={{ background: '#3b0764', padding: '8px', borderRadius: '4px', color: '#e9d5ff' }}>
                          <strong style={{ display: 'block', marginBottom: '4px', color: '#c084fc' }}>v{selectedDiff.versionA}:</strong>
                          {sec.contentA || '(empty)'}
                        </div>
                        <div style={{ background: '#022c22', padding: '8px', borderRadius: '4px', color: '#a7f3d0' }}>
                          <strong style={{ display: 'block', marginBottom: '4px', color: '#34d399' }}>v{selectedDiff.versionB}:</strong>
                          {sec.contentB || '(empty)'}
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        {sec.contentA.slice(0, 100)}...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: System Audit Trail */}
      {activeTab === 'audit' && (
        <div style={{ background: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
          <h2 style={{ fontSize: '18px', color: '#f8fafc', marginTop: 0, marginBottom: '16px' }}>Immutable Governance Audit Trail</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ color: '#64748b', borderBottom: '1px solid #334155' }}>
                <th style={{ padding: '12px' }}>Timestamp</th>
                <th style={{ padding: '12px' }}>Event</th>
                <th style={{ padding: '12px' }}>Actor</th>
                <th style={{ padding: '12px' }}>Description</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((entry) => (
                <tr key={entry.id} style={{ borderBottom: '1px solid #334155', color: '#e2e8f0' }}>
                  <td style={{ padding: '12px', whiteSpace: 'nowrap', color: '#94a3b8' }}>
                    {new Date(entry.timestamp).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      background: entry.eventType === 'BRAIN_ACTIVATED' ? '#1e3a8a' : entry.eventType === 'OPT_OUT' ? '#7f1d1d' : '#334155',
                      color: entry.eventType === 'BRAIN_ACTIVATED' ? '#bfdbfe' : entry.eventType === 'OPT_OUT' ? '#fecaca' : '#cbd5e1',
                    }}>
                      {entry.eventType}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: '#cbd5e1', fontWeight: '500' }}>{entry.actor}</td>
                  <td style={{ padding: '12px', color: '#94a3b8' }}>{entry.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
