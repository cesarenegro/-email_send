# ARKITECNA MAILER
## Full Build Instructions for AG

**Document type:** implementation brief / coding-agent handoff  
**Target:** AG (coding agent)  
**Project:** internal ARKITECNA outbound email sender  
**Version:** V1  
**Priority:** simplicity, reliability, no overengineering

---

# 1. Objective

Build a very simple internal web application for ARKITECNA to send outbound email campaigns from one SMTP mailbox.

The application is **not** a CRM and **not** a Lemlist/Instantly clone.

The only required workflow is:

1. Create a campaign.
2. Import leads from CSV.
3. Associate each lead's company name with its email address.
4. Paste an externally prepared HTML email.
5. Use placeholders such as `{{companyName}}` / `{{azienda}}` in subject or HTML.
6. Schedule staggered sending so emails are **not sent all at once**.
7. Start, pause and resume the campaign.
8. See basic progress: sent / pending / failed.

The user expects to operate approximately **4 campaigns**.

The application must remain deliberately small and easy to understand.

---

# 2. Scope Lock

## Build these features

- Campaign creation and management.
- CSV lead import.
- CSV column mapping.
- Lead validation and deduplication.
- Company name + email association.
- HTML email paste area.
- Subject template.
- Placeholder replacement.
- HTML preview.
- Scheduled staggered sending.
- Start / Pause / Resume.
- Basic dashboard.
- Basic delivery logs.
- SMTP sending through Hostinger.
- SMTP connection test.
- Minimal internal authentication.
- Vercel Cron scheduler.
- Supabase database.

## Explicitly DO NOT build in V1

Do **not** add any of the following unless requested later:

- CRM features.
- Lead scoring.
- AI features.
- AI copywriting.
- Lead enrichment.
- LinkedIn automation.
- WhatsApp integration.
- Follow-up sequences.
- Automatic reply detection.
- Inbox.
- Warm-up.
- Open tracking.
- Click tracking.
- Tracking pixel.
- Tracking redirect links.
- A/B testing.
- Email builder / drag-and-drop editor.
- Image editor.
- Attachments.
- Contact notes.
- Sales pipeline.
- Tasks.
- Calendar.
- Team permissions.
- Multiple SMTP mailboxes.
- Billing.
- Analytics dashboards beyond basic campaign totals.
- Webhooks to external services.
- Multi-tenant architecture.
- Complex queue services.
- Redis.
- RabbitMQ.
- Kafka.
- External queue SaaS.
- Background worker infrastructure unless Vercel Cron proves insufficient.

The application must solve one problem only:

> **CSV → HTML email → personalized company name → staggered SMTP sending.**

---

# 3. Recommended Stack

Use:

- **Next.js latest stable**
- **TypeScript**
- **App Router**
- **Tailwind CSS**
- **Supabase / PostgreSQL**
- **Supabase Auth**
- **Nodemailer**
- **PapaParse** for CSV parsing
- **Zod** for server-side validation
- **Luxon** for timezone-safe scheduling
- **Vercel** for deployment
- **Vercel Cron** for the scheduler

Do not add an ORM.

Use Supabase directly through `@supabase/supabase-js`.

---

# 4. Deployment Architecture

```text
Browser
   |
   v
Next.js / Vercel
   |
   +---- UI
   +---- API routes / server actions
   +---- Vercel Cron /api/cron/send
   |
   v
Supabase PostgreSQL
   |
   +---- campaigns
   +---- campaign_leads
   +---- email_logs

Next.js server
   |
   v
Nodemailer
   |
   v
Hostinger SMTP
   |
   v
Recipients
```

There is only **one SMTP sender account** in V1.

SMTP credentials must be stored in environment variables, **not in browser-accessible code and not in a database table**.

---

# 5. SMTP Configuration

Initial sender is Hostinger.

Use environment variables:

```env
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=cesare@arkitecna.com
SMTP_PASS=
SMTP_FROM_NAME=Stefano Martini | ARKITECNA
SMTP_FROM_EMAIL=cesare@arkitecna.com
```

Never commit the SMTP password.

The server must create the Nodemailer transporter approximately as follows:

```ts
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});
```

V1 assumes:

- SMTP host: `smtp.hostinger.com`
- port: `465`
- SSL/TLS: enabled

Do not implement SMTP autodiscovery.

---

# 6. Authentication

This is a private internal application.

Use **Supabase Auth** with a minimal email/password login.

Requirements:

- `/login` page.
- All application pages require authentication.
- No public registration screen.
- User account can be created manually in Supabase.
- No roles.
- No team management.
- No permissions matrix.
- One or a very small number of internal users only.

The cron endpoint must not use browser authentication.

