# build-ethiopia-funnel

## Business growth audit

The public business growth audit is available at `/business-growth-audit`. It stores submissions as contacts and contact submissions, normalizes Ethiopian mobile numbers, assigns a lead score, and provides a signed, temporary report URL.

Set `BUSINESS_AUDIT_OWNER_ID` in `.env` to the ID of the user account that should own audit leads. The endpoint returns `503` until this value points to an existing account; public visitors cannot choose or view CRM accounts. Run `php artisan migrate` to add the audit and lead-score fields to contacts.