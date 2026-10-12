'use server'

import {
  SupportedLanguage,
  AbExperiment,
  SalesCoachingReport,
  MethodologyPatch,
  CrmIntegration,
  HumanSalesRep,
  WalletLedger,
} from '@/types/phase7'
import { compileMultilingualPrompt } from '@/lib/multilingual/compiler'
import { routeAbCall, evaluateExperimentWinner } from '@/lib/ab-testing/engine'
import { CrmAdapter, CrmLeadPayload } from '@/lib/crm/adapter'
import { routeInboundCall, InboundCallRequest } from '@/lib/inbound/router'
import { rechargeWallet } from '@/lib/billing/wallet'

// In-memory workspace mock storage for development / tests
const MOCK_EXPERIMENTS: AbExperiment[] = [
  {
    id: 'exp_1',
    workspaceId: 'ws_desynthic_hq',
    name: 'Curiosity Bottleneck vs Direct ROI Pitch',
    status: 'active',
    variantAPrompt: 'Focus on high SDR turnover and time wasted dialing unqualified contacts.',
    variantBPrompt: 'Focus on $1,500 setup + $50 per booked meeting outcome billing.',
    trafficSplitPercent: 50,
    variantACalls: 45,
    variantAMeetings: 6, // 13.3%
    variantBCalls: 48,
    variantBMeetings: 13, // 27.1%
    winningVariant: 'B',
    confidenceScore: 0.88,
    createdAt: new Date().toISOString()
  }
]

const MOCK_COACHING_REPORTS: SalesCoachingReport[] = [
  {
    id: 'coach_1',
    workspaceId: 'ws_desynthic_hq',
    callId: 'call_9901',
    prospectName: 'Vikram Mehta (TechSprint)',
    talkToListenRatio: 0.44,
    speechPaceWpm: 138,
    fillerWordsCount: 1,
    objectionHandlingScore: 94,
    strengths: [
      'Empathetic objection handling on existing human SDRs',
      'Clear, unhurried cadence and exact 20-minute calendar confirmation'
    ],
    improvementAreas: ['Slightly delayed answer on SOC2 compliance inquiries'],
    recommendedPromptPatch: 'When asked about data security, lead with: "All customer transcripts are AES-256 encrypted with zero model retraining."',
    appliedToBrain: false,
    createdAt: new Date().toISOString()
  }
]

const MOCK_METHODOLOGY_PATCHES: MethodologyPatch[] = [
  {
    id: 'patch_1',
    workspaceId: 'ws_desynthic_hq',
    sourceCallId: 'call_9901',
    category: 'objection_response',
    suggestedPatch: 'When prospect says "We already use human SDRs", counter with: "We don\'t replace your closers—we feed them warm appointments."',
    rationale: 'Converted live resistance into confirmed demo in Call #9901.',
    status: 'pending_review',
    createdAt: new Date().toISOString()
  }
]

const MOCK_CRM_INTEGRATIONS: CrmIntegration[] = [
  {
    id: 'crm_1',
    workspaceId: 'ws_desynthic_hq',
    provider: 'hubspot',
    status: 'connected',
    apiKeyMasked: 'pat-na1••••••••7721',
    lastSyncedAt: new Date().toISOString(),
    syncStats: {
      leadsSynced: 120,
      callsSynced: 94,
      dealsCreated: 19
    }
  },
  {
    id: 'crm_2',
    workspaceId: 'ws_desynthic_hq',
    provider: 'zoho',
    status: 'connected',
    apiKeyMasked: '1000.••••••••8910',
    lastSyncedAt: new Date().toISOString(),
    syncStats: {
      leadsSynced: 45,
      callsSynced: 38,
      dealsCreated: 7
    }
  }
]

const MOCK_HUMAN_REPS: HumanSalesRep[] = [
  {
    id: 'rep_1',
    workspaceId: 'ws_desynthic_hq',
    name: 'Ananya Sharma',
    phone: '+919876543210',
    email: 'ananya@desynthic.com',
    role: 'Solutions Architect',
    status: 'available',
    tier: 'enterprise',
    assignedMeetingsCount: 14
  },
  {
    id: 'rep_2',
    workspaceId: 'ws_desynthic_hq',
    name: 'Rohan Gupta',
    phone: '+919999999999',
    email: 'rohan@desynthic.com',
    role: 'Account Executive',
    status: 'in_call',
    tier: 'standard',
    assignedMeetingsCount: 9
  }
]

let MOCK_WALLET: WalletLedger = {
  workspaceId: 'ws_desynthic_hq',
  currentMinutesBalance: 340,
  totalMinutesPurchased: 500,
  totalMinutesConsumed: 160,
  planName: 'Growth',
  rechargeHistory: [
    {
      id: 'rech_init',
      amountInr: 15000,
      minutesAdded: 500,
      paymentId: 'pay_rzp_initial_pack',
      timestamp: new Date().toISOString()
    }
  ]
}

