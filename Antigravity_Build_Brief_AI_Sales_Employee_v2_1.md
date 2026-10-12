# Antigravity Build Brief: Desynthic AI Sales Employee

**Aligned to PRD v2.1 | 9 Oct 2026**

How to use: paste **Part 1 (Master Prompt)** first, upload PRD v2.1 as a file, then send **one phase prompt at a time**. Do not paste the next phase until the previous one is reviewed.

---

## Part 1: Master Prompt (paste first)

```
You are the lead engineer building "Desynthic AI Sales Employee": a voice-first,
business-trained AI salesperson that learns a company's offer, calls approved
prospects, qualifies leads, follows up on WhatsApp, books meetings and hands
off to humans. The attached PRD v2.1 is the source of truth.

WORKING RULES
1. Build ONE phase at a time. When a phase is done, STOP, report, and WAIT for
   my approval. Never start the next phase on your own.
2. Build only the "Pilot Build" scope (tags P in the PRD). Do not build Paid
   MVP (M) or Later features unless I explicitly say so. If something is
   tagged M, leave a clean extension point and a TODO, nothing more.
3. Before coding each phase: list the files you will create/change and any
   assumptions. Ask me only if a decision blocks you; otherwise state the
   assumption and continue.
4. After each phase give me: (a) what was built, (b) how to run and test it,
   (c) test results, (d) known gaps, (e) the decisions I must make next.
5. Never invent confirmations. A meeting, message or CRM row is "done" only
   after the external provider confirms. Failures must be visible, never
   silent.
6. Safety first: a lead that is opted-out, on DND or suppressed must never be
   dialed or messaged. Enforce this in code at the last step before sending,
   not only in the UI.
7. Keep voice provider, LLM provider, calendar, CRM and WhatsApp behind
   adapter interfaces so any one can be swapped. Use a model router (config
   driven; no model names hard-coded in business logic).
8. All webhooks must be idempotent (dedupe by provider event ID).
9. Secrets only in environment variables. Provide .env.example.
10. Write tests for every rule in the acceptance criteria of the phase.
11. Keep code simple and readable. No premature optimization, no extra
    features, no unrequested dependencies.

TECH DEFAULTS (change only if you give a strong reason)
- TypeScript, Next.js (App Router) for dashboard and API routes
- Supabase (Postgres + Auth + Storage), SQL migrations checked into repo
- Background worker with a job queue for campaigns, retries and follow-ups
- Provider adapters: VoiceProvider, LLMProvider, CalendarProvider,
  CRMProvider, MessagingProvider (WhatsApp)
- Mobile-friendly UI (founders use phones)

LANGUAGES: English, Hindi, Hinglish for the Pilot Build. Telugu is Paid MVP.

First, read the PRD fully and reply with: your understanding in 10 lines, the
proposed folder structure, the database tables list, and your questions (max 5).
Do not write code yet.
```

---

## Part 2: Phase prompts (send one at a time)

### Phase 0: Foundation and architecture

```
PHASE 0: Foundation. Build only this, then STOP and wait.

Tasks:
1. Create the repo structure, TypeScript config, lint, formatting, test runner.
2. Create Supabase SQL migrations for core tables: workspaces, users,
   sales_brains, sales_brain_sections, leads, campaigns, campaign_leads,
   calls, call_events, transcripts, call_qa, follow_ups, meetings,
   suppression_list, crm_sync_log, messages, usage_events, audit_log.
   Include provider_event_id unique constraints for idempotency.
3. Define adapter interfaces (VoiceProvider, LLMProvider, CalendarProvider,
   CRMProvider, MessagingProvider) with typed methods plus a mock/fake
   implementation of each, so everything runs locally without real providers.
4. Add a config-driven model router (task type -> model), with a fake model
   for tests.
5. Add .env.example, README with setup and run steps, and a health-check
   endpoint.

Acceptance:
- Project installs and runs with one command.
- Migrations apply cleanly on a fresh database.
- Fake adapters pass interface tests.
- README lets a new developer run it in under 10 minutes.

Report back, then STOP.
```

### Phase 1: Workspace, Business Discovery and Sales Brain

