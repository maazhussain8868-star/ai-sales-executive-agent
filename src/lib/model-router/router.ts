import { LLMProvider, LLMResponse } from '@/types/adapters'
import { FakeLLMProvider } from '@/lib/adapters/fake/fake-llm'

export type ModelRouterTask =
  | 'brain_compilation'
  | 'transcript_analysis'
  | 'qa_scoring'
  | 'message_drafting'
  | 'conversation_signals'
  | 'general_completion'

export interface ModelRouterConfig {
  taskModelMap: Record<ModelRouterTask, string>
  useFakeModel: boolean
}

export const DEFAULT_MODEL_ROUTER_CONFIG: ModelRouterConfig = {
  taskModelMap: {
    brain_compilation: process.env.MODEL_BRAIN_COMPILER || 'claude-3-5-sonnet-20241022',
    transcript_analysis: process.env.MODEL_TRANSCRIPT_ANALYZER || 'gpt-4o',
    qa_scoring: process.env.MODEL_QA_SCORER || 'gpt-4o-mini',
    message_drafting: process.env.MODEL_MESSAGE_DRAFTER || 'claude-3-5-sonnet-20241022',
    conversation_signals: process.env.MODEL_SIGNALS || 'gpt-4o-mini',
    general_completion: process.env.MODEL_DEFAULT || 'gpt-4o-mini'
  },
  useFakeModel: process.env.NODE_ENV === 'test' || !process.env.OPENAI_API_KEY
}

export class ModelRouter {
  private fallbackProvider: LLMProvider

  constructor(
    private config: ModelRouterConfig = DEFAULT_MODEL_ROUTER_CONFIG,
    customFallback?: LLMProvider
  ) {
    this.fallbackProvider = customFallback || new FakeLLMProvider()
  }

  getModelForTask(task: ModelRouterTask): string {
    return this.config.taskModelMap[task] || this.config.taskModelMap.general_completion
  }

  async executeTask(
    task: ModelRouterTask,
    prompt: string,
    isJson: boolean = false
  ): Promise<LLMResponse> {
    const assignedModel = this.getModelForTask(task)

    // In testing or when fake mode is active, use the FakeLLMProvider
    if (this.config.useFakeModel) {
      const res = await this.fallbackProvider.complete(prompt, {
        responseFormat: isJson ? 'json' : 'text'
      })
      return {
        ...res,
        modelUsed: `fake-${assignedModel}`
      }
    }

    // Live LLM dispatch extension point (OpenAI / Anthropic SDK based on assignedModel)
    return this.fallbackProvider.complete(prompt, {
      responseFormat: isJson ? 'json' : 'text'
    })
  }
}

export const defaultModelRouter = new ModelRouter()
