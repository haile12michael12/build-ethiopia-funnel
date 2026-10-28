# build-ethiopia-funnel

## Single-owner business and storefront

The public site reuses the existing services, portfolio, blog, contact/CRM, digital product catalog, and Chapa checkout. Customer accounts can register, update their own profile, purchase products, and view only their own orders. Owner-only pages and management actions require the account whose existing login email matches `ADMIN_EMAIL`; registration input cannot assign that identity.

Before deployment, set `ADMIN_EMAIL` in the server environment to the login email of the existing business owner account. The account must already exist; no customer is promoted automatically, and leaving the value blank denies access to owner-only routes. Do not commit `.env`. After changing environment configuration, clear or rebuild Laravel's config cache. Optionally set `BUSINESS_AUDIT_OWNER_ID` to the same account's ID to direct public inquiries and audit leads to a specific CRM owner; when it is blank or stale, submissions fall back to the account matched by `ADMIN_EMAIL`. Lead forms return `503` only when neither setting resolves to an existing account.

There is no role migration and no account, product, or payment data is removed. Existing published curated products remain in the public catalog; contributor/workspace listings are not offered as storefront products, while existing purchase records and entitlement checks remain available. Customers cannot create workspaces or manage content, funnels, or products. Contact and project inquiries use `/start-project`, which validates and rate-limits submissions before saving them in the existing CRM. The `/contact` page links to that form and does not report a message as sent before submission.

## Business growth audit

The public business growth audit is available at `/business-growth-audit`. It stores submissions as contacts and contact submissions, normalizes Ethiopian mobile numbers, assigns a lead score, and provides a signed, temporary report URL.

Set `BUSINESS_AUDIT_OWNER_ID` in `.env` to the ID of the user account that should own audit leads. When it is blank or points to a deleted account, the app falls back to the account matched by `ADMIN_EMAIL`. The endpoint returns `503` only when neither setting resolves to an existing account; public visitors can never choose or view CRM accounts. Run `php artisan migrate` to add the audit and lead-score fields to contacts.

## B2B appointment scheduler

The public appointment scheduler is available at `/book-a-demo`. Visitors pick a service, a meeting type, and an open time slot; bookings are stored as owner-owned contacts, contact submissions, and appointments, scored through the existing lead pipeline, and confirmed through a signed temporary page. The owner manages availability and meeting types from `/settings/client-acquisition` and tracks upcoming and past meetings at `/appointments`.

Availability is deterministic and never invents capacity: it uses the configured business hours, slot length, buffer, daily cap, and timezone. `config/appointments.php` provides defaults; no new environment keys are required. See `docs/appointment-booking.md` for details.

## MERN developer starter funnel

Authenticated users can install the MERN developer lead-magnet funnel from the Funnels page with **Install MERN Starter**. It creates seven published pages for the opt-in, delivery, quiz, three offer paths, and thank-you flow, plus a 50/50 headline experiment. Reinstalling is safe for pages already owned by the user; installation stops with an explicit error if one of the required slugs belongs to another account.

The quiz is evaluated server-side and redirects to the selected offer page. Lead scoring uses linked funnel events and the account's scoring rules. Installation also creates two automation drafts in Automation Studio: a six-email welcome/nurture sequence and a lead-score routing sequence. Drafts are not activated automatically; review consent settings, email content, and the workflow before publishing. In particular, add the hosted starter download URL to the first nurture email before publishing.

The developer quiz offers an optional GitHub username lookup using GitHub's public REST API; no OAuth or repository write permission is requested. The app stores the username, public profile URL, primary language, detected stack, public repository count, and SaaS signal on the opted-in contact. Recent repository metadata is analyzed but not stored. Profile lookups are limited per visitor and globally, and successful public lookups are cached for six hours. GitHub connection is also recorded as a product event for asynchronous scoring, and can be used by quiz branching rules.

Email-open/click tracking and trusted purchase events are not supported by the current application, so they are not wired into scoring or automation enrollment.

## Calendar booking

When at least one active booking page exists, the public navbar shows a localized "Book a Call" button linking to it.

The owner manages public booking pages at `/appointments/calendars` (route group requires the `ADMIN_EMAIL` business-owner account). Each page gets a public link at `/book/{slug}` where guests pick a day and time slot, enter their details, and receive a confirmation email — no account required.

Availability comes from weekly per-day windows with configurable duration, buffer between meetings, minimum notice, and an advance-booking window; slot conflicts are evaluated server-side with the page row locked, so a taken time (including its buffer) cannot be double-booked. Times are stored in UTC, shown to visitors in their detected or chosen timezone, and slots outside the advance window or minimum notice are never offered.

Every booking upserts a CRM contact (source `booking`, status `consultation_scheduled` unless the contact is already further along), records a contact activity, and creates a follow-up task due at the meeting start. Invitees get token-guarded manage links (`/booking/{uuid}/manage/{token}`) to cancel or reschedule; tokens are compared with `hash_equals` and wrong tokens return 404. Rescheduling revalidates the slot and queues a fresh reminder. Cancelling a booking cancels its pending follow-up task.

The owner marks outcomes at `/appointments`: `completed` and `no-show` close the linked task (no-show also creates a re-engagement task for the next day), and owner cancellations email the invitee. Reminder emails are sent `BOOKING_REMINDER_HOURS` (default 24) before the start by the `send-booking-reminders` scheduler entry (`SendBookingReminders` action, every 15 minutes), which claims rows before queueing mail so overlapping scheduler runs never mail twice. Email delivery requires a configured mailer and a queue worker; configure Laravel's scheduler (`* * * * * php artisan schedule:run`) in production.

