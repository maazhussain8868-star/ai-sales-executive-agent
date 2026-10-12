/**
 * PRD v2.1 Phase 3: OmniDimension Voice Provider Adapter
 * Targets Agent "Priya" (Voice-first conversational AI tuned for Indian English / Hindi / Hinglish).
 * Implements the standard VoiceProvider interface.
 */

import {
  VoiceProvider,
  CallDispatchRequest,
  CallDispatchResult,
  VoiceWebhookPayload,
} from '@/types/adapters';

export class OmniDimensionVoiceProvider implements VoiceProvider {
  public readonly name = 'omnidimension';
  private apiKey: string | undefined;
  private baseUrl: string;
  private defaultAgentId: string;

  constructor(options?: { apiKey?: string; baseUrl?: string; defaultAgentId?: string }) {
    this.apiKey = options?.apiKey || process.env.OMNIDIMENSION_API_KEY;
    this.baseUrl = options?.baseUrl || process.env.OMNIDIMENSION_BASE_URL || 'https://api.omnidimension.ai/v1';
    this.defaultAgentId = options?.defaultAgentId || process.env.OMNIDIMENSION_AGENT_ID || 'priya-sales-v2';
  }

  /**
   * Dispatches an outbound voice call to OmniDimension API.
   */
  async dispatchCall(request: CallDispatchRequest): Promise<CallDispatchResult> {
    const agentId = request.agentId || this.defaultAgentId;

    // If real API key is present, execute actual API call
    if (this.apiKey && this.apiKey !== 'mock' && !this.apiKey.startsWith('test_')) {
      try {
        const response = await fetch(`${this.baseUrl}/calls/dispatch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            agent_id: agentId,
            to_number: request.toNumber,
            from_number_id: request.fromNumberId,
            system_prompt: request.prompt,
            language: request.language || 'hinglish',
            context: {
              lead_id: request.leadId,
              workspace_id: request.workspaceId,
              ...request.callContext,
            },
          }),
        });

        if (!response.ok) {
          const errBody = await response.text();
          return {
            providerCallId: '',
            status: 'FAILED',
            timestamp: new Date().toISOString(),
            error: `OmniDimension API returned ${response.status}: ${errBody}`,
          };
        }

        const data = await response.json();
        return {
          providerCallId: data.call_id || data.id,
          status: 'INITIATED',
          timestamp: new Date().toISOString(),
        };
      } catch (err: unknown) {
        return {
          providerCallId: '',
          status: 'FAILED',
          timestamp: new Date().toISOString(),
          error: err instanceof Error ? err.message : 'Unknown network failure',
        };
      }
    }

    // Graceful test/sandbox simulation mode when real API key is unset
    const simulatedCallId = `omni_priya_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    return {
      providerCallId: simulatedCallId,
      status: 'INITIATED',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Updates the core prompt or persona for agent Priya in OmniDimension.
   */
  async updateAgentPrompt(agentId: string, prompt: string): Promise<{ success: boolean; updatedAgentId: string }> {
    const targetAgent = agentId || this.defaultAgentId;

    if (this.apiKey && this.apiKey !== 'mock') {
      try {
        const response = await fetch(`${this.baseUrl}/agents/${targetAgent}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
          return { success: false, updatedAgentId: targetAgent };
        }
        return { success: true, updatedAgentId: targetAgent };
      } catch {
        return { success: false, updatedAgentId: targetAgent };
      }
    }

    return { success: true, updatedAgentId: targetAgent };
  }

  /**
   * Parses incoming OmniDimension webhook events into the standard VoiceWebhookPayload format.
   */
  async parseWebhook(rawPayload: unknown): Promise<VoiceWebhookPayload> {
    const payload = rawPayload as Record<string, unknown>;

    const providerEventId = (payload.event_id || payload.provider_event_id || `omni_evt_${Date.now()}`) as string;
    const providerCallId = (payload.call_id || payload.provider_call_id || '') as string;
    const rawType = (payload.event_type || payload.type || 'call.completed') as string;

    let eventType: VoiceWebhookPayload['eventType'] = 'call.completed';
    if (rawType.includes('start') || rawType.includes('init')) eventType = 'call.started';
    else if (rawType.includes('ring')) eventType = 'call.ringing';
    else if (rawType.includes('connect') || rawType.includes('answer')) eventType = 'call.connected';
    else if (rawType.includes('fail') || rawType.includes('error')) eventType = 'call.failed';

    // Normalize transcripts if present
    const rawTranscript = payload.transcript as Array<{ speaker?: string; text?: string }> | string | undefined;
    let transcript: Array<{ speaker: 'agent' | 'prospect'; text: string }> | undefined;

    if (Array.isArray(rawTranscript)) {
      transcript = rawTranscript.map((t) => ({
        speaker: t.speaker === 'agent' ? 'agent' : 'prospect',
        text: t.text || '',
      }));
    } else if (typeof rawTranscript === 'string') {
      transcript = [{ speaker: 'prospect', text: rawTranscript }];
    }

    return {
      providerEventId,
      providerCallId,
      eventType,
      durationSeconds: typeof payload.duration_seconds === 'number' ? payload.duration_seconds : 0,
      recordingUrl: typeof payload.recording_url === 'string' ? payload.recording_url : undefined,
      transcript,
      summary: typeof payload.summary === 'string' ? payload.summary : undefined,
      failureReason: typeof payload.failure_reason === 'string' ? payload.failure_reason : undefined,
      extractedVariables: typeof payload.variables === 'object' ? (payload.variables as Record<string, unknown>) : undefined,
    };
  }
}
