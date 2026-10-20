# Funnel Copilot and Analytics

The authenticated Copilot is available for an owned funnel at
`/funnels/{funnel}/copilot`. It reuses `funnel_events`, `contact_submissions`,
contacts, follow-up tasks, `funnel_variants`, and the existing Copilot audit and
recommendation records. It does not send contact records or form answers to an
AI provider.

## AI provider setup

AI advice is optional. Deterministic analytics and recommendations continue to
work when the provider is disabled or unavailable. Configure these server-side
environment variables to enable the existing OpenAI-compatible adapter:

```dotenv
FUNNEL_AI_DRIVER=openai-compatible
FUNNEL_AI_ENDPOINT=https://api.openai.com/v1/responses
FUNNEL_AI_API_KEY=
FUNNEL_AI_MODEL=
FUNNEL_AI_TIMEOUT=45
```

Keep `FUNNEL_AI_API_KEY` out of browser code and source control. The Copilot
adapter sends bounded funnel copy, aggregate metrics, and rule-based findings.
It excludes contact records, form contents, and raw attribution query strings.
Provider responses are shape-checked and sanitized. Connection failures, HTTP
429 responses, and server errors are retried at most twice; provider errors
leave deterministic analysis available. No estimated provider cost is shown
because this application does not configure reliable model pricing.

## Event tracking and privacy

Public tracking accepts allowlisted event types with an optional UUID event id
(the browser client sends one), a hashed first-party session id, optional funnel form/variant identifiers, allowlisted
UTM attribution, and small metadata fields (`page`, `device`, `step`, `cta`,
`block_id`). Requests are rate-limited. Event ids are unique per funnel and
event type, so a replay does not create a second copy. Event URLs lose query
strings, direct email/phone-like values are excluded, and form values are not
accepted as metadata. Funnel sessions use browser `sessionStorage`; they are
not a count of unique people and can be reset, blocked, or split across
browsers/devices.

The application currently has no separate analytics-consent setting. The
existing marketing-consent choice controls marketing communications, not
first-party funnel analytics. Tracking is only initialized for the configured
analytics funnel on the client-acquisition form; public funnel tracking uses
the existing funnel renderer. Add a separate consent control if local policy
requires analytics opt-in.

## Metric definitions

- **Views, CTA clicks, form starts, validation errors, and conversions** are
  event counts for the selected period. They are not unique-session counts.
- **Unique sessions** count distinct hashed session identifiers with a view;
  anonymous visitors without an identifier are excluded.
- **Conversion rate** is confirmed, persisted submission conversion events
  divided by view events. A conversion is written in the same transaction as
  its `contact_submission`. The database allows at most one conversion event
  per submission and event type; repeat, separately persisted inquiries remain
  separate conversions.
- **Form completion rate** is confirmed conversion events divided by
  `form_start` events. It is an event-count ratio, not a unique-person
  completion rate.
- **Form-step progression** counts distinct identified sessions per form and
  step when available. A missing next step is not counted as a measured
  drop-off; a lower next-step count identifies a transition to investigate,
  not why someone left.
- **Inquiries** count funnel-linked persisted `contact_submissions` created in
  the period. **Distinct leads** count those submission contact ids once.
- **Currently qualified leads** use the contact's current CRM status, so
  historical-period qualification totals can change when a lead's status
  changes. The qualified-lead rate is current qualified distinct leads divided
  by distinct leads with a submission in the period.
- **Market and service segments** use persisted client-acquisition submission
  fields and current CRM status. They show inquiry and currently-qualified
  counts only; the app does not infer market/service visitor conversion rates.
- **Overdue follow-ups** count pending CRM tasks due before the time of
  analysis for contacts linked to the funnel. This is a current task count,
  independent of the selected analytics date range.
- **Source, campaign, landing-page, and device breakdowns** include only
  recorded values. Landing-page and referrer query strings are excluded.
  Device category is a viewport-width estimate.

Recommendations retain the measurement dates and supporting metrics. Content
review observations are labeled separately from measured findings, internal
heuristics are not presented as universal benchmarks, and the Copilot does not
claim that correlation proves causation.

## Recommendation review

Recommendations are deduplicated while pending and can be accepted, rejected,
dismissed, marked applied, and completed with an observed outcome. Approval
does not apply a change. Marking a recommendation applied requires an internal
note; completion records the measured outcome. Each transition stores the
reviewing user, timestamp, note/outcome where provided, and an append-only
review-history entry. Copy suggestions create only inactive funnel variants;
an authorized user must review and activate the variant separately.

## Experiments and limitations

The existing funnel-variant system supplies assignment, exposures, and
conversion attribution. Active variants receive weighted first-party cookie
assignments; any unallocated share remains the unassigned baseline. The view
event records exposure, and the persisted submission records its assigned
variant. Public event reports must match the assigned variant. Pausing or
removing a variant can change assignment for a returning visitor.

Variant comparisons are descriptive only. The Copilot uses 100 views per
variant as a data-volume warning heuristic, not a significance test, and never
declares a winner or automatically publishes a variant. The current model does
not provide formal experiment start/end dates, configurable guardrails, or a
statistical winner decision. Treat comparisons as inconclusive unless an
independent, adequately powered analysis supports a decision.

The Automation Studio already supports authenticated workflow webhooks. This
feature does not add a separate n8n endpoint or send recommendation/lead data
to an external workflow.
