# Lead qualification and follow-up

The existing CRM remains single-owner: authenticated users see only their own contacts, submissions, activities, opportunities, and follow-up tasks. Team assignment is not enabled because the application does not yet define CRM team membership or roles.

## Operations

- **Leads:** `/contacts` — search, server-side pagination, status, service, market, budget/currency, score, date, and follow-up filters; sort by creation date, score, or next follow-up.
- **Lead detail:** `/contacts/{contact}` — edit project/contact details, change lifecycle status, record a lost reason, add internal notes, log contact attempts, create/reschedule/complete/cancel tasks, and copy a manual message template.
- **Tasks:** `/follow-up-tasks` — overdue, due today, upcoming, and all-task views.
- **Analytics:** `/client-acquisition/analytics` — actual contact-submission, contact, task, attribution, and closed-won opportunity records for a selected date range.
- **Configuration:** `/settings/client-acquisition` — service, budget, timeline, scoring weights and priority thresholds, templates, response information, and linked funnel settings. This remains limited to the configured acquisition owner.

Run the normal Laravel migration command in each deployment environment after reviewing the new migration. Do not use `migrate:fresh` or reset an existing database.

## Lead scoring

Scoring is deterministic and server-side. Each group is independently configurable, and a zero weight disables that rule:

| Dimension | Maximum |
| --- | ---: |
| Selected service fit | 25 |
| Project description clarity | 15 |
| Budget compatibility | 25 |
| Timeline | 15 |
| Scope completeness | 10 |
| Contact completeness | 10 |

The total is capped at 100. Description clarity awards partial/full points at the 30- and 100-character detail thresholds. Scope points depend on additional requirements; contact points depend on a name, valid email, and phone. Budget scores use the selected market's configured currency range only: Ethiopia uses ETB and international markets use USD. Missing or mismatched values score zero as unknown; no exchange rate or conversion is used. Market and personal identity are not score signals.

Settings changes to services, budget/timeline rules, or weights recalculate existing project-lead scores in chunks. Editing a lead's project details also recalculates its score. Recalculation does not automatically mark a lead won. A qualified threshold may advance a new lead to `qualified`; priority thresholds label operational follow-up suggestions only.

## Statuses and activities

Contact lifecycle statuses are `new`, `reviewing`, `qualified`, `contacted`, `consultation_scheduled`, `proposal_sent`, `negotiation`, `won`, `lost`, and `nurture`. Existing opportunity pipeline stages remain independently configurable. Status changes, internal notes, contact attempts, detail edits, and task lifecycle actions are recorded in the contact activity timeline. Lost reasons are optional: budget mismatch, timing, scope mismatch, no response, or other.

Internal notes are separate from prospect messages. A contact-attempt entry records what staff did; it does not send an email or other message.

## Tasks and templates

Tasks are internal records with a contact, title, optional description, due date/time, and pending/completed/cancelled state. Completion timestamps are persisted. There is no reminder delivery, scheduler job, or notification deduplication to configure because this phase does not schedule reminders.

Follow-up templates are editable in client acquisition settings and have English plus optional Amharic text. Supported substitutions are `{{name}}`, `{{service}}`, `{{company}}`, and `{{timeline}}`. Substituted values are shown as text and are not interpreted as HTML. Templates can only be previewed and copied; no messaging integration is invoked. Promotional templates are withheld unless the contact has a recorded subscribed email preference. Do not treat a copied template as a sent message.

## Attribution and analytics definitions

The first project-request attribution is preserved on the contact; each subsequent `contact_submissions` row keeps its own attribution. Captured values include same-site landing-page path, referrer where available, and UTM source/medium/campaign/content/term. No fingerprinting is added.

- **Inquiries:** counts of persisted contact submissions (repeat submissions count as additional inquiries).
- **Leads:** distinct contacts.
- **Qualified leads:** contacts currently in `qualified` status among contacts created in the selected range.
- **Status, service, market, budget, score, source, and campaign breakdowns:** contact records created in the selected range; budget counts remain separated by ETB and USD.
- **Overdue tasks:** all pending tasks with a due timestamp before the current time.
- **Won value:** opportunity values recorded as won and closed in the selected range, grouped by pipeline currency. It is not inferred from lead scores or inquiries.

No conversion rate is shown because this CRM does not define a reliable inquiry-to-won cohort denominator. Analytics reports recorded values only; empty states are not populated with example data.