```
PHASE 1: Workspace + Sales Brain. Only this phase, then STOP.

Tasks:
1. Login/signup, workspace creation, single owner role (full roles are Paid MVP).
2. Guided Business Discovery interview (mobile-friendly, step by step) that
   captures: company identity, offer, differentiators, ICP and disqualifiers,
   sales process, approved pricing, proof points, objections and approved
   answers, prohibited claims, brand voice, call opening, handoff rules,
   languages.
3. Generate the Sales Brain from the interview using the LLM adapter: modular
   sections (company, products, ICP, objections, pricing, compliance, voice
   and tone, handoff rules). Every section is editable by the user.
4. Test preview: a chat box where the user talks to the AI as a prospect, using
   the Sales Brain. Include a built-in test suite runner for: product
   questions, pricing, top objections, competitor question, disqualified
   lead, angry/busy prospect, opt-out phrase (English, Hindi, Hinglish),
   request for a human, unknown question.
5. Approve/activate a Sales Brain. Store a simple version number on each
   approval (full history and rollback are Paid MVP; leave extension point).

Rules the AI must follow (put these in the base system prompt, not only in the
user's brain): never invent capabilities, prices, results or availability;
mark unknowns as unknown; stop after a clear refusal; offer a human for
negotiation or low confidence.

Acceptance:
- A new user completes onboarding on a phone and activates a Sales Brain.
- Test suite runs and shows pass/fail with the AI's answers.
- Unknown-question test results in "I'll check and get back / human handoff",
  never a made-up answer.

Report back, then STOP.
```

### Phase 2: Leads, suppression and campaigns

```
PHASE 2: Leads + Suppression + Campaigns. Only this phase, then STOP.

Tasks:
1. CSV lead import with field mapping, validation, phone normalization
   (E.164, India default), duplicate detection (show duplicates, let user
   skip or merge, never silently overwrite), invalid-row report download,
   source and import timestamp, preferred language, time zone.
2. Suppression engine: opt-out list, DND/NDNC check through an adapter (mock
   for now), manual exclusions. A single function canContact(lead, channel,
   now) that every outbound action must call. It returns allowed/blocked plus
   the reason, and is logged.
3. Campaign model: goal, Sales Brain, language, call window with time zone
   (default to permitted Indian calling hours), qualification rules,
   follow-up sequence, lead list. Create, schedule, pause, resume, stop.
4. Pre-launch compliance checklist: a campaign cannot launch without lead
   source, calling window, qualification rules, AI/recording disclosure line,
   and opt-out handling configured.
5. Usage estimate before launch (leads x average minutes x provider cost
   setting).

Acceptance:
- Import of a messy CSV gives a clear summary and error file.
- Opted-out/DND/suppressed leads are blocked by canContact in tests.
- Campaign launch is blocked when compliance fields are incomplete.
- Pause/stop prevents new calls from being queued (in-progress excepted).

Report back, then STOP.
```

### Phase 3: Voice calling engine

```
PHASE 3: Voice calls. Only this phase, then STOP.

Decision needed first: ask me which voice provider to integrate (I will choose
based on cost and Hindi/Hinglish quality). Build the VoiceProvider adapter for
that one provider only, and keep the fake adapter for tests.

Tasks:
1. Campaign worker: picks READY leads, calls canContact right before dialing,
   respects calling window, concurrency limit, and retry limits.
2. Call lifecycle with states: QUEUED, INITIATED, RINGING, ANSWERED,
   IN_PROGRESS, COMPLETED, NO_ANSWER, BUSY, FAILED, CANCELLED, OPTED_OUT.
   Every attempt ends in a terminal state or explicit retry-pending.
3. Conversation engine: Sales Brain + live conversation state, language-aware
   (English/Hindi/Hinglish; switch if the prospect switches), interruption
   handling where the provider supports it, opening line with business and
   AI/recording disclosure.
4. In-call opt-out detection: if the prospect says stop/do not call (any
   supported language), end politely, mark OPTED_OUT, add to suppression list
   immediately.
5. Webhook handlers: idempotent, store provider call ID, timestamps, duration,
   failure reason, recording URL, transcript. Show "transcript pending/failed"
   separately from call success.
6. Cost capture: record provider cost per call and per connected minute into
   usage_events (needed to price the product).

Acceptance:
- Simulated and (with my approval) real test calls complete with correct
  states and stored provider IDs.
- Duplicate webhooks never create duplicate records.
- Opt-out phrase test ends the call and suppresses the lead within seconds.
- No call is made outside the calling window or to a blocked lead.

Report back, then STOP.
```

### Phase 4: Qualification, Call QA, CRM sync, dashboard

