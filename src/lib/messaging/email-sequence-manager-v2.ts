/**
 * PRD v2.1 Phase 9: Multi-Step Email Sequence Manager
 * Handles sequence enrollment, step dispatching, pause-on-reply, and unsubscribe suppression.
 */

import {
  EmailTemplateV2,
  EmailSequenceV2,
  LeadEmailSequenceEnrollment,
  OutboundEmailLog,
} from '@/types/email-sequences-v2';
import { FakeEmailProvider } from '@/lib/adapters/fake/fake-email';
import { addToSuppressionList, isSuppressed } from '@/lib/safety/can-contact';
import { logAuditEvent } from '@/lib/hardening/audit-and-cost-reporter';

// In-Memory Templates Store
const TEMPLATES_STORE: Map<string, EmailTemplateV2> = new Map([
  [
    'tmpl_call_summary_v1',
    {
      id: 'tmpl_call_summary_v1',
      name: 'Post-Call Summary & Next Steps',
      subject: 'Great speaking with you, {{name}} - Desynthic AI Sales Summary',
      bodyHtml: `
        <p>Hi {{name}},</p>
        <p>Thank you for taking the time to speak with Priya from Desynthic earlier today.</p>
        <p>As discussed, here is a quick summary of our discussion regarding {{company}}: {{summary}}</p>
        <p>If you'd like to book a full 20-minute product walkthrough, you can choose a time here: <a href="{{meeting_url}}">Schedule Walkthrough</a></p>
        <br/>
        <p>Best regards,<br/>Desynthic Sales Team</p>
        <hr/>
        <p style="font-size: 11px; color: #64748b;">
          Desynthic Technologies, HSR Layout, Bengaluru, Karnataka, India - 560102.<br/>
          To stop receiving sales emails, please <a href="{{unsubscribe_url}}">Unsubscribe here</a>.
        </p>
      `,
      bodyText: `Hi {{name}},\n\nThank you for speaking with Priya from Desynthic. Summary: {{summary}}.\nBook walkthrough: {{meeting_url}}\n\nUnsubscribe: {{unsubscribe_url}}\nDesynthic Technologies, Bengaluru, India`,
      variables: ['name', 'company', 'summary', 'meeting_url', 'unsubscribe_url'],
      isCompliant: true,
      createdAt: '2026-10-01T10:00:00.000Z',
    },
  ],
  [
    'tmpl_case_study_v1',
    {
      id: 'tmpl_case_study_v1',
      name: 'Case Study: 3x Lead Response Speed',
      subject: 'How logistics companies qualify 500 leads in minutes',
      bodyHtml: `
        <p>Hi {{name}},</p>
        <p>Following up on our conversation about scaling sales operations at {{company}}.</p>
        <p>Our autonomous voice agents qualify 500 inbound leads in under 15 minutes, boosting connection rates by 300%.</p>
        <p>Check out our full case study here: <a href="https://desynthic.com/case-studies">Read Case Study</a></p>
        <br/>
        <p style="font-size: 11px; color: #64748b;">
          Desynthic Technologies, Bengaluru, India.<br/>
          <a href="{{unsubscribe_url}}">Unsubscribe here</a>.
        </p>
      `,
      bodyText: `Hi {{name}},\n\nCase study on scaling sales operations at {{company}}: https://desynthic.com/case-studies\n\nUnsubscribe: {{unsubscribe_url}}`,
      variables: ['name', 'company', 'unsubscribe_url'],
      isCompliant: true,
      createdAt: '2026-10-01T10:00:00.000Z',
    },
  ],
  [
    'tmpl_breakup_v1',
    {
      id: 'tmpl_breakup_v1',
      name: 'Final Follow-Up (Breakup Email)',
      subject: 'Closing the loop on AI Sales Automation for {{company}}',
      bodyHtml: `
        <p>Hi {{name}},</p>
        <p>I haven't heard back, so I assume this is not a top priority for {{company}} right now.</p>
        <p>I won't follow up again, but feel free to reach out anytime if your team needs 24/7 AI qualification.</p>
        <br/>
        <p style="font-size: 11px; color: #64748b;">
          Desynthic Technologies, Bengaluru, India.<br/>
          <a href="{{unsubscribe_url}}">Unsubscribe here</a>.
        </p>
      `,
      bodyText: `Hi {{name}},\n\nClosing the loop on AI Sales Automation. Won't follow up again.\n\nUnsubscribe: {{unsubscribe_url}}`,
      variables: ['name', 'company', 'unsubscribe_url'],
      isCompliant: true,
      createdAt: '2026-10-01T10:00:00.000Z',
    },
  ],
]);

