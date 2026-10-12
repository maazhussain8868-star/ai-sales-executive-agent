# AI Sales Employee: Antigravity Build Brief
Voice-first, business-trained AI sales employee. Owner: Faraz (Desynthic). Version 1.1 (adds missing PRD items and the WhatsApp and Email channels)

## READ THIS FIRST (rules for the coding agent)
1. Work on ONE phase at a time. Start with Phase 0.
2. When a phase is finished, STOP. Do not start the next phase. Post the Phase Report (template at the end) and wait.
3. Only continue when the user writes exactly: **APPROVED: Phase N complete. Start Phase N+1.**
4. Stay inside the current phase. Anything outside its scope goes into BACKLOG.md, not into code.
5. Keep it simple: small files, clear names, short comments. No over-engineering, no extra features.
6. Never hardcode secrets. Use .env and keep an up-to-date .env.example.
7. Before saying a phase is done: run the tests, tick every Definition of Done item, and update PROGRESS.md.
8. If something is unclear, state your assumption in one line and continue. Ask a question only when truly blocked.
9. Do not build telephony, speech-to-text, text-to-speech, WhatsApp or email delivery yourself. Every channel is an external provider (voice: OmniDimension agent "Priya"; WhatsApp: Meta Cloud API; email: one transactional email provider). Build only adapters.
10. Safety in development: real calls, WhatsApp messages and emails may go ONLY to numbers and addresses on an allow-list in the settings. Every call must start with an AI disclosure line. Never contact a lead on a channel without recorded consent for that channel (see Phase 5).

## Product in one paragraph
A founder describes their business in a guided interview. The system compiles it into a "Sales Brain" (a set of instruction files plus one phone-ready prompt). That prompt configures a voice agent at an external provider. The agent calls prospects, handles objections, qualifies and books meetings. After each call the system analyses the transcript (intent, objections, lead score, next action) and shows everything on a dashboard. Core idea: sell outcomes (qualified meetings), not minutes. Design decision: the live conversation during a call is run by the voice provider's own model using the compiled prompt. The Model Router is used for compiling the brain, analysing calls, scoring quality and drafting WhatsApp and email messages.

## Suggested stack (change only with a strong reason)
- Next.js (App Router) + TypeScript + Tailwind
- Supabase (Postgres, Auth, Row Level Security)
- OpenAI and Anthropic SDKs behind one thin Model Router (a single function: task + input -> output, provider chosen by config)
- Vercel for hosting; existing n8n stays for WhatsApp and Google Sheets automations (called through webhooks)

## Core data model (create tables only when the phase needs them)
workspaces, businesses, brain_files (versioned), agents, leads, channel_consents, campaigns, conversations, messages (calls, WhatsApp and email in one timeline), call_analysis, follow_ups, sequences, sequence_steps, appointments, audit_logs.

---

## PHASE 0: Project setup
Goal: a clean, running skeleton.
Build:
- Repo structure, linting, env handling, .env.example
- Supabase project connection, migrations folder, one admin login (email + password)
- Pages: /login and an empty /dashboard
- PROGRESS.md and BACKLOG.md
Out of scope: everything else.
Definition of Done:
- [ ] App runs locally with one command
- [ ] Admin can log in and log out
- [ ] Migrations run on a fresh database
- [ ] README explains setup in under 10 lines

## PHASE 1: Sales Brain Builder (the core value)
Goal: turn an interview into a ready-to-use sales brain and voice prompt.
Build:
- Guided interview UI (one section per screen, autosave): company; products and pricing; ideal customer and buyer pain; sales process; objections (objection + preferred response); qualification criteria; escalation rules; compliance (DND, calling hours, AI disclosure); brand voice; case studies and proof points
- "Compile" action: the Model Router generates these 12 files from the answers, in a fixed schema: 01_company, 02_products, 03_icp, 04_buyer_personas, 05_sales_methodology, 06_objections, 07_case_studies, 08_pricing, 09_conversation_rules, 10_compliance, 11_qualification, 12_followup
- Each file is viewable and editable, with version history
- Export 1: zip of the 12 markdown files
- Export 2: one "Voice Agent Prompt" written for phone calls (short sentences, one question at a time, never invent facts, escalate when unsure, AI disclosure in the opening)
- Export 3: 10 sample objections with the expected response style, to test the agent by hand
- AI Employee configuration: name, role, industry, personality, sales style (for example consultative), goal (for example book qualified meetings). This is saved with the agent and written into the prompt
- Optional source material: paste or upload text of existing scripts, case studies, FAQs and call transcripts. The compile step uses them to improve 05_sales_methodology, 06_objections and 07_case_studies
- The Voice Agent Prompt must include a short conversation flow: intro, attention, discovery, pain, qualification, value, objection handling, check, call to action, meeting. The agent may move backward or forward; it is guidance, not a rigid script
- Seed data: one demo business (Desynthic selling AI automation)
Out of scope: calls, providers, dashboard, multiple users.
Definition of Done:
- [ ] A founder can finish the interview in under 15 minutes
- [ ] Compile produces all 12 files without schema errors
- [ ] Voice Agent Prompt export works and stays under a configurable length
- [ ] Tests cover the schema and the compile function (mock the LLM)
- [ ] AI Employee name, role, style and goal appear in the exported prompt
- [ ] Demo business loads and compiles end to end

