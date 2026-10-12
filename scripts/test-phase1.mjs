import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import {
  BRAIN_FILE_KEYS,
  BRAIN_FILE_TITLES,
} from '../src/types/brain.ts'
import { DEMO_BUSINESS_DATA } from '../src/lib/demo-data.ts'
import {
  generateVoiceAgentPrompt,
  compileSalesBrain,
} from '../src/lib/model-router/index.ts'

console.log('Running Phase 1 Verification Suite: Sales Brain Builder...\n')

// 1. Verify Demo Business Data (Desynthic selling AI automation)
console.log('1. Checking Demo Business Data...')
assert.ok(DEMO_BUSINESS_DATA.company.name === 'Desynthic', 'Demo company must be Desynthic')
assert.ok(DEMO_BUSINESS_DATA.brandVoice.agentProfile.name === 'Priya', 'Agent name must be Priya')
assert.ok(DEMO_BUSINESS_DATA.proofPoints.sourceMaterials.length >= 2, 'Must have sample source materials')
console.log('✓ Demo Business Data verified (Desynthic selling AI automation)')

// 2. Test End-to-End Compile Function
console.log('2. Testing compileSalesBrain on Demo Business...')
const compiled = await compileSalesBrain(DEMO_BUSINESS_DATA, 3800)
assert.ok(compiled, 'Compile function must return compiled brain')
assert.ok(compiled.files, 'Compiled brain must contain files dictionary')

// 3. Verify all 12 Files Schema and Content
console.log('3. Checking schema of all 12 brain files...')
const expectedKeys = [
  '01_company',
  '02_products',
  '03_icp',
  '04_buyer_personas',
  '05_sales_methodology',
  '06_objections',
  '07_case_studies',
  '08_pricing',
  '09_conversation_rules',
  '10_compliance',
  '11_qualification',
  '12_followup',
]

assert.equal(BRAIN_FILE_KEYS.length, 12, 'Must have exactly 12 brain keys')
expectedKeys.forEach((key) => {
  const content = compiled.files[key]
  assert.ok(content, `File ${key} must exist and have content`)
  assert.ok(content.length > 50, `File ${key} must be substantial (got ${content.length} chars)`)
  assert.ok(content.startsWith('# '), `File ${key} must have markdown title`)
  console.log(`  ✓ ${key}.md (${BRAIN_FILE_TITLES[key]}): ${content.length} chars`)
})

// 4. Verify Source Material Incorporation in 05, 06, 07
console.log('4. Verifying source material incorporation in 05, 06, and 07...')
const file05 = compiled.files['05_sales_methodology']
const file06 = compiled.files['06_objections']
const file07 = compiled.files['07_case_studies']

assert.ok(file05.includes('Source Material'), '05_sales_methodology must include source materials')
assert.ok(file06.includes('Playbook') || file06.includes('Source Transcripts'), '06_objections must include playbook')
assert.ok(file07.includes('Additional Field Evidence') || file07.includes('NexaGrowth'), '07_case_studies must include proof')
console.log('✓ Source materials successfully improved methodology, objections, and case studies')

// 5. Verify Phone-Ready Voice Agent Prompt
console.log('5. Checking Voice Agent Prompt compliance...')
const prompt = compiled.voiceAgentPrompt
const p = DEMO_BUSINESS_DATA.brandVoice.agentProfile

// Name, role, style, goal
assert.ok(prompt.includes(p.name), `Prompt must include agent name "${p.name}"`)
assert.ok(prompt.includes(p.role), `Prompt must include agent role "${p.role}"`)
assert.ok(prompt.includes(p.salesStyle), `Prompt must include agent sales style "${p.salesStyle}"`)
assert.ok(prompt.includes(p.goal), `Prompt must include agent goal "${p.goal}"`)

// Opening AI disclosure line
const disclosure = DEMO_BUSINESS_DATA.compliance.aiDisclosureLine
assert.ok(prompt.includes(disclosure), `Prompt must include mandatory opening AI disclosure line`)

// Short conversation flow stages
const requiredFlowStages = [
  'INTRO',
  'ATTENTION',
  'DISCOVERY',
  'PAIN',
  'QUALIFICATION',
  'VALUE',
  'OBJECTION HANDLING',
  'CHECK',
  'CALL TO ACTION',
  'MEETING',
]

requiredFlowStages.forEach((stage) => {
  assert.ok(prompt.includes(stage), `Prompt conversation flow must include stage: ${stage}`)
})

// Phone rules: short sentences, one question at a time, never invent facts, escalate when unsure
assert.ok(prompt.includes('short, conversational sentences'), 'Rule: short sentences present')
assert.ok(prompt.includes('ONE question at a time'), 'Rule: one question at a time present')
assert.ok(prompt.includes('NEVER invent'), 'Rule: never invent facts present')
assert.ok(prompt.includes('Escalate immediately'), 'Rule: escalate when unsure present')

// Configurable length enforcement
assert.ok(prompt.length <= 3800, `Prompt length (${prompt.length}) must be <= 3800 chars`)
console.log(`✓ Voice Agent Prompt verified: ${prompt.length} chars (within configured limit)`)

// Test custom truncation limit
const customPrompt = generateVoiceAgentPrompt(DEMO_BUSINESS_DATA, 1500)
assert.ok(customPrompt.length <= 1500, `Truncated prompt length must be <= 1500 (got ${customPrompt.length})`)
console.log(`✓ Custom prompt length truncation tested (${customPrompt.length} chars <= 1500)`)

// 6. Verify 10 Sample Objections Hand-Test Export
console.log('6. Checking 10 Sample Objections test deck...')
const objections = compiled.sampleObjections
assert.equal(objections.length, 10, 'Must have exactly 10 sample objections')
objections.forEach((item, index) => {
  assert.equal(item.id, index + 1, `Objection #${index + 1} has correct ID`)
  assert.ok(item.objection && item.objection.length > 5, `Objection #${item.id} has valid text`)
  assert.ok(item.category, `Objection #${item.id} has category`)
  assert.ok(item.expectedStyle, `Objection #${item.id} has expected style`)
  assert.ok(item.recommendedScript && item.recommendedScript.length > 10, `Objection #${item.id} has script`)
})
console.log('✓ 10 Sample Objections test deck verified with categories and scripts')

// 7. Verify Database Migration for Sales Brain
console.log('7. Verifying Supabase Phase 1 Migration...')
const migrationPath = path.resolve('supabase/migrations/00002_sales_brain.sql')
assert.ok(fs.existsSync(migrationPath), 'Phase 1 migration file must exist')
const migrationSql = fs.readFileSync(migrationPath, 'utf-8')
assert.ok(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.businesses'), 'businesses table defined')
assert.ok(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.agents'), 'agents table defined')
assert.ok(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.interview_answers'), 'interview_answers table defined')
assert.ok(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.brain_files'), 'brain_files table defined')
assert.ok(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.source_materials'), 'source_materials table defined')
console.log('✓ Supabase 00002_sales_brain.sql migration verified')

console.log('\n=============================================')
console.log('ALL PHASE 1 DEFINITION OF DONE CHECKS PASSED!')
console.log('=============================================\n')
