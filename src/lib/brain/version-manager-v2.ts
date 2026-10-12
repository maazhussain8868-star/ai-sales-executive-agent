/**
 * PRD v2.1 Phase 7: Sales Brain Version History & Rollback Manager
 * Provides immutable versioning, section-by-section diffing, and one-click rollback.
 */

import { BrainVersionRecord, BrainVersionDiff } from '@/types/roles-v2';
import { logAuditEvent } from '@/lib/hardening/audit-and-cost-reporter';

const BRAIN_VERSIONS_STORE: Map<string, BrainVersionRecord> = new Map([
  [
    'ver_ws_pilot_1',
    {
      id: 'ver_ws_pilot_1',
      workspaceId: 'ws_pilot',
      version: 1,
      baseSystemPrompt: 'You are Priya, an AI sales representative at Desynthic. Speak clearly and qualify leads based on B2B logistics model.',
      aiDisclosureLine: 'This call is conducted by an AI sales employee and recorded for quality assurance.',
      sections: {
        company: { title: 'Company Identity', content: 'Desynthic Technologies - Autonomous AI Sales Agents.', updatedAt: '2026-10-01T10:00:00.000Z' },
        pricing: { title: 'Pricing & Commercials', content: 'Base pilot is ₹15,000 for 500 qualification minutes.', updatedAt: '2026-10-01T10:00:00.000Z' },
        icp: { title: 'Ideal Customer Profile', content: 'B2B logistics tech, supply chain managers with >200 inbound leads/month.', updatedAt: '2026-10-01T10:00:00.000Z' },
        compliance: { title: 'Compliance & Safety', content: '10:00-18:00 IST calling only. No Sunday calls. Multilingual refusal stops immediately.', updatedAt: '2026-10-01T10:00:00.000Z' },
      },
      createdBy: 'usr_founder_01',
      createdReason: 'INITIAL',
      isActive: false,
      createdAt: '2026-10-01T10:00:00.000Z',
    },
  ],
  [
    'ver_ws_pilot_2',
    {
      id: 'ver_ws_pilot_2',
      workspaceId: 'ws_pilot',
      version: 2,
      baseSystemPrompt: 'You are Priya, an AI sales representative at Desynthic. Defend ₹25,000 enterprise pricing and prioritize enterprise logistics.',
      aiDisclosureLine: 'This call is conducted by Priya, an AI sales representative at Desynthic. This line is recorded.',
      sections: {
        company: { title: 'Company Identity', content: 'Desynthic Technologies - Enterprise AI Voice Agents.', updatedAt: '2026-10-05T12:00:00.000Z' },
        pricing: { title: 'Pricing & Commercials', content: 'Enterprise tier is ₹25,000 for 1,000 qualification minutes.', updatedAt: '2026-10-05T12:00:00.000Z' },
        icp: { title: 'Ideal Customer Profile', content: 'Enterprise logistics only with >1,000 inbound leads/month.', updatedAt: '2026-10-05T12:00:00.000Z' },
        compliance: { title: 'Compliance & Safety', content: '10:00-18:00 IST calling only. No Sunday calls. Multilingual refusal stops immediately.', updatedAt: '2026-10-05T12:00:00.000Z' },
      },
      createdBy: 'usr_ops_01',
      createdReason: 'DISCOVERY_UPDATE',
      isActive: true,
      createdAt: '2026-10-05T12:00:00.000Z',
    },
  ],
]);

export class BrainVersionManager {
  /**
   * List all versions for a given workspace, sorted newest first.
   */
  public static getVersions(workspaceId: string): BrainVersionRecord[] {
    return Array.from(BRAIN_VERSIONS_STORE.values())
      .filter((v) => v.workspaceId === workspaceId)
      .sort((a, b) => b.version - a.version);
  }

  /**
   * Get the currently active brain version for a workspace.
   */
  public static getActiveVersion(workspaceId: string): BrainVersionRecord | undefined {
    return Array.from(BRAIN_VERSIONS_STORE.values()).find(
      (v) => v.workspaceId === workspaceId && v.isActive
    );
  }