// In-Memory Sequences Store
const SEQUENCES_STORE: Map<string, EmailSequenceV2> = new Map([
  [
    'seq_post_call_nurture',
    {
      id: 'seq_post_call_nurture',
      workspaceId: 'ws_pilot',
      name: 'Post-Call 3-Step Nurture Sequence',
      triggerEvent: 'CALL_COMPLETED_QUALIFIED',
      steps: [
        { stepNumber: 1, delayHours: 0, templateId: 'tmpl_call_summary_v1' },
        { stepNumber: 2, delayHours: 48, templateId: 'tmpl_case_study_v1' },
        { stepNumber: 3, delayHours: 96, templateId: 'tmpl_breakup_v1' },
      ],
      isActive: true,
      createdAt: '2026-10-01T10:00:00.000Z',
    },
  ],
]);

// In-Memory Enrollments Store
const ENROLLMENTS_STORE: Map<string, LeadEmailSequenceEnrollment> = new Map();

// Email Suppression Set
const EMAIL_SUPPRESSION_LIST: Set<string> = new Set<string>([
  'unsubscribed@competitor.com',
  'dnd@enterprise.com',
]);

export class EmailSequenceManager {
  private emailProvider: FakeEmailProvider;

  constructor(emailProvider?: FakeEmailProvider) {
    this.emailProvider = emailProvider || new FakeEmailProvider();
  }

  /**
   * Retrieves all email templates.
   */
  public getTemplates(): EmailTemplateV2[] {
    return Array.from(TEMPLATES_STORE.values());
  }

  /**
   * Retrieves an email template by ID.
   */
  public getTemplate(id: string): EmailTemplateV2 | undefined {
    return TEMPLATES_STORE.get(id);
  }

  /**
   * Enrolls a lead into an automated email sequence.
   */
  public enrollLead(params: {
    workspaceId: string;
    sequenceId: string;
    leadId: string;
    leadEmail: string;
    leadName: string;
  }): LeadEmailSequenceEnrollment {
    const email = params.leadEmail.trim().toLowerCase();

    // Safety Gate: Check suppression list before enrolling
    if (EMAIL_SUPPRESSION_LIST.has(email) || isSuppressed(email)) {
      throw new Error(`Enrollment blocked: ${email} is suppressed or unsubscribed.`);
    }

    const id = `enr_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const enrollment: LeadEmailSequenceEnrollment = {
      id,
      workspaceId: params.workspaceId,
      sequenceId: params.sequenceId,
      leadId: params.leadId,
      leadEmail: email,
      leadName: params.leadName,
      currentStepNumber: 1,
      status: 'IN_PROGRESS',
      enrolledAt: new Date().toISOString(),
    };

    ENROLLMENTS_STORE.set(id, enrollment);

    logAuditEvent({
      workspaceId: params.workspaceId,
      eventType: 'CAMPAIGN_LAUNCH',
      actor: 'sequence_engine',
      description: `Enrolled lead ${email} into email sequence '${params.sequenceId}'.`,
    });

    return enrollment;
  }

  /**
   * Dispatches the next due step for an enrolled lead.
   */
  public async executeNextStep(params: {
    enrollmentId: string;
    variables?: Record<string, string>;
  }): Promise<{
    success: boolean;
    sentLog?: OutboundEmailLog;
    status: LeadEmailSequenceEnrollment['status'];
    blockedReason?: string;
  }> {
    const enrollment = ENROLLMENTS_STORE.get(params.enrollmentId);
    if (!enrollment) {
      return { success: false, status: 'HALTED_UNSUBSCRIBED', blockedReason: 'Enrollment not found' };
    }

    if (enrollment.status !== 'IN_PROGRESS') {
      return {
        success: false,
        status: enrollment.status,
        blockedReason: `Sequence is not active (current status: ${enrollment.status})`,
      };
    }

    // Safety Gate: Check suppression
    if (EMAIL_SUPPRESSION_LIST.has(enrollment.leadEmail) || isSuppressed(enrollment.leadEmail)) {
      enrollment.status = 'HALTED_UNSUBSCRIBED';
      ENROLLMENTS_STORE.set(enrollment.id, enrollment);
      return {
        success: false,
        status: 'HALTED_UNSUBSCRIBED',
        blockedReason: 'Lead has unsubscribed or is suppressed.',
      };
    }

    const sequence = SEQUENCES_STORE.get(enrollment.sequenceId);
    if (!sequence) {
      return { success: false, status: enrollment.status, blockedReason: 'Sequence definition not found' };
    }

    const step = sequence.steps.find((s) => s.stepNumber === enrollment.currentStepNumber);
    if (!step) {
      enrollment.status = 'COMPLETED';
      ENROLLMENTS_STORE.set(enrollment.id, enrollment);
      return { success: true, status: 'COMPLETED' };
    }

    const template = this.getTemplate(step.templateId);
    if (!template) {
      return { success: false, status: enrollment.status, blockedReason: `Template ${step.templateId} not found` };
    }

    // Populate template variables
    const vars: Record<string, string> = {
      name: enrollment.leadName,
      company: 'LogisticsHub India',
      summary: 'Discussed high volume outbound lead qualification with 500 leads/mo.',
      meeting_url: 'https://meet.google.com/xyz-pilot',
      unsubscribe_url: `https://desynthic.com/unsubscribe?email=${encodeURIComponent(enrollment.leadEmail)}`,
      ...(params.variables || {}),
    };

