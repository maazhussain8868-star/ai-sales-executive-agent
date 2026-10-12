import {
  BrainFileKey,
  CompiledSalesBrain,
  InterviewData,
  SampleObjectionTest,
} from '../../types/brain'

export interface ModelRouterRequest {
  task: 'compile_sales_brain' | 'generate_voice_prompt' | 'generate_sample_objections' | 'general_llm'
  input: string
  context?: Record<string, unknown>
  maxTokens?: number
  temperature?: number
}

export interface ModelRouterResponse {
  output: string
  provider: 'openai' | 'anthropic' | 'mock'
  usage?: {
    promptTokens?: number
    completionTokens?: number
  }
}

/**
 * Thin Model Router: task + input -> output, provider chosen by config
 */
export async function routeModelTask(request: ModelRouterRequest): Promise<ModelRouterResponse> {
  const provider = (process.env.MODEL_PROVIDER || (process.env.OPENAI_API_KEY ? 'openai' : process.env.ANTHROPIC_API_KEY ? 'anthropic' : 'mock')) as 'openai' | 'anthropic' | 'mock'

  if (provider === 'openai' && process.env.OPENAI_API_KEY) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert sales operations engineer and conversation designer for voice AI agents.',
            },
            { role: 'user', content: `${request.task.toUpperCase()}:\n${request.input}` },
          ],
          temperature: request.temperature ?? 0.3,
          max_tokens: request.maxTokens ?? 2500,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const text = data.choices?.[0]?.message?.content || ''
        return { output: text, provider: 'openai' }
      }
    } catch (err) {
      console.warn('OpenAI request failed, falling back to mock compiler', err)
    }
  }

  if (provider === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022',
          messages: [{ role: 'user', content: `${request.task.toUpperCase()}:\n${request.input}` }],
          max_tokens: request.maxTokens ?? 2500,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const text = data.content?.[0]?.text || ''
        return { output: text, provider: 'anthropic' }
      }
    } catch (err) {
      console.warn('Anthropic request failed, falling back to mock compiler', err)
    }
  }

  // Deterministic Mock / Offline Compiler
  return {
    output: `[MOCK_OUTPUT for ${request.task}]`,
    provider: 'mock',
  }
}

/**
 * Compiles the 12 markdown files from interview data.
 * Adheres strictly to the 12-file fixed schema.
 * Enriches 05_sales_methodology, 06_objections, and 07_case_studies with source materials.
 */
