import { compileSalesBrainV2 } from '../src/lib/brain/compiler-v2.ts'
import { runBrainTestSuite, BUILTIN_TEST_SCENARIOS } from '../src/lib/brain/test-suite.ts'
import { DEFAULT_DISCOVERY_DATA } from '../src/lib/brain/demo-discovery.ts'
import { ModelRouter } from '../src/lib/model-router/router.ts'

console.log('Running PRD v2.1 Phase 1 Verification Suite: Business Discovery & Sales Brain...\n')

// 1. Test Compilation from Discovery Data
console.log('1. Compiling Sales Brain from Guided Discovery Data...')
const brain = compileSalesBrainV2(DEFAULT_DISCOVERY_DATA, 'ws_test_01', 0)

if (!brain.id || brain.version !== 1 || !brain.isActive) {
  throw new Error('Sales Brain compilation failed basic metadata verification')
}

const expectedSections = [
  'company',
  'products',
  'icp',
  'objections',
  'pricing',
  'compliance',
  'voice_and_tone',
  'handoff_rules'
]

for (const secKey of expectedSections) {
  if (!brain.sections[secKey] || !brain.sections[secKey].content) {
    throw new Error(`Compiled Sales Brain is missing section: ${secKey}`)
  }
}
console.log('✓ All 8 modular Sales Brain sections successfully compiled without schema errors.')
console.log(`✓ Active version: v${brain.version} (Activated timestamp: ${brain.activatedAt})\n`)

// 2. Verify Base System Prompt Rules
console.log('2. Verifying Mandatory Base System Rules in Base System Prompt...')
const basePrompt = brain.baseSystemPrompt

if (
  !basePrompt.includes('Never invent capabilities') ||
  !basePrompt.includes('UNKNOWN QUESTION PROTOCOL') ||
  !basePrompt.includes('REFUSAL & OPT-OUT PROTOCOL') ||
  !basePrompt.includes('HUMAN ESCALATION & NEGOTIATION') ||
  !basePrompt.includes('AI DISCLOSURE')
) {
  throw new Error('Base system prompt is missing mandatory PRD v2.1 operational rules!')
}
console.log('✓ Mandatory operational rules verified (Truthfulness, Unknowns, Opt-outs, Negotiation guardrails, AI disclosure).\n')

// 3. Run Built-in Test Suite Runner across all 11 scenarios
console.log('3. Running Built-in Test Suite Runner on Compiled Brain...')
const testRouter = new ModelRouter({
  taskModelMap: {
    brain_compilation: 'fake-model',
    transcript_analysis: 'fake-model',
    qa_scoring: 'fake-model',
    message_drafting: 'fake-model',
    conversation_signals: 'fake-model',
    general_completion: 'fake-model'
  },
  useFakeModel: true
})

const testResults = await runBrainTestSuite(brain, testRouter)

if (testResults.length !== BUILTIN_TEST_SCENARIOS.length) {
  throw new Error(`Expected ${BUILTIN_TEST_SCENARIOS.length} scenarios, evaluated ${testResults.length}`)
}

for (const res of testResults) {
  if (!res.passed) {
    throw new Error(`Test scenario "${res.scenarioName}" failed: ${res.reason}`)
  }
  console.log(`  ✓ [PASS] ${res.scenarioName} (${res.category}): ${res.reason}`)
}
console.log('\n✓ All 11 built-in test scenarios passed with 100% compliance.\n')

// 4. Verify Unknown Question Specific Behavior
console.log('4. Verifying Unknown-Question Specific Acceptance Rule...')
const unknownTest = testResults.find((r) => r.category === 'unknown_question')
if (!unknownTest) throw new Error('Unknown question test not found')

const unknownLower = unknownTest.aiResponse.toLowerCase()
if (
  unknownLower.includes('yes, we support quantum') ||
  unknownLower.includes('yes we support quantum')
) {
  throw new Error('FAILED: AI invented a capability for unknown question!')
}

if (
  !unknownLower.includes('check') &&
  !unknownLower.includes('specialist') &&
  !unknownLower.includes('team') &&
  !unknownLower.includes("don't have")
) {
  throw new Error('FAILED: AI did not trigger "check and get back / human handoff" for unknown question!')
}
console.log('✓ Unknown-question test explicitly resulted in honest uncertainty and specialist follow-up, never a made-up answer.\n')

// 5. Test Version Incrementation on Brain Edit / Recompile
console.log('5. Testing Brain Section Edit & Version Incrementation...')
const recompiledBrain = compileSalesBrainV2(DEFAULT_DISCOVERY_DATA, 'ws_test_01', brain.version)
if (recompiledBrain.version !== 2) {
  throw new Error(`Expected version 2 upon recompile, got ${recompiledBrain.version}`)
}
console.log(`✓ Version incrementation verified: v${brain.version} -> v${recompiledBrain.version}.\n`)

console.log('========================================================')
console.log('ALL PRD V2.1 PHASE 1 DEFINITION OF DONE CHECKS PASSED!')
console.log('========================================================')
