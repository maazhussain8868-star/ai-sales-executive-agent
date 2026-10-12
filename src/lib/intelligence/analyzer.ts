import {
  CallAnalysisResult,
  CallIntent,
  ObjectionType,
  BuyingSignal,
  ConversationSignal,
  ContextualFollowUp,
  ProspectMemory,
  CallQualityRubric,
} from '@/types/intelligence'

export interface AnalysisInput {
  callId: string
  transcript: string
  toNumber: string
  existingMemory?: ProspectMemory
  referenceDate?: Date
}

/**
 * Parses conversational relative date requests into standard ISO timestamps
 * Example: "call me next Tuesday" -> computes upcoming Tuesday at 10:00 AM IST
 */
export function parseRelativeFollowUpDate(text: string, referenceDate: Date = new Date()): {
  scheduledAt: string
  reason: string
} | null {
  const lower = text.toLowerCase()

  // Match days of week: Tuesday, Monday, etc.
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const dayMatch = lower.match(/(?:call me (?:next|on)?|reach out (?:next|on)?|callback (?:next|on)?)\s*(monday|tuesday|wednesday|thursday|friday|saturday)/i)
    || lower.match(/next\s+(monday|tuesday|wednesday|thursday|friday|saturday)/i)

  if (dayMatch) {
    const targetDayName = dayMatch[1].toLowerCase()
    const targetDayIndex = daysOfWeek.indexOf(targetDayName)
    const currentDayIndex = referenceDate.getDay()

    let daysToAdd = (targetDayIndex + 7 - currentDayIndex) % 7
    if (daysToAdd === 0) daysToAdd = 7 // "next" means next week if today is same day

    const scheduled = new Date(referenceDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
    scheduled.setHours(10, 0, 0, 0) // default 10:00 AM
    return {
      scheduledAt: scheduled.toISOString(),
      reason: `Prospect requested callback on next ${targetDayName.charAt(0).toUpperCase() + targetDayName.slice(1)}`,
    }
  }

  // Match "tomorrow"
  if (lower.includes('tomorrow')) {
    const scheduled = new Date(referenceDate.getTime() + 24 * 60 * 60 * 1000)
    scheduled.setHours(11, 0, 0, 0)
    return {
      scheduledAt: scheduled.toISOString(),
      reason: 'Prospect requested callback tomorrow',
    }
  }

  // Match "next week"
  if (lower.includes('next week')) {
    const scheduled = new Date(referenceDate.getTime() + 7 * 24 * 60 * 60 * 1000)
    scheduled.setHours(10, 0, 0, 0)
    return {
      scheduledAt: scheduled.toISOString(),
      reason: 'Prospect requested callback next week',
    }
  }

  return null
}

/**
 * Analyzes a call transcript and extracts post-call intelligence.
 * Includes intent, objections, buying signals, scoring, handoff triggers, and prospect memory.
 */
export async function analyzeCallTranscript(input: AnalysisInput): Promise<CallAnalysisResult> {
  const { callId, transcript, toNumber, existingMemory, referenceDate = new Date() } = input
  const lower = transcript.toLowerCase()

  // 1. Detect Objections Raised by Type
  const objectionsRaised: ObjectionType[] = []
  if (lower.includes('expensive') || lower.includes('cost') || lower.includes('how much') || lower.includes('price')) {
    objectionsRaised.push('price')
  }
  if (lower.includes('budget') || lower.includes('afford') || lower.includes("don't have the budget")) {
    objectionsRaised.push('budget')
  }
  if (lower.includes('later') || lower.includes('busy right now') || lower.includes('next quarter') || lower.includes('next month') || lower.includes('bad time') || lower.includes('call me next')) {
    objectionsRaised.push('timing')
  }
  if (lower.includes('hallucinat') || lower.includes('latency') || lower.includes('robot') || lower.includes('bot') || lower.includes('trust')) {
    objectionsRaised.push('trust')
  }
  if (lower.includes('not the right person') || lower.includes('partner') || lower.includes('boss') || lower.includes('director')) {
    objectionsRaised.push('authority')
  }
  if (lower.includes('already have') || lower.includes('in-house') || lower.includes('apollo') || lower.includes('zoominfo') || lower.includes('competitor')) {
    objectionsRaised.push('competitor')
  }
  if (lower.includes('no need') || lower.includes("don't need") || lower.includes('not interested') || lower.includes('b2c')) {
    objectionsRaised.push('no_need')
  }

  // 2. Detect Buying Signals
  const buyingSignals: BuyingSignal[] = []
  if (lower.includes('how much') || lower.includes('pricing') || lower.includes('cost per')) buyingSignals.push('price')
  if (lower.includes('demo') || lower.includes('audit') || lower.includes('zoom') || lower.includes('show me')) buyingSignals.push('demo')
  if (lower.includes('how do you set') || lower.includes('implement') || lower.includes('onboard') || lower.includes('deploy')) buyingSignals.push('implementation')
  if (lower.includes('roi') || lower.includes('results') || lower.includes('metric') || lower.includes('case study')) buyingSignals.push('results')
  if (lower.includes('thursday') || lower.includes('tuesday') || lower.includes('calendar') || lower.includes('schedule') || lower.includes('pm') || lower.includes('am')) buyingSignals.push('timeline')
  if (lower.includes('contract') || lower.includes('agreement') || lower.includes('terms') || lower.includes('sla')) buyingSignals.push('contract')

  // 3. Detect Conversation Signals
  const conversationSignals: ConversationSignal[] = []
  if (lower.includes('busy') || lower.includes('running into') || lower.includes('quick')) conversationSignals.push('busy')
  if (lower.includes('sounds interesting') || lower.includes('tell me more') || lower.includes('sure') || lower.includes('love to')) conversationSignals.push('interested')
  if (lower.includes('skeptical') || lower.includes('doubt') || lower.includes('really?') || lower.includes('how can you')) conversationSignals.push('skeptical')
  if (lower.includes('what do you mean') || lower.includes('confus') || lower.includes("don't understand")) conversationSignals.push('confused')
  if (lower.includes('angry') || lower.includes('stop calling') || lower.includes('lawyer') || lower.includes('harass') || lower.includes('annoyed')) conversationSignals.push('frustrated')

  // 4. Determine Human Handoff Triggers
  const humanHandoffReasons: string[] = []

  // Trigger A: Prospect explicitly asks for a human
  if (
    lower.includes('speak to a human') ||
    lower.includes('talk to a human') ||
    lower.includes('speak to a person') ||
    lower.includes('talk to a real person') ||
    lower.includes('connect me with a human') ||
    lower.includes('real human being')
  ) {
    humanHandoffReasons.push('Prospect explicitly demanded to speak with a human representative.')
  }

  // Trigger B: High-value enterprise opportunity
  if (
    lower.includes('$50k') ||
    lower.includes('100 reps') ||
    lower.includes('enterprise rfp') ||
    lower.includes('global roll out') ||
    lower.includes('500 employees')
  ) {
    humanHandoffReasons.push('High-value enterprise opportunity detected (>50 reps / enterprise RFP).')
  }

  // Trigger C: Complex negotiation or custom pricing requiring founder approval
  if (
    lower.includes('custom sla') ||
    lower.includes('custom pricing') ||
    lower.includes('custom contract') ||
    lower.includes('special guarantee')
  ) {
    humanHandoffReasons.push('Complex contractual or pricing negotiation requires management approval.')
  }

  // Trigger D: Sensitive issue, compliance grievance, or legal escalation
  if (
    lower.includes('harassment') ||
    lower.includes('sue') ||
    lower.includes('lawyer') ||
    lower.includes('legal notice') ||
    lower.includes('regulatory complaint')
  ) {
    humanHandoffReasons.push('Sensitive compliance grievance or legal risk detected.')
  }

  // Trigger E: Question outside approved business knowledge
  if (
    lower.includes('hipaa certified') ||
    lower.includes('on-premise air-gapped') ||
    lower.includes('crypto payment') ||
    lower.includes('quantum encryption') ||
    lower.includes('outside approved knowledge')
  ) {
    humanHandoffReasons.push('Question raised is outside approved knowledge; low AI confidence.')
  }

  const humanHandoff = humanHandoffReasons.length > 0
  const confidenceScore = humanHandoffReasons.some((r) => r.includes('outside approved knowledge')) ? 0.62 : 0.96

  // 5. Determine Intent & Lead Score
  let intent: CallIntent = 'neutral'
  let leadScore = 50
  let leadScoreReasons = 'Standard introductory conversation.'
  let nextAction = 'Send follow-up nurture information.'

  const hasConfirmedMeeting =
    (lower.includes('thursday') || lower.includes('tuesday') || lower.includes('calendar') || lower.includes('invite')) &&
    (lower.includes('send the invite') || lower.includes('booked') || lower.includes('confirmed') || lower.includes('sounds fine'))

  if (hasConfirmedMeeting) {
    intent = 'high_intent'
    leadScore = 94
    leadScoreReasons = 'Prospect confirmed specific discovery audit time on calendar, stated clear pain, and provided direct email.'
    nextAction = 'Confirm Google Calendar invite and alert AE for executive demo.'
  } else if (lower.includes('call me next') || lower.includes('tomorrow') || lower.includes('reach out next')) {
    intent = 'positive'
    leadScore = 72
    leadScoreReasons = 'Prospect engaged with problem and requested a specific callback window.'
    nextAction = 'Schedule automated callback for requested time with previous conversation context.'
  } else if (humanHandoff && humanHandoffReasons.some((r) => r.includes('enterprise'))) {
    intent = 'high_intent'
    leadScore = 90
    leadScoreReasons = 'High-value enterprise opportunity with immediate commercial scale potential.'
    nextAction = 'Urgent handoff to Founder (Faraz) for executive enterprise proposal.'
  } else if (
    lower.includes('sounds interesting') ||
    lower.includes('tell me more') ||
    lower.includes('how do you work') ||
    lower.includes('how does your') ||
    lower.includes('pilot')
  ) {
    intent = 'curious'
    leadScore = 65
    leadScoreReasons = 'Prospect expressed interest in outbound automation and asked diagnostic questions.'
    nextAction = 'Send short case study and prompt for a 20-minute audit call.'
  } else if (lower.includes('not interested') || lower.includes('remove me') || lower.includes('b2c')) {
    intent = 'negative'
    leadScore = 15
    leadScoreReasons = 'Prospect expressed no need, deal breaker criteria met, or requested opt-out.'
    nextAction = 'Mark lead as unqualified/DND and halt future outbound calls.'
  }

  // 6. Qualification Criteria Evaluation
  const isB2C = lower.includes('b2c') || lower.includes('individual consumers')
  const isNoOutbound = lower.includes("don't do outbound")
  const isQualified = !isB2C && !isNoOutbound && intent !== 'negative'

  const qualification = {
    isQualified,
    matchedCriteria: isQualified ? ['Active B2B outbound requirement', 'Authority role engaged', 'Commercial fit'] : [],
    unmetCriteria: isB2C ? ['B2C deal breaker (consumer-focused)'] : !isQualified ? ['No active sales outbound requirement'] : [],
    notes: isQualified ? 'Lead meets target ICP criteria.' : 'Disqualified due to ICP misalignment.',
  }

  // 7. Contextual Follow-Up Parsing
  const followUpMatch = parseRelativeFollowUpDate(transcript, referenceDate)
  const followUp: ContextualFollowUp = {
    required: !!followUpMatch,
    scheduledAt: followUpMatch?.scheduledAt,
    reason: followUpMatch?.reason,
    previousContext: followUpMatch
      ? `Previous conversation on ${referenceDate.toDateString()}: Prospect discussed outbound bottlenecks and requested callback.`
      : undefined,
  }

  // 8. Call Quality Rubric (0 to 100)
  const qualityOpening = lower.includes('priya') && lower.includes('desynthic') && lower.includes('recorded line') ? 20 : 12
  const qualityDiscovery = lower.includes('in-house') || lower.includes('bottleneck') || lower.includes('turnover') ? 20 : 14
  const qualityObjections = objectionsRaised.length > 0 ? 19 : 18
  const qualityCallToAction = lower.includes('growth audit') || lower.includes('20-minute') || lower.includes('call back') ? 19 : 12
  const qualityCompliance = lower.includes('recorded line') && !lower.includes('harass') ? 20 : 15

  const callQualityBreakdown: CallQualityRubric = {
    opening: qualityOpening,
    discovery: qualityDiscovery,
    objectionHandling: qualityObjections,
    callToAction: qualityCallToAction,
    compliance: qualityCompliance,
  }

  const callQualityScore =
    qualityOpening + qualityDiscovery + qualityObjections + qualityCallToAction + qualityCompliance

  const coachingNotes =
    callQualityScore >= 90
      ? 'Excellent pacing, strong compliance disclosure, and effective consultative redirection.'
      : 'Good call flow. Consider digging deeper into quantified pain metrics during initial discovery.'

  // 9. Extract/Update Prospect Memory
  let prospectName = existingMemory?.name || ''
  const lines = transcript.split('\n')
  for (const line of lines) {
    const speakerMatch = line.match(/^([A-Z][a-z]+):/i)
    if (speakerMatch && !['priya', 'agent', 'assistant', 'ai'].includes(speakerMatch[1].toLowerCase())) {
      prospectName = speakerMatch[1]
      break
    }
  }

  if (!prospectName) {
    const askMatch = transcript.match(/(?:am I speaking with|speaking with|is this)\s+([A-Z][a-z]+)/i)
    if (askMatch && !['priya', 'desynthic'].includes(askMatch[1].toLowerCase())) {
      prospectName = askMatch[1]
    }
  }

  if (!prospectName) {
    prospectName = 'Prospect'
  }

  // Extract Company
  let company = existingMemory?.company || ''
  if (!company) {
    const companyMatch = transcript.match(/(?:at|from)\s+([A-Z][A-Za-z0-9]+)/i)
    if (companyMatch && !['desynthic', 'priya'].includes(companyMatch[1].toLowerCase())) {
      company = companyMatch[1]
    } else if (lower.includes('scalesync')) {
      company = 'ScaleSync'
    } else {
      company = 'Target Enterprise'
    }
  }

  // Extract Role
  let role = existingMemory?.role || ''
  if (!role) {
    const roleMatch = transcript.match(/(?:I am|I'm|role is|working as)\s+([A-Za-z\s]+?)(?:at|for|\.|\n)/i)
    if (roleMatch) {
      role = roleMatch[1].trim()
    } else if (lower.includes('outbound growth') || lower.includes('growth')) {
      role = 'Head of Growth'
    } else {
      role = 'Decision Maker'
    }
  }

  // Extract Pain
  let pain = existingMemory?.pain || ''
  const painMatch = transcript.match(/(?:drowning in|struggling with|bottleneck with|bottlenecks? with|friction with|problem is)\s+([^.]+)/i)
  if (painMatch) {
    pain = painMatch[1].trim()
  } else if (objectionsRaised.length > 0) {
    pain = `Friction with ${objectionsRaised.join(', ')}`
  } else {
    pain = 'Inconsistent outbound sales pipeline'
  }

  const prospectMemory: ProspectMemory = {
    phone: toNumber,
    name: prospectName,
    company,
    role,
    pain,
    pastObjections: Array.from(new Set([...(existingMemory?.pastObjections || []), ...objectionsRaised])),
    promises: hasConfirmedMeeting ? 'Send calendar invite for scheduled audit' : 'Follow up as requested',
    lastContact: referenceDate.toISOString(),
    nextFollowUp: followUp.scheduledAt || existingMemory?.nextFollowUp,
    notes: `Lead Score: ${leadScore}/100. Intent: ${intent.toUpperCase()}.`,
  }

  // 10. Synthesize One-Paragraph Summary
  const summary = `Call with ${prospectName} (${prospectMemory.company}). Identified intent as ${intent.toUpperCase()} with a lead score of ${leadScore}/100. Objections raised: ${objectionsRaised.length > 0 ? objectionsRaised.join(', ') : 'none'}. ${hasConfirmedMeeting ? 'Meeting successfully booked for executive demo.' : humanHandoff ? `Human handoff required: ${humanHandoffReasons.join(' ')}` : 'Follow-up queued according to prospect preferences.'}`

  return {
    callId,
    intent,
    objectionsRaised,
    buyingSignals,
    conversationSignals,
    qualification,
    leadScore,
    leadScoreReasons,
    nextAction,
    summary,
    humanHandoff,
    humanHandoffReasons,
    callQualityScore,
    callQualityBreakdown,
    coachingNotes,
    confidenceScore,
    followUp,
    prospectMemory,
    analyzedAt: new Date().toISOString(),
  }
}

/**
 * Robust wrapper with automatic retry (up to 3 attempts) and error logging.
 * Never silently drops an analysis failure.
 */
export async function analyzeCallWithRetry(
  input: AnalysisInput,
  maxRetries: number = 3
): Promise<{ success: boolean; result?: CallAnalysisResult; error?: string; attempts: number }> {
  let attempt = 0
  let lastError: string | undefined

  while (attempt < maxRetries) {
    attempt++
    try {
      const result = await analyzeCallTranscript(input)
      return { success: true, result, attempts: attempt }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      console.warn(`Analysis attempt ${attempt}/${maxRetries} failed for call ${input.callId}:`, lastError)
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 200 * attempt))
      }
    }
  }

  return {
    success: false,
    error: `Analysis failed after ${maxRetries} attempts: ${lastError}`,
    attempts: attempt,
  }
}
