import { LeadV2, ContactChannel, CanContactResult } from '@/types/campaign-v2'

// In-memory suppression list for opt-outs and manual blacklists
const GLOBAL_SUPPRESSION_LIST = new Set<string>([
  '+919876500000', // Pre-seeded opt-out
  '+919876511111'  // Pre-seeded compliance exclusion
])

// Mock DND / NDNC registry database
const MOCK_NDNC_REGISTRY = new Set<string>([
  '+919876522222',
  '+919876533333'
])

export interface CanContactAuditLog {
  leadId: string
  phone: string
  channel: ContactChannel
  allowed: boolean
  reason: string
  ruleViolated?: string
  checkedAt: string
}

const AUDIT_LOG: CanContactAuditLog[] = []

/**
 * Add a phone number to the global suppression list (e.g. from in-call opt-out).
 */
export function addToSuppressionList(
  phoneOrWorkspaceId: string,
  maybePhone?: string
): void {
  const phone = maybePhone && maybePhone.startsWith('+') ? maybePhone : phoneOrWorkspaceId;
  GLOBAL_SUPPRESSION_LIST.add(phone.trim());
}

/**
 * Check if a phone is in the suppression list.
 */
export function isSuppressed(
  phoneOrWorkspaceId: string,
  maybePhone?: string
): boolean {
  const phone = maybePhone && maybePhone.startsWith('+') ? maybePhone : phoneOrWorkspaceId;
  return GLOBAL_SUPPRESSION_LIST.has(phone.trim());
}

/**
 * Centralized compliance gate that EVERY outbound action must call before initiating contact.
 */
export function canContact(
  lead: Partial<LeadV2> & { phone?: string; phoneNumber?: string },
  channel: ContactChannel,
  now: Date = new Date()
): CanContactResult {
  const rawPhone = lead.phone || lead.phoneNumber || '';
  const phone = rawPhone.trim()

  // 1. Suppression / Opt-Out Check
  if (GLOBAL_SUPPRESSION_LIST.has(phone) || lead.status === 'OPTED_OUT') {
    const res: CanContactResult = {
      allowed: false,
      reason: `BLOCKED: Lead ${phone} has opted out or is on the global suppression list.`,
      ruleViolated: 'OPT_OUT',
      checkedAt: now.toISOString()
    }
    logAudit(lead, channel, res)
    return res
  }

  // 2. DND / NDNC Registry Check (Mock Adapter)
  if (MOCK_NDNC_REGISTRY.has(phone)) {
    const res: CanContactResult = {
      allowed: false,
      reason: `BLOCKED: Lead ${phone} is registered on the National Do Not Call (NDNC) registry.`,
      ruleViolated: 'DND_ACTIVE',
      checkedAt: now.toISOString()
    }
    logAudit(lead, channel, res)
    return res
  }

  // 3. Indian Calling Window & Sunday Shutdown Rules (for voice and proactive outreach)
  if (channel === 'voice' || channel === 'whatsapp') {
    // Parse time in lead's timeZone (default Asia/Kolkata)
    const timeZone = lead.timeZone || 'Asia/Kolkata'

    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    })

    const parts = formatter.formatToParts(now)
    let weekday = 'Mon'
    let hour = 12
    let minute = 0

    for (const part of parts) {
      if (part.type === 'weekday') weekday = part.value
      if (part.type === 'hour') hour = parseInt(part.value, 10)
      if (part.type === 'minute') minute = parseInt(part.value, 10)
    }

    // A. Sunday Shutdown
    if (weekday === 'Sun') {
      const res: CanContactResult = {
        allowed: false,
        reason: 'BLOCKED: Outbound sales outreach is strictly prohibited on Sundays as per calling regulations.',
        ruleViolated: 'SUNDAY_BLOCKED',
        checkedAt: now.toISOString()
      }
      logAudit(lead, channel, res)
      return res
    }

    // B. Calling Hours: 10:00 to 18:00
    const currentMinutes = hour * 60 + minute
    const startMinutes = 10 * 60 // 10:00 AM
    const endMinutes = 18 * 60   // 06:00 PM

    if (currentMinutes < startMinutes || currentMinutes >= endMinutes) {
      const res: CanContactResult = {
        allowed: false,
        reason: `BLOCKED: Current time in ${timeZone} (${hour}:${minute.toString().padStart(2, '0')}) is outside approved calling hours (10:00 - 18:00).`,
        ruleViolated: 'OUTSIDE_HOURS',
        checkedAt: now.toISOString()
      }
      logAudit(lead, channel, res)
      return res
    }
  }

  // Allowed
  const res: CanContactResult = {
    allowed: true,
    reason: `ALLOWED: Lead ${phone} passed all compliance, DND, suppression and calling hour checks.`,
    checkedAt: now.toISOString()
  }
  logAudit(lead, channel, res)
  return res
}

function logAudit(
  lead: Partial<LeadV2> & { leadId?: string; phoneNumber?: string },
  channel: ContactChannel,
  result: CanContactResult
): void {
  AUDIT_LOG.push({
    leadId: lead.id || lead.leadId || 'lead_unspecified',
    phone: (lead.phone || lead.phoneNumber || '').trim(),
    channel,
    allowed: result.allowed,
    reason: result.reason,
    ruleViolated: result.ruleViolated,
    checkedAt: result.checkedAt
  })
}

export function getCanContactAuditLogs(): CanContactAuditLog[] {
  return [...AUDIT_LOG]
}
