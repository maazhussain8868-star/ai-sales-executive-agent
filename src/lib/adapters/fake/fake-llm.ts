import { LLMProvider, LLMCompletionOptions, LLMResponse } from '@/types/adapters'

export class FakeLLMProvider implements LLMProvider {
  name = 'fake-llm'

  async complete(prompt: string, options?: LLMCompletionOptions): Promise<LLMResponse> {
    const isJsonRequested = options?.responseFormat === 'json' || prompt.toLowerCase().includes('json')
    const lowerPrompt = prompt.toLowerCase()

    let content = `Processed completion for task: ${prompt.substring(0, 50)}...`

    if (isJsonRequested) {
      content = JSON.stringify({
        status: 'success',
        intent: 'curious',
        score: 85,
        qualification: 'qualified',
        reason: 'Prospect expressed explicit requirement for outbound sales capacity.',
        extractedData: {
          budget: 'approved',
          timeline: 'next_month'
        }
      })
    } else if (lowerPrompt.includes('what exactly does your ai sales employee do')) {
      content = 'We deploy autonomous AI sales employees that execute outbound cold dialing, qualify prospects against your ICP, and book confirmed meetings on your calendar.'
    } else if (lowerPrompt.includes('already have internal human sdrs') || lowerPrompt.includes('already have human sales reps')) {
      content = 'That is fantastic. We do not replace your top closers—our AI employee handles the tedious top-of-funnel cold dialing so your reps only spend time closing warm meetings.'
    } else if (lowerPrompt.includes('standard robocallers') || lowerPrompt.includes('legacy dialers')) {
      content = 'Unlike legacy dialers, our platform provides voice-first conversational intelligence with sub-second latency and human-like dialogue.'
    } else if (lowerPrompt.includes('solo freelancer') || lowerPrompt.includes('0 employees')) {
      content = 'Our autonomous sales platform is designed for B2B teams with active outreach needs, so we may not be the best fit for solo operations at this stage.'
    } else if (lowerPrompt.includes('urgent executive meeting') || lowerPrompt.includes('wasting my time')) {
      content = 'I apologize for interrupting during your meeting time. I will not take another moment—have a productive discussion!'
    } else if (lowerPrompt.includes('quantum entanglement') || lowerPrompt.includes('sap erp 1998')) {
      content = "I don't have that specific technical integration detail on hand right now. Let me check with our solutions engineering team and get back to you, or I can connect you with a specialist."
    } else {
      content = 'We build voice-first AI sales employees that qualify prospects and book meetings on your calendar.'
    }

    return {
      content,
      modelUsed: 'fake-gpt-4o-mini',
      tokenUsage: {
        inputTokens: Math.round(prompt.length / 4),
        outputTokens: Math.round(content.length / 4),
        totalTokens: Math.round((prompt.length + content.length) / 4)
      }
    }
  }
}
