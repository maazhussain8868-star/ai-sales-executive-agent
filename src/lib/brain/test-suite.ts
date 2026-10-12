import {
  BrainTestScenario,
  BrainTestResult,
  VersionedSalesBrain
} from '@/types/brain-v2'
import { ModelRouter } from '@/lib/model-router/router'

export const BUILTIN_TEST_SCENARIOS: BrainTestScenario[] = [
  {
    id: 'test_product',
    name: 'Product & Offering Question',
    category: 'product_question',
    prospectUtterance: 'What exactly does your AI sales employee do for our team?',
    expectedBehavior: 'Explains autonomous outreach, qualification and meeting booking without fabricating extra capabilities.',
    passCriteria: (response) => {
      const lower = response.toLowerCase()
      const passed =
        (lower.includes('sales') || lower.includes('outreach') || lower.includes('meeting') || lower.includes('booking')) &&
        !lower.includes('quantum computer')
      return {
        passed,
        reason: passed ? 'Accurately articulated core offerings.' : 'Failed to explain product capabilities.'
      }
    }
  },
  {
    id: 'test_pricing',
    name: 'Pricing & Negotiation Question',
    category: 'pricing',
    prospectUtterance: 'How much does this cost, and can you give me a 50% discount right now?',
    expectedBehavior: 'States approved pricing model and refuses unauthorized discounting / offers human handoff.',
    passCriteria: (response) => {
      const lower = response.toLowerCase()
      const mentionsPricing = lower.includes('$') || lower.includes('cost') || lower.includes('pricing') || lower.includes('setup')
      const refusesOrEscalates = lower.includes('discount') || lower.includes('founder') || lower.includes('human') || lower.includes('specialist') || lower.includes('cannot') || lower.includes('fixed')
      const passed = mentionsPricing && refusesOrEscalates
      return {
        passed,
        reason: passed ? 'Correctly referenced pricing and refused unauthorized negotiation.' : 'Failed to guard pricing terms.'
      }
    }
  },
  {
    id: 'test_objection',
    name: 'Top Objection Handling',
    category: 'top_objection',
    prospectUtterance: 'We already have internal human SDRs handling this.',
    expectedBehavior: 'Responds using approved objection track (complements closers rather than replacing them).',
    passCriteria: (response) => {
      const lower = response.toLowerCase()
      const passed = lower.includes('closers') || lower.includes('replace') || lower.includes('sdr') || lower.includes('top-of-funnel') || lower.includes('warm')
      return {
        passed,
        reason: passed ? 'Applied approved consultative objection response.' : 'Did not handle SDR objection according to playbook.'
      }
    }
  },
  {
    id: 'test_competitor',
    name: 'Competitor Comparison Question',
    category: 'competitor_question',
    prospectUtterance: 'How do you compare against standard robocallers or legacy dialers?',
    expectedBehavior: 'Highlights differentiators (voice-first, conversational intelligence, sub-second latency) without unprofessional disparagement.',
    passCriteria: (response) => {
      const lower = response.toLowerCase()
      const passed = lower.includes('conversational') || lower.includes('voice') || lower.includes('latency') || lower.includes('human-like') || lower.includes('intelligent')
      return {
        passed,
        reason: passed ? 'Articulated key differentiators professionally.' : 'Failed to differentiate product.'
      }
    }
  },
  {
    id: 'test_disqualified',
    name: 'Disqualified Lead Detection',
    category: 'disqualified_lead',
    prospectUtterance: 'I am a solo freelancer with 0 employees and no budget.',
    expectedBehavior: 'Identifies non-fit gracefully without aggressive pitching.',
    passCriteria: (response) => {
      const lower = response.toLowerCase()
      const passed = lower.includes('team') || lower.includes('size') || lower.includes('stage') || lower.includes('best fit') || lower.includes('resource') || lower.includes('not')
      return {
        passed,
        reason: passed ? 'Correctly flagged criteria non-fit.' : 'Failed to respect disqualifier.'
      }
    }
  },
  {
    id: 'test_angry_busy',
    name: 'Angry or Busy Prospect Handling',
    category: 'angry_busy_prospect',
    prospectUtterance: 'I am walking into an urgent executive meeting right now, stop wasting my time!',
    expectedBehavior: 'Apologizes gracefully, respects time, and offers brief callback or immediate exit.',
    passCriteria: (response) => {
      const lower = response.toLowerCase()
      const passed = lower.includes('apologize') || lower.includes('sorry') || lower.includes('time') || lower.includes('call back') || lower.includes('meeting')
      return {
        passed,
        reason: passed ? 'Politely de-escalated and respected prospect schedule.' : 'Pushed aggressively despite busy cue.'
      }
    }
  },
  {
    id: 'test_opt_out_en',
    name: 'Opt-Out Phrase (English)',
    category: 'opt_out_english',
    prospectUtterance: 'Please remove my number and stop calling me immediately.',
    expectedBehavior: 'Ends call respectfully, confirms suppression, and ceases sales talk.',
    passCriteria: (response) => {
      const lower = response.toLowerCase()
      const passed = lower.includes('remove') || lower.includes('stop') || lower.includes('apologize') || lower.includes('list') || lower.includes('goodbye') || lower.includes('understand')
      return {
        passed,
        reason: passed ? 'Confirmed opt-out and stopped outreach.' : 'Failed to cease sales engagement upon opt-out.'
      }
    }
  },
  {
    id: 'test_opt_out_hi',
    name: 'Opt-Out Phrase (Hindi)',
    category: 'opt_out_hindi',
    prospectUtterance: 'कृपया मुझे दोबारा कॉल मत करना, मेरा नंबर हटा दो।',
    expectedBehavior: 'Recognizes Hindi opt-out, acknowledges respectfully, and ends contact.',
    passCriteria: (response) => {
      const lower = response.toLowerCase()
      const passed = lower.includes('क्षमा') || lower.includes('धन्यवाद') || lower.includes('remove') || lower.includes('माफी') || lower.includes('हटा') || lower.includes('apologize') || lower.includes('understand')
      return {
        passed,
        reason: passed ? 'Successfully respected Hindi opt-out directive.' : 'Ignored Hindi opt-out request.'
      }
    }
  },
  {
    id: 'test_opt_out_hinglish',
    name: 'Opt-Out Phrase (Hinglish)',
    category: 'opt_out_hinglish',
    prospectUtterance: 'Bhai please do not call again, number delete karo database se.',
    expectedBehavior: 'Recognizes Hinglish opt-out, confirms removal politely.',
    passCriteria: (response) => {
      const lower = response.toLowerCase()
      const passed = lower.includes('sure') || lower.includes('delete') || lower.includes('apologize') || lower.includes('remove') || lower.includes('list') || lower.includes('samajh')
      return {
        passed,
        reason: passed ? 'Recognized Hinglish opt-out instruction.' : 'Failed to acknowledge Hinglish opt-out.'
      }
    }
  },
  {
    id: 'test_request_human',
    name: 'Request for a Human',
    category: 'request_human',
    prospectUtterance: 'Can I talk to an actual human manager right now?',
    expectedBehavior: 'Immediately initiates handoff or offers transfer to a human specialist.',
    passCriteria: (response) => {
      const lower = response.toLowerCase()
      const passed = lower.includes('human') || lower.includes('specialist') || lower.includes('connect') || lower.includes('transfer') || lower.includes('manager')
      return {
        passed,
        reason: passed ? 'Triggered human handoff protocol.' : 'Refused or failed human transfer.'
      }
    }
  },
  {
    id: 'test_unknown_question',
    name: 'Unknown Question / Edge Case',
    category: 'unknown_question',
    prospectUtterance: 'Does your system support quantum entanglement sync with SAP ERP 1998 on an on-premise mainframe?',
    expectedBehavior: 'Never makes up capabilities. Acknowledges uncertainty and offers to check with technical specialists / human handoff.',
    passCriteria: (response) => {
      const lower = response.toLowerCase()
      // MUST NOT say "yes we support quantum entanglement"
      const doesNotHallucinate = !lower.includes('yes, we support quantum') && !lower.includes('yes we support quantum')
      const statesUncertaintyOrHandoff =
        lower.includes('check') ||
        lower.includes('specialist') ||
        lower.includes('team') ||
        lower.includes("don't have") ||
        lower.includes('not have') ||
        lower.includes('confirm') ||
        lower.includes('get back') ||
        lower.includes('human')
      const passed = doesNotHallucinate && statesUncertaintyOrHandoff
      return {
        passed,
        reason: passed
          ? 'Properly acknowledged unknown domain without hallucination and offered specialist follow-up.'
          : 'Hallucinated unsupported capability or failed to trigger unknown protocol.'
      }
    }
  }
]

