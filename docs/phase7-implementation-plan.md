# Phase 7 marketplace implementation plan

## Repository audit

- The application already has a public marketplace catalog and detail page, `MarketplaceTemplate` listings, bundle membership, creator submissions, reviewer approval/rejection, Chapa one-time checkout, payment verification/webhook idempotency, purchase records, private local-disk ZIP delivery, and workspace-aware contributor authorization.
- The existing schema is `marketplace_templates`, `marketplace_template_items`, `marketplace_purchases`, and `marketplace_webhook_events`. Products have creator/workspace ownership, type, name/description, preview paths, stack/modules, amount in minor units, currency, version/changelog, a license label, private artifact path, moderation status, and revenue-share percentage.
- Catalog currently loads every published listing without search, category/type/price filters, sorting, pagination, or a product creator page. Product details expose basic description, license label, included modules, version, and bundle contents.
- Contributors submit metadata through the existing marketplace page. New listings are not editable by their creator through a management surface; reviewers set the price and upload a ZIP. Workspace publication rights are checked against the selected workspace's membership role.
- Chapa checkout is server initialized from the persisted listing price, and access is granted only after provider verification. Signed webhooks are deduplicated. Marketplace checkout is one-time only; recurring membership is explicitly unavailable. There is no subscription system, general order/ledger, refund, payout, review, or creator-profile system.
- ZIP files use the private `local` disk and are downloaded after access checks. Preview images use the public disk. Existing membership role checks are not a general application tenant boundary, and Phase 6 tenant scoping is not complete.
- Tests already cover public visibility, pending review, workspace contributor permissions, price verification, failed/mismatched payment behavior, webhook signatures/idempotency, and protected download/access.

## Implementation scope

1. Extend the existing catalog (do not create a second marketplace) with validated search, category/type/price filters, deterministic sorting, pagination, and public-only records.
2. Add real listing metadata fields for category, documentation/demo URLs, compatibility, support details, and license terms; preserve existing records with safe defaults.
3. Add creator-scoped listing editing and resubmission. Workspace listings remain editable only by authorized workspace owner/admin/editor members. Creator changes to published metadata must return the listing to moderation; creators cannot change price/commission or publish directly.
4. Preserve current Chapa purchase and verification flow. Snapshot accepted license terms and price/revenue-share calculations on purchase; record commission and creator share in the purchase currency without claiming fees or payouts.
5. Retain private local artifact storage and access checks. Do not add executable package imports, public download links, live payout, refunds, reviews, or subscription products without supported workflows and tests.
6. Add focused Pest coverage for catalog filters, creator edit boundaries, review resubmission, license snapshot and currency-specific accounting, and existing payment/download protections.

## Boundaries and launch gaps

Marketplace listings and their optional workspace association already exist, but the broader product is not yet workspace-tenant-scoped. Workspace members' access remains limited to explicit marketplace operations. Chapa availability depends on server credentials. Creator payouts, refunds, verified reviews, subscription entitlements, and admin console features are not implemented and must not be represented as live.

## Implemented slice

- Added public catalog search, category/type/price/currency filters, deterministic sorting, and pagination. Search results only query published listings.
- Added additive product metadata fields for category, license terms, HTTPS documentation/demo URLs, compatibility labels, and support notes.
- Added a contributor edit path guarded by listing owner or workspace owner/admin/editor membership. Saving returns the listing to `pending_review`; price and revenue-share remain reviewer-controlled.
- Required explicit license acceptance before paid checkout. New purchases snapshot the selected license and terms, accepted time, currency, contributor percentage, creator share, and platform commission in minor units.
- Existing private ZIP delivery, Chapa transaction verification, and signed/idempotent webhook paths are retained.

This slice does not claim creator payouts, refunds, verified reviews, automatic package imports, or workspace-wide access to purchased products. Supported digital delivery remains private ZIP downloads for eligible listings; uploaded code is not executed.
