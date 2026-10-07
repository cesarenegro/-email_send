# IMPLEMENTATION PLAN: ARKITECNA MAILER (V1)

**Document Type:** Formal Implementation Plan / Engineering Blueprint  
**Created:** 2026-10-07 14:59 +08:00  
**Last modified:** 2026-10-07 14:59 +08:00  
**Agent:** Antigravity  
**Repository:** [cesarenegro/-email_send](https://github.com/cesarenegro/-email_send)  
**Primary Specification:** [ARKITECNA_MAILER_AG_BUILD_INSTRUCTIONS.md](file:///e:/Projects/@EMAIL%20BULK/ARKITECNA_MAILER_AG_BUILD_INSTRUCTIONS.md)  
**Operating Rules:** [E:\#ANTIGRAVITY_GLOBAL_RULES.md](file:///E:/%23ANTIGRAVITY_GLOBAL_RULES.md) (mirrored in [.agents/rules/ANTIGRAVITY_GLOBAL_RULES.md](file:///e:/Projects/@EMAIL%20BULK/.agents/rules/ANTIGRAVITY_GLOBAL_RULES.md) and [AGENTS.md](file:///e:/Projects/@EMAIL%20BULK/AGENTS.md))  
**Operational Inventory:** [SETTINGS.TXT](file:///e:/Projects/@EMAIL%20BULK/SETTINGS.TXT)

---

## 1. Executive Summary & Objective

Build a lean, robust, internal single-tenant web application for **ARKITECNA** to send staggered outbound email campaigns from a single Hostinger SMTP mailbox.

### Core Workflow
$$\text{CSV Lead Import} \longrightarrow \text{HTML Template Paste} \longrightarrow \text{Company Personalization} \longrightarrow \text{Staggered SMTP Dispatch}$$

### Operating Constraints (Strict Scope Lock)
- **Zero Scope Creep:** No CRM features, no lead scoring, no AI copywriting, no follow-up sequences, no warm-up, no open/click tracking pixels or redirect domains.
- **Safety First:** Strict limit of **1 email per cron execution globally** (no mass bursts, no concurrent race conditions).
- **Idempotency & Concurrency Control:** Atomic PostgreSQL lead acquisition using `FOR UPDATE SKIP LOCKED`.
- **Security:** Credentials stored exclusively in environment variables and [PASSWORD.TXT](file:///e:/Projects/@EMAIL%20BULK/PASSWORD.TXT) (git-ignored). Never commit or expose passwords or service role keys.

---

## 2. Verified Current State

1. **Workspace Root:** `e:\Projects\@EMAIL BULK`
2. **Git Repository:** Initialized with remote `origin https://github.com/cesarenegro/-email_send`.
3. **Ignored Files:** `.gitignore` configured; [PASSWORD.TXT](file:///e:/Projects/@EMAIL%20BULK/PASSWORD.TXT) verified ignored by git.
4. **Rules Configuration:**
   - Workspace rules: [.agents/rules/ANTIGRAVITY_GLOBAL_RULES.md](file:///e:/Projects/@EMAIL%20BULK/.agents/rules/ANTIGRAVITY_GLOBAL_RULES.md)
   - Root rules: [AGENTS.md](file:///e:/Projects/@EMAIL%20BULK/AGENTS.md)
   - Global IDE rules: `C:\Users\user\.gemini\config\rules\ANTIGRAVITY_GLOBAL_RULES.md`
5. **Operational Inventory:** [SETTINGS.TXT](file:///e:/Projects/@EMAIL%20BULK/SETTINGS.TXT) created in workspace root.

---

## 3. Technology Stack & Architecture

| Component | Technology | Version / Details | Purpose |
|---|---|---|---|
| **Framework** | Next.js | App Router (latest stable) | Fullstack application & server actions / API routes |
| **Language** | TypeScript | Strict mode | Type safety across schemas and operations |
| **Styling** | Tailwind CSS | Neutral palette (`#F7F5F0`, `#FFFFFF`, `#1A1A1E`, `#D8D2C8`) | Clean, non-distracting internal UI |
| **Database** | Supabase (PostgreSQL) | Managed Cloud | Relational persistence & atomic stored procedures |
| **Auth** | Supabase Auth | Email / Password | Private internal single/few-user access control |
| **Email Client** | Nodemailer | Standard SMTP | Connection to Hostinger SMTP (`smtp.hostinger.com:465`) |
| **CSV Parser** | PapaParse | Client/Server | Robust handling of comma, semicolon, BOM, and UTF-8 |
| **Validation** | Zod | Server & Client | Strict schema validation for inputs and campaign state |
| **Date / Timezone** | Luxon | IANA timezone support | Timezone-aware window (09:00–18:00 Europe/Rome) and weekday scheduling |
| **Scheduler** | Vercel Cron | `* * * * *` | Minute-by-minute invocation of `/api/cron/send` protected by `CRON_SECRET` |

---

## 4. Database Schema & RPC Specifications

### 4.1 Tables
- `campaigns`: Core campaign configuration, scheduling windows, intervals, and template strings.
- `campaign_leads`: Recipients with company name, email, status (`pending`, `sending`, `sent`, `retry`, `failed`), attempts counter, and error logs.
- `email_logs`: Append-only audit trail for every send or error event.

### 4.2 Constraints & Indexes
- Unique constraint: `UNIQUE (campaign_id, email)` on `campaign_leads` to guarantee zero cross-lead duplicates within a campaign.
- Lead lookup index: `(campaign_id, status)` on `campaign_leads`.
- Retry index: `(retry_at) WHERE status = 'retry'` on `campaign_leads`.
- Log index: `(campaign_id, created_at)` on `email_logs`.

### 4.3 Atomic Lead Claim RPC (`claim_next_campaign_lead`)
Uses PostgreSQL `FOR UPDATE SKIP LOCKED` inside a PL/pgSQL function to isolate and atomically transition candidate leads into `sending` state without lock contention or duplicate dispatches.

---

## 5. Scheduler Execution Algorithm (`/api/cron/send`)

Every minute, Vercel Cron calls `/api/cron/send`:
1. **Verify Security Header:** Check `Authorization: Bearer ${CRON_SECRET}`.
2. **Find Eligible Campaign:** Oldest `next_send_at <= now()` with `status = 'active'`, `LIMIT 1`.
3. **Evaluate Timezone Window (Luxon):** Respect Monday–Friday and 09:00–18:00 (Europe/Rome).
4. **Evaluate Daily Limit:** Respect `daily_limit` (default 80) per campaign.
5. **Atomically Claim 1 Lead:** Via `claim_next_campaign_lead(p_campaign_id)`.
6. **Render & Send:** Replace placeholders (`{{companyName}}`, `{{azienda}}`, `{{email}}`) and send via Nodemailer.
7. **Handle Result:** Record status (`sent` or `retry`/`failed`) and log to `email_logs`.
8. **Reschedule Campaign:** Compute next slot from current time + `send_interval_seconds` (normalized to sending window).

---

## 6. Implementation Phases (12 Steps)

- **Phase 1: Project Bootstrap** — Next.js, TypeScript, Tailwind CSS, Supabase client setup, `.env.example`.
- **Phase 2: Database & SQL Migrations** — Tables, triggers, indexes, and atomic RPC.
- **Phase 3: Supabase Authentication** — Email/password login, middleware session guards, logout.
- **Phase 4: Campaign CRUD & Dashboard** — Summary list, creation form, detail view with live status counts.
- **Phase 5: CSV Import & Mapping Engine** — PapaParse integration, header mapping, duplicate filtering.
- **Phase 6: Template Renderer & Iframe Preview** — HTML/Subject replacement with sandboxed iframe preview.
- **Phase 7: SMTP Client & Settings Tester** — Hostinger SMTP config, connection tester, test email sender.
- **Phase 8: Timezone & Scheduler Math** — Luxon calendar calculations, weekday restrictions, window checks.
- **Phase 9: Vercel Cron Endpoint** — `/api/cron/send` route with bearer auth and single-send queue handling.
- **Phase 10: Campaign Control State Machine** — Start, Pause, Resume, and Auto-Completion transitions.
- **Phase 11: Real QA with Test Leads** — Verification on 3–5 internal test addresses.
- **Phase 12: Production Verification & README** — Comprehensive documentation and deployment checklist.
