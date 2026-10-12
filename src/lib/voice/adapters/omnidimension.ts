import {
  VoiceProvider,
  UpdatePromptParams,
  UpdatePromptResult,
  DispatchCallParams,
  DispatchCallResult,
  ParsedCallWebhook,
} from '../provider'

export class OmniDimensionAdapter implements VoiceProvider {
  public readonly name = 'omnidimension'
  private readonly apiKey: string
  private readonly baseUrl: string

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey || process.env.OMNIDIMENSION_API_KEY || ''
    this.baseUrl = baseUrl || process.env.OMNIDIMENSION_BASE_URL || 'https://api.omnidimension.com/v1'
  }

  /**
   * Updates the compiled prompt on the OmniDimension voice agent
   */
  async updateAgentPrompt(params: UpdatePromptParams): Promise<UpdatePromptResult> {
    if (!params.agentId) {
      return { success: false, error: 'Agent ID is required' }
    }
    if (!params.prompt) {
      return { success: false, error: 'Prompt content is required' }
    }

    if (this.apiKey) {
      try {
        const response = await fetch(`${this.baseUrl}/agents/${params.agentId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            prompt: params.prompt,
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          return {
            success: false,
            error: `OmniDimension update failed (${response.status}): ${errorText}`,
          }
        }

        const data = await response.json()
        return {
          success: true,
          updatedAt: new Date().toISOString(),
          rawResponse: data,
        }
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Network error updating agent prompt',
        }
      }
    }

    // Deterministic Mock mode when OMNIDIMENSION_API_KEY is not set
    return {
      success: true,
      updatedAt: new Date().toISOString(),
      rawResponse: {
        agent_id: params.agentId,
        status: 'updated',
        prompt_length: params.prompt.length,
        mock: true,
      },
    }
  }

  /**
   * Dispatches a phone call via OmniDimension
   */
  async dispatchCall(params: DispatchCallParams): Promise<DispatchCallResult> {
    if (!params.agentId || !params.toNumber) {
      return { success: false, error: 'agentId and toNumber are required to dispatch call' }
    }

    if (this.apiKey) {
      try {
        const response = await fetch(`${this.baseUrl}/calls`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            agent_id: params.agentId,
            to_number: params.toNumber,
            from_number_id: params.fromNumberId,
            call_context: params.callContext || {},
          }),
        })

        if (!response.ok) {
          const errText = await response.text()
          return {
            success: false,
            error: `OmniDimension call dispatch failed (${response.status}): ${errText}`,
          }
        }

        const data = await response.json()
        return {
          success: true,
          callId: data.call_id || data.id,
          providerCallId: data.call_id || data.id,
          status: data.status || 'dispatched',
          rawResponse: data,
        }
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Network error dispatching call',
        }
      }
    }

    // Mock response for local development / testing
    const mockCallId = `omni_call_${Date.now()}`
    return {
      success: true,
      callId: mockCallId,
      providerCallId: mockCallId,
      status: 'dispatched',
      rawResponse: {
        call_id: mockCallId,
        to_number: params.toNumber,
        agent_id: params.agentId,
        dispatched_at: new Date().toISOString(),
        mock: true,
      },
    }
  }

  /**
   * Parses incoming post-call webhook from OmniDimension
   * Format known from docs: call_id and a call_report (summary, extracted_variables, interactions)
   */
  parseWebhook(payload: unknown): ParsedCallWebhook {
    const raw = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>
    const report = (raw.call_report && typeof raw.call_report === 'object'
      ? raw.call_report
      : {}) as Record<string, unknown>

    const callId = String(raw.call_id || raw.id || `unknown_${Date.now()}`)
    const providerCallId = callId
    const agentId = raw.agent_id ? String(raw.agent_id) : undefined
    const toNumber = raw.to_number ? String(raw.to_number) : undefined
    const durationSeconds = Number(raw.duration_seconds || report.duration_seconds || 0)

    const rawStatus = String(raw.status || 'completed').toLowerCase()
    let status: ParsedCallWebhook['status'] = 'completed'
    if (rawStatus.includes('fail') || rawStatus.includes('error')) status = 'failed'
    else if (rawStatus.includes('busy')) status = 'busy'
    else if (rawStatus.includes('no_answer')) status = 'no_answer'
    else if (rawStatus.includes('progress') || rawStatus.includes('ringing')) status = 'in_progress'

    const summary = String(report.summary || raw.summary || 'Call completed without summary')
    const extractedVariables = (report.extracted_variables ||
      raw.extracted_variables ||
      {}) as Record<string, unknown>

    // Build transcript from interactions or raw transcript field
    let transcript = ''
    if (typeof report.transcript === 'string') {
      transcript = report.transcript
    } else if (typeof raw.transcript === 'string') {
      transcript = raw.transcript
    } else if (Array.isArray(report.interactions)) {
      transcript = report.interactions
        .map((item: { role?: string; speaker?: string; text?: string; message?: string }) => {
          const speaker = item.role || item.speaker || 'Speaker'
          const text = item.text || item.message || ''
          return `${speaker}: ${text}`
        })
        .join('\n')
    } else {
      transcript = 'No audio transcript captured'
    }

    return {
      callId,
      providerCallId,
      agentId,
      toNumber,
      status,
      durationSeconds,
      transcript,
      summary,
      extractedVariables,
      rawPayload: payload,
    }
  }
}