```
PHASE 4: Qualification + QA + CRM + Dashboard. Only this phase, then STOP.

Tasks:
1. Qualification: apply the campaign's criteria to each transcript. Store
   answers, evidence quotes, score, category (qualified/unqualified/unknown)
   and a plain-language reason. Missing answers stay "unknown", never guessed.
2. Call QA record per call: summary, sentiment, intent, objections tagged,
   next action, and "where the deal was lost" note. Reviewer screen to read
   transcript, correct the outcome, and tag coaching feedback (feedback goes
   into a list for the next Sales Brain update).
3. CRM sync via CRMProvider: implement Google Sheets first. After each
   completed call, create or update the lead row (status, summary, objections,
   score, next step, meeting time). Log every sync in crm_sync_log; retry on
   failure; surface failures in the UI, never drop silently.
4. Dashboard (mobile-first): calls attempted/answered/completed/failed,
   conversation rate, average duration, qualified vs unqualified with
   reasons, meetings booked, follow-ups due, opt-outs, top objections,
   usage and cost per qualified lead, campaign comparison, date filter.

Acceptance:
- Every completed call has a status, summary and score with reasons.
- Sheets row exists for each synced call; a forced failure shows up as a
  flagged, retryable item.
- Dashboard numbers match the database (add a test).

Report back, then STOP.
```

### Phase 5: Booking, follow-ups, WhatsApp and human handoff

```
PHASE 5: Booking + Follow-ups + WhatsApp + Handoff. Only this phase, then STOP.

Tasks:
1. Calendar booking via CalendarProvider (Google Calendar first): fetch real
   availability, offer only real slots, confirm attendee, date, time zone,
   duration and meeting type with the prospect, create the event, and
   announce confirmation ONLY after the provider confirms. On failure, tell
   the prospect honestly and create a human follow-up task.
2. Follow-ups: store callback time, time zone, reason and prior context;
   scheduler triggers the call at the right time (through canContact); user
   can edit or cancel.
3. WhatsApp follow-up via MessagingProvider: approved templates only, opted-in
   contacts only, log delivery status, stop sequence on reply or opt-out.
   Include a template manager (name, language, body, approval status).
4. Human handoff: triggers on hot lead (buying intent, pricing/contract
   request), direct request for a human, low confidence, or escalation rules.
   Order of attempts: live transfer, then WhatsApp alert with lead summary to
   the owner, then callback task. Record which path was used and the
   response time.
5. Idempotency: retries must never create duplicate meetings or duplicate
   messages.

Acceptance:
- Booking confirmation text never appears unless the calendar returned success.
- Handoff tests pass for: hot lead, direct human request, unsupported question.
- WhatsApp never sends to a lead without opt-in or after opt-out.
- Duplicate webhook or retry does not create a second meeting or message.

Report back, then STOP.
```

### Phase 6: Hardening and pilot readiness

```
PHASE 6: Pilot readiness. Only this phase, then STOP.

Tasks:
1. Release gate: a checklist screen that must be fully green before a live
   campaign (compliance settings, DND adapter live, opt-out test passed,
   disclosure line set, calling window set, templates approved).
2. End-to-end test script that runs the whole journey with fake adapters:
   onboarding, import, launch, call, qualify, book, follow-up, WhatsApp,
   handoff, CRM sync, dashboard.
3. Seed/demo mode with sample leads so I can demo on a phone without real calls.
4. Error and audit logging for launches, stops, Sales Brain activation,
   failures. Basic admin view of failed jobs and retry button.
5. Cost report: cost per call, per connected minute, per qualified lead, per
   booked meeting for the last N calls (to decide pricing).
6. Security pass: secrets, row-level security per workspace, access to
   recordings, input validation.
7. Short user guide (how to onboard a client in under 30 minutes) and a
   runbook (what to do when calls fail, provider is down, or a prospect
   complains).

Acceptance:
- Full end-to-end test passes.
- Release gate blocks launch when any item is missing.
- I can run a demo for a prospect from my phone.

Report back with a list of known gaps and a recommended pilot plan, then STOP.
```

---

## Part 3: Paid MVP phases (DO NOT START until I say so)

| Phase | Scope |
|---|---|
| 7 | Multi-tenant roles (owner/admin/member), Sales Brain version history and rollback, audit log UI |
| 8 | Usage ledger, plan allowance, overage calculation, usage alerts, invoices, reconciliation with provider |
| 9 | Email follow-up and sequences (unsubscribe, pause on reply) |
| 10 | Telugu and extra languages after provider testing; Zoho and HubSpot CRM adapters |
| 11 | Advanced analytics and ROI reporting; weekly owner report on WhatsApp; data export/delete and retention controls |

---

## Part 4: Quick commands

- **Start:** paste Part 1, attach PRD v2.1, then "Begin with your understanding and questions."
- **After each phase:** review the report, test on your phone, then send: `Phase N approved. Fix these issues first: [list]. Then wait.`
- **If Antigravity runs ahead:** `Stop. You started work outside the current phase. Revert to the end of Phase N and wait for my approval.`
- **If it makes something up:** `Rule 5 violated: do not report success without provider confirmation. Fix and add a test.`
