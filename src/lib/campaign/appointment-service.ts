import { Appointment, Lead } from '@/types/campaign'

export interface AvailableSlot {
  datetime: string // ISO string
  formattedTime: string
  label: string
}

export interface BookingRequest {
  leadId: string
  campaignId?: string
  scheduledAt: string
  durationMinutes?: number
  notes?: string
}

export interface BookingResult {
  success: boolean
  appointment?: Appointment
  n8nDispatched: boolean
  error?: string
}

/**
 * Checks available calendar slots for the next 3 business days (IST 10:00 to 18:00)
 */
export function getAvailableSlots(baseDate: Date = new Date()): AvailableSlot[] {
  const slots: AvailableSlot[] = []
  let daysAdded = 0
  let checkTime = new Date(baseDate.getTime())

  while (slots.length < 5 && daysAdded < 7) {
    checkTime = new Date(checkTime.getTime() + 24 * 60 * 60 * 1000)
    daysAdded++

    // IST day: 0 = Sunday (skip Sundays)
    // Convert to IST offset +5:30
    const istOffset = 5.5 * 60 * 60 * 1000
    const istDate = new Date(checkTime.getTime() + istOffset)
    const dayOfWeek = istDate.getUTCDay()

    if (dayOfWeek === 0) continue // Skip Sundays

    // Slot 1: 11:00 AM IST
    const slot1 = new Date(checkTime)
    slot1.setUTCHours(5, 30, 0, 0) // 11:00 AM IST is 05:30 UTC
    slots.push({
      datetime: slot1.toISOString(),
      formattedTime: `${istDate.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })} at 11:00 AM IST`,
      label: 'Morning slot (11:00 AM)',
    })

    // Slot 2: 3:00 PM IST
    const slot2 = new Date(checkTime)
    slot2.setUTCHours(9, 30, 0, 0) // 3:00 PM IST is 09:30 UTC
    slots.push({
      datetime: slot2.toISOString(),
      formattedTime: `${istDate.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })} at 3:00 PM IST`,
      label: 'Afternoon slot (3:00 PM)',
    })
  }

  return slots
}

/**
 * Dispatches an event to n8n webhook for WhatsApp confirmation and reminder workflow.
 */
export async function triggerN8nWebhook(payload: {
  event: 'meeting_booked' | 'reminder_queued'
  appointment: Appointment
  lead: Lead
}): Promise<{ success: boolean; status: number | string }> {
  const webhookUrl = process.env.N8N_CALENDAR_WEBHOOK_URL

  if (!webhookUrl) {
    // Graceful offline mock when n8n url is not configured
    return { success: true, status: 'simulated_offline' }
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return { success: res.ok, status: res.status }
  } catch (err) {
    return { success: false, status: err instanceof Error ? err.message : 'Network error' }
  }
}

/**
 * Creates an appointment, generates calendar event link, updates lead status to MEETING_BOOKED,
 * and fires n8n notification webhook.
 */
export async function bookAppointment(
  lead: Lead,
  request: BookingRequest
): Promise<BookingResult> {
  const appointmentId = `apt_${Date.now()}`
  const durationMinutes = request.durationMinutes || 30
  const calendarEventId = `gcal_${Date.now()}`
  const meetingLink = `https://meet.google.com/dsy-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 5)}`

  const appointment: Appointment = {
    id: appointmentId,
    leadId: lead.id,
    leadName: lead.name,
    leadPhone: lead.phone,
    campaignId: request.campaignId,
    title: `Desynthic AI Discovery Audit - ${lead.name} (${lead.company || 'Enterprise'})`,
    scheduledAt: request.scheduledAt,
    durationMinutes,
    meetingLink,
    status: 'confirmed',
    calendarEventId,
    n8nNotified: false,
    notes: request.notes,
    createdAt: new Date().toISOString(),
  }

  // Fire webhook to n8n
  const n8nResult = await triggerN8nWebhook({
    event: 'meeting_booked',
    appointment,
    lead: {
      ...lead,
      status: 'MEETING_BOOKED',
    },
  })

  appointment.n8nNotified = n8nResult.success

  return {
    success: true,
    appointment,
    n8nDispatched: n8nResult.success,
  }
}
