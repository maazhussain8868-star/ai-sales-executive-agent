'use server';

/**
 * Server Actions for PRD v2.1 Phase 5: Booking, Follow-ups, WhatsApp & Human Handoff
 */

import { CalendarBookingManager } from '@/lib/booking/calendar-booking-manager';
import { FollowUpScheduler } from '@/lib/followup/followup-scheduler';
import { WhatsAppManager } from '@/lib/messaging/whatsapp-manager';
import { HumanHandoffManager } from '@/lib/handoff/human-handoff-manager';
import { MeetingRecord, FollowUpTask, WhatsAppMessageRecord, HumanHandoffRecord, HandoffTriggerReason } from '@/types/booking-followup-v2';

const bookingManager = new CalendarBookingManager();
const followUpScheduler = new FollowUpScheduler();
const whatsAppManager = new WhatsAppManager();
const handoffManager = new HumanHandoffManager();

/**
 * Server action to book a meeting via Google Calendar.
 */
export async function bookMeetingAction(params: {
  workspaceId: string;
  leadId: string;
  attendeeEmail: string;
  attendeeName: string;
  attendeePhone: string;
  title: string;
  scheduledAt: string;
  idempotencyKey?: string;
}): Promise<{
  meeting: MeetingRecord;
  confirmed: boolean;
  spokenConfirmationMessage: string;
}> {
  return await bookingManager.bookMeeting(params);
}

/**
 * Server action to schedule or update a follow-up callback.
 */
export async function scheduleFollowUpAction(params: {
  workspaceId: string;
  leadId: string;
  leadPhone: string;
  leadName: string;
  scheduledAt: string;
  reason: string;
  priorContext: string;
}): Promise<FollowUpTask> {
  return followUpScheduler.createFollowUp(params);
}

export async function cancelFollowUpAction(taskId: string): Promise<boolean> {
  return followUpScheduler.cancelFollowUp(taskId);
}

export async function getFollowUpsAction(workspaceId?: string): Promise<FollowUpTask[]> {
  return followUpScheduler.getAllTasks(workspaceId);
}

export async function getMeetingsAction(workspaceId?: string): Promise<MeetingRecord[]> {
  return bookingManager.getAllMeetings(workspaceId);
}

/**
 * Server action to send a WhatsApp template follow-up.
 */
export async function sendWhatsAppAction(params: {
  workspaceId: string;
  leadId: string;
  recipientPhone: string;
  templateName: string;
  variables?: Record<string, string>;
  hasOptedIn: boolean;
  idempotencyKey?: string;
}): Promise<{
  success: boolean;
  messageRecord?: WhatsAppMessageRecord;
  blockedReason?: string;
}> {
  return await whatsAppManager.sendTemplateMessage(params);
}

export async function getWhatsAppMessagesAction(): Promise<WhatsAppMessageRecord[]> {
  return whatsAppManager.getAllMessages();
}

/**
 * Server action to initiate a human handoff.
 */
export async function triggerHandoffAction(params: {
  workspaceId: string;
  leadId: string;
  callId: string;
  prospectName: string;
  prospectPhone: string;
  triggerReason: HandoffTriggerReason;
  triggerUtterance: string;
  leadSummary: string;
}): Promise<{
  handoffRecord: HumanHandoffRecord;
  spokenUtterance: string;
}> {
  const result = await handoffManager.executeHandoff(params);
  return {
    handoffRecord: result.handoffRecord,
    spokenUtterance: result.spokenUtterance,
  };
}

export async function getHandoffsAction(workspaceId?: string): Promise<HumanHandoffRecord[]> {
  return handoffManager.getAllHandoffs(workspaceId);
}
