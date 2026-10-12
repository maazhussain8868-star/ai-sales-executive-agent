/**
 * PRD v2.1 Phase 3: Voice Conversation Engine
 * Controls live conversational state, language tracking (EN/HI/Hinglish),
 * mandatory AI disclosure opening line, and real-time opt-out protection.
 */

import { CompiledSalesBrain } from '@/types/brain-v2';
import { detectInCallOptOut, executeInCallOptOut } from './opt-out-detector';
import { CallState } from '@/types/voice-v2';

export interface ConversationTurn {
  speaker: 'agent' | 'prospect';
  text: string;
  timestamp: string;
  detectedLanguage?: 'en' | 'hi' | 'hinglish' | 'te' | 'ta' | 'mr';
}

export interface ConversationState {
  callId: string;
  leadId: string;
  workspaceId: string;
  phoneNumber: string;
  leadName?: string;
  status: CallState;
  currentLanguage: 'en' | 'hi' | 'hinglish' | 'te' | 'ta' | 'mr';
  turns: ConversationTurn[];
  isOptedOut: boolean;
  optOutReason?: string;
  handoffRequested: boolean;
  qualificationData: Record<string, unknown>;
}

export class VoiceConversationEngine {
  private state: ConversationState;
  private brain: CompiledSalesBrain;

  constructor(params: {
    callId: string;
    leadId: string;
    workspaceId: string;
    phoneNumber: string;
    leadName?: string;
    initialLanguage?: 'en' | 'hi' | 'hinglish' | 'te' | 'ta' | 'mr';
    brain: CompiledSalesBrain;
  }) {
    this.brain = params.brain;
    this.state = {
      callId: params.callId,
      leadId: params.leadId,
      workspaceId: params.workspaceId,
      phoneNumber: params.phoneNumber,
      leadName: params.leadName,
      status: 'ANSWERED',
      currentLanguage: params.initialLanguage || 'hinglish',
      turns: [],
      isOptedOut: false,
      handoffRequested: false,
      qualificationData: {},
    };
  }

  /**
   * Generates compliant opening utterance including mandatory AI and recording disclosure.
   */
  public generateOpeningLine(): string {
    const company = this.brain.metadata.companyName || 'our company';
    const repName = this.brain.metadata.agentPersona || 'Priya';
    const disclosure = this.brain.aiDisclosureLine || 'This is an AI sales assistant, and our call may be recorded.';

    let opening: string;
    if (this.state.currentLanguage === 'hi') {
      opening = `Namaste${this.state.leadName ? ' ' + this.state.leadName + ' ji' : ''}, main ${repName} baat kar rahi hoon ${company} se. Yeh call ek AI sales assistant dwara ki ja rahi hai aur quality purpose ke liye record ho sakti hai. Kya aapke paas 2 minute hain?`;
    } else if (this.state.currentLanguage === 'hinglish') {
      opening = `Hi${this.state.leadName ? ' ' + this.state.leadName : ''}, I am ${repName} calling from ${company}. ${disclosure} Do you have two minutes to speak?`;
    } else {
      opening = `Hello${this.state.leadName ? ' ' + this.state.leadName : ''}, this is ${repName} from ${company}. ${disclosure} Do you have a moment to chat?`;
    }

    this.state.turns.push({
      speaker: 'agent',
      text: opening,
      timestamp: new Date().toISOString(),
      detectedLanguage: this.state.currentLanguage,
    });

    this.state.status = 'IN_PROGRESS';
    return opening;
  }

  /**
   * Processes prospect turn, checks for opt-out or language shift, and returns AI response.
   */
  public async processTurn(prospectUtterance: string): Promise<{
    agentUtterance: string;
    isTerminal: boolean;
    callStatus: CallState;
  }> {
    // 1. Record prospect utterance
    const optOutCheck = detectInCallOptOut(prospectUtterance);
    this.state.turns.push({
      speaker: 'prospect',
      text: prospectUtterance,
      timestamp: new Date().toISOString(),
      detectedLanguage: optOutCheck.detectedLanguage,
    });

    // 2. Opt-out safety check (English, Hindi, Hinglish)
    if (optOutCheck.isOptOut) {
      this.state.isOptedOut = true;
      this.state.status = 'OPTED_OUT';
      this.state.optOutReason = optOutCheck.phrase;

      const optOutResult = await executeInCallOptOut({
        workspaceId: this.state.workspaceId,
        phoneNumber: this.state.phoneNumber,
        leadId: this.state.leadId,
        callId: this.state.callId,
        triggerPhrase: prospectUtterance,
        language: optOutCheck.detectedLanguage,
      });

      this.state.turns.push({
        speaker: 'agent',
        text: optOutResult.politeExitUtterance,
        timestamp: new Date().toISOString(),
        detectedLanguage: optOutCheck.detectedLanguage,
      });

      return {
        agentUtterance: optOutResult.politeExitUtterance,
        isTerminal: true,
        callStatus: 'OPTED_OUT',
      };
    }

    // 3. Dynamic language switching
    if (optOutCheck.detectedLanguage && optOutCheck.detectedLanguage !== this.state.currentLanguage) {
      this.state.currentLanguage = optOutCheck.detectedLanguage;
    }

    // 4. Check for human handoff request
    const lower = prospectUtterance.toLowerCase();
    if (lower.includes('human') || lower.includes('real person') || lower.includes('manager se baat') || lower.includes('kisi insaan se')) {
      this.state.handoffRequested = true;
      const handoffMsg = this.state.currentLanguage === 'hi' || this.state.currentLanguage === 'hinglish'
        ? 'Main bilkul samajh sakti hoon. Main turant hamare sales team lead ko aapki details bhej rahi hoon taaki woh aapse direct connect kar sakein.'
        : 'I completely understand. I will have a senior specialist from our team reach out to you directly.';
      
      this.state.turns.push({
        speaker: 'agent',
        text: handoffMsg,
        timestamp: new Date().toISOString(),
      });
      return {
        agentUtterance: handoffMsg,
        isTerminal: false,
        callStatus: 'IN_PROGRESS',
      };
    }

    // 5. Standard contextual response adhering to Sales Brain
    let responseText = '';
    if (lower.includes('price') || lower.includes('cost') || lower.includes('kitna')) {
      responseText = this.brain.sections.pricing?.content || 'Our pricing starts based on your specific requirements. May I know how many leads you handle monthly?';
    } else if (lower.includes('who are you') || lower.includes('kya karte ho') || lower.includes('what do you do')) {
      responseText = this.brain.sections.products?.content || `${this.brain.metadata.companyName} provides an AI sales agent solution that helps qualify inbound leads and schedule meetings.`;
    } else {
      responseText = `Understood. Would you be open to a quick 15-minute product walkthrough this week?`;
    }

    this.state.turns.push({
      speaker: 'agent',
      text: responseText,
      timestamp: new Date().toISOString(),
      detectedLanguage: this.state.currentLanguage,
    });

    return {
      agentUtterance: responseText,
      isTerminal: false,
      callStatus: 'IN_PROGRESS',
    };
  }

  public getState(): ConversationState {
    return { ...this.state };
  }

  public getFormattedTranscript(): string {
    return this.state.turns
      .map((t) => `[${t.timestamp.slice(11, 19)}] ${t.speaker.toUpperCase()}: ${t.text}`)
      .join('\n');
  }
}
