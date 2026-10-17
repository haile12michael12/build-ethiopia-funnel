# build-ethiopia-funnel

## Business growth audit

The public business growth audit is available at `/business-growth-audit`. It stores submissions as contacts and contact submissions, normalizes Ethiopian mobile numbers, assigns a lead score, and provides a signed, temporary report URL.

Set `BUSINESS_AUDIT_OWNER_ID` in `.env` to the ID of the user account that should own audit leads. The endpoint returns `503` until this value points to an existing account; public visitors cannot choose or view CRM accounts. Run `php artisan migrate` to add the audit and lead-score fields to contacts.

## MERN developer starter funnel

Authenticated users can install the MERN developer lead-magnet funnel from the Funnels page with **Install MERN Starter**. It creates seven published pages for the opt-in, delivery, quiz, three offer paths, and thank-you flow, plus a 50/50 headline experiment. Reinstalling is safe for pages already owned by the user; installation stops with an explicit error if one of the required slugs belongs to another account.

The quiz is evaluated server-side and redirects to the selected offer page. Lead scoring uses linked funnel events and the account's scoring rules. Installation also creates two automation drafts in Automation Studio: a six-email welcome/nurture sequence and a lead-score routing sequence. Drafts are not activated automatically; review consent settings, email content, and the workflow before publishing. In particular, add the hosted starter download URL to the first nurture email before publishing.

The developer quiz offers an optional GitHub username lookup using GitHub's public REST API; no OAuth or repository write permission is requested. The app stores the username, public profile URL, primary language, detected stack, public repository count, and SaaS signal on the opted-in contact. Recent repository metadata is analyzed but not stored. Profile lookups are limited per visitor and globally, and successful public lookups are cached for six hours. GitHub connection is also recorded as a product event for asynchronous scoring, and can be used by quiz branching rules.

Email-open/click tracking and trusted purchase events are not supported by the current application, so they are not wired into scoring or automation enrollment.

## Developer template marketplace

Run `php artisan migrate`, `php artisan db:seed --class=MarketplaceCatalogSeeder`, and `php artisan storage:link` to create the initial curated catalog and publish reviewer-uploaded preview images. Marketplace reviewers are configured with comma-separated `MARKETPLACE_REVIEWER_EMAILS`. Reviewers set each listing's currency and price and upload private ZIP artifacts before publishing; a blank price keeps checkout disabled. Contributor submissions remain private until approved. Contributor revenue-share percentages are recorded on the listing and purchase for manual settlement; no payout automation is provided.

One-time template and bundle purchases use Chapa. Configure `CHAPA_SECRET_KEY` and `CHAPA_WEBHOOK_SECRET` only on the server, then configure the Chapa dashboard webhook URL to `https://<your-app-host>/marketplace/chapa/webhook` with the same webhook secret. Hailab verifies the webhook signature and then calls Chapa's [transaction verification endpoint](https://developer.chapa.co/integrations/verify-payments) before granting access. Checkout uses Chapa's [payment initialization endpoint](https://developer.chapa.co/integrations/accept-payments); the webhook signature contract is documented in [Chapa webhooks](https://developer.chapa.co/integrations/webhooks). Return redirects do not grant access unless amount, currency, status, and transaction reference match the pending purchase. Template downloads are served from private storage after ownership or paid-purchase checks.

The initial catalog has no live prices or downloadable artifacts, so checkout remains disabled until those are configured by a reviewer. Pro membership records are catalog-only: recurring checkout and access activation are deferred because recurring support was not verified in Chapa's current official documentation. No live payment credentials are included in the repository.