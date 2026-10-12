'use server'

import {
  LeadV2,
  CampaignV2,
  ContactChannel,
  CanContactResult,
  CsvImportSummary,
  PreLaunchChecklist,
  CampaignCostEstimate
} from '@/types/campaign-v2'
import { parseAndValidateLeadCsv } from '@/lib/campaign/lead-importer-v2'
import { canContact } from '@/lib/safety/can-contact'
import {
  validatePreLaunchChecklist,
  calculateCampaignUsageEstimate,
  launchCampaign,
  pauseCampaign,
  stopCampaign
} from '@/lib/campaign/campaign-manager-v2'
import { getActiveBrainAction } from '@/app/actions/discovery-v2'

// In-memory workspace database for development & test execution
let STORED_LEADS: LeadV2[] = [
  {
    id: 'lead_seed_1',
    workspaceId: 'ws_desynthic_hq',
    phone: '+919876543210',
    name: 'Rajesh Sharma',
    company: 'Apex Growth Marketing',
    preferredLanguage: 'en',
    timeZone: 'Asia/Kolkata',
    source: 'seed_pilot',
    importedAt: new Date().toISOString(),
    status: 'READY'
  },
  {
    id: 'lead_seed_2',
    workspaceId: 'ws_desynthic_hq',
    phone: '+919999999999',
    name: 'Kavita Patel',
    company: 'SaaS Sprint Labs',
    preferredLanguage: 'hi',
    timeZone: 'Asia/Kolkata',
    source: 'seed_pilot',
    importedAt: new Date().toISOString(),
    status: 'READY'
  }
]

let STORED_CAMPAIGNS: CampaignV2[] = [
  {
    id: 'camp_pilot_01',
    workspaceId: 'ws_desynthic_hq',
    name: 'Q4 Agency Founders Outreach',
    goal: 'Book 20-min executive demos with B2B agency founders',
    brainId: 'brain_default',
    language: 'en',
    status: 'DRAFT',
    callingWindow: {
      start: '10:00',
      end: '18:00',
      timeZone: 'Asia/Kolkata'
    },
    qualificationRules: [
      'Company size between 10 and 100 employees',
      'Active outbound requirement and pain with SDR turnover'
    ],
    followUpSequence: [
      'Call attempt 1 (Voice)',
      'WhatsApp message 2 hours post-call if opted-in',
      'Call attempt 2 next day at 11:00 IST'
    ],
    dailyCap: 25,
    retryGapMinutes: 120,
    maxAttempts: 3,
    leadsCount: 2,
    leadIds: ['lead_seed_1', 'lead_seed_2'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

export async function getLeadsV2Action(): Promise<LeadV2[]> {
  return STORED_LEADS
}

export async function importLeadsCsvAction(
  csvText: string,
  sourceName: string = 'csv_upload'
): Promise<CsvImportSummary> {
  const existingPhones = new Set(STORED_LEADS.map((l) => l.phone))
  const summary = parseAndValidateLeadCsv(csvText, 'ws_desynthic_hq', sourceName, existingPhones)

  if (summary.validLeads.length > 0) {
    STORED_LEADS = [...STORED_LEADS, ...summary.validLeads]
  }

  return summary
}

export async function checkCanContactAction(
  leadId: string,
  channel: ContactChannel = 'voice'
): Promise<CanContactResult> {
  const lead = STORED_LEADS.find((l) => l.id === leadId)
  if (!lead) throw new Error('Lead not found')
  return canContact(lead, channel, new Date())
}

export async function getCampaignsV2Action(): Promise<CampaignV2[]> {
  return STORED_CAMPAIGNS
}

export async function validateCampaignChecklistAction(
  campaignId: string
): Promise<PreLaunchChecklist> {
  const campaign = STORED_CAMPAIGNS.find((c) => c.id === campaignId)
  if (!campaign) throw new Error('Campaign not found')

  const brain = await getActiveBrainAction()
  return validatePreLaunchChecklist(campaign, brain)
}

export async function launchCampaignAction(
  campaignId: string
): Promise<{ success: boolean; campaign: CampaignV2; error?: string }> {
  const campaign = STORED_CAMPAIGNS.find((c) => c.id === campaignId)
  if (!campaign) throw new Error('Campaign not found')

  const brain = await getActiveBrainAction()
  const result = launchCampaign(campaign, brain)

  if (result.success) {
    STORED_CAMPAIGNS = STORED_CAMPAIGNS.map((c) => (c.id === campaignId ? result.campaign : c))
  }

  return result
}

export async function toggleCampaignStateAction(
  campaignId: string,
  action: 'pause' | 'resume' | 'stop'
): Promise<CampaignV2> {
  const campaign = STORED_CAMPAIGNS.find((c) => c.id === campaignId)
  if (!campaign) throw new Error('Campaign not found')

  let updated: CampaignV2
  if (action === 'pause') {
    updated = pauseCampaign(campaign)
  } else if (action === 'resume') {
    updated = { ...campaign, status: 'ACTIVE', updatedAt: new Date().toISOString() }
  } else {
    updated = stopCampaign(campaign)
  }

  STORED_CAMPAIGNS = STORED_CAMPAIGNS.map((c) => (c.id === campaignId ? updated : c))
  return updated
}

export async function getCostEstimateAction(
  leadCount: number,
  avgMinutes?: number
): Promise<CampaignCostEstimate> {
  return calculateCampaignUsageEstimate(leadCount, avgMinutes)
}
