'use client'

import React, { useState } from 'react'
import {
  LeadV2,
  CampaignV2,
  CsvImportSummary,
  PreLaunchChecklist,
  CampaignCostEstimate
} from '@/types/campaign-v2'
import {
  Upload,
  Play,
  Pause,
  Square,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileDown,
  DollarSign,
  Clock,
  ShieldCheck
} from 'lucide-react'

interface CampaignManagerV2Props {
  initialCampaigns: CampaignV2[]
  initialLeads: LeadV2[]
  onImportCsv: (csvText: string) => Promise<CsvImportSummary>
  onValidateChecklist: (campaignId: string) => Promise<PreLaunchChecklist>
  onLaunchCampaign: (campaignId: string) => Promise<{ success: boolean; error?: string }>
  onToggleState: (campaignId: string, action: 'pause' | 'resume' | 'stop') => Promise<void>
  onCalculateEstimate: (leadCount: number) => Promise<CampaignCostEstimate>
}

export function CampaignManagerV2({
  initialCampaigns,
  initialLeads,
  onImportCsv,
  onValidateChecklist,
  onLaunchCampaign,
  onToggleState,
  onCalculateEstimate
}: CampaignManagerV2Props) {
  const [campaigns, setCampaigns] = useState<CampaignV2[]>(initialCampaigns)
  void campaigns
  const [leads, setLeads] = useState<LeadV2[]>(initialLeads)
  const [activeCampaign] = useState<CampaignV2>(initialCampaigns[0] || null)

  // CSV State
  const [csvInput, setCsvInput] = useState('')
  const [importSummary, setImportSummary] = useState<CsvImportSummary | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  // Checklist & Cost State
  const [checklist, setChecklist] = useState<PreLaunchChecklist | null>(null)
  const [costEstimate, setCostEstimate] = useState<CampaignCostEstimate | null>(null)
  const [launchMessage, setLaunchMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleRunImport = async () => {
    if (!csvInput.trim() || isImporting) return
    setIsImporting(true)
    try {
      const summary = await onImportCsv(csvInput)
      setImportSummary(summary)
      if (summary.validLeads.length > 0) {
        setLeads((prev) => [...prev, ...summary.validLeads])
      }
    } finally {
      setIsImporting(false)
    }
  }

  const handleDownloadErrorReport = () => {
    if (!importSummary?.errorCsvContent) return
    const blob = new Blob([importSummary.errorCsvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'invalid_leads_report.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCheckCompliance = async () => {
    if (!activeCampaign) return
    const cl = await onValidateChecklist(activeCampaign.id)
    setChecklist(cl)
    const est = await onCalculateEstimate(leads.length)
    setCostEstimate(est)
  }

  const handleLaunch = async () => {
    if (!activeCampaign) return
    const res = await onLaunchCampaign(activeCampaign.id)
    if (res.success) {
      setCampaigns((prev) =>
        prev.map((c) => (c.id === activeCampaign.id ? { ...c, status: 'ACTIVE' } : c))
      )
      setLaunchMessage({ type: 'success', text: 'Campaign successfully launched! Outreach active.' })
    } else {
      setLaunchMessage({ type: 'error', text: res.error || 'Launch blocked by compliance gate.' })
    }
  }

  const handleToggle = async (action: 'pause' | 'resume' | 'stop') => {
    if (!activeCampaign) return
    await onToggleState(activeCampaign.id, action)
    const newStatus = action === 'pause' ? 'PAUSED' : action === 'resume' ? 'ACTIVE' : 'STOPPED'
    setCampaigns((prev) =>
      prev.map((c) => (c.id === activeCampaign.id ? { ...c, status: newStatus } : c))
    )
  }

  return (
    <div className="space-y-6">
      {/* 1. Pre-Launch Compliance Checklist Card */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 md:p-6 backdrop-blur space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-400" />
              Pre-Launch Compliance Gate
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              Every campaign must pass all 5 regulatory safety checks before outbound dialing is enabled.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCheckCompliance}
              className="bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold px-3 py-2 rounded-xl border border-neutral-700 transition"
            >
              Verify Checklist
            </button>
            <button
              onClick={handleLaunch}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow transition flex items-center gap-1.5"
            >
              <Play className="h-3.5 w-3.5" />
              Launch Campaign
            </button>
          </div>
        </div>

        {launchMessage && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              launchMessage.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                : 'bg-red-950/40 border-red-800 text-red-300'
            }`}
          >
            {launchMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            )}
            {launchMessage.text}
          </div>
        )}

        {/* Checklist Items */}
        {checklist && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
            <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center justify-between text-xs">
              <span className="text-neutral-300">1. Verified Lead Source</span>
              {checklist.hasLeadSource ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <XCircle className="h-4 w-4 text-red-400" />
              )}
            </div>

            <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center justify-between text-xs">
              <span className="text-neutral-300">2. Calling Window (10-18 IST)</span>
              {checklist.hasCallingWindow ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <XCircle className="h-4 w-4 text-red-400" />
              )}
            </div>

            <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center justify-between text-xs">
              <span className="text-neutral-300">3. ICP Qualification Rules</span>
              {checklist.hasQualificationRules ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <XCircle className="h-4 w-4 text-red-400" />
              )}
            </div>

            <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center justify-between text-xs">
              <span className="text-neutral-300">4. Mandatory AI Disclosure</span>
              {checklist.hasAiDisclosureLine ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <XCircle className="h-4 w-4 text-red-400" />
              )}
            </div>

            <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center justify-between text-xs">
              <span className="text-neutral-300">5. Opt-Out Protocol</span>
              {checklist.hasOptOutHandling ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <XCircle className="h-4 w-4 text-red-400" />
              )}
            </div>

            <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center justify-between text-xs">
              <span className="text-neutral-300">Gate Status</span>
              <span
                className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                  checklist.isReadyToLaunch
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-red-950 text-red-400 border border-red-800'
                }`}
              >
                {checklist.isReadyToLaunch ? 'ALL CLEAR' : 'BLOCKED'}
              </span>
            </div>
          </div>
        )}

        {/* Cost Estimation */}
        {costEstimate && (
          <div className="p-3.5 bg-neutral-950/80 rounded-xl border border-neutral-800 text-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-neutral-300">
              <Clock className="h-4 w-4 text-blue-400" />
              Estimated Usage: <strong>{costEstimate.totalEstimatedMinutes} mins</strong> ({costEstimate.leadCount} leads &times; {costEstimate.averageMinutesPerCall} mins)
            </div>
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <DollarSign className="h-4 w-4" />
              Estimated Provider Cost: ₹{costEstimate.totalEstimatedCostInr.toLocaleString()} INR
            </div>
          </div>
        )}
      </div>

      {/* 2. CSV Lead Import Card */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 md:p-6 backdrop-blur space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-400" />
              CSV Lead Ingestion & Phone Normalization
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Paste or upload CSV text. Validates Indian E.164 formats, detects batch/DB duplicates, and generates error reports.
            </p>
          </div>
        </div>

        <textarea
          rows={4}
          placeholder="name,phone,company,language&#10;Rajesh Sharma,9876543210,Apex Growth,en&#10;Kavita Patel,+91 99999-99999,SaaS Labs,hi&#10;Bad Row,12345,Invalid Co,en"
          value={csvInput}
          onChange={(e) => setCsvInput(e.target.value)}
          className="w-full bg-neutral-950 font-mono text-xs text-neutral-200 border border-neutral-800 rounded-xl p-3 focus:outline-none focus:border-blue-500"
        />

        <div className="flex items-center justify-between">
          <button
            onClick={handleRunImport}
            disabled={isImporting || !csvInput.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-semibold px-4 py-2 rounded-xl transition"
          >
            {isImporting ? 'Validating CSV...' : 'Import & Normalize Leads'}
          </button>

          {importSummary && importSummary.invalidRows.length > 0 && (
            <button
              onClick={handleDownloadErrorReport}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 bg-red-950/40 border border-red-900/50 px-3 py-1.5 rounded-xl transition"
            >
              <FileDown className="h-3.5 w-3.5" />
              Download Error Report ({importSummary.invalidRows.length} rows)
            </button>
          )}
        </div>

        {/* Import Summary Results */}
        {importSummary && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-xs">
              <div className="text-neutral-500 text-[10px] uppercase">Valid Leads Added</div>
              <div className="text-lg font-bold text-emerald-400 mt-1">{importSummary.validLeads.length}</div>
            </div>
            <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-xs">
              <div className="text-neutral-500 text-[10px] uppercase">Duplicates Flagged</div>
              <div className="text-lg font-bold text-amber-400 mt-1">{importSummary.duplicateRows.length}</div>
            </div>
            <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-xs">
              <div className="text-neutral-500 text-[10px] uppercase">Invalid Rows Rejected</div>
              <div className="text-lg font-bold text-red-400 mt-1">{importSummary.invalidRows.length}</div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Campaign Status & Quick Controls */}
      {activeCampaign && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 backdrop-blur flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white">{activeCampaign.name}</h4>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                activeCampaign.status === 'ACTIVE'
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                  : activeCampaign.status === 'PAUSED'
                  ? 'bg-amber-950 text-amber-400 border-amber-800'
                  : 'bg-neutral-800 text-neutral-400 border-neutral-700'
              }`}>
                {activeCampaign.status}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Goal: {activeCampaign.goal} | Window: {activeCampaign.callingWindow.start} - {activeCampaign.callingWindow.end} IST | Leads: {leads.length}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeCampaign.status === 'ACTIVE' ? (
              <button
                onClick={() => handleToggle('pause')}
                className="flex items-center gap-1.5 text-xs font-semibold bg-amber-600/20 text-amber-300 border border-amber-800 px-3 py-1.5 rounded-xl hover:bg-amber-600/30 transition"
              >
                <Pause className="h-3.5 w-3.5" />
                Pause Calls
              </button>
            ) : (
              <button
                onClick={() => handleToggle('resume')}
                className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-600/20 text-emerald-300 border border-emerald-800 px-3 py-1.5 rounded-xl hover:bg-emerald-600/30 transition"
              >
                <Play className="h-3.5 w-3.5" />
                Resume Calls
              </button>
            )}

            <button
              onClick={() => handleToggle('stop')}
              className="flex items-center gap-1.5 text-xs font-semibold bg-neutral-800 text-neutral-400 border border-neutral-700 px-3 py-1.5 rounded-xl hover:text-white transition"
            >
              <Square className="h-3.5 w-3.5" />
              Stop
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
