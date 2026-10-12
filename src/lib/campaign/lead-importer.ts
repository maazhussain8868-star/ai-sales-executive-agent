import { Lead, LeadImportResult } from '@/types/campaign'

/**
 * Normalizes phone numbers to standard E.164 +91 format for India.
 * Handles:
 * - 9876543210 -> +919876543210
 * - 09876543210 -> +919876543210
 * - 919876543210 -> +919876543210
 * - +91 98765 43210 -> +919876543210
 * - 00919876543210 -> +919876543210
 */
export function cleanPhoneNumber(raw: string): string | null {
  if (!raw || typeof raw !== 'string') return null

  // Strip spaces, dashes, dots, brackets
  let cleaned = raw.replace(/[\s\-\.\(\)]/g, '').trim()

  // Handle leading zeros or 00 prefix
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2)
  }

  if (cleaned.startsWith('+91')) {
    const digits = cleaned.slice(3)
    if (/^[6-9]\d{9}$/.test(digits)) {
      return `+91${digits}`
    }
  }

  if (cleaned.startsWith('91') && cleaned.length === 12) {
    const digits = cleaned.slice(2)
    if (/^[6-9]\d{9}$/.test(digits)) {
      return `+91${digits}`
    }
  }

  if (cleaned.startsWith('0') && cleaned.length === 11) {
    const digits = cleaned.slice(1)
    if (/^[6-9]\d{9}$/.test(digits)) {
      return `+91${digits}`
    }
  }

  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return `+91${cleaned}`
  }

  return null
}

/**
 * Parses CSV text content into structured leads.
 * Implements deduplication, DND detection, and phone formatting.
 */
export function parseLeadsCSV(
  csvContent: string,
  existingPhones: Set<string> = new Set()
): LeadImportResult {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (lines.length < 2) {
    return {
      totalRows: 0,
      importedCount: 0,
      duplicatesSkipped: 0,
      dndCount: 0,
      invalidPhoneCount: 0,
      leads: [],
      errors: ['CSV file is empty or missing data rows.'],
    }
  }

  const rawHeaders = lines[0].split(',').map((h) => h.replace(/^["']|["']$/g, '').trim())
  const headers = rawHeaders.map((h) => h.toLowerCase())

  // Find column indices
  const phoneIdx = headers.findIndex((h) =>
    ['phone', 'mobile', 'phone_number', 'contact', 'telephone', 'cell'].includes(h)
  )
  const nameIdx = headers.findIndex((h) => ['name', 'full_name', 'lead_name', 'prospect'].includes(h))
  const emailIdx = headers.findIndex((h) => ['email', 'email_address'].includes(h))
  const companyIdx = headers.findIndex((h) => ['company', 'organization', 'org', 'account'].includes(h))
  const roleIdx = headers.findIndex((h) => ['role', 'title', 'job_title', 'designation'].includes(h))
  const dndIdx = headers.findIndex((h) => ['dnd', 'do_not_disturb', 'opt_out', 'is_dnd'].includes(h))

  if (phoneIdx === -1) {
    return {
      totalRows: lines.length - 1,
      importedCount: 0,
      duplicatesSkipped: 0,
      dndCount: 0,
      invalidPhoneCount: lines.length - 1,
      leads: [],
      errors: ['Missing required "phone" or "mobile" column in CSV.'],
    }
  }

  const seenPhones = new Set<string>(existingPhones)
  const leads: Lead[] = []
  const errors: string[] = []
  let duplicatesSkipped = 0
  let invalidPhoneCount = 0
  let dndCount = 0

  for (let i = 1; i < lines.length; i++) {
    const row = splitCsvRow(lines[i])
    if (row.length === 0 || row.every((c) => !c.trim())) continue

    const rawPhone = row[phoneIdx] || ''
    const cleanedPhone = cleanPhoneNumber(rawPhone)

    if (!cleanedPhone) {
      invalidPhoneCount++
      errors.push(`Row ${i}: Invalid phone number "${rawPhone}". Expected valid Indian mobile format.`)
      continue
    }

    if (seenPhones.has(cleanedPhone)) {
      duplicatesSkipped++
      continue
    }
    seenPhones.add(cleanedPhone)

    const rawName = nameIdx >= 0 ? row[nameIdx] : ''
    const name = rawName?.trim() || 'Prospect'
    const email = emailIdx >= 0 ? row[emailIdx]?.trim() : undefined
    const company = companyIdx >= 0 ? row[companyIdx]?.trim() : undefined
    const role = roleIdx >= 0 ? row[roleIdx]?.trim() : undefined

    let isDnd = false
    if (dndIdx >= 0) {
      const dndVal = (row[dndIdx] || '').toLowerCase().trim()
      isDnd = ['true', 'yes', '1', 'y', 'dnd'].includes(dndVal)
    }

    if (isDnd) {
      dndCount++
    }

    // Collect any metadata columns
    const metadata: Record<string, unknown> = {}
    for (let c = 0; c < rawHeaders.length; c++) {
      if (![phoneIdx, nameIdx, emailIdx, companyIdx, roleIdx, dndIdx].includes(c)) {
        const val = row[c]?.trim()
        if (val) {
          metadata[rawHeaders[c]] = val
        }
      }
    }

    const now = new Date().toISOString()
    leads.push({
      id: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      phone: cleanedPhone,
      name,
      email,
      company,
      role,
      status: isDnd ? 'UNQUALIFIED' : 'READY',
      dnd: isDnd,
      attempts: 0,
      metadata,
      createdAt: now,
      updatedAt: now,
    })
  }

  return {
    totalRows: lines.length - 1,
    importedCount: leads.length,
    duplicatesSkipped,
    dndCount,
    invalidPhoneCount,
    leads,
    errors,
  }
}

/**
 * Splits CSV row handling quotes and commas
 */
function splitCsvRow(row: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < row.length; i++) {
    const char = row[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.replace(/^["']|["']$/g, '').trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.replace(/^["']|["']$/g, '').trim())
  return result
}
