'use server'

import { revalidatePath } from 'next/cache'
import { DEMO_BUSINESS_DATA } from '@/lib/demo-data'
import { compileSalesBrain } from '@/lib/model-router'
import {
  BrainFileKey,
  BRAIN_FILE_KEYS,
  BRAIN_FILE_TITLES,
  CompiledSalesBrain,
  InterviewData,
} from '@/types/brain'
import { createClient } from '@/lib/supabase/server'

// In-memory runtime cache for local dev / instant fallback
const emptyVersions = BRAIN_FILE_KEYS.reduce((acc, key) => {
  acc[key] = []
  return acc
}, {} as Record<BrainFileKey, Array<{ version: number; content: string; createdAt: string }>>)

const globalStore: {
  interviewData: InterviewData
  compiledBrain: CompiledSalesBrain | null
  fileVersions: Record<BrainFileKey, Array<{ version: number; content: string; createdAt: string }>>
} = {
  interviewData: JSON.parse(JSON.stringify(DEMO_BUSINESS_DATA)),
  compiledBrain: null,
  fileVersions: emptyVersions,
}

export async function getInterviewDataAction(): Promise<InterviewData> {
  const supabase = await createClient()
  if (supabase) {
    try {
      const { data, error } = await supabase.from('interview_answers').select('*')
      if (!error && data && data.length > 0) {
        const merged = { ...globalStore.interviewData }
        data.forEach((row: { section?: string; data?: unknown }) => {
          if (row.section && row.data && row.section in merged) {
            (merged as Record<string, unknown>)[row.section] = row.data
          }
        })
        return merged
      }
    } catch {
      // Fall through to memory store
    }
  }
  return globalStore.interviewData
}

export async function saveInterviewSectionAction<K extends keyof InterviewData>(
  section: K,
  data: InterviewData[K]
) {
  globalStore.interviewData[section] = data

  const supabase = await createClient()
  if (supabase) {
    try {
      // Find or create default business
      let { data: business } = await supabase.from('businesses').select('id').limit(1).single()
      if (!business) {
        const { data: newBiz } = await supabase
          .from('businesses')
          .insert({
            name: globalStore.interviewData.company.name || 'Desynthic',
            website: globalStore.interviewData.company.website,
            industry: globalStore.interviewData.company.industry,
          })
          .select('id')
          .single()
        business = newBiz
      }

      if (business?.id) {
        await supabase.from('interview_answers').upsert(
          {
            business_id: business.id,
            section,
            data,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'business_id,section' }
        )
      }
    } catch {
      // Ignore database sync error in dev mock mode
    }
  }

  return { success: true }
}

export async function loadDemoBusinessAction() {
  globalStore.interviewData = JSON.parse(JSON.stringify(DEMO_BUSINESS_DATA))
  return { success: true, data: globalStore.interviewData }
}

export async function compileBrainAction(maxPromptLength: number = 3800): Promise<{
  success: boolean
  compiled: CompiledSalesBrain
}> {
  const currentData = await getInterviewDataAction()
  const compiled = await compileSalesBrain(currentData, maxPromptLength)

  globalStore.compiledBrain = compiled

  // Initialize or update version history for each file
  BRAIN_FILE_KEYS.forEach((key) => {
    const content = compiled.files[key]
    const history = globalStore.fileVersions[key] || []
    const nextVersion = history.length + 1
    history.push({
      version: nextVersion,
      content,
      createdAt: new Date().toISOString(),
    })
    globalStore.fileVersions[key] = history
  })

  const supabase = await createClient()
  if (supabase) {
    try {
      let { data: business } = await supabase.from('businesses').select('id').limit(1).single()
      if (!business) {
        const { data: newBiz } = await supabase
          .from('businesses')
          .insert({
            name: currentData.company.name,
            website: currentData.company.website,
            industry: currentData.company.industry,
          })
          .select('id')
          .single()
        business = newBiz
      }

      if (business?.id) {
        // Upsert agent
        const p = currentData.brandVoice.agentProfile
        await supabase.from('agents').upsert({
          business_id: business.id,
          name: p.name,
          role: p.role,
          industry: p.industry,
          personality: p.personality,
          sales_style: p.salesStyle,
          goal: p.goal,
          voice_prompt: compiled.voiceAgentPrompt,
          max_prompt_length: maxPromptLength,
          sample_objections: compiled.sampleObjections,
          updated_at: new Date().toISOString(),
        })

        // Insert brain files
        for (const key of BRAIN_FILE_KEYS) {
          await supabase.from('brain_files').insert({
            business_id: business.id,
            file_key: key,
            title: BRAIN_FILE_TITLES[key],
            content: compiled.files[key],
            version: (globalStore.fileVersions[key]?.length || 1),
          })
        }
      }
    } catch {
      // Continue safely
    }
  }

  revalidatePath('/dashboard')
  return { success: true, compiled }
}

export async function getCompiledBrainAction(): Promise<CompiledSalesBrain | null> {
  if (globalStore.compiledBrain) {
    return globalStore.compiledBrain
  }
  // If not compiled yet, auto-compile demo data for seamless experience
  const currentData = await getInterviewDataAction()
  const compiled = await compileSalesBrain(currentData)
  globalStore.compiledBrain = compiled
  return compiled
}

export async function updateBrainFileAction(key: BrainFileKey, content: string) {
  if (!globalStore.compiledBrain) {
    globalStore.compiledBrain = await compileSalesBrain(globalStore.interviewData)
  }

  globalStore.compiledBrain.files[key] = content

  const history = globalStore.fileVersions[key] || []
  const nextVersion = history.length + 1
  history.push({
    version: nextVersion,
    content,
    createdAt: new Date().toISOString(),
  })
  globalStore.fileVersions[key] = history

  return {
    success: true,
    version: nextVersion,
    updatedAt: new Date().toISOString(),
  }
}

export async function getBrainFileVersionHistoryAction(key: BrainFileKey) {
  return globalStore.fileVersions[key] || []
}
