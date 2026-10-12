'use client'

import { useState, useTransition } from 'react'
import { InterviewData, ObjectionEntry, SourceMaterialEntry } from '@/types/brain'
import { saveInterviewSectionAction, loadDemoBusinessAction } from '@/app/actions/brain'
import {
  Building2,
  Package,
  Target,
  PhoneCall,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Sparkles,
  FileText,
  ChevronRight,
  ChevronLeft,
  Check,
  Plus,
  Trash2,
  RefreshCw,
  Zap,
} from 'lucide-react'

interface InterviewFormProps {
  initialData: InterviewData
  onCompile: () => void
  isCompiling: boolean
}

export const SECTIONS = [
  { id: 'company', label: '1. Company', icon: Building2 },
  { id: 'products', label: '2. Products & Pricing', icon: Package },
  { id: 'icp', label: '3. ICP & Buyer Pain', icon: Target },
  { id: 'salesProcess', label: '4. Sales Process', icon: PhoneCall },
  { id: 'objections', label: '5. Objections', icon: ShieldAlert },
  { id: 'qualification', label: '6. Qualification', icon: CheckCircle2 },
  { id: 'escalation', label: '7. Escalation Rules', icon: AlertTriangle },
  { id: 'compliance', label: '8. Compliance & DND', icon: Scale },
  { id: 'brandVoice', label: '9. Voice & AI Profile', icon: Sparkles },
  { id: 'proofPoints', label: '10. Case Studies & Source Material', icon: FileText },
] as const