## PHASE 2: Voice provider connection
Goal: push the brain to a voice agent and receive call results.
Build:
- A VoiceProvider interface: updateAgentPrompt, dispatchCall, parseWebhook
- OmniDimension adapter. Verify the current API docs first. Known from the docs: dispatching a call uses agent_id, to_number, optional from_number_id and a call_context object; the post-call webhook carries call_id and a call_report (summary, extracted_variables, interactions)
- "Update agent" button that sends the compiled prompt to the provider
- "Test call" button, allowed ONLY for allow-listed numbers
- Webhook endpoint that stores raw payload plus parsed call (transcript, summary, extracted variables)
- Compliance gate before any call: allow-list in dev, DND flag, calling hours, AI disclosure line present in the prompt
Out of scope: campaigns, lead scoring, scheduling.
Definition of Done:
- [ ] Clicking "Update agent" changes the prompt at the provider
- [ ] A test call to an allow-listed number connects
- [ ] The webhook stores the call and shows it on a basic Calls page
- [ ] A call to a non-allowed number is blocked with a clear message
- [ ] Provider code is isolated so another provider can be added later

## PHASE 3: Post-call intelligence
Goal: understand every call.
Build:
- After each call, analyse the transcript with the Model Router and store: intent (positive, negative, neutral, curious, high intent), objections raised by type (price, timing, trust, authority, competitor, no need, budget), buying signals (price, demo, implementation, results, timeline, contract), conversation signals (busy, interested, skeptical, confused, frustrated), qualification against the business's own criteria, lead score 0 to 100 with short reasons, next action, one-paragraph summary
- Human-handoff flag when: the prospect asks for a human, high-value opportunity, complex negotiation, sensitive issue, low AI confidence, question outside approved knowledge, or custom pricing needing approval
- Contextual follow-up: if the prospect says things like "call me next Tuesday", store a follow-up with date, reason and the previous conversation context so the next call resumes naturally
- Call quality score 0 to 100 against a rubric (opening, discovery, objection handling, call to action, compliance) with one-line coaching notes
- Prospect memory per lead: name, company, role, pain, past objections, promises, last contact, next follow-up. Pass this as call_context on the next call
- Guardrails: use only approved business knowledge, flag low confidence
- 10 fixture transcripts with expected outputs, and an evaluation script
Out of scope: campaigns, dashboard charts, CRM integrations.
Definition of Done:
- [ ] Every stored call has an analysis record within one minute
- [ ] A "call me next Tuesday" fixture creates a correct follow-up with context
- [ ] Handoff flag fires on the handoff fixtures and not on normal calls
- [ ] Evaluation script runs on the 10 fixtures and reports agreement
- [ ] Prospect memory updates after each call and appears in the next call_context
- [ ] Analysis failures are retried and logged, never silently dropped

## PHASE 4: Leads, campaigns and scheduling
Goal: run outbound calling at small scale, safely.
Build:
- CSV lead import with phone cleanup (+91 format), duplicate removal and DND status
- Lead lifecycle: NEW, READY, CALLED, CONNECTED, CONVERSATION, QUALIFIED or UNQUALIFIED, FOLLOW-UP, MEETING BOOKED
- Campaign: name, lead list, AI employee, call window, max attempts, retry gap, daily cap
- Scheduler (cron) that respects calling hours (IST), Sundays off, DND, retry gap and the daily cap. It marks stuck "queued" leads back to ready after a timeout
- Appointment booking: check availability, suggest times, confirm, create the calendar event (Google Calendar via OAuth), update the lead and send a confirmation. A webhook to n8n lets the existing WhatsApp confirmation and reminder flow run until Phase 5 replaces it. If calendar integration takes more than a day, stop and ask before continuing
Out of scope: WhatsApp and email sequences (Phase 5), dashboard charts, multi-client login, billing.
Definition of Done:
- [ ] A 20-lead test campaign runs with the caps respected
- [ ] No call is placed outside calling hours or to a DND lead
- [ ] A booked meeting creates an appointment and triggers the n8n webhook
- [ ] Pausing a campaign stops new calls within one scheduler cycle

