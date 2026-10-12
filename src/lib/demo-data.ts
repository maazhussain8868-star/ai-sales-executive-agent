import { InterviewData } from '../types/brain'

export const DEMO_BUSINESS_DATA: InterviewData = {
  company: {
    name: 'Desynthic',
    website: 'https://desynthic.com',
    industry: 'AI & Workflow Automation',
    description: 'Desynthic builds high-impact AI sales employees and autonomous operations for scaling B2B agencies and technology companies.',
    mission: 'Empower growth teams to scale outbound revenue and lead qualification effortlessly with intelligent, voice-first AI agents.',
    headquarters: 'Bengaluru / Remote',
  },
  products: {
    offerings: 'Autonomous AI Sales Development Agents (Outbound voice, WhatsApp follow-ups, and post-call CRM sync). Full-stack setup and prompt engineering.',
    valueProposition: 'Replace chaotic manual outreach with an always-on AI employee that books qualified meetings with high-intent decision makers at 1/5th the traditional SDR cost.',
    keyDifferentiators: 'Voice-first with sub-second latency, human-like contextual conversational memory, automatic CRM qualification scoring, and zero cold minute billing (outcomes only).',
    pricingModels: 'Setup & Brain Architecture: $1,500 one-time + Outcome fee ($50 per qualified meeting booked) or monthly retainer ($800/mo including 2,000 call minutes).',
  },
  icp: {
    targetIndustries: 'B2B Marketing Agencies, SaaS, Real Estate Tech, High-Ticket Professional Services.',
    targetCompanySize: '10 to 100 employees, $1M to $15M ARR, having active outbound sales requirements.',
    targetRoles: 'Founders, Chief Executive Officers, Heads of Sales, VPs of Marketing, Managing Directors.',
    primaryPains: 'High SDR turnover, inconsistent sales calling activity, poor follow-up hygiene, skyrocketing customer acquisition costs, and reps wasting time dialing unqualified leads.',
  },
  salesProcess: {
    salesMotion: 'Outbound cold and warm reactivation phone calls -> qualifying fit and pain -> booking 20-minute Zoom discovery call with Desynthic solution architects.',
    primaryCallGoal: 'Identify active outbound bottlenecks and confirm a 20-minute executive demo on the founder calendar.',
    calendarMeetingLength: '20 minutes',
    bookingLinkOrMechanism: 'https://cal.com/desynthic/growth-audit',
  },
  objections: {
    entries: [
      {
        objection: "We already have human sales reps / SDRs.",
        preferredResponse: "That's fantastic. We don't replace your top closers—our AI employee handles the tedious top-of-funnel cold dialing and follow-ups so your reps only spend time closing warm, qualified meetings."
      },
      {
        objection: "Is this an automated robot? I don't talk to robocalls.",
        preferredResponse: "I am Priya, an AI sales employee developed by Desynthic! I'm designed to have real, natural conversations to respect your busy schedule and save you time. May I share why I called?"
      },
      {
        objection: "We don't have the budget right now.",
        preferredResponse: "Completely understand. Most of our clients actually switched because hiring an SDR was costing $4k/month plus benefits, whereas Desynthic pays for itself within the first 3 meetings. Would seeing the numbers make sense?"
      },
      {
        objection: "Just send me an email with the information.",
        preferredResponse: "I'd love to send an email! To make sure I send relevant examples rather than a generic deck, what's your primary bottleneck with outbound right now: reach rates or rep follow-up?"
      },
      {
        objection: "How do I know this won't hallucinate or say the wrong thing to my prospects?",
        preferredResponse: "Great question. The agent operates strictly within a curated Sales Brain of pre-approved company knowledge and escalates immediately to a human whenever an unknown question arises."
      }
    ]
  },
  qualification: {
    mustHaveCriteria: 'Currently doing or planning outbound sales outreach; deal size > $3,000; at least 500 prospect leads per month.',
    dealBreakers: 'B2C low-ticket sales (<$100), businesses with no target audience clarity, or unwillingness to use AI tooling.',
    budgetThreshold: 'At least $1,000/month available for sales development or outbound growth.',
    decisionMakerRequirement: 'Owner, Founder, VP, or Director of Sales who has direct authority over go-to-market tools.'
  },
  escalation: {
    escalationTriggers: 'Prospect demands immediate human escalation, requests enterprise multi-country telephony compliance review, offers enterprise RFP >$50k, or reports legal/compliance grievance.',
    escalationContact: 'Faraz (Founder, Desynthic) - faraz@desynthic.com / +91-9876543210',
    emergencyResponse: 'Politely acknowledge: "I will immediately have Faraz, our founder, reach out to you directly today with the complete details."'
  },
  compliance: {
    callingHours: '10:00 AM to 6:30 PM Indian Standard Time (IST), Monday through Saturday. No Sunday calls.',
    dndPolicy: 'Strict enforcement: check National DND register; immediately mark do-not-call and never dial again if requested.',
    aiDisclosureLine: 'Hello, this is Priya, an AI sales assistant calling from Desynthic on a recorded line.',
    consentRecordRequirement: 'Store explicit lead timestamp, source list, and record opt-in status before initiating outbound calls.'
  },
  brandVoice: {
    tone: 'Crisp, professional, empathetic, consultative, confident, and articulate.',
    vocabularyToAvoid: 'cheap, pitch, blast, spam, robot, generic buzzwords, guaranteed overnight millions',
    keyPhrasesToUse: 'outcome-focused, predictable pipeline, sales velocity, qualified meetings, bespoke AI employee',
    agentProfile: {
      name: 'Priya',
      role: 'Outbound Sales Development Representative',
      industry: 'AI & Workflow Automation',
      personality: 'Warm, confident, consultative, attentive, and respectful of executive time',
      salesStyle: 'Consultative questioning and active listening',
      goal: 'Identify outbound sales challenges and book a 20-minute executive growth audit'
    }
  },
  proofPoints: {
    caseStudies: 'Case Study 1: NexaGrowth Agency scaled booked qualified calls from 12/month to 54/month in 45 days. Case Study 2: CloudScale Tech cut cost per qualified pipeline opportunity by 62% using automated multi-channel sequences.',
    metricsAndResults: 'Average 3.8x ROI within 60 days; 94% objection resolution accuracy; under 1.2s voice response latency.',
    notableClients: 'GrowthBridge Media, ScaleSync Agency, CloudCraft Systems',
    sourceMaterials: [
      {
        id: 'sm_01',
        title: 'Desynthic SDR Playbook Script 2026',
        contentType: 'script',
        content: 'Hook: Founder to founder, we know outbound dialing is draining your account executives. Pitch: Desynthic places an autonomous voice agent that pre-qualifies and hands off ready-to-buy appointments.'
      },
      {
        id: 'sm_02',
        title: 'NexaGrowth Agency Detailed Case Study',
        contentType: 'case_study',
        content: 'NexaGrowth was spending $7,500/month on junior SDRs with 40% attrition. After deploying Desynthic AI employee Priya, outbound capacity quadrupled with 18% higher lead-to-meeting conversion.'
      }
    ]
  }
}
