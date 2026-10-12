export interface UpdatePromptParams {
  agentId: string
  prompt: string
}

export interface DispatchCallParams {
  agentId: string
  toNumber: string
  fromNumberId?: string
  callContext?: Record<string, unknown>
}

export interface DispatchCallResult {
  success: boolean
  callId?: string
  providerCallId?: string
  status?: string
  rawResponse?: unknown
  error?: string
}

export interface UpdatePromptResult {
  success: boolean
  updatedAt?: string
  rawResponse?: unknown
  error?: string
}

export interface ParsedCallWebhook {
  callId: string
  providerCallId: string
  agentId?: string
  toNumber?: string
  status: 'completed' | 'failed' | 'in_progress' | 'busy' | 'no_answer'
  durationSeconds: number
  transcript: string
  summary: string
  extractedVariables: Record<string, unknown>
  rawPayload: unknown
}

/**
 * Isolated Voice Provider Interface.
 * Any future provider (e.g., Vapi, Retell, Bland) can be swapped in
 * by implementing this interface.
 */
export interface VoiceProvider {
  name: string
  updateAgentPrompt(params: UpdatePromptParams): Promise<UpdatePromptResult>
  dispatchCall(params: DispatchCallParams): Promise<DispatchCallResult>
  parseWebhook(payload: unknown): ParsedCallWebhook
}
