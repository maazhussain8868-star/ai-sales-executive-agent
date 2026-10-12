'use client'

import React, { useState } from 'react'
import { FounderDashboard } from './FounderDashboard'
import { FounderDashboardV2 } from './FounderDashboardV2'
import { SalesBrainContainer } from '@/components/brain/SalesBrainContainer'
import { Phase7AdvancedSuite } from './Phase7AdvancedSuite'
import {
  Workspace,
  DashboardMetrics,
  AuditLog,
} from '@/types/analytics'
import { InterviewData, CompiledSalesBrain } from '@/types/brain'
import { DEMO_BUSINESS_DATA } from '@/lib/demo-data'
import { BarChart3, BrainCircuit, Sparkles } from 'lucide-react'

interface DashboardTabsProps {
  initialWorkspace: Workspace
  allWorkspaces: Workspace[]
  initialMetrics: DashboardMetrics
  initialAuditLogs: AuditLog[]
  initialMaskedKeys: Record<string, string>
  initialInterviewData: InterviewData | null
  initialCompiledBrain: CompiledSalesBrain | null
}

export function DashboardTabs({
  initialWorkspace,
  allWorkspaces,
  initialMetrics,
  initialAuditLogs,
  initialMaskedKeys,
  initialInterviewData,
  initialCompiledBrain,
}: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<'analytics' | 'brain' | 'phase7' | 'v2_intelligence'>('analytics')

  return (
    <div className="space-y-6">
      {/* Sub-header Tab Switcher */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              activeTab === 'analytics'
                ? 'bg-blue-600 text-white shadow'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Executive ROI & Analytics
          </button>

          <button
            onClick={() => setActiveTab('brain')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              activeTab === 'brain'
                ? 'bg-blue-600 text-white shadow'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <BrainCircuit className="h-4 w-4" />
            Sales Brain Builder
          </button>

          <button
            onClick={() => setActiveTab('phase7')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              activeTab === 'phase7'
                ? 'bg-purple-600 text-white shadow'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Sparkles className="h-4 w-4 text-purple-300" />
            Enterprise Suite (Phase 7)
          </button>

          <button
            onClick={() => setActiveTab('v2_intelligence')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              activeTab === 'v2_intelligence'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Sparkles className="h-4 w-4 text-emerald-300" />
            PRD v2.1 Pipeline &amp; QA
          </button>
        </div>

        <span className="text-xs text-neutral-500 hidden sm:inline">
          {activeTab === 'analytics'
            ? 'Multi-Client Performance'
            : activeTab === 'brain'
            ? 'Instruction Compiler'
            : activeTab === 'v2_intelligence'
            ? 'PRD v2.1 Intelligence & Sheets CRM'
            : 'Multilingual, A/B & CRM Sync'}
        </span>
      </div>

      {/* Render Selected View */}
      {activeTab === 'analytics' && (
        <FounderDashboard
          initialWorkspace={initialWorkspace}
          allWorkspaces={allWorkspaces}
          initialMetrics={initialMetrics}
          initialAuditLogs={initialAuditLogs}
          initialMaskedKeys={initialMaskedKeys}
        />
      )}

      {activeTab === 'brain' && (
        <SalesBrainContainer
          initialInterviewData={initialInterviewData || DEMO_BUSINESS_DATA}
          initialCompiledBrain={initialCompiledBrain}
        />
      )}

      {activeTab === 'phase7' && (
        <Phase7AdvancedSuite
          workspaceId={initialWorkspace.id}
          initialExperiments={[
            {
              id: 'exp_1',
              workspaceId: initialWorkspace.id,
              name: 'Curiosity Bottleneck vs Direct ROI Pitch',
              status: 'active',
              variantAPrompt: 'Focus on high SDR turnover and time wasted dialing unqualified contacts.',
              variantBPrompt: 'Focus on $1,500 setup + $50 per booked meeting outcome billing.',
              trafficSplitPercent: 50,
              variantACalls: 45,
              variantAMeetings: 6,
              variantBCalls: 48,
              variantBMeetings: 13,
              winningVariant: 'B',
              confidenceScore: 0.88,
              createdAt: new Date().toISOString()
            }
          ]}
          initialCoachingReports={[
            {
              id: 'coach_1',
              workspaceId: initialWorkspace.id,
              callId: 'call_9901',
              prospectName: 'Vikram Mehta (TechSprint)',
              talkToListenRatio: 0.44,
              speechPaceWpm: 138,
              fillerWordsCount: 1,
              objectionHandlingScore: 94,
              strengths: [
                'Empathetic objection handling on existing human SDRs',
                'Clear, unhurried cadence and exact 20-minute calendar confirmation'
              ],
              improvementAreas: ['Slightly delayed answer on SOC2 compliance inquiries'],
              recommendedPromptPatch: 'When asked about data security, lead with: "All customer transcripts are AES-256 encrypted with zero model retraining."',
              appliedToBrain: false,
              createdAt: new Date().toISOString()
            }
          ]}
          initialMethodologyPatches={[
            {
              id: 'patch_1',
              workspaceId: initialWorkspace.id,
              sourceCallId: 'call_9901',
              category: 'objection_response',
              suggestedPatch: 'When prospect says "We already use human SDRs", counter with: "We don\'t replace your closers—we feed them warm appointments."',
              rationale: 'Converted live resistance into confirmed demo in Call #9901.',
              status: 'pending_review',
              createdAt: new Date().toISOString()
            }
          ]}
          initialCrmIntegrations={[
            {
              id: 'crm_1',
              workspaceId: initialWorkspace.id,
              provider: 'hubspot',
              status: 'connected',
              apiKeyMasked: 'pat-na1••••••••7721',
              lastSyncedAt: new Date().toISOString(),
              syncStats: {
                leadsSynced: 120,
                callsSynced: 94,
                dealsCreated: 19
              }
            },
            {
              id: 'crm_2',
              workspaceId: initialWorkspace.id,
              provider: 'zoho',
              status: 'connected',
              apiKeyMasked: '1000.••••••••8910',
              lastSyncedAt: new Date().toISOString(),
              syncStats: {
                leadsSynced: 45,
                callsSynced: 38,
                dealsCreated: 7
              }
            }
          ]}
          initialHumanReps={[
            {
              id: 'rep_1',
              workspaceId: initialWorkspace.id,
              name: 'Ananya Sharma',
              phone: '+919876543210',
              email: 'ananya@desynthic.com',
              role: 'Solutions Architect',
              status: 'available',
              tier: 'enterprise',
              assignedMeetingsCount: 14
            },
            {
              id: 'rep_2',
              workspaceId: initialWorkspace.id,
              name: 'Rohan Gupta',
              phone: '+919999999999',
              email: 'rohan@desynthic.com',
              role: 'Account Executive',
              status: 'in_call',
              tier: 'standard',
              assignedMeetingsCount: 9
            }
          ]}
          initialWallet={{
            workspaceId: initialWorkspace.id,
            currentMinutesBalance: 340,
            totalMinutesPurchased: 500,
            totalMinutesConsumed: 160,
            planName: 'Growth',
            rechargeHistory: [
              {
                id: 'rech_init',
                amountInr: 15000,
                minutesAdded: 500,
                paymentId: 'pay_rzp_initial_pack',
                timestamp: new Date().toISOString()
              }
            ]
          }}
        />
      )}

      {activeTab === 'v2_intelligence' && (
        <FounderDashboardV2 />
      )}
    </div>
  )
}
