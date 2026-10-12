'use server'

import { revalidatePath } from 'next/cache'
import {
  Lead,
  Campaign,
  Appointment,
  LeadStatus,
  CampaignStatus,
  SchedulerRunResult,
} from '@/types/campaign'
import { parseLeadsCSV } from '@/lib/campaign/lead-importer'
import { runSchedulerCycle } from '@/lib/campaign/scheduler'
import { bookAppointment, getAvailableSlots, AvailableSlot, BookingResult } from '@/lib/campaign/appointment-service'
import { createClient } from '@/lib/supabase/server'
import { getVoiceSettingsAction } from './voice'

function safeRevalidate(path: string) {
  try {
    revalidatePath(path)
  } catch {
    // Outside request store
  }
}

// In-memory persistent stores with 20 demo leads pre-loaded
const globalStore = {
  leads: [] as Lead[],
  campaigns: [] as Campaign[],
  appointments: [] as Appointment[],
  initialized: false,
}

function initializeDemoLeads(): void {
  if (globalStore.initialized) return

  const demoNames = [
    { name: 'Aarav Sharma', company: 'CloudNova Systems', role: 'Head of Sales', phone: '+919876543210', dnd: false },
    { name: 'Neha Gupta', company: 'GrowthBridge Media', role: 'VP Operations', phone: '+919999999999', dnd: false },
    { name: 'Rohan Mehta', company: 'ScalePeak Analytics', role: 'Director of Growth', phone: '+919811122233', dnd: false },
    { name: 'Priya Sundaram', company: 'FinCore Global', role: 'Chief Revenue Officer', phone: '+919822233344', dnd: false },
    { name: 'Vikram Joshi', company: 'LogiChain Logistics', role: 'Sales Operations Manager', phone: '+919833344455', dnd: false },
    { name: 'Ananya Deshmukh', company: 'InsureTech India', role: 'Head of Pipeline', phone: '+919844455566', dnd: false },
    { name: 'Kavita Iyer', company: 'NextGen SaaS', role: 'Enterprise Account Director', phone: '+919855566677', dnd: false },
    { name: 'Manish Tiwari', company: 'OmniReach Direct', role: 'Founder & CEO', phone: '+919866677788', dnd: false },
    { name: 'Deepak Verma', company: 'LeadCraft Solutions', role: 'VP Demand Gen', phone: '+919877788899', dnd: false },
    { name: 'Sunil Rao', company: 'Vertex B2B Labs', role: 'Sales Enablement Lead', phone: '+919888899900', dnd: false },
    // DND leads (for strict compliance testing)
    { name: 'Rajesh Malhotra', company: 'DoNotCall Corp', role: 'Managing Director', phone: '+919711100001', dnd: true },
    { name: 'Swati Bansal', company: 'OptOut Logistics', role: 'Operations Lead', phone: '+919711100002', dnd: true },
    // Normal ready leads
    { name: 'Kunal Kapoor', company: 'HyperScale AI', role: 'VP Marketing', phone: '+919711100003', dnd: false },
    { name: 'Smriti Sen', company: 'DataWeave Global', role: 'Demand Gen Lead', phone: '+919711100004', dnd: false },
    { name: 'Harsh Vardhan', company: 'PulseMetric', role: 'Sales Director', phone: '+919711100005', dnd: false },
    { name: 'Tanvi Nair', company: 'Apex Consulting', role: 'Outbound Specialist', phone: '+919711100006', dnd: false },
    { name: 'Gaurav Gill', company: 'Zenith Tech', role: 'Founder', phone: '+919711100007', dnd: false },
    { name: 'Naveen Reddy', company: 'TelcoSprint B2B', role: 'Head of Outbound', phone: '+919711100008', dnd: false },
    { name: 'Pooja Agarwal', company: 'AlphaWave Health', role: 'Commercial Director', phone: '+919711100009', dnd: false },
    { name: 'Rahul Bose', company: 'ZenFlow Automation', role: 'VP Business Development', phone: '+919711100010', dnd: false },
  ]

  const now = new Date().toISOString()
  globalStore.leads = demoNames.map((d, i) => ({
    id: `lead_seed_${i + 1}`,
    phone: d.phone,
    name: d.name,
    email: `${d.name.toLowerCase().replace(/\s+/g, '.')}@${d.company.toLowerCase().replace(/\s+/g, '')}.com`,
    company: d.company,
    role: d.role,
    status: d.dnd ? 'UNQUALIFIED' : 'READY',
    dnd: d.dnd,
    attempts: 0,
    metadata: { source: 'Initial B2B Prospect List' },
    createdAt: now,
    updatedAt: now,
  }))

  // Initial Demo Campaign
  globalStore.campaigns = [
    {
      id: 'camp_demo_01',
      name: 'Desynthic Q4 Outbound Accelerator',
      agentName: 'Priya',
      status: 'running',
      callWindowStart: '10:00',
      callWindowEnd: '18:00',
      timezone: 'Asia/Kolkata',
      maxAttempts: 3,
      retryGapHours: 4,
      dailyCap: 20,
      callsToday: 0,
      leadIds: globalStore.leads.map((l) => l.id),
      createdAt: now,
      updatedAt: now,
    },
  ]

  globalStore.initialized = true
}