Protect the cron endpoint separately using `CRON_SECRET`.

---

# 7. Main Screens

Only these screens are required.

```text
/login

/
Dashboard

/campaigns
Campaign list

/campaigns/new
Create campaign

/campaigns/[id]
Campaign detail / edit / control

/settings
SMTP status + SMTP test
```

No other primary navigation is required.

Navigation:

```text
ARKITECNA MAILER

Dashboard
Campaigns
Settings
Logout
```

---

# 8. Dashboard

The dashboard must be extremely simple.

Show one row/card per campaign.

Example:

| Campaign | Leads | Sent | Pending | Failed | Status |
|---|---:|---:|---:|---:|---|
| Mobili Italia | 542 | 86 | 454 | 2 | ACTIVE |
| Architetti Italia | 780 | 0 | 780 | 0 | PAUSED |
| Croazia | 310 | 0 | 310 | 0 | DRAFT |
| DACH | 1,120 | 0 | 1,120 | 0 | DRAFT |

For each campaign show:

- campaign name
- total leads
- sent
- pending
- failed
- status
- next scheduled send
- button `Open`

Do not create charts.

Do not create graphs.

---

# 9. Campaign Statuses

Allowed campaign states:

```text
draft
active
paused
completed
```

Rules:

### draft
Campaign is being prepared.

### active
Scheduler is allowed to send.

### paused
Scheduler must send nothing.

### completed
There are no remaining eligible leads.

Do not create additional states unless technically necessary.

---

# 10. Campaign Fields

Each campaign needs:

```text
id
name
subject_template
html_template
status
timezone
start_at
send_window_start
send_window_end
send_interval_seconds
daily_limit
next_send_at
created_at
updated_at
```

Recommended defaults:

```text
timezone: Europe/Rome
send_window_start: 09:00
send_window_end: 18:00
send_interval_seconds: 240
daily_limit: 80
status: draft
```

The UI must allow these values to be edited.

Minimum `send_interval_seconds` in the UI:

```text
60 seconds
```

Recommended default:

```text
240 seconds = 4 minutes
```

Do not send multiple emails simultaneously.

---

# 11. Campaign Creation Form

Fields:

### Campaign name

Example:

```text
Mobili Italia
```

### Subject

Example:

```text
Render per {{companyName}}
```

or:

```text
Render per {{azienda}}
```

### HTML email

Large textarea/code field.

The user prepares HTML externally and pastes it into the application.

Do **not** create a visual editor.

### Schedule

- Start date.
- Start time.
- Timezone.
- Sending window start.
- Sending window end.
- Delay between emails.
- Daily limit.

Example:

```text
Start: 08/10/2026 09:00
Timezone: Europe/Rome
Window: 09:00 → 18:00
Interval: 4 minutes
Daily limit: 80
```

---

# 12. Email HTML Handling

The HTML created externally must be preserved.

The application must:

1. Store the raw HTML.
2. Replace supported placeholders before sending.
3. Send the resulting HTML using Nodemailer.

Do not sanitize away legitimate email markup.

Do not rewrite CSS.

Do not optimize images.

Do not inject tracking pixels.

Do not rewrite links.

Do not convert links to tracking URLs.

Do not add external branding.

Do not automatically add ARKITECNA content.

The application is a sender, not an email designer.

---

# 13. Supported Placeholders

V1 must support:

```text
{{companyName}}
{{azienda}}
{{email}}
```

Both:

```text
{{companyName}}
```

and:

```text
{{azienda}}
```

must resolve to the same company-name field.

Example lead:

```json
{
  "company_name": "Rossi Arredi",
  "email": "info@rossiarredi.it"
}
```

Template:

```html
<p>Buongiorno {{companyName}},</p>
```

Output:

```html
<p>Buongiorno Rossi Arredi,</p>
```

Subject:

```text
Render per {{azienda}}
```

Output:

```text
Render per Rossi Arredi
```

Implement placeholder replacement through one small utility function.

Example:

```ts
export function renderTemplate(
  template: string,
  lead: {
    company_name: string;
    email: string;
  }
) {
  return template
    .replaceAll("{{companyName}}", lead.company_name ?? "")
    .replaceAll("{{azienda}}", lead.company_name ?? "")
    .replaceAll("{{email}}", lead.email ?? "");
}
```

No template engine is required.

---

# 14. HTML Preview

On campaign detail page provide:

```text
PREVIEW
```

The preview must use a real imported lead.

Default:

- first valid lead

The user must be able to select another lead if desired.

Preview must show:

- resolved subject
- resolved HTML

Use an iframe with `srcDoc`.

Recommended:

```html
<iframe sandbox="" />
```

The preview must not execute arbitrary scripts.

