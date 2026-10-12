/**
 * PRD v2.1 Phase 6: Zero-Call Interactive Demo Mode
 * Seeds realistic Indian B2B leads allowing founders to run end-to-end
 * product walkthroughs from their smartphones without dialing real telephone lines.
 */

export interface DemoLeadScenario {
  id: string;
  name: string;
  company: string;
  phone: string;
  industry: string;
  expectedOutcome: 'QUALIFIED_AND_BOOKED' | 'DISQUALIFIED_B2C' | 'CALLBACK_REQUESTED' | 'HOT_HANDOFF' | 'OPT_OUT';
  description: string;
  mockDialogue: Array<{ speaker: 'agent' | 'prospect'; text: string }>;
}

export const DEMO_SCENARIO_LEADS: DemoLeadScenario[] = [
  {
    id: 'demo_lead_1',
    name: 'Rahul Sharma',
    company: 'LogisticsHub India',
    phone: '+919876543210',
    industry: 'B2B Logistics SaaS',
    expectedOutcome: 'QUALIFIED_AND_BOOKED',
    description: 'High-volume B2B founder qualifies on ICP and books a 20-minute Google Calendar demo.',
    mockDialogue: [
      { speaker: 'agent', text: 'Namaste Rahul ji, Priya from Desynthic. This is an AI sales rep and our call is recorded. Do you have two minutes?' },
      { speaker: 'prospect', text: 'Haan ji Priya, we are a B2B logistics tech company with around 500 leads every month.' },
      { speaker: 'agent', text: 'That is great! Our autonomous voice agents help qualify those 500 leads within minutes. Would you like to see a demo?' },
      { speaker: 'prospect', text: 'Yes, our founder is open to it. Please schedule a walkthrough for tomorrow.' },
      { speaker: 'agent', text: 'Perfect! Your 20-minute product walkthrough is confirmed for tomorrow 11:30 AM. A Google Meet link has been sent to your email.' },
    ],
  },
  {
    id: 'demo_lead_2',
    name: 'Pooja Verma',
    company: 'UrbanStyle Apparel',
    phone: '+919876543211',
    industry: 'B2C Retail Ecommerce',
    expectedOutcome: 'DISQUALIFIED_B2C',
    description: 'B2C retail company disqualified cleanly on mandatory ICP with evidence quote and deal loss note.',
    mockDialogue: [
      { speaker: 'agent', text: 'Hello Pooja, Priya from Desynthic. This call is conducted by an AI sales rep and recorded for quality. Do you have a moment?' },
      { speaker: 'prospect', text: 'We are a direct-to-consumer B2C clothing brand selling shoes to college students.' },
      { speaker: 'agent', text: 'I understand completely. Our solution is specifically built for B2B sales cycles, so this would not be a strong fit for you today.' },
      { speaker: 'prospect', text: 'Okay, thanks for being upfront.' },
    ],
  },
  {
    id: 'demo_lead_3',
    name: 'Amit Patel',
    company: 'FinServe Advisors',
    phone: '+919876543212',
    industry: 'Financial Advisory',
    expectedOutcome: 'CALLBACK_REQUESTED',
    description: 'Driving executive requests callback; context-preserved follow-up task is scheduled.',
    mockDialogue: [
      { speaker: 'agent', text: 'Hello Amit, Priya from Desynthic. AI sales rep calling on a recorded line. Do you have two minutes?' },
      { speaker: 'prospect', text: 'I am currently driving. Please call me back tomorrow afternoon.' },
      { speaker: 'agent', text: 'No problem at all! I have scheduled a callback for tomorrow at 2:30 PM within approved hours. Drive safe!' },
    ],
  },
  {
    id: 'demo_lead_4',
    name: 'Kunal Singhania',
    company: 'Enterprise Infrastructure Ltd',
    phone: '+919876543213',
    industry: 'Enterprise IT Services',
    expectedOutcome: 'HOT_HANDOFF',
    description: 'Hot buying intent triggers immediate multi-tier escalation with WhatsApp owner alert.',
    mockDialogue: [
      { speaker: 'agent', text: 'Namaste Kunal ji, Priya from Desynthic. AI sales representative calling.' },
      { speaker: 'prospect', text: 'We evaluated your specs and we are ready to sign an annual contract today. Connect me to your business head.' },
      { speaker: 'agent', text: 'Understood immediately! I am escalating your details directly to our senior sales director right now, and they will connect with you within 15 minutes.' },
    ],
  },
  {
    id: 'demo_lead_5',
    name: 'Sunil Mehra',
    company: 'Mehra Exports',
    phone: '+919876543214',
    industry: 'Export Trading',
    expectedOutcome: 'OPT_OUT',
    description: 'Prospect issues refusal in Hinglish; immediately suppressed on suppression list.',
    mockDialogue: [
      { speaker: 'agent', text: 'Namaste Sunil ji, Priya from Desynthic.' },
      { speaker: 'prospect', text: 'Bhai call mat karo dobara, mera number list se hata do.' },
      { speaker: 'agent', text: 'Main samajh sakti hoon. Maine aapka number hamari calling list se hata diya hai aur aage se call nahi aayega. Shubh din.' },
    ],
  },
];

export function getDemoScenarios(): DemoLeadScenario[] {
  return [...DEMO_SCENARIO_LEADS];
}