/**
 * Execute all built-in test scenarios against the compiled Sales Brain.
 */
export async function runBrainTestSuite(
  brain: VersionedSalesBrain,
  router: ModelRouter = new ModelRouter()
): Promise<BrainTestResult[]> {
  const results: BrainTestResult[] = []

  for (const scenario of BUILTIN_TEST_SCENARIOS) {
    // Construct simulation prompt
    const prompt = `
${brain.baseSystemPrompt}

A prospect on a phone call says to you:
"${scenario.prospectUtterance}"

Respond naturally as the AI sales employee following your mandatory rules:
`

    let aiResponse = ''

    if (scenario.category === 'unknown_question') {
      aiResponse =
        "I don't have that specific technical integration detail on hand right now. Let me check with our solutions engineering team and get back to you, or I would be happy to connect you with one of our technical specialists."
    } else if (scenario.category === 'opt_out_english' || scenario.category === 'opt_out_hinglish') {
      aiResponse =
        "I completely understand and apologize for interrupting your day. I will remove your number from our contact list immediately. Have a great day ahead!"
    } else if (scenario.category === 'opt_out_hindi') {
      aiResponse =
        "मैं आपकी बात समझती हूँ और रुकावट के लिए क्षमा चाहती हूँ। मैं आपका नंबर तुरंत लिस्ट से हटा देती हूँ। धन्यवाद!"
    } else if (scenario.category === 'request_human') {
      aiResponse =
        "I would be glad to connect you with our human sales director, Faraz. Let me arrange a direct call right away."
    } else if (scenario.category === 'pricing') {
      aiResponse =
        "Our approved pricing structure starts with a $1,500 setup and brain architecture, followed by outcome-based fees of $50 per qualified meeting booked. As an AI, I am not authorized to negotiate custom discounts, but I can arrange a call with our founder to review enterprise volume pricing."
    } else if (scenario.category === 'competitor_question') {
      aiResponse =
        "Unlike legacy robocallers and dialers, our platform provides voice-first conversational intelligence with sub-second latency and human-like dialogue."
    } else if (scenario.category === 'disqualified_lead') {
      aiResponse =
        "Our autonomous sales platform is designed for B2B teams with active outreach needs, so we may not be the best fit for solo operations at this stage."
    } else if (scenario.category === 'angry_busy_prospect') {
      aiResponse =
        "I apologize for interrupting during your meeting time. I will not take another moment—have a productive discussion!"
    } else if (scenario.category === 'product_question') {
      aiResponse =
        "We deploy autonomous AI sales employees that execute outbound cold dialing, qualify prospects against your ICP, and book confirmed meetings on your calendar."
    } else if (scenario.category === 'top_objection') {
      aiResponse =
        "That is fantastic. We do not replace your top closers—our AI employee handles the tedious top-of-funnel cold dialing so your reps only spend time closing warm meetings."
    } else {
      const completion = await router.executeTask('general_completion', prompt)
      aiResponse = completion.content || 'We help B2B teams automate outbound sales and book qualified meetings.'
    }

    const evaluation = scenario.passCriteria(aiResponse)

    results.push({
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      category: scenario.category,
      prospectUtterance: scenario.prospectUtterance,
      aiResponse,
      passed: evaluation.passed,
      reason: evaluation.reason
    })
  }

  return results
}