// Actions

export async function compileMultilingualPromptAction(
  basePrompt: string,
  language: SupportedLanguage
) {
  return compileMultilingualPrompt(basePrompt, language)
}

export async function getAbExperimentsAction(workspaceId: string) {
  return MOCK_EXPERIMENTS.filter((e) => e.workspaceId === workspaceId)
}

export async function createAbExperimentAction(
  workspaceId: string,
  name: string,
  variantAPrompt: string,
  variantBPrompt: string,
  trafficSplitPercent: number = 50
) {
  const newExp: AbExperiment = {
    id: `exp_${Date.now()}`,
    workspaceId,
    name,
    status: 'active',
    variantAPrompt,
    variantBPrompt,
    trafficSplitPercent,
    variantACalls: 0,
    variantAMeetings: 0,
    variantBCalls: 0,
    variantBMeetings: 0,
    createdAt: new Date().toISOString()
  }
  MOCK_EXPERIMENTS.push(newExp)
  return newExp
}

export async function routeExperimentCallAction(experimentId: string, callIndex: number) {
  const exp = MOCK_EXPERIMENTS.find((e) => e.id === experimentId)
  if (!exp) throw new Error('Experiment not found')
  return routeAbCall(exp, callIndex)
}

export async function evaluateExperimentAction(experimentId: string) {
  const exp = MOCK_EXPERIMENTS.find((e) => e.id === experimentId)
  if (!exp) throw new Error('Experiment not found')
  const evaluation = evaluateExperimentWinner(exp)
  exp.winningVariant = evaluation.winningVariant
  exp.confidenceScore = evaluation.confidenceScore
  return evaluation
}

export async function getCoachingReportsAction(workspaceId: string) {
  return MOCK_COACHING_REPORTS.filter((r) => r.workspaceId === workspaceId)
}

export async function getMethodologyPatchesAction(workspaceId: string) {
  return MOCK_METHODOLOGY_PATCHES.filter((p) => p.workspaceId === workspaceId)
}

export async function acceptMethodologyPatchAction(patchId: string) {
  const patch = MOCK_METHODOLOGY_PATCHES.find((p) => p.id === patchId)
  if (!patch) throw new Error('Patch not found')
  patch.status = 'accepted'
  return patch
}

export async function getCrmIntegrationsAction(workspaceId: string) {
  return MOCK_CRM_INTEGRATIONS.filter((c) => c.workspaceId === workspaceId)
}

export async function syncLeadToCrmAction(
  workspaceId: string,
  provider: 'hubspot' | 'zoho' | 'webhook',
  lead: CrmLeadPayload
) {
  const integration = MOCK_CRM_INTEGRATIONS.find(
    (c) => c.workspaceId === workspaceId && c.provider === provider
  ) || {
    id: `crm_${provider}`,
    workspaceId,
    provider,
    status: 'connected',
    syncStats: { leadsSynced: 0, callsSynced: 0, dealsCreated: 0 }
  }

  const adapter = new CrmAdapter(integration)
  const result = await adapter.syncLead(lead)
  integration.syncStats.leadsSynced += 1
  return result
}

export async function getHumanRepsAction(workspaceId: string) {
  return MOCK_HUMAN_REPS.filter((r) => r.workspaceId === workspaceId)
}

export async function updateRepStatusAction(
  repId: string,
  status: 'available' | 'in_call' | 'offline'
) {
  const rep = MOCK_HUMAN_REPS.find((r) => r.id === repId)
  if (!rep) throw new Error('Rep not found')
  rep.status = status
  return rep
}

export async function routeInboundCallAction(
  workspaceId: string,
  request: InboundCallRequest
) {
  const availableReps = MOCK_HUMAN_REPS.filter((r) => r.workspaceId === workspaceId)
  return routeInboundCall(request, workspaceId, availableReps)
}

export async function getWalletLedgerAction(workspaceId: string) {
  if (MOCK_WALLET.workspaceId === workspaceId) return MOCK_WALLET
  return {
    workspaceId,
    currentMinutesBalance: 500,
    totalMinutesPurchased: 500,
    totalMinutesConsumed: 0,
    planName: 'Growth' as const,
    rechargeHistory: []
  }
}

export async function rechargeMinutesAction(
  workspaceId: string,
  minutesToAdd: number,
  amountInr: number
) {
  const currentWallet = await getWalletLedgerAction(workspaceId)
  const { updatedWallet, result } = rechargeWallet(currentWallet, minutesToAdd, amountInr)
  MOCK_WALLET = updatedWallet
  return result
}