## PHASE 5: More channels (WhatsApp and Email) and sequences
Goal: reach and follow up with the same lead on calls, WhatsApp and email, using one Sales Brain, safely.
Build:
- A Channel interface (send, parse inbound webhook, status updates) with three adapters: Voice (from Phase 2), WhatsApp (Meta Cloud API), Email (one provider such as Resend, Postmark or SendGrid)
- One timeline per lead: every call, WhatsApp message and email in the same conversation view
- Consent per lead and per channel: store source, timestamp and proof. Hard block any send without consent for that channel
- WhatsApp rules: business-initiated messages only to opted-in leads and only through approved templates; free text only inside the 24-hour window after the lead's last message; template manager with approval status
- Email rules: sending domain with SPF, DKIM and DMARC, unsubscribe link in every email, suppression list, sender identity and postal address in the footer
- Global stop: if a lead writes STOP, unsubscribe or "do not contact" on any channel, all channels stop and the lead is marked do-not-contact
- Sequences: steps of wait + channel + message (template or AI-drafted from the Sales Brain). Example: call, then after 2 hours WhatsApp if no answer and opted in, then email on day 2, then call on day 3. A sequence stops automatically when the lead replies, books a meeting, or says not interested
- Inbound replies: webhook stores the reply, the Model Router drafts an answer from the Sales Brain. Mode setting per campaign: "draft for human approval" (default) or "auto-reply". Handoff rules from Phase 3 apply
- Replace the Phase 4 n8n confirmation and reminder flow with in-app WhatsApp and email confirmations and reminders (keep the n8n webhook as an option)
Out of scope: LinkedIn or Instagram automation, SMS, bulk cold blasts, new analytics charts.
Definition of Done:
- [ ] A lead without WhatsApp consent never receives a WhatsApp message (tested)
- [ ] An email without an unsubscribe link cannot be sent
- [ ] STOP on WhatsApp or an unsubscribe on email halts all channels for that lead
- [ ] A 3-step sequence (call, WhatsApp, email) runs on 5 allow-listed test leads
- [ ] An inbound reply creates an AI draft and waits for approval in default mode
- [ ] The lead timeline shows calls, WhatsApp and email in order

## PHASE 6: Founder dashboard and multi-client
Goal: show results and let more than one client use the product.
Build:
- Dashboard: calls made, answered, conversations, qualified leads, meetings booked, conversion rate, average call duration, cost per qualified lead, revenue attributed (manual entry), revenue per AI employee
- Channel metrics: WhatsApp and email sent, delivered, replied, unsubscribed, and conversion per channel
- Secondary metrics: call answer rate, objection resolution rate, follow-up completion rate, human-handoff rate, AI error rate, average call quality score
- Call detail page: transcript, summary, score, objections, next action
- Workspaces with Row Level Security, roles (admin, client), client login
- Usage metering in minutes with a per-plan call cap
- Audit log, encrypted storage of provider API keys, PII protection and data retention settings per workspace (auto-delete recordings and transcripts after N days)
Out of scope: billing and payments, self-serve signup.
Definition of Done:
- [ ] Client A can never see Client B's data (tested)
- [ ] Dashboard numbers match the raw calls table on a test set
- [ ] A workspace reaching its cap stops calling
- [ ] Provider keys are stored encrypted, never shown in the UI

## PHASE 7: Later (do NOT start unless explicitly asked)
Hindi, Telugu and Tamil support; A/B testing of prompts; sales coaching reports; methodology engine that learns from recorded calls; CRM integrations; SMS; inbound calling; human plus AI sales teams; AI sales manager and campaign auto-optimisation; payments and billing. LinkedIn and Instagram DM automation is not recommended because platform rules put accounts at risk.

---

## Phase Report template (post this at the end of every phase, then stop)
1. What was built (5 bullets max)
2. How to run and test it (exact commands)
3. Definition of Done checklist with pass or fail
4. Known issues and assumptions
5. Items added to BACKLOG.md
6. Ask: "Reply 'APPROVED: Phase N complete. Start Phase N+1.' to continue."

## Kickoff message to paste into Antigravity
```
Read BUILD_BRIEF.md completely. Follow the rules in "READ THIS FIRST".
Start ONLY with Phase 0. When Phase 0 is done, stop and post the Phase Report.
Do not begin Phase 1 until I reply exactly: APPROVED: Phase 0 complete. Start Phase 1.
```
