'use client'

import React, { useState } from 'react'
import { DiscoveryInterviewData } from '@/types/brain-v2'
import {
  ArrowRight,
  ArrowLeft,
  Sparkles
} from 'lucide-react'

interface DiscoveryInterviewV2Props {
  initialData: DiscoveryInterviewData
  onComplete: (data: DiscoveryInterviewData) => void
}

export function DiscoveryInterviewV2({
  initialData,
  onComplete
}: DiscoveryInterviewV2Props) {
  const [formData, setFormData] = useState<DiscoveryInterviewData>(initialData)
  const [step, setStep] = useState<number>(1)
  const [isCompiling, setIsCompiling] = useState(false)

  const handleNext = () => {
    if (step < 5) setStep(step + 1)
    else {
      setIsCompiling(true)
      onComplete(formData)
    }
  }

  const handlePrev = () => {
    if (step > 1) setStep(step - 1)
  }

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 md:p-8 backdrop-blur">
      {/* Step Indicator Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-6">
        <div>
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
            Step {step} of 5
          </span>
          <h2 className="text-lg font-bold text-white mt-0.5">
            {step === 1 && 'Company Identity & Mission'}
            {step === 2 && 'Offer, Value & ICP Target'}
            {step === 3 && 'Sales Process & Pricing Terms'}
            {step === 4 && 'Objections & Compliance Guardrails'}
            {step === 5 && 'Brand Voice & Escalation Handoff'}
          </h2>
        </div>

        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                s === step
                  ? 'w-6 bg-blue-500'
                  : s < step
                  ? 'w-2 bg-emerald-500'
                  : 'w-2 bg-neutral-800'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step 1: Company */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">Company Name</label>
            <input
              type="text"
              value={formData.company.name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  company: { ...formData.company, name: e.target.value }
                })
              }
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">Website</label>
              <input
                type="text"
                value={formData.company.website}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    company: { ...formData.company, website: e.target.value }
                  })
                }
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">Headquarters</label>
              <input
                type="text"
                value={formData.company.headquarters}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    company: { ...formData.company, headquarters: e.target.value }
                  })
                }
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">Overview & Mission</label>
            <textarea
              rows={3}
              value={formData.company.description}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  company: { ...formData.company, description: e.target.value }
                })
              }
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {/* Step 2: Offer & ICP */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">Core Product / Offer</label>
            <textarea
              rows={2}
              value={formData.offer.offerings}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  offer: { ...formData.offer, offerings: e.target.value }
                })
              }
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">Value Proposition & Differentiators</label>
            <textarea
              rows={2}
              value={formData.offer.valueProposition}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  offer: { ...formData.offer, valueProposition: e.target.value }
                })
              }
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">Target Roles & Company Size</label>
              <input
                type="text"
                value={formData.icp.targetRoles}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    icp: { ...formData.icp, targetRoles: e.target.value }
                  })
                }
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">Disqualifiers (Do Not Pursue)</label>
              <input
                type="text"
                value={formData.icp.disqualifiers}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    icp: { ...formData.icp, disqualifiers: e.target.value }
                  })
                }
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Sales Process & Pricing */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">Primary Call Goal</label>
            <input
              type="text"
              value={formData.salesProcess.primaryCallGoal}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  salesProcess: { ...formData.salesProcess, primaryCallGoal: e.target.value }
                })
              }
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">Approved Commercial Pricing</label>
            <textarea
              rows={2}
              value={formData.pricing.approvedPricingModel}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  pricing: { ...formData.pricing, approvedPricingModel: e.target.value }
                })
              }
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="p-3 bg-amber-950/20 border border-amber-900/50 rounded-xl text-xs text-amber-300">
            ⚠️ AI representative is strictly non-negotiable on pricing and cannot offer unauthorized discounts.
          </div>
        </div>
      )}

      {/* Step 4: Objections & Compliance */}
      {step === 4 && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">Mandatory AI Disclosure Line</label>
            <input
              type="text"
              value={formData.callOpening.mandatoryAiDisclosure}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  callOpening: { ...formData.callOpening, mandatoryAiDisclosure: e.target.value }
                })
              }
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">Prohibited Claims (Never Utter)</label>
            <textarea
              rows={2}
              value={formData.prohibitedClaims}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  prohibitedClaims: e.target.value
                })
              }
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {/* Step 5: Voice & Handoff */}
      {step === 5 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">AI Persona Name</label>
              <input
                type="text"
                value={formData.brandVoice.personaName}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    brandVoice: { ...formData.brandVoice, personaName: e.target.value }
                  })
                }
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">Escalation Human Contact</label>
              <input
                type="text"
                value={formData.handoffRules.contactPersonName}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    handoffRules: { ...formData.handoffRules, contactPersonName: e.target.value }
                  })
                }
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">Escalation Email</label>
            <input
              type="text"
              value={formData.handoffRules.contactEmail}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  handoffRules: { ...formData.handoffRules, contactEmail: e.target.value }
                })
              }
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-neutral-800 mt-6">
        <button
          onClick={handlePrev}
          disabled={step === 1}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition ${
            step === 1
              ? 'opacity-30 cursor-not-allowed text-neutral-500'
              : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
          }`}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <button
          onClick={handleNext}
          disabled={isCompiling}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-lg shadow-blue-500/20 transition"
        >
          {step === 5 ? (
            <>
              <Sparkles className="h-4 w-4" />
              {isCompiling ? 'Compiling Sales Brain...' : 'Compile & Activate Brain'}
            </>
          ) : (
            <>
              Next
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
