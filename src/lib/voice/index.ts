import { VoiceProvider } from './provider'
import { OmniDimensionAdapter } from './adapters/omnidimension'

let activeProvider: VoiceProvider | null = null

/**
 * Returns the configured Voice Provider instance.
 * Code is isolated so any future provider can be swapped here seamlessly.
 */
export function getVoiceProvider(providerName?: string): VoiceProvider {
  const chosen = providerName || process.env.VOICE_PROVIDER || 'omnidimension'

  switch (chosen.toLowerCase()) {
    case 'omnidimension':
    default:
      if (!activeProvider || activeProvider.name !== 'omnidimension') {
        activeProvider = new OmniDimensionAdapter()
      }
      return activeProvider
  }
}

export * from './provider'
export * from './adapters/omnidimension'
export * from './compliance-gate'
