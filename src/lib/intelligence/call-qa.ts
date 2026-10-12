/**
 * PRD v2.1 Phase 4: Call QA Engine & Reviewer Feedback
 * Generates automated call summaries, sentiment, intent, tagged objections,
 * "where the deal was lost" annotations, and stores reviewer coaching feedback
 * to feed into future Sales Brain updates.
 */

import { CallQARecord, QualificationCategory } from '@/types/intelligence-v2';

const QA_RECORDS_STORE = new Map<string, CallQARecord>();
const COACHING_FEEDBACK_LIST: Array<{
  callId: string;
  feedback: string;
  createdAt: string;
}> = [];

export function generateCallQAAnalysis(params: {
  callId: string;
  workspaceId: string;
  transcript: string;
  leadName?: string;
  optedOut?: boolean;
}): CallQARecord {
  const { callId, workspaceId, transcript, leadName = 'Prospect', optedOut } = params;
  const lower = transcript.toLowerCase();

  // 1. Tag Objections
  const objectionsTagged: string[] = [];
  if (lower.includes('price') || lower.includes('cost') || lower.includes('expensive') || lower.includes('kitna') || lower.includes('budget')) {
    objectionsTagged.push('pricing_sensitivity');
  }
  if (lower.includes('busy') || lower.includes('later') || lower.includes('baad mein') || lower.includes('timing')) {
    objectionsTagged.push('bad_timing');
  }
  if (lower.includes('competitor') || lower.includes('already using') || lower.includes('another vendor')) {
    objectionsTagged.push('incumbent_competitor');
  }
  if (lower.includes('human') || lower.includes('real person') || lower.includes('ai nahi')) {
    objectionsTagged.push('ai_resistance');
  }

  // 2. Evaluate Sentiment & Intent
  let sentiment: CallQARecord['sentiment'] = 'neutral';
  let intent: CallQARecord['intent'] = 'nurture';
  let nextAction = 'Follow up with marketing materials.';
  let whereDealWasLost: string | undefined = undefined;

  if (optedOut || lower.includes('stop calling') || lower.includes('call mat karo')) {
    sentiment = 'negative';
    intent = 'opt_out';
    nextAction = 'Do not contact. Suppressed per prospect instruction.';
    whereDealWasLost = 'Call terminated at prospect refusal / opt-out request.';
  } else if (lower.includes('b2c') || lower.includes('consumer') || lower.includes('students')) {
    sentiment = 'neutral';
    intent = 'disqualified';
    nextAction = 'Mark as unqualified; do not pursue.';
    whereDealWasLost = 'Deal lost on ICP qualification (prospect operates B2C model).';
  } else if (lower.includes('demo') || lower.includes('meeting') || lower.includes('interested') || lower.includes('pricing fine') || lower.includes('schedule')) {
    sentiment = 'positive';
    intent = 'high_intent';
    nextAction = 'Send calendar booking link and assign account executive.';
  } else if (
    lower.includes('call me') ||
    lower.includes('callback') ||
    lower.includes('tomorrow') ||
    lower.includes('kal') ||
    lower.includes('next week') ||
    lower.includes('next month')
  ) {
    intent = 'callback_requested';
    nextAction = 'Schedule automated callback within approved calling hours.';
  }

  // 3. Synthesize Summary
  let summary = `${leadName} discussed sales automation requirements. `;
  if (intent === 'high_intent') {
    summary += 'The prospect expressed keen interest and requested further walkthrough details.';
  } else if (intent === 'opt_out') {
    summary += 'The prospect explicitly requested not to be contacted further; opt-out was executed.';
  } else if (intent === 'disqualified') {
    summary += 'The prospect was disqualified due to business model incompatibility.';
  } else {
    summary += 'General inquiry regarding product capabilities; standard consultative follow-up recommended.';
  }

  const qaRecord: CallQARecord = {
    id: `qa_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    callId,
    workspaceId,
    summary,
    sentiment,
    intent,
    objectionsTagged,
    whereDealWasLost,
    nextRecommendedAction: nextAction,
    coachingFeedback: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  QA_RECORDS_STORE.set(callId, qaRecord);
  return qaRecord;
}

export function submitReviewerFeedback(params: {
  callId: string;
  reviewerOutcomeOverride?: QualificationCategory;
  reviewerNotes?: string;
  coachingFeedback?: string;
}): CallQARecord | undefined {
  const { callId, reviewerOutcomeOverride, reviewerNotes, coachingFeedback } = params;
  const record = QA_RECORDS_STORE.get(callId);
  if (!record) return undefined;

  if (reviewerOutcomeOverride) {
    record.reviewerOutcomeOverride = reviewerOutcomeOverride;
  }
  if (reviewerNotes) {
    record.reviewerNotes = reviewerNotes;
  }
  if (coachingFeedback && coachingFeedback.trim().length > 0) {
    if (!record.coachingFeedback) record.coachingFeedback = [];
    record.coachingFeedback.push(coachingFeedback.trim());

    COACHING_FEEDBACK_LIST.push({
      callId,
      feedback: coachingFeedback.trim(),
      createdAt: new Date().toISOString(),
    });
  }

  record.updatedAt = new Date().toISOString();
  return record;
}

export function getCallQARecord(callId: string): CallQARecord | undefined {
  return QA_RECORDS_STORE.get(callId);
}

export function getAllCoachingFeedback(): Array<{ callId: string; feedback: string; createdAt: string }> {
  return [...COACHING_FEEDBACK_LIST];
}

export function clearQAStore(): void {
  QA_RECORDS_STORE.clear();
  COACHING_FEEDBACK_LIST.length = 0;
}