    let renderedSubject = step.subjectOverride || template.subject;
    let renderedHtml = template.bodyHtml;
    let renderedText = template.bodyText;

    for (const [k, v] of Object.entries(vars)) {
      const regex = new RegExp(`{{${k}}}`, 'g');
      renderedSubject = renderedSubject.replace(regex, v);
      renderedHtml = renderedHtml.replace(regex, v);
      renderedText = renderedText.replace(regex, v);
    }

    // Mandatory Compliance Gate: Ensure unsubscribe link is present in body
    if (!renderedHtml.includes('unsubscribe') && !renderedText.includes('unsubscribe')) {
      return {
        success: false,
        status: enrollment.status,
        blockedReason: 'Compliance Violation: Email body missing mandatory unsubscribe link.',
      };
    }

    // Dispatch email
    const sentLog = await this.emailProvider.sendEmail({
      workspaceId: enrollment.workspaceId,
      to: enrollment.leadEmail,
      subject: renderedSubject,
      html: renderedHtml,
      text: renderedText,
      enrollmentId: enrollment.id,
    });

    enrollment.lastSentAt = new Date().toISOString();
    enrollment.currentStepNumber += 1;

    // If no more steps, mark completed
    if (enrollment.currentStepNumber > sequence.steps.length) {
      enrollment.status = 'COMPLETED';
    }

    ENROLLMENTS_STORE.set(enrollment.id, enrollment);

    return {
      success: true,
      sentLog,
      status: enrollment.status,
    };
  }

  /**
   * Inbound Reply Hook: Automatically pauses the sequence when prospect replies.
   */
  public handleInboundReply(params: {
    recipientEmail: string;
    replyText: string;
  }): { pausedCount: number } {
    const email = params.recipientEmail.trim().toLowerCase();
    let pausedCount = 0;

    for (const enrollment of Array.from(ENROLLMENTS_STORE.values())) {
      if (enrollment.leadEmail === email && enrollment.status === 'IN_PROGRESS') {
        enrollment.status = 'PAUSED_ON_REPLY';
        enrollment.repliedAt = new Date().toISOString();
        ENROLLMENTS_STORE.set(enrollment.id, enrollment);
        pausedCount++;

        logAuditEvent({
          workspaceId: enrollment.workspaceId,
          eventType: 'CAMPAIGN_STOP',
          actor: 'reply_hook',
          description: `Paused email sequence for ${email} due to inbound reply: "${params.replyText.slice(0, 50)}...".`,
        });
      }
    }

    return { pausedCount };
  }

  /**
   * Unsubscribe Click Hook: Immediately halts all sequences and adds email to suppression list.
   */
  public handleUnsubscribe(email: string): { haltedCount: number } {
    const cleaned = email.trim().toLowerCase();
    EMAIL_SUPPRESSION_LIST.add(cleaned);
    addToSuppressionList(cleaned);

    let haltedCount = 0;
    for (const enrollment of Array.from(ENROLLMENTS_STORE.values())) {
      if (enrollment.leadEmail === cleaned) {
        enrollment.status = 'HALTED_UNSUBSCRIBED';
        enrollment.unsubscribedAt = new Date().toISOString();
        ENROLLMENTS_STORE.set(enrollment.id, enrollment);
        haltedCount++;
      }
    }

    logAuditEvent({
      workspaceId: 'ws_pilot',
      eventType: 'OPT_OUT',
      actor: 'unsubscribe_link',
      description: `Lead ${cleaned} clicked unsubscribe. Sequence halted and added to global suppression list.`,
    });

    return { haltedCount };
  }

  /**
   * Get all enrollments for a workspace.
   */
  public getEnrollments(workspaceId?: string): LeadEmailSequenceEnrollment[] {
    const all = Array.from(ENROLLMENTS_STORE.values());
    if (workspaceId) return all.filter((e) => e.workspaceId === workspaceId);
    return all;
  }

  /**
   * Check if an email is suppressed.
   */
  public isEmailSuppressed(email: string): boolean {
    const cleaned = email.trim().toLowerCase();
    return EMAIL_SUPPRESSION_LIST.has(cleaned) || isSuppressed(cleaned);
  }
}