// Automatically seed on module load
initializeDemoLeads()

export async function getLeadsAction(): Promise<Lead[]> {
  const supabase = await createClient()
  if (supabase) {
    try {
      const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false })
      if (data && data.length > 0) {
        return data.map((d) => ({
          id: d.id,
          phone: d.phone,
          name: d.name,
          email: d.email,
          company: d.company,
          role: d.role,
          status: d.status,
          dnd: d.dnd,
          attempts: d.attempts,
          lastCalledAt: d.last_called_at,
          nextFollowUp: d.next_follow_up,
          metadata: d.metadata || {},
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }))
      }
    } catch {
      // Fallback to memory
    }
  }
  return [...globalStore.leads]
}

export async function importLeadsAction(csvContent: string) {
  const existingPhones = new Set(globalStore.leads.map((l) => l.phone))
  const importResult = parseLeadsCSV(csvContent, existingPhones)

  if (importResult.leads.length > 0) {
    globalStore.leads.unshift(...importResult.leads)

    const supabase = await createClient()
    if (supabase) {
      try {
        await supabase.from('leads').upsert(
          importResult.leads.map((l) => ({
            id: l.id,
            phone: l.phone,
            name: l.name,
            email: l.email,
            company: l.company,
            role: l.role,
            status: l.status,
            dnd: l.dnd,
            attempts: l.attempts,
            metadata: l.metadata,
          })),
          { onConflict: 'phone' }
        )
      } catch {
        // Fallback
      }
    }
  }

  safeRevalidate('/campaigns')
  return importResult
}

export async function updateLeadStatusAction(
  leadId: string,
  status: LeadStatus,
  nextFollowUp?: string
) {
  const lead = globalStore.leads.find((l) => l.id === leadId)
  if (lead) {
    lead.status = status
    lead.updatedAt = new Date().toISOString()
    if (nextFollowUp) lead.nextFollowUp = nextFollowUp
  }

  const supabase = await createClient()
  if (supabase) {
    try {
      await supabase
        .from('leads')
        .update({ status, next_follow_up: nextFollowUp, updated_at: new Date().toISOString() })
        .eq('id', leadId)
    } catch {
      // Fallback
    }
  }

  safeRevalidate('/campaigns')
  return { success: true, lead }
}

export async function getCampaignsAction(): Promise<Campaign[]> {
  const supabase = await createClient()
  if (supabase) {
    try {
      const { data } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false })
      if (data && data.length > 0) {
        return data.map((c) => ({
          id: c.id,
          name: c.name,
          agentName: c.agent_name,
          status: c.status,
          callWindowStart: c.call_window_start,
          callWindowEnd: c.call_window_end,
          timezone: c.timezone,
          maxAttempts: c.max_attempts,
          retryGapHours: c.retry_gap_hours,
          dailyCap: c.daily_cap,
          callsToday: c.calls_today,
          lastRunAt: c.last_run_at,
          leadIds: [],
          createdAt: c.created_at,
          updatedAt: c.updated_at,
        }))
      }
    } catch {
      // Fallback
    }
  }
  return [...globalStore.campaigns]
}

export async function createCampaignAction(campaignData: Partial<Campaign>) {
  const now = new Date().toISOString()
  const newCamp: Campaign = {
    id: `camp_${Date.now()}`,
    name: campaignData.name || 'New Outbound Campaign',
    agentName: campaignData.agentName || 'Priya',
    status: campaignData.status || 'draft',
    callWindowStart: campaignData.callWindowStart || '10:00',
    callWindowEnd: campaignData.callWindowEnd || '18:00',
    timezone: campaignData.timezone || 'Asia/Kolkata',
    maxAttempts: campaignData.maxAttempts || 3,
    retryGapHours: campaignData.retryGapHours || 4,
    dailyCap: campaignData.dailyCap || 20,
    callsToday: 0,
    leadIds: campaignData.leadIds || globalStore.leads.map((l) => l.id),
    createdAt: now,
    updatedAt: now,
  }

  globalStore.campaigns.unshift(newCamp)

  const supabase = await createClient()
  if (supabase) {
    try {
      await supabase.from('campaigns').insert({
        id: newCamp.id,
        name: newCamp.name,
        agent_name: newCamp.agentName,
        status: newCamp.status,
        call_window_start: newCamp.callWindowStart,
        call_window_end: newCamp.callWindowEnd,
        max_attempts: newCamp.maxAttempts,
        retry_gap_hours: newCamp.retryGapHours,
        daily_cap: newCamp.dailyCap,
        calls_today: 0,
      })
    } catch {
      // Fallback
    }
  }

  safeRevalidate('/campaigns')
  return { success: true, campaign: newCamp }
}

