'use client'

import React, { useState } from 'react'
import { VersionedSalesBrain, BrainSectionKey } from '@/types/brain-v2'
import {
  FileText,
  Save,
  CheckCircle2,
  Sparkles,
  BookOpen,
  History
} from 'lucide-react'

interface BrainEditorV2Props {
  brain: VersionedSalesBrain
  onSaveSection: (key: BrainSectionKey, content: string) => Promise<void>
}

export function BrainEditorV2({ brain, onSaveSection }: BrainEditorV2Props) {
  const [activeKey, setActiveKey] = useState<BrainSectionKey>('company')
  const [content, setContent] = useState<string>(brain.sections[activeKey]?.content || '')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const handleSelectTab = (key: BrainSectionKey) => {
    setActiveKey(key)
    setContent(brain.sections[key]?.content || '')
    setSaveSuccess(false)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSaveSection(activeKey, content)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  const sectionsList: Array<{ key: BrainSectionKey; label: string }> = [
    { key: 'company', label: 'Company Profile' },
    { key: 'products', label: 'Products & Offer' },
    { key: 'icp', label: 'ICP & Disqualifiers' },
    { key: 'objections', label: 'Objection Playbook' },
    { key: 'pricing', label: 'Pricing Terms' },
    { key: 'compliance', label: 'Compliance & Disclosure' },
    { key: 'voice_and_tone', label: 'Brand Voice' },
    { key: 'handoff_rules', label: 'Human Handoff' }
  ]

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 md:p-6 backdrop-blur space-y-4">
      {/* Version Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white">Active Sales Brain</h3>
            <span className="px-2 py-0.5 text-xs font-semibold bg-blue-950/60 border border-blue-800 text-blue-300 rounded-full flex items-center gap-1">
              <History className="h-3 w-3" />
              v{brain.version}
            </span>
            <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-full flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Activated
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Every section below is directly editable. Changes immediately recompile into the active voice agent prompt.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow transition"
        >
          {isSaving ? (
            <Sparkles className="h-4 w-4 animate-spin" />
          ) : saveSuccess ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saveSuccess ? 'Saved & Activated!' : 'Save Section'}
        </button>
      </div>

      {/* Modular Section Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {sectionsList.map((sec) => (
          <button
            key={sec.key}
            onClick={() => handleSelectTab(sec.key)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-left transition ${
              activeKey === sec.key
                ? 'bg-neutral-800 text-white border border-neutral-700 shadow'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
            }`}
          >
            <FileText className="h-3.5 w-3.5 shrink-0 text-blue-400" />
            <span className="truncate">{sec.label}</span>
          </button>
        ))}
      </div>

      {/* Editor Textarea */}
      <div className="pt-2">
        <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
          <span className="font-semibold text-white flex items-center gap-1.5">
            <BookOpen className="h-4 w-4 text-blue-400" />
            {brain.sections[activeKey]?.title}
          </span>
          <span className="text-[11px] text-neutral-500">Markdown format</span>
        </div>
        <textarea
          rows={12}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full bg-neutral-950 font-mono text-xs text-neutral-200 border border-neutral-800 rounded-xl p-4 focus:outline-none focus:border-blue-500 leading-relaxed"
        />
      </div>
    </div>
  )
}
