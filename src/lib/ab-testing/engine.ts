import { AbExperiment } from '@/types/phase7'

export interface ExperimentResult {
  experimentId: string
  assignedVariant: 'A' | 'B'
  activePrompt: string
}

/**
 * Route a call to Variant A or Variant B based on traffic split and call index.
 */
export function routeAbCall(
  experiment: AbExperiment,
  callIndex: number = Math.floor(Math.random() * 100)
): ExperimentResult {
  const normalizedIndex = callIndex % 100
  const assignedVariant: 'A' | 'B' = normalizedIndex < experiment.trafficSplitPercent ? 'A' : 'B'

  return {
    experimentId: experiment.id,
    assignedVariant,
    activePrompt: assignedVariant === 'A' ? experiment.variantAPrompt : experiment.variantBPrompt
  }
}

/**
 * Calculate conversion metrics and determine if an experiment has a clear winner.
 */
export function evaluateExperimentWinner(experiment: AbExperiment): {
  winningVariant: 'A' | 'B' | null
  confidenceScore: number
  conversionRateA: number
  conversionRateB: number
  recommendation: string
} {
  const rateA = experiment.variantACalls > 0
    ? (experiment.variantAMeetings / experiment.variantACalls) * 100
    : 0

  const rateB = experiment.variantBCalls > 0
    ? (experiment.variantBMeetings / experiment.variantBCalls) * 100
    : 0

  const totalCalls = experiment.variantACalls + experiment.variantBCalls

  if (totalCalls < 10) {
    return {
      winningVariant: null,
      confidenceScore: 0.1,
      conversionRateA: Math.round(rateA * 10) / 10,
      conversionRateB: Math.round(rateB * 10) / 10,
      recommendation: `Data collection in progress (${totalCalls}/10 min sample size required for early trend).`
    }
  }

  const delta = Math.abs(rateA - rateB)
  const confidenceScore = Math.min(0.99, Math.round((0.5 + (delta / 100) * 0.45 + (totalCalls / 100) * 0.05) * 100) / 100)

  if (rateA > rateB && delta >= 5) {
    return {
      winningVariant: 'A',
      confidenceScore,
      conversionRateA: Math.round(rateA * 10) / 10,
      conversionRateB: Math.round(rateB * 10) / 10,
      recommendation: `Variant A outperforms Variant B by ${Math.round(delta)}% conversion margin. Recommend adopting Variant A.`
    }
  } else if (rateB > rateA && delta >= 5) {
    return {
      winningVariant: 'B',
      confidenceScore,
      conversionRateA: Math.round(rateA * 10) / 10,
      conversionRateB: Math.round(rateB * 10) / 10,
      recommendation: `Variant B outperforms Variant A by ${Math.round(delta)}% conversion margin. Recommend adopting Variant B.`
    }
  }

  return {
    winningVariant: null,
    confidenceScore,
    conversionRateA: Math.round(rateA * 10) / 10,
    conversionRateB: Math.round(rateB * 10) / 10,
    recommendation: 'Both variants performing within statistical margin of error. Continue running experiment.'
  }
}
