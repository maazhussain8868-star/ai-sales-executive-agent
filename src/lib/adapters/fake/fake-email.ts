/**
 * PRD v2.1 Phase 9: Fake Transactional Email Provider
 */

import { OutboundEmailLog } from '@/types/email-sequences-v2';

export interface EmailSendRequest {
  workspaceId: string;
  to: string;
  from?: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
  enrollmentId?: string;
}

const OUTBOUND_EMAILS: OutboundEmailLog[] = [];

export class FakeEmailProvider {
  /**
   * Dispatches an outbound transactional email with compliance headers.
   */
  public async sendEmail(request: EmailSendRequest): Promise<OutboundEmailLog> {
    const log: OutboundEmailLog = {
      id: `email_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      workspaceId: request.workspaceId,
      enrollmentId: request.enrollmentId,
      recipientEmail: request.to.trim().toLowerCase(),
      subject: request.subject,
      body: request.text || request.html,
      headers: {
        'List-Unsubscribe': `<mailto:unsubscribe@desynthic.com?subject=unsubscribe>, <https://desynthic.com/unsubscribe?email=${encodeURIComponent(request.to)}>`,
        'X-Compliant-Postal-Address': 'Desynthic Technologies, HSR Layout, Bengaluru, Karnataka, India - 560102',
        ...(request.headers || {}),
      },
      status: 'DELIVERED',
      sentAt: new Date().toISOString(),
    };

    OUTBOUND_EMAILS.push(log);
    return log;
  }

  /**
   * Get all sent emails.
   */
  public static getSentEmails(workspaceId?: string): OutboundEmailLog[] {
    if (workspaceId) {
      return OUTBOUND_EMAILS.filter((e) => e.workspaceId === workspaceId);
    }
    return [...OUTBOUND_EMAILS];
  }

  /**
   * Clear email logs (for test isolation).
   */
  public static clear(): void {
    OUTBOUND_EMAILS.length = 0;
  }
}
