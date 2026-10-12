import { HumanSalesRep, InboundCallLog, SupportedLanguage } from '@/types/phase7'

export interface InboundCallRequest {
  callerNumber: string
  prospectName?: string
  company?: string
  spokenUtterance: string
  detectedLanguage?: SupportedLanguage
  estimatedCompanySize?: number
}

export interface InboundRoutingDecision {
  action: 'ai_handled' | 'human_transfer' | 'after_hours_voicemail'
  targetRep?: HumanSalesRep
  whisperBriefing?: string
  assignedLanguage: SupportedLanguage
  greetingResponse: string
  log: InboundCallLog
}

/**
 * Evaluates incoming call and routes dynamically to AI or an available human sales rep.
 */
export function routeInboundCall(
  request: InboundCallRequest,
  workspaceId: string,
  availableReps: HumanSalesRep[]
): InboundRoutingDecision {
  const utteranceLower = request.spokenUtterance.toLowerCase()
  const language: SupportedLanguage = request.detectedLanguage || 'en'

  const isHumanRequested =
    utteranceLower.includes('human') ||
    utteranceLower.includes('person') ||
    utteranceLower.includes('manager') ||
    utteranceLower.includes('transfer me') ||
    utteranceLower.includes('talk to someone real')

  const isEnterprise =
    (request.estimatedCompanySize && request.estimatedCompanySize > 100) ||
    utteranceLower.includes('enterprise') ||
    utteranceLower.includes('custom contract') ||
    utteranceLower.includes('security review')

  // Check if we should warm transfer to human
  if (isHumanRequested || isEnterprise) {
    const suitableRep = availableReps.find(
      (r) => r.status === 'available' && (isEnterprise ? r.tier === 'enterprise' : true)
    ) || availableReps.find((r) => r.status === 'available')

    if (suitableRep) {
      const whisperBriefing = `Incoming warm transfer: ${request.prospectName || 'Prospect'} from ${
        request.company || 'Direct Inbound'
      }. Intent: ${isEnterprise ? 'Enterprise Contract Inquiry' : 'Requested Human Rep'}. Language: ${language}.`

      return {
        action: 'human_transfer',
        targetRep: suitableRep,
        whisperBriefing,
        assignedLanguage: language,
        greetingResponse: `I would be glad to connect you with our solutions specialist, ${suitableRep.name}. Please stay on the line while I bridge the call.`,
        log: {
          id: `inbound_${Date.now()}`,
          workspaceId,
          callerNumber: request.callerNumber,
          language,
          intentDetected: isEnterprise ? 'Enterprise Inbound Inquiry' : 'Human Escalation Request',
          routedTo: 'human_rep',
          transferredToRepName: suitableRep.name,
          resolution: 'escalated',
          durationSeconds: 45,
          createdAt: new Date().toISOString()
        }
      }
    }
  }

  // Handle autonomously via AI Sales Agent
  return {
    action: 'ai_handled',
    assignedLanguage: language,
    greetingResponse: `Thank you for calling Desynthic! I am Priya, our AI sales representative. How may I assist your team today?`,
    log: {
      id: `inbound_${Date.now()}`,
      workspaceId,
      callerNumber: request.callerNumber,
      language,
      intentDetected: 'General Inbound Discovery & Qualification',
      routedTo: 'ai_agent',
      resolution: 'qualified',
      durationSeconds: 180,
      createdAt: new Date().toISOString()
    }
  }
}
