import { Campaign, Lead, SchedulerRunResult } from '@/types/campaign'

export interface CallingHoursCheck {
  allowed: boolean
  reason?: string
  currentIstTime: string
  dayOfWeek: string
}

/**
 * Checks whether current or given time is within permissible calling hours in IST.
 * Rules:
 * - Sundays off (never call on Sunday)
 * - Window: start (default 10:00) to end (default 18:00) in Asia/Kolkata
 */
export function checkCallingHours(
  checkDate: Date = new Date(),
  windowStart: string = '10:00',
  windowEnd: string = '18:00'
): CallingHoursCheck {
  // Convert to IST offset (+5 hours 30 mins)
  const istOffsetMs = 5.5 * 60 * 60 * 1000
  const istTime = new Date(checkDate.getTime() + istOffsetMs)

  const dayOfWeekNumber = istTime.getUTCDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dayOfWeek = days[dayOfWeekNumber]

  const hours = istTime.getUTCHours()
  const minutes = istTime.getUTCMinutes()
  const currentMinutes = hours * 60 + minutes

  const [startH, startM] = windowStart.split(':').map(Number)
  const [endH, endM] = windowEnd.split(':').map(Number)
  const windowStartMinutes = startH * 60 + (startM || 0)
  const windowEndMinutes = endH * 60 + (endM || 0)

  const formattedIst = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} IST (${dayOfWeek})`

  if (dayOfWeekNumber === 0) {
    return {
      allowed: false,
      reason: 'Sundays are off. No outbound calls allowed on Sunday.',
      currentIstTime: formattedIst,
      dayOfWeek,
    }
  }

  if (currentMinutes < windowStartMinutes || currentMinutes >= windowEndMinutes) {
    return {
      allowed: false,
      reason: `Outside calling hours. Permitted window is ${windowStart} to ${windowEnd} IST. Current: ${formattedIst}`,
      currentIstTime: formattedIst,
      dayOfWeek,
    }
  }

  return {
    allowed: true,
    currentIstTime: formattedIst,
    dayOfWeek,
  }
}

/**
 * Resets stuck leads that were initiated but not completed within timeout.
 */
export function recoverStuckLeads(leads: Lead[], timeoutMinutes: number = 10): number {
  let recovered = 0
  const cutoff = Date.now() - timeoutMinutes * 60 * 1000

  for (const lead of leads) {
    if (lead.status === 'CALLED' && lead.lastCalledAt) {
      const calledTime = new Date(lead.lastCalledAt).getTime()
      if (calledTime < cutoff && lead.attempts < 3) {
        lead.status = 'READY'
        lead.updatedAt = new Date().toISOString()
        recovered++
      }
    }
  }
  return recovered
}

/**
 * Core Scheduler Engine:
 * Evaluates campaign leads against calling hours, DND, daily cap, retry gap, and max attempts.
 */
export function runSchedulerCycle(params: {
  campaign: Campaign
  leads: Lead[]
  currentTime?: Date
  allowListedNumbers?: string[]
  dispatchFn?: (lead: Lead) => Promise<{ success: boolean; callId?: string; error?: string }>
}): {
  result: SchedulerRunResult
  updatedCampaign: Campaign
  updatedLeads: Lead[]
} {
  const { campaign, leads, currentTime = new Date(), allowListedNumbers } = params
  const skippedReasons: SchedulerRunResult['skippedReasons'] = {}
  const dispatchedCallIds: string[] = []
  let callsDispatched = 0

  // 1. If campaign is not running, stop immediately within this cycle
  if (campaign.status !== 'running') {
    skippedReasons.campaignPaused = leads.length
    return {
      result: {
        campaignId: campaign.id,
        timestamp: currentTime.toISOString(),
        leadsEvaluated: leads.length,
        callsDispatched: 0,
        skippedReasons,
        dispatchedCallIds,
      },
      updatedCampaign: { ...campaign },
      updatedLeads: [...leads],
    }
  }

  // 2. Check calling hours & Sundays off in IST
  const hoursCheck = checkCallingHours(
    currentTime,
    campaign.callWindowStart,
    campaign.callWindowEnd
  )

  if (!hoursCheck.allowed) {
    if (hoursCheck.dayOfWeek === 'Sunday') {
      skippedReasons.sunday = leads.length
    } else {
      skippedReasons.outsideCallingHours = leads.length
    }
    return {
      result: {
        campaignId: campaign.id,
        timestamp: currentTime.toISOString(),
        leadsEvaluated: leads.length,
        callsDispatched: 0,
        skippedReasons,
        dispatchedCallIds,
      },
      updatedCampaign: { ...campaign },
      updatedLeads: [...leads],
    }
  }

  // 3. Recover stuck leads
  recoverStuckLeads(leads)

  const updatedLeads = [...leads]
  let currentCallsToday = campaign.callsToday

  for (const lead of updatedLeads) {
    // Check Daily Cap
    if (currentCallsToday >= campaign.dailyCap) {
      skippedReasons.dailyCapReached = (skippedReasons.dailyCapReached || 0) + 1
      continue
    }

    // Check DND
    if (lead.dnd) {
      skippedReasons.dnd = (skippedReasons.dnd || 0) + 1
      continue
    }

    // Check Max Attempts
    if (lead.attempts >= campaign.maxAttempts) {
      skippedReasons.maxAttemptsReached = (skippedReasons.maxAttemptsReached || 0) + 1
      continue
    }

    // Check Lifecycle State
    const isReady = lead.status === 'READY'
    const isDueFollowUp =
      lead.status === 'FOLLOW-UP' &&
      (!lead.nextFollowUp || new Date(lead.nextFollowUp).getTime() <= currentTime.getTime())

    if (!isReady && !isDueFollowUp) {
      skippedReasons.notReadyOrFollowUp = (skippedReasons.notReadyOrFollowUp || 0) + 1
      continue
    }

    // Check Retry Gap
    if (lead.lastCalledAt) {
      const elapsedHours =
        (currentTime.getTime() - new Date(lead.lastCalledAt).getTime()) / (1000 * 60 * 60)
      if (elapsedHours < campaign.retryGapHours) {
        skippedReasons.retryGapNotElapsed = (skippedReasons.retryGapNotElapsed || 0) + 1
        continue
      }
    }

    // Check Safety Gate in development if allow-list is passed
    if (allowListedNumbers && !allowListedNumbers.includes(lead.phone)) {
      skippedReasons.blockedBySafety = (skippedReasons.blockedBySafety || 0) + 1
      continue
    }

    // Lead is approved for dispatch!
    const callId = `call_${Date.now()}_${lead.id}`
    dispatchedCallIds.push(callId)
    callsDispatched++
    currentCallsToday++

    lead.attempts += 1
    lead.status = 'CALLED'
    lead.lastCalledAt = currentTime.toISOString()
    lead.updatedAt = currentTime.toISOString()
  }

  const updatedCampaign: Campaign = {
    ...campaign,
    callsToday: currentCallsToday,
    lastRunAt: currentTime.toISOString(),
    status: currentCallsToday >= campaign.dailyCap ? 'running' : campaign.status,
  }

  return {
    result: {
      campaignId: campaign.id,
      timestamp: currentTime.toISOString(),
      leadsEvaluated: leads.length,
      callsDispatched,
      skippedReasons,
      dispatchedCallIds,
    },
    updatedCampaign,
    updatedLeads,
  }
}