Email HTML is expected to be static HTML.

---

# 15. CSV Import

V1 accepts:

```text
.csv
```

Do not add XLSX import unless requested later.

CSV files may use:

- comma `,`
- semicolon `;`
- UTF-8
- UTF-8 with BOM

Use PapaParse.

---

# 16. CSV Mapping Workflow

After selecting a CSV:

### Step 1 — parse headers

Example CSV:

```csv
Nome Azienda,Email,Citta,Regione
Rossi Arredi,info@rossiarredi.it,Milano,Lombardia
Bianchi Casa,info@bianchicasa.it,Roma,Lazio
```

### Step 2 — ask which column represents

```text
Company name
Email
```

For example:

```text
Company name → Nome Azienda
Email        → Email
```

Other CSV columns are ignored in V1.

### Step 3 — preview first 10 rows

### Step 4 — import

---

# 17. Lead Validation

For each imported row:

1. trim company name
2. trim email
3. lowercase email
4. validate basic email syntax
5. reject empty email
6. reject duplicate email inside the same campaign

Company name may technically be empty, but the UI should flag it.

Email is mandatory.

Database unique constraint:

```sql
unique (campaign_id, email)
```

---

# 18. CSV Import Result

After import show:

```text
Rows read: 550
Imported: 542
Duplicates: 5
Invalid emails: 3
```

The user should be able to inspect invalid rows.

Do not block the whole import because some rows are invalid.

---

# 19. Campaign Lead List

Campaign detail page must show a basic table:

| Company | Email | Status | Sent at | Error |
|---|---|---|---|---|
| Rossi Arredi | info@rossi.it | sent | 09:04 | |
| Bianchi Casa | info@bianchi.it | pending | | |
| Casa Italia | xxx | failed | | Invalid address |

Statuses:

```text
pending
sending
sent
retry
failed
```

Do not create CRM statuses.

---

# 20. Database Schema

Use SQL migrations.

## `campaigns`

```sql
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  subject_template text not null default '',
  html_template text not null default '',

  status text not null default 'draft'
    check (status in ('draft', 'active', 'paused', 'completed')),

  timezone text not null default 'Europe/Rome',

  start_at timestamptz,
  send_window_start time not null default '09:00',
  send_window_end time not null default '18:00',

  send_interval_seconds integer not null default 240
    check (send_interval_seconds >= 60),

  daily_limit integer not null default 80
    check (daily_limit > 0),

  next_send_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

---

# 21. `campaign_leads`

```sql
create table public.campaign_leads (
  id uuid primary key default gen_random_uuid(),

  campaign_id uuid not null
    references public.campaigns(id)
    on delete cascade,

  company_name text,
  email text not null,

  status text not null default 'pending'
    check (status in ('pending', 'sending', 'sent', 'retry', 'failed')),

  attempts integer not null default 0,

  retry_at timestamptz,
  sent_at timestamptz,

  smtp_message_id text,
  last_error text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (campaign_id, email)
);
```

Indexes:

```sql
create index campaign_leads_campaign_status_idx
  on public.campaign_leads(campaign_id, status);

create index campaign_leads_retry_idx
  on public.campaign_leads(retry_at)
  where status = 'retry';
```

---

# 22. `email_logs`

```sql
create table public.email_logs (
  id uuid primary key default gen_random_uuid(),

  campaign_id uuid not null
    references public.campaigns(id)
    on delete cascade,

  campaign_lead_id uuid not null
    references public.campaign_leads(id)
    on delete cascade,

  event_type text not null
    check (event_type in ('sent', 'error')),

  smtp_message_id text,
  error_message text,

  created_at timestamptz not null default now()
);
```

Indexes:

```sql
create index email_logs_campaign_created_idx
  on public.email_logs(campaign_id, created_at);

create index email_logs_lead_idx
  on public.email_logs(campaign_lead_id);
```

---

# 23. Updated At Trigger

Create a generic updated-at trigger.

```sql
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
```

Apply to:

- `campaigns`
- `campaign_leads`

---

# 24. Atomic Lead Claiming

The scheduler must never send the same lead twice because two cron executions overlap.

Use a PostgreSQL function.

Example concept:

```sql
create or replace function public.claim_next_campaign_lead(
  p_campaign_id uuid
)
returns setof public.campaign_leads
language plpgsql
security definer
as $$
begin
  return query
  with candidate as (
    select id
    from public.campaign_leads
    where campaign_id = p_campaign_id
      and (
        status = 'pending'
        or (
          status = 'retry'
          and retry_at is not null
          and retry_at <= now()
        )
      )
    order by created_at asc
    for update skip locked
    limit 1
  )
  update public.campaign_leads cl
  set
    status = 'sending',
    attempts = attempts + 1,
    updated_at = now()
  from candidate
  where cl.id = candidate.id
  returning cl.*;
