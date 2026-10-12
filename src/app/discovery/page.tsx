'use client'

import React, { useState } from 'react'
import {
  compileDiscoveryAction,
  updateBrainSectionAction,
  runBrainTestsAction,
  simulateChatTurnAction
} from '@/app/actions/discovery-v2'
import { DEFAULT_DISCOVERY_DATA } from '@/lib/brain/demo-discovery'
import {
  DiscoveryInterviewData,
  VersionedSalesBrain,
  BrainSectionKey,
  BrainTestResult
} from '@/types/brain-v2'
import { DiscoveryInterviewV2 } from '@/components/discovery/DiscoveryInterviewV2'
import { BrainEditorV2 } from '@/components/discovery/BrainEditorV2'
import { ChatPreviewAndTesterV2 } from '@/components/discovery/ChatPreviewAndTesterV2'
import { compileSalesBrainV2 } from '@/lib/brain/compiler-v2'
import { Brain } from 'lucide-react'

export default function DiscoveryPage() {
  const [activeView, setActiveView] = useState<'interview' | 'editor' | 'tester'>('interview')
  const [brain, setBrain] = useState<VersionedSalesBrain>(
    compileSalesBrainV2(DEFAULT_DISCOVERY_DATA, 'ws_desynthic_hq', 0)
  )

  const handleInterviewComplete = async (data: DiscoveryInterviewData) => {
    const compiled = await compileDiscoveryAction(data)
    setBrain(compiled)
    setActiveView('editor')
  }

  const handleSaveSection = async (key: BrainSectionKey, content: string) => {
    const updated = await updateBrainSectionAction(key, content)
    setBrain(updated)
  }

  const handleRunTests = async (): Promise<BrainTestResult[]> => {
    return runBrainTestsAction(brain)
  }

  const handleChat = async (message: string): Promise<string> => {
    return simulateChatTurnAction(message, brain)
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-blue-600 flex items-center justify-center text-white">
              <Brain className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-bold text-white">Sales Brain Builder & Discovery</h1>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            PRD v2.1 Pilot Build: Guided business interview, modular brain compiler, and scenario tester.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex bg-neutral-900 border border-neutral-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveView('interview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeView === 'interview'
                ? 'bg-blue-600 text-white shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            1. Discovery Interview
          </button>
          <button
            onClick={() => setActiveView('editor')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeView === 'editor'
                ? 'bg-blue-600 text-white shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            2. Modular Brain (v{brain.version})
          </button>
          <button
            onClick={() => setActiveView('tester')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeView === 'tester'
                ? 'bg-blue-600 text-white shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            3. Test & Preview
          </button>
        </div>
      </div>

      {/* Render Active View */}
      {activeView === 'interview' && (
        <DiscoveryInterviewV2
          initialData={DEFAULT_DISCOVERY_DATA}
          onComplete={handleInterviewComplete}
        />
      )}

      {activeView === 'editor' && (
        <BrainEditorV2 brain={brain} onSaveSection={handleSaveSection} />
      )}

      {activeView === 'tester' && (
        <ChatPreviewAndTesterV2
          brain={brain}
          onRunTestSuite={handleRunTests}
          onSimulateChat={handleChat}
        />
      )}
    </div>
  )
}
