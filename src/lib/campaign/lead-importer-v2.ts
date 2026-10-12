import { LeadV2, CsvImportSummary } from '@/types/campaign-v2'

/**
 * Normalizes phone numbers to standard E.164 format (+91 for India default).
 */
export function normalizeIndianPhone(rawPhone: string): { phone?: string; valid: boolean; error?: string } {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return { valid: false, error: 'Empty or missing phone number' }
  }

  // Remove whitespace, hyphens, brackets, dots
  let cleaned = rawPhone.replace(/[\s\-\(\)\.]/g, '').trim()

  // Handle leading 0 (e.g. 09876543210 -> 9876543210)
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.substring(1)
  }

  // Handle without + but with 91 (e.g. 919876543210)
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = `+${cleaned}`
  }

  // Handle 10-digit standard Indian mobile (e.g. 9876543210)
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return { phone: `+91${cleaned}`, valid: true }
  }

  // Handle already +91 format (e.g. +919876543210)
  if (/^\+91[6-9]\d{9}$/.test(cleaned)) {
    return { phone: cleaned, valid: true }
  }

  return { valid: false, error: `Invalid Indian mobile format: "${rawPhone}"` }
}

/**
 * Parses messy CSV text and produces a validated import summary with duplicate detection
 * and downloadable error CSV report.
 */
export function parseAndValidateLeadCsv(
  csvText: string,
  workspaceId: string = 'ws_default',
  sourceName: string = 'csv_upload',
  existingPhones: Set<string> = new Set()
): CsvImportSummary {
  const lines = csvText.trim().split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) {
    return {
      totalRows: 0,
      validLeads: [],
      duplicateRows: [],
      invalidRows: [],
      errorCsvContent: 'RowNumber,RawData,Error\n'
    }
  }

  // Header parsing
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''))
  const nameIdx = headers.findIndex((h) => h.includes('name'))
  const phoneIdx = headers.findIndex((h) => h.includes('phone') || h.includes('mobile') || h.includes('contact'))
  const emailIdx = headers.findIndex((h) => h.includes('email'))
  const companyIdx = headers.findIndex((h) => h.includes('company') || h.includes('org'))
  const langIdx = headers.findIndex((h) => h.includes('lang'))

  const validLeads: LeadV2[] = []
  const duplicateRows: CsvImportSummary['duplicateRows'] = []
  const invalidRows: CsvImportSummary['invalidRows'] = []
  const seenBatchPhones = new Set<string>()

  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1
    const rawLine = lines[i]
    const cols = rawLine.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''))

    const rawName = nameIdx >= 0 ? cols[nameIdx] : cols[0]
    const rawPhone = phoneIdx >= 0 ? cols[phoneIdx] : cols[1]
    const rawEmail = emailIdx >= 0 ? cols[emailIdx] : undefined
    const rawCompany = companyIdx >= 0 ? cols[companyIdx] : undefined
    const rawLang = langIdx >= 0 ? cols[langIdx] : undefined

    if (!rawName || rawName.trim().length === 0) {
      invalidRows.push({
        rowNumber: rowNum,
        rawData: { line: rawLine },
        error: 'Missing required prospect name'
      })
      continue
    }

    const phoneResult = normalizeIndianPhone(rawPhone || '')
    if (!phoneResult.valid || !phoneResult.phone) {
      invalidRows.push({
        rowNumber: rowNum,
        rawData: { line: rawLine },
        error: phoneResult.error || 'Invalid phone number'
      })
      continue
    }

    const normalizedPhone = phoneResult.phone

    // Duplicate check in batch
    if (seenBatchPhones.has(normalizedPhone)) {
      duplicateRows.push({
        rowNumber: rowNum,
        phone: normalizedPhone,
        name: rawName,
        reason: 'Duplicate phone number within current upload batch'
      })
      continue
    }

    // Duplicate check in database
    if (existingPhones.has(normalizedPhone)) {
      duplicateRows.push({
        rowNumber: rowNum,
        phone: normalizedPhone,
        name: rawName,
        reason: 'Phone number already exists in workspace database'
      })
      continue
    }

    seenBatchPhones.add(normalizedPhone)

    const preferredLang: LeadV2['preferredLanguage'] =
      rawLang?.toLowerCase().includes('hi')
        ? 'hi'
        : rawLang?.toLowerCase().includes('hing')
        ? 'hinglish'
        : 'en'

    validLeads.push({
      id: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      workspaceId,
      phone: normalizedPhone,
      name: rawName,
      email: rawEmail,
      company: rawCompany,
      preferredLanguage: preferredLang,
      timeZone: 'Asia/Kolkata',
      source: sourceName,
      importedAt: new Date().toISOString(),
      status: 'READY'
    })
  }

  // Construct error report CSV content
  let errorCsvContent = 'RowNumber,RawData,Error\n'
  for (const inv of invalidRows) {
    errorCsvContent += `${inv.rowNumber},"${(inv.rawData.line as string || '').replace(/"/g, '""')}","${inv.error}"\n`
  }

  return {
    totalRows: lines.length - 1,
    validLeads,
    duplicateRows,
    invalidRows,
    errorCsvContent
  }
}

export const importCsvLeads = parseAndValidateLeadCsv;