end;
$$;
```

AG should verify Supabase/PostgreSQL syntax and test this migration.

This atomic claim is mandatory.

Do not rely on:

```text
SELECT lead
then UPDATE lead
```

in separate unprotected requests.

---

# 25. Scheduler Design

Do not pre-create hundreds of individual scheduled jobs.

Do not use one cron per lead.

Use one global cron.

Vercel Cron calls:

```text
/api/cron/send
```

every minute.

Example `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/send",
      "schedule": "* * * * *"
    }
  ]
}
```

---

# 26. Global Sending Rule

To keep the application safe and simple:

> **Maximum one outbound email per cron execution globally.**

That means even if four campaigns are active, the app sends a maximum of one email on each scheduler tick.

This avoids bursts.

Campaign scheduling still determines which campaign is eligible.

If multiple campaigns are due, choose the campaign with the oldest `next_send_at`.

Query concept:

```text
status = active
next_send_at <= now
ORDER BY next_send_at ASC
LIMIT 1
```

---

# 27. Scheduler Execution Flow

Every cron execution:

```text
1. Validate CRON_SECRET
2. Find oldest active campaign due for sending
3. If none → return
4. Validate current local campaign time
5. Validate campaign daily limit
6. Atomically claim one lead
7. If no lead remains:
      campaign.status = completed
      campaign.next_send_at = null
      return
8. Render subject
9. Render HTML
10. Send through Nodemailer
11. On success:
      lead.status = sent
      lead.sent_at = now
      save SMTP message id
      write email_logs sent
12. On error:
      apply retry policy
      write email_logs error
13. Compute next valid send time
14. campaign.next_send_at = computed value
15. return
```

One cron execution must never send a batch of 50 messages.

---

# 28. Sending Window Logic

Campaigns have:

```text
timezone
send_window_start
send_window_end
```

Example:

```text
Europe/Rome
09:00
18:00
```

Use Luxon.

The scheduler must evaluate the time **in the campaign timezone**, not in UTC.

If current time is before opening:

```text
next_send_at = today at send_window_start
```

If current time is after closing:

```text
next_send_at = next allowed day at send_window_start
```

---

# 29. Allowed Days

V1 should send:

```text
Monday
Tuesday
Wednesday
Thursday
Friday
```

Do not send Saturday or Sunday.

This can be hardcoded in V1.

No UI for weekday configuration is required.

If calculated next send falls on Saturday/Sunday, move to Monday at `send_window_start`.

---

# 30. Daily Limit

Each campaign has:

```text
daily_limit
```

Default:

```text
80
```

To count today's sent emails, calculate the current calendar day in the campaign timezone.

Count successful `email_logs` where:

```text
campaign_id = campaign
event_type = sent
created_at falls inside local campaign day
```

If daily limit has been reached:

```text
next_send_at = next valid weekday at send_window_start
```

Do not send more.

---

# 31. Interval Between Emails

Campaign has:

```text
send_interval_seconds
```

Default:

```text
240
```

After every send attempt:

```text
next_send_at =
current time + send_interval_seconds
```

Then normalize that value to the allowed sending window.

Example:

```text
17:58 email sent
interval = 4 min

raw next time = 18:02
window closes 18:00

final next_send_at =
next weekday 09:00
```

---

# 32. Optional Randomization

V1 may include a small optional setting:

```text
Random delay: OFF / ON
```

If included, use:

```text
send_interval_seconds ± random range
```

Example:

```text
base 240 sec
random ± 60 sec

