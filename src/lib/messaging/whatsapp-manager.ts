/**
 * PRD v2.1 Phase 5: WhatsApp Follow-Up & Template Manager
 * Enforces approved templates only, strict opt-in checks, canContact gate,
 * delivery logging, sequence termination on reply/opt-out, and message idempotency.
 */

import { MessagingProvider, SendMessageRequest } from '@/types/adapters';
import { FakeWhatsAppProvider } from '@/lib/adapters/fake/fake-messaging';
import { WhatsAppTemplate, WhatsAppMessageRecord } from '@/types/booking-followup-v2';
import { canContact } from '@/lib/safety/can-contact';
import { detectInCallOptOut, executeInCallOptOut } from '@/lib/voice/opt-out-detector';

const TEMPLATES_STORE: Map<string, WhatsAppTemplate> = new Map([
  [
    'tmpl_meeting_confirm',
    {
      id: 'tmpl_meeting_confirm',
      name: 'meeting_confirmation_v1',
      language: 'en',
      body: 'Hi {{name}}, your meeting with Desynthic is confirmed for {{time}}. Google Meet link: {{link}}.',
      variables: ['name', 'time', 'link'],
      approvalStatus: 'APPROVED',
    },
  ],
  [
    'tmpl_followup_info',
    {
      id: 'tmpl_followup_info',
      name: 'followup_info_v1',
      language: 'hinglish',
      body: 'Hi {{name}}, Priya from Desynthic. As discussed on our call, here are our AI sales agent details: {{link}}.',
      variables: ['name', 'link'],
      approvalStatus: 'APPROVED',
    },
  ],
  [
    'tmpl_unapproved_draft',
    {
      id: 'tmpl_unapproved_draft',
      name: 'draft_promo_v1',
      language: 'en',
      body: 'Special discount today!',
      variables: [],
      approvalStatus: 'PENDING',
    },
  ],
]);

const MESSAGES_LOG: WhatsAppMessageRecord[] = [];
const SENT_IDEMPOTENCY_KEYS = new Set<string>();
const ACTIVE_SEQUENCES = new Map<string, { leadId: string; status: 'ACTIVE' | 'STOPPED' | 'COMPLETED' }>();

export class WhatsAppManager {
  private messagingProvider: MessagingProvider;

  constructor(messagingProvider?: MessagingProvider) {
    this.messagingProvider = messagingProvider || new FakeWhatsAppProvider();
  }

  /**
   * Retrieves an approved WhatsApp template by name.
   */
  public getTemplate(name: string): WhatsAppTemplate | undefined {
    return Array.from(TEMPLATES_STORE.values()).find((t) => t.name === name);
  }

