'use server'

import {
  DiscoveryInterviewData,
  VersionedSalesBrain,
  BrainSectionKey,
  BrainTestResult
} from '@/types/brain-v2'
import { compileSalesBrainV2 } from '@/lib/brain/compiler-v2'
import { runBrainTestSuite } from '@/lib/brain/test-suite'

import { DEFAULT_DISCOVERY_DATA } from '@/lib/brain/demo-discovery'

let CURRENT_ACTIVE_BRAIN: VersionedSalesBrain = compileSalesBrainV2(
  DEFAULT_DISCOVERY_DATA,
  'ws_desynthic_hq',
  0
)

export async function getActiveBrainAction(): Promise<VersionedSalesBrain> {
  return CURRENT_ACTIVE_BRAIN
}

export async function compileDiscoveryAction(
  data: DiscoveryInterviewData,
  workspaceId: string = 'ws_desynthic_hq'
): Promise<VersionedSalesBrain> {
  const currentVersion = CURRENT_ACTIVE_BRAIN ? CURRENT_ACTIVE_BRAIN.version : 0
  const compiled = compileSalesBrainV2(data, workspaceId, currentVersion)
  CURRENT_ACTIVE_BRAIN = compiled
  return compiled
}

export async function updateBrainSectionAction(
  sectionKey: BrainSectionKey,
  newContent: string
): Promise<VersionedSalesBrain> {
  if (!CURRENT_ACTIVE_BRAIN) throw new Error('No active brain found.')

  const updatedSections = {
    ...CURRENT_ACTIVE_BRAIN.sections,
    [sectionKey]: {
      ...CURRENT_ACTIVE_BRAIN.sections[sectionKey],
      content: newContent,
      updatedAt: new Date().toISOString()
    }
  }

  CURRENT_ACTIVE_BRAIN = {
    ...CURRENT_ACTIVE_BRAIN,
    sections: updatedSections,
    version: CURRENT_ACTIVE_BRAIN.version + 1,
    activatedAt: new Date().toISOString()
  }

  return CURRENT_ACTIVE_BRAIN
}

export async function runBrainTestsAction(
  brain?: VersionedSalesBrain
): Promise<BrainTestResult[]> {
  const targetBrain = brain || CURRENT_ACTIVE_BRAIN
  return runBrainTestSuite(targetBrain)
}

export async function simulateChatTurnAction(
  userUtterance: string,
  brain?: VersionedSalesBrain
): Promise<string> {
  const targetBrain = brain || CURRENT_ACTIVE_BRAIN
  void targetBrain
  const lower = userUtterance.toLowerCase()

  if (
    lower.includes('stop calling') ||
    lower.includes('remove') ||
    lower.includes('do not call') ||
    lower.includes('mat call karo')
  ) {
    return 'I completely understand and apologize for interrupting your day. I will remove your number from our contact list immediately. Have a great day ahead!'
  }

  if (lower.includes('human') || lower.includes('manager') || lower.includes('someone real')) {
    return `I would be glad to connect you with our solutions specialist, ${DEFAULT_DISCOVERY_DATA.handoffRules.contactPersonName}. Let me transfer the details right away.`
  }

  if (lower.includes('price') || lower.includes('cost') || lower.includes('discount')) {
    return `Our approved pricing structure is $1,500 setup + $50 per qualified booked meeting. As an AI representative, I am strictly not authorized to negotiate custom discounts, but I can connect you with our founder.`
  }

  if (
    lower.includes('quantum') ||
    lower.includes('sap 1998') ||
    lower.includes('unsupported')
  ) {
    return "I don't have that specific technical integration detail on hand right now. Let me check with our solutions engineering team and get back to you."
  }

  return `Thank you for asking. At Desynthic, we deploy voice-first AI sales employees that engage prospects, handle objections, and book qualified meetings on your calendar. May I share a quick 20-minute demo on Tuesday?`
}