actual interval:
180–300 sec
```

However:

- this is optional
- do not delay implementation for it
- fixed interval is acceptable for first release

---

# 33. Start Campaign

Button:

```text
START
```

Before activation validate:

- campaign name exists
- subject is not empty
- HTML is not empty
- at least one valid lead exists
- SMTP configuration exists
- `send_interval_seconds >= 60`
- `daily_limit > 0`
- sending window is valid
- start date is valid

On start:

```text
status = active
next_send_at = first valid scheduled time
```

If requested start time is in the past:

use the next valid slot from current time.

---

# 34. Pause Campaign

Button:

```text
PAUSE
```

Action:

```text
status = paused
```

Cron ignores paused campaigns.

Do not modify lead statuses.

Do not delete anything.

---

# 35. Resume Campaign

Button:

```text
RESUME
```

Action:

```text
status = active
next_send_at = next valid slot from now
```

Do not attempt to reproduce old missed timestamps.

Do not send a backlog instantly.

Resume means:

> continue gradually from now.

---

# 36. Complete Campaign

If no eligible leads remain with:

```text
pending
retry
```

then:

```text
campaign.status = completed
campaign.next_send_at = null
```

A campaign can still contain:

```text
sent
failed
```

rows.

---

# 37. Retry Policy

SMTP failures can occur.

Use a small retry policy.

Maximum attempts:

```text
3
```

### First or second failure

Set:

```text
status = retry
retry_at = now + 15 minutes
last_error = error message
```

### Third failure

Set:

```text
status = failed
retry_at = null
last_error = error message
```

Campaign must continue to other leads.

A single bad email must not block the whole campaign.

---

# 38. Permanent Errors

If the error is clearly caused by invalid recipient syntax before SMTP:

```text
status = failed
```

immediately.

Do not retry malformed email addresses.

---

# 39. SMTP Send

Use:

```ts
await transporter.sendMail({
  from: `"${fromName}" <${fromEmail}>`,
  to: lead.email,
  subject: renderedSubject,
  html: renderedHtml,
});
```

Do not add:

- tracking pixel
- tracking domain
- click redirection
- extra HTML wrapper
- marketing footer generated by the app

Send exactly the user's HTML after placeholder substitution.

---

# 40. Plain Text Alternative

V1 does not require a manually edited plain-text version.

Optional:

derive a simple text version from HTML if convenient.

This is not a release blocker.

Do not spend significant time on HTML-to-text formatting.

---

# 41. SMTP Test Screen

`/settings`

Show:

```text
SMTP provider: Hostinger
SMTP host: smtp.hostinger.com
SMTP port: 465
Secure: Yes
Sender: cesare@arkitecna.com
Sender name: Stefano Martini | ARKITECNA
```

Never display the SMTP password.

Buttons:

```text
TEST SMTP CONNECTION
SEND TEST EMAIL
```

### Test SMTP connection

Use:

```ts
await transporter.verify();
```

Return:

```text
Connected successfully
```

or the actual safe error message.

### Send test email

Field:

```text
Test recipient
```

Send a simple test message.

This does not count as a campaign send.

---

# 42. API / Server Actions

Keep API small.

Suggested routes:

```text
POST   /api/campaigns
PATCH  /api/campaigns/:id
DELETE /api/campaigns/:id

POST   /api/campaigns/:id/import
POST   /api/campaigns/:id/start
POST   /api/campaigns/:id/pause
POST   /api/campaigns/:id/resume

GET    /api/campaigns/:id/leads

POST   /api/settings/test-smtp
POST   /api/settings/send-test

GET    /api/cron/send
```

Using Next.js server actions instead of some CRUD routes is acceptable.

The cron endpoint must remain a dedicated protected route.

---

# 43. Cron Security

Environment variable:

```env
CRON_SECRET=
```

Cron route must validate:

```text
Authorization: Bearer <CRON_SECRET>
```

Pseudo:

```ts
const authHeader = request.headers.get("authorization");

if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return new Response("Unauthorized", { status: 401 });
}
```

Do not expose `CRON_SECRET` to client components.

---

# 44. Supabase Environment Variables

Use:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only.

Never prefix it with:

```text
NEXT_PUBLIC_
```

---

# 45. Full `.env.example`

Create:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# SMTP
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=cesare@arkitecna.com
SMTP_PASS=
SMTP_FROM_NAME=Stefano Martini | ARKITECNA
SMTP_FROM_EMAIL=cesare@arkitecna.com

# Cron
CRON_SECRET=

# App
NEXT_PUBLIC_APP_NAME=ARKITECNA MAILER
```

No secrets in repository.

---

# 46. Suggested Project Structure

```text
arkitecna-mailer/
│
├─ app/
│  ├─ login/
│  │  └─ page.tsx
│  │
│  ├─ campaigns/
│  │  ├─ page.tsx
│  │  ├─ new/
│  │  │  └─ page.tsx
│  │  └─ [id]/
│  │     └─ page.tsx
│  │
│  ├─ settings/
│  │  └─ page.tsx
│  │
│  ├─ api/
│  │  ├─ cron/
│  │  │  └─ send/
│  │  │     └─ route.ts
│  │  ├─ settings/
│  │  │  ├─ test-smtp/
│  │  │  │  └─ route.ts
│  │  │  └─ send-test/
│  │  │     └─ route.ts
│  │  └─ campaigns/
│  │     └─ ...
│  │
│  ├─ layout.tsx
│  └─ page.tsx
│
├─ components/
│  ├─ CampaignTable.tsx
│  ├─ CampaignForm.tsx
│  ├─ CsvImporter.tsx
│  ├─ EmailPreview.tsx
│  ├─ LeadTable.tsx
│  ├─ StatusBadge.tsx
│  └─ Navbar.tsx
│
├─ lib/
│  ├─ supabase/
│  │  ├─ client.ts
│  │  ├─ server.ts
│  │  └─ admin.ts
│  │
│  ├─ email/
│  │  ├─ transporter.ts
│  │  ├─ render-template.ts
│  │  └─ send-email.ts
│  │
│  ├─ scheduling/
│  │  ├─ next-send-time.ts
│  │  └─ daily-limit.ts
│  │
│  ├─ csv/
│  │  ├─ parse.ts
│  │  └─ validate-lead.ts
│  │
│  └─ validations/
│     └─ campaign.ts
│
├─ supabase/
│  └─ migrations/
│     ├─ 001_campaigns.sql
│     ├─ 002_campaign_leads.sql
│     ├─ 003_email_logs.sql
│     └─ 004_claim_lead_rpc.sql
│
├─ examples/
│  ├─ leads-example.csv
│  └─ email-example.html
│
├─ public/
│
├─ .env.example
├─ vercel.json
├─ README.md
└─ package.json
```

