# Client Onboarding Guide: Desynthic AI Sales Employee (PRD v2.1)

**Target SLA:** Complete client setup and activate Sales Brain in under 30 minutes.

---

### Step 1: Workspace & Business Discovery (Minutes 0 – 12)
1. **Navigate to `/discovery`** on desktop or mobile.
2. Complete the 5-step guided wizard:
   - **Step 1: Identity & Offer:** Enter company name, website, product description, and core differentiators.
   - **Step 2: ICP & Disqualifiers:** Define target industries, company size, and negative disqualifiers (e.g. B2C retail).
   - **Step 3: Sales Process & Pricing:** Select primary call goal, meeting length (e.g. 20-min Google Meet), approved pricing, and note whether pricing is strictly non-negotiable.
   - **Step 4: Objections & Claims:** Enter top 3 objections and approved responses. Specify prohibited claims the agent must never make.
   - **Step 5: Voice & Disclosure:** Set agent persona name ("Priya"), tone (conversational/professional), target languages (English, Hindi, Hinglish), and mandatory AI disclosure line.
3. Click **Compile Sales Brain**.

---

### Step 2: Verification & Test Deck (Minutes 12 – 18)
1. In the **Test & Preview** tab, run the 11 built-in scenarios:
   - Verify pricing defense (ensures agent does not offer unauthorized discounts).
   - Verify top objection handling.
   - **Crucial Acceptance Rule:** Check the **Unknown Question** scenario. Verify that the agent responds with honest uncertainty and offers specialist follow-up, never fabricating answers.
2. If satisfied, click **Approve & Activate Sales Brain (v1)**.

---

### Step 3: Lead List Upload & Safety Verification (Minutes 18 – 24)
1. Navigate to `/campaigns`.
2. Upload the prospect CSV file:
   - The ingestion pipeline automatically cleans and normalizes Indian numbers to E.164 (`+91XXXXXXXXXX`).
   - In-batch duplicates and database duplicates are automatically flagged.
   - Review and download the error report for invalid rows.
3. Confirm the calling window is set to **10:00 – 18:00 IST** with **Sunday shutdown** checked.

---

### Step 4: Pre-Flight Release Gate & Launch (Minutes 24 – 30)
1. Navigate to `/pilot-readiness`.
2. Check the **Pre-Flight Release Gate** checklist:
   - Ensure all 6 items are green (AI disclosure, approved calling hours, DND scrub active, multilingual opt-out verified, qualification rules set, approved WhatsApp templates).
3. Switch campaign state from `DRAFT` to `SCHEDULED` or `ACTIVE`.
4. Monitor live dialing in the **Founder Dashboard** (`/dashboard`).
