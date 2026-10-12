import {
  VoiceProvider,
  CallDispatchRequest,
  CallDispatchResult,
  VoiceWebhookPayload
} from '@/types/adapters'

export class FakeVoiceProvider implements VoiceProvider {
  name = 'fake-voice'

  async dispatchCall(_request: CallDispatchRequest): Promise<CallDispatchResult> {
    void _request
    const providerCallId = `fake_call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    return {
      providerCallId,
      status: 'INITIATED',
      timestamp: new Date().toISOString()
    }
  }

  async updateAgentPrompt(
    agentId: string,
    _prompt: string
  ): Promise<{ success: boolean; updatedAgentId: string }> {
    void _prompt
    return {
      success: true,
      updatedAgentId: agentId
    }
  }

  async parseWebhook(rawPayload: unknown): Promise<VoiceWebhookPayload> {
    const payload = (rawPayload || {}) as Record<string, unknown>
    return {
      providerEventId: (payload.event_id as string) || `fake_evt_${Date.now()}`,
      providerCallId: (payload.call_id as string) || `fake_call_${Date.now()}`,
      eventType: (payload.event_type as VoiceWebhookPayload['eventType']) || 'call.completed',
      durationSeconds: (payload.duration as number) || 120,
      recordingUrl: 'https://storage.desynthic.fake/recordings/sample.mp3',
      transcript: [
        { speaker: 'agent', text: 'Hi, this is Priya calling from Desynthic. May I share why I called?' },
        { speaker: 'prospect', text: 'Sure, tell me quickly.' },
        { speaker: 'agent', text: 'We build autonomous AI sales agents that book qualified meetings. Would next Tuesday work for a 20-min demo?' },
        { speaker: 'prospect', text: 'Yes, send me an invite for 11 AM.' }
      ],
      summary: 'Prospect showed high interest in autonomous sales outreach and agreed to a demo Tuesday at 11 AM.',
      extractedVariables: {
        interest_level: 'high',
        meeting_confirmed: true
      }
    }
  }
}
