'use client'

import { useState, useTransition } from 'react'
import {
  BrainFileKey,
  BRAIN_FILE_KEYS,
  BRAIN_FILE_TITLES,
  CompiledSalesBrain,
} from '@/types/brain'
import { updateBrainFileAction } from '@/app/actions/brain'
import {
  FileText,
  Download,
  Copy,
  Check,
  Save,
  Clock,
  Mic,
  Sliders,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

interface BrainViewerProps {
  compiledBrain: CompiledSalesBrain
  onRecompilePrompt: (newMaxLength: number) => void
  isCompiling: boolean
}

export function BrainViewer({
  compiledBrain,
  onRecompilePrompt,
  isCompiling,
}: BrainViewerProps) {
  const [activeTab, setActiveTab] = useState<'files' | 'voice_prompt' | 'objections'>('files')
  const [selectedFileKey, setSelectedFileKey] = useState<BrainFileKey>('01_company')
  const [fileContents, setFileContents] = useState<Record<BrainFileKey, string>>(
    compiledBrain.files
  )
  const defaultVersions = BRAIN_FILE_KEYS.reduce(
    (acc, key) => ({ ...acc, [key]: 1 }),
    {} as Record<BrainFileKey, number>
  )
  const [fileVersions, setFileVersions] = useState<Record<BrainFileKey, number>>(defaultVersions)
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const [copiedObjectionId, setCopiedObjectionId] = useState<number | null>(null)
  const [saveStatus, setSaveStatus] = useState<string>('')
  const [isPending, startTransition] = useTransition()
  const [maxPromptLength, setMaxPromptLength] = useState<number>(3800)

  async function handleSaveFile() {
    setSaveStatus('Saving version...')
    const content = fileContents[selectedFileKey]
    startTransition(async () => {
      const res = await updateBrainFileAction(selectedFileKey, content)
      if (res.success) {
        setFileVersions((prev) => ({ ...prev, [selectedFileKey]: res.version }))
        setSaveStatus(`Saved as Version ${res.version}`)
        setTimeout(() => setSaveStatus(''), 3000)
      }
    })
  }

  function handleCopy(text: string, type: 'prompt' | 'objection', id?: number) {
    navigator.clipboard.writeText(text)
    if (type === 'prompt') {
      setCopiedPrompt(true)
      setTimeout(() => setCopiedPrompt(false), 2000)
    } else if (id !== undefined) {
      setCopiedObjectionId(id)
      setTimeout(() => setCopiedObjectionId(null), 2000)
    }
  }

  return (
    <div className="space-y-6">
      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('files')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              activeTab === 'files'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'bg-neutral-900 text-neutral-400 hover:text-white'
            }`}
          >
            <FileText className="h-4 w-4" />
            12 Brain Markdown Files
          </button>
          <button
            onClick={() => setActiveTab('voice_prompt')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              activeTab === 'voice_prompt'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'bg-neutral-900 text-neutral-400 hover:text-white'
            }`}
          >
            <Mic className="h-4 w-4" />
            Voice Agent Prompt
          </button>
          <button
            onClick={() => setActiveTab('objections')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              activeTab === 'objections'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'bg-neutral-900 text-neutral-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            10 Objections Test Card
          </button>
        </div>

        {/* Global Export Download */}
        <a
          href="/api/brain/export/zip"
          download
          className="flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-3.5 py-2 text-xs font-semibold text-neutral-200 transition hover:bg-neutral-800"
        >
          <Download className="h-3.5 w-3.5 text-blue-400" />
          Export All (.ZIP)
        </a>
      </div>

      {/* TAB 1: 12 Brain Files Editor & Viewer */}
      {activeTab === 'files' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* File Selector Sidebar */}
          <div className="lg:col-span-4 space-y-1.5 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-3">
            <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Compiled Brain Files (12 Total)
            </div>
            {BRAIN_FILE_KEYS.map((key) => {
              const isSelected = selectedFileKey === key
              return (
                <button
                  key={key}
                  onClick={() => setSelectedFileKey(key)}
                  className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition ${
                    isSelected
                      ? 'border border-blue-500/30 bg-blue-500/10 text-blue-300 font-semibold'
                      : 'text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-blue-400' : 'text-neutral-500'}`} />
                    <span className="truncate">{BRAIN_FILE_TITLES[key]}</span>
                  </div>
                  <span className="ml-2 text-[10px] text-neutral-500 shrink-0">
                    v{fileVersions[key] || 1}
                  </span>
                </button>
              )
            })}
          </div>

          {/* File Editor & Content Viewer */}
          <div className="lg:col-span-8 flex flex-col rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{BRAIN_FILE_TITLES[selectedFileKey]}</span>
                  <span className="text-[10px] rounded-full bg-neutral-800 border border-neutral-700 px-2 py-0.5 text-neutral-400">
                    {selectedFileKey}.md
                  </span>
                </h3>
                <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5">
                  <Clock className="h-3 w-3 text-neutral-500" />
                  <span>Version {fileVersions[selectedFileKey] || 1}</span>
                  {saveStatus && <span className="text-emerald-400 font-medium">({saveStatus})</span>}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveFile}
                  disabled={isPending}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-blue-500 disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save & Bump Version
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-neutral-400">
                Markdown Editor (Editable with Version History):
              </label>
              <textarea
                rows={18}
                value={fileContents[selectedFileKey] || ''}
                onChange={(e) =>
                  setFileContents((prev) => ({ ...prev, [selectedFileKey]: e.target.value }))
                }
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 p-4 font-mono text-xs text-neutral-200 leading-relaxed focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Voice Agent Prompt & Phone Optimization */}
      {activeTab === 'voice_prompt' && (
        <div className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Phone-Ready Voice Agent Prompt</span>
                <span className="rounded-full bg-blue-500/10 border border-blue-500/30 px-2.5 py-0.5 text-xs font-semibold text-blue-400">
                  External Voice Provider Ready
                </span>
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                Written for spoken voice: short sentences, one question at a time, never invent facts, escalate when unsure, and opening AI disclosure.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopy(compiledBrain.voiceAgentPrompt, 'prompt')}
                className="flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-800"
              >
                {copiedPrompt ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedPrompt ? 'Copied!' : 'Copy Prompt'}
              </button>
              <a
                href="/api/brain/export/prompt"
                download="VOICE_AGENT_PROMPT.txt"
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
              >
                <Download className="h-3.5 w-3.5" />
                Download .TXT
              </a>
            </div>
          </div>

          {/* Configurable Prompt Length Controls */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-neutral-300 font-semibold">
                <Sliders className="h-3.5 w-3.5 text-blue-400" />
                <span>Configurable Max Prompt Length</span>
              </div>
              <div className="font-mono text-xs">
                <span className="text-blue-400">{compiledBrain.voiceAgentPrompt.length}</span>
                <span className="text-neutral-500"> / {maxPromptLength} chars</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <input
                type="range"
                min={2000}
                max={6000}
                step={200}
                value={maxPromptLength}
                onChange={(e) => setMaxPromptLength(Number(e.target.value))}
                className="flex-1 accent-blue-500"
              />
              <button
                type="button"
                onClick={() => onRecompilePrompt(maxPromptLength)}
                disabled={isCompiling}
                className="flex items-center gap-1.5 rounded-lg bg-neutral-800 px-3 py-1 text-xs font-medium text-neutral-200 hover:bg-neutral-700 disabled:opacity-50"
              >
                <Sparkles className="h-3 w-3 text-blue-400" /> Apply Limit
              </button>
            </div>
          </div>

          <div className="relative">
            <pre className="max-h-[500px] overflow-y-auto whitespace-pre-wrap rounded-xl border border-neutral-800 bg-neutral-950 p-4 font-mono text-xs text-neutral-200 leading-relaxed">
              {compiledBrain.voiceAgentPrompt}
            </pre>
          </div>
        </div>
      )}

      {/* TAB 3: 10 Sample Objections Manual Testing Card */}
      {activeTab === 'objections' && (
        <div className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white">
                10 Sample Objections Test Deck
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                Hand-test the voice agent before outbound calls. Verify tone, empathy, and consultative redirection.
              </p>
            </div>

            <a
              href="/api/brain/export/objections"
              download="10_SAMPLE_OBJECTIONS.json"
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
            >
              <Download className="h-3.5 w-3.5" />
              Download .JSON
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {compiledBrain.sampleObjections.map((item) => {
              const isCopied = copiedObjectionId === item.id
              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between rounded-xl border border-neutral-800 bg-neutral-950/70 p-4 space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                        #{item.id} • {item.category}
                      </span>
                      <button
                        onClick={() => handleCopy(item.recommendedScript, 'objection', item.id)}
                        className="text-neutral-500 hover:text-neutral-200"
                      >
                        {isCopied ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>

                    <div className="text-xs font-semibold text-white">
                      &ldquo;{item.objection}&rdquo;
                    </div>

                    <div className="text-[11px] text-neutral-400 italic">
                      Expected Style: {item.expectedStyle}
                    </div>

                    <div className="rounded-lg bg-neutral-900 p-2.5 text-xs text-neutral-200 border border-neutral-800/80">
                      <span className="font-semibold text-blue-400">Response: </span>
                      {item.recommendedScript}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