Keep structure simple.

---

# 47. UI Style

The application is an internal utility.

Use a clean ARKITECNA-style neutral interface.

Recommended:

```text
Background: #F7F5F0
Cards: #FFFFFF
Primary text: #1A1A1E
Secondary text: #666666
Borders: #D8D2C8
```

No decorative animations.

No landing page.

No marketing design.

Desktop-first but usable on tablet/mobile.

---

# 48. Campaign Detail Layout

One page is enough.

Recommended sections:

```text
[Mobili Italia]                    [ACTIVE]

Stats
542 leads | 86 sent | 454 pending | 2 failed

Controls
[START] [PAUSE] [RESUME]

Schedule
Start
Window
Interval
Daily limit
Next send

Email
Subject
HTML
[PREVIEW]

Leads
[IMPORT CSV]

Lead table
```

Do not use complex nested navigation.

---

# 49. Disable Editing While Active

When a campaign is active, protect critical fields.

Recommended:

Disable editing of:

- subject
- HTML
- interval
- daily limit
- start time
- sending window

Require:

```text
PAUSE
```

before changing them.

This avoids changing a campaign while cron is using it.

CSV import should also be disabled while active.

---

# 50. Campaign Deletion

Allow campaign deletion only if:

```text
status != active
```

Deleting a campaign deletes:

- campaign leads
- email logs

because of foreign-key cascade.

Ask for confirmation.

---

# 51. CSV Re-import

If a CSV contains an email already present in the campaign:

skip it.

Do not update existing lead data automatically.

Report it as:

```text
duplicate
```

This makes behavior predictable.

---

# 52. Email Normalization

Before storing:

```ts
email = email.trim().toLowerCase();
company_name = company_name.trim();
```

Do not attempt complex email correction.

Do not guess missing domains.

Do not modify email addresses.

---

# 53. Basic Email Validation

Use a conservative validation function.

It only needs to catch obvious errors.

Example:

```text
missing @
spaces
missing domain
empty value
```

Do not claim to verify whether the mailbox exists.

V1 does not perform external email verification.

---

# 54. Error Handling

Every server operation must return a useful result.

Examples:

```text
CSV could not be parsed.
No email column was selected.
Campaign has no valid leads.
SMTP connection failed.
SMTP authentication failed.
Campaign is paused.
Daily limit reached.
No pending leads.
```

Do not expose:

- passwords
- service-role keys
- stack traces to the browser

Server logs may contain stack traces.

---

# 55. Logging

Application logs should include:

```text
campaign id
lead id
recipient email
action
result
timestamp
```

Never log:

```text
SMTP password
Supabase service role key
CRON_SECRET
```

Database `email_logs` stores only send outcome.

---

# 56. Email Sending Idempotency

Critical requirement:

A lead that is already:

```text
sent
```

must never be sent again.

The scheduler may only claim:

```text
pending
retry due now
```

Never claim:

```text
sending
sent
failed
```

If a cron process crashes after SMTP succeeds but before DB update, duplicate risk exists.

Mitigate by:

1. keeping scheduler concurrency low
2. using `sending` state
3. storing SMTP message ID immediately after success
4. atomic lead claiming
5. never resetting `sending` automatically during normal operation

A manual recovery utility can later reset stale `sending` records if required.

Do not overbuild distributed exactly-once delivery.

---

# 57. Stale Sending Recovery

Include a simple maintenance rule.

If a lead is:

```text
status = sending
updated_at older than 30 minutes
```

show it in the UI as:

```text
stuck
```

Optional internal action:

```text
RESET TO RETRY
```

This can be a small admin button.

If time is limited, this can be deferred after core MVP.

---