  /**
   * Get a specific version record by version number.
   */
  public static getVersion(workspaceId: string, versionNumber: number): BrainVersionRecord | undefined {
    return Array.from(BRAIN_VERSIONS_STORE.values()).find(
      (v) => v.workspaceId === workspaceId && v.version === versionNumber
    );
  }

  /**
   * Save a newly compiled or updated version of the Sales Brain.
   */
  public static saveVersion(params: {
    workspaceId: string;
    baseSystemPrompt: string;
    aiDisclosureLine?: string;
    sections: Record<string, { title: string; content: string; updatedAt: string }>;
    createdBy: string;
    createdReason: 'INITIAL' | 'DISCOVERY_UPDATE' | 'COACHING_FEEDBACK' | 'ROLLBACK';
    rollbackSourceVersion?: number;
  }): BrainVersionRecord {
    const existing = this.getVersions(params.workspaceId);
    const nextVersion = existing.length > 0 ? existing[0].version + 1 : 1;

    // Deactivate previous versions
    for (const v of existing) {
      v.isActive = false;
      BRAIN_VERSIONS_STORE.set(v.id, v);
    }

    const id = `ver_${params.workspaceId}_${nextVersion}`;
    const newRecord: BrainVersionRecord = {
      id,
      workspaceId: params.workspaceId,
      version: nextVersion,
      baseSystemPrompt: params.baseSystemPrompt,
      aiDisclosureLine: params.aiDisclosureLine,
      sections: params.sections,
      createdBy: params.createdBy,
      createdReason: params.createdReason,
      rollbackSourceVersion: params.rollbackSourceVersion,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    BRAIN_VERSIONS_STORE.set(id, newRecord);

    logAuditEvent({
      workspaceId: params.workspaceId,
      eventType: 'BRAIN_ACTIVATED',
      actor: params.createdBy,
      description: `Sales Brain v${nextVersion} activated (Reason: ${params.createdReason}${
        params.rollbackSourceVersion ? `, Cloned from v${params.rollbackSourceVersion}` : ''
      }).`,
    });

    return newRecord;
  }

  /**
   * Compute a section-by-section diff between two versions.
   */
  public static diffVersions(workspaceId: string, versionA: number, versionB: number): BrainVersionDiff {
    const recA = this.getVersion(workspaceId, versionA);
    const recB = this.getVersion(workspaceId, versionB);

    if (!recA || !recB) {
      throw new Error(`Cannot compare: Version ${!recA ? versionA : versionB} does not exist in workspace.`);
    }

    const allKeys = Array.from(
      new Set([...Object.keys(recA.sections || {}), ...Object.keys(recB.sections || {})])
    );

    const changedSections = allKeys.map((key) => {
      const secA = recA.sections[key];
      const secB = recB.sections[key];
      const contentA = secA?.content || '';
      const contentB = secB?.content || '';
      const title = secB?.title || secA?.title || key;
      const hasChanged = contentA.trim() !== contentB.trim();

      return {
        key,
        title,
        hasChanged,
        contentA,
        contentB,
      };
    });

    return {
      versionA,
      versionB,
      changedSections,
    };
  }

  /**
   * Performs an immutable rollback: clones an earlier version into a new active revision.
   */
  public static rollbackToVersion(params: {
    workspaceId: string;
    targetVersion: number;
    actorUserId: string;
  }): BrainVersionRecord {
    const sourceRecord = this.getVersion(params.workspaceId, params.targetVersion);
    if (!sourceRecord) {
      throw new Error(`Rollback failed: Version ${params.targetVersion} not found.`);
    }

    return this.saveVersion({
      workspaceId: params.workspaceId,
      baseSystemPrompt: sourceRecord.baseSystemPrompt,
      aiDisclosureLine: sourceRecord.aiDisclosureLine,
      sections: JSON.parse(JSON.stringify(sourceRecord.sections)),
      createdBy: params.actorUserId,
      createdReason: 'ROLLBACK',
      rollbackSourceVersion: params.targetVersion,
    });
  }
}
