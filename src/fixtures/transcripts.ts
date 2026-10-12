import { CallIntent, ObjectionType } from '@/types/intelligence'

export interface FixtureTranscript {
  id: string
  title: string
  toNumber: string
  transcript: string
  expected: {
    intent: CallIntent
    humanHandoff: boolean
    humanHandoffReasonKeyword?: string
    followUpRequired: boolean
    followUpTargetDay?: string
    minLeadScore?: number
    maxLeadScore?: number
    isQualified: boolean
    expectedObjections?: ObjectionType[]
  }
}

export const FIXTURE_TRANSCRIPTS: FixtureTranscript[] = [
  {
    id: 'fixture_01_high_intent_booked',
    title: 'High Intent - Meeting Booked',
    toNumber: '+919876543210',
    transcript: `Priya: Hello, this is Priya, an AI sales assistant calling from Desynthic on a recorded line. Am I speaking with Rahul?
Rahul: Yes, speaking. What is this about?
Priya: I know you are busy, but I noticed you head outbound growth at ScaleSync. Many agency leaders tell us keeping sales reps consistent on top-of-funnel calls is a major headache. Are you handling outbound in-house?
Rahul: Yes, we have two SDRs but turnover has been rough and pipeline is inconsistent.
Priya: Exactly why we created Desynthic. Our AI employee handles the cold dialing and books qualified meetings directly on your calendar for 1/5th the cost of an SDR. Would you be open to a 20-minute growth audit this Thursday at 3 PM?
Rahul: Sure, Thursday at 3 PM sounds fine. Send the invite to rahul@scalesync.io.`,
    expected: {
      intent: 'high_intent',
      humanHandoff: false,
      followUpRequired: false,
      minLeadScore: 90,
      isQualified: true,
    },
  },
  {
    id: 'fixture_02_call_next_tuesday',
    title: 'Contextual Follow-Up - "Call me next Tuesday"',
    toNumber: '+919876543211',
    transcript: `Priya: Hello, this is Priya, an AI sales assistant calling from Desynthic on a recorded line. Am I speaking with Amit?
Amit: Hi Priya, yes. Look, I'm heading into an executive all-hands meeting right now, please call me next Tuesday at 10 AM, we can discuss our outbound reps then.
Priya: Understood Amit! I will schedule a callback for next Tuesday at 10 AM. Have a productive meeting!`,
    expected: {
      intent: 'positive',
      humanHandoff: false,
      followUpRequired: true,
      followUpTargetDay: 'tuesday',
      minLeadScore: 65,
      isQualified: true,
    },
  },
  {
    id: 'fixture_03_human_handoff_requested',
    title: 'Human Handoff - Explicit Human Request',
    toNumber: '+919876543212',
    transcript: `Priya: Hello, this is Priya, an AI sales assistant calling from Desynthic on a recorded line.
Vikram: Stop talking. Can I speak to a real human person right now? Connect me with a human representative immediately.
Priya: Absolutely Vikram. I will immediately have Faraz, our founder, reach out to you directly today with the complete details.`,
    expected: {
      intent: 'neutral',
      humanHandoff: true,
      humanHandoffReasonKeyword: 'human',
      followUpRequired: false,
      isQualified: true,
    },
  },
  {
    id: 'fixture_04_enterprise_custom_pricing',
    title: 'High-Value Enterprise Negotiation',
    toNumber: '+919876543213',
    transcript: `Priya: Hello, this is Priya, an AI sales assistant calling from Desynthic on a recorded line.
Ananya: Hi Priya. We have an enterprise team of over 100 reps globally and we need custom SLA terms and an enterprise RFP proposal above $50k ARR. Can your system handle this volume?
Priya: That is a major enterprise deployment Ananya! I will escalate this immediately to our leadership team and founder Faraz to prepare a custom enterprise SLA package for you today.`,
    expected: {
      intent: 'high_intent',
      humanHandoff: true,
      humanHandoffReasonKeyword: 'enterprise',
      followUpRequired: false,
      minLeadScore: 85,
      isQualified: true,
    },
  },
  {
    id: 'fixture_05_angry_compliance_threat',
    title: 'Sensitive Compliance / Legal Grievance',
    toNumber: '+919876543214',
    transcript: `Priya: Hello, this is Priya, an AI sales assistant calling from Desynthic on a recorded line.
Rohan: How dare you dial my personal mobile number! This is harassment! I am having my lawyer send a formal legal notice if you ever call me again. Remove me immediately!
Priya: I apologize sincerely Rohan. I am immediately adding your number to our Do Not Call list right now and alerting our compliance officer. You will not receive further calls.`,
    expected: {
      intent: 'negative',
      humanHandoff: true,
      humanHandoffReasonKeyword: 'legal',
      followUpRequired: false,
      maxLeadScore: 25,
      isQualified: false,
    },
  },
  {
    id: 'fixture_06_budget_objection_handled',
    title: 'Budget Objection Handled with ROI',
    toNumber: '+919876543215',
    transcript: `Priya: Hello, this is Priya, an AI sales assistant calling from Desynthic on a recorded line. Are you looking to scale outbound pipeline?
Sneha: We don't have the budget right now. Times are tight.
Priya: Completely understand Sneha. Most of our clients actually switched because hiring an SDR was costing $4k/month plus benefits, whereas Desynthic starts around $800/month and pays for itself within the first 3 meetings. Would seeing the numbers make sense?
Sneha: Actually, that sounds interesting. Tell me more about how you implement this for B2B agencies.`,
    expected: {
      intent: 'curious',
      humanHandoff: false,
      followUpRequired: false,
      minLeadScore: 60,
      isQualified: true,
      expectedObjections: ['budget'],
    },
  },
  {
    id: 'fixture_07_outside_approved_knowledge',
    title: 'Question Outside Approved Knowledge',
    toNumber: '+919876543216',
    transcript: `Priya: Hello, this is Priya, an AI sales assistant calling from Desynthic on a recorded line.
Karan: Hi, are your voice models HIPAA certified with on-premise air-gapped quantum encryption servers for government defense contractors?
Priya: I will immediately have Faraz, our founder, reach out to you directly today with the complete technical compliance details.`,
    expected: {
      intent: 'neutral',
      humanHandoff: true,
      humanHandoffReasonKeyword: 'outside approved knowledge',
      followUpRequired: false,
      isQualified: true,
    },
  },
  {
    id: 'fixture_08_unqualified_b2c',
    title: 'Unqualified B2C Consumer Business',
    toNumber: '+919876543217',
    transcript: `Priya: Hello, this is Priya, an AI sales assistant calling from Desynthic on a recorded line. Do you run an outbound sales team?
Pooja: No, we run a direct-to-consumer jewelry website selling $15 rings to individual B2C consumers on Instagram. We don't do outbound B2B calling at all.
Priya: Understood Pooja! Desynthic is strictly built for B2B sales pipelines, so this would not be a good fit for your consumer shop. Wishing you the best with your jewelry store!`,
    expected: {
      intent: 'negative',
      humanHandoff: false,
      followUpRequired: false,
      maxLeadScore: 20,
      isQualified: false,
    },
  },
  {
    id: 'fixture_09_skeptical_latency_proof',
    title: 'AI Skepticism Handled - Trust Proof Point',
    toNumber: '+919876543218',
    transcript: `Priya: Hello, this is Priya, an AI sales assistant calling from Desynthic on a recorded line.
Aditya: We tried voice AI bots before and the latency sounded robotic and kept hallucinating.
Priya: You are totally right Aditya—older systems had awkward pauses. Our architecture runs at sub-second conversational latency with contextual memory. You can hear how natural our dialogue is right now!
Aditya: That is actually surprisingly fast. How does your pilot work?`,
    expected: {
      intent: 'curious',
      humanHandoff: false,
      followUpRequired: false,
      minLeadScore: 60,
      isQualified: true,
      expectedObjections: ['trust'],
    },
  },
  {
    id: 'fixture_10_busy_quick_brush_off',
    title: 'Busy Prospect - Callback Tomorrow',
    toNumber: '+919876543219',
    transcript: `Priya: Hello, this is Priya, an AI sales assistant calling from Desynthic on a recorded line.
Meera: I am super busy running into a client meeting right now. Call me back tomorrow morning.
Priya: Got it Meera! I will schedule a callback for tomorrow morning. Have a great meeting!`,
    expected: {
      intent: 'positive',
      humanHandoff: false,
      followUpRequired: true,
      minLeadScore: 60,
      isQualified: true,
    },
  },
]