# 58. Sending Priority Across 4 Campaigns

If several campaigns are due:

```sql
order by next_send_at asc
limit 1
```

This creates natural fairness.

Example:

```text
09:00 Mobili ITA
09:01 Architetti ITA
09:02 Croatia
09:03 DACH
09:04 Mobili ITA
...
```

Actual eligibility is still controlled by each campaign's interval and daily cap.

No separate priority feature is required.

---

# 59. Completion Counters

For every campaign calculate:

```text
total =
count all campaign_leads

sent =
status = sent

pending =
status in (pending, retry, sending)

failed =
status = failed
```

Do not maintain redundant counters in the campaign table unless performance later requires it.

For current expected volumes, SQL counts are sufficient.

---

# 60. Expected Scale

V1 is intended for relatively small internal campaigns.

Expected order of magnitude:

```text
4 campaigns
hundreds to a few thousand leads per campaign
one SMTP account
tens of emails per hour
```

Do not optimize for millions of contacts.

---

# 61. Important Deliverability Rule

The software must not create bursts.

Default:

```text
1 email every 4 minutes
max 80/day per campaign
max 1 email globally per cron execution
```

The user can change interval and limit, but enforce:

```text
minimum interval = 60 sec
```

No "Send all now" button.

No mass-send endpoint.

---

# 62. HTML Size Warning

Do not block large HTML.

However, when saving a template, optionally show a warning if:

```text
HTML > 150 KB
```

or contains:

```text
data:image/
base64,
```

Example warning:

```text
This email contains embedded images and may be heavy for some email providers.
```

This is only a warning.

Do not alter the HTML.

This feature is optional and must not delay MVP.

---

# 63. No Automatic Unsubscribe System in V1

Do not build an unsubscribe web application in this release.

If the user wants unsubscribe wording, it can be part of the externally created HTML.

No automated suppression list is required in V1.

Do not add it without request.

---

# 64. No Open / Click Analytics

Do not measure:

```text
open rate
click rate
```

Do not use:

```text
tracking pixel
redirect tracker
custom tracking domain
```

Dashboard metrics are only:

```text
lead count
sent
pending
failed
```

---

# 65. README Requirements

Create a complete `README.md` containing:

1. What the app does.
2. Local setup.
3. Environment variables.
4. Supabase migration instructions.
5. How to create the admin user.
6. How to run locally.
7. How to configure Hostinger SMTP.
8. How to deploy to Vercel.
9. How Vercel Cron works.
10. How to import CSV.
11. How to create a campaign.
12. How to start/pause/resume.
13. Troubleshooting.

---

# 66. Example CSV

Create:

```text
examples/leads-example.csv
```

Content:

```csv
Azienda,Email
Rossi Arredi,info@rossiarredi.it
Bianchi Design,commerciale@bianchidesign.it
Casa Italia,info@casaitalia.it
```

---

# 67. Example HTML

Create:

```text
examples/email-example.html
```

Example:

```html
<!doctype html>
<html lang="it">
  <body>
    <p>Buongiorno {{azienda}},</p>

    <p>
      sono Stefano di ARKITECNA.
      Realizziamo render fotorealistici per aziende di arredamento.
    </p>

    <p>
      Cordiali saluti,<br>
      Stefano Martini<br>
      ARKITECNA
    </p>
  </body>
</html>
```

---

# 68. Required Tests

Do not create a huge test suite.

At minimum test:

### Template rendering

Input:

```text
Render per {{azienda}}
```

Lead:

```text
Rossi Arredi
```

Expected:

```text
Render per Rossi Arredi
```

### CSV normalization

```text
 INFO@ROSSI.IT 
```

becomes:

```text
info@rossi.it
```

### Duplicate handling

Same email twice in one campaign:

```text
only one record imported
```

### Schedule next time

Examples:

```text
Wednesday 17:58 + 4 minutes
window ends 18:00
=> Thursday 09:00
```

```text
Friday 17:58 + 4 minutes
=> Monday 09:00
```

### Daily limit

If daily count reached:

```text
no send
next_send_at = next valid day 09:00
```

### Atomic claim

Two claim calls must not return the same lead.

---

# 69. Acceptance Criteria

The project is complete only when all of the following work.

## A. Login

- User can log in.
- Unauthenticated users cannot access dashboard.

## B. Campaign

- User can create campaign.
- User can edit campaign.
- User can delete non-active campaign.
- Campaign supports subject + HTML.
- Campaign supports schedule.

## C. CSV

- User can upload CSV.
- User maps company column.
- User maps email column.
- Valid leads import successfully.
- Duplicates are skipped.
- Invalid rows are reported.

## D. Personalization

