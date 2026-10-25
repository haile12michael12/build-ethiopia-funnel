# EthioBiz AI Concierge & Business Growth Audit

Bilingual (English / አማርኛ) public assistant and guided business assessment for visitors of the agency site. Both features are grounded exclusively in verified application data: published services, portfolio projects, and published marketplace products. Nothing is invented, and no AI output can create commitments, discounts, or payment confirmations.

## Components

- **Concierge widget** — `resources/js/components/concierge/EthioBizConcierge.tsx`, mounted inside `PublicLayout` whenever the owner enables the assistant. Floating chat panel with quick-topic chips, language toggle, source badge, and server-generated suggestion links.
- **Ask endpoint** — `POST /concierge/ask` (`ConciergeAskController`, `throttle:10,1`). Public, no registration required. Returns `{ answer, source: 'ai' | 'knowledge', suggestions[] }`.
- **Knowledge base** — `App\Services\Concierge\ConciergeKnowledgeBase` builds a snapshot per request from published `SiteContent` services, `ClientAcquisitionConfiguration` labels, published business-store `MarketplaceTemplate` products (with real prices), featured `Project` portfolio entries, and configured contact channels (email, WhatsApp, meeting link, optional Telegram).
- **AI layer** — `App\Contracts\ConciergeAdvisor` with two drivers bound in `AppServiceProvider`:
  - `OpenAIConciergeAdvisor` — used when `FUNNEL_AI_DRIVER=openai-compatible` and an API key is set. Reuses the existing `funnel-ai` endpoint/model/timeout config.
  - `DisabledConciergeAdvisor` — throws, so `EthioBizConcierge` falls back to deterministic keyword-matched answers from the same snapshot. The feature works fully without any AI provider.
- **Business Growth Audit** — `POST /business-growth-audit` (`AuditFunnelController`) with market selection (Ethiopia/International), optional country, ETB or USD budget bands (never converted), Amharic option labels, and CRM integration through `CaptureLead` + `LeadScoringService`.
- **Product recommendations** — `App\Services\Concierge\AuditProductRecommender` maps requested services to actual published paid catalog templates (max 3) and links to `/marketplace/{slug}` checkout. Recommendations and prices come only from database records.
- **Site analytics** — `POST /site-events` (`SiteEventController`, `throttle:60,1`) → `SiteEventRecorder` → `site_events` table.

## Provider configuration (live AI)

The concierge reuses the existing funnel AI configuration; no new keys are required if it is already set:

```dotenv
FUNNEL_AI_DRIVER=openai-compatible
FUNNEL_AI_ENDPOINT=https://api.openai.com/v1/responses   # or any compatible endpoint
FUNNEL_AI_API_KEY=sk-...
FUNNEL_AI_MODEL=gpt-4o-mini
```

Without these (driver `disabled` or missing key) every visitor still receives deterministic catalog-grounded answers. Tests use `Http::fake()` and inline advisor fakes — no paid calls.

## Administrator controls

Owner-only (via `configuredBusinessOwner` + `business-owner` middleware, no public admin registration):

- Client acquisition settings (`/client-acquisition/settings`) now include a Concierge section: enable/disable, Telegram link, English/Amharic intro lines (`concierge_enabled`, `telegram_url`, `concierge_intro_en`, `concierge_intro_am` columns on `client_acquisition_settings`).
- Submitted audits arrive as `Contact` records owned by the admin (existing CRM: status updates, notes, follow-ups, lead score breakdown). Lead scoring is explainable (profile, website readiness, services, budget, timeline) and never scores personal attributes.

## Privacy and safety

- Questions are length-bounded (2–500 chars), email/phone are redacted before any provider call, output is tag-stripped and capped.
- `site_events` stores only whitelisted event types, a SHA-256 hash of a random per-tab session id, locale, path, and scalar whitelisted metadata. Names, emails, phones, and free-text never reach the table. Same session + event type deduplicates per day.
- Checkout completion is measured only from marketplace order/payment records; `product_recommendation_clicked` never counts as a purchase.

## Migrations

- `2026_10_24_000000_create_site_events_table.php`
- `2026_10_24_010000_add_concierge_fields_to_client_acquisition_settings.php`

Both are additive; run `php artisan migrate`.

## Tests

`tests/Feature/EthioBizConciergeTest.php` (public access, Amharic answers, grounded suggestions, disable → 404, validation bounds, rate limiting, AI source labeling, provider outage fallback, PII redaction, site-event whitelist/dedupe/privacy, localized audit options, owner-only settings) and `tests/Feature/BusinessAuditMarketTest.php` (USD market persistence without conversion, currency/market mismatch rejection, catalog-grounded recommendations on the thank-you report).

## Known limitations

- The widget is mounted on `PublicLayout` pages only (funnel pages keep their separate support chat).
- Amharic AI quality depends on the configured provider; deterministic fallback answers are curated, not generated.
- Audit website status is self-reported; the system does not crawl the visitor's site, and the report says so.
- Telegram link is display-only; no bot integration.