## App header search and notifications

The business owner gets two JSON-backed tools in both app headers (sidebar and header layouts):

- **Global search** (`GET /search?q=…`, requires the owner account, throttled 30/min) groups up to five matches each from contacts (name/email/phone), funnels (name/slug), and bookings (invitee name/email); the header component (`resources/js/components/app-search.tsx`) debounces input, closes on Escape/outside click, and deep-links results.
- **Notifications** (`GET /app-notifications`, owner-only, 60/min) derives items live from CRM state — bookings created in the last 48 hours, meetings starting today, overdue follow-up tasks, and failed automation runs from the last 3 days — so no notification storage or read-state is required. The bell (`app-notifications.tsx`) polls every 60 seconds for the badge and refetches on open.

Both components render only for the account whose email matches `ADMIN_EMAIL`.

## Developer template marketplace

Run `php artisan migrate`, `php artisan db:seed --class=MarketplaceCatalogSeeder`, and `php artisan storage:link` to create the initial curated catalog and publish owner-uploaded preview images. The business owner configured by `ADMIN_EMAIL` manages listings, prices, publication, and private ZIP artifacts. The legacy `MARKETPLACE_REVIEWER_EMAILS` setting does not grant access. A blank price keeps checkout disabled.

One-time template and bundle purchases use Chapa. Configure `CHAPA_SECRET_KEY` and `CHAPA_WEBHOOK_SECRET` only on the server, then configure the Chapa dashboard webhook URL to `https://<your-app-host>/marketplace/chapa/webhook` with the same webhook secret. Hailab verifies the webhook signature and then calls Chapa's [transaction verification endpoint](https://developer.chapa.co/integrations/verify-payments) before granting access. Checkout uses Chapa's [payment initialization endpoint](https://developer.chapa.co/integrations/accept-payments); the webhook signature contract is documented in [Chapa webhooks](https://developer.chapa.co/integrations/webhooks). Return redirects do not grant access unless amount, currency, status, and transaction reference match the pending purchase. Template downloads are served from private storage after ownership or paid-purchase checks.

The initial catalog has no live prices or downloadable artifacts, so checkout remains disabled until the owner configures them. Customers must sign in to begin checkout and can view their own order history at `/account/orders`. Purchases stay pending until Chapa confirms the amount, currency, status, and transaction reference; a browser redirect alone never grants paid access. Pro membership records are catalog-only: recurring checkout and access activation are not implemented. No live payment credentials are included in the repository.

## Developer teams, recommendations, and analytics

Existing workspace, contributor, and analytics records are retained for data safety, but customer accounts cannot access workspace administration, collaborate on product listings, or manage business analytics. The corresponding management routes require the configured business owner.

Contact owners can queue AI recommendations for developer-funnel leads from the contact detail page. Jobs use the configured server-side `funnel-ai` advisor and the existing queue; run a queue worker in production for asynchronous processing. The job sends a minimized snapshot of score signals, quiz answers, and non-identifying developer stack fields. Provider errors are recorded without exposing provider details to the contact UI. Generated recommendations remain pending until the contact owner accepts or dismisses them; generation never applies suggestions automatically. If the advisor is disabled or unconfigured, the job is marked failed and the contact owner can retry later.

The owner-only Developer analytics page reports events for the signed-in owner's developer funnels and verified purchases. Its metrics do not estimate untracked stages, link anonymous visitors to marketplace buyers, or attribute payment revenue to UTM campaigns.

## Developer code audit and starter tools

The public code audit is available at `/developer-audit`. It accepts ZIP uploads only (maximum 10 MB compressed, 80 entries, 128 KB per entry, and 1.5 MB total uncompressed). It scans only allowlisted text extensions, skips dependency/build folders, does not extract or execute files, and never fetches repository or network resources. It checks a small set of patterns for credential-like assignments, dynamic code construction, process execution, and debug statements; it is not a complete security audit and can produce false positives or miss issues. `.env` files are not read; their presence is reported, while `.env.example` and `.env.sample` are treated as examples.

Reports retain findings and archive paths, not source contents. Email links are signed, session-bound, and expire after seven days; opening the link displays a confirmation page before the report is unlocked. The daily scheduler removes expired report rows, so configure Laravel's scheduler in production. The submitted email is also associated with a CRM contact owned by `BUSINESS_AUDIT_OWNER_ID`; configure that setting to an existing account and operate the normal CRM data-retention process. Email delivery requires a functioning mailer and queue worker.

Audit completion and unlock, playground simulations, and starter exports each record at most one event of that type per audit report. Existing queued lead scoring applies default points of 20, 10, 5, and 15 respectively; existing score bands remain `educational` below 40, `offers` from 40 through 79, and `consulting` at 80 or above. Score updates are asynchronous and require a queue worker outside the synchronous development setup. Custom account scoring rules remain intact; defaults for these four events are added if missing.

The public `/developer-tools` page provides a deterministic simulation and configurable ZIP export for MERN or Laravel + React. The simulation does not accept or execute user code. Exports are assembled from fixed templates and selected guidance, use placeholder-only environment examples, and are not production-ready applications. The optional Laravel Dockerfile is illustrative for a completed Laravel application; generated scaffolding does not include a complete Laravel runtime.