- `{{companyName}}` works.
- `{{azienda}}` works.
- `{{email}}` works.
- Placeholders work in subject.
- Placeholders work in HTML.

## E. Preview

- User can preview resolved subject.
- User can preview resolved HTML.

## F. SMTP

- SMTP verify works.
- Test email works.
- SMTP password is never exposed.

## G. Scheduler

- Cron executes every minute.
- At most one email is sent globally per run.
- Campaign sends only when active.
- Campaign obeys start time.
- Campaign obeys weekday rule.
- Campaign obeys sending window.
- Campaign obeys interval.
- Campaign obeys daily limit.

## H. Controls

- Start works.
- Pause immediately stops future sends.
- Resume continues gradually.
- Resume does not dump backlog.
- Campaign becomes completed when no sendable leads remain.

## I. Logging

- Sent email becomes `sent`.
- Failed email retries.
- After 3 failures it becomes `failed`.
- SMTP message ID saved when available.
- Basic log is visible.

## J. Safety

- No public SMTP credentials.
- No duplicate send caused by two cron calls.
- No mass-send endpoint.
- No send-all button.

---

# 70. Implementation Order

AG should build in this order.

## Phase 1 — Project bootstrap

- Next.js
- TypeScript
- Tailwind
- Supabase client
- `.env.example`

## Phase 2 — Database

Create migrations:

- campaigns
- campaign_leads
- email_logs
- indexes
- updated-at trigger
- claim-next-lead RPC

Test migrations.

## Phase 3 — Authentication

- login
- protected layout
- logout

## Phase 4 — Campaign CRUD

- campaign list
- campaign create
- campaign detail
- campaign edit
- status badges

## Phase 5 — CSV Import

- upload
- parse
- map columns
- validate
- deduplicate
- insert
- result summary

## Phase 6 — Email Template

- subject
- HTML
- placeholder rendering
- preview

## Phase 7 — SMTP

- transporter
- verify
- test email
- send helper

## Phase 8 — Scheduling

- Luxon helper
- weekday/window logic
- daily-limit logic
- next-send calculation

## Phase 9 — Cron

- protected cron endpoint
- campaign selection
- atomic lead claim
- send
- retry
- logs
- completion logic

## Phase 10 — Campaign Controls

- start
- pause
- resume

## Phase 11 — QA

Use real test campaign with 3–5 internal email addresses.

Do not test first release against hundreds of real leads.

## Phase 12 — Deployment

- Supabase production
- Vercel project
- environment variables
- Vercel Cron
- verify SMTP
- production test

---

# 71. Coding Rules for AG

Follow these rules strictly.

1. **Do not expand scope.**
2. **Do not introduce an ORM.**
3. **Do not add a queue service.**
4. **Do not add AI.**
5. **Do not create a CRM.**
6. **Do not create follow-up sequences.**
7. **Do not add tracking pixels.**
8. **Do not add click tracking.**
9. **Do not add extra dashboards.**
10. **Do not hardcode secrets.**
11. **Do not send batches.**
12. **Do not use setInterval inside serverless functions.**
13. **Use database state + Vercel Cron.**
14. **Keep sending concurrency globally at one per cron run.**
15. **Use atomic PostgreSQL lead claiming.**
16. **All date/time logic must be timezone-safe.**
17. **Store timestamps as timestamptz / UTC.**
18. **Render local campaign time only at scheduling boundaries and UI.**
19. **Keep functions small and explicit.**
20. **Prefer understandable code over abstraction.**

---

# 72. Definition of Done

The application is considered V1 complete when this exact manual workflow works:

```text
1. Login.

2. Create:
   "Mobili Italia"

3. Set subject:
   "Render per {{azienda}}"

4. Paste HTML email.

5. Import:
   leads.csv

6. Map:
   Azienda -> company_name
   Email   -> email

7. Confirm:
   542 valid leads

8. Set:
   Start 09:00
   End 18:00
   Interval 4 minutes
   Daily max 80

9. Click START.

10. Scheduler sends one email at each due slot.

11. Email to Rossi Arredi contains:
    "Rossi Arredi"

12. Email to Bianchi Design contains:
    "Bianchi Design"

13. Dashboard updates:
    sent / pending / failed

14. Click PAUSE.
    No further email is sent.

15. Click RESUME.
    Sending continues gradually from current time.

16. When no pending/retry leads remain:
    campaign = COMPLETED.
```

If this workflow works reliably, do not continue adding features.

---

# 73. Final Product Principle

The final application must feel like this:

```text
ARKITECNA MAILER

Campaign
↓
Import CSV
↓
Paste HTML
↓
Schedule
↓
START
```

Nothing more is required for V1.

The product should remain sufficiently simple that a user can understand the complete workflow in less than five minutes.
