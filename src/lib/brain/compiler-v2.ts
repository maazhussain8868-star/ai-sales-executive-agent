import {
  DiscoveryInterviewData,
  VersionedSalesBrain,
  BrainSectionKey,
  BrainSection
} from '@/types/brain-v2'

export const BASE_AI_SYSTEM_RULES = `
=== MANDATORY OPERATIONAL RULES (PRD v2.1) ===
1. ABSOLUTE TRUTHFULNESS: Never invent capabilities, prices, results, metrics or calendar availability. If a capability or detail is not explicitly written in your approved knowledge base, state clearly that you do not have that information.
2. UNKNOWN QUESTION PROTOCOL: When asked an unknown question or technical edge case, never speculate or make up an answer. Reply honestly: "I don't have that specific detail on hand right now—let me check with our solutions team and get back to you, or I can connect you with one of our specialists."
3. REFUSAL & OPT-OUT PROTOCOL: If the prospect expresses a clear refusal or opt-out phrase in English, Hindi, or Hinglish (e.g., "stop calling", "do not call", "not interested", "mat call karo", "number hata do"), apologize politely, cease sales advocacy immediately, and end the conversation respectfully.
4. HUMAN ESCALATION & NEGOTIATION: You are strictly NOT authorized to negotiate pricing or make bespoke commercial concessions. If a prospect demands discounts, bespoke contract terms, or expresses low confidence in an automated answer, immediately offer to hand off to a human specialist.
5. AI DISCLOSURE: You must state your identity as an AI sales representative in the opening 20 seconds of the call.
==============================================
`

/**
 * Compiles a guided discovery interview into modular editable sections and base system prompt.
 */
export function compileSalesBrainV2(
  data: DiscoveryInterviewData,
  workspaceId: string,
  existingVersion: number = 0
): VersionedSalesBrain {
  const sections: Record<BrainSectionKey, BrainSection> = {
    company: {
      key: 'company',
      title: 'Company & Mission Profile',
      content: `# ${data.company.name}
- **Website**: ${data.company.website}
- **Industry**: ${data.company.industry}
- **Headquarters**: ${data.company.headquarters}
- **Overview**: ${data.company.description}`,
      updatedAt: new Date().toISOString()
    },
    products: {
      key: 'products',
      title: 'Offerings & Value Proposition',
      content: `## Offerings
${data.offer.offerings}

### Core Value Proposition
${data.offer.valueProposition}

### Key Differentiators
${data.offer.differentiators}`,
      updatedAt: new Date().toISOString()
    },
    icp: {
      key: 'icp',
      title: 'Ideal Customer Profile (ICP) & Disqualifiers',
      content: `## Target Criteria
- **Target Industries**: ${data.icp.targetIndustries}
- **Company Size**: ${data.icp.targetCompanySize}
- **Target Roles**: ${data.icp.targetRoles}

### Disqualifiers (Do Not Pursue)
${data.icp.disqualifiers}

### Primary Buyer Pains
${data.icp.primaryPains}`,
      updatedAt: new Date().toISOString()
    },
    objections: {
      key: 'objections',
      title: 'Objection Handling Playbook',
      content: data.objections
        .map(
          (o, idx) => `### Objection ${idx + 1}: "${o.objection}"
**Approved Response**: "${o.approvedResponse}"`
        )
        .join('\n\n'),
      updatedAt: new Date().toISOString()
    },
    pricing: {
      key: 'pricing',
      title: 'Approved Pricing & Commercial Terms',
      content: `## Commercial Terms
- **Approved Pricing Model**: ${data.pricing.approvedPricingModel}
- **Negotiable by AI**: ${data.pricing.negotiable ? 'Yes' : 'NO - Strictly Fixed by Founder'}
- **Notes**: ${data.pricing.pricingNotes}`,
      updatedAt: new Date().toISOString()
    },
    compliance: {
      key: 'compliance',
      title: 'Compliance, Disclosure & Prohibited Claims',
      content: `## Prohibited Claims (Never Utter)
${data.prohibitedClaims}

## Opening Mandatory AI Disclosure
"${data.callOpening.mandatoryAiDisclosure}"

## Opening Greeting
"${data.callOpening.greeting}"`,
      updatedAt: new Date().toISOString()
    },
    voice_and_tone: {
      key: 'voice_and_tone',
      title: 'Brand Voice, Persona & Languages',
      content: `- **Persona Name**: ${data.brandVoice.personaName}
- **Tone**: ${data.brandVoice.tone}
- **Energy Level**: ${data.brandVoice.energy}
- **Supported Languages**: ${data.languages.join(', ')}`,
      updatedAt: new Date().toISOString()
    },
    handoff_rules: {
      key: 'handoff_rules',
      title: 'Human Handoff & Escalation Protocols',
      content: `## Escalation Triggers
${data.handoffRules.triggers.map((t) => `- ${t}`).join('\n')}

- **Escalation Contact**: ${data.handoffRules.contactPersonName} (${data.handoffRules.contactEmail})`,
      updatedAt: new Date().toISOString()
    }
  }

  const baseSystemPrompt = `
${BASE_AI_SYSTEM_RULES}

You are ${data.brandVoice.personaName}, the AI sales employee for ${data.company.name}.
Your goal is: ${data.salesProcess.primaryCallGoal}.

=== APPROVED SECTIONS ===
${Object.values(sections)
  .map((s) => `### [${s.title}]\n${s.content}`)
  .join('\n\n')}
`

  return {
    id: `brain_${Date.now()}`,
    workspaceId,
    version: existingVersion + 1,
    isActive: true,
    baseSystemPrompt: baseSystemPrompt.trim(),
    aiDisclosureLine: data.callOpening?.mandatoryAiDisclosure || 'This is an AI sales representative calling from Desynthic, and this call is recorded for quality.',
    optOutProtocol: 'Stop outreach immediately upon verbal refusal in English, Hindi, or Hinglish.',
    sections,
    createdAt: new Date().toISOString(),
    activatedAt: new Date().toISOString()
  }
}

export const compileSalesBrain = compileSalesBrainV2

