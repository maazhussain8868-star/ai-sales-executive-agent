/**
 * PRD v2.1 Phase 4: Qualification Engine
 * Evaluates prospect transcripts against campaign criteria with verbatim evidence quotes.
 * Adheres strictly to the PRD v2.1 rule: Missing answers stay "unknown", never guessed.
 */

import {
  QualificationCriterion,
  QualificationResult,
  CriterionEvaluation,
  QualificationCategory,
} from '@/types/intelligence-v2';

export const DEFAULT_CAMPAIGN_CRITERIA: QualificationCriterion[] = [
  {
    id: 'crit_b2b_icp',
    name: 'B2B Business Model',
    description: 'Prospect represents a B2B company or SMB selling to other businesses.',
    isMandatory: true,
  },
  {
    id: 'crit_lead_volume',
    name: 'Outbound Lead Volume',
    description: 'Company handles 50+ prospective leads or sales inquiries monthly.',
    isMandatory: true,
  },
  {
    id: 'crit_decision_maker',
    name: 'Decision Authority',
    description: 'Prospect is a founder, executive, or sales leadership decision maker.',
    isMandatory: false,
  },
  {
    id: 'crit_budget_fit',
    name: 'Budget / Commercial Readiness',
    description: 'Company is open to a paid AI sales solution (₹15,000+/mo).',
    isMandatory: false,
  },
];

