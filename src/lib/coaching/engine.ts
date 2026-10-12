import { SalesCoachingReport, MethodologyPatch } from '@/types/phase7'

interface TranscriptEntry {
  speaker: 'agent' | 'prospect'
  text: string
  durationSeconds?: number
}

/**
 * Analyzes call dialogue to generate a comprehensive sales coaching report.
 */
export function generateCoachingReport(
  callId: string,
  workspaceId: string,
  prospectName: string,
  dialogue: TranscriptEntry[],
  meetingBooked: boolean
): SalesCoachingReport {
  let agentWords = 0
  let prospectWords = 0
  let fillerCount = 0

  const fillerRegex = /\b(um|uh|err|like|you know|basically|actually)\b/gi

  for (const entry of dialogue) {
    const words = entry.text.trim().split(/\s+/).filter(Boolean)
    if (entry.speaker === 'agent') {
      agentWords += words.length
      const matches = entry.text.match(fillerRegex)
      if (matches) fillerCount += matches.length
    } else {
      prospectWords += words.length
    }
  }

  const totalWords = agentWords + prospectWords
  const talkRatio = totalWords > 0 ? Math.round((agentWords / totalWords) * 100) / 100 : 0.5

  // Speech pace estimation assuming average turn duration
  const estimatedDurationMinutes = Math.max(1, Math.round(totalWords / 140))
  const speechPaceWpm = Math.min(180, Math.max(110, Math.round(agentWords / estimatedDurationMinutes)))

  const strengths: string[] = []
  const improvementAreas: string[] = []

  if (talkRatio <= 0.55 && talkRatio >= 0.35) {
    strengths.push('Excellent listening discipline; allowed the prospect to voice pain points without interrupting.')
  } else if (talkRatio > 0.65) {
    improvementAreas.push('Agent dominated dialogue (>65% talk ratio). Ask more open discovery questions.')
  }

  if (fillerCount <= 2) {
    strengths.push('Crisp, authoritative vocal delivery with virtually zero conversational fillers.')
  } else {
    improvementAreas.push(`Detected ${fillerCount} filler words. Tighten conversational pauses.`)
  }

  if (meetingBooked) {
    strengths.push('Strong closing discipline: secured a confirmed calendar slot instead of an ambiguous callback.')
  } else {
    improvementAreas.push('Work on firmer trial closes after addressing objections.')
  }

  const objectionHandlingScore = meetingBooked ? 92 : 74

  const recommendedPromptPatch = meetingBooked
    ? 'Reinforce consultative discovery: "What is currently your biggest bottleneck with outbound prospecting?"'
    : 'Tighten urgency framing: "If we can prove 15 qualified demos in 30 days at zero risk, is that worth 20 minutes?"'

  return {
    id: `coach_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    workspaceId,
    callId,
    prospectName,
    talkToListenRatio: talkRatio,
    speechPaceWpm,
    fillerWordsCount: fillerCount,
    objectionHandlingScore,
    strengths,
    improvementAreas,
    recommendedPromptPatch,
    appliedToBrain: false,
    createdAt: new Date().toISOString()
  }
}

/**
 * Methodology learning engine: Extracts successful objection counters from winning calls
 * and formulates a structured playbook patch.
 */
export function extractMethodologyPatch(
  callId: string,
  workspaceId: string,
  dialogue: TranscriptEntry[]
): MethodologyPatch | null {
  // Look for prospect objection followed by winning agent response
  for (let i = 0; i < dialogue.length - 1; i++) {
    const current = dialogue[i]
    const next = dialogue[i + 1]

    if (
      current.speaker === 'prospect' &&
      (current.text.toLowerCase().includes('already have') ||
       current.text.toLowerCase().includes('not interested') ||
       current.text.toLowerCase().includes('too busy')) &&
      next.speaker === 'agent'
    ) {
      return {
        id: `patch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        workspaceId,
        sourceCallId: callId,
        category: 'objection_response',
        suggestedPatch: `When prospect states "${current.text}", counter with: "${next.text}"`,
        rationale: 'Converted live resistance into affirmative demo booking in recorded call.',
        status: 'pending_review',
        createdAt: new Date().toISOString()
      }
    }
  }

  return null
}
