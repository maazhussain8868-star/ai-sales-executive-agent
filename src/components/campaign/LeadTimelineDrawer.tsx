'use client'

import React, { useState, useEffect, useTransition } from 'react'
import {
  TimelineMessage,
  ChannelConsent,
  ChannelType,
} from '@/types/channels'
import { Lead } from '@/types/campaign'
import {
  getLeadTimelineAction,
  getChannelConsentsAction,
  updateChannelConsentAction,
  processInboundReplyAction,
  approveAiDraftAction,
} from '@/app/actions/channels'
import {
  X,
  PhoneCall,
  MessageSquare,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Send,
  AlertOctagon,
} from 'lucide-react'

interface LeadTimelineDrawerProps {
  lead: Lead
  onClose: () => void
  onLeadUpdated?: () => void
}

export function LeadTimelineDrawer({
  lead,
  onClose,
  onLeadUpdated,
}: LeadTimelineDrawerProps) {
  const [messages, setMessages] = useState<TimelineMessage[]>([])
  const [consents, setConsents] = useState<ChannelConsent[]>([])
  const [simulatedInboundText, setSimulatedInboundText] = useState('')
  const [selectedChannel, setSelectedChannel] = useState<'whatsapp' | 'email'>('whatsapp')
  const [isPending, startTransition] = useTransition()
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      const msgs = await getLeadTimelineAction(lead.id)
      const csts = await getChannelConsentsAction(lead.id)
      if (mounted) {
        setMessages(msgs)
        setConsents(csts)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [lead.id])

  const handleToggleConsent = (channel: ChannelType) => {
    const existing = consents.find((c) => c.channel === channel)
    const nextStatus = existing?.status === 'opted_in' ? 'opted_out' : 'opted_in'

    startTransition(async () => {
      await updateChannelConsentAction(lead.id, channel, nextStatus)
      setConsents((prev) =>
        prev.map((c) => (c.channel === channel ? { ...c, status: nextStatus } : c))
      )
      setNotice(`Updated ${channel.toUpperCase()} consent to: ${nextStatus}`)
    })
  }

  const handleSimulateInbound = () => {
    if (!simulatedInboundText.trim()) return
    startTransition(async () => {
      const res = await processInboundReplyAction({
        leadId: lead.id,
        channel: selectedChannel,
        text: simulatedInboundText,
        mode: 'draft_for_approval',
      })
      if (res.success) {
        const msgs = await getLeadTimelineAction(lead.id)
        const csts = await getChannelConsentsAction(lead.id)
        setMessages(msgs)
        setConsents(csts)
        setSimulatedInboundText('')
        if (res.globalStopTriggered) {
          setNotice(`🚨 Global STOP triggered! All channels halted and lead marked DND.`)
          onLeadUpdated?.()
        } else {
          setNotice(`Inbound reply received. AI response drafted and awaiting approval!`)
        }
      }
    })
  }

  const handleApproveDraft = (messageId: string) => {
    startTransition(async () => {
      const res = await approveAiDraftAction(messageId)
      if (res.success) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, status: 'sent', approvedBy: 'Admin' } : m))
        )
        setNotice('AI draft approved and dispatched to lead!')
      }
    })
  }

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-neutral-800 bg-neutral-950 p-6 shadow-2xl backdrop-blur-xl">
      {/* Drawer Header */}
      <div className="flex items-center justify-between border-b border-neutral-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">{lead.name}</h2>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                lead.dnd
                  ? 'bg-rose-950 text-rose-400 border border-rose-800/40'
                  : 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
              }`}
            >
              {lead.dnd ? 'DND Active' : lead.status}
            </span>
          </div>
          <p className="text-xs text-neutral-400">
            {lead.company} • {lead.phone} • {lead.email || 'no email'}
          </p>
        </div>

        <button
          onClick={onClose}
          className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-800 hover:text-white transition"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {notice && (
        <div className="mt-3 rounded-lg border border-blue-800/50 bg-blue-950/40 p-2.5 text-xs text-blue-200 flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-[10px] text-neutral-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Channel Consents Bar */}
      <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900/40 p-3.5 space-y-2">
        <span className="text-[11px] font-semibold text-neutral-300 flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Recorded Channel Consents
        </span>

        <div className="grid grid-cols-3 gap-2 text-xs">
          {(['voice', 'whatsapp', 'email'] as ChannelType[]).map((ch) => {
            const cst = consents.find((c) => c.channel === ch)
            const isOptedIn = cst?.status === 'opted_in'
            return (
              <button
                key={ch}
                onClick={() => handleToggleConsent(ch)}
                disabled={isPending}
                className={`flex flex-col items-center rounded-lg border p-2 text-center transition ${
                  isOptedIn
                    ? 'border-emerald-700/50 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/40'
                    : 'border-rose-800/40 bg-rose-950/30 text-rose-300 hover:bg-rose-900/30'
                }`}
              >
                <span className="font-semibold capitalize text-[11px]">{ch}</span>
                <span className="text-[10px] opacity-80">{isOptedIn ? 'OPTED IN' : 'OPTED OUT'}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="mt-4 flex-1 overflow-y-auto space-y-3 pr-1">
        <span className="text-xs font-semibold text-neutral-400">Omnichannel Activity Timeline</span>

        {messages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-800 p-8 text-center text-xs text-neutral-500">
            No activity recorded yet on this lead.
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-xl border p-3.5 text-xs space-y-2 transition ${
                msg.direction === 'inbound'
                  ? 'border-blue-800/50 bg-blue-950/30'
                  : msg.aiDrafted && msg.status === 'pending_approval'
                  ? 'border-amber-700/50 bg-amber-950/30'
                  : 'border-neutral-800 bg-neutral-900/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {msg.channel === 'voice' && <PhoneCall className="h-3.5 w-3.5 text-emerald-400" />}
                  {msg.channel === 'whatsapp' && <MessageSquare className="h-3.5 w-3.5 text-green-400" />}
                  {msg.channel === 'email' && <Mail className="h-3.5 w-3.5 text-blue-400" />}
                  <span className="font-semibold text-white capitalize">{msg.channel}</span>
                  <span className="text-[10px] text-neutral-400">
                    ({msg.direction === 'inbound' ? 'Inbound Reply' : 'Outbound'})
                  </span>
                </div>

                <span className="text-[10px] text-neutral-500">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {msg.subject && (
                <div className="text-[11px] font-semibold text-neutral-300">Subject: {msg.subject}</div>
              )}

              <p className="whitespace-pre-line text-neutral-200 text-xs leading-relaxed">
                {msg.content}
              </p>

              {/* Status & Approval Footer */}
              <div className="pt-2 border-t border-neutral-800/60 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1 text-neutral-400">
                  <Clock className="h-3 w-3" />
                  <span className="uppercase">{msg.status.replace('_', ' ')}</span>
                  {msg.approvedBy && <span className="text-emerald-400">• Approved by {msg.approvedBy}</span>}
                </div>

                {msg.status === 'pending_approval' && (
                  <button
                    onClick={() => handleApproveDraft(msg.id)}
                    disabled={isPending}
                    className="flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow hover:bg-emerald-500 transition"
                  >
                    <CheckCircle2 className="h-3 w-3" /> Approve & Send
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Interactive Simulator: Inbound Reply & STOP test */}
      <div className="mt-4 border-t border-neutral-800 pt-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-neutral-300 flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-blue-400" /> Simulate Inbound Reply from Lead
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedChannel('whatsapp')}
              className={`rounded px-2 py-0.5 text-[10px] ${
                selectedChannel === 'whatsapp' ? 'bg-green-700 text-white' : 'text-neutral-400'
              }`}
            >
              WhatsApp
            </button>
            <button
              onClick={() => setSelectedChannel('email')}
              className={`rounded px-2 py-0.5 text-[10px] ${
                selectedChannel === 'email' ? 'bg-blue-700 text-white' : 'text-neutral-400'
              }`}
            >
              Email
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={simulatedInboundText}
            onChange={(e) => setSimulatedInboundText(e.target.value)}
            placeholder="Type message, e.g. 'What is the pricing?' or 'STOP'..."
            className="flex-1 rounded-xl border border-neutral-800 bg-neutral-900 p-2 text-xs text-neutral-200 focus:border-blue-500 focus:outline-none"
          />

          <button
            onClick={handleSimulateInbound}
            disabled={isPending || !simulatedInboundText.trim()}
            className="flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow hover:bg-blue-500 transition disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" /> Send
          </button>
        </div>

        <div className="flex items-center gap-2 pt-1 text-[11px] text-neutral-400">
          <span>Quick tests:</span>
          <button
            type="button"
            onClick={() => setSimulatedInboundText('Can you send me your pricing?')}
            className="text-blue-400 hover:underline"
          >
            Pricing question
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => setSimulatedInboundText('STOP')}
            className="text-rose-400 font-semibold hover:underline flex items-center gap-0.5"
          >
            <AlertOctagon className="h-3 w-3" /> Send STOP (opt out)
          </button>
        </div>
      </div>
    </div>
  )
}
