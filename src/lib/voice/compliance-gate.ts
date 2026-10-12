export interface ComplianceValidationOptions {
  toNumber: string
  voicePrompt: string
  isDnd?: boolean
  allowList?: string[]
  checkCallingHours?: boolean
  now?: Date
}

export interface ComplianceValidationResult {
  allowed: boolean
  code?: 'ALLOWLIST_BLOCKED' | 'DND_BLOCKED' | 'CALLING_HOURS_BLOCKED' | 'MISSING_AI_DISCLOSURE' | 'INVALID_PHONE'
  reason?: string
}

/**
 * Standardizes phone numbers to standard format (removes dashes, spaces)
 */
export function normalizePhoneNumber(phone: string): string {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '')
  if (cleaned.startsWith('91') && !cleaned.startsWith('+')) {
    return `+${cleaned}`
  }
  return cleaned
}

/**
 * Validates compliance before any call dispatch
 */
export function validateCallCompliance(options: ComplianceValidationOptions): ComplianceValidationResult {
  const { toNumber, voicePrompt, isDnd = false, checkCallingHours = false, now = new Date() } = options

  // 1. Phone number format validation
  const normalizedPhone = normalizePhoneNumber(toNumber)
  if (!normalizedPhone || normalizedPhone.length < 10) {
    return {
      allowed: false,
      code: 'INVALID_PHONE',
      reason: `BLOCKED: Invalid phone number format: "${toNumber}". Expected format like +919876543210.`,
    }
  }

  // 2. Allow-list check for safety in development
  const envAllowList = (process.env.VOICE_ALLOW_LIST || '+919876543210,+919999999999')
    .split(',')
    .map((num) => normalizePhoneNumber(num.trim()))
    .filter(Boolean)

  const activeAllowList = (options.allowList && options.allowList.length > 0)
    ? options.allowList.map((num) => normalizePhoneNumber(num.trim()))
    : envAllowList

  const isAllowed = activeAllowList.some((allowedNum) => allowedNum === normalizedPhone)
  if (!isAllowed) {
    return {
      allowed: false,
      code: 'ALLOWLIST_BLOCKED',
      reason: `BLOCKED: Phone number ${normalizedPhone} is not on the allow-list. In development, calls may only be placed to verified allow-listed numbers (${activeAllowList.join(', ')}).`,
    }
  }

  // 3. DND (Do Not Disturb) Check
  if (isDnd) {
    return {
      allowed: false,
      code: 'DND_BLOCKED',
      reason: `BLOCKED: Number ${normalizedPhone} is registered on the National DND register or has opted out of calls.`,
    }
  }

  // 4. Calling Hours Check (10:00 to 18:30 IST, Monday-Saturday, Sunday off)
  if (checkCallingHours) {
    // Convert to IST (UTC + 5:30)
    const istOffsetMs = 5.5 * 60 * 60 * 1000
    const istTime = new Date(now.getTime() + istOffsetMs)
    const dayOfWeek = istTime.getUTCDay() // 0 = Sunday

    if (dayOfWeek === 0) {
      return {
        allowed: false,
        code: 'CALLING_HOURS_BLOCKED',
        reason: 'BLOCKED: Outbound calling is strictly prohibited on Sundays per calling compliance rules.',
      }
    }

    const hours = istTime.getUTCHours()
    const minutes = istTime.getUTCMinutes()
    const timeInMinutes = hours * 60 + minutes

    const startMinutes = 10 * 60 // 10:00 AM
    const endMinutes = 18 * 60 + 30 // 6:30 PM

    if (timeInMinutes < startMinutes || timeInMinutes > endMinutes) {
      return {
        allowed: false,
        code: 'CALLING_HOURS_BLOCKED',
        reason: `BLOCKED: Current time (${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} IST) is outside permitted calling hours (10:00 AM to 6:30 PM IST).`,
      }
    }
  }

  // 5. Mandatory AI Disclosure Line Check
  const lowerPrompt = (voicePrompt || '').toLowerCase()
  const hasAiDisclosure =
    (lowerPrompt.includes('ai') || lowerPrompt.includes('artificial intelligence') || lowerPrompt.includes('assistant')) &&
    (lowerPrompt.includes('recorded line') || lowerPrompt.includes('calling from') || lowerPrompt.includes('disclosure'))

  if (!hasAiDisclosure) {
    return {
      allowed: false,
      code: 'MISSING_AI_DISCLOSURE',
      reason: 'BLOCKED: Voice prompt does not contain a verified AI disclosure statement in the opening greeting.',
    }
  }

  return { allowed: true }
}
