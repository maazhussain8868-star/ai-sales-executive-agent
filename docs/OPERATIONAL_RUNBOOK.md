# Operational Runbook: Incident Response & Troubleshooting

**PRD v2.1 Pilot Build | Desynthic AI Sales Employee**

---

## 1. Outbound Call Failures & Telephony Gateway Errors

### Symptoms
- Campaign worker logs multiple `FAILED` states with reason `Provider dispatch failed` or `429 Rate Limit`.
- Calls stay in `QUEUED` without progressing to `INITIATED`.

### Immediate Actions
1. **Check Campaign State:**
   - Verify campaign is not accidentally in `PAUSED` or `STOPPED` state in `/campaigns`.
2. **Check Current Time vs Permitted Hours:**
   - Outbound dialing is strictly blocked before 10:00 AM IST, after 18:00 PM IST, and all day on Sundays.
   - Any attempt to dial during these times is automatically rejected by `canContact` with a logged audit entry.
3. **Inspect Failed Jobs Queue:**
   - Open `/pilot-readiness` -> **Unit Economics & Audit** -> **Failed Background Jobs Queue**.
   - Review the failure reason.
   - If the issue was temporary network rate limiting, click **Retry Job** to re-queue the dispatch.
4. **Carrier Provider Health Check:**
   - Check OmniDimension / telephony provider status dashboard.
   - If telephony provider has an outage, pause campaigns immediately to preserve lead retry counts.

---

## 2. Voice or LLM Provider Outage

### Symptoms
- Agent latency spikes above 2000ms.
- Audio synthesis stalls or call disconnects mid-sentence.

### Immediate Actions
1. **Pause All Active Campaigns:**
   - In `/campaigns`, click **Pause Campaign**. In-progress calls will complete, and no new leads will be dialed.
2. **Review Model Router Configuration:**
   - Verify `src/lib/model-router/router.ts` task routing.
   - Switch primary model endpoint to secondary fallback model in environment variables (`OPENAI_API_KEY` / `ANTHROPIC_API_KEY`).
3. **Notify Workspace Admins:**
   - Check `/pilot-readiness` audit logs for exact error payloads.

---

## 3. Prospect Grievance / DND Complaint Handling

### Immediate Actions
1. **Instant Permanent Number Suppression:**
   - Ensure the number is immediately on the global suppression list:
     - The in-call opt-out engine automatically suppresses numbers upon verbal refusal.
     - To manually suppress, add the number via `/campaigns` -> **Suppression List Manager**.
2. **Cancel All Scheduled Touchpoints:**
   - Open `/calls` and `/dashboard` to ensure any queued follow-up callbacks or WhatsApp drip sequences are cancelled.
   - `canContact` ensures zero outbound calls or messages can reach this number across any channel.
3. **Audit Trail Verification:**
   - Locate the call record in `/calls` or check the `audit_log` table.
   - Confirm the opt-out timestamp and reason.
   - Provide the exact audit log reference in case of regulatory or TRAI DLT inquiries.
