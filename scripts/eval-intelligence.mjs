import assert from 'node:assert/strict'
import { FIXTURE_TRANSCRIPTS } from '../src/fixtures/transcripts.ts'
import { analyzeCallTranscript } from '../src/lib/intelligence/analyzer.ts'

console.log('Running Post-Call Intelligence Evaluation on 10 Fixtures...\n')

let passedCount = 0
const totalFixtures = FIXTURE_TRANSCRIPTS.length

const fixedReferenceDate = new Date('2026-10-10T10:00:00Z') // Saturday

for (const fixture of FIXTURE_TRANSCRIPTS) {
  console.log(`Evaluating [${fixture.id}] - "${fixture.title}"...`)

  const result = await analyzeCallTranscript({
    callId: fixture.id,
    transcript: fixture.transcript,
    toNumber: fixture.toNumber,
    referenceDate: fixedReferenceDate,
  })

  // 1. Verify Intent
  assert.equal(
    result.intent,
    fixture.expected.intent,
    `[${fixture.id}] Intent mismatch: expected ${fixture.expected.intent}, got ${result.intent}`
  )

  // 2. Verify Human Handoff (Fires on handoff fixtures and NOT on normal calls)
  assert.equal(
    result.humanHandoff,
    fixture.expected.humanHandoff,
    `[${fixture.id}] Handoff mismatch: expected ${fixture.expected.humanHandoff}, got ${result.humanHandoff}`
  )

  if (fixture.expected.humanHandoff && fixture.expected.humanHandoffReasonKeyword) {
    const reasonsText = result.humanHandoffReasons.join(' ').toLowerCase()
    assert.ok(
      reasonsText.includes(fixture.expected.humanHandoffReasonKeyword.toLowerCase()),
      `[${fixture.id}] Handoff reason missing keyword: ${fixture.expected.humanHandoffReasonKeyword}`
    )
  }

  // 3. Verify Follow-Up Requirement
  assert.equal(
    result.followUp?.required,
    fixture.expected.followUpRequired,
    `[${fixture.id}] Follow-up requirement mismatch: expected ${fixture.expected.followUpRequired}, got ${result.followUp?.required}`
  )

  // 4. Special check for "call me next Tuesday" fixture
  if (fixture.id === 'fixture_02_call_next_tuesday') {
    assert.ok(result.followUp?.scheduledAt, 'Fixture 02 must have scheduled follow-up timestamp')
    assert.ok(result.followUp?.previousContext, 'Fixture 02 must preserve previous conversation context')
    assert.ok(result.followUp?.reason?.toLowerCase().includes('tuesday'), 'Fixture 02 reason must mention Tuesday')
    console.log(`  ✓ Follow-up scheduled for: ${result.followUp?.scheduledAt} (${result.followUp?.reason})`)
    console.log(`  ✓ Preserved context: "${result.followUp?.previousContext}"`)
  }

  // 5. Verify Lead Score Bounds
  if (fixture.expected.minLeadScore !== undefined) {
    assert.ok(
      result.leadScore >= fixture.expected.minLeadScore,
      `[${fixture.id}] Lead score ${result.leadScore} below minimum ${fixture.expected.minLeadScore}`
    )
  }
  if (fixture.expected.maxLeadScore !== undefined) {
    assert.ok(
      result.leadScore <= fixture.expected.maxLeadScore,
      `[${fixture.id}] Lead score ${result.leadScore} above maximum ${fixture.expected.maxLeadScore}`
    )
  }

  // 6. Verify Qualification
  assert.equal(
    result.qualification.isQualified,
    fixture.expected.isQualified,
    `[${fixture.id}] Qualification mismatch: expected ${fixture.expected.isQualified}, got ${result.qualification.isQualified}`
  )

  // 7. Verify Call Quality Score (0 to 100)
  assert.ok(
    result.callQualityScore >= 0 && result.callQualityScore <= 100,
    `[${fixture.id}] Call quality score out of bounds: ${result.callQualityScore}`
  )
  assert.ok(result.coachingNotes.length > 10, 'Coaching notes must be provided')

  // 8. Verify Prospect Memory
  assert.ok(result.prospectMemory, 'Prospect memory must be generated')
  assert.equal(result.prospectMemory.phone, fixture.toNumber)

  passedCount++
  console.log(`  ✓ Passed (Lead Score: ${result.leadScore}, Quality: ${result.callQualityScore}, Handoff: ${result.humanHandoff})\n`)
}

const agreementRate = ((passedCount / totalFixtures) * 100).toFixed(1)

console.log('==================================================')
console.log(`EVALUATION COMPLETE: ${passedCount}/${totalFixtures} FIXTURES PASSED (${agreementRate}% AGREEMENT)`)
console.log('==================================================\n')

assert.equal(passedCount, totalFixtures, 'All fixtures must pass 100% agreement')
