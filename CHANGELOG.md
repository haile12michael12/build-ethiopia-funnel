# Changelog

Hailab follows a rolling development model. Notable user-facing changes are recorded here before tagged releases.

## Unreleased

### Added

- Redesigned public footer with layered gradient glows and pattern texture, a gradient-ring call-to-action band ("Book a Call" when a booking page is active, plus "Start a Project"), animated chevron-reveal link columns, social icon buttons, locale-aware copy (en/am), and a back-to-top control — extracted into `resources/js/components/navbar/public-footer.tsx`.
- Header and navbar upgrades: a localized "Book a Call" CTA in the public navbar (desktop and mobile drawer, driven by the first active booking page), an owner-only global search over contacts/funnels/bookings in both app headers with debounced grouped results, and an owner-only notifications bell surfacing new bookings, today's meetings, overdue follow-ups, and failed automation runs.
- Public calendar booking: owner-managed booking pages at `/appointments/calendars`, guest booking flow at `/book/{slug}` with availability rules, buffer-aware conflict-checked slots, visitor timezone display, CRM contact and follow-up task creation, token-guarded cancel/reschedule links, scheduled reminder emails, and owner outcome tracking (completed / no-show / cancel) with no-show re-engagement tasks.
- Resilient autosave, local recovery, and revision conflicts.
- Portable community templates with validated JSON import/export.
- Multi-step conditional forms, attribution, and success actions.
- Privacy-conscious event analytics and dashboard trends.
- Native snapshot experiments with stable traffic assignment.
- Optional provider-neutral AI funnel generation.
- Isolated guest sandbox with automatic expiry.
- Docker evaluation stack and contributor community files.
- Contact search, funnel/status/date filters, pagination, and filtered CSV export.
- Funnel-linked opportunity pipelines with Kanban stage management, value forecasting, activity history, contact integration, and opt-in lead automation.
- Automation Studio with durable event enrollment, immutable workflow versions, waits, conditional branches, CRM actions, consent-aware email, signed webhooks, run history, retries, and starter recipes.
- Public B2B appointment/demo scheduler (`/book-a-demo`) with configurable business hours, slot and buffer lengths, daily capacity, and meeting types; availability API, signed confirmation page, owner appointment dashboard, and lead scoring through the existing CRM pipeline.
- EthioBiz Concierge assistant and business growth audit (public chat assistant grounded in published content, plus a guided growth assessment).

### Changed

- Upgraded the backend runtime to Laravel 13, PHP 8.3+, Tinker 3, and Pest 4.
- CI now runs non-mutating PHP and frontend quality checks.
- The enhanced editor is the single canonical editor surface.
- New-lead email and webhook notifications now run through the queue instead of delaying public funnel submissions.
