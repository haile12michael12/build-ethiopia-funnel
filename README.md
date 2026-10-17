# build-ethiopia-funnel

## Business growth audit

The public business growth audit is available at `/business-growth-audit`. It stores submissions as contacts and contact submissions, normalizes Ethiopian mobile numbers, assigns a lead score, and provides a signed, temporary report URL.

Set `BUSINESS_AUDIT_OWNER_ID` in `.env` to the ID of the user account that should own audit leads. The endpoint returns `503` until this value points to an existing account; public visitors cannot choose or view CRM accounts. Run `php artisan migrate` to add the audit and lead-score fields to contacts.

## MERN developer starter funnel

Authenticated users can install the MERN developer lead-magnet funnel from the Funnels page with **Install MERN Starter**. It creates seven published pages for the opt-in, delivery, quiz, three offer paths, and thank-you flow, plus a 50/50 headline experiment. Reinstalling is safe for pages already owned by the user; installation stops with an explicit error if one of the required slugs belongs to another account.

The quiz is evaluated server-side and redirects to the selected offer page. Lead scoring uses linked funnel events and the account's scoring rules. Installation also creates two automation drafts in Automation Studio: a six-email welcome/nurture sequence and a lead-score routing sequence. Drafts are not activated automatically; review consent settings, email content, and the workflow before publishing. In particular, add the hosted starter download URL to the first nurture email before publishing.

Email-open/click tracking and trusted purchase events are not supported by the current application, so they are not wired into scoring or automation enrollment.