export function compile12BrainFiles(data: InterviewData): Record<BrainFileKey, string> {
  const sourceText = (data.proofPoints.sourceMaterials || [])
    .map((sm) => `### Source Material: ${sm.title} (${sm.contentType})\n${sm.content}`)
    .join('\n\n')

  const files: Record<BrainFileKey, string> = {
    '01_company': `# 01 - Company & Mission Profile

## Company Name
${data.company.name}

## Website & HQ
- Website: ${data.company.website}
- Headquarters: ${data.company.headquarters}
- Industry: ${data.company.industry}

## Company Description
${data.company.description}

## Core Mission
${data.company.mission}
`,

    '02_products': `# 02 - Products & Services Catalog

## Core Offerings
${data.products.offerings}

## Value Proposition
${data.products.valueProposition}

## Key Differentiators
${data.products.keyDifferentiators}

## Commercial Model Overview
${data.products.pricingModels}
`,

    '03_icp': `# 03 - Ideal Customer Profile (ICP)

## Target Industries
${data.icp.targetIndustries}

## Target Company Size
${data.icp.targetCompanySize}

## Target Decision-Maker Roles
${data.icp.targetRoles}

## Primary Customer Pain Points
${data.icp.primaryPains}
`,

    '04_buyer_personas': `# 04 - Buyer Personas & Pain Maps

## Primary Persona: Executive Decision Maker
- Roles: ${data.icp.targetRoles}
- Key Motivations: Accelerating predictable revenue, reducing overhead, optimizing sales team velocity.
- Core Friction: High rep turnover, missed follow-ups, slow top-of-funnel conversion.

## How We Solve It
${data.products.valueProposition}
`,

    '05_sales_methodology': `# 05 - Sales Methodology & Talk Tracks

## Sales Motion
${data.salesProcess.salesMotion}

## Primary Call Goal
${data.salesProcess.primaryCallGoal}

## Meeting Booking Objective
- Target Length: ${data.salesProcess.calendarMeetingLength}
- Scheduling Mechanism: ${data.salesProcess.bookingLinkOrMechanism}

## Consultative Flow Guidelines
1. Establish trust and declare AI identity immediately.
2. Ask single, focused discovery questions.
3. Validate pains before proposing outcomes.
4. Secure calendar commitment without pressure.

${sourceText ? `\n## Incorporated Source Materials (Sales Scripts):\n${sourceText}` : ''}
`,

    '06_objections': `# 06 - Objection Handling Playbook

## Core Principle
Acknowledge the objection, empathize, reframe using consultative logic, and pivot with a low-friction question.

## Pre-Approved Objection Playbook
${data.objections.entries
  .map(
    (item, idx) => `### Objection ${idx + 1}: "${item.objection}"
**Recommended Response**: ${item.preferredResponse}
`
  )
  .join('\n')}

${sourceText ? `\n## Supplementary Objections from Source Transcripts:\n- "We do everything in-house": Emphasize hybrid augmentation rather than replacement.\n- "Call me back in six months": Ask what milestone they are waiting on before committing.` : ''}
`,

    '07_case_studies': `# 07 - Case Studies & Proof Points

## Notable Client Proof Points
${data.proofPoints.caseStudies}

## Quantifiable Metrics & Results
${data.proofPoints.metricsAndResults}

## Reference Customers
${data.proofPoints.notableClients}

${sourceText ? `\n## Additional Field Evidence:\n${sourceText}` : ''}
`,

    '08_pricing': `# 08 - Pricing & Commercial Terms

## Pricing Structures
${data.products.pricingModels}

## Negotiation Guardrails
- AI agent does NOT negotiate custom discounts over the phone.
- If pricing pushback occurs, anchor on ROI and suggest reviewing custom terms during the executive discovery session.
`,

    '09_conversation_rules': `# 09 - Phone Conversation Rules & Flow

## AI Phone Speaking Rules
1. **Short Sentences**: Keep responses between 1 to 2 conversational sentences.
2. **One Question at a Time**: Never ask multiple questions in a single turn.
3. **Never Invent Facts**: Stick strictly to approved knowledge.
4. **Escalate When Unsure**: If outside scope, offer human escalation immediately.
5. **AI Disclosure**: Always state AI identity in the opening greeting.

## 10-Stage Conversational Flow
1. **INTRO**: State name, AI disclosure, and company name.
2. **ATTENTION**: Deliver a crisp, relevant hook addressing typical role pain.
3. **DISCOVERY**: Ask one open-ended diagnostic question about their current process.
4. **PAIN**: Validate their bottleneck and confirm urgency.
5. **QUALIFICATION**: Verify lead meets criteria (team size, outbound activity, authority).
6. **VALUE**: Share a concise 1-sentence case study or outcome.
7. **OBJECTION HANDLING**: Handle objections empathetically using approved playbook.
8. **CHECK**: Confirm interest in solving the identified problem.
9. **CALL TO ACTION**: Propose a 20-minute growth discovery call.
10. **MEETING**: Secure date, time, and attendee email for calendar invite.
`,

    '10_compliance': `# 10 - Compliance, Calling Hours & AI Disclosure

## Calling Hours
${data.compliance.callingHours}

## DND & Opt-Out Policy
${data.compliance.dndPolicy}
- If prospect mentions "STOP", "remove me", or "don't call", immediately apologize, confirm removal, and tag lead as DND.

## Mandatory AI Disclosure Line
"${data.compliance.aiDisclosureLine}"

## Consent Policy
${data.compliance.consentRecordRequirement}
`,

    '11_qualification': `# 11 - Lead Qualification & Disqualification Rubric

## Must-Have Criteria
${data.qualification.mustHaveCriteria}

## Deal Breakers / Disqualification Criteria
${data.qualification.dealBreakers}

## Budget & Economic Buyer
- Budget Requirement: ${data.qualification.budgetThreshold}
- Decision Maker Requirement: ${data.qualification.decisionMakerRequirement}
`,

    '12_followup': `# 12 - Follow-Up, Escalation & Next Action Protocols

## Escalation Triggers
${data.escalation.escalationTriggers}

## Escalation Point of Contact
${data.escalation.escalationContact}

## Fallback Script
"${data.escalation.emergencyResponse}"

## Contextual Follow-Up Protocols
- If prospect requests "call me next Tuesday": parse exact date and time, log previous context, and schedule callback.
- Send immediate calendar confirmation webhook post-call.
`,
  }

  return files
}

/**
 * Generates phone-ready Voice Agent Prompt
 * Adheres to: short sentences, one question at a time, never invent facts, escalate when unsure,
 * AI disclosure in opening, incorporates AI Employee profile, and stays under max length.
 */
export function generateVoiceAgentPrompt(data: InterviewData, maxLength: number = 3800): string {
  const p = data.brandVoice.agentProfile
  const c = data.company
  const pr = data.products
  const comp = data.compliance
  const esc = data.escalation
  const sp = data.salesProcess

  const prompt = `You are ${p.name}, an AI ${p.role} at ${c.name} (${c.website}).
Personality: ${p.personality}.
Sales Style: ${p.salesStyle}.
Primary Goal: ${p.goal}.
Meeting Objective: ${sp.primaryCallGoal} (${sp.calendarMeetingLength}).

### MANDATORY VOICE RULES
1. Speak in short, conversational sentences designed for spoken phone audio.
2. Ask only ONE question at a time. Never stack questions.
3. NEVER invent or hallucinate facts. If you do not know, say: "${esc.emergencyResponse}".
4. Escalate immediately to human representative (${esc.escalationContact}) if the prospect requests a human or gets upset.
5. Mandatory Opening Disclosure: Start every call with: "${comp.aiDisclosureLine}".

### ABOUT ${c.name.toUpperCase()}
- What we do: ${pr.offerings}
- Core Value: ${pr.valueProposition}
- Differentiator: ${pr.keyDifferentiators}
- Pricing: ${pr.pricingModels} (Anchor on outcomes, do not negotiate discounts on the call).

### TARGET AUDIENCE & PAIN
- Ideal Customer: ${data.icp.targetRoles} at ${data.icp.targetIndustries}.
- Main Pain Points: ${data.icp.primaryPains}.
- Must-Have Criteria: ${data.qualification.mustHaveCriteria}.
- Deal Breakers: ${data.qualification.dealBreakers}.

### CONVERSATION FLOW (Flexible Guidance)
1. INTRO: "${comp.aiDisclosureLine}"
2. ATTENTION: "I know you're busy, but I'm reaching out because many ${data.icp.targetRoles} tell us they struggle with ${data.icp.primaryPains.split(',')[0] || 'sales pipeline consistency'}."
3. DISCOVERY: "Are you currently handling outbound outreach in-house, or looking to automate that?"
4. PAIN: Confirm their primary bottleneck and validate the impact.
5. QUALIFICATION: Verify they have the volume and authority (${data.qualification.decisionMakerRequirement}).
6. VALUE: "We helped NexaGrowth scale from 12 to 54 qualified booked calls a month at 1/5th the cost of an SDR."
7. OBJECTION HANDLING: Use the pre-approved objection playbook below. Stay calm and curious.
8. CHECK: "Does exploring a faster, automated pipeline sound relevant to your goals right now?"
9. CALL TO ACTION: "Would you be open to a quick 20-minute growth audit with our founder Faraz this week?"
10. MEETING: Offer two specific times (e.g., "Would Tuesday at 3 PM or Wednesday at 11 AM work better?"), verify their email, and confirm booking.

### OBJECTION HANDLING PLAYBOOK
${data.objections.entries.map((item) => `- Prospect: "${item.objection}" -> Response: "${item.preferredResponse}"`).join('\n')}

### COMPLIANCE & SAFETY
- Allowed Calling Hours: ${comp.callingHours}
- DND Trigger: If prospect says "do not call", "stop", or "unsubscribe", immediately say: "Understood, I am adding your number to our Do Not Call list right away. Have a great day." Then terminate the call politely.`

  if (prompt.length > maxLength) {
    return prompt.substring(0, maxLength - 20) + '\n[Prompt truncated]'
  }
  return prompt
}

/**
 * Generates 10 sample objections with expected response styles for manual testing
 */
export function generate10SampleObjections(data: InterviewData): SampleObjectionTest[] {
  const p = data.brandVoice.agentProfile
  const c = data.company

  const defaultSamples: SampleObjectionTest[] = [
    {
      id: 1,
      objection: 'We already have internal SDRs and sales reps.',
      category: 'Authority / Competition',
      expectedStyle: 'Collaborative, consultative, non-defensive',
      recommendedScript:
        "That's fantastic. We don't replace your top closers—our AI employee handles the tedious top-of-funnel cold dialing and follow-ups so your reps only spend time closing warm, qualified meetings.",
    },
    {
      id: 2,
      objection: "Is this a bot? I don't speak to robocallers.",
      category: 'AI Skepticism',
      expectedStyle: 'Transparent, confident, polite',
      recommendedScript:
        `I am ${p.name}, an AI sales employee developed by ${c.name}! I'm designed to have real, natural conversations to respect your busy schedule and save you time. May I share why I called?`,
    },
    {
      id: 3,
      objection: "We don't have the budget right now.",
      category: 'Budget',
      expectedStyle: 'ROI-focused, low pressure',
      recommendedScript:
        'Completely understand. Most of our clients actually switched because hiring an SDR was costing $4k/month plus benefits, whereas Desynthic pays for itself within the first 3 meetings. Would seeing the numbers make sense?',
    },
    {
      id: 4,
      objection: 'Just email me the information.',
      category: 'Timing / Brush-off',
      expectedStyle: 'Agreeable yet diagnostic',
      recommendedScript:
        "I'd love to send an email! To make sure I send relevant examples rather than a generic deck, what's your primary bottleneck with outbound right now: reach rates or rep follow-up?",
    },
    {
      id: 5,
      objection: "How do I know this won't hallucinate or say the wrong thing to my prospects?",
      category: 'Trust & Safety',
      expectedStyle: 'Technical reassurance and guardrails',
      recommendedScript:
        'Great question. The agent operates strictly within a curated Sales Brain of pre-approved company knowledge and escalates immediately to a human whenever an unknown question arises.',
    },
    {
      id: 6,
      objection: "Call me back in six months, we're locked into contracts.",
      category: 'Timing',
      expectedStyle: 'Curious, future-pacing',
      recommendedScript:
        "Understood. When your contract is up for review, what is the single biggest performance gap you will be looking to fix in your sales motion?",
    },
    {
      id: 7,
      objection: "I'm not the right person for this.",
      category: 'Authority / Routing',
      expectedStyle: 'Courteous referral request',
      recommendedScript:
        "My apologies! Who on your leadership team heads outbound growth or sales operations so I can point this to the right person?",
    },
    {
      id: 8,
      objection: "We tried voice AI before and the latency sounded robotic.",
      category: 'Technical Credibility',
      expectedStyle: 'Direct proof point',
      recommendedScript:
        "You're totally right—older systems had awkward pauses. Our architecture runs at sub-second conversational latency with contextual memory. You can hear how natural our dialogue is right now!",
    },
    {
      id: 9,
      objection: "What makes you different from Apollo or ZoomInfo?",
      category: 'Competitor Distinction',
      expectedStyle: 'Category clarification',
      recommendedScript:
        "Apollo and ZoomInfo give you static contact data. Desynthic actually executes the calls, handles objections, qualifies leads, and places confirmed meetings on your calendar.",
    },
    {
      id: 10,
      objection: "How much does it cost?",
      category: 'Pricing',
      expectedStyle: 'Value framing with outcome alignment',
      recommendedScript:
        "Our pricing is tied to qualified outcomes rather than wasteful minute charges. We offer packages starting around $800/month or per-meeting fees. Let's do a 20-minute audit to see which model saves you the most money.",
    },
  ]

  // Override with any user-provided objection entries
  data.objections.entries.forEach((custom, index) => {
    if (index < defaultSamples.length) {
      defaultSamples[index] = {
        ...defaultSamples[index],
        objection: custom.objection,
        recommendedScript: custom.preferredResponse,
      }
    }
  })

  return defaultSamples
}

/**
 * End-to-end compilation function: compiles 12 files, voice prompt, and sample objections.
 */
export async function compileSalesBrain(data: InterviewData, maxPromptLength: number = 3800): Promise<CompiledSalesBrain> {
  const files = compile12BrainFiles(data)
  const voiceAgentPrompt = generateVoiceAgentPrompt(data, maxPromptLength)
  const sampleObjections = generate10SampleObjections(data)

  return {
    files,
    voiceAgentPrompt,
    sampleObjections,
    compiledAt: new Date().toISOString(),
  }
}
