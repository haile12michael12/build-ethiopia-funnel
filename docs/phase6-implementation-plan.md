# Phase 6 implementation plan

## Repository findings

- The application is Laravel 13, Inertia 2, React 19, TypeScript, and SQLite-compatible; Composer requires Laravel but contains no Laravel Cashier or tenancy package.
- `Workspace`, `WorkspaceInvitation`, `workspace_members`, and invitation routes already exist. The workspace model currently stores only `owner_id`, `name`, and `slug`; members can be invited with `admin`, `editor`, `analyst`, or `viewer` roles. There is no active-workspace selector, workspace settings, or workspace lifecycle.
- Core resources remain user-owned rather than workspace-owned. Existing schemas use `user_id` or `owner_id` for funnels, contacts, CRM/opportunities, follow-ups, automation, projects, site content, Copilot data, content drafts/settings, and experiments. Existing controllers and relations commonly scope access through `$request->user()` and user relationships.
- The current workspace association is not a tenancy boundary: only marketplace templates have an optional `workspace_id`; existing workspace membership does not grant access to the member's user-owned funnels, CRM records, content, or automations.
- Background jobs exist for automation execution, automation event dispatch, lead scoring, lead notifications, and developer AI recommendations. These currently receive model/user identifiers and do not carry validated active-workspace context.
- Chapa integration is for one-time marketplace purchases, with provider verification and webhook event deduplication. Marketplace membership checkout is explicitly disabled. No general subscription, invoice, plan entitlement, or workspace usage-metering system was found.
- A platform administrator role/console was not found in the audited workspace/auth surfaces. Workspace roles and marketplace review authorization are separate concerns.
- No workspace-specific Pest test file was found in the initial test search. Existing feature tests use Laravel/Pest and in-memory SQLite.

## Tenant boundary and legacy-data strategy

Use the existing workspace entity as the tenant boundary; do not add a second organization/tenant model or a tenancy dependency. Keep `user_id` as the record creator/actor where useful, and add a non-null `workspace_id` to tenant-owned resources once each surface is converted. Resolve the active workspace server-side from an authenticated membership and persist only its identifier in the session; never treat a submitted workspace ID as authorization.

For legacy data, create or select one owner-controlled primary workspace per user with existing user-owned data, then backfill that user's legacy records into that workspace without changing record IDs or parent relationships. Do not infer that records owned by different users belong together merely because those users share a workspace. Existing invited members do not inherit another user's legacy records. Run the backfill transactionally and make it verifiable with counts by table/workspace before making `workspace_id` required. Keep marketplace/catalog and public records outside tenant scoping unless their actual ownership semantics require it.

## Ordered implementation

1. **Workspace core and authorization:** extend workspace configuration and lifecycle; normalize role capabilities; add authorized active-workspace selection and context middleware; add tests for membership, owner, and workspace switching boundaries.
2. **Data ownership and migration:** inventory tenant-owned model relations, routes, jobs, scheduled work, files, and exports; add nullable indexed workspace keys and an explicit legacy backfill; verify the backfill before tightening constraints.
3. **Resource isolation:** convert resource queries, route binding, writes, aggregates, exports, and public/private rendering in dependency order: funnels/events/contacts/submissions; CRM/opportunities/tasks/pipelines; automations/runs; projects/site content/content drafts/settings; analytics/Copilot/recommendations/experiments. Carry workspace IDs into and validate them in jobs and webhook processing.
4. **Onboarding and settings:** create the initial workspace idempotently for new users; support workspace profile, locale, timezone, country/market/currency, and authorized member management; retain the existing auth and localization conventions.
5. **Entitlements and metering:** define plan configuration separately from workspace records; enforce limits server-side using transactional/idempotent usage records; initially provide truthful limits and usage, with no charge or provider cost unless the evidence supports it.
6. **Billing:** preserve marketplace checkout as a separate one-time purchase flow. Add a replaceable subscription provider contract only after provider availability is confirmed; keep live billing disabled until credentials and merchant configuration exist. Subscription state must come from verified, idempotent provider events, not redirects.
7. **Branding/domains and platform operations:** implement only workspace-scoped branding and domain verification supported by the app's existing domain resolver. Add a platform console only after a real platform-operator authorization source and audit trail are defined; never make ordinary workspace roles platform roles.
8. **Release verification:** run migrations and backfill checks on supported SQLite tests, tenant-isolation feature tests, relevant existing feature tests, frontend type checks/build/format checks; document deployment backup, rollout, and recovery procedures.

## Delivery boundary

This plan is an audit and rollout boundary, not a claim that Phase 6 is already implemented. Tenant safety requires updating all resource access surfaces and background execution paths before workspace membership can safely expose existing data. Subscription activation, provider cost accounting, custom-domain readiness, or platform support access must not be represented as enabled until their external prerequisites and authorization controls are implemented and verified.

## Initial implementation slice

The first code slice adds workspace profile defaults and owner/admin-authorized settings for workspace name, description, type, country, language, timezone, market, and currency. It reuses the current membership-role checks and does not expose workspace switching as an application-data boundary. Core resources and jobs are still user-scoped; the tenant backfill and resource-isolation stages remain required before members can safely share those records.
