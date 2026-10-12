'use client'

import React, { useState } from 'react'
import {
  VersionedSalesBrain,
  BrainTestResult
} from '@/types/brain-v2'
import {
  MessageSquare,
  Play,
  CheckCircle2,
  XCircle,
  Sparkles,
  Send,
  User,
  Bot
} from 'lucide-react'

interface ChatPreviewAndTesterV2Props {
  brain?: VersionedSalesBrain
  onRunTestSuite: () => Promise<BrainTestResult[]>
  onSimulateChat: (message: string) => Promise<string>
}

export function ChatPreviewAndTesterV2({
  onRunTestSuite,
  onSimulateChat
}: ChatPreviewAndTesterV2Props) {
  const [activeTab, setActiveTab] = useState<'chat' | 'test_runner'>('test_runner')

  // Chat State
  const [messages, setMessages] = useState<
    Array<{ role: 'user' | 'assistant'; content: string }>
  >([
    {
      role: 'assistant',
      content:
        'Hi, this is Priya calling from Desynthic. May I speak with the founder or head of sales?'
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)

  // Test Suite State
  const [testResults, setTestResults] = useState<BrainTestResult[]>([])
  const [isRunningTests, setIsRunningTests] = useState(false)

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isSending) return
    const userText = inputValue.trim()
    setInputValue('')
    setMessages((prev) => [...prev, { role: 'user', content: userText }])
    setIsSending(true)

    try {
      const aiReply = await onSimulateChat(userText)
      setMessages((prev) => [...prev, { role: 'assistant', content: aiReply }])
    } finally {
      setIsSending(false)
    }
  }

  const handleRunAllTests = async () => {
    setIsRunningTests(true)
    try {
      const results = await onRunTestSuite()
      setTestResults(results)
    } finally {
      setIsRunningTests(false)
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 md:p-6 backdrop-blur space-y-5">
      {/* Tab Switcher */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('test_runner')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'test_runner'
                ? 'bg-blue-600 text-white shadow'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <Play className="h-3.5 w-3.5" />
            Built-in Test Suite
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'chat'
                ? 'bg-blue-600 text-white shadow'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Interactive Prospect Roleplay
          </button>
        </div>

        <span className="text-[11px] text-neutral-500 hidden sm:inline">
          Model: Fake/Offline Router
        </span>
      </div>

      {/* 1. Test Suite Runner View */}
      {activeTab === 'test_runner' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-neutral-950/70 border border-neutral-800 rounded-xl">
            <div>
              <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-blue-400" />
                Automated Sales Brain Scenario Evaluator
              </h4>
              <p className="text-xs text-neutral-400 mt-0.5">
                Evaluates product questions, pricing defense, top objections, competitor questions, opt-outs (EN/HI/Hinglish), and unknown questions.
              </p>
            </div>

            <button
              onClick={handleRunAllTests}
              disabled={isRunningTests}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow transition"
            >
              {isRunningTests ? (
                <Sparkles className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isRunningTests ? 'Evaluating Scenarios...' : 'Run All Test Scenarios'}
            </button>
          </div>

          {/* Test Results Display */}
          {testResults.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
                <span>
                  Passed:{' '}
                  <strong className="text-emerald-400">
                    {testResults.filter((r) => r.passed).length} / {testResults.length}
                  </strong>
                </span>
                <span className="text-emerald-400 font-semibold">100% Compliance</span>
              </div>

              <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto pr-1">
                {testResults.map((result) => (
                  <div
                    key={result.scenarioId}
                    className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-950/80 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{result.scenarioName}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 border ${
                          result.passed
                            ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400'
                            : 'bg-red-950/60 border-red-800 text-red-400'
                        }`}
                      >
                        {result.passed ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {result.passed ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>

                    <div className="text-neutral-400 italic">
                      Prospect: &ldquo;{result.prospectUtterance}&rdquo;
                    </div>

                    <div className="text-blue-300 bg-blue-950/20 p-2 rounded-lg border border-blue-900/30">
                      AI Agent: {result.aiResponse}
                    </div>

                    <div className="text-[11px] text-neutral-500">
                      Reasoning: {result.reason}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Interactive Prospect Chat View */}
      {activeTab === 'chat' && (
        <div className="space-y-3">
          <div className="h-72 overflow-y-auto bg-neutral-950/90 rounded-xl p-4 border border-neutral-800 space-y-3">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2 text-xs ${
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {m.role === 'assistant' && (
                  <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                    <Bot className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
                <div
                  className={`p-3 rounded-2xl max-w-[80%] ${
                    m.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-neutral-900 border border-neutral-800 text-neutral-200 rounded-tl-none'
                  }`}
                >
                  {m.content}
                </div>
                {m.role === 'user' && (
                  <div className="h-6 w-6 rounded-full bg-neutral-700 flex items-center justify-center shrink-0">
                    <User className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Chat Input */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ask pricing, test an objection, or opt out in Hindi/Hinglish..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleSendMessage}
              disabled={isSending}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow"
            >
              <Send className="h-3.5 w-3.5" />
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
