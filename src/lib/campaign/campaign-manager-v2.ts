import {
  CampaignV2,
  PreLaunchChecklist,
  CampaignCostEstimate
} from '@/types/campaign-v2'
import { VersionedSalesBrain } from '@/types/brain-v2'

export const DEFAULT_PROVIDER_COST_PER_MINUTE_INR = 12.0 // e.g. ₹12/min for conversational voice

/**
 * Validates the strict pre-launch compliance checklist.
 * A campaign cannot launch if ANY requirement is missing.
 */
export function validatePreLaunchChecklist(
  campaign: CampaignV2,
  brain?: VersionedSalesBrain,
  aiDisclosureLine?: string
): PreLaunchChecklist {
  const missingItems: string[] = []

  const hasLeadSource = campaign.leadsCount > 0 && campaign.leadIds.length > 0
  if (!hasLeadSource) missingItems.push('Lead list is empty (must have at least 1 verified lead).')

  const hasCallingWindow =
    Boolean(campaign.callingWindow?.start) &&
    Boolean(campaign.callingWindow?.end) &&
    campaign.callingWindow.start >= '10:00' &&
    campaign.callingWindow.end <= '18:00'
  if (!hasCallingWindow) missingItems.push('Calling window must fall within 10:00 - 18:00 IST.')

  const hasQualificationRules =
    Array.isArray(campaign.qualificationRules) && campaign.qualificationRules.length > 0
  if (!hasQualificationRules) missingItems.push('Qualification rules must be configured.')

  const disclosure = [
    aiDisclosureLine,
    brain?.sections.compliance?.content,
    brain?.baseSystemPrompt
  ].filter(Boolean).join(' ')

  const hasAiDisclosureLine =
    disclosure.toLowerCase().includes('ai sales representative') ||
    disclosure.toLowerCase().includes('ai sales employee') ||
    disclosure.toLowerCase().includes('ai प्रतिनिधि') ||
    disclosure.toLowerCase().includes('ai disclosure')
  if (!hasAiDisclosureLine) missingItems.push('Mandatory AI/recording disclosure statement missing.')

  const hasOptOutHandling =
    disclosure.toLowerCase().includes('opt-out') ||
    disclosure.toLowerCase().includes('remove') ||
    disclosure.toLowerCase().includes('refusal')
  if (!hasOptOutHandling) missingItems.push('Opt-out handling protocol missing in brain prompt.')

  const isReadyToLaunch = missingItems.length === 0

  return {
    hasLeadSource,
    hasCallingWindow,
    hasQualificationRules,
    hasAiDisclosureLine,
    hasOptOutHandling,
    isReadyToLaunch,
    missingItems
  }
}

/**
 * Calculates estimated minutes and provider cost before launching campaign.
 */
export function calculateCampaignUsageEstimate(
  leadCount: number,
  averageMinutesPerCall: number = 2.5,
  providerCostPerMinuteInr: number = DEFAULT_PROVIDER_COST_PER_MINUTE_INR
): CampaignCostEstimate {
  const totalEstimatedMinutes = Math.round(leadCount * averageMinutesPerCall)
  const totalEstimatedCostInr = Math.round(totalEstimatedMinutes * providerCostPerMinuteInr)

  return {
    leadCount,
    averageMinutesPerCall,
    providerCostPerMinuteInr,
    totalEstimatedMinutes,
    totalEstimatedCostInr
  }
}

/**
 * Attempts to launch a campaign, strictly enforcing the compliance gate.
 */
export function launchCampaign(
  campaign: CampaignV2,
  brain?: VersionedSalesBrain,
  aiDisclosureLine?: string
): { success: boolean; campaign: CampaignV2; error?: string } {
  const checklist = validatePreLaunchChecklist(campaign, brain, aiDisclosureLine)

  if (!checklist.isReadyToLaunch) {
    return {
      success: false,
      campaign,
      error: `Campaign launch blocked by pre-launch compliance gate: ${checklist.missingItems.join('; ')}`
    }
  }

  const updated: CampaignV2 = {
    ...campaign,
    status: 'ACTIVE',
    updatedAt: new Date().toISOString()
  }

  return {
    success: true,
    campaign: updated
  }
}

/**
 * Pauses a campaign, immediately halting new calls from being queued.
 */
export function pauseCampaign(campaign: CampaignV2): CampaignV2 {
  return {
    ...campaign,
    status: 'PAUSED',
    updatedAt: new Date().toISOString()
  }
}

/**
 * Stops a campaign permanently.
 */
export function stopCampaign(campaign: CampaignV2): CampaignV2 {
  return {
    ...campaign,
    status: 'STOPPED',
    updatedAt: new Date().toISOString()
  }
}