export function InterviewForm({ initialData, onCompile, isCompiling }: InterviewFormProps) {
  const [currentStep, setCurrentStep] = useState<number>(0)
  const [data, setData] = useState<InterviewData>(initialData)
  const [savedStatus, setSavedStatus] = useState<string>('All changes saved')
  const [, startTransition] = useTransition()

  function autoSaveSection<K extends keyof InterviewData>(
    section: K,
    updatedSectionData: InterviewData[K]
  ) {
    setSavedStatus('Saving...')
    startTransition(async () => {
      await saveInterviewSectionAction(section, updatedSectionData)
      setSavedStatus('All changes saved')
    })
  }

  function handleFieldChange<K extends keyof InterviewData>(
    section: K,
    field: string,
    value: string
  ) {
    const sectionRecord = data[section] as Record<string, unknown>
    const updated = {
      ...data,
      [section]: {
        ...sectionRecord,
        [field]: value,
      },
    }
    setData(updated)
    autoSaveSection(section, updated[section])
  }

  function handleAgentProfileChange(field: string, value: string) {
    const updatedAgentProfile = {
      ...data.brandVoice.agentProfile,
      [field]: value,
    }
    const updatedBrandVoice = {
      ...data.brandVoice,
      agentProfile: updatedAgentProfile,
    }
    const updated = {
      ...data,
      brandVoice: updatedBrandVoice,
    }
    setData(updated)
    autoSaveSection('brandVoice', updatedBrandVoice)
  }

  function addObjection() {
    const newEntry: ObjectionEntry = { objection: '', preferredResponse: '' }
    const updatedEntries = [...data.objections.entries, newEntry]
    const updated = { ...data, objections: { entries: updatedEntries } }
    setData(updated)
    autoSaveSection('objections', { entries: updatedEntries })
  }

  function updateObjection(index: number, field: 'objection' | 'preferredResponse', value: string) {
    const updatedEntries = [...data.objections.entries]
    updatedEntries[index] = { ...updatedEntries[index], [field]: value }
    const updated = { ...data, objections: { entries: updatedEntries } }
    setData(updated)
    autoSaveSection('objections', { entries: updatedEntries })
  }

  function removeObjection(index: number) {
    const updatedEntries = data.objections.entries.filter((_, idx) => idx !== index)
    const updated = { ...data, objections: { entries: updatedEntries } }
    setData(updated)
    autoSaveSection('objections', { entries: updatedEntries })
  }

  function addSourceMaterial() {
    const newEntry: SourceMaterialEntry = {
      id: `sm_${Date.now()}`,
      title: 'New Sales Script or FAQ',
      contentType: 'script',
      content: '',
    }
    const updatedList = [...(data.proofPoints.sourceMaterials || []), newEntry]
    const updatedProofPoints = { ...data.proofPoints, sourceMaterials: updatedList }
    const updated = { ...data, proofPoints: updatedProofPoints }
    setData(updated)
    autoSaveSection('proofPoints', updatedProofPoints)
  }

  function updateSourceMaterial<F extends keyof SourceMaterialEntry>(
    index: number,
    field: F,
    value: SourceMaterialEntry[F]
  ) {
    const updatedList = [...(data.proofPoints.sourceMaterials || [])]
    updatedList[index] = { ...updatedList[index], [field]: value }
    const updatedProofPoints = { ...data.proofPoints, sourceMaterials: updatedList }
    const updated = { ...data, proofPoints: updatedProofPoints }
    setData(updated)
    autoSaveSection('proofPoints', updatedProofPoints)
  }

  function removeSourceMaterial(index: number) {
    const updatedList = (data.proofPoints.sourceMaterials || []).filter((_, idx) => idx !== index)
    const updatedProofPoints = { ...data.proofPoints, sourceMaterials: updatedList }
    const updated = { ...data, proofPoints: updatedProofPoints }
    setData(updated)
    autoSaveSection('proofPoints', updatedProofPoints)
  }

  async function handleLoadDemo() {
    const res = await loadDemoBusinessAction()
    if (res.data) {
      setData(res.data)
      setSavedStatus('Loaded Desynthic Demo Data!')
    }
  }

  const currentSection = SECTIONS[currentStep]

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleLoadDemo}
            className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-400 transition hover:bg-blue-500/20"
          >
            <Zap className="h-3.5 w-3.5" />
            Load Demo Business (Desynthic)
          </button>
          <span className="text-xs text-neutral-400">
            {savedStatus}
          </span>
        </div>

        <button
          type="button"
          onClick={onCompile}
          disabled={isCompiling}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {isCompiling ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Compiling 12 Files & Prompt...
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              Compile Sales Brain
            </>
          )}
        </button>
      </div>

      {/* Progress Stepper Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {SECTIONS.map((sec, idx) => {
          const Icon = sec.icon
          const isActive = idx === currentStep
          const isCompleted = idx < currentStep
          return (
            <button
              key={sec.id}
              onClick={() => setCurrentStep(idx)}
              className={`flex items-center gap-2 rounded-lg border p-2.5 text-left text-xs transition ${
                isActive
                  ? 'border-blue-500 bg-blue-500/10 text-blue-300 font-semibold shadow-sm'
                  : 'border-neutral-800 bg-neutral-900/40 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-neutral-500'}`} />
              <span className="truncate">{sec.label.split('. ')[1]}</span>
              {isCompleted && <Check className="ml-auto h-3 w-3 text-emerald-400" />}
            </button>
          )
        })}
      </div>

      {/* Active Section Content Card */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 shadow-xl backdrop-blur-sm">
        <div className="mb-6 flex items-center justify-between border-b border-neutral-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <currentSection.icon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{currentSection.label}</h2>
              <p className="text-xs text-neutral-400">
                Step {currentStep + 1} of {SECTIONS.length} — All inputs autosave continuously.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentStep === 0}
              onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
              className="flex items-center gap-1 rounded-lg border border-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-800 disabled:opacity-30"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Back
            </button>
            <button
              type="button"
              disabled={currentStep === SECTIONS.length - 1}
              onClick={() => setCurrentStep((prev) => Math.min(SECTIONS.length - 1, prev + 1))}
              className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-30"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Section 1: Company */}
        {currentStep === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-neutral-300">Company Name</label>
              <input
                type="text"
                value={data.company.name}
                onChange={(e) => handleFieldChange('company', 'name', e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2.5 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-neutral-300">Website URL</label>
              <input
                type="text"
                value={data.company.website}
                onChange={(e) => handleFieldChange('company', 'website', e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2.5 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-neutral-300">Industry</label>
              <input
                type="text"
                value={data.company.industry}
                onChange={(e) => handleFieldChange('company', 'industry', e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2.5 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-neutral-300">Headquarters / Location</label>
              <input
                type="text"
                value={data.company.headquarters}
                onChange={(e) => handleFieldChange('company', 'headquarters', e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2.5 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="font-semibold text-neutral-300">Company Overview & Elevator Pitch</label>
              <textarea
                rows={3}
                value={data.company.description}
                onChange={(e) => handleFieldChange('company', 'description', e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2.5 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="font-semibold text-neutral-300">Core Mission</label>
              <textarea
                rows={2}
                value={data.company.mission}
                onChange={(e) => handleFieldChange('company', 'mission', e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2.5 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Section 2: Products & Pricing */}
        {currentStep === 1 && (
          <div className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-neutral-300">Core Offerings & Deliverables</label>
              <textarea
                rows={2}
                value={data.products.offerings}
                onChange={(e) => handleFieldChange('products', 'offerings', e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2.5 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-neutral-300">Value Proposition (What outcome do you sell?)</label>
              <textarea
                rows={2}
                value={data.products.valueProposition}
                onChange={(e) => handleFieldChange('products', 'valueProposition', e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2.5 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-neutral-300">Key Differentiators vs Competitors / In-House</label>
              <textarea
                rows={2}
                value={data.products.keyDifferentiators}
                onChange={(e) => handleFieldChange('products', 'keyDifferentiators', e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2.5 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-neutral-300">Pricing Models & Commercial Terms</label>
              <textarea
                rows={2}
                value={data.products.pricingModels}
                onChange={(e) => handleFieldChange('products', 'pricingModels', e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2.5 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Section 3: ICP & Buyer Pain */}
        {currentStep === 2 && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-neutral-300">Target Industries</label>
                <input
                  type="text"
                  value={data.icp.targetIndustries}
                  onChange={(e) => handleFieldChange('icp', 'targetIndustries', e.target.value)}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2.5 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-neutral-300">Target Company Size (Employees / Revenue)</label>
                <input
                  type="text"
                  value={data.icp.targetCompanySize}
                  onChange={(e) => handleFieldChange('icp', 'targetCompanySize', e.target.value)}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2.5 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-neutral-300">Target Decision-Maker Roles / Titles</label>
              <input
                type="text"
                value={data.icp.targetRoles}
                onChange={(e) => handleFieldChange('icp', 'targetRoles', e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2.5 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-neutral-300">Primary Customer Pains & Frustrations</label>
              <textarea
                rows={3}
                value={data.icp.primaryPains}
                onChange={(e) => handleFieldChange('icp', 'primaryPains', e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2.5 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Section 4: Sales Process */}
        {currentStep === 3 && (
          <div className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-neutral-300">Current Sales Motion</label>
              <textarea
                rows={2}
                value={data.salesProcess.salesMotion}
                onChange={(e) => handleFieldChange('salesProcess', 'salesMotion', e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2.5 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-neutral-300">Primary Phone Call Goal</label>
              <input
                type="text"
                value={data.salesProcess.primaryCallGoal}
                onChange={(e) => handleFieldChange('salesProcess', 'primaryCallGoal', e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2.5 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-neutral-300">Meeting Length to Propose</label>
                <input
                  type="text"
                  value={data.salesProcess.calendarMeetingLength}
                  onChange={(e) => handleFieldChange('salesProcess', 'calendarMeetingLength', e.target.value)}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2.5 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-neutral-300">Booking Calendar Link or Method</label>
                <input
                  type="text"
                  value={data.salesProcess.bookingLinkOrMechanism}
                  onChange={(e) => handleFieldChange('salesProcess', 'bookingLinkOrMechanism', e.target.value)}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2.5 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 5: Objections */}
        {currentStep === 4 && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <p className="text-neutral-400">
                Define the most common objections and the exact response style your voice agent will use.
              </p>
              <button
                type="button"
                onClick={addObjection}
                className="flex items-center gap-1 rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-xs text-white hover:bg-neutral-700"
              >
                <Plus className="h-3.5 w-3.5" /> Add Objection
              </button>
            </div>

            <div className="space-y-3">
              {data.objections.entries.map((item, idx) => (
                <div key={idx} className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-300">Objection #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeObjection(idx)}
                      className="text-neutral-500 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Prospect objection (e.g. We already have an SDR team)"
                    value={item.objection}
                    onChange={(e) => updateObjection(idx, 'objection', e.target.value)}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                  <textarea
                    rows={2}
                    placeholder="Preferred response for the AI agent..."
                    value={item.preferredResponse}
                    onChange={(e) => updateObjection(idx, 'preferredResponse', e.target.value)}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 6: Qualification Criteria */}
        {currentStep === 5 && (
          <div className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-neutral-300">Must-Have Qualification Criteria</label>
              <textarea
                rows={2}
                value={data.qualification.mustHaveCriteria}
                onChange={(e) => handleFieldChange('qualification', 'mustHaveCriteria', e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2.5 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-neutral-300">Deal Breakers / Immediate Disqualification</label>
              <textarea
                rows={2}
                value={data.qualification.dealBreakers}
                onChange={(e) => handleFieldChange('qualification', 'dealBreakers', e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2.5 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-neutral-300">Minimum Budget Threshold</label>
                <input
                  type="text"
                  value={data.qualification.budgetThreshold}
                  onChange={(e) => handleFieldChange('qualification', 'budgetThreshold', e.target.value)}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2.5 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-neutral-300">Decision Maker Seniority Requirement</label>
                <input
                  type="text"
                  value={data.qualification.decisionMakerRequirement}
                  onChange={(e) => handleFieldChange('qualification', 'decisionMakerRequirement', e.target.value)}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2.5 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 7: Escalation Rules */}
        {currentStep === 6 && (
          <div className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-neutral-300">Escalation Triggers (When to stop AI and hand off)</label>
              <textarea
                rows={2}
                value={data.escalation.escalationTriggers}
                onChange={(e) => handleFieldChange('escalation', 'escalationTriggers', e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2.5 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-neutral-300">Human Escalation Contact Details</label>
              <input
                type="text"
                value={data.escalation.escalationContact}
                onChange={(e) => handleFieldChange('escalation', 'escalationContact', e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2.5 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-neutral-300">Emergency / Unknown Question Script</label>
              <textarea
                rows={2}
                value={data.escalation.emergencyResponse}
                onChange={(e) => handleFieldChange('escalation', 'emergencyResponse', e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2.5 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Section 8: Compliance & DND */}
        {currentStep === 7 && (
          <div className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-neutral-300">Permitted Calling Hours</label>
              <input
                type="text"
                value={data.compliance.callingHours}
                onChange={(e) => handleFieldChange('compliance', 'callingHours', e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2.5 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-neutral-300">DND & Opt-Out Handling Policy</label>
              <textarea
                rows={2}
                value={data.compliance.dndPolicy}
                onChange={(e) => handleFieldChange('compliance', 'dndPolicy', e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2.5 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-neutral-300">Mandatory Opening AI Disclosure Line</label>
              <input
                type="text"
                value={data.compliance.aiDisclosureLine}
                onChange={(e) => handleFieldChange('compliance', 'aiDisclosureLine', e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2.5 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-neutral-300">Channel Consent Record Policy</label>
              <input
                type="text"
                value={data.compliance.consentRecordRequirement}
                onChange={(e) => handleFieldChange('compliance', 'consentRecordRequirement', e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2.5 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Section 9: Brand Voice & AI Employee Profile */}
        {currentStep === 8 && (
          <div className="space-y-4 text-xs">
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400">
                AI Employee Configuration (Saved with Agent)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-neutral-300">AI Agent Name</label>
                  <input
                    type="text"
                    value={data.brandVoice.agentProfile.name}
                    onChange={(e) => handleAgentProfileChange('name', e.target.value)}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-neutral-300">Role / Title</label>
                  <input
                    type="text"
                    value={data.brandVoice.agentProfile.role}
                    onChange={(e) => handleAgentProfileChange('role', e.target.value)}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-neutral-300">Industry</label>
                  <input
                    type="text"
                    value={data.brandVoice.agentProfile.industry}
                    onChange={(e) => handleAgentProfileChange('industry', e.target.value)}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-neutral-300">Personality</label>
                  <input
                    type="text"
                    value={data.brandVoice.agentProfile.personality}
                    onChange={(e) => handleAgentProfileChange('personality', e.target.value)}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-neutral-300">Sales Style (e.g. Consultative)</label>
                  <input
                    type="text"
                    value={data.brandVoice.agentProfile.salesStyle}
                    onChange={(e) => handleAgentProfileChange('salesStyle', e.target.value)}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-neutral-300">Primary Goal</label>
                  <input
                    type="text"
                    value={data.brandVoice.agentProfile.goal}
                    onChange={(e) => handleAgentProfileChange('goal', e.target.value)}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-neutral-300">Tone of Voice</label>
                <input
                  type="text"
                  value={data.brandVoice.tone}
                  onChange={(e) => handleFieldChange('brandVoice', 'tone', e.target.value)}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2.5 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-neutral-300">Vocabulary / Buzzwords to Avoid</label>
                <input
                  type="text"
                  value={data.brandVoice.vocabularyToAvoid}
                  onChange={(e) => handleFieldChange('brandVoice', 'vocabularyToAvoid', e.target.value)}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2.5 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="font-semibold text-neutral-300">Key Phrases to Emphasize</label>
                <input
                  type="text"
                  value={data.brandVoice.keyPhrasesToUse}
                  onChange={(e) => handleFieldChange('brandVoice', 'keyPhrasesToUse', e.target.value)}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2.5 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 10: Proof Points & Optional Source Materials */}
        {currentStep === 9 && (
          <div className="space-y-6 text-xs">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="font-semibold text-neutral-300">Case Studies & Customer Stories</label>
                <textarea
                  rows={2}
                  value={data.proofPoints.caseStudies}
                  onChange={(e) => handleFieldChange('proofPoints', 'caseStudies', e.target.value)}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2.5 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-neutral-300">Quantifiable Metrics & Proof</label>
                  <input
                    type="text"
                    value={data.proofPoints.metricsAndResults}
                    onChange={(e) => handleFieldChange('proofPoints', 'metricsAndResults', e.target.value)}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2.5 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-neutral-300">Notable Reference Clients</label>
                  <input
                    type="text"
                    value={data.proofPoints.notableClients}
                    onChange={(e) => handleFieldChange('proofPoints', 'notableClients', e.target.value)}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2.5 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Optional Source Material upload/paste */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-neutral-200">
                    Optional Source Material (Scripts, Case Studies, FAQs, Transcripts)
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    These texts are fed into the compiler to improve 05_sales_methodology, 06_objections, and 07_case_studies.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addSourceMaterial}
                  className="flex items-center gap-1 rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-xs text-white hover:bg-neutral-700"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Material
                </button>
              </div>

              <div className="space-y-3">
                {(data.proofPoints.sourceMaterials || []).map((sm, smIdx) => (
                  <div key={sm.id || smIdx} className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={sm.title}
                        placeholder="Document Title (e.g., Top Closers Playbook 2026)"
                        onChange={(e) => updateSourceMaterial(smIdx, 'title', e.target.value)}
                        className="flex-1 rounded border border-neutral-800 bg-neutral-950 px-2 py-1 text-white"
                      />
                      <select
                        value={sm.contentType}
                        onChange={(e) =>
                          updateSourceMaterial(
                            smIdx,
                            'contentType',
                            e.target.value as SourceMaterialEntry['contentType']
                          )
                        }
                        className="rounded border border-neutral-800 bg-neutral-950 px-2 py-1 text-neutral-300"
                      >
                        <option value="script">Sales Script</option>
                        <option value="case_study">Case Study</option>
                        <option value="faq">FAQ</option>
                        <option value="transcript">Call Transcript</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeSourceMaterial(smIdx)}
                        className="text-neutral-500 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={sm.content}
                      placeholder="Paste text contents here..."
                      onChange={(e) => updateSourceMaterial(smIdx, 'content', e.target.value)}
                      className="w-full rounded border border-neutral-800 bg-neutral-950 p-2 text-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bottom Nav */}
        <div className="mt-8 flex items-center justify-between border-t border-neutral-800/80 pt-4">
          <button
            type="button"
            disabled={currentStep === 0}
            onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
            className="flex items-center gap-1 rounded-lg border border-neutral-800 px-4 py-2 text-xs font-medium text-neutral-300 hover:bg-neutral-800 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" /> Previous Section
          </button>

          {currentStep < SECTIONS.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => prev + 1)}
              className="flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
            >
              Continue to Step {currentStep + 2} <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onCompile}
              disabled={isCompiling}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-900/40 hover:bg-emerald-500 disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" /> Complete & Compile Sales Brain
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