export function evaluateCallQualification(
  transcript: string,
  criteria: QualificationCriterion[] = DEFAULT_CAMPAIGN_CRITERIA
): QualificationResult {
  const evaluations: CriterionEvaluation[] = [];
  const missingAnswers: string[] = [];

  const transcriptLines = transcript.split('\n');

  // Helper to extract the actual prospect quote matching a keyword pattern
  const extractProspectQuote = (patterns: RegExp[]): string | undefined => {
    for (const line of transcriptLines) {
      if (!line.toUpperCase().includes('PROSPECT') && !line.startsWith('User:') && !line.startsWith('Prospect:')) {
        continue;
      }
      for (const pattern of patterns) {
        if (pattern.test(line)) {
          return line.replace(/^[A-Za-z]+:\s*/, '').trim();
        }
      }
    }
    return undefined;
  };

  for (const criterion of criteria) {
    if (criterion.id === 'crit_b2b_icp') {
      const b2bMatch = extractProspectQuote([/\bb2b\b/i, /enterprise/i, /we sell to companies/i, /businesses/i]);
      const b2cMatch = extractProspectQuote([/\bb2c\b/i, /direct to consumer/i, /retail customer/i, /students/i]);

      if (b2cMatch) {
        evaluations.push({
          criterionId: criterion.id,
          criterionName: criterion.name,
          met: false,
          evidenceQuote: b2cMatch,
          reasoning: 'Prospect explicitly identified as B2C/consumer, violating mandatory ICP.',
        });
      } else if (b2bMatch) {
        evaluations.push({
          criterionId: criterion.id,
          criterionName: criterion.name,
          met: true,
          evidenceQuote: b2bMatch,
          reasoning: 'Prospect confirmed B2B sales model.',
        });
      } else {
        evaluations.push({
          criterionId: criterion.id,
          criterionName: criterion.name,
          met: 'unknown',
          reasoning: 'Not discussed in call transcript (missing answer preserved as unknown).',
        });
        missingAnswers.push(criterion.name);
      }
    } else if (criterion.id === 'crit_lead_volume') {
      const volumePositive = extractProspectQuote([
        /\b(hundreds?|thousands?|\d{2,}\+?)\s*(leads|inquiries|calls)/i,
        /lot of leads/i,
        /high volume/i,
        /around 200/i,
        /around 500/i,
      ]);
      const volumeNegative = extractProspectQuote([/hardly any leads/i, /1 or 2 leads/i, /zero leads/i, /no leads/i]);

      if (volumeNegative) {
        evaluations.push({
          criterionId: criterion.id,
          criterionName: criterion.name,
          met: false,
          evidenceQuote: volumeNegative,
          reasoning: 'Lead volume below required threshold.',
        });
      } else if (volumePositive) {
        evaluations.push({
          criterionId: criterion.id,
          criterionName: criterion.name,
          met: true,
          evidenceQuote: volumePositive,
          reasoning: 'Prospect confirmed sufficient outbound/inbound lead volume.',
        });
      } else {
        evaluations.push({
          criterionId: criterion.id,
          criterionName: criterion.name,
          met: 'unknown',
          reasoning: 'Lead volume not discussed during conversation.',
        });
        missingAnswers.push(criterion.name);
      }
    } else if (criterion.id === 'crit_decision_maker') {
      const dmPositive = extractProspectQuote([/\b(founder|co-founder|ceo|director|head of sales|owner|partner)\b/i]);
      const dmNegative = extractProspectQuote([/intern/i, /student/i, /not my decision/i, /cannot make decisions/i]);

      if (dmNegative) {
        evaluations.push({
          criterionId: criterion.id,
          criterionName: criterion.name,
          met: false,
          evidenceQuote: dmNegative,
          reasoning: 'Prospect confirmed lack of decision authority.',
        });
      } else if (dmPositive) {
        evaluations.push({
          criterionId: criterion.id,
          criterionName: criterion.name,
          met: true,
          evidenceQuote: dmPositive,
          reasoning: 'Prospect holds leadership or decision-making authority.',
        });
      } else {
        evaluations.push({
          criterionId: criterion.id,
          criterionName: criterion.name,
          met: 'unknown',
          reasoning: 'Role or decision authority not clarified in conversation.',
        });
        missingAnswers.push(criterion.name);
      }
    } else if (criterion.id === 'crit_budget_fit') {
      const budgetPositive = extractProspectQuote([/budget is fine/i, /send pricing/i, /sounds affordable/i, /pricing kitna hai/i, /open to it/i]);
      const budgetNegative = extractProspectQuote([/no budget/i, /too expensive/i, /cannot afford/i, /free only/i]);

      if (budgetNegative) {
        evaluations.push({
          criterionId: criterion.id,
          criterionName: criterion.name,
          met: false,
          evidenceQuote: budgetNegative,
          reasoning: 'Prospect stated inability to pay or lack of commercial budget.',
        });
      } else if (budgetPositive) {
        evaluations.push({
          criterionId: criterion.id,
          criterionName: criterion.name,
          met: true,
          evidenceQuote: budgetPositive,
          reasoning: 'Prospect exhibited commercial readiness or interest in pricing.',
        });
      } else {
        evaluations.push({
          criterionId: criterion.id,
          criterionName: criterion.name,
          met: 'unknown',
          reasoning: 'Budget readiness was not broached.',
        });
        missingAnswers.push(criterion.name);
      }
    }
  }

  // Calculate score and category
  const metCount = evaluations.filter((e) => e.met === true).length;
  const failedMandatory = evaluations.some((e) => {
    const crit = criteria.find((c) => c.id === e.criterionId);
    return crit?.isMandatory && e.met === false;
  });

  const totalCriteria = criteria.length;
  const rawScore = Math.round((metCount / totalCriteria) * 100);

  let category: QualificationCategory = 'UNKNOWN';
  let plainLanguageReason = '';

  if (failedMandatory) {
    category = 'UNQUALIFIED';
    const failedDetails = evaluations.filter((e) => e.met === false).map((e) => e.criterionName).join(', ');
    plainLanguageReason = `Disqualified: Lead failed mandatory criteria (${failedDetails}).`;
  } else if (missingAnswers.length === totalCriteria) {
    category = 'UNKNOWN';
    plainLanguageReason = 'Unknown: Call ended or disconnected before qualification criteria could be evaluated.';
  } else if (metCount >= 2 && !failedMandatory) {
    category = 'QUALIFIED';
    const metDetails = evaluations.filter((e) => e.met === true).map((e) => e.criterionName).join(', ');
    plainLanguageReason = `Qualified: Lead satisfies criteria (${metDetails}) with verified quotes.`;
  } else if (missingAnswers.length > 0) {
    category = 'UNKNOWN';
    plainLanguageReason = `Inconclusive: Criteria ${missingAnswers.join(', ')} remained unknown.`;
  } else {
    category = 'UNQUALIFIED';
    plainLanguageReason = 'Unqualified: Did not satisfy minimum qualification threshold.';
  }

  return {
    score: rawScore,
    category,
    plainLanguageReason,
    evaluations,
    missingAnswers,
  };
}
