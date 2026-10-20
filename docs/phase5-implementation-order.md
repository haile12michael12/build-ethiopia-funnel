# Phase 5 implementation order

## Repository audit

The repository already contains the core systems Phase 5 should reuse:

- CRM contacts, acquisition details, lead scoring, contact activities, consent
  preferences, and follow-up tasks.
- Opportunity pipelines, stages, deal outcomes, and activity history.
- Client-acquisition analytics, funnel Copilot recommendations, and native
  experiments (Phase 4).
- Server-side AI provider configuration and adapters, with a disabled-provider
  fallback.
- A portfolio catalog (`projects`) and bilingual website content (`site_contents`).
- Queue-backed Automation Studio with immutable workflow versions, durable
  events, execution history, email, and signed webhook actions.

The current working tree also contains uncommitted funnel analytics, Copilot,
experiment, migration, and test changes. Those changes are pre-existing and
must be preserved.

The existing project catalog is public portfolio content, not client delivery
projects: it has no client, milestone, or task relationship. A lead-to-client
handoff must therefore wait for a real client-project model rather than
misrepresenting a portfolio entry as paid client work.

## Proposed implementation sequence

1. Extend the authenticated dashboard with owner-scoped, persisted CRM,
   follow-up, project-catalog, content, and automation data. Keep lead,
   opportunity, and portfolio counts distinct.
2. Add an agency Content Studio with AI-generated editable drafts. Reuse the
   existing server-side provider settings, published service/portfolio facts,
   and existing bilingual business configuration; never generate directly
   into public website content.
3. Add content editing, version snapshots, review/approval, scheduling, manual
   publication confirmation, history, and status filtering. No social
   publishing API is configured, so scheduled items remain manual reminders.
4. Extend prospect research/website assessments only where the existing CRM
   does not already preserve the requested data; do not perform automated
   website scans or re-create contact records.
5. Reuse Automation Studio events, queueing, idempotency, and execution history
   for any future content/CRM workflows; do not create a parallel workflow
   engine or expose private prospect data to external integrations by default.
6. Keep current funnel/acquisition reporting and Copilot calculations as the
   source of truth; add only metrics backed by persisted records.
7. Add focused authorization, validation, lifecycle, data-isolation, and AI
   provider-failure tests; run backend, type, format, and build checks available
   for the changed surfaces.

## Initial delivery boundary

This delivery prioritizes steps 1–3 as a complete workflow and uses existing
prospect, analytics, and automation features through dashboard links and
owner-scoped summaries. It does not add automated website analysis, CSV
imports, social publishing integrations, a second permissions system, or
client-project handoff without suitable existing models and provider support.

## Delivery status

- Steps 1–3: implemented with owner-scoped dashboard summaries, private agency
  content drafts, server-side AI generation, reusable brand settings,
  version snapshots, review/approval, manual schedule/publication tracking,
  and focused automated tests.
- Steps 4–6: existing CRM, acquisition analytics, Phase 4 Copilot/experiments,
  and Automation Studio are reused; no duplicate prospect, reporting, or
  automation system was added.
- Step 7: test and deployment checks are documented in `docs/content-studio.md`;
  remaining verification results are reported with the implementation.
- Deferred: automated website scans, CSV imports, social network publication,
  and lead-to-client delivery handoff. There is no configured social connector
  or client-delivery project model in the audited repository.