export async function toggleCampaignStatusAction(campaignId: string, status: CampaignStatus) {
  const camp = globalStore.campaigns.find((c) => c.id === campaignId)
  if (camp) {
    camp.status = status
    camp.updatedAt = new Date().toISOString()
  }

  const supabase = await createClient()
  if (supabase) {
    try {
      await supabase.from('campaigns').update({ status, updated_at: new Date().toISOString() }).eq('id', campaignId)
    } catch {
      // Fallback
    }
  }

  safeRevalidate('/campaigns')
  return { success: true, campaign: camp }
}

export async function runCampaignSchedulerAction(
  campaignId: string,
  simulatedTimeIso?: string,
  enforceAllowList: boolean = false
): Promise<{ success: boolean; result: SchedulerRunResult }> {
  const campaign = globalStore.campaigns.find((c) => c.id === campaignId)
  if (!campaign) {
    throw new Error(`Campaign ${campaignId} not found`)
  }

  const voiceSettings = await getVoiceSettingsAction()
  const currentTime = simulatedTimeIso ? new Date(simulatedTimeIso) : new Date()

  const { result, updatedCampaign, updatedLeads } = runSchedulerCycle({
    campaign,
    leads: globalStore.leads,
    currentTime,
    allowListedNumbers: enforceAllowList ? voiceSettings.allowListedNumbers : undefined,
  })

  // Update in-memory state
  const campIdx = globalStore.campaigns.findIndex((c) => c.id === campaignId)
  if (campIdx >= 0) globalStore.campaigns[campIdx] = updatedCampaign
  globalStore.leads = updatedLeads

  // Persist scheduler log to Supabase
  const supabase = await createClient()
  if (supabase) {
    try {
      await supabase.from('scheduler_logs').insert({
        id: `sched_${Date.now()}`,
        campaign_id: campaignId,
        timestamp: currentTime.toISOString(),
        leads_processed: result.leadsEvaluated,
        calls_dispatched: result.callsDispatched,
        skipped_summary: result.skippedReasons,
      })
      await supabase
        .from('campaigns')
        .update({
          calls_today: updatedCampaign.callsToday,
          last_run_at: updatedCampaign.lastRunAt,
        })
        .eq('id', campaignId)
    } catch {
      // Fallback
    }
  }

  safeRevalidate('/campaigns')
  return { success: true, result }
}

export async function getAppointmentsAction(): Promise<Appointment[]> {
  const supabase = await createClient()
  if (supabase) {
    try {
      const { data } = await supabase.from('appointments').select('*').order('scheduled_at', { ascending: true })
      if (data && data.length > 0) {
        return data.map((a) => ({
          id: a.id,
          leadId: a.lead_id,
          leadName: a.title.split('-')[1]?.trim() || 'Prospect',
          leadPhone: '',
          campaignId: a.campaign_id,
          title: a.title,
          scheduledAt: a.scheduled_at,
          durationMinutes: a.duration_minutes,
          meetingLink: a.meeting_link,
          status: a.status,
          calendarEventId: a.calendar_event_id,
          n8nNotified: a.n8n_notified,
          notes: a.notes,
          createdAt: a.created_at,
        }))
      }
    } catch {
      // Fallback
    }
  }
  return [...globalStore.appointments]
}

export async function bookAppointmentAction(
  leadId: string,
  scheduledAt: string,
  campaignId?: string,
  notes?: string
): Promise<BookingResult> {
  const lead = globalStore.leads.find((l) => l.id === leadId)
  if (!lead) {
    return { success: false, n8nDispatched: false, error: `Lead ${leadId} not found` }
  }

  const result = await bookAppointment(lead, {
    leadId,
    campaignId,
    scheduledAt,
    notes,
  })

  if (result.success && result.appointment) {
    globalStore.appointments.unshift(result.appointment)
    lead.status = 'MEETING_BOOKED'
    lead.updatedAt = new Date().toISOString()

    const supabase = await createClient()
    if (supabase) {
      try {
        await supabase.from('appointments').insert({
          id: result.appointment.id,
          lead_id: lead.id,
          campaign_id: campaignId,
          title: result.appointment.title,
          scheduled_at: result.appointment.scheduledAt,
          duration_minutes: result.appointment.durationMinutes,
          meeting_link: result.appointment.meetingLink,
          status: result.appointment.status,
          calendar_event_id: result.appointment.calendarEventId,
          n8n_notified: result.appointment.n8nNotified,
          notes: result.appointment.notes,
        })
        await supabase
          .from('leads')
          .update({ status: 'MEETING_BOOKED', updated_at: new Date().toISOString() })
          .eq('id', lead.id)
      } catch {
        // Fallback
      }
    }
  }

  safeRevalidate('/campaigns')
  return result
}

export async function getAvailableSlotsAction(): Promise<AvailableSlot[]> {
  return getAvailableSlots()
}
