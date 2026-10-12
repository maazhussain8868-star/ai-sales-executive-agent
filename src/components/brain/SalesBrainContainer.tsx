'use client'

import { useState, useTransition } from 'react'
import { InterviewData, CompiledSalesBrain } from '@/types/brain'
import { InterviewForm } from './InterviewForm'
import { BrainViewer } from './BrainViewer'
import { compileBrainAction } from '@/app/actions/brain'
import {
  BrainCircuit,
  FileCheck2,
  Sparkles,
  Bot,
} from 'lucide-react'

interface SalesBrainContainerProps {
  initialInterviewData: InterviewData
  initialCompiledBrain: CompiledSalesBrain | null
}

export function SalesBrainContainer({
  initialInterviewData,
  initialCompiledBrain,
}: SalesBrainContainerProps) {
  const [activeView, setActiveView] = useState<'interview' | 'viewer'>(
    initialCompiledBrain ? 'viewer' : 'interview'
  )
  const [compiledBrain, setCompiledBrain] = useState<CompiledSalesBrain | null>(
    initialCompiledBrain
  )
  const [isCompiling, startTransition] = useTransition()
  const agent = initialInterviewData.brandVoice.agentProfile

  async function handleCompile(maxLength: number = 3800) {
    startTransition(async () => {
      const res = await compileBrainAction(maxLength)
      if (res.success && res.compiled) {
        setCompiledBrain(res.compiled)
        setActiveView('viewer')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Top Banner: AI Employee Info & Mode Switcher */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white">Sales Brain Builder</h1>
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                  Phase 1 Active
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Agent: <span className="font-semibold text-neutral-200">{agent.name}</span> ({agent.role}) • Style: <span className="text-neutral-200">{agent.salesStyle}</span> • Goal: <span className="text-neutral-200">{agent.goal}</span>
              </p>
            </div>
          </div>

          {/* Mode Switcher Buttons */}
          <div className="flex items-center rounded-xl border border-neutral-800 bg-neutral-950 p-1">
            <button
              onClick={() => setActiveView('interview')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                activeView === 'interview'
                  ? 'bg-neutral-800 text-white shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <BrainCircuit className="h-3.5 w-3.5 text-blue-400" />
              Guided Interview (10 Steps)
            </button>
            <button
              onClick={() => {
                if (!compiledBrain) {
                  handleCompile()
                } else {
                  setActiveView('viewer')
                }
              }}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                activeView === 'viewer'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <FileCheck2 className="h-3.5 w-3.5" />
              Sales Brain Assets (12 Files & Prompt)
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeView === 'interview' ? (
        <InterviewForm
          initialData={initialInterviewData}
          onCompile={() => handleCompile(3800)}
          isCompiling={isCompiling}
        />
      ) : compiledBrain ? (
        <BrainViewer
          compiledBrain={compiledBrain}
          onRecompilePrompt={(newLimit) => handleCompile(newLimit)}
          isCompiling={isCompiling}
        />
      ) : (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-neutral-800 bg-neutral-900/30">
          <Sparkles className="h-8 w-8 text-blue-400 mb-3 animate-pulse" />
          <p className="text-sm text-neutral-300">Compiling Sales Brain...</p>
        </div>
      )}
    </div>
  )
}
