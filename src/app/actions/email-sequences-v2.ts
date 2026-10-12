'use server';

import { EmailSequenceManager } from '@/lib/messaging/email-sequence-manager-v2';
import { FakeEmailProvider } from '@/lib/adapters/fake/fake-email';
import {
  EmailTemplateV2,
  LeadEmailSequenceEnrollment,
  OutboundEmailLog,
} from '@/types/email-sequences-v2';

const manager = new EmailSequenceManager();

export async function getEmailSequencesOverviewAction(workspaceId: string = 'ws_pilot'): Promise<{
  templates: EmailTemplateV2[];
  enrollments: LeadEmailSequenceEnrollment[];
  outboundLogs: OutboundEmailLog[];
}> {
  const templates = manager.getTemplates();
  const enrollments = manager.getEnrollments(workspaceId);
  const outboundLogs = FakeEmailProvider.getSentEmails(workspaceId);

  return {
    templates,
    enrollments,
    outboundLogs,
  };
}

export async function enrollLeadInEmailSequenceAction(params: {
  workspaceId: string;
  sequenceId: string;
  leadId: string;
  leadEmail: string;
  leadName: string;
}): Promise<{ success: boolean; enrollment?: LeadEmailSequenceEnrollment; error?: string }> {
  try {
    const enrollment = manager.enrollLead(params);
    return { success: true, enrollment };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function triggerNextSequenceStepAction(params: {
  enrollmentId: string;
}): Promise<{ success: boolean; status?: string; error?: string }> {
  try {
    const res = await manager.executeNextStep(params);
    if (!res.success) {
      return { success: false, error: res.blockedReason };
    }
    return { success: true, status: res.status };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function simulateInboundEmailReplyAction(params: {
  recipientEmail: string;
  replyText: string;
}): Promise<{ success: boolean; pausedCount: number }> {
  const res = manager.handleInboundReply(params);
  return { success: true, pausedCount: res.pausedCount };
}

export async function simulateUnsubscribeAction(params: {
  email: string;
}): Promise<{ success: boolean; haltedCount: number }> {
  const res = manager.handleUnsubscribe(params.email);
  return { success: true, haltedCount: res.haltedCount };
}