  /**
   * Dispatches a WhatsApp template message with strict compliance gates.
   */
  public async sendTemplateMessage(params: {
    workspaceId: string;
    leadId: string;
    recipientPhone: string;
    templateName: string;
    templateLanguage?: 'en' | 'hi' | 'hinglish';
    variables?: Record<string, string>;
    hasOptedIn: boolean;
    idempotencyKey?: string;
    currentTime?: Date;
  }): Promise<{
    success: boolean;
    messageRecord?: WhatsAppMessageRecord;
    blockedReason?: string;
  }> {
    const {
      workspaceId,
      leadId,
      recipientPhone,
      templateName,
      variables = {},
      hasOptedIn,
      idempotencyKey,
      currentTime,
    } = params;

    // 1. Idempotency Check: deduplicate by key
    const dedupeKey = idempotencyKey || `${workspaceId}_${leadId}_${templateName}_${new Date().toISOString().slice(0, 10)}`;
    if (SENT_IDEMPOTENCY_KEYS.has(dedupeKey)) {
      return {
        success: true,
        blockedReason: 'Message already sent (idempotent ignore)',
      };
    }

    // 2. Approved Template Verification Gate
    const template = this.getTemplate(templateName);
    if (!template) {
      return { success: false, blockedReason: `Template "${templateName}" does not exist.` };
    }
    if (template.approvalStatus !== 'APPROVED') {
      return {
        success: false,
        blockedReason: `Template "${templateName}" is currently ${template.approvalStatus} (only APPROVED templates may be dispatched).`,
      };
    }

    // 3. Opt-in Verification Gate
    if (!hasOptedIn) {
      return {
        success: false,
        blockedReason: 'BLOCKED: WhatsApp messaging requires verified prospect opt-in.',
      };
    }

    // 4. Centralized Safety Engine Gate: canContact
    const contactGate = await canContact(
      { id: leadId, workspaceId, phone: recipientPhone },
      'whatsapp',
      currentTime || new Date()
    );

    if (!contactGate.allowed) {
      return { success: false, blockedReason: contactGate.reason };
    }

    // 5. Check if sequence was stopped for this recipient
    const seq = ACTIVE_SEQUENCES.get(recipientPhone);
    if (seq && seq.status === 'STOPPED') {
      return { success: false, blockedReason: 'Sequence stopped due to prior reply or opt-out.' };
    }

    // 6. Render template variables into body
    let renderedBody = template.body;
    for (const [k, v] of Object.entries(variables)) {
      renderedBody = renderedBody.replace(new RegExp(`{{${k}}}`, 'g'), v);
    }

    // 7. Dispatch to MessagingProvider
    const req: SendMessageRequest = {
      workspaceId,
      leadId,
      recipientPhone,
      templateName,
      templateLanguage: params.templateLanguage || template.language,
      templateVariables: variables,
      freeText: renderedBody,
    };

    const result = await this.messagingProvider.sendTemplate(req);

    const messageRecord: WhatsAppMessageRecord = {
      id: `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      workspaceId,
      leadId,
      recipientPhone,
      templateId: template.id,
      templateName: template.name,
      providerMessageId: result.providerMessageId,
      status: result.status === 'FAILED' ? 'FAILED' : 'DELIVERED',
      deliveryError: result.error,
      sentAt: result.timestamp || new Date().toISOString(),
    };

    MESSAGES_LOG.push(messageRecord);
    SENT_IDEMPOTENCY_KEYS.add(dedupeKey);
    ACTIVE_SEQUENCES.set(recipientPhone, { leadId, status: 'ACTIVE' });

    return {
      success: result.status !== 'FAILED',
      messageRecord,
      blockedReason: result.error,
    };
  }

  /**
   * Handles inbound prospect replies: stops ongoing sequence or triggers immediate opt-out.
   */
  public async handleInboundReply(params: {
    workspaceId: string;
    phoneNumber: string;
    replyText: string;
  }): Promise<{ sequenceHalted: boolean; optOutExecuted: boolean }> {
    const { workspaceId, phoneNumber, replyText } = params;

    // 1. In-bound opt-out detection
    const optCheck = detectInCallOptOut(replyText);
    if (optCheck.isOptOut) {
      await executeInCallOptOut({
        workspaceId,
        phoneNumber,
        triggerPhrase: replyText,
        language: optCheck.detectedLanguage,
      });

      ACTIVE_SEQUENCES.set(phoneNumber, { leadId: '', status: 'STOPPED' });
      return { sequenceHalted: true, optOutExecuted: true };
    }

    // 2. Standard reply: halts automated drip sequence
    ACTIVE_SEQUENCES.set(phoneNumber, { leadId: '', status: 'STOPPED' });
    return { sequenceHalted: true, optOutExecuted: false };
  }

  public getAllMessages(): WhatsAppMessageRecord[] {
    return [...MESSAGES_LOG];
  }

  public getAllTemplates(): WhatsAppTemplate[] {
    return Array.from(TEMPLATES_STORE.values());
  }

  public clearStore(): void {
    MESSAGES_LOG.length = 0;
    SENT_IDEMPOTENCY_KEYS.clear();
    ACTIVE_SEQUENCES.clear();
  }
}
