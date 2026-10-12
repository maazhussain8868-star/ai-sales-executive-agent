/**
 * PRD v2.1 Phase 6: Pre-Flight Campaign Release Gate
 * A mandatory multi-point checklist that must be fully green (100%)
 * before any live outbound dialing campaign can be dispatched.
 */

import { ReleaseGateReport, ReleaseGateCheckItem } from '@/types/hardening-v2';
import { CompiledSalesBrain } from '@/types/brain-v2';
import { CampaignConfigV2 } from '@/types/campaign-v2';
import { detectInCallOptOut } from '@/lib/voice/opt-out-detector';

export function evaluateCampaignReleaseGate(params: {
  brain?: CompiledSalesBrain;
  campaign?: Partial<CampaignConfigV2>;
  hasApprovedTemplates?: boolean;
  dndAdapterOnline?: boolean;
}): ReleaseGateReport {
  const { brain, campaign, hasApprovedTemplates = true, dndAdapterOnline = true } = params;

  const items: ReleaseGateCheckItem[] = [
    // 1. Disclosure Line Check
    {
      id: 'gate_disclosure',
      category: 'COMPLIANCE',
      name: 'Mandatory AI & Recording Disclosure Line',
      description: 'System must state AI identity and recording disclosure in opening turn.',
      passed: Boolean(brain?.aiDisclosureLine && brain.aiDisclosureLine.trim().length > 10),
      remediationAdvice: 'Configure a clear AI disclosure line in the Sales Brain (e.g. "This is an AI sales rep from Desynthic, and this call is recorded.").',
    },

    // 2. Calling Window Check (10:00 - 18:00 IST + Sunday Shutdown)
    {
      id: 'gate_calling_window',
      category: 'SAFETY',
      name: 'Approved Calling Hours (10:00 - 18:00 IST & Sunday Shutdown)',
      description: 'Outbound calls must strictly be constrained within TRAI permitted hours.',
      passed: Boolean(
        campaign?.callingWindow &&
          (campaign.callingWindow.startHour ?? 0) >= 10 &&
          (campaign.callingWindow.endHour ?? 24) <= 18 &&
          campaign.callingWindow.sundayShutdown !== false
      ),
      remediationAdvice: 'Set campaign calling window start hour >= 10, end hour <= 18, and ensure Sunday shutdown is enabled.',
    },

    // 3. DND / NDNC Scrub Adapter Status
    {
      id: 'gate_dnd_adapter',
      category: 'TELEPHONY',
      name: 'National Do Not Call (NDNC) Scrub Active',
      description: 'Lead phone numbers must be scrubbed against DND registry before dialing.',
      passed: Boolean(dndAdapterOnline),
      remediationAdvice: 'Ensure DND / NDNC registry adapter is online and connected.',
    },

    // 4. Opt-Out Test Passed (Multilingual EN, HI, Hinglish)
    {
      id: 'gate_opt_out_suite',
      category: 'SAFETY',
      name: 'Multilingual In-Call Opt-Out Verified',
      description: 'In-call opt-out engine must accurately recognize refusal in English, Hindi, and Hinglish.',
      passed:
        detectInCallOptOut('stop calling').isOptOut &&
        detectInCallOptOut('call mat karo dobara').isOptOut &&
        detectInCallOptOut('दोबारा कॉल मत करना').isOptOut,
      remediationAdvice: 'Run opt-out test suite to verify multilingual refusal expressions.',
    },

    // 5. Qualification Criteria Configured
    {
      id: 'gate_qualification_rules',
      category: 'QUALIFICATION',
      name: 'Qualification Criteria Configured',
      description: 'Explicit qualification rules must be defined to score transcripts without hallucination.',
      passed: Boolean(
        campaign?.qualificationRules &&
          (Array.isArray(campaign.qualificationRules)
            ? campaign.qualificationRules.length > 0
            : Boolean(campaign.qualificationRules.mandatoryCriteria && campaign.qualificationRules.mandatoryCriteria.length > 0))
      ),
      remediationAdvice: 'Define at least one mandatory qualification criterion (e.g. B2B business model).',
    },

    // 6. Approved WhatsApp Templates
    {
      id: 'gate_whatsapp_templates',
      category: 'TEMPLATES',
      name: 'Approved WhatsApp Follow-up Templates',
      description: 'Only provider-approved templates may be scheduled for follow-up outreach.',
      passed: Boolean(hasApprovedTemplates),
      remediationAdvice: 'Submit WhatsApp follow-up templates for carrier approval.',
    },
  ];

  const passedCount = items.filter((i) => i.passed).length;
  const score = Math.round((passedCount / items.length) * 100);
  const isFullyReady = items.every((i) => i.passed);

  return {
    isFullyReady,
    score,
    items,
    evaluatedAt: new Date().toISOString(),
  };
}
