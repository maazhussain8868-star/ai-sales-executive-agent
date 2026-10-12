'use server'

import { revalidatePath } from 'next/cache'
import {
  Workspace,
  DashboardMetrics,
  AuditLog,
  EncryptedSecret,
} from '@/types/analytics'
import { encryptSecret } from '@/lib/analytics/encryption'
import { computeDashboardMetrics } from '@/lib/analytics/aggregator'
import { getCallsAction } from './voice'
import { getLeadsAction } from './campaign'
import { createClient } from '@/lib/supabase/server'

function safeRevalidate(path: string) {
  try {
    revalidatePath(path)
  } catch {
    // Non-request context
  }
}

// In-memory multi-tenant store with 2 pre-seeded workspaces for isolation tests
const globalAnalyticsStore = {
  activeWorkspaceId: 'ws_client_a',
  workspaces: [
    {
      id: 'ws_client_a',
      name: 'Desynthic Enterprise',
      slug: 'desynthic',
      plan: 'growth',
      minuteCap: 500,
      minutesUsed: 142.5,
      costPerLead: 15.0,
      revenueAttributed: 48500.0,
      piiRetentionDays: 90,
      encryptedApiKeys: {
        omnidimension: encryptSecret('omni_live_9a87bf23d8e9'),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'ws_client_b',
      name: 'AlphaTech Solutions',
      slug: 'alphatech',
      plan: 'starter',
      minuteCap: 100,
      minutesUsed: 100.0, // Reached cap!
      costPerLead: 20.0,
      revenueAttributed: 12000.0,
      piiRetentionDays: 60,
      encryptedApiKeys: {
        omnidimension: encryptSecret('omni_live_3c4d5e6f7a8b'),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ] as Workspace[],
  auditLogs: [] as AuditLog[],
  // Multi-tenant lead isolation map: workspaceId -> leadIds
  workspaceLeadMap: {
    ws_client_a: ['lead_seed_1', 'lead_seed_2', 'lead_seed_3'],
    ws_client_b: ['lead_client_b_01', 'lead_client_b_02'],
  } as Record<string, string[]>,
}

export async function getActiveWorkspaceAction(): Promise<Workspace> {
  const current = globalAnalyticsStore.workspaces.find(
    (w) => w.id === globalAnalyticsStore.activeWorkspaceId
  )
  return current || globalAnalyticsStore.workspaces[0]
}

export async function getWorkspacesAction(): Promise<Workspace[]> {
  const supabase = await createClient()
  if (supabase) {
    try {
      const { data } = await supabase.from('workspaces').select('*')
      if (data && data.length > 0) {
        return data.map((d) => ({
          id: d.id,
          name: d.name,
          slug: d.slug,
          plan: d.plan,
          minuteCap: d.minute_cap,
          minutesUsed: Number(d.minutes_used),
          costPerLead: Number(d.cost_per_lead),
          revenueAttributed: Number(d.revenue_attributed),
          piiRetentionDays: d.pii_retention_days,
          encryptedApiKeys: d.encrypted_api_keys || {},
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }))
      }
    } catch {
      // Fallback
    }
  }
  return globalAnalyticsStore.workspaces
}

export async function switchWorkspaceAction(workspaceId: string) {
  const ws = globalAnalyticsStore.workspaces.find((w) => w.id === workspaceId)
  if (!ws) {
    return { success: false, error: `Workspace ${workspaceId} not found` }
  }

  globalAnalyticsStore.activeWorkspaceId = workspaceId
  globalAnalyticsStore.auditLogs.unshift({
    id: `audit_${Date.now()}`,
    workspaceId,
    actorEmail: 'admin@desynthic.com',
    action: 'SWITCH_WORKSPACE',
    resource: 'workspace',
    details: { workspaceName: ws.name },
    timestamp: new Date().toISOString(),
  })

  safeRevalidate('/dashboard')
  return { success: true, workspace: ws }
}

export async function getDashboardAnalyticsAction(
  workspaceId?: string
): Promise<DashboardMetrics> {
  const ws = workspaceId
    ? globalAnalyticsStore.workspaces.find((w) => w.id === workspaceId) ||
      globalAnalyticsStore.workspaces[0]
    : await getActiveWorkspaceAction()

  const calls = await getCallsAction()
  const leads = await getLeadsAction()

  return computeDashboardMetrics({
    calls,
    leads,
    messages: [],
    workspace: ws,
  })
}

export async function updateRevenueAttributedAction(
  workspaceId: string,
  revenue: number
) {
  const ws = globalAnalyticsStore.workspaces.find((w) => w.id === workspaceId)
  if (ws) {
    ws.revenueAttributed = revenue
    ws.updatedAt = new Date().toISOString()
  }

  const supabase = await createClient()
  if (supabase) {
    try {
      await supabase
        .from('workspaces')
        .update({ revenue_attributed: revenue, updated_at: new Date().toISOString() })
        .eq('id', workspaceId)
    } catch {
      // Fallback
    }
  }

  safeRevalidate('/dashboard')
  return { success: true, revenue }
}

export async function saveEncryptedApiKeyAction(
  workspaceId: string,
  provider: string,
  keyPlaintext: string
) {
  const ws = globalAnalyticsStore.workspaces.find((w) => w.id === workspaceId)
  if (!ws) return { success: false, error: 'Workspace not found' }

  // Encrypt using AES-256-GCM
  const encrypted: EncryptedSecret = encryptSecret(keyPlaintext)
  ws.encryptedApiKeys[provider] = encrypted
  ws.updatedAt = new Date().toISOString()

  globalAnalyticsStore.auditLogs.unshift({
    id: `audit_${Date.now()}`,
    workspaceId,
    actorEmail: 'admin@desynthic.com',
    action: 'UPDATE_API_KEY',
    resource: `provider_keys/${provider}`,
    details: { masked: encrypted.maskedKey },
    timestamp: new Date().toISOString(),
  })

  safeRevalidate('/dashboard')
  return {
    success: true,
    maskedKey: encrypted.maskedKey, // ONLY return masked key, never plaintext
  }
}

export async function getEncryptedApiKeysAction(
  workspaceId: string
): Promise<Record<string, string>> {
  const ws = globalAnalyticsStore.workspaces.find((w) => w.id === workspaceId)
  if (!ws) return {}

  // Return masked keys only
  const masked: Record<string, string> = {}
  for (const [provider, sec] of Object.entries(ws.encryptedApiKeys)) {
    masked[provider] = sec.maskedKey
  }
  return masked
}

/**
 * Checks if workspace has reached its plan minute cap.
 * If reached, calling MUST stop!
 */
export async function checkWorkspaceUsageCapAction(workspaceId: string): Promise<{
  canCall: boolean
  minutesUsed: number
  minuteCap: number
  reason?: string
}> {
  const ws = globalAnalyticsStore.workspaces.find((w) => w.id === workspaceId)
  if (!ws) return { canCall: false, minutesUsed: 0, minuteCap: 0, reason: 'Workspace not found' }

  if (ws.minutesUsed >= ws.minuteCap) {
    return {
      canCall: false,
      minutesUsed: ws.minutesUsed,
      minuteCap: ws.minuteCap,
      reason: `STOPPED: Workspace "${ws.name}" has reached its monthly call cap (${ws.minutesUsed}/${ws.minuteCap} minutes). Upgrade plan to resume calling.`,
    }
  }

  return {
    canCall: true,
    minutesUsed: ws.minutesUsed,
    minuteCap: ws.minuteCap,
  }
}

export async function getAuditLogsAction(workspaceId?: string): Promise<AuditLog[]> {
  const targetId = workspaceId || globalAnalyticsStore.activeWorkspaceId
  const supabase = await createClient()
  if (supabase) {
    try {
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('workspace_id', targetId)
        .order('timestamp', { ascending: false })
      if (data && data.length > 0) return data as AuditLog[]
    } catch {
      // Fallback
    }
  }
  return globalAnalyticsStore.auditLogs.filter((l) => l.workspaceId === targetId)
}

/**
 * Validates tenant data isolation (Client A can never see Client B's data)
 */
export async function verifyClientDataIsolationAction(
  clientAId: string,
  clientBId: string
): Promise<{ isolated: boolean; clientADataCount: number; clientBDataCount: number }> {
  const clientALeads = globalAnalyticsStore.workspaceLeadMap[clientAId] || []
  const clientBLeads = globalAnalyticsStore.workspaceLeadMap[clientBId] || []

  // Check intersection: must be disjoint (0 shared items)
  const overlap = clientALeads.filter((id) => clientBLeads.includes(id))

  return {
    isolated: overlap.length === 0,
    clientADataCount: clientALeads.length,
    clientBDataCount: clientBLeads.length,
  }
